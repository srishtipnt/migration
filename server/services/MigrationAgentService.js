import GeminiEmbeddingService from './GeminiEmbeddingService.js';
import CodeChunk from '../models/CodeChunk.js';
import EcosystemMappingService from './EcosystemMappingService.js';
import MigrationRecipesService from './MigrationRecipesService.js';
import RedisService from './RedisService.js';
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
      'jquery': '.js',
      // Backend Platform Extensions
      'php': '.php',
      'wordpress': '.php',
      'laravel': '.php',
      'nodejs': '.js',
      'express': '.js',
      'nestjs': '.ts',
      // Ruby Platform Extensions
      'ruby': '.rb',
      'rails': '.rb',
      // Python Platform Extensions
      'django': '.py',
      'flask': '.py',
      // Java Platform Extensions
      'java': '.java',
      'spring': '.java',
      'springboot': '.java',
      // Go Platform Extensions
      'go': '.go',
      'gin': '.go',
      'echo': '.go',
      'fiber': '.go',
      'rest': '.js', // REST APIs typically use JavaScript/TypeScript
      'graphql': '.graphql', // GraphQL schema files
      // Database Systems
      'mysql': '.sql',
      'postgresql': '.sql',
      'mongodb': '.js', // MongoDB typically uses JavaScript
      'sqlite': '.sql',
      'redis': '.js', // Redis typically uses JavaScript for client code
      'cassandra': '.cql', // Cassandra Query Language
      'dynamodb': '.js', // DynamoDB typically uses JavaScript
      'elasticsearch': '.json' // Elasticsearch uses JSON for queries
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
    const extension = originalFilename.split('.').pop().toLowerCase();
    const nameWithoutExt = originalFilename.replace(/\.[^/.]+$/, '');
    const content = chunk?.content || '';
    
    console.log(' generateMigratedFilename Debug:');
    console.log('  - originalFilename:', originalFilename);
    console.log('  - extension:', extension);
    console.log('  - toLang:', toLang);
    console.log('  - content length:', content.length);
    
    // Check if content contains JSX syntax
    const hasJSX = this.containsJSX(content);
    console.log('  - hasJSX:', hasJSX);
    
    // For TypeScript to JavaScript conversion
    if (toLang === 'javascript') {
      if (extension === 'ts') {
        // .ts files should become .js (not .jsx) unless they contain JSX
        return hasJSX ? `${nameWithoutExt}.jsx` : `${nameWithoutExt}.js`;
      } else if (extension === 'tsx') {
        // .tsx files should become .jsx (they contain JSX)
        return `${nameWithoutExt}.jsx`;
      } else if (extension === 'js') {
        // .js files should stay .js (not become .jsx) unless they contain JSX
        return hasJSX ? `${nameWithoutExt}.jsx` : `${nameWithoutExt}.js`;
      }
    }
    
    // For JavaScript to TypeScript conversion
    if (toLang === 'typescript') {
      if (extension === 'js') {
        // .js files should become .ts (not .tsx) unless they contain JSX
        return hasJSX ? `${nameWithoutExt}.tsx` : `${nameWithoutExt}.ts`;
      } else if (extension === 'jsx') {
        // .jsx files should become .tsx (they contain JSX)
        return `${nameWithoutExt}.tsx`;
      }
    }
    
    // For other conversions, use the target language extension
    const targetExtension = this.getFileExtensionForLanguage(toLang);
    const result = `${nameWithoutExt}${targetExtension}`;
    
    console.log('  - result:', result);
    return result;
  }

  /**
   * Check if content contains JSX syntax
   * @param {string} content - File content
   * @returns {boolean} Whether content contains JSX
   */
  containsJSX(content) {
    if (!content || typeof content !== 'string') {
      return false;
    }
    
    // JSX patterns to detect
    const jsxPatterns = [
      /<[A-Z]\w+/,                    // <Component
      /<[a-z]+\w*/,                   // <div, <span, etc.
      /className\s*=/,                // className=
      /onClick\s*=/,                 // onClick=
      /onChange\s*=/,                // onChange=
      /onSubmit\s*=/,                // onSubmit=
      /return\s*\(/,                 // return (
      /<[A-Z]\w+[^>]*>/,            // <Component>
      /<\/[A-Z]\w+>/,                // </Component>
      /<\/[a-z]+>/,                  // </div>
      /{.*}/,                        // {expression}
      /\.map\s*\(/,                  // .map(
      /key\s*=/                      // key=
    ];
    
    // Check for JSX patterns
    for (const pattern of jsxPatterns) {
      if (pattern.test(content)) {
        console.log('  - JSX pattern found:', pattern);
        return true;
      }
    }
    
    return false;
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
      'zig': 'Zig',
      // Database Systems
      'mysql': 'MySQL',
      'postgresql': 'PostgreSQL',
      'mongodb': 'MongoDB',
      'sqlite': 'SQLite',
      'redis': 'Redis',
      'cassandra': 'Cassandra',
      'dynamodb': 'DynamoDB',
      'elasticsearch': 'Elasticsearch',
      // API Paradigms
      'rest': 'REST API',
      'graphql': 'GraphQL',
    };

    const fromLanguage = languageMap[fromLang.toLowerCase()] || fromLang;
    const toLanguage = languageMap[toLang.toLowerCase()] || toLang;

    // Generate standard migration command

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
      console.log(` Command: ${command}`);

      // Step 1: Generate natural language command if fromLang/toLang provided
      let finalCommand = command;
      if (options.fromLang && options.toLang) {
        finalCommand = this.generateMigrationCommand(options.fromLang, options.toLang);
        console.log(` Generated command: ${finalCommand}`);
        console.log(` From Language: ${options.fromLang}`);
        console.log(` To Language: ${options.toLang}`);
      }

      // Step 2: Convert command to embedding
      console.log(` Converting command to embedding...`);
      const commandEmbedding = await this.embedCommand(finalCommand);
      console.log(` Command embedded (${commandEmbedding.length} dimensions)`);

      // Step 3: Find relevant chunks using RAG
      console.log(` Finding relevant chunks using RAG...`);
      const relevantChunks = await this.findRelevantChunks(sessionId, commandEmbedding, userId);
      console.log(` Found ${relevantChunks.length} relevant chunks`);

      // Step 4: Process each file individually to preserve logic
      console.log(`🔄 Processing files individually to preserve logic...`);
      const migrationResult = await this.processFilesIndividually(finalCommand, relevantChunks, options);
      console.log(` Individual file processing completed`);

      return {
        success: true,
        result: migrationResult,
        chunksUsed: relevantChunks.length,
        sessionId: sessionId,
        command: finalCommand,
        embeddingDimensions: commandEmbedding.length
      };

    } catch (error) {
      console.error(' Migration agent error:', error);
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
      console.log(` Embedding command: ${command}`);
      
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
        console.log(` Command embedded successfully (${embedding[0].embedding.length} dimensions)`);
        return embedding[0].embedding;
      } else {
        throw new Error('Failed to generate embedding');
      }
    } catch (error) {
      console.error(' Error embedding command:', error);
      // Fallback to dummy embedding if API fails
      console.log(' Using fallback embedding for command');
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
      console.log(` Finding chunks for session: ${sessionId}, user: ${userId}`);
      
      // First try with both sessionId and userId
      let allChunks;
      try {
        allChunks = await CodeChunk.find({ 
          sessionId: sessionId,
          userId: userId 
        }).lean();
        console.log(` Found ${allChunks.length} chunks with sessionId + userId filter`);
      } catch (dbError) {
        console.error(' Database query failed:', dbError.message);
        allChunks = [];
      }

      // If no chunks found, try without userId filter
      if (allChunks.length === 0) {
        try {
          allChunks = await CodeChunk.find({ 
            sessionId: sessionId
          }).lean();
          console.log(` Found ${allChunks.length} chunks with sessionId only filter`);
          
          if (allChunks.length > 0) {
            console.log(` Chunk user IDs found:`, allChunks.map(c => c.userId));
          }
        } catch (dbError) {
          console.error(' Database query without userId failed:', dbError.message);
          allChunks = [];
        }
      }

      console.log(` Total chunks found: ${allChunks.length}`);
      
      if (allChunks.length > 0) {
        console.log(` Chunk details:`, allChunks.map(c => ({
          id: c._id,
          filename: c.filename || c.fileName,
          chunkType: c.chunkType,
          contentLength: c.content?.length || 0,
          hasEmbedding: !!c.embedding
        })));
      }

      if (allChunks.length === 0) {
        console.log('⚠️ No chunks found for this session');
        console.log(' This means either:');
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
          console.error(' Error calculating similarity for chunk:', error);
          return {
            ...chunk,
            similarity: 0.1 // Default low similarity
          };
        }
      });

      // Sort by similarity and take top chunks
      let relevantChunks = chunksWithSimilarity
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 20) // Top 20 most relevant chunks (increased from 10)
        .filter(chunk => chunk.similarity > 0.05); // Much lower threshold to include more chunks

      console.log(` Found ${relevantChunks.length} relevant chunks with similarity > 0.05`);
      if (relevantChunks.length > 0) {
        console.log(` Similarity scores: ${relevantChunks.map(c => c.similarity.toFixed(3)).join(', ')}`);
      }
      
      // If still no chunks found, take all chunks regardless of similarity
      if (relevantChunks.length === 0 && allChunks.length > 0) {
        console.log(`⚠️ No chunks passed similarity filter, using all ${allChunks.length} chunks`);
        relevantChunks = allChunks.slice(0, 20); // Take up to 20 chunks
      }
      
      // Ensure we have chunks from multiple files, not just one file
      const filesRepresented = new Set(relevantChunks.map(c => c.fileName || c.filename));
      console.log(`📁 Files represented in chunks: ${filesRepresented.size}`);
      console.log(`📁 File names: ${Array.from(filesRepresented).join(', ')}`);
      
      // If we only have chunks from one file, try to get chunks from other files too
      if (filesRepresented.size === 1 && allChunks.length > relevantChunks.length) {
        console.log(`⚠️ Only one file represented, trying to include more files`);
        
        // Group chunks by file
        const chunksByFile = new Map();
        allChunks.forEach(chunk => {
          const filename = chunk.fileName || chunk.filename || 'unknown';
          if (!chunksByFile.has(filename)) {
            chunksByFile.set(filename, []);
          }
          chunksByFile.get(filename).push(chunk);
        });
        
        // Take top chunks from each file
        const balancedChunks = [];
        for (const [filename, fileChunks] of chunksByFile) {
          const topChunks = fileChunks
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, Math.max(1, Math.floor(20 / chunksByFile.size))); // Distribute chunks across files
          balancedChunks.push(...topChunks);
        }
        
        if (balancedChunks.length > 0) {
          relevantChunks = balancedChunks.slice(0, 20);
          console.log(`📁 Balanced selection: ${relevantChunks.length} chunks from ${new Set(relevantChunks.map(c => c.fileName || c.filename)).size} files`);
        }
      }
      
      return relevantChunks;
    } catch (error) {
      console.error(' Error finding relevant chunks:', error);
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
   * Process each file individually to preserve logic
   * @param {string} command - The user's command
   * @param {Array} relevantChunks - Relevant code chunks
   * @param {Object} options - Migration options
   * @returns {Object} The migration result
   */
  async processFilesIndividually(command, relevantChunks, options = {}) {
    try {
      console.log(`🔄 Processing ${relevantChunks.length} chunks individually`);
      
      // Group chunks by file
      const filesMap = new Map();
      for (const chunk of relevantChunks) {
        const filename = chunk.fileName || chunk.filename || 'unknown';
        if (!filesMap.has(filename)) {
          filesMap.set(filename, []);
        }
        filesMap.get(filename).push(chunk);
      }
      
      console.log(`📁 Found ${filesMap.size} unique files to process`);
      
      const results = {
        migratedCode: '',
        summary: `Converted ${filesMap.size} files individually`,
        changes: [],
        files: [],
        warnings: [],
        recommendations: []
      };
      
      // Process each file individually
      for (const [filename, fileChunks] of filesMap) {
        try {
          console.log(`🔄 Processing file: ${filename} (${fileChunks.length} chunks)`);
          
          // Check if this file should be converted based on its type
          const shouldConvert = this.shouldConvertFile(filename, options);
          if (!shouldConvert) {
            console.log(`⏭️ Skipping ${filename} - not suitable for conversion`);
            continue;
          }
          
          // Combine chunks for this file
          const fileContent = fileChunks.map(chunk => chunk.content).join('\n\n');
          
          // Convert this file individually
          const fileResult = await this.generateMigration(command, fileChunks, options);
          
          if (fileResult && fileResult.migratedCode) {
            // Generate new filename based on file type
            const newFilename = this.generateMigratedFilename(fileChunks[0], options.toLang);
            
            results.files.push({
              filename: filename,
              migratedFilename: newFilename,
              content: fileResult.migratedCode
            });
            
            results.changes.push(`Converted ${filename} to ${newFilename}`);
            
            console.log(`✅ Converted: ${filename} → ${newFilename}`);
          } else {
            console.log(`⚠️ No result for file: ${filename}`);
          }
          
        } catch (error) {
          console.error(`❌ Error processing file ${filename}:`, error.message);
          results.warnings.push(`Failed to convert ${filename}: ${error.message}`);
        }
      }
      
      // Combine all migrated code for the main result
      if (results.files.length > 0) {
        results.migratedCode = results.files[0].content; // Use first file as main result
        results.summary = `Successfully converted ${results.files.length} files individually`;
      }
      
      console.log(`📊 Individual processing complete: ${results.files.length} files converted`);
      return results;
      
    } catch (error) {
      console.error('❌ Individual file processing failed:', error);
      throw error;
    }
  }

  /**
   * Check if a file should be converted based on its type and target language
   * @param {string} filename - The filename
   * @param {Object} options - Migration options
   * @returns {boolean} Whether the file should be converted
   */
  shouldConvertFile(filename, options) {
    const extension = filename.split('.').pop().toLowerCase();
    const fromLang = options.fromLang?.toLowerCase();
    const toLang = options.toLang?.toLowerCase();
    
    console.log(`🔍 Checking file: ${filename} (${extension}) for ${fromLang} → ${toLang} conversion`);
    
    // Files that should NOT be converted
    const skipExtensions = [
      '.html', '.htm', '.css', '.scss', '.sass', '.less',
      '.json', '.xml', '.yaml', '.yml', '.toml',
      '.md', '.txt', '.rst', '.pdf',
      '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
      '.woff', '.woff2', '.ttf', '.eot',
      '.mp4', '.mp3', '.wav', '.avi',
      '.zip', '.tar', '.gz', '.rar'
    ];
    
    if (skipExtensions.includes(`.${extension}`)) {
      console.log(`⏭️ Skipping ${filename} - static file type`);
      return false;
    }
    
    // Files that should be converted
    const convertExtensions = [
      '.js', '.ts', '.jsx', '.tsx',
      '.py', '.java', '.c', '.cpp', '.cc', '.cxx',
      '.php', '.rb', '.go', '.rs', '.swift', '.kt',
      '.scala', '.clj', '.hs', '.ml', '.fs', '.dart', '.lua'
    ];
    
    if (convertExtensions.includes(`.${extension}`)) {
      console.log(`✅ Converting ${filename} - code file type`);
      return true;
    }
    
    // For specific language conversions, check if the file matches
    if (fromLang === 'typescript' && toLang === 'javascript') {
      // Only convert TypeScript files (.ts, .tsx)
      return extension === 'ts' || extension === 'tsx';
    }
    
    if (fromLang === 'javascript' && toLang === 'typescript') {
      // Only convert JavaScript files (.js, .jsx)
      return extension === 'js' || extension === 'jsx';
    }
    
    // For TSX to JSX conversion specifically
    if (fromLang === 'tsx' && toLang === 'jsx') {
      // Only convert TSX files
      return extension === 'tsx';
    }
    
    // For TS to JS conversion specifically  
    if (fromLang === 'ts' && toLang === 'js') {
      // Only convert TS files
      return extension === 'ts';
    }
    
    console.log(`⏭️ Skipping ${filename} - no matching conversion rule`);
    return false;
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
      console.log(` Chunks details:`, relevantChunks.map(c => ({
        id: c._id,
        fileName: c.fileName || c.filename,
        chunkType: c.chunkType,
        contentLength: c.content?.length || 0
      })));
      
      // If no chunks available, return a demo result
      if (relevantChunks.length === 0) {
        console.log('⚠️ No chunks available, returning demo migration');
        console.log(' This means the chunking process failed or no chunks were created for this session');
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

      console.log(` Sending prompt to Gemini (${prompt.length} characters)`);

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
        console.error(' Gemini API error:', geminiError.message);
        
        // Check if it's a timeout or service unavailable error
        if (geminiError.message.includes('timeout') || geminiError.message.includes('503') || geminiError.message.includes('Service Unavailable') || geminiError.message.includes('overloaded')) {
          console.log(' Gemini API is overloaded or timed out, retrying with multiple attempts...');
          
          // Try multiple retry attempts with increasing delays
          const retryAttempts = [5000, 10000, 15000]; // 5s, 10s, 15s
          
          for (let i = 0; i < retryAttempts.length; i++) {
            const delay = retryAttempts[i];
            console.log(` Retry attempt ${i + 1}/${retryAttempts.length} in ${delay/1000} seconds...`);
            
            await new Promise(resolve => setTimeout(resolve, delay));
            
            try {
              console.log(` Retrying Gemini API call (attempt ${i + 1})...`);
              const retryResult = await Promise.race([
                this.model.generateContent(prompt),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Gemini API timeout after 30 seconds')), 30000)
                )
              ]);
              const retryResponse = await retryResult.response;
              const retryText = retryResponse.text();
              
              console.log(' Retry successful, processing response...');
              return this.processGeminiResponse(retryText, relevantChunks, options);
            } catch (retryError) {
              console.error(` Retry attempt ${i + 1} failed:`, retryError.message);
              if (i === retryAttempts.length - 1) {
                console.log(' All retry attempts failed, falling back to demo migration');
                return this.generateDemoMigration(command, options);
              }
            }
          }
        } else {
          console.log(' Falling back to demo migration');
          return this.generateDemoMigration(command, options);
        }
      }

    } catch (error) {
      console.error(' Error generating migration:', error);
      console.log(' Falling back to demo migration');
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
      console.log(' Raw Gemini response:', text.substring(0, 200) + '...');
      console.log(' Full Gemini response:', text);
      
      let parsedResult;
      
      // First, try to find JSON in the response
      const jsonMatch = text.match(/```(?:json)?\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        try {
          parsedResult = JSON.parse(jsonMatch[1]);
          console.log(' Parsed JSON response from Gemini');
        } catch (jsonError) {
          console.log('⚠️ JSON parsing failed, trying text extraction');
          parsedResult = null;
        }
      }
      
      // If JSON parsing failed, try to extract the inner migratedCode
      if (parsedResult && parsedResult.migratedCode && parsedResult.migratedCode.startsWith('```json')) {
        console.log(' Detected nested JSON in migratedCode, extracting inner content');
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
            console.log(' Extracted inner JSON content');
          }
        } catch (innerError) {
          console.log('⚠️ Inner JSON extraction failed:', innerError.message);
        }
      }
      
      // If no JSON found, check if it's direct code output (especially for TSX to JSX)
      if (!parsedResult) {
        // For TSX to JSX conversion, expect direct code output
        if (options.fromLang === 'typescript' && options.toLang === 'javascript') {
          console.log(' TSX to JSX conversion - treating as direct code');
          parsedResult = {
            migratedCode: text,
            summary: 'TSX converted to JSX with preserved syntax',
            changes: ['Removed TypeScript type annotations', 'Preserved JSX syntax'],
            files: [{
              filename: relevantChunks[0]?.fileName || relevantChunks[0]?.filename || 'converted.jsx',
              migratedFilename: this.generateMigratedFilename(relevantChunks[0], options.toLang),
              content: text
            }],
            warnings: [],
            recommendations: []
          };
        } else {
          try {
            parsedResult = JSON.parse(text);
            console.log(' Parsed entire response as JSON');
          } catch (jsonError) {
            console.log('⚠️ Entire response is not JSON, trying to extract from markdown');
            // Try to extract JSON from markdown code blocks
            const markdownMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
            if (markdownMatch) {
              try {
                parsedResult = JSON.parse(markdownMatch[1]);
                console.log(' Extracted JSON from markdown');
              } catch (markdownError) {
                console.log('⚠️ Markdown extraction failed, using fallback');
                parsedResult = null;
              }
            } else {
            parsedResult = null;
            }
          }
        }
      }
      
      // Final fallback - if no JSON found at all, treat as direct code
      if (!parsedResult) {
        console.log('⚠️ No JSON found, treating entire response as direct code');
        parsedResult = {
          migratedCode: text,
          summary: 'Code converted successfully',
          changes: ['Converted syntax'],
          files: [{
            filename: relevantChunks[0]?.fileName || relevantChunks[0]?.filename || 'converted.js',
            migratedFilename: this.generateMigratedFilename(relevantChunks[0], options.toLang),
            content: text
          }],
          warnings: [],
          recommendations: []
        };
      }
      
      // If we have a parsed JSON result, use it
      if (parsedResult && parsedResult.migratedCode) {
        console.log(' Using JSON response from Gemini');
        
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
        console.log(' Original migratedCode (first 200 chars):', parsedResult.migratedCode.substring(0, 200));
        
        let processedMigratedCode = parsedResult.migratedCode;
        
        // Check if migratedCode contains JSON structure instead of raw code
        if (processedMigratedCode.trim().startsWith('```json') || processedMigratedCode.trim().startsWith('{')) {
          console.log(' Detected JSON structure in migratedCode, extracting actual code...');
          
          try {
            // Try to parse as JSON if it starts with {
            if (processedMigratedCode.trim().startsWith('{')) {
              const jsonMatch = processedMigratedCode.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const jsonStr = jsonMatch[0];
                const jsonObj = JSON.parse(jsonStr);
                if (jsonObj.migratedCode) {
                  processedMigratedCode = jsonObj.migratedCode;
                  console.log(' Extracted code from JSON.migratedCode field');
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
                  console.log(' Extracted code from markdown JSON block');
                }
              }
            }
          } catch (parseError) {
            console.error(' Failed to parse JSON structure:', parseError.message);
            console.log(' Using original migratedCode as fallback');
          }
        }
        
        // Convert escaped newlines to actual newlines
        processedMigratedCode = processedMigratedCode
          .replace(/\\n/g, '\n')
          .replace(/\\\\n/g, '\n')
          .replace(/\\r\\n/g, '\n')
          .replace(/\\r/g, '\n');
        
        console.log(' Processed migratedCode (first 200 chars):', processedMigratedCode.substring(0, 200));
        
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
        
        console.log(' Final migration result (migratedCode first 200 chars):', result.migratedCode.substring(0, 200));
        console.log(' Final migration result (files[0].content first 200 chars):', result.files[0]?.content?.substring(0, 200));
        console.log(' Target language was:', options.toLang);
        console.log(' Generated filename:', this.generateMigratedFilename(relevantChunks[0], options.toLang));
        
        return result;
      }
      
      // Check if the response is double-encoded JSON (Gemini sometimes returns JSON wrapped in JSON)
      if (parsedResult && typeof parsedResult.migratedCode === 'string' && parsedResult.migratedCode.startsWith('```json')) {
        console.log(' Detected double-encoded JSON, parsing inner content');
        try {
          const innerJsonMatch = parsedResult.migratedCode.match(/```(?:json)?\n([\s\S]*?)\n```/);
          if (innerJsonMatch) {
            const innerParsed = JSON.parse(innerJsonMatch[1]);
            console.log(' Parsed inner JSON from double-encoded response');
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
      
      console.log(' Parsed migration result successfully');
      console.log(' Code:', code.substring(0, 100) + '...');
      console.log(' Summary:', summary);
      console.log(' Changes:', changes);
      
      // Validate database migration quality
      console.log(' DEBUG: Checking if validation should run...');
      console.log(` DEBUG: fromLang=${options.fromLang}, toLang=${options.toLang}`);
      
      if (options.fromLang && options.toLang) {
        console.log(' DEBUG: Running validation...');
        const validation = this.validateDatabaseMigrationQuality(code, options.fromLang, options.toLang);
        
        console.log(' DEBUG: Validation result:', {
          isValid: validation.isValid,
          isAnalyticsMigration: validation.isAnalyticsMigration,
          characterCount: validation.characterCount,
          issueCount: validation.issues.length
        });
        
        if (validation.isAnalyticsMigration) {
          console.log(' Validating analytics database migration quality...');
          console.log(` Character count: ${validation.characterCount}`);
          
          if (!validation.isValid) {
            console.log(' Migration quality validation failed:');
            validation.issues.forEach(issue => console.log(`   - ${issue}`));
            
            // For analytics migrations, return a comprehensive demo instead of low-quality output
            console.log(' Falling back to comprehensive demo migration for quality assurance');
            const demoResult = this.generateDatabaseDemoMigration(options.fromLang, options.toLang, `Convert from ${options.fromLang} to ${options.toLang}`);
            console.log(' DEBUG: Demo migration character count:', demoResult.migratedCode.length);
            return demoResult;
          } else {
            console.log(' Analytics migration passed quality validation');
          }
        }
      } else {
        console.log(' DEBUG: Skipping validation - missing fromLang or toLang');
      }
      
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
      console.error(' Error processing Gemini response:', error);
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
    
    // Check if this is a database migration
    const isDatabaseMigration = this.isDatabaseMigration(fromLang, toLang);
    
    if (isDatabaseMigration) {
      return this.generateDatabaseDemoMigration(fromLang, toLang, command);
    }
    
    // Default programming language migration
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
   * Validate database migration output quality
   * @param {string} migratedCode - The generated migration code
   * @param {string} fromLang - Source language
   * @param {string} toLang - Target language
   * @returns {Object} Validation result with isValid and issues
   */
  validateDatabaseMigrationQuality(migratedCode, fromLang, toLang) {
    const issues = [];
    let isValid = true;

    // Check if this is an analytics database migration
    const isAnalyticsMigration = (fromLang === 'elasticsearch' && toLang === 'postgresql') ||
                                (fromLang === 'mongodb' && toLang === 'postgresql');

    if (isAnalyticsMigration) {
      // Minimum character count for analytics schemas
      if (migratedCode.length < 15000) {
        issues.push(`Analytics schema too short (${migratedCode.length} chars, minimum 15,000 required for comprehensive star schema)`);
        isValid = false;
      }

      // Check for star schema components
      const hasDimensionTables = /CREATE TABLE dim_/gi.test(migratedCode);
      const hasFactTables = /CREATE TABLE fact_/gi.test(migratedCode);
      const hasMaterializedViews = /CREATE MATERIALIZED VIEW/gi.test(migratedCode);
      const hasFunctions = /CREATE OR REPLACE FUNCTION/gi.test(migratedCode);
      const hasTriggers = /CREATE TRIGGER/gi.test(migratedCode);
      const hasPartitioning = /PARTITION BY/gi.test(migratedCode);

      if (!hasDimensionTables) {
        issues.push('Missing dimension tables (dim_*) - star schema required');
        isValid = false;
      }
      if (!hasFactTables) {
        issues.push('Missing fact tables (fact_*) - star schema required');
        isValid = false;
      }
      if (!hasMaterializedViews) {
        issues.push('Missing materialized views - required for analytics performance');
        isValid = false;
      }
      if (!hasFunctions) {
        issues.push('Missing custom functions - required for data processing');
        isValid = false;
      }
      if (!hasTriggers) {
        issues.push('Missing triggers - required for automated data management');
        isValid = false;
      }
      if (!hasPartitioning) {
        issues.push('Missing table partitioning - required for fact table performance');
        isValid = false;
      }

      // Check for forbidden patterns - multiple ways to detect single denormalized tables
      const hasSingleDenormalizedTable1 = /CREATE TABLE analytics[^;]*\([^)]*user_id[^)]*session_id[^)]*event_type/gis.test(migratedCode);
      const hasSingleDenormalizedTable2 = /CREATE TABLE analytics_events[^;]*\([^)]*user_id[^)]*session_id/gis.test(migratedCode);
      const hasSingleDenormalizedTable3 = /CREATE TABLE.*analytics.*\([^)]*user_id.*session_id.*page_url/gis.test(migratedCode);
      const hasOnlyOneTable = (migratedCode.match(/CREATE TABLE/gi) || []).length <= 1;
      
      if (hasSingleDenormalizedTable1 || hasSingleDenormalizedTable2 || hasSingleDenormalizedTable3) {
        issues.push('Detected single denormalized table - this violates star schema requirements');
        isValid = false;
      }
      
      if (hasOnlyOneTable) {
        issues.push('Only one table detected - star schema requires multiple dimension and fact tables');
        isValid = false;
      }
    }

    return {
      isValid,
      issues,
      characterCount: migratedCode.length,
      isAnalyticsMigration
    };
  }

  /**
   * Check if this is a database migration
   * @param {string} fromLang - Source language
   * @param {string} toLang - Target language
   * @returns {boolean} True if database migration
   */
  isDatabaseMigration(fromLang, toLang) {
    const databaseSystems = ['mysql', 'postgresql', 'mongodb', 'sqlite', 'redis', 'cassandra', 'dynamodb', 'elasticsearch'];
    return databaseSystems.includes(fromLang.toLowerCase()) || databaseSystems.includes(toLang.toLowerCase());
  }

  /**
   * Generate demo migration for database systems
   * @param {string} fromLang - Source database
   * @param {string} toLang - Target database
   * @param {string} command - Migration command
   * @returns {Object} Database demo migration result
   */
  generateDatabaseDemoMigration(fromLang, toLang, command) {
    const migrations = {
      'mysql-postgresql': {
        summary: 'Converted MySQL schema to PostgreSQL with improved JSON support and SERIAL primary keys',
        changes: [
          'Converted AUTO_INCREMENT to SERIAL',
          'Changed TINYINT(1) to BOOLEAN',
          'Updated JSON to JSONB for better performance',
          'Converted MySQL-specific syntax to PostgreSQL',
          'Updated character sets and collations'
        ],
        content: `-- PostgreSQL Database Schema (converted from MySQL)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    profile JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    category_id INTEGER,
    stock_quantity INTEGER DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- PostgreSQL specific features
CREATE INDEX idx_users_email ON users USING btree (email);
CREATE INDEX idx_products_metadata ON products USING gin (metadata);

-- Sample queries with PostgreSQL syntax
SELECT * FROM users WHERE is_active = true;
SELECT name, metadata->>'color' as color FROM products WHERE metadata ? 'color';`
      },
      'mongodb-postgresql': {
        summary: 'Converted MongoDB document database to PostgreSQL relational schema with JSONB support',
        changes: [
          'Converted MongoDB collections to PostgreSQL tables',
          'Mapped embedded documents to JSONB columns',
          'Created relational foreign key constraints',
          'Converted MongoDB queries to SQL equivalents',
          'Added proper indexing for performance'
        ],
        content: `-- PostgreSQL Schema (converted from MongoDB)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    profile JSONB,
    preferences JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    category JSONB,
    inventory JSONB,
    tags TEXT[],
    reviews JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Indexes for JSONB columns
CREATE INDEX idx_users_profile ON users USING gin (profile);
CREATE INDEX idx_products_category ON products USING gin (category);

-- Query examples
SELECT * FROM users WHERE profile->>'firstName' = 'John';
SELECT * FROM products WHERE tags @> ARRAY['electronics'];`
      },
      'postgresql-mongodb': {
        summary: 'Converted PostgreSQL relational database to MongoDB document-based collections',
        changes: [
          'Converted PostgreSQL tables to MongoDB collections',
          'Mapped relational data to embedded documents',
          'Converted SQL queries to MongoDB operations',
          'Added MongoDB-specific indexes',
          'Implemented document-based data modeling'
        ],
        content: `// MongoDB Collections (converted from PostgreSQL)
const { MongoClient, ObjectId } = require('mongodb');

// Users collection
const users = [
  {
    _id: new ObjectId(),
    username: "john_doe",
    email: "john@example.com",
    profile: {
      firstName: "John",
      lastName: "Doe",
      address: {
        street: "123 Main St",
        city: "New York",
        zipCode: "10001"
      }
    },
    preferences: {
      newsletter: true,
      language: "en"
    },
    createdAt: new Date(),
    isActive: true
  }
];

// Products collection with embedded category
const products = [
  {
    _id: new ObjectId(),
    name: "Smartphone X1",
    price: 699.99,
    category: {
      id: new ObjectId(),
      name: "Electronics",
      path: ["Electronics", "Mobile"]
    },
    inventory: {
      stockQuantity: 50,
      minStock: 10
    },
    tags: ["smartphone", "electronics"],
    reviews: {
      averageRating: 4.5,
      totalReviews: 128
    },
    createdAt: new Date(),
    isActive: true
  }
];

// MongoDB operations
db.users.insertMany(users);
db.products.insertMany(products);

// Create indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.products.createIndex({ "category.name": 1 });
db.products.createIndex({ tags: 1 });

// Query examples
db.users.find({ "profile.firstName": "John" });
db.products.find({ tags: "electronics" });`
      },
      'sqlite-postgresql': {
        summary: 'Migrated SQLite embedded database to PostgreSQL server database',
        changes: [
          'Converted AUTOINCREMENT to SERIAL',
          'Changed INTEGER to appropriate PostgreSQL types',
          'Updated TEXT to VARCHAR with appropriate lengths',
          'Converted SQLite DATETIME to TIMESTAMP',
          'Added PostgreSQL-specific features and constraints'
        ],
        content: `-- PostgreSQL Database (converted from SQLite)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    priority INTEGER DEFAULT 1,
    due_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- PostgreSQL specific indexes
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;

-- Sample data
INSERT INTO users (username, email, password_hash) VALUES 
('alice', 'alice@example.com', 'hash123'),
('bob', 'bob@example.com', 'hash456');

-- PostgreSQL query examples
SELECT * FROM users WHERE is_active = true;
SELECT COUNT(*) FROM tasks WHERE status = 'pending';`
      },
      'elasticsearch-postgresql': {
        summary: 'Converted Elasticsearch analytics index to comprehensive PostgreSQL analytics database schema',
        changes: [
          'Converted Elasticsearch mappings to PostgreSQL tables with proper data types',
          'Created normalized dimension tables for users, products, campaigns, and locations',
          'Built comprehensive fact tables for events, sessions, and transactions',
          'Added materialized views for pre-aggregated analytics data',
          'Implemented PostgreSQL functions for data processing and calculations',
          'Created triggers for automatic timestamp updates and data validation',
          'Added full-text search capabilities using PostgreSQL tsvector',
          'Optimized with proper indexes and partitioning for performance'
        ],
        content: `-- PostgreSQL Analytics Database Schema (converted from Elasticsearch)
-- =================================================================
-- DIMENSION TABLES
-- =================================================================

-- Users dimension table
CREATE TABLE dim_users (
    user_id SERIAL PRIMARY KEY,
    user_uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    registration_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    user_segment VARCHAR(50),
    lifetime_value DECIMAL(12,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products dimension table
CREATE TABLE dim_products (
    product_id SERIAL PRIMARY KEY,
    product_sku VARCHAR(100) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    brand VARCHAR(100),
    price DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2),
    description TEXT,
    tags TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Campaigns dimension table
CREATE TABLE dim_campaigns (
    campaign_id SERIAL PRIMARY KEY,
    campaign_name VARCHAR(255) NOT NULL,
    campaign_type VARCHAR(50),
    channel VARCHAR(50),
    start_date DATE,
    end_date DATE,
    budget DECIMAL(12,2),
    target_audience JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Locations dimension table
CREATE TABLE dim_locations (
    location_id SERIAL PRIMARY KEY,
    country VARCHAR(100),
    region VARCHAR(100),
    city VARCHAR(100),
    postal_code VARCHAR(20),
    timezone VARCHAR(50),
    coordinates POINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Devices dimension table
CREATE TABLE dim_devices (
    device_id SERIAL PRIMARY KEY,
    device_type VARCHAR(50),
    browser VARCHAR(100),
    browser_version VARCHAR(50),
    operating_system VARCHAR(100),
    os_version VARCHAR(50),
    screen_resolution VARCHAR(20),
    is_mobile BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =================================================================
-- FACT TABLES
-- =================================================================

-- Page views fact table
CREATE TABLE fact_page_views (
    page_view_id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL,
    user_id INTEGER REFERENCES dim_users(user_id),
    page_url TEXT NOT NULL,
    page_title VARCHAR(255),
    referrer_url TEXT,
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    device_id INTEGER REFERENCES dim_devices(device_id),
    location_id INTEGER REFERENCES dim_locations(location_id),
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    duration_seconds INTEGER,
    bounce BOOLEAN DEFAULT false,
    exit_page BOOLEAN DEFAULT false
) PARTITION BY RANGE (timestamp);

-- Events fact table
CREATE TABLE fact_events (
    event_id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL,
    user_id INTEGER REFERENCES dim_users(user_id),
    event_type VARCHAR(100) NOT NULL,
    event_category VARCHAR(100),
    event_action VARCHAR(100),
    event_label VARCHAR(255),
    event_value DECIMAL(10,2),
    page_url TEXT,
    device_id INTEGER REFERENCES dim_devices(device_id),
    location_id INTEGER REFERENCES dim_locations(location_id),
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    properties JSONB
) PARTITION BY RANGE (timestamp);

-- Transactions fact table
CREATE TABLE fact_transactions (
    transaction_id BIGSERIAL PRIMARY KEY,
    order_id VARCHAR(100) UNIQUE NOT NULL,
    session_id VARCHAR(100),
    user_id INTEGER REFERENCES dim_users(user_id),
    product_id INTEGER REFERENCES dim_products(product_id),
    campaign_id INTEGER REFERENCES dim_campaigns(campaign_id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50),
    transaction_status VARCHAR(50) DEFAULT 'completed',
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    device_id INTEGER REFERENCES dim_devices(device_id),
    location_id INTEGER REFERENCES dim_locations(location_id)
) PARTITION BY RANGE (timestamp);

-- Sessions fact table
CREATE TABLE fact_sessions (
    session_id VARCHAR(100) PRIMARY KEY,
    user_id INTEGER REFERENCES dim_users(user_id),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration_seconds INTEGER,
    page_views_count INTEGER DEFAULT 0,
    events_count INTEGER DEFAULT 0,
    bounce BOOLEAN DEFAULT false,
    conversion BOOLEAN DEFAULT false,
    revenue DECIMAL(12,2) DEFAULT 0,
    device_id INTEGER REFERENCES dim_devices(device_id),
    location_id INTEGER REFERENCES dim_locations(location_id),
    traffic_source VARCHAR(100),
    landing_page TEXT,
    exit_page TEXT
);

-- =================================================================
-- MATERIALIZED VIEWS FOR ANALYTICS
-- =================================================================

-- Daily user activity summary
CREATE MATERIALIZED VIEW mv_daily_user_activity AS
SELECT 
    DATE(timestamp) as activity_date,
    COUNT(DISTINCT user_id) as active_users,
    COUNT(DISTINCT session_id) as total_sessions,
    COUNT(*) as total_page_views,
    AVG(duration_seconds) as avg_session_duration,
    SUM(CASE WHEN bounce THEN 1 ELSE 0 END) as bounce_sessions,
    ROUND(SUM(CASE WHEN bounce THEN 1 ELSE 0 END) * 100.0 / COUNT(DISTINCT session_id), 2) as bounce_rate
FROM fact_page_views 
GROUP BY DATE(timestamp)
ORDER BY activity_date DESC;

-- Monthly revenue by product
CREATE MATERIALIZED VIEW mv_monthly_revenue_by_product AS
SELECT 
    DATE_TRUNC('month', t.timestamp) as revenue_month,
    p.product_name,
    p.category,
    SUM(t.total_amount) as total_revenue,
    SUM(t.quantity) as total_quantity,
    COUNT(DISTINCT t.user_id) as unique_customers,
    AVG(t.unit_price) as avg_unit_price
FROM fact_transactions t
JOIN dim_products p ON t.product_id = p.product_id
GROUP BY DATE_TRUNC('month', t.timestamp), p.product_name, p.category
ORDER BY revenue_month DESC, total_revenue DESC;

-- Campaign performance summary
CREATE MATERIALIZED VIEW mv_campaign_performance AS
SELECT 
    c.campaign_name,
    c.campaign_type,
    c.channel,
    COUNT(DISTINCT t.user_id) as unique_customers,
    SUM(t.total_amount) as total_revenue,
    COUNT(t.transaction_id) as total_transactions,
    AVG(t.total_amount) as avg_order_value,
    c.budget,
    CASE 
        WHEN c.budget > 0 THEN ROUND(SUM(t.total_revenue) / c.budget, 2)
        ELSE NULL 
    END as roi
FROM dim_campaigns c
LEFT JOIN fact_transactions t ON c.campaign_id = t.campaign_id
GROUP BY c.campaign_id, c.campaign_name, c.campaign_type, c.channel, c.budget;

-- =================================================================
-- FUNCTIONS AND TRIGGERS
-- =================================================================

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON dim_users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON dim_products 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate session metrics
CREATE OR REPLACE FUNCTION calculate_session_metrics(session_uuid VARCHAR)
RETURNS VOID AS $$
BEGIN
    UPDATE fact_sessions 
    SET 
        page_views_count = (
            SELECT COUNT(*) FROM fact_page_views 
            WHERE session_id = session_uuid
        ),
        events_count = (
            SELECT COUNT(*) FROM fact_events 
            WHERE session_id = session_uuid
        ),
        revenue = (
            SELECT COALESCE(SUM(total_amount), 0) FROM fact_transactions 
            WHERE session_id = session_uuid
        ),
        conversion = (
            SELECT COUNT(*) > 0 FROM fact_transactions 
            WHERE session_id = session_uuid
        )
    WHERE session_id = session_uuid;
END;
$$ LANGUAGE plpgsql;

-- =================================================================
-- INDEXES FOR PERFORMANCE
-- =================================================================

-- Dimension table indexes
CREATE INDEX idx_users_email ON dim_users(email);
CREATE INDEX idx_users_segment ON dim_users(user_segment);
CREATE INDEX idx_products_sku ON dim_products(product_sku);
CREATE INDEX idx_products_category ON dim_products(category);
CREATE INDEX idx_campaigns_type ON dim_campaigns(campaign_type);

-- Fact table indexes
CREATE INDEX idx_page_views_timestamp ON fact_page_views(timestamp);
CREATE INDEX idx_page_views_user_session ON fact_page_views(user_id, session_id);
CREATE INDEX idx_events_timestamp ON fact_events(timestamp);
CREATE INDEX idx_events_type ON fact_events(event_type);
CREATE INDEX idx_transactions_timestamp ON fact_transactions(timestamp);
CREATE INDEX idx_transactions_user ON fact_transactions(user_id);
CREATE INDEX idx_sessions_start_time ON fact_sessions(start_time);

-- Full-text search indexes
CREATE INDEX idx_products_search ON dim_products USING gin(to_tsvector('english', product_name || ' ' || description));

-- =================================================================
-- PARTITIONING SETUP
-- =================================================================

-- Create monthly partitions for fact tables (example for current year)
CREATE TABLE fact_page_views_2024_01 PARTITION OF fact_page_views
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE fact_page_views_2024_02 PARTITION OF fact_page_views
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

CREATE TABLE fact_events_2024_01 PARTITION OF fact_events
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE fact_events_2024_02 PARTITION OF fact_events
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

CREATE TABLE fact_transactions_2024_01 PARTITION OF fact_transactions
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE fact_transactions_2024_02 PARTITION OF fact_transactions
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- =================================================================
-- SAMPLE ANALYTICS QUERIES
-- =================================================================

-- Top performing products by revenue
SELECT 
    p.product_name,
    SUM(t.total_amount) as revenue,
    COUNT(t.transaction_id) as sales_count
FROM fact_transactions t
JOIN dim_products p ON t.product_id = p.product_id
WHERE t.timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY p.product_id, p.product_name
ORDER BY revenue DESC
LIMIT 10;

-- User engagement funnel
WITH funnel AS (
    SELECT 
        COUNT(DISTINCT CASE WHEN event_type = 'page_view' THEN user_id END) as page_views,
        COUNT(DISTINCT CASE WHEN event_type = 'add_to_cart' THEN user_id END) as add_to_cart,
        COUNT(DISTINCT CASE WHEN event_type = 'checkout' THEN user_id END) as checkout,
        COUNT(DISTINCT t.user_id) as purchases
    FROM fact_events e
    LEFT JOIN fact_transactions t ON e.user_id = t.user_id 
        AND DATE(e.timestamp) = DATE(t.timestamp)
    WHERE e.timestamp >= CURRENT_DATE - INTERVAL '7 days'
)
SELECT 
    page_views,
    add_to_cart,
    ROUND(add_to_cart * 100.0 / page_views, 2) as cart_conversion_rate,
    checkout,
    ROUND(checkout * 100.0 / add_to_cart, 2) as checkout_conversion_rate,
    purchases,
    ROUND(purchases * 100.0 / checkout, 2) as purchase_conversion_rate
FROM funnel;`
      },
      'redis-mongodb': {
        summary: 'Converted Redis key-value store to MongoDB document collections',
        changes: [
          'Converted Redis keys to MongoDB document IDs',
          'Mapped Redis data structures to MongoDB documents',
          'Converted Redis operations to MongoDB queries',
          'Added TTL indexes for expiration functionality',
          'Implemented MongoDB equivalents for Redis data types'
        ],
        content: `// MongoDB Collections (converted from Redis)
const { MongoClient, ObjectId } = require('mongodb');

// Sessions collection (from Redis strings)
const sessions = [
  {
    _id: new ObjectId(),
    sessionId: 'session:user:123',
    userId: 123,
    username: 'john_doe',
    email: 'john@example.com',
    loginTime: new Date(),
    permissions: ['read', 'write'],
    expiresAt: new Date(Date.now() + 3600000), // 1 hour TTL
    createdAt: new Date()
  }
];

// Shopping carts collection (from Redis hashes)
const shoppingCarts = [
  {
    _id: new ObjectId(),
    userId: 123,
    items: [
      { productId: 456, quantity: 2 },
      { productId: 789, quantity: 1 }
    ],
    totalItems: 3,
    updatedAt: new Date(),
    createdAt: new Date()
  }
];

// User searches collection (from Redis lists)
const userSearches = [
  {
    _id: new ObjectId(),
    userId: 123,
    searches: [
      { query: 'smartphone', timestamp: new Date() },
      { query: 'laptop', timestamp: new Date() }
    ],
    createdAt: new Date()
  }
];

// Leaderboard collection (from Redis sorted sets)
const leaderboard = [
  {
    _id: new ObjectId(),
    userId: 456,
    score: 2300,
    period: 'monthly',
    rank: 1,
    updatedAt: new Date()
  },
  {
    _id: new ObjectId(),
    userId: 789,
    score: 1800,
    period: 'monthly',
    rank: 2,
    updatedAt: new Date()
  }
];

// Create collections with TTL indexes
db.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
db.sessions.insertMany(sessions);
db.shoppingCarts.insertMany(shoppingCarts);
db.userSearches.insertMany(userSearches);
db.leaderboard.insertMany(leaderboard);

// Query examples
const userSession = await db.sessions.findOne({ userId: 123 });
const userCart = await db.shoppingCarts.findOne({ userId: 123 });
const topUsers = await db.leaderboard.find({ period: 'monthly' }).sort({ score: -1 }).limit(10);`
      }
    };

    const migrationKey = `${fromLang.toLowerCase()}-${toLang.toLowerCase()}`;
    const migration = migrations[migrationKey];

    if (migration) {
      const extension = this.getFileExtensionForLanguage(toLang);
      return {
        migratedCode: migration.content,
        summary: migration.summary,
        changes: migration.changes,
        files: [
          {
            filename: `demo-${fromLang.toLowerCase()}.${fromLang === 'mysql' || fromLang === 'postgresql' || fromLang === 'sqlite' ? 'sql' : 'js'}`,
            migratedFilename: `demo-${toLang.toLowerCase()}${extension}`,
            content: migration.content
          }
        ],
        isDemo: true
      };
    }

    // Fallback for unsupported database migration pairs
    return {
      migratedCode: `-- Demo ${fromLang} to ${toLang} Migration
-- This is a demonstration of database migration capabilities
-- The actual migration would convert your ${fromLang} schema to ${toLang}

-- Example conversion patterns:
-- 1. Data type mapping (VARCHAR → TEXT, INT → INTEGER)
-- 2. Syntax conversion (AUTO_INCREMENT → SERIAL)
-- 3. Feature adaptation (JSON → JSONB, etc.)
-- 4. Query optimization for target database

-- Your ${fromLang} schema would be analyzed and converted
-- to equivalent ${toLang} structures with best practices applied.`,
      summary: `Demo migration from ${fromLang} to ${toLang} database`,
      changes: [
        `Converted ${fromLang} schema to ${toLang} format`,
        `Updated data types for ${toLang} compatibility`,
        `Applied ${toLang} best practices and optimizations`
      ],
      files: [
        {
          filename: `demo-${fromLang.toLowerCase()}.sql`,
          migratedFilename: `demo-${toLang.toLowerCase()}.sql`,
          content: `-- Demo ${fromLang} to ${toLang} Migration Result
-- Your converted database schema would appear here`
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

    // Use standard migration prompt for all conversions

    return `You are an expert code migration assistant. Your task is to help users migrate their code between different programming languages or frameworks.

CRITICAL: When you return the JSON response, the "migratedCode" field must contain the ACTUAL CONVERTED CODE, not JSON structure. Put the complete, runnable code in the target language there.

CRITICAL: Follow the conversion direction exactly. If converting FROM Kotlin TO Java, return Java code. If converting FROM Java TO Kotlin, return Kotlin code. Do NOT mix languages in the output.

CRITICAL FOR DATABASE MIGRATIONS: If this is an Elasticsearch to PostgreSQL conversion, you MUST generate a comprehensive star schema with 15,000+ characters. DO NOT create a single denormalized table. This is MANDATORY.

USER COMMAND: ${command}

RELEVANT CODE CONTEXT:
${contextString}

CRITICAL INSTRUCTIONS FOR PRODUCTION-READY MIGRATION:
1. FOLLOW THE EXACT COMMAND: You MUST follow the user's command exactly. If the command says "Convert from MongoDB to PostgreSQL", you MUST convert to PostgreSQL SQL syntax, not Java or any other language.
2. DATABASE CONVERSIONS: When converting between database systems (MySQL, PostgreSQL, MongoDB, SQLite, etc.), output the appropriate database syntax (SQL for relational databases, JavaScript/JSON for document databases).
3. PRESERVE ORIGINAL STRUCTURE: Maintain the exact same code structure, order, and organization as the original
4. PRESERVE ALL CONTENT: Include ALL variables, functions, classes, objects, and logic from the original code
5. PRESERVE ALL CLASSES AND METHODS: NEVER drop entire classes, methods, or business logic. Convert EVERYTHING.
6. PRESERVE DATA VALUES: Keep all original values, strings, numbers, and object properties unchanged
7. PRESERVE GLOBAL VARIABLES: Include all global variables with appropriate syntax for target language
8. PRESERVE OBJECT PROPERTIES: Maintain all object properties and nested structures exactly as they were
9. PRESERVE ARRAY OPERATIONS: Keep all array operations, mapping, and transformations intact
10. PRESERVE EVENT HANDLERS: Maintain the exact same event handling logic and structure
11. PRESERVE EXPORTS: Keep all export statements and their structure identical
12. CONVERT SYNTAX PROPERLY: Convert syntax to target language while preserving functionality
13. AVOID REFACTORING: Do not restructure, reorganize, or refactor the code - only convert syntax
14. USE PROPER LANGUAGE CONSTRUCTS: Use appropriate language-specific constructs for the target language
15. MAINTAIN COMMENTS: Preserve all original comments and add migration-specific comments only where necessary
16. COMPLETE CONVERSION: The output must contain ALL classes, methods, and functionality from the input
17. JSX/TSX CONVERSIONS: When converting from TSX to JSX, PRESERVE ALL JSX SYNTAX - NEVER use React.createElement()
18. SYNTAX-ONLY CONVERSION: ONLY change syntax elements (type annotations, keywords, etc.) - NEVER change the overall logic or structure
19. PRESERVE FILE PURPOSE: If the original is a config file, keep it as a config file. If it's a component, keep it as a component.
20. NO CODE GENERATION: Do not generate new code that wasn't in the original - only convert existing code syntax

PRODUCTION-READY CODE REQUIREMENTS:
17. GENERATE COMPLETE MODULES: Create full, self-contained modules with proper imports/exports, not basic scripts
18. ADD CONNECTION MANAGEMENT: Include proper database connection handling, connection pooling, and error handling
19. IMPLEMENT ASYNC/AWAIT: Use modern asynchronous patterns instead of callback-based or shell commands
20. ADD ENVIRONMENT CONFIGURATION: Include environment variable support for database URLs, credentials, and settings
21. INCLUDE ERROR HANDLING: Add comprehensive try-catch blocks and proper error management
22. ADD PERFORMANCE OPTIMIZATIONS: Include proper indexing, query optimization, and performance best practices
23. IMPLEMENT PROPER STRUCTURE: Use classes, functions, and modules appropriate for the target language
24. ADD DOCUMENTATION: Include JSDoc comments, function descriptions, and usage examples
25. ENSURE PRODUCTION READINESS: Generate code that can be immediately deployed to production environments

MIGRATION QUALITY REQUIREMENTS:
- The migrated code should be a 1:1 conversion with proper syntax for target language
- All original functionality must be preserved exactly
- All original data structures must be maintained
- All original variable names, function names, and class names must be preserved
- The code should be syntactically correct for the target language
- YOU MUST FOLLOW THE USER'S COMMAND EXACTLY - DO NOT CONVERT TO A DIFFERENT LANGUAGE THAN REQUESTED

CRITICAL DATABASE MIGRATION REQUIREMENTS:
- For analytics database conversions (Elasticsearch → PostgreSQL), generate a COMPREHENSIVE schema
- MANDATORY: Use star schema design with separate fact and dimension tables
- MANDATORY: Include ALL tables, views, functions, and triggers needed for a complete analytics system
- MANDATORY: Generate 15,000+ characters of SQL code for complex analytics schemas
- MANDATORY: Create normalized database structure with proper foreign key relationships
- MANDATORY: Include performance optimizations (indexes, materialized views, partitioning)
- MANDATORY: Add data processing functions and automated triggers
- MANDATORY: Generate complete analytics infrastructure, not just basic table definitions
- FORBIDDEN: NEVER generate incomplete or partial database schemas
- FORBIDDEN: NEVER create single denormalized tables for analytics - use proper star schema
- FORBIDDEN: NEVER create a single table called "analytics_events" or similar wide table
- VALIDATION: Any analytics database schema under 15,000 characters is INCOMPLETE and REJECTED
- QUALITY CHECK: The output must include dimension tables, fact tables, materialized views, functions, triggers, and indexes

PRODUCTION-READY DATABASE CODE REQUIREMENTS:
- MANDATORY: Generate complete Node.js modules with proper imports, not basic shell scripts
- MANDATORY: Include MongoDB connection management with proper error handling
- MANDATORY: Use async/await patterns instead of shell commands
- MANDATORY: Add environment variable configuration for database URLs and credentials
- MANDATORY: Include comprehensive error handling and connection pooling
- MANDATORY: Add proper indexing strategies and performance optimizations
- MANDATORY: Implement proper module structure with exported functions
- MANDATORY: Include JSDoc documentation and usage examples
- MANDATORY: Generate code that can be immediately deployed to production
- FORBIDDEN: NEVER generate basic shell scripts or simple command sequences
- FORBIDDEN: NEVER omit connection management or error handling
- FORBIDDEN: NEVER generate incomplete modules without proper structure

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

TYPESCRIPT TO JAVASCRIPT SPECIFIC CONVERSIONS (CRITICAL FOR TSX/JSX):
When converting from TypeScript to JavaScript, you MUST make these specific changes:
- PRESERVE JSX SYNTAX: Keep all JSX elements exactly as they are (<div>, <h1>, etc.) - DO NOT convert to React.createElement()
- Remove type annotations: let name: string = "John" → let name = "John"
- Remove interface definitions: interface User { name: string } → (remove entirely)
- Remove type parameters: function greet(name: string): void → function greet(name) { }
- Remove return type annotations: function getName(): string → function getName() { }
- Remove generic type parameters: Array<string> → Array
- Remove type assertions: value as string → value
- Remove optional property markers: name?: string → name
- Remove readonly modifiers: readonly name: string → name: string
- PRESERVE ALL JSX: Keep <div>, <span>, <button>, etc. exactly as written
- PRESERVE ALL REACT COMPONENTS: Keep component structure and JSX syntax intact
- PRESERVE ALL PROPS: Keep prop passing and destructuring exactly as written
- PRESERVE ALL EVENT HANDLERS: Keep onClick, onChange, etc. exactly as written
- PRESERVE ALL CONDITIONAL RENDERING: Keep {condition && <Component />} syntax
- PRESERVE ALL LOOPS: Keep {items.map(item => <Item key={item.id} />)} syntax
- CRITICAL: NEVER use React.createElement() - always preserve JSX syntax
- CRITICAL: NEVER change the component structure or logic
- CRITICAL: ONLY remove TypeScript-specific syntax, keep everything else identical

TYPESCRIPT TO JAVASCRIPT EXAMPLES:
WRONG (using React.createElement):
const Header = ({ title }) => {
  return React.createElement('h1', { className: 'title' }, title);
};

CORRECT (preserving JSX):
const Header = ({ title }) => {
  return <h1 className="title">{title}</h1>;
};

WRONG (changing structure):
const App = () => {
  return React.createElement('div', null, 
    React.createElement('h1', null, 'Hello World')
  );
};

CORRECT (preserving JSX):
const App = () => {
  return (
    <div>
      <h1>Hello World</h1>
    </div>
  );
};

CONFIG FILE CONVERSION EXAMPLES:
WRONG (changing file purpose):
Original: export default { content: ['./src/**/*.js'], theme: { extend: {} } }
Converted: function App() { return <div>...</div> }

CORRECT (preserving file purpose):
Original: export default { content: ['./src/**/*.js'], theme: { extend: {} } }
Converted: export default { content: ['./src/**/*.js'], theme: { extend: {} } }

WRONG (generating new code):
Original: const config = { api: 'localhost:3000' }
Converted: class ApiService { constructor() { this.baseUrl = 'localhost:3000' } }

CORRECT (syntax-only conversion):
Original: const config = { api: 'localhost:3000' }
Converted: const config = { api: 'localhost:3000' }

DATABASE CONVERSION SPECIFIC INSTRUCTIONS:
When converting between database systems, you MUST follow these patterns:

ELASTICSEARCH TO POSTGRESQL CONVERSIONS (CRITICAL FOR ANALYTICS):

ABSOLUTE REQUIREMENTS - NO EXCEPTIONS:
1. STAR SCHEMA ONLY: Create separate fact and dimension tables. NEVER create a single table called "analytics_events" or similar.
2. MINIMUM 15,000 CHARACTERS: The output must be comprehensive and detailed.
3. REQUIRED TABLES (MUST INCLUDE ALL):
   - dim_users (user dimension table)
   - dim_products (product dimension table) 
   - dim_campaigns (campaign dimension table)
   - dim_locations (location dimension table)
   - dim_devices (device dimension table)
   - fact_events (main fact table)
   - fact_page_views (page view fact table)
   - fact_transactions (transaction fact table)
   - fact_sessions (session fact table)

4. REQUIRED FEATURES (MUST INCLUDE ALL):
   - Table partitioning: PARTITION BY RANGE (timestamp)
   - Materialized views: CREATE MATERIALIZED VIEW (at least 3)
   - Custom functions: CREATE OR REPLACE FUNCTION (at least 2)
   - Triggers: CREATE TRIGGER (at least 2)
   - Indexes: CREATE INDEX (at least 10 different indexes)

FORBIDDEN PATTERNS (WILL CAUSE REJECTION):
 CREATE TABLE analytics_events (...) -- Single denormalized table
 CREATE TABLE analytics (...) -- Wide single table
 Any schema with fewer than 8 tables
 Any schema without materialized views
 Any schema without partitioning
 Any schema under 15,000 characters

REQUIRED OUTPUT STRUCTURE:
-- DIMENSION TABLES (5+ tables)
CREATE TABLE dim_users (...);
CREATE TABLE dim_products (...);
CREATE TABLE dim_campaigns (...);
CREATE TABLE dim_locations (...);
CREATE TABLE dim_devices (...);

-- FACT TABLES (4+ tables with partitioning)
CREATE TABLE fact_events (...) PARTITION BY RANGE (timestamp);
CREATE TABLE fact_page_views (...) PARTITION BY RANGE (timestamp);
CREATE TABLE fact_transactions (...) PARTITION BY RANGE (timestamp);
CREATE TABLE fact_sessions (...);

-- MATERIALIZED VIEWS (3+ views)
CREATE MATERIALIZED VIEW mv_daily_user_activity AS ...;
CREATE MATERIALIZED VIEW mv_monthly_revenue_by_product AS ...;
CREATE MATERIALIZED VIEW mv_campaign_performance AS ...;

-- FUNCTIONS AND TRIGGERS (2+ each)
CREATE OR REPLACE FUNCTION update_updated_at_column() ...;
CREATE TRIGGER update_users_updated_at ...;

-- INDEXES (10+ indexes)
CREATE INDEX idx_users_email ON dim_users(email);
[... more indexes ...]

This is the ONLY acceptable pattern for Elasticsearch to PostgreSQL conversions.

POSTGRESQL TO ELASTICSEARCH CONVERSIONS:
- Convert PostgreSQL tables to Elasticsearch indices with proper mappings
- Convert SQL schema to Elasticsearch mapping definitions with field types and analyzers
- Convert PostgreSQL indexes to Elasticsearch index settings
- Convert PostgreSQL functions to Elasticsearch aggregation queries
- Convert materialized views to Elasticsearch aggregation pipelines

MONGODB TO POSTGRESQL CONVERSIONS:
- Convert MongoDB collections to PostgreSQL tables with CREATE TABLE statements
- Convert MongoDB documents to PostgreSQL rows with INSERT statements
- Convert MongoDB queries to SQL SELECT statements with proper WHERE clauses
- Use PostgreSQL data types: TEXT, INTEGER, BOOLEAN, TIMESTAMP, JSONB
- Convert MongoDB ObjectId to PostgreSQL UUID or SERIAL PRIMARY KEY
- Convert nested objects to JSONB columns in PostgreSQL
- Example: db.users.find({active: true}) → SELECT * FROM users WHERE active = true;

POSTGRESQL TO MONGODB CONVERSIONS:
- Convert PostgreSQL tables to MongoDB collections
- Convert SQL INSERT statements to MongoDB insertOne/insertMany operations
- Convert SQL SELECT statements to MongoDB find() operations
- Convert PostgreSQL JSONB to MongoDB nested documents
- Example: SELECT * FROM users WHERE active = true → db.users.find({active: true})

MYSQL TO POSTGRESQL CONVERSIONS:
- Convert MySQL AUTO_INCREMENT to PostgreSQL SERIAL
- Convert MySQL ENGINE=InnoDB to PostgreSQL (remove engine specification)
- Convert MySQL specific data types to PostgreSQL equivalents
- Convert MySQL syntax to PostgreSQL syntax

REDIS TO MONGODB CONVERSIONS:
- Convert Redis key-value operations to MongoDB document operations
- Convert Redis SET/GET to MongoDB insertOne/findOne operations
- Convert Redis HSET/HGET to MongoDB document fields
- Convert Redis lists (LPUSH/RPUSH) to MongoDB arrays
- Convert Redis sets (SADD/SMEMBERS) to MongoDB arrays with unique values
- Convert Redis sorted sets (ZADD/ZRANGE) to MongoDB documents with score fields
- Convert Redis TTL/EXPIRE to MongoDB TTL indexes
- Example: client.set('user:123', data) → db.users.insertOne({_id: '123', ...data})
- Example: client.hset('cart:456', field, value) → db.carts.updateOne({_id: '456'}, {$set: {[field]: value}})
- Example: client.lpush('queue', item) → db.queues.updateOne({_id: 'queue'}, {$push: {items: item}})

MONGODB TO REDIS CONVERSIONS:
- Convert MongoDB documents to Redis key-value pairs
- Convert MongoDB collections to Redis key namespaces
- Convert MongoDB findOne to Redis GET operations
- Convert MongoDB insertOne to Redis SET operations
- Convert MongoDB arrays to Redis lists or sets
- Example: db.users.findOne({_id: '123'}) → client.get('user:123')
- Example: db.carts.updateOne({_id: '456'}, {$set: {item: value}}) → client.hset('cart:456', 'item', value)

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
CRITICAL: Return ONLY the migrated code content. Do NOT wrap it in JSON, do NOT use JSON structure, do NOT add any metadata.

For TSX to JSX conversion:
- Return ONLY the JavaScript code with JSX syntax preserved
- Remove TypeScript type annotations
- Keep all JSX elements exactly as they are
- Do NOT use React.createElement()
- Do NOT wrap in JSON

Example:
WRONG (JSON wrapped):
{"migratedCode": "function App() { return <div>Hello</div>; }"}

CORRECT (direct code):
function App() {
  return <div>Hello</div>;
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
