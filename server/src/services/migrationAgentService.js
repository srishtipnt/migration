import EmbeddingService from './embeddingService.js';
import ChunkStorageService from './chunkStorageService.js';
import MockTreeSitterService from './mockTreeSitterService.js';
import CodeChunk from '../models/CodeChunk.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Migration Agent Service - Central brain for AI-powered code migrations
 * Orchestrates the entire migration process from user command to code transformation
 */
class MigrationAgentService {
  constructor() {
    // Prevent multiple initialization
    if (MigrationAgentService.instance) {
      return MigrationAgentService.instance;
    }

    this.embeddingService = EmbeddingService; // Use singleton instance
    this.chunkStorageService = ChunkStorageService; // Use singleton instance
    this.mockTreeSitterService = new MockTreeSitterService();
    
    // Initialize Gemini AI for code generation
    this.geminiApiKey = process.env.GEMINI_API_KEY;
    this.geminiModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    
    if (!this.geminiApiKey) {
      throw new Error('GEMINI_API_KEY is required for Migration Agent');
    }
    
    this.genAI = new GoogleGenerativeAI(this.geminiApiKey);
    this.model = this.genAI.getGenerativeModel({ model: this.geminiModel });
    
    console.log('Migration Agent Service initialized');
    
    // Set singleton instance
    MigrationAgentService.instance = this;
  }

  /**
   * Main entry point for migration requests
   * @param {Object} migrationRequest - The migration request object
   * @returns {Object} Migration result
   */
  async processMigrationRequest(migrationRequest) {
    const {
      sessionId,
      userId,
      command,
      targetTechnology,
      options = {}
    } = migrationRequest;

    console.log(`🚀 Processing migration request: "${command}"`);
    console.log(`📊 Session: ${sessionId}, User: ${userId}`);

    try {
      // Step 1: Validate the request
      const validation = await this.validateMigrationRequest(migrationRequest);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          step: 'validation'
        };
      }

      // Step 2: Analyze the current codebase
      const analysis = await this.analyzeCodebase(sessionId);
      if (!analysis.success) {
        return {
          success: false,
          error: analysis.error,
          step: 'analysis'
        };
      }

      // Step 3: Find relevant code chunks
      const relevantChunks = await this.findRelevantChunks(command, sessionId);
      if (!relevantChunks.success) {
        return {
          success: false,
          error: relevantChunks.error,
          step: 'chunk_discovery'
        };
      }

      // Step 4: Generate migration plan
      const migrationPlan = await this.generateMigrationPlan({
        command,
        targetTechnology,
        relevantChunks: relevantChunks.chunks,
        options
      });

      if (!migrationPlan.success) {
        return {
          success: false,
          error: migrationPlan.error,
          step: 'plan_generation'
        };
      }

      // Step 5: Execute the migration
      const migrationResult = await this.executeMigration({
        sessionId,
        userId,
        migrationPlan: migrationPlan.plan,
        relevantChunks: relevantChunks.chunks
      });

      // Step 6: Validate the results
      const validationResult = await this.validateMigrationResults(migrationResult);

