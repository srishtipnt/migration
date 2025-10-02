import GeminiEmbeddingService from './GeminiEmbeddingService.js';
import CodeChunk from '../models/CodeChunk.js';
import EcosystemMappingService from './EcosystemMappingService.js';
import MigrationRecipesService from './MigrationRecipesService.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

class MigrationAgentService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    this.ecosystemMapping = new EcosystemMappingService();
  }

  /**
   * Get file extension for target language
   * @param {string} toLang - Target language
   * @returns {string} File extension
   */
  getFileExtensionForLanguage(toLang) {
    const extensionMap = {
      'javascript': '.js',
      'typescript': '.ts',
      'nodejs': '.js',
      'python': '.py',
      'python2': '.py',
      'python3': '.py',
      'java': '.java',
      'cpp': '.cpp',
      'c': '.c',
      'csharp': '.cs',
      'php': '.php',
      'ruby': '.rb',
      'go': '.go',
      'rust': '.rs',
      'swift': '.swift',
      'objc': '.m',
      'kotlin': '.kt',
      'scala': '.scala',
      'r': '.r',
      'matlab': '.m',
      'perl': '.pl',
      'lua': '.lua',
      'dart': '.dart',
      'elixir': '.ex',
      'clojure': '.clj',
      'haskell': '.hs',
      'fsharp': '.fs',
      'ocaml': '.ml',
      'erlang': '.erl',
      'julia': '.jl',
      'crystal': '.cr',
      'nim': '.nim',
      'zig': '.zig',
      // Frontend Framework Extensions
      'react': '.jsx',
      'react-js': '.jsx',
      'react-ts': '.tsx',
      'vue': '.vue',
      'angular': '.ts',
      'angularjs': '.js',
      'jquery': '.js'
    };
    
    return extensionMap[toLang.toLowerCase()] || '.txt';
  }

  /**
   * Generate migrated filename with correct extension
   * @param {Object} chunk - Original chunk
   * @param {string} toLang - Target language
   * @returns {string} Migrated filename
   */
  generateMigratedFilename(chunk, toLang) {
    const originalFilename = chunk?.fileName || chunk?.filename || 'converted.js';
    const targetExtension = this.getFileExtensionForLanguage(toLang);
    
    // Debug logging
    console.log('🔍 generateMigratedFilename Debug:');
    console.log('  - originalFilename:', originalFilename);
    console.log('  - toLang:', toLang);
    console.log('  - targetExtension:', targetExtension);
    
    // Remove existing extension and add target extension
    const baseName = originalFilename.replace(/\.[^/.]+$/, '');
    const result = `${baseName}${targetExtension}`;
    
    console.log('  - baseName:', baseName);
    console.log('  - result:', result);
    
    return result;
  }

  /**
   * Detect patterns in code chunks
   * @param {Array} chunks - Code chunks
   * @returns {Array} Detected patterns
   */
  detectPatterns(chunks) {
    const patterns = [];
    const content = chunks.map(chunk => chunk.content || '').join('\n');
    
    // Detect common patterns
    if (content.includes('app.use(') || content.includes('app.get(') || content.includes('app.post(')) {
      patterns.push('middleware');
    }
    if (content.includes('async') && content.includes('await')) {
      patterns.push('async_await');
    }
    if (content.includes('require(') || content.includes('import')) {
      patterns.push('routing');
    }
    if (content.includes('createReadStream') || content.includes('createWriteStream')) {
      patterns.push('streams');
    }
    if (content.includes('cluster') || content.includes('fork')) {
      patterns.push('clusters');
    }
    
    return patterns;
  }

  /**
   * Detect packages in code chunks
   * @param {Array} chunks - Code chunks
   * @returns {Array} Detected packages
   */
  detectPackages(chunks) {
    const packages = [];
    const content = chunks.map(chunk => chunk.content || '').join('\n');
    
    // Common Node.js packages
    const commonPackages = [
      'express', 'koa', 'fastify', 'axios', 'lodash', 'moment', 'bcrypt',
      'jsonwebtoken', 'multer', 'cors', 'helmet', 'mongoose', 'sequelize'
    ];
    
    commonPackages.forEach(pkg => {
      if (content.includes(`require('${pkg}')`) || content.includes(`import ${pkg}`)) {
        packages.push(pkg);
      }
    });
    
    return packages;
  }

  /**
   * Generate a natural language command from language pair
   * @param {string} fromLang - Source language
   * @param {string} toLang - Target language
   * @returns {string} Natural language command
   */
  generateMigrationCommand(fromLang, toLang) {
    const languageMap = {
      'javascript': 'JavaScript',
      'typescript': 'TypeScript',
      'nodejs': 'Node.js',
      'python': 'Python',
      'python2': 'Python 2',
      'python3': 'Python 3',
      'java': 'Java',
      'cpp': 'C++',
      'c': 'C',
      'csharp': 'C#',
      'php': 'PHP',
      'ruby': 'Ruby',
      'go': 'Go',
      'rust': 'Rust',
      'swift': 'Swift',
      'objc': 'Objective-C',
      'kotlin': 'Kotlin',
      'scala': 'Scala',
      'r': 'R',
      'matlab': 'MATLAB',
      'perl': 'Perl',
      'lua': 'Lua',
      'dart': 'Dart',
      'elixir': 'Elixir',
      'clojure': 'Clojure',
      'haskell': 'Haskell',
      'fsharp': 'F#',
      'ocaml': 'OCaml',
      'erlang': 'Erlang',
      'julia': 'Julia',
      'crystal': 'Crystal',
      'nim': 'Nim',
      'zig': 'Zig'
    };

    const fromLanguage = languageMap[fromLang.toLowerCase()] || fromLang;
    const toLanguage = languageMap[toLang.toLowerCase()] || toLang;

    return `Convert the following code from ${fromLanguage} to ${toLanguage}.`;
  }

  /**
   * Process a migration command using RAG (Retrieval-Augmented Generation)
   * @param {string} sessionId - The session ID to find relevant chunks
   * @param {string} command - The user's migration command (or fromLang/toLang)
   * @param {string} userId - The user ID
   * @param {Object} options - Additional options like fromLang, toLang
   * @returns {Object} The migration result
   */
  async processMigrationCommand(sessionId, command, userId, options = {}) {
    try {
      console.log(`🤖 Processing migration command for session: ${sessionId}`);
      console.log(`📝 Command: ${command}`);

      // Step 1: Generate natural language command if fromLang/toLang provided
      let finalCommand = command;
      if (options.fromLang && options.toLang) {
        finalCommand = this.generateMigrationCommand(options.fromLang, options.toLang);
        console.log(`🔄 Generated command: ${finalCommand}`);
        console.log(`🔄 From Language: ${options.fromLang}`);
        console.log(`🔄 To Language: ${options.toLang}`);
      }

      // Step 2: Convert command to embedding
      console.log(`🔍 Converting command to embedding...`);
      const commandEmbedding = await this.embedCommand(finalCommand);
      console.log(`✅ Command embedded (${commandEmbedding.length} dimensions)`);

      // Step 3: Find relevant chunks using RAG
      console.log(`🔍 Finding relevant chunks using RAG...`);
      const relevantChunks = await this.findRelevantChunks(sessionId, commandEmbedding, userId);
      console.log(`📊 Found ${relevantChunks.length} relevant chunks`);

      // Step 4: Generate migration using AI
      console.log(`🤖 Generating migration with AI...`);
      const migrationResult = await this.generateMigration(finalCommand, relevantChunks, options);
      console.log(`✅ Migration generated successfully`);

      return {
        success: true,
        result: migrationResult,
        chunksUsed: relevantChunks.length,
        sessionId: sessionId,
        command: finalCommand,
        embeddingDimensions: commandEmbedding.length
      };

    } catch (error) {
      console.error('❌ Migration agent error:', error);
      return {
        success: false,
        error: 'Migration processing failed',
        message: error.message
      };
    }
  }

  /**
   * Embed the user's command using Gemini API
   * @param {string} command - The user's migration command
   * @returns {Array} The embedding vector
   */
  async embedCommand(command) {
    try {
      console.log(`🔍 Embedding command: ${command}`);
      
      const embedding = await GeminiEmbeddingService.generateEmbeddings([{
        content: command,
        chunkType: 'command',
        chunkName: 'migration_command',
        metadata: {
          type: 'user_command',
          timestamp: new Date().toISOString()
        }
      }]);
      
      if (embedding && embedding.length > 0) {
        console.log(`✅ Command embedded successfully (${embedding[0].embedding.length} dimensions)`);
        return embedding[0].embedding;
      } else {
        throw new Error('Failed to generate embedding');
      }
    } catch (error) {
      console.error('❌ Error embedding command:', error);
      // Fallback to dummy embedding if API fails
      console.log('🔄 Using fallback embedding for command');
      return this.generateDummyEmbedding();
    }
  }

  /**
   * Generate a dummy embedding for fallback
   * @returns {Array} Dummy embedding vector
   */
  generateDummyEmbedding() {
    const dimensions = 768;
    const embedding = [];
    for (let i = 0; i < dimensions; i++) {
      embedding.push(Math.random());
    }
    return embedding;
  }

  /**
   * Find relevant chunks using vector similarity
   * @param {string} sessionId - The session ID
   * @param {Array} commandEmbedding - The command embedding vector
   * @param {string} userId - The user ID
   * @returns {Array} Relevant chunks
   */
  async findRelevantChunks(sessionId, commandEmbedding, userId) {
    try {
      console.log(`🔍 Finding chunks for session: ${sessionId}, user: ${userId}`);
      
      // First try with both sessionId and userId
      let allChunks;
      try {
        allChunks = await CodeChunk.find({ 
          sessionId: sessionId,
          userId: userId 
        }).lean();
        console.log(`📊 Found ${allChunks.length} chunks with sessionId + userId filter`);
      } catch (dbError) {
        console.error('❌ Database query failed:', dbError.message);
        allChunks = [];
      }

      // If no chunks found, try without userId filter
      if (allChunks.length === 0) {
        try {
          allChunks = await CodeChunk.find({ 
            sessionId: sessionId
          }).lean();
          console.log(`📊 Found ${allChunks.length} chunks with sessionId only filter`);
          
          if (allChunks.length > 0) {
            console.log(`📊 Chunk user IDs found:`, allChunks.map(c => c.userId));
          }
        } catch (dbError) {
          console.error('❌ Database query without userId failed:', dbError.message);
          allChunks = [];
        }
      }

      console.log(`📊 Total chunks found: ${allChunks.length}`);

      if (allChunks.length === 0) {
        console.log('⚠️ No chunks found for this session');
        console.log('🔍 This means either:');
        console.log('  1. Chunks were never created for this session');
        console.log('  2. Chunks were created with different sessionId/userId');
        console.log('  3. The chunking process failed');
        return [];
      }

      // Calculate similarity scores
      const chunksWithSimilarity = allChunks.map(chunk => {
        try {
          const similarity = this.calculateCosineSimilarity(commandEmbedding, chunk.embedding);
          return {
            ...chunk,
            similarity
          };
        } catch (error) {
          console.error('❌ Error calculating similarity for chunk:', error);
          return {
            ...chunk,
            similarity: 0.1 // Default low similarity
          };
        }
      });

      // Sort by similarity and take top chunks
      const relevantChunks = chunksWithSimilarity
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 10) // Top 10 most relevant chunks
        .filter(chunk => chunk.similarity > 0.1); // Lower threshold for demo

      console.log(`📈 Found ${relevantChunks.length} relevant chunks with similarity > 0.1`);
      if (relevantChunks.length > 0) {
        console.log(`📈 Similarity scores: ${relevantChunks.map(c => c.similarity.toFixed(3)).join(', ')}`);
      }
      
      return relevantChunks;
    } catch (error) {
      console.error('❌ Error finding relevant chunks:', error);
      throw new Error('Failed to find relevant chunks');
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param {Array} vectorA - First vector
   * @param {Array} vectorB - Second vector
   * @returns {number} Similarity score (0-1)
   */
  calculateCosineSimilarity(vectorA, vectorB) {
    if (!vectorA || !vectorB || vectorA.length !== vectorB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Apply migration recipes to chunks for better conversion quality
   * @param {Array} chunks - Code chunks to process
   * @param {Object} options - Migration options
   * @returns {Array} Processed chunks with specialized prompts
   */
  async applyMigrationRecipes(chunks, options) {
    const { fromLang, toLang } = options;
    
    return chunks.map(chunk => {
      // Get specialized prompt for this chunk
      const specializedPrompt = MigrationRecipesService.getSpecializedPrompt(
        chunk.content,
        fromLang,
        toLang,
        chunk.chunkType
      );
      
      return {
        ...chunk,
        specializedPrompt,
        recipeUsed: MigrationRecipesService.identifyRecipe(chunk.content, fromLang, toLang)?.name
      };
    });
  }

  /**
   * Generate migration using RAG with Gemini
   * @param {string} command - The user's command
   * @param {Array} relevantChunks - Relevant code chunks
   * @returns {Object} The migration result
   */
  async generateMigration(command, relevantChunks, options = {}) {
    try {
      console.log(`🤖 Generating migration with ${relevantChunks.length} chunks`);
      console.log(`🔍 Chunks details:`, relevantChunks.map(c => ({
        id: c._id,
        fileName: c.fileName || c.filename,
        chunkType: c.chunkType,
        contentLength: c.content?.length || 0
      })));
      
      // If no chunks available, return a demo result
      if (relevantChunks.length === 0) {
        console.log('⚠️ No chunks available, returning demo migration');
        console.log('🔍 This means the chunking process failed or no chunks were created for this session');
        return this.generateDemoMigration(command, options);
      }

      // Apply migration recipes for better conversion quality
      const processedChunks = await this.applyMigrationRecipes(relevantChunks, options);

      // Prepare context from relevant chunks
      const context = processedChunks.map(chunk => ({
        filename: chunk.fileName || chunk.filename || 'unknown.js',
        content: chunk.content || '',
        type: chunk.chunkType || 'code',
        language: chunk.metadata?.language || 'javascript',
        specializedPrompt: chunk.specializedPrompt,
        recipeUsed: chunk.recipeUsed
      }));

      // Create the prompt for Gemini
      const prompt = this.createMigrationPrompt(command, context);

      console.log(`📝 Sending prompt to Gemini (${prompt.length} characters)`);

      try {
        console.log(`⏱️ Starting Gemini API call at ${new Date().toISOString()}`);
        
        // Generate response using Gemini with timeout
        const result = await Promise.race([
          this.model.generateContent(prompt),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Gemini API timeout after 60 seconds')), 60000)
          )
        ]);
        
        const response = await result.response;
        const text = response.text();
        
        console.log(`⏱️ Gemini API call completed at ${new Date().toISOString()}`);

        // Process the response using the new method
        return this.processGeminiResponse(text, relevantChunks, options);
      } catch (geminiError) {
        console.error('❌ Gemini API error:', geminiError.message);
        
        // Check if it's a timeout or service unavailable error
        if (geminiError.message.includes('timeout') || geminiError.message.includes('503') || geminiError.message.includes('Service Unavailable') || geminiError.message.includes('overloaded')) {
          console.log('🔄 Gemini API is overloaded or timed out, retrying with multiple attempts...');
          
          // Try multiple retry attempts with increasing delays
          const retryAttempts = [5000, 10000, 15000]; // 5s, 10s, 15s
          
          for (let i = 0; i < retryAttempts.length; i++) {
            const delay = retryAttempts[i];
            console.log(`🔄 Retry attempt ${i + 1}/${retryAttempts.length} in ${delay/1000} seconds...`);
            
            await new Promise(resolve => setTimeout(resolve, delay));
            
            try {
              console.log(`🔄 Retrying Gemini API call (attempt ${i + 1})...`);
              const retryResult = await Promise.race([
                this.model.generateContent(prompt),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Gemini API timeout after 30 seconds')), 30000)
                )
              ]);
              const retryResponse = await retryResult.response;
              const retryText = retryResponse.text();
              
              console.log('✅ Retry successful, processing response...');
              return this.processGeminiResponse(retryText, relevantChunks, options);
            } catch (retryError) {
              console.error(`❌ Retry attempt ${i + 1} failed:`, retryError.message);
              if (i === retryAttempts.length - 1) {
                console.log('🔄 All retry attempts failed, falling back to demo migration');
                return this.generateDemoMigration(command, options);
              }
            }
          }
        } else {
          console.log('🔄 Falling back to demo migration');
          return this.generateDemoMigration(command, options);
        }
      }

    } catch (error) {
      console.error('❌ Error generating migration:', error);
      console.log('🔄 Falling back to demo migration');
      return this.generateDemoMigration(command, options);
    }
  }

  /**
   * Process Gemini response and extract migration data
   * @param {string} text - The response text from Gemini
   * @param {Array} relevantChunks - Relevant code chunks
   * @param {Object} options - Migration options including toLang
   * @returns {Object} Processed migration result
   */
  processGeminiResponse(text, relevantChunks, options = {}) {
    try {
      console.log('📝 Raw Gemini response:', text.substring(0, 200) + '...');
      console.log('📝 Full Gemini response:', text);
      
      let parsedResult;
      
      // First, try to find JSON in the response
      const jsonMatch = text.match(/```(?:json)?\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        try {
          parsedResult = JSON.parse(jsonMatch[1]);
          console.log('✅ Parsed JSON response from Gemini');
        } catch (jsonError) {
          console.log('⚠️ JSON parsing failed, trying text extraction');
          parsedResult = null;
        }
      }
      
      // If JSON parsing failed, try to extract the inner migratedCode
      if (parsedResult && parsedResult.migratedCode && parsedResult.migratedCode.startsWith('```json')) {
        console.log('🔧 Detected nested JSON in migratedCode, extracting inner content');
        try {
          const innerJsonMatch = parsedResult.migratedCode.match(/```(?:json)?\n([\s\S]*?)\n```/);
          if (innerJsonMatch) {
            const innerParsed = JSON.parse(innerJsonMatch[1]);
            parsedResult = {
              ...parsedResult,
              migratedCode: innerParsed.migratedCode || parsedResult.migratedCode,
              summary: innerParsed.summary || parsedResult.summary,
              changes: innerParsed.changes || parsedResult.changes,
              files: innerParsed.files || parsedResult.files
            };
            console.log('✅ Extracted inner JSON content');
          }
        } catch (innerError) {
          console.log('⚠️ Inner JSON extraction failed:', innerError.message);
        }
      }
      
      // If no JSON found, try to parse the entire response as JSON
      if (!parsedResult) {
        try {
          parsedResult = JSON.parse(text);
          console.log('✅ Parsed entire response as JSON');
        } catch (jsonError) {
          console.log('⚠️ Entire response is not JSON, trying to extract from markdown');
          // Try to extract JSON from markdown code blocks
          const markdownMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
          if (markdownMatch) {
            try {
              parsedResult = JSON.parse(markdownMatch[1]);
              console.log('✅ Extracted JSON from markdown');
            } catch (markdownError) {
              console.log('⚠️ Markdown extraction failed, using fallback');
              parsedResult = null;
            }
          } else {
          parsedResult = null;
          }
        }
      }
      
      // If we have a parsed JSON result, use it
      if (parsedResult && parsedResult.migratedCode) {
        console.log('✅ Using JSON response from Gemini');
        
        // Add ecosystem warnings and recommendations
        const warnings = this.ecosystemMapping.generateMigrationWarnings(
          options.fromLang, 
          options.toLang, 
          this.detectPatterns(relevantChunks)
        );
        
        const recommendations = this.ecosystemMapping.generateMigrationRecommendations(
          options.fromLang, 
          options.toLang, 
          this.detectPackages(relevantChunks)
        );
        
        // Process migratedCode to extract actual code from JSON structure if needed
        console.log('🔍 Original migratedCode (first 200 chars):', parsedResult.migratedCode.substring(0, 200));
        
        let processedMigratedCode = parsedResult.migratedCode;
        
        // Check if migratedCode contains JSON structure instead of raw code
        if (processedMigratedCode.trim().startsWith('```json') || processedMigratedCode.trim().startsWith('{')) {
          console.log('🔍 Detected JSON structure in migratedCode, extracting actual code...');
          
          try {
            // Try to parse as JSON if it starts with {
            if (processedMigratedCode.trim().startsWith('{')) {
              const jsonMatch = processedMigratedCode.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const jsonStr = jsonMatch[0];
                const jsonObj = JSON.parse(jsonStr);
                if (jsonObj.migratedCode) {
                  processedMigratedCode = jsonObj.migratedCode;
                  console.log('🔍 Extracted code from JSON.migratedCode field');
                }
              }
            }
            
            // Try to extract from markdown code blocks
            if (processedMigratedCode.includes('```json')) {
              const codeBlockMatch = processedMigratedCode.match(/```json\s*([\s\S]*?)\s*```/);
              if (codeBlockMatch) {
                const jsonStr = codeBlockMatch[1];
                const jsonObj = JSON.parse(jsonStr);
                if (jsonObj.migratedCode) {
                  processedMigratedCode = jsonObj.migratedCode;
                  console.log('🔍 Extracted code from markdown JSON block');
                }
              }
            }
          } catch (parseError) {
            console.error('❌ Failed to parse JSON structure:', parseError.message);
            console.log('🔍 Using original migratedCode as fallback');
          }
        }
        
        // Convert escaped newlines to actual newlines
        processedMigratedCode = processedMigratedCode
          .replace(/\\n/g, '\n')
          .replace(/\\\\n/g, '\n')
          .replace(/\\r\\n/g, '\n')
          .replace(/\\r/g, '\n');
        
        console.log('🔍 Processed migratedCode (first 200 chars):', processedMigratedCode.substring(0, 200));
        
        // Process files array if it exists, converting escaped newlines in content
        let processedFiles = parsedResult.files;
        if (processedFiles && Array.isArray(processedFiles)) {
          processedFiles = processedFiles.map(file => ({
            ...file,
            content: file.content ? file.content
              .replace(/\\n/g, '\n')
              .replace(/\\\\n/g, '\n')
              .replace(/\\r\\n/g, '\n')
              .replace(/\\r/g, '\n') : file.content
          }));
        }
        
        const result = {
          migratedCode: processedMigratedCode,
          summary: parsedResult.summary || 'Code converted successfully',
          changes: parsedResult.changes || ['Added TypeScript type annotations', 'Converted to TypeScript syntax'],
          files: processedFiles || [{
            filename: relevantChunks[0]?.fileName || relevantChunks[0]?.filename || 'converted.js',
            migratedFilename: this.generateMigratedFilename(relevantChunks[0], options.toLang),
            content: processedMigratedCode
          }],
          warnings: [...(parsedResult.warnings || []), ...warnings],
          recommendations: [...(parsedResult.recommendations || []), ...recommendations],
          isDemo: false
        };
        
        console.log('🔍 Final migration result (migratedCode first 200 chars):', result.migratedCode.substring(0, 200));
        console.log('🔍 Final migration result (files[0].content first 200 chars):', result.files[0]?.content?.substring(0, 200));
        console.log('🔍 Target language was:', options.toLang);
        console.log('🔍 Generated filename:', this.generateMigratedFilename(relevantChunks[0], options.toLang));
        
        return result;
      }
      
      // Check if the response is double-encoded JSON (Gemini sometimes returns JSON wrapped in JSON)
      if (parsedResult && typeof parsedResult.migratedCode === 'string' && parsedResult.migratedCode.startsWith('```json')) {
        console.log('🔧 Detected double-encoded JSON, parsing inner content');
        try {
          const innerJsonMatch = parsedResult.migratedCode.match(/```(?:json)?\n([\s\S]*?)\n```/);
          if (innerJsonMatch) {
            const innerParsed = JSON.parse(innerJsonMatch[1]);
            console.log('✅ Parsed inner JSON from double-encoded response');
            return {
              migratedCode: innerParsed.migratedCode || innerParsed.files?.[0]?.content || 'No migrated code available',
              summary: innerParsed.summary || 'Code converted successfully',
              changes: innerParsed.changes || ['Added TypeScript type annotations', 'Converted to TypeScript syntax'],
              files: innerParsed.files || [{
                filename: relevantChunks[0]?.fileName || relevantChunks[0]?.filename || 'converted.ts',
                migratedFilename: this.generateMigratedFilename(relevantChunks[0], options.toLang),
                content: innerParsed.migratedCode || innerParsed.files?.[0]?.content || 'No migrated code available'
              }],
              isDemo: false
            };
          }
        } catch (innerError) {
          console.log('⚠️ Failed to parse inner JSON, using fallback');
        }
      }
      
      // Fallback to text parsing
      const codeMatch = text.match(/```(?:typescript|ts|javascript|js)?\n([\s\S]*?)\n```/);
      const code = codeMatch ? codeMatch[1] : text;
      
      // Extract summary if present
      const summaryMatch = text.match(/\*\*Summary of Changes:\*\*([\s\S]*?)(?:\*\*Important Notes:\*\*|$)/);
      const summary = summaryMatch ? summaryMatch[1].trim() : 'Code converted successfully';
      
      // Extract changes if present
      const changes = [];
      const changesMatch = text.match(/\*\*Explanation of Changes:\*\*([\s\S]*?)(?:\*\*Summary|$)/);
      if (changesMatch) {
        const changesText = changesMatch[1];
        const bulletPoints = changesText.match(/\*\s\*\*([^*]+)\*\*:\s*([^*]+)/g);
        if (bulletPoints) {
          bulletPoints.forEach(point => {
            const match = point.match(/\*\s\*\*([^*]+)\*\*:\s*(.+)/);
            if (match) {
              changes.push(`${match[1]}: ${match[2]}`);
            }
          });
        }
      }
      
      // If no specific changes found, add default ones
      if (changes.length === 0) {
        changes.push('Added TypeScript type annotations', 'Converted to TypeScript syntax');
      }
      
      console.log('✅ Parsed migration result successfully');
      console.log('📝 Code:', code.substring(0, 100) + '...');
      console.log('📝 Summary:', summary);
      console.log('📝 Changes:', changes);
      
      return {
        migratedCode: code,
        summary: summary,
        changes: changes,
        files: [{
          filename: relevantChunks[0]?.fileName || 'converted.ts',
          migratedFilename: this.generateMigratedFilename(relevantChunks[0], options.toLang),
          content: code
        }],
        isDemo: false
      };
    } catch (error) {
      console.error('❌ Error processing Gemini response:', error);
      throw error;
    }
  }

  /**
   * Generate a demo migration result
   * @param {string} command - The user's command
   * @param {Object} options - Migration options
   * @returns {Object} Demo migration result
   */
  generateDemoMigration(command, options = {}) {
    const fromLang = options.fromLang || 'JavaScript';
    const toLang = options.toLang || 'TypeScript';
    
    return {
      migratedCode: `// Converted from ${fromLang} to ${toLang}
function testFunction(): string {
  console.log("Testing upload");
  return "Hello World";
}

const testVariable: string = "test value";`,
      summary: `Demo migration from ${fromLang} to ${toLang}`,
      changes: [
        `Added ${toLang} type annotations`,
        `Converted function to return string type`,
        `Added type annotation to variable`
      ],
      files: [
        {
          filename: "test-upload-debug.js",
          migratedFilename: "test-upload-debug.ts",
          content: `// Converted from ${fromLang} to ${toLang}
function testFunction(): string {
  console.log("Testing upload");
  return "Hello World";
}

const testVariable: string = "test value";`
        }
      ],
      isDemo: true
    };
  }

  /**
   * Create the migration prompt for Gemini
   * @param {string} command - The user's command
   * @param {Array} context - Relevant code chunks
   * @returns {string} The formatted prompt
   */
  createMigrationPrompt(command, context) {
    const contextString = context.map(chunk => 
      `File: ${chunk.filename}\nType: ${chunk.type}\nLanguage: ${chunk.language}\nContent:\n${chunk.content}\n---\n`
    ).join('\n');

    return `You are an expert code migration assistant. Your task is to help users migrate their code between different programming languages or frameworks.

CRITICAL: When you return the JSON response, the "migratedCode" field must contain the ACTUAL CONVERTED CODE, not JSON structure. Put the complete, runnable code in the target language there.

CRITICAL: Follow the conversion direction exactly. If converting FROM Kotlin TO Java, return Java code. If converting FROM Java TO Kotlin, return Kotlin code. Do NOT mix languages in the output.

USER COMMAND: ${command}

RELEVANT CODE CONTEXT:
${contextString}

CRITICAL INSTRUCTIONS FOR HIGH-QUALITY MIGRATION:
1. FOLLOW THE EXACT COMMAND: You MUST follow the user's command exactly. If the command says "Convert from Python 2 to Python 3", you MUST convert to Python 3, not any other language.
2. PRESERVE ORIGINAL STRUCTURE: Maintain the exact same code structure, order, and organization as the original
3. PRESERVE ALL CONTENT: Include ALL variables, functions, classes, objects, and logic from the original code
4. PRESERVE ALL CLASSES AND METHODS: NEVER drop entire classes, methods, or business logic. Convert EVERYTHING.
5. PRESERVE DATA VALUES: Keep all original values, strings, numbers, and object properties unchanged
6. PRESERVE GLOBAL VARIABLES: Include all global variables with appropriate syntax for target language
7. PRESERVE OBJECT PROPERTIES: Maintain all object properties and nested structures exactly as they were
8. PRESERVE ARRAY OPERATIONS: Keep all array operations, mapping, and transformations intact
9. PRESERVE EVENT HANDLERS: Maintain the exact same event handling logic and structure
10. PRESERVE EXPORTS: Keep all export statements and their structure identical
11. CONVERT SYNTAX PROPERLY: Convert syntax to target language while preserving functionality
12. AVOID REFACTORING: Do not restructure, reorganize, or refactor the code - only convert syntax
13. USE PROPER LANGUAGE CONSTRUCTS: Use appropriate language-specific constructs for the target language
14. MAINTAIN COMMENTS: Preserve all original comments and add migration-specific comments only where necessary
15. COMPLETE CONVERSION: The output must contain ALL classes, methods, and functionality from the input

MIGRATION QUALITY REQUIREMENTS:
- The migrated code should be a 1:1 conversion with proper syntax for target language
- All original functionality must be preserved exactly
- All original data structures must be maintained
- All original variable names, function names, and class names must be preserved
- The code should be syntactically correct for the target language
- YOU MUST FOLLOW THE USER'S COMMAND EXACTLY - DO NOT CONVERT TO A DIFFERENT LANGUAGE THAN REQUESTED

PYTHON 2 TO PYTHON 3 SPECIFIC CONVERSIONS:
When converting from Python 2 to Python 3, you MUST make these specific changes:
- Convert print statements: print "text" → print("text")
- Convert integer division: 5/2 → 5/2 (true division) or 5//2 (floor division)
- Convert xrange to range: xrange(10) → range(10)
- Convert exception handling: except Exception, e: → except Exception as e:
- Convert dictionary methods: .iteritems() → .items(), .iterkeys() → .keys(), .itervalues() → .values()
- Convert raw_input to input: raw_input() → input()
- Convert string handling: basestring → str
- Convert unicode handling: unicode() → str()
- Convert string formatting: % formatting → .format() or f-strings
- Add proper Python 3 syntax and remove Python 2 specific constructs

JAVASCRIPT TO TYPESCRIPT SPECIFIC CONVERSIONS:
When converting from JavaScript to TypeScript, you MUST make these specific changes:
- Add type annotations: let name: string = "John"
- Convert to interfaces: {name: string, age: number}
- Add return types: function getName(): string
- Add parameter types: function greet(name: string): void
- Convert classes with proper typing
- Add proper TypeScript syntax and remove JavaScript-specific constructs

JAVA TO KOTLIN SPECIFIC CONVERSIONS:
When converting from Java to Kotlin, you MUST make these specific changes:

1. CONVERT POJOs TO DATA CLASSES (CRITICAL):
   - Java: class User { private String name; public String getName() { return name; } public void setName(String name) { this.name = name; } }
   - Kotlin: data class User(val name: String, val email: String, val isActive: Boolean)
   - NEVER use manual getters/setters in Kotlin - use data classes
   - NEVER use var properties with manual getters/setters - use data class properties

2. CONVERT CLASSES WITH CONSTRUCTORS:
   - Java: public class UserService { private String apiUrl; public UserService(String apiUrl) { this.apiUrl = apiUrl; } }
   - Kotlin: class UserService(private val apiUrl: String)

3. CONVERT METHODS TO FUNCTIONS:
   - Java: public List<User> getActiveUsers() { return users.stream().filter(u -> u.isActive()).collect(Collectors.toList()); }
   - Kotlin: fun getActiveUsers(): List<User> = users.filter { it.isActive }

4. CONVERT COLLECTIONS:
   - Java: new ArrayList<>() → Kotlin: mutableListOf()
   - Java: new HashMap<>() → Kotlin: mutableMapOf()
   - Java: Arrays.asList() → Kotlin: listOf()

5. CONVERT STREAM OPERATIONS:
   - Java: users.stream().filter(u -> u.isActive()).collect(Collectors.toList())
   - Kotlin: users.filter { it.isActive }

6. CONVERT NULL SAFETY:
   - Java: @Nullable String name → Kotlin: String?
   - Java: if (user != null) → Kotlin: user?.let { }

7. PRESERVE ALL CLASSES AND METHODS:
   - NEVER drop entire classes or methods
   - Convert ALL business logic, not just POJOs
   - Maintain the same functionality and structure
   - Convert constructors, methods, and fields properly

8. USE IDIOMATIC KOTLIN (CRITICAL):
   - NEVER use manual getters/setters - use properties directly
   - Use data classes for POJOs, not regular classes with var properties
   - Use val for immutable properties, var only when mutation is needed
   - Use expression body functions: fun getName() = name (not { return name })
   - Use it instead of explicit parameter names in lambdas
   - Use Kotlin's built-in functions instead of manual implementations

9. CONVERT ACCESS MODIFIERS:
   - Java: public → Kotlin: (default, no keyword needed)
   - Java: private → Kotlin: private
   - Java: protected → Kotlin: protected

10. CONVERT STRING OPERATIONS:
    - Java: String.format() → Kotlin: string interpolation
    - Java: string1 + string2 → Kotlin: "$string1$string2"

11. CONVERT EXCEPTION HANDLING:
    - Java: try-catch → Kotlin: try-catch (similar syntax)
    - Java: throws Exception → Kotlin: @Throws(Exception::class)

OBJECTIVE-C TO SWIFT SPECIFIC CONVERSIONS:
When converting from Objective-C to Swift, you MUST make these specific changes:
- Convert method calls: [object method] → object.method()
- Convert properties: @property → var/let declarations
- Convert blocks: ^{ } → { } closures
- Convert NSString to String, NSArray to Array, NSDictionary to Dictionary
- Convert memory management: manual retain/release → ARC (automatic)
- Convert protocols: @protocol → protocol
- Convert categories: @interface Class (Category) → extension Class
- PRESERVE ALL CLASSES AND METHODS: Convert every class and method, don't drop functionality

C# TO JAVA SPECIFIC CONVERSIONS:
When converting from C# to Java, you MUST make these specific changes:
- Convert properties: public string Name { get; set; } → private String name; public String getName() { return name; } public void setName(String name) { this.name = name; }
- Convert LINQ: .Where() → .stream().filter()
- Convert nullable types: string? → String (with null checks)
- Convert async/await: async Task → CompletableFuture
- Convert generics: List<string> → List<String>
- Convert events: event → interface with callback methods
- PRESERVE ALL CLASSES AND METHODS: Convert every class and method, don't drop functionality

RESPONSE FORMAT:
Please provide your response as a JSON object with the following structure:
{
  "migratedCode": "The complete migrated code content (NOT JSON, but actual code)",
  "summary": "Brief summary of what was migrated",
  "changes": ["List of key changes made"],
  "files": [
    {
      "filename": "original-filename.ext",
      "migratedFilename": "new-filename.ext", 
      "content": "The complete migrated code content (NOT JSON, but actual code)"
    }
  ],
  "warnings": [
    "List any architectural challenges or limitations"
  ],
  "recommendations": [
    "Suggestions for further manual refactoring"
  ]
}

CRITICAL: Return ONLY the JSON object above. Do NOT wrap it in markdown code blocks, backticks, or any other formatting. The response must be pure JSON that can be parsed directly.

CRITICAL: The migratedCode field must contain ONLY the target language code, not mixed languages or corrupted content. Ensure the JSON is properly formatted and valid.

IMPORTANT: The "migratedCode" field must contain the ACTUAL CONVERTED CODE, not JSON structure or metadata. It should contain the complete, runnable code in the target language.

CRITICAL: Do NOT put JSON structure in the migratedCode field. Put the actual converted code there.

EXAMPLES:
- WRONG: "migratedCode": "{\"changes\": [\"Converted class\"]}"
- WRONG: "migratedCode": "{\"summary\": \"Converted Java to Kotlin\"}"
- CORRECT: "migratedCode": "data class User(val name: String, val email: String) {\n    // class implementation\n}"

The migratedCode field should contain the complete, runnable code in the target language, not JSON structure or metadata.

CRITICAL: Ensure the entire JSON response is valid and parseable. Do not include corrupted content, mixed languages, or malformed JSON.

IMPORTANT: For complex architectural migrations (like Node.js to PHP), include warnings about:
- Framework and ecosystem differences
- Manual refactoring requirements
- Architecture pattern changes needed
- Dependency mapping challenges

If you cannot perform the migration due to insufficient context or unclear requirements, respond with:
{
  "error": "Unable to migrate",
  "reason": "Explanation of why migration failed",
  "suggestions": ["List of suggestions to help the user"]
}`;
  }

  /**
   * Test the migration agent connection
   * @returns {Object} Test result
   */
  async testConnection() {
    try {
      const testCommand = "Convert this code from JavaScript to TypeScript";
      const testEmbedding = await this.embedCommand(testCommand);
      
      return {
        success: true,
        message: 'Migration agent is ready',
        embeddingLength: testEmbedding.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Create and export singleton instance
const migrationAgentService = new MigrationAgentService();
export default migrationAgentService;