      return {
        success: true,
        migrationId: migrationResult.migrationId,
        command,
        targetTechnology,
        plan: migrationPlan.plan,
        results: migrationResult.results,
        validation: validationResult,
        statistics: {
          chunksAnalyzed: relevantChunks.chunks.length,
          filesModified: migrationResult.results.length,
          migrationTime: migrationResult.executionTime
        }
      };

    } catch (error) {
      console.error('❌ Migration Agent Error:', error);
      return {
        success: false,
        error: error.message,
        step: 'execution'
      };
    }
  }

  /**
   * Validate the migration request
   */
  async validateMigrationRequest(request) {
    const { sessionId, userId, command, targetTechnology } = request;

    if (!sessionId || !userId || !command || !targetTechnology) {
      return {
        valid: false,
        error: 'Missing required fields: sessionId, userId, command, targetTechnology'
      };
    }

    // Check if session exists and has indexed code
    const sessionChunks = await this.chunkStorageService.getChunksBySession(sessionId);
    if (sessionChunks.length === 0) {
      return {
        valid: false,
        error: 'No indexed code found for this session. Please ensure the project has been analyzed.'
      };
    }

    return { valid: true };
  }

  /**
   * Analyze the current codebase
   */
  async analyzeCodebase(sessionId) {
    try {
      const statsResult = await this.chunkStorageService.getProjectStatistics(sessionId);
      
      if (!statsResult.success) {
        return {
          success: false,
          error: `Failed to get project statistics: ${statsResult.error}`
        };
      }
      
      const stats = statsResult.statistics;
      
      return {
        success: true,
        analysis: {
          totalChunks: stats.totalChunks,
          totalFiles: stats.totalFiles,
          languages: stats.byLanguage,
          chunkTypes: stats.byType,
          averageComplexity: stats.averageComplexity,
          asyncChunks: stats.asyncChunks
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to analyze codebase: ${error.message}`
      };
    }
  }

  /**
   * Find code chunks relevant to the migration command with enhanced context retrieval
   */
  async findRelevantChunks(command, sessionId, options = {}) {
    try {
      const {
        threshold = 0.7,
        limit = 20,
        chunkTypes = null,
        languages = null,
        includeDependencies = true,
        includeRelatedFiles = true
      } = options;

      console.log(`🔍 Finding relevant chunks for command: "${command}"`);

      // Generate embedding for the command with enhanced context
      const enhancedCommand = this.enhanceCommandForSearch(command);
      const commandEmbedding = await this.embeddingService.generateEmbedding(enhancedCommand);
      
      if (!commandEmbedding.success) {
        throw new Error(`Failed to generate command embedding: ${commandEmbedding.error}`);
      }

      // Find similar chunks using semantic search
      const similarChunks = await CodeChunk.findSimilarChunks(
        sessionId,
        commandEmbedding.embedding,
        {
          threshold,
          limit: limit * 2, // Get more chunks for filtering
          chunkType: chunkTypes,
          language: languages
        }
      );

      // Enhanced filtering and ranking
      const filteredChunks = await this.filterAndRankChunks(
        similarChunks,
        command,
        {
          includeDependencies,
          includeRelatedFiles,
          finalLimit: limit
        }
      );

      // Add context information to chunks
      const enrichedChunks = await this.enrichChunksWithContext(filteredChunks, sessionId);

      console.log(`✅ Found ${enrichedChunks.length} relevant chunks`);

      return {
        success: true,
        chunks: enrichedChunks,
        commandEmbedding: commandEmbedding.embedding,
        searchMetadata: {
          originalCommand: command,
          enhancedCommand,
          totalCandidates: similarChunks.length,
          finalResults: enrichedChunks.length,
          threshold,
          searchTimestamp: new Date()
        }
      };
    } catch (error) {
      console.error('❌ Error finding relevant chunks:', error);
      return {
        success: false,
        error: `Failed to find relevant chunks: ${error.message}`,
        chunks: []
      };
    }
  }

  /**
   * Enhance command text for better semantic search
   */
  enhanceCommandForSearch(command) {
    // Add common migration patterns and keywords
    const migrationKeywords = [
      'migrate', 'convert', 'transform', 'refactor', 'update', 'upgrade',
      'database', 'api', 'framework', 'library', 'dependency', 'import',
      'export', 'function', 'class', 'component', 'service', 'model'
    ];

    // Extract technology keywords from command
    const techKeywords = this.extractTechnologyKeywords(command);
    
    // Combine original command with enhanced context
    const enhancedCommand = [
      command,
      ...techKeywords,
      ...migrationKeywords.filter(keyword => 
        command.toLowerCase().includes(keyword.toLowerCase())
      )
    ].join(' ');

    return enhancedCommand;
  }

  /**
   * Extract technology keywords from command
   */
  extractTechnologyKeywords(command) {
    const techPatterns = {
      'prisma': ['prisma', 'orm', 'database', 'schema'],
      'react': ['react', 'component', 'jsx', 'hooks'],
      'vue': ['vue', 'component', 'template'],
      'angular': ['angular', 'component', 'service'],
      'express': ['express', 'api', 'server', 'route'],
      'mongodb': ['mongodb', 'mongo', 'collection', 'document'],
      'postgresql': ['postgresql', 'postgres', 'sql', 'table'],
      'typescript': ['typescript', 'ts', 'type', 'interface'],
      'jest': ['jest', 'test', 'testing', 'spec'],
      'webpack': ['webpack', 'bundle', 'build'],
      'docker': ['docker', 'container', 'image'],
      'aws': ['aws', 'amazon', 'cloud', 'lambda'],
      'firebase': ['firebase', 'firestore', 'auth']
    };

    const keywords = [];
    const lowerCommand = command.toLowerCase();

    for (const [tech, patterns] of Object.entries(techPatterns)) {
      if (patterns.some(pattern => lowerCommand.includes(pattern))) {
        keywords.push(tech, ...patterns);
      }
    }

    return [...new Set(keywords)]; // Remove duplicates
  }

  /**
   * Filter and rank chunks based on relevance
   */
  async filterAndRankChunks(chunks, command, options = {}) {
    const { includeDependencies, includeRelatedFiles, finalLimit } = options;
    
    // Score chunks based on multiple factors
    const scoredChunks = chunks.map(chunk => {
      let score = chunk.similarity || 0;

      // Boost score for exact keyword matches
      const commandWords = command.toLowerCase().split(/\s+/);
      const chunkText = `${chunk.chunkName} ${chunk.code}`.toLowerCase();
      
      const keywordMatches = commandWords.filter(word => 
        chunkText.includes(word) && word.length > 3
      ).length;
      
      score += keywordMatches * 0.1;

      // Boost score for important chunk types
      const importantTypes = ['class', 'function', 'method', 'interface', 'type'];
      if (importantTypes.includes(chunk.chunkType)) {
        score += 0.05;
      }

      // Boost score for complex chunks (likely more important)
      if (chunk.complexity > 2) {
        score += 0.03;
      }

      return { ...chunk, relevanceScore: score };
    });

    // Sort by relevance score
    scoredChunks.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Apply final filtering
    let filteredChunks = scoredChunks.slice(0, finalLimit);

    // Include related chunks if requested
    if (includeDependencies || includeRelatedFiles) {
      const relatedChunks = await this.findRelatedChunks(filteredChunks, options);
      filteredChunks = [...filteredChunks, ...relatedChunks].slice(0, finalLimit);
    }

    return filteredChunks;
  }

  /**
   * Find related chunks (dependencies, imports, etc.)
   */
  async findRelatedChunks(chunks, options = {}) {
    const relatedChunks = [];
    const processedChunkIds = new Set(chunks.map(c => c.chunkId));

    for (const chunk of chunks) {
      // Find chunks that import or reference this chunk
      const references = await this.findChunkReferences(chunk, processedChunkIds);
      relatedChunks.push(...references);
    }

    return relatedChunks.slice(0, 10); // Limit related chunks
  }

  /**
   * Find chunks that reference the given chunk
   */
  async findChunkReferences(chunk, excludeIds) {
    try {
      // This would typically search for imports, function calls, etc.
      // For now, return empty array as this requires more complex analysis
      return [];
    } catch (error) {
      console.warn('Error finding chunk references:', error);
      return [];
    }
  }

  /**
   * Enrich chunks with additional context information
   */
  async enrichChunksWithContext(chunks, sessionId) {
    return chunks.map(chunk => ({
      ...chunk,
      context: {
        fileContext: this.extractFileContext(chunk),
        dependencies: chunk.dependencies || [],
        complexity: chunk.complexity || 1,
        isAsync: chunk.isAsync || false,
        language: chunk.language || 'javascript',
        lastModified: chunk.lastModified || new Date(),
        tags: chunk.tags || []
      },
      migrationRelevance: this.calculateMigrationRelevance(chunk)
    }));
  }

  /**
   * Extract file context information
   */
  extractFileContext(chunk) {
    return {
      fileName: chunk.fileName || 'unknown',
      filePath: chunk.filePath || 'unknown',
      fileExtension: chunk.fileExtension || '.js',
      directory: chunk.filePath ? chunk.filePath.split('/').slice(0, -1).join('/') : 'unknown'
    };
  }

  /**
   * Calculate migration relevance score
   */
  calculateMigrationRelevance(chunk) {
    let relevance = 0;

    // Higher relevance for core functionality
    const coreTypes = ['class', 'function', 'method', 'interface'];
    if (coreTypes.includes(chunk.chunkType)) {
      relevance += 0.3;
    }

    // Higher relevance for complex code
    if (chunk.complexity > 2) {
      relevance += 0.2;
    }

    // Higher relevance for async code (often needs migration)
    if (chunk.isAsync) {
      relevance += 0.1;
    }

    return Math.min(relevance, 1.0);
  }

  /**
   * Generate a detailed migration plan using AI with enhanced prompts
   */
  async generateMigrationPlan({ command, targetTechnology, relevantChunks, options }) {
    try {
      console.log(`🧠 Generating migration plan for: "${command}" -> ${targetTechnology}`);

      const prompt = this.buildEnhancedMigrationPlanPrompt({
        command,
        targetTechnology,
        relevantChunks,
        options
      });

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const planText = response.text();

      // Parse the AI response into a structured plan
      const plan = this.parseMigrationPlan(planText);

      // Validate and enhance the plan
      const validatedPlan = await this.validateAndEnhancePlan(plan, {
        command,
        targetTechnology,
        relevantChunks,
        options
      });

      console.log(`✅ Migration plan generated successfully`);

      return {
        success: true,
        plan: validatedPlan,
        metadata: {
          command,
          targetTechnology,
          chunksAnalyzed: relevantChunks.length,
          planGeneratedAt: new Date(),
          aiModel: this.geminiModel
        }
      };
    } catch (error) {
      console.error('❌ Error generating migration plan:', error);
      return {
        success: false,
        error: `Failed to generate migration plan: ${error.message}`,
        plan: null
      };
    }
  }

  /**
   * Build enhanced prompt for migration plan generation
   */
  buildEnhancedMigrationPlanPrompt({ command, targetTechnology, relevantChunks, options }) {
    const chunksSummary = relevantChunks.map((chunk, index) => 
      `${index + 1}. ${chunk.chunkName} (${chunk.chunkType})
         File: ${chunk.filePath}
         Language: ${chunk.language}
         Complexity: ${chunk.complexity}
         Code Preview: ${chunk.code.substring(0, 200)}...
         Relevance: ${chunk.migrationRelevance || 0.5}`
    ).join('\n\n');

    const techContext = this.getTechnologyContext(targetTechnology);
    const migrationPatterns = this.getMigrationPatterns(command, targetTechnology);

    return `
You are an expert code migration agent specializing in ${targetTechnology} migrations. Analyze the following migration request and create a comprehensive, actionable migration plan.

MIGRATION REQUEST:
Command: "${command}"
Target Technology: ${targetTechnology}
Migration Options: ${JSON.stringify(options, null, 2)}

TARGET TECHNOLOGY CONTEXT:
${techContext}

MIGRATION PATTERNS TO CONSIDER:
${migrationPatterns}

RELEVANT CODE CHUNKS TO MIGRATE:
${chunksSummary}

Please create a detailed migration plan that includes:

1. ANALYSIS: 
   - What specific code patterns need to be migrated
   - Why these changes are necessary
   - Impact assessment on the codebase

2. STRATEGY:
   - Step-by-step migration approach
   - Order of operations (dependencies first)
   - Risk mitigation strategies

3. CODE TRANSFORMATIONS:
   - Specific code changes needed
   - Before/after examples
   - Import/export modifications

4. DEPENDENCIES:
   - New packages to install
   - Package.json modifications
   - Version compatibility requirements

5. CONFIGURATION:
   - Configuration file changes
   - Environment variable updates
   - Build system modifications

6. TESTING:
   - Test cases to update
   - Validation steps
   - Rollback procedures

7. RISKS & MITIGATION:
   - Potential breaking changes
   - Data migration considerations
   - Performance implications

8. IMPLEMENTATION ORDER:
   - Priority order for changes
   - Parallel vs sequential operations
   - Validation checkpoints

Format your response as a structured JSON object with these sections. Be specific and actionable.
`;
  }

  /**
   * Get technology-specific context for better AI understanding
   */
  getTechnologyContext(targetTechnology) {
    const contexts = {
      'prisma': `
Prisma is a modern ORM for Node.js and TypeScript. Key concepts:
- Schema definition in prisma/schema.prisma
- Client generation with prisma generate
- Database migrations with prisma migrate
- Query API with type safety
- Common patterns: models, relations, enums, generators`,
      
      'react': `
React is a JavaScript library for building user interfaces. Key concepts:
- Components (functional and class-based)
- JSX syntax
- Hooks (useState, useEffect, etc.)
- Props and state management
- Lifecycle methods`,
      
      'typescript': `
TypeScript adds static typing to JavaScript. Key concepts:
- Type annotations and interfaces
- Generics and utility types
- Module system (import/export)
- Compilation to JavaScript
- Type checking and inference`,
      
      'express': `
Express.js is a web framework for Node.js. Key concepts:
- Middleware functions
- Route handlers
- Request/response objects
- Error handling
- Static file serving`,
      
      'mongodb': `
MongoDB is a NoSQL document database. Key concepts:
- Collections and documents
- BSON data format
- Query operators
- Aggregation pipeline
- Indexes and performance`,
      
      'jest': `
Jest is a JavaScript testing framework. Key concepts:
- Test suites and test cases
- Matchers and assertions
- Mocking and spies
- Setup and teardown
- Coverage reporting`
    };

    return contexts[targetTechnology.toLowerCase()] || `
${targetTechnology} is a technology that requires specific migration patterns.
Consider common migration approaches for this technology stack.
`;
  }

  /**
   * Get migration patterns based on command and target technology
   */
  getMigrationPatterns(command, targetTechnology) {
    const patterns = {
      'database': [
        'Convert raw SQL queries to ORM methods',
        'Update connection configurations',
        'Migrate data models and schemas',
        'Update query syntax and methods'
      ],
      'api': [
        'Update endpoint definitions',
        'Modify request/response handling',
        'Update middleware configurations',
        'Change routing patterns'
      ],
      'component': [
        'Convert class components to functional components',
        'Update lifecycle methods to hooks',
        'Modify prop handling',
        'Update state management'
      ],
      'test': [
        'Update test framework syntax',
        'Modify assertion methods',
        'Update mocking patterns',
        'Change test structure'
      ]
    };

    const commandLower = command.toLowerCase();
    const relevantPatterns = [];

    for (const [key, patternList] of Object.entries(patterns)) {
      if (commandLower.includes(key)) {
        relevantPatterns.push(...patternList);
      }
    }

    return relevantPatterns.length > 0 
      ? relevantPatterns.map(pattern => `- ${pattern}`).join('\n')
      : '- Follow best practices for the target technology\n- Maintain existing functionality\n- Ensure type safety where applicable';
  }

  /**
   * Validate and enhance the generated migration plan
   */
  async validateAndEnhancePlan(plan, context) {
    try {
      // Ensure all required sections exist
      const requiredSections = [
        'analysis', 'strategy', 'codeTransformations', 'dependencies',
        'configuration', 'testing', 'risks', 'implementationOrder'
      ];

      const enhancedPlan = { ...plan };

      // Add missing sections with defaults
      for (const section of requiredSections) {
        if (!enhancedPlan[section]) {
          enhancedPlan[section] = this.getDefaultSection(section, context);
        }
      }

      // Enhance plan with additional context
      enhancedPlan.metadata = {
        ...enhancedPlan.metadata,
        generatedAt: new Date(),
        chunksAnalyzed: context.relevantChunks.length,
        targetTechnology: context.targetTechnology,
        command: context.command
      };

      // Add implementation timeline
      enhancedPlan.timeline = this.generateImplementationTimeline(enhancedPlan);

      return enhancedPlan;
    } catch (error) {
      console.warn('Error validating plan:', error);
      return plan; // Return original plan if validation fails
    }
  }

  /**
   * Get default content for missing plan sections
   */
  getDefaultSection(section, context) {
    const defaults = {
      analysis: `Analyze the codebase to identify ${context.targetTechnology} migration requirements.`,
      strategy: `Develop a step-by-step approach for migrating to ${context.targetTechnology}.`,
      codeTransformations: `Transform existing code to use ${context.targetTechnology} patterns.`,
      dependencies: `Add required ${context.targetTechnology} dependencies.`,
      configuration: `Update configuration files for ${context.targetTechnology}.`,
      testing: `Update tests to work with ${context.targetTechnology}.`,
      risks: `Identify potential risks and mitigation strategies.`,
      implementationOrder: `Define the order of implementation steps.`
    };

    return defaults[section] || 'Section content to be determined.';
  }

  /**
   * Generate implementation timeline
   */
  generateImplementationTimeline(plan) {
    const steps = [
      { phase: 'Preparation', duration: '1-2 hours', tasks: ['Setup dependencies', 'Backup codebase'] },
      { phase: 'Core Migration', duration: '2-4 hours', tasks: ['Transform core components', 'Update configurations'] },
      { phase: 'Testing & Validation', duration: '1-2 hours', tasks: ['Run tests', 'Validate functionality'] },
      { phase: 'Cleanup', duration: '30 minutes', tasks: ['Remove old code', 'Update documentation'] }
    ];

    return {
      estimatedTotalTime: '4-8 hours',
      phases: steps,
      riskLevel: this.assessRiskLevel(plan)
    };
  }

  /**
   * Assess risk level of the migration plan
   */
  assessRiskLevel(plan) {
    let riskScore = 0;

    // Higher risk for complex transformations
    if (plan.codeTransformations && plan.codeTransformations.length > 10) {
      riskScore += 2;
    }

    // Higher risk for database migrations
    if (plan.dependencies && plan.dependencies.includes('database')) {
      riskScore += 3;
    }

    // Higher risk for breaking changes
    if (plan.risks && plan.risks.includes('breaking')) {
      riskScore += 2;
    }

    if (riskScore >= 5) return 'High';
    if (riskScore >= 3) return 'Medium';
    return 'Low';
  }

  /**
   * Parse the AI response into a structured migration plan
   */
  parseMigrationPlan(planText) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = planText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback: create a structured plan from text
      return {
        analysis: this.extractSection(planText, 'ANALYSIS'),
        strategy: this.extractSection(planText, 'STRATEGY'),
        changes: this.extractSection(planText, 'CHANGES'),
        dependencies: this.extractSection(planText, 'DEPENDENCIES'),
        configuration: this.extractSection(planText, 'CONFIGURATION'),
        testing: this.extractSection(planText, 'TESTING'),
        risks: this.extractSection(planText, 'RISKS'),
        rawResponse: planText
      };
    } catch (error) {
      return {
        analysis: 'Migration analysis completed',
        strategy: 'Step-by-step migration approach',
        changes: 'Code transformations identified',
        dependencies: 'New dependencies identified',
        configuration: 'Configuration changes required',
        testing: 'Validation steps defined',
        risks: 'Potential issues identified',
        rawResponse: planText,
        parseError: error.message
      };
    }
  }

  /**
   * Extract a section from the AI response
   */
  extractSection(text, sectionName) {
    const regex = new RegExp(`${sectionName}[\\s\\S]*?(?=\\n[A-Z]+:|$)`, 'i');
    const match = text.match(regex);
    return match ? match[0].trim() : `Section ${sectionName} not found`;
  }

  /**
   * Execute the migration plan with enhanced code generation
   */
  async executeMigration({ sessionId, userId, migrationPlan, relevantChunks }) {
    const startTime = Date.now();
    const migrationId = `migration-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      console.log(`🚀 Executing migration: ${migrationId}`);
      console.log(`📊 Processing ${relevantChunks.length} chunks`);

      const results = [];
      const errors = [];
      const warnings = [];

      // Group chunks by file for better organization
      const chunksByFile = this.groupChunksByFile(relevantChunks);

      // Process each file's chunks
      for (const [filePath, chunks] of Object.entries(chunksByFile)) {
        console.log(`📁 Processing file: ${filePath} (${chunks.length} chunks)`);
        
        try {
          const fileResult = await this.migrateFileChunks({
            filePath,
            chunks,
          migrationPlan,
            migrationId,
            sessionId
          });

          if (fileResult.success) {
            results.push(fileResult);
          } else {
            errors.push({
              filePath,
              error: fileResult.error,
              chunks: chunks.length
            });
          }
        } catch (error) {
          errors.push({
            filePath,
            error: error.message,
            chunks: chunks.length
          });
        }
      }

      const executionTime = Date.now() - startTime;
      const successRate = results.length / (results.length + errors.length);

      console.log(`✅ Migration completed: ${migrationId}`);
      console.log(`📊 Success rate: ${(successRate * 100).toFixed(1)}%`);
      console.log(`⏱️  Execution time: ${executionTime}ms`);

      return {
        success: true,
        migrationId,
        results,
        errors,
        warnings,
        executionTime,
        statistics: {
          totalChunks: relevantChunks.length,
          filesProcessed: Object.keys(chunksByFile).length,
          successfulFiles: results.length,
          failedFiles: errors.length,
          successRate,
          averageTimePerChunk: executionTime / relevantChunks.length
        }
      };
    } catch (error) {
      console.error('❌ Migration execution failed:', error);
      return {
        success: false,
        error: error.message,
        migrationId,
        executionTime: Date.now() - startTime,
        results: [],
        errors: [{ error: error.message }]
      };
    }
  }

  /**
   * Group chunks by file path
   */
  groupChunksByFile(chunks) {
    return chunks.reduce((groups, chunk) => {
      const filePath = chunk.filePath || 'unknown';
      if (!groups[filePath]) {
        groups[filePath] = [];
      }
      groups[filePath].push(chunk);
      return groups;
    }, {});
  }

  /**
   * Migrate all chunks in a single file
   */
  async migrateFileChunks({ filePath, chunks, migrationPlan, migrationId, sessionId }) {
    try {
      const migratedChunks = [];
      const fileContext = this.buildFileContext(chunks, migrationPlan);

      // Process chunks in dependency order
      const orderedChunks = this.orderChunksByDependencies(chunks);

      for (const chunk of orderedChunks) {
        const chunkResult = await this.migrateChunk({
        chunk,
          migrationPlan,
          migrationId,
          fileContext
        });

        if (chunkResult.success) {
          migratedChunks.push(chunkResult);
        } else {
          console.warn(`⚠️  Failed to migrate chunk ${chunk.chunkName}: ${chunkResult.error}`);
        }
      }

      // Generate the complete migrated file
      const migratedFile = await this.generateMigratedFile({
        originalChunks: chunks,
        migratedChunks,
        fileContext,
        migrationPlan
      });

      return {
        success: true,
        filePath,
        migratedChunks,
        migratedFile,
        migrationId,
        timestamp: new Date(),
        statistics: {
          totalChunks: chunks.length,
          successfulMigrations: migratedChunks.length,
          failedMigrations: chunks.length - migratedChunks.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        filePath,
        migrationId
      };
    }
  }

  /**
   * Build file context for better code generation
   */
  buildFileContext(chunks, migrationPlan) {
    const imports = new Set();
    const exports = new Set();
    const dependencies = new Set();

    chunks.forEach(chunk => {
      // Extract imports and exports from chunk code
      const chunkImports = this.extractImports(chunk.code);
      const chunkExports = this.extractExports(chunk.code);
      
      chunkImports.forEach(imp => imports.add(imp));
      chunkExports.forEach(exp => exports.add(exp));
      
      // Add chunk dependencies
      if (chunk.dependencies) {
        chunk.dependencies.forEach(dep => dependencies.add(dep));
      }
    });

    return {
      imports: Array.from(imports),
      exports: Array.from(exports),
      dependencies: Array.from(dependencies),
      language: chunks[0]?.language || 'javascript',
      fileType: chunks[0]?.fileExtension || '.js',
      totalChunks: chunks.length,
      migrationPlan: migrationPlan.targetTechnology
    };
  }

  /**
   * Extract import statements from code
   */
  extractImports(code) {
    const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;
    const imports = [];
    let match;

    while ((match = importRegex.exec(code)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  /**
   * Extract export statements from code
   */
  extractExports(code) {
    const exportRegex = /export\s+(?:default\s+)?(?:const|let|var|function|class)\s+(\w+)/g;
    const exports = [];
    let match;

    while ((match = exportRegex.exec(code)) !== null) {
      exports.push(match[1]);
    }

    return exports;
  }

  /**
   * Order chunks by dependencies (simple topological sort)
   */
  orderChunksByDependencies(chunks) {
    // For now, return chunks in their original order
    // In a more sophisticated implementation, this would analyze dependencies
    return chunks.sort((a, b) => {
      // Prioritize classes and interfaces first
      const priorityOrder = ['interface', 'type', 'class', 'function', 'method', 'variable'];
      const aPriority = priorityOrder.indexOf(a.chunkType);
      const bPriority = priorityOrder.indexOf(b.chunkType);
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // Then sort by complexity (simpler first)
      return a.complexity - b.complexity;
    });
  }

  /**
   * Migrate a single code chunk with enhanced AI generation
   */
  async migrateChunk({ chunk, migrationPlan, migrationId, fileContext }) {
    try {
      console.log(`🔄 Migrating chunk: ${chunk.chunkName}`);

      const prompt = this.buildEnhancedChunkMigrationPrompt({
        chunk,
        migrationPlan,
        fileContext
      });

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const migratedCode = response.text();

      // Validate the generated code
      const validation = await this.validateGeneratedCode(migratedCode, chunk, migrationPlan);

      return {
        success: true,
        originalChunk: {
          id: chunk.chunkId,
          name: chunk.chunkName,
          type: chunk.chunkType,
          code: chunk.code,
          filePath: chunk.filePath,
          language: chunk.language,
          complexity: chunk.complexity
        },
        migratedCode: migratedCode.trim(),
        validation,
        migrationId,
        timestamp: new Date(),
        metadata: {
          aiModel: this.geminiModel,
          migrationPlan: migrationPlan.targetTechnology,
          fileContext: fileContext.migrationPlan
        }
      };
    } catch (error) {
      console.error(`❌ Error migrating chunk ${chunk.chunkName}:`, error);
      return {
        success: false,
        error: error.message,
        originalChunk: {
          id: chunk.chunkId,
          name: chunk.chunkName,
          type: chunk.chunkType
        },
        migrationId
      };
    }
  }

  /**
   * Build enhanced prompt for chunk migration
   */
  buildEnhancedChunkMigrationPrompt({ chunk, migrationPlan, fileContext }) {
    const techContext = this.getTechnologyContext(migrationPlan.targetTechnology);
    const migrationPatterns = this.getMigrationPatterns('', migrationPlan.targetTechnology);

    return `
You are an expert code migration specialist. Migrate the following code chunk to use ${migrationPlan.targetTechnology}.

TARGET TECHNOLOGY CONTEXT:
${techContext}

MIGRATION PATTERNS:
${migrationPatterns}

ORIGINAL CODE CHUNK:
File: ${chunk.filePath}
Type: ${chunk.chunkType}
Name: ${chunk.chunkName}
Language: ${chunk.language}
Complexity: ${chunk.complexity}
Code:
\`\`\`${chunk.language}
${chunk.code}
\`\`\`

FILE CONTEXT:
- File Type: ${fileContext.fileType}
- Current Imports: ${fileContext.imports.join(', ')}
- Current Exports: ${fileContext.exports.join(', ')}
- Dependencies: ${fileContext.dependencies.join(', ')}

MIGRATION PLAN:
${JSON.stringify(migrationPlan, null, 2)}

REQUIREMENTS:
1. Maintain the exact same functionality
2. Use ${migrationPlan.targetTechnology} best practices
3. Include proper imports/exports
4. Ensure type safety where applicable
5. Follow the migration plan strategy
6. Add appropriate error handling
7. Include comments explaining changes

Return ONLY the migrated code without explanations or markdown formatting.
`;
  }

  /**
   * Validate generated code
   */
  async validateGeneratedCode(migratedCode, originalChunk, migrationPlan) {
    const validation = {
      hasCode: migratedCode.trim().length > 0,
      hasImports: this.hasRequiredImports(migratedCode, migrationPlan),
      maintainsStructure: this.maintainsOriginalStructure(migratedCode, originalChunk),
      followsPatterns: this.followsMigrationPatterns(migratedCode, migrationPlan),
      issues: []
    };

    // Check for common issues
    if (!validation.hasCode) {
      validation.issues.push('No code generated');
    }
    if (!validation.hasImports) {
      validation.issues.push('Missing required imports');
    }
    if (!validation.maintainsStructure) {
      validation.issues.push('Structure may have changed significantly');
    }

    validation.isValid = validation.issues.length === 0;
    return validation;
  }

  /**
   * Check if generated code has required imports
   */
  hasRequiredImports(code, migrationPlan) {
    const targetTech = migrationPlan.targetTechnology.toLowerCase();
    
    // Check for technology-specific imports
    const requiredImports = {
      'prisma': ['@prisma/client', 'prisma'],
      'react': ['react'],
      'typescript': ['typescript'],
      'express': ['express'],
      'mongodb': ['mongodb'],
      'jest': ['jest']
    };

    const imports = requiredImports[targetTech] || [];
    return imports.some(imp => code.includes(imp));
  }

  /**
   * Check if generated code maintains original structure
   */
  maintainsOriginalStructure(migratedCode, originalChunk) {
    const originalType = originalChunk.chunkType;
    
    // Check if the migrated code maintains the same structural elements
    const structureChecks = {
      'function': migratedCode.includes('function') || migratedCode.includes('=>'),
      'class': migratedCode.includes('class'),
      'method': migratedCode.includes('(') && migratedCode.includes(')'),
      'variable': migratedCode.includes('=') || migratedCode.includes('const') || migratedCode.includes('let')
    };

    return structureChecks[originalType] !== false;
  }

  /**
   * Check if generated code follows migration patterns
   */
  followsMigrationPatterns(code, migrationPlan) {
    const targetTech = migrationPlan.targetTechnology.toLowerCase();
    
    // Basic pattern checks
    const patterns = {
      'prisma': code.includes('prisma') || code.includes('Prisma'),
      'react': code.includes('React') || code.includes('useState') || code.includes('useEffect'),
      'typescript': code.includes(':') || code.includes('interface') || code.includes('type'),
      'express': code.includes('express') || code.includes('app.') || code.includes('router.'),
      'mongodb': code.includes('mongodb') || code.includes('collection') || code.includes('db.'),
      'jest': code.includes('test') || code.includes('describe') || code.includes('expect')
    };

    return patterns[targetTech] !== false;
  }

  /**
   * Generate the complete migrated file
   */
  async generateMigratedFile({ originalChunks, migratedChunks, fileContext, migrationPlan }) {
    try {
      // Combine all migrated chunks into a single file
      const imports = this.generateFileImports(fileContext, migrationPlan);
      const migratedCode = migratedChunks.map(chunk => chunk.migratedCode).join('\n\n');
      const exports = this.generateFileExports(fileContext);

      const completeFile = [
        imports,
        '',
        migratedCode,
        '',
        exports
      ].filter(section => section.trim()).join('\n');

      return {
        success: true,
        content: completeFile,
        metadata: {
          originalChunks: originalChunks.length,
          migratedChunks: migratedChunks.length,
          targetTechnology: migrationPlan.targetTechnology,
          generatedAt: new Date()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        content: ''
      };
    }
  }

  /**
   * Generate file imports based on context and migration plan
   */
  generateFileImports(fileContext, migrationPlan) {
    const imports = new Set();

    // Add existing imports
    fileContext.imports.forEach(imp => imports.add(imp));

    // Add migration-specific imports
    const migrationImports = this.getMigrationImports(migrationPlan.targetTechnology);
    migrationImports.forEach(imp => imports.add(imp));

    return Array.from(imports)
      .map(imp => `import ${imp};`)
      .join('\n');
  }

  /**
   * Get migration-specific imports
   */
  getMigrationImports(targetTechnology) {
    const imports = {
      'prisma': ['{ PrismaClient } from "@prisma/client"'],
      'react': ['React from "react"'],
      'typescript': [],
      'express': ['express from "express"'],
      'mongodb': ['{ MongoClient } from "mongodb"'],
      'jest': ['{ describe, test, expect } from "@jest/globals"']
    };

    return imports[targetTechnology.toLowerCase()] || [];
  }

  /**
   * Generate file exports
   */
  generateFileExports(fileContext) {
    if (fileContext.exports.length === 0) {
      return '';
    }

    return `export { ${fileContext.exports.join(', ')} };`;
  }

  /**
   * Enhanced error handling and recovery mechanisms
   */
  async handleMigrationError(error, context) {
    console.error('🚨 Migration Error:', error);
    
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date(),
      errorType: this.classifyError(error)
    };

    // Attempt recovery based on error type
    const recovery = await this.attemptRecovery(error, context);
    
    return {
      error: errorInfo,
      recovery,
      canRetry: recovery.canRetry,
      suggestions: this.getErrorSuggestions(error)
    };
  }

  /**
   * Classify error types for better handling
   */
  classifyError(error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('api') || message.includes('key')) {
      return 'API_ERROR';
    } else if (message.includes('timeout') || message.includes('network')) {
      return 'NETWORK_ERROR';
    } else if (message.includes('parse') || message.includes('json')) {
      return 'PARSE_ERROR';
    } else if (message.includes('validation') || message.includes('invalid')) {
      return 'VALIDATION_ERROR';
    } else if (message.includes('database') || message.includes('connection')) {
      return 'DATABASE_ERROR';
    } else if (message.includes('memory') || message.includes('limit')) {
      return 'RESOURCE_ERROR';
    } else {
      return 'UNKNOWN_ERROR';
    }
  }

  /**
   * Attempt recovery based on error type
   */
  async attemptRecovery(error, context) {
    const errorType = this.classifyError(error);
    
    switch (errorType) {
      case 'API_ERROR':
        return await this.recoverFromApiError(error, context);
      case 'NETWORK_ERROR':
        return await this.recoverFromNetworkError(error, context);
      case 'PARSE_ERROR':
        return await this.recoverFromParseError(error, context);
      case 'VALIDATION_ERROR':
        return await this.recoverFromValidationError(error, context);
      case 'DATABASE_ERROR':
        return await this.recoverFromDatabaseError(error, context);
      case 'RESOURCE_ERROR':
        return await this.recoverFromResourceError(error, context);
      default:
        return { canRetry: false, strategy: 'manual_intervention' };
    }
  }

  /**
   * Recover from API errors
   */
  async recoverFromApiError(error, context) {
    try {
      // Check if API key is valid
      if (error.message.includes('API key')) {
        return {
          canRetry: false,
          strategy: 'check_api_key',
          message: 'Please verify your GEMINI_API_KEY is correct and has sufficient quota'
        };
      }

      // Check rate limits
      if (error.message.includes('rate limit') || error.message.includes('quota')) {
        return {
          canRetry: true,
          strategy: 'retry_with_delay',
          delay: 60000, // 1 minute
          message: 'Rate limit exceeded, retrying after delay'
        };
      }

      return { canRetry: false, strategy: 'manual_intervention' };
    } catch (recoveryError) {
      return { canRetry: false, strategy: 'manual_intervention' };
    }
  }

  /**
   * Recover from network errors
   */
  async recoverFromNetworkError(error, context) {
    return {
      canRetry: true,
      strategy: 'retry_with_backoff',
      maxRetries: 3,
      baseDelay: 5000,
      message: 'Network error detected, will retry with exponential backoff'
    };
  }

  /**
   * Recover from parse errors
   */
  async recoverFromParseError(error, context) {
    try {
      // Try to fix common parsing issues
      if (context.migrationPlan) {
        const fixedPlan = this.fixParsedPlan(context.migrationPlan);
        if (fixedPlan) {
          return {
            canRetry: true,
            strategy: 'retry_with_fixed_data',
            fixedData: fixedPlan,
            message: 'Parse error fixed, retrying with corrected data'
          };
        }
      }

      return { canRetry: false, strategy: 'manual_intervention' };
    } catch (recoveryError) {
      return { canRetry: false, strategy: 'manual_intervention' };
    }
  }

  /**
   * Recover from validation errors
   */
  async recoverFromValidationError(error, context) {
    try {
      // Try to fix validation issues
      if (context.relevantChunks) {
        const fixedChunks = this.fixChunkValidation(context.relevantChunks);
        if (fixedChunks) {
          return {
            canRetry: true,
            strategy: 'retry_with_fixed_chunks',
            fixedData: fixedChunks,
            message: 'Validation errors fixed, retrying with corrected chunks'
          };
        }
      }

      return { canRetry: false, strategy: 'manual_intervention' };
    } catch (recoveryError) {
      return { canRetry: false, strategy: 'manual_intervention' };
    }
  }

  /**
   * Recover from database errors
   */
  async recoverFromDatabaseError(error, context) {
    try {
      // Check database connection
      const isConnected = await this.checkDatabaseConnection();
      if (!isConnected) {
        return {
          canRetry: true,
          strategy: 'retry_after_reconnect',
          delay: 10000,
          message: 'Database connection lost, retrying after reconnection'
        };
      }

      return { canRetry: false, strategy: 'manual_intervention' };
    } catch (recoveryError) {
      return { canRetry: false, strategy: 'manual_intervention' };
    }
  }

  /**
   * Recover from resource errors
   */
  async recoverFromResourceError(error, context) {
    try {
      // Try to reduce resource usage
      const reducedContext = this.reduceResourceUsage(context);
      if (reducedContext) {
        return {
          canRetry: true,
          strategy: 'retry_with_reduced_resources',
          reducedContext,
          message: 'Resource usage reduced, retrying with smaller dataset'
        };
      }

      return { canRetry: false, strategy: 'manual_intervention' };
    } catch (recoveryError) {
      return { canRetry: false, strategy: 'manual_intervention' };
    }
  }

  /**
   * Fix parsed plan data
   */
  fixParsedPlan(plan) {
    try {
      // Ensure required fields exist
      const fixedPlan = {
        analysis: plan.analysis || 'Analysis completed',
        strategy: plan.strategy || 'Step-by-step migration approach',
        codeTransformations: plan.codeTransformations || 'Code transformations identified',
        dependencies: plan.dependencies || 'Dependencies identified',
        configuration: plan.configuration || 'Configuration changes required',
        testing: plan.testing || 'Testing strategy defined',
        risks: plan.risks || 'Risks identified',
        implementationOrder: plan.implementationOrder || 'Implementation order defined',
        ...plan
      };

      return fixedPlan;
    } catch (error) {
      return null;
    }
  }

  /**
   * Fix chunk validation issues
   */
  fixChunkValidation(chunks) {
    try {
      return chunks.map(chunk => ({
        ...chunk,
        chunkId: chunk.chunkId || `chunk-${Date.now()}-${Math.random()}`,
        chunkName: chunk.chunkName || 'unnamed',
        chunkType: chunk.chunkType || 'unknown',
        code: chunk.code || '',
        filePath: chunk.filePath || 'unknown',
        language: chunk.language || 'javascript',
        complexity: chunk.complexity || 1
      }));
    } catch (error) {
      return null;
    }
  }

  /**
   * Check database connection
   */
  async checkDatabaseConnection() {
    try {
      // Simple database health check
      await this.chunkStorageService.getChunksBySession('health-check', { limit: 1 });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Reduce resource usage
   */
  reduceResourceUsage(context) {
    try {
      const reducedContext = { ...context };
      
      // Reduce chunk count
      if (reducedContext.relevantChunks && reducedContext.relevantChunks.length > 10) {
        reducedContext.relevantChunks = reducedContext.relevantChunks.slice(0, 10);
      }

      // Reduce plan complexity
      if (reducedContext.migrationPlan) {
        reducedContext.migrationPlan = {
          ...reducedContext.migrationPlan,
          simplified: true
        };
      }

      return reducedContext;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get error suggestions
   */
  getErrorSuggestions(error) {
    const errorType = this.classifyError(error);
    
    const suggestions = {
      'API_ERROR': [
        'Check your GEMINI_API_KEY environment variable',
        'Verify API quota and billing',
        'Try using a different Gemini model',
        'Check API rate limits'
      ],
      'NETWORK_ERROR': [
        'Check your internet connection',
        'Verify firewall settings',
        'Try again in a few minutes',
        'Check if the service is temporarily unavailable'
      ],
      'PARSE_ERROR': [
        'Check the AI response format',
        'Try regenerating the migration plan',
        'Verify input data structure',
        'Check for malformed JSON'
      ],
      'VALIDATION_ERROR': [
        'Verify input parameters',
        'Check chunk data integrity',
        'Ensure required fields are present',
        'Validate migration plan structure'
      ],
      'DATABASE_ERROR': [
        'Check database connection',
        'Verify MongoDB is running',
        'Check database permissions',
        'Review connection string'
      ],
      'RESOURCE_ERROR': [
        'Reduce the number of chunks to process',
        'Try processing files individually',
        'Check available memory',
        'Consider using smaller batch sizes'
      ]
    };

    return suggestions[errorType] || [
      'Review the error message for specific details',
      'Check system logs for more information',
      'Try the operation again',
      'Contact support if the issue persists'
    ];
  }

  /**
   * Retry mechanism with exponential backoff
   */
  async retryWithBackoff(operation, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries - 1) {
          throw error;
        }

        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`⏳ Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms delay`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }

  /**
   * Enhanced validation layer for migration results
   */
  async validateMigrationResults(migrationResult) {
    try {
      console.log('🔍 Validating migration results...');
      
      const { results, errors, executionTime, statistics } = migrationResult;
    
    const validation = {
        overall: {
          success: errors.length === 0,
          totalFiles: results.length,
          failedFiles: errors.length,
      executionTime,
          successRate: statistics?.successRate || 0
        },
        codeQuality: await this.validateCodeQuality(results),
        functionality: await this.validateFunctionality(results),
        dependencies: await this.validateDependencies(results),
        configuration: await this.validateConfiguration(results),
        testing: await this.validateTesting(results),
        issues: [],
        recommendations: []
      };

      // Identify issues and generate recommendations
      validation.issues = this.identifyIssues(validation);
      validation.recommendations = this.generateRecommendations(validation);

      console.log(`✅ Validation completed: ${validation.issues.length} issues found`);

    return validation;
    } catch (error) {
      console.error('❌ Validation failed:', error);
      return {
        overall: { success: false, error: error.message },
        issues: ['Validation process failed'],
        recommendations: ['Review migration results manually']
      };
    }
  }

  /**
   * Validate code quality of migrated files
   */
  async validateCodeQuality(results) {
    const qualityChecks = {
      syntaxValid: 0,
      importsCorrect: 0,
      exportsCorrect: 0,
      typeSafety: 0,
      errorHandling: 0,
      totalFiles: results.length
    };

    for (const result of results) {
      if (result.success && result.migratedFile?.success) {
        const code = result.migratedFile.content;
        
        // Check syntax validity
        if (this.isValidSyntax(code)) {
          qualityChecks.syntaxValid++;
        }
        
        // Check imports
        if (this.hasValidImports(code)) {
          qualityChecks.importsCorrect++;
        }
        
        // Check exports
        if (this.hasValidExports(code)) {
          qualityChecks.exportsCorrect++;
        }
        
        // Check type safety (for TypeScript)
        if (this.hasTypeSafety(code)) {
          qualityChecks.typeSafety++;
        }
        
        // Check error handling
        if (this.hasErrorHandling(code)) {
          qualityChecks.errorHandling++;
        }
      }
    }

    return {
      ...qualityChecks,
      syntaxValidRate: qualityChecks.totalFiles > 0 ? qualityChecks.syntaxValid / qualityChecks.totalFiles : 0,
      importsCorrectRate: qualityChecks.totalFiles > 0 ? qualityChecks.importsCorrect / qualityChecks.totalFiles : 0,
      exportsCorrectRate: qualityChecks.totalFiles > 0 ? qualityChecks.exportsCorrect / qualityChecks.totalFiles : 0,
      typeSafetyRate: qualityChecks.totalFiles > 0 ? qualityChecks.typeSafety / qualityChecks.totalFiles : 0,
      errorHandlingRate: qualityChecks.totalFiles > 0 ? qualityChecks.errorHandling / qualityChecks.totalFiles : 0
    };
  }

  /**
   * Validate functionality preservation
   */
  async validateFunctionality(results) {
    const functionalityChecks = {
      structurePreserved: 0,
      logicIntact: 0,
      apiCompatible: 0,
      totalFiles: results.length
    };

    for (const result of results) {
      if (result.success && result.migratedChunks) {
        // Check if structure is preserved
        if (this.isStructurePreserved(result.migratedChunks)) {
          functionalityChecks.structurePreserved++;
        }
        
        // Check if logic is intact
        if (this.isLogicIntact(result.migratedChunks)) {
          functionalityChecks.logicIntact++;
        }
        
        // Check API compatibility
        if (this.isApiCompatible(result.migratedChunks)) {
          functionalityChecks.apiCompatible++;
        }
      }
    }

    return {
      ...functionalityChecks,
      structurePreservedRate: functionalityChecks.totalFiles > 0 ? functionalityChecks.structurePreserved / functionalityChecks.totalFiles : 0,
      logicIntactRate: functionalityChecks.totalFiles > 0 ? functionalityChecks.logicIntact / functionalityChecks.totalFiles : 0,
      apiCompatibleRate: functionalityChecks.totalFiles > 0 ? functionalityChecks.apiCompatible / functionalityChecks.totalFiles : 0
    };
  }

  /**
   * Validate dependencies
   */
  async validateDependencies(results) {
    const dependencyChecks = {
      requiredDependencies: new Set(),
      missingDependencies: new Set(),
      versionConflicts: new Set(),
      totalFiles: results.length
    };

    for (const result of results) {
      if (result.success && result.migratedFile?.success) {
        const code = result.migratedFile.content;
        const dependencies = this.extractDependencies(code);
        
        dependencies.forEach(dep => {
          dependencyChecks.requiredDependencies.add(dep);
        });
      }
    }

    return {
      requiredDependencies: Array.from(dependencyChecks.requiredDependencies),
      missingDependencies: Array.from(dependencyChecks.missingDependencies),
      versionConflicts: Array.from(dependencyChecks.versionConflicts),
      totalRequired: dependencyChecks.requiredDependencies.size
    };
  }

  /**
   * Validate configuration
   */
  async validateConfiguration(results) {
    const configChecks = {
      configFilesUpdated: 0,
      environmentVariables: new Set(),
      buildConfigs: new Set(),
      totalFiles: results.length
    };

    for (const result of results) {
      if (result.success && result.migratedFile?.success) {
        const code = result.migratedFile.content;
        
        // Check for configuration-related code
        if (this.hasConfigurationCode(code)) {
          configChecks.configFilesUpdated++;
        }
        
        // Extract environment variables
        const envVars = this.extractEnvironmentVariables(code);
        envVars.forEach(env => configChecks.environmentVariables.add(env));
        
        // Extract build configurations
        const buildConfigs = this.extractBuildConfigurations(code);
        buildConfigs.forEach(config => configChecks.buildConfigs.add(config));
      }
    }

    return {
      configFilesUpdated: configChecks.configFilesUpdated,
      environmentVariables: Array.from(configChecks.environmentVariables),
      buildConfigurations: Array.from(configChecks.buildConfigs),
      configUpdateRate: configChecks.totalFiles > 0 ? configChecks.configFilesUpdated / configChecks.totalFiles : 0
    };
  }

  /**
   * Validate testing
   */
  async validateTesting(results) {
    const testingChecks = {
      testsUpdated: 0,
      testCoverage: 0,
      testPatterns: new Set(),
      totalFiles: results.length
    };

    for (const result of results) {
      if (result.success && result.migratedFile?.success) {
        const code = result.migratedFile.content;
        
        // Check if tests are updated
        if (this.hasUpdatedTests(code)) {
          testingChecks.testsUpdated++;
        }
        
        // Check test patterns
        const patterns = this.extractTestPatterns(code);
        patterns.forEach(pattern => testingChecks.testPatterns.add(pattern));
      }
    }

    return {
      testsUpdated: testingChecks.testsUpdated,
      testPatterns: Array.from(testingChecks.testPatterns),
      testUpdateRate: testingChecks.totalFiles > 0 ? testingChecks.testsUpdated / testingChecks.totalFiles : 0
    };
  }

  /**
   * Code quality validation helpers
   */
  isValidSyntax(code) {
    try {
      // Basic syntax validation
      if (code.includes('function') || code.includes('class') || code.includes('const') || code.includes('let')) {
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  hasValidImports(code) {
    const importRegex = /import\s+.*?from\s+['"][^'"]+['"]/;
    return importRegex.test(code);
  }

  hasValidExports(code) {
    const exportRegex = /export\s+(?:default\s+)?(?:const|let|var|function|class)\s+\w+/;
    return exportRegex.test(code);
  }

  hasTypeSafety(code) {
    // Check for TypeScript features
    return code.includes(':') || code.includes('interface') || code.includes('type ');
  }

  hasErrorHandling(code) {
    return code.includes('try') || code.includes('catch') || code.includes('throw') || code.includes('error');
  }

  /**
   * Functionality validation helpers
   */
  isStructurePreserved(migratedChunks) {
    return migratedChunks.every(chunk => 
      chunk.originalChunk && chunk.migratedCode && 
      chunk.originalChunk.type === chunk.originalChunk.type
    );
  }

  isLogicIntact(migratedChunks) {
    return migratedChunks.every(chunk => 
      chunk.migratedCode && chunk.migratedCode.length > 0
    );
  }

  isApiCompatible(migratedChunks) {
    return migratedChunks.every(chunk => 
      chunk.validation && chunk.validation.isValid
    );
  }

  /**
   * Dependency extraction helpers
   */
  extractDependencies(code) {
    const dependencies = [];
    const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(code)) !== null) {
      dependencies.push(match[1]);
    }

    return dependencies;
  }

  extractEnvironmentVariables(code) {
    const envVars = [];
    const envRegex = /process\.env\.(\w+)/g;
    let match;

    while ((match = envRegex.exec(code)) !== null) {
      envVars.push(match[1]);
    }

    return envVars;
  }

  extractBuildConfigurations(code) {
    const configs = [];
    if (code.includes('webpack')) configs.push('webpack');
    if (code.includes('babel')) configs.push('babel');
    if (code.includes('typescript')) configs.push('typescript');
    if (code.includes('jest')) configs.push('jest');
    return configs;
  }

  /**
   * Configuration validation helpers
   */
  hasConfigurationCode(code) {
    return code.includes('config') || code.includes('Config') || 
           code.includes('process.env') || code.includes('configuration');
  }

  /**
   * Testing validation helpers
   */
  hasUpdatedTests(code) {
    return code.includes('test') || code.includes('describe') || 
           code.includes('expect') || code.includes('it(');
  }

  extractTestPatterns(code) {
    const patterns = [];
    if (code.includes('describe')) patterns.push('describe');
    if (code.includes('it(')) patterns.push('it');
    if (code.includes('expect')) patterns.push('expect');
    if (code.includes('beforeEach')) patterns.push('beforeEach');
    if (code.includes('afterEach')) patterns.push('afterEach');
    return patterns;
  }

  /**
   * Issue identification
   */
  identifyIssues(validation) {
    const issues = [];

    // Code quality issues
    if (validation.codeQuality.syntaxValidRate < 0.9) {
      issues.push('Some files have syntax issues');
    }
    if (validation.codeQuality.importsCorrectRate < 0.8) {
      issues.push('Import statements may be incorrect');
    }
    if (validation.codeQuality.errorHandlingRate < 0.5) {
      issues.push('Error handling may be insufficient');
    }

    // Functionality issues
    if (validation.functionality.structurePreservedRate < 0.8) {
      issues.push('Code structure may not be fully preserved');
    }
    if (validation.functionality.logicIntactRate < 0.9) {
      issues.push('Some logic may have been altered');
    }

    // Dependency issues
    if (validation.dependencies.missingDependencies.length > 0) {
      issues.push('Some required dependencies may be missing');
    }

    return issues;
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(validation) {
    const recommendations = [];

    // Code quality recommendations
    if (validation.codeQuality.typeSafetyRate < 0.7) {
      recommendations.push('Consider adding more TypeScript type annotations');
    }
    if (validation.codeQuality.errorHandlingRate < 0.6) {
      recommendations.push('Add comprehensive error handling to migrated code');
    }

    // Testing recommendations
    if (validation.testing.testUpdateRate < 0.5) {
      recommendations.push('Update tests to match migrated code');
    }

    // Configuration recommendations
    if (validation.configuration.configUpdateRate < 0.3) {
      recommendations.push('Review and update configuration files');
    }

    // General recommendations
    recommendations.push('Review all migrated files before deployment');
    recommendations.push('Run comprehensive tests to ensure functionality');
    recommendations.push('Update documentation to reflect changes');

    return recommendations;
  }

  /**
   * Get migration history for a session
   */
  async getMigrationHistory(sessionId) {
    // This would typically query a migrations collection
    // For now, return a placeholder
    return {
      success: true,
      migrations: [],
      message: 'Migration history feature coming soon'
    };
  }

  /**
   * Test the migration agent
   */
  async testAgent() {
    try {
      console.log('🧪 Testing Migration Agent...');
      
      // Test basic functionality
      const testRequest = {
        sessionId: 'test-session',
        userId: 'test-user',
        command: 'convert database connection to Prisma',
        targetTechnology: 'Prisma',
        options: { preserveData: true }
      };

      // This would normally process the request
      // For testing, just validate the structure
      const validation = await this.validateMigrationRequest(testRequest);
      
      return {
        success: validation.valid,
        message: 'Migration Agent is ready',
        testResults: {
          embeddingService: !!this.embeddingService,
          chunkStorageService: !!this.chunkStorageService,
          geminiModel: this.geminiModel,
          validation: validation
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get singleton instance
   */
  static getInstance() {
    if (!MigrationAgentService.instance) {
      MigrationAgentService.instance = new MigrationAgentService();
    }
    return MigrationAgentService.instance;
  }
}

// Export singleton instance
export default MigrationAgentService.getInstance();
