import EmbeddingService from './embeddingService.js';
import MockTreeSitterService from './mockTreeSitterService.js';
import Embedding from '../models/Embedding.js';
import fs from 'fs-extra';
import path from 'path';

/**
 * Tree-sitter service for parsing code files into semantic chunks
 * 
 * This service provides comprehensive code analysis with fallback to mock service
 * when native Tree-sitter bindings are not available (common on Windows)
 */
class TreeSitterService {
  constructor() {
    // Prevent multiple initialization
    if (TreeSitterService.instance) {
      return TreeSitterService.instance;
    }

    // Initialize fallback mock service first
    this.mockService = new MockTreeSitterService();
    this.useNativeTreeSitter = false;
    this.parserManager = null;
    this.chunkExtractor = null;
    this.metadataExtractor = null;
    this.fileSystemWalker = null;
    this.statisticsCalculator = null;
    this.initialized = false;
    
    // Initialize embedding service
    try {
      this.embeddingService = EmbeddingService; // Use singleton instance
      console.log('✅ Embedding service initialized');
    } catch (error) {
      console.warn('⚠️  Embedding service not available:', error.message);
      this.embeddingService = null;
    }
    
    // Initialize Tree-sitter components asynchronously
    this.initializeTreeSitter();
    
    // Set singleton instance
    TreeSitterService.instance = this;
  }

  /**
   * Initialize Tree-sitter components asynchronously
   */
  async initializeTreeSitter() {
    if (this.initialized) {
      return;
    }

    // Check if we're on Windows and skip native parser loading
    if (process.platform === 'win32') {
      console.log('⚠️  Windows detected - skipping native Tree-sitter parser loading');
      this.useNativeTreeSitter = false;
      this.initialized = true;
      console.log('Tree-sitter service initialized (mock mode)');
      return;
    }

    try {
      // Try to import native Tree-sitter components
      const treeSitterModules = await import('./treesitter/index.js');
      this.parserManager = new treeSitterModules.ParserManager();
      // Wait for parser manager to initialize
      await this.parserManager.initializeParsers();
      this.chunkExtractor = new treeSitterModules.ChunkExtractor();
      this.metadataExtractor = new treeSitterModules.MetadataExtractor();
      this.fileSystemWalker = new treeSitterModules.FileSystemWalker();
      this.statisticsCalculator = new treeSitterModules.StatisticsCalculator();
      this.useNativeTreeSitter = true;
      console.log('✅ Native Tree-sitter components initialized');
    } catch (error) {
      console.warn('⚠️  Native Tree-sitter not available, using mock service:', error.message);
      this.useNativeTreeSitter = false;
    }
    
    this.initialized = true;
    console.log(`Tree-sitter service initialized (${this.useNativeTreeSitter ? 'native' : 'mock'} mode)`);
  }

  /**
   * Get the appropriate parser for a file based on its extension
   */
  getParserForFile(filePath) {
    if (this.useNativeTreeSitter) {
      return this.parserManager.getParserForFile(filePath);
    }
    return this.mockService.getParserForFile(filePath);
  }

  /**
   * Check if a file is supported by Tree-sitter
   */
  isFileSupported(filePath) {
    if (this.useNativeTreeSitter) {
      return this.parserManager.isFileSupported(filePath);
    }
    return this.mockService.isFileSupported(filePath);
  }

  /**
   * Parse a single file into code chunks
   */
  async parseFile(filePath, content) {
    if (this.useNativeTreeSitter) {
      return await this.parseFileNative(filePath, content);
    }
    return await this.mockService.parseFile(filePath, content);
  }

  /**
   * Parse file using native Tree-sitter (when available)
   */
  async parseFileNative(filePath, content) {
    try {
      const parser = this.getParserForFile(filePath);
      if (!parser) {
        throw new Error(`No parser available for file: ${filePath}`);
      }

      const tree = parser.parse(content);
      const chunks = this.chunkExtractor.extractChunks(tree, content, filePath);
      const enrichedChunks = chunks.map(chunk => 
        this.metadataExtractor.enrichChunk(chunk, content, filePath)
      );

      return {
        success: true,
        chunks: enrichedChunks,
        filePath,
        language: this.getLanguageFromPath(filePath),
        statistics: this.statisticsCalculator.calculateStatistics(enrichedChunks)
      };
    } catch (error) {
      console.error(`Failed to parse file ${filePath}:`, error);
      return {
        success: false,
        error: error.message,
        chunks: [],
        filePath
      };
    }
  }

  /**
   * Get supported file extensions
   */
  getSupportedExtensions() {
    return this.parserManager.getSupportedExtensions();
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages() {
    return this.parserManager.getSupportedLanguages();
  }

  /**
   * Parse a single file and extract semantic chunks
   */
  async parseFile(filePath, content) {
    try {
      // Use parser manager to parse the file
      const parseResult = this.parserManager.parseFile(filePath, content);
      
      // Extract chunks using chunk extractor
      const chunks = this.chunkExtractor.extractChunks(
        parseResult.tree.rootNode, 
        content, 
        filePath
      );
      
      return {
        success: true,
        chunks,
        metadata: {
          filePath,
          language: parseResult.language,
          totalChunks: chunks.length,
          parsedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error(`Error parsing file ${filePath}:`, error);
      return {
        success: false,
        error: error.message,
        chunks: []
      };
    }
  }

  /**
   * Walk through a directory and parse all supported files
   */
  async walkDirectory(dirPath, options = {}) {
    try {
      // Use file system walker to get file list
      const walkResult = await this.fileSystemWalker.walkDirectory(dirPath, options);
      
      // Process each file with Tree-sitter
      const processedFiles = [];
      
      for (const file of walkResult.files) {
        if (file.success && this.isFileSupported(file.filePath)) {
          try {
            // Read file content
            const fullPath = path.join(dirPath, file.filePath);
            const content = await fs.readFile(fullPath, 'utf8');
            
            // Parse file
            const parseResult = await this.parseFile(file.filePath, content);
            
            processedFiles.push({
              ...file,
              ...parseResult
            });
          } catch (error) {
            processedFiles.push({
              ...file,
              success: false,
              error: error.message,
              chunks: []
            });
          }
        } else {
          processedFiles.push(file);
        }
      }
      
      // Calculate statistics
      const statistics = this.statisticsCalculator.calculateStatistics(processedFiles);
      
      return {
        success: true,
        files: processedFiles,
        errors: walkResult.errors,
        summary: {
          ...walkResult.summary,
          totalChunks: statistics.totalChunks
        },
        statistics
      };
      
    } catch (error) {
      console.error('Error walking directory:', error);
      return {
        success: false,
        files: [],
        errors: [error.message],
        summary: {
          totalFiles: 0,
          processedFiles: 0,
          skippedFiles: 0,
          totalChunks: 0,
          processingTime: 0
        }
      };
    }
  }

  /**
   * Get statistics about parsed chunks
   */
  getChunkStatistics(files) {
    return this.statisticsCalculator.calculateStatistics(files);
  }

  /**
   * Generate a summary report
   */
  generateSummaryReport(files) {
    const statistics = this.getChunkStatistics(files);
    return this.statisticsCalculator.generateSummaryReport(statistics);
  }

  /**
   * Get directory statistics
   */
  async getDirectoryStats(dirPath, options = {}) {
    return await this.fileSystemWalker.getDirectoryStats(dirPath, options);
  }

  /**
   * Find files by pattern
   */
  async findFiles(dirPath, pattern, options = {}) {
    return await this.fileSystemWalker.findFiles(dirPath, pattern, options);
  }

  /**
   * Get parser manager instance for advanced usage
   */
  getParserManager() {
    return this.parserManager;
  }

  /**
   * Get chunk extractor instance for advanced usage
   */
  getChunkExtractor() {
    return this.chunkExtractor;
  }

  /**
   * Get metadata extractor instance for advanced usage
   */
  getMetadataExtractor() {
    return this.metadataExtractor;
  }

  /**
   * Get file system walker instance for advanced usage
   */
  getFileSystemWalker() {
    return this.fileSystemWalker;
  }

  /**
   * Get statistics calculator instance for advanced usage
   */
  getStatisticsCalculator() {
    return this.statisticsCalculator;
  }

  /**
   * Generate embeddings for code chunks
   * @param {Array} chunks - Array of code chunks
   * @param {String} sessionId - Session identifier
   * @param {String} userId - User identifier
   * @param {Object} options - Embedding generation options
   * @returns {Promise<Object>} Embedding generation results
   */
  async generateEmbeddings(chunks, sessionId, userId, options = {}) {
    if (!this.embeddingService) {
      return {
        success: false,
        error: 'Embedding service not available',
        message: 'Please configure GEMINI_API_KEY in environment variables'
      };
    }

    try {
      const {
        batchSize = 10,
        delayBetweenBatches = 1000,
        includeMetadata = true,
        includeContext = true,
        saveToDatabase = true
      } = options;

      console.log(`Generating embeddings for ${chunks.length} chunks in session ${sessionId}`);

      // Generate embeddings using the embedding service
      const embeddingResults = await this.embeddingService.generateBatchEmbeddings(chunks, {
        batchSize,
        delayBetweenBatches,
        includeMetadata,
        includeContext
      });

      // Save embeddings to database if requested
      let savedEmbeddings = [];
      if (saveToDatabase) {
        savedEmbeddings = await this.saveEmbeddingsToDatabase(embeddingResults, sessionId, userId);
      }

      const successCount = embeddingResults.filter(r => r.success).length;
      const failureCount = embeddingResults.length - successCount;

      return {
        success: true,
        sessionId,
        userId,
        totalChunks: chunks.length,
        successfulEmbeddings: successCount,
        failedEmbeddings: failureCount,
        savedToDatabase: savedEmbeddings.length,
        embeddingResults,
        savedEmbeddings,
        summary: {
          successRate: successCount / chunks.length,
          averageDimensions: this.calculateAverageDimensions(embeddingResults),
          processingTime: Date.now()
        }
      };

    } catch (error) {
      console.error('Error generating embeddings:', error);
      return {
        success: false,
        sessionId,
        userId,
        error: error.message,
        message: 'Failed to generate embeddings'
      };
    }
  }

  /**
   * Save embeddings to database
   * @param {Array} embeddingResults - Results from embedding generation
   * @param {String} sessionId - Session identifier
   * @param {String} userId - User identifier
   * @returns {Promise<Array>} Saved embeddings
   */
  async saveEmbeddingsToDatabase(embeddingResults, sessionId, userId) {
    const savedEmbeddings = [];

    for (const result of embeddingResults) {
      if (!result.success || !result.embedding) {
        continue;
      }

      try {
        // Find the original chunk to get full metadata
        const chunk = result.metadata;
        
        const embeddingDoc = new Embedding({
          sessionId,
          userId,
          chunkId: result.chunkId,
          chunkType: chunk.chunkType,
          chunkName: chunk.chunkName,
          filePath: chunk.filePath,
          language: chunk.language,
          code: chunk.code || '',
          startLine: chunk.startLine || 1,
          endLine: chunk.endLine || 1,
          startColumn: chunk.startColumn || 0,
          endColumn: chunk.endColumn || 0,
          embedding: result.embedding,
          embeddingDimensions: result.dimensions,
          embeddingModel: chunk.model,
          complexity: chunk.complexity,
          isAsync: chunk.isAsync,
          parameters: chunk.parameters || [],
          dependencies: chunk.dependencies || [],
          visibility: chunk.visibility || 'public'
        });

        const savedEmbedding = await embeddingDoc.save();
        savedEmbeddings.push(savedEmbedding);

      } catch (error) {
        console.error(`Error saving embedding for chunk ${result.chunkId}:`, error);
      }
    }

    console.log(`Saved ${savedEmbeddings.length} embeddings to database`);
    return savedEmbeddings;
  }

  /**
   * Parse file and generate embeddings
   * @param {String} filePath - Path to the file
   * @param {String} content - File content
   * @param {String} sessionId - Session identifier
   * @param {String} userId - User identifier
   * @param {Object} options - Options for parsing and embedding
   * @returns {Promise<Object>} Parse and embedding results
   */
  async parseFileWithEmbeddings(filePath, content, sessionId, userId, options = {}) {
    try {
      // Parse the file first
      const parseResult = await this.parseFile(filePath, content);
      
      if (!parseResult.success || parseResult.chunks.length === 0) {
        return parseResult;
      }

      // Generate embeddings for the chunks
      const embeddingResult = await this.generateEmbeddings(
        parseResult.chunks, 
        sessionId, 
        userId, 
        options.embeddingOptions || {}
      );

      return {
        ...parseResult,
        embeddings: embeddingResult,
        hasEmbeddings: embeddingResult.success
      };

    } catch (error) {
      console.error(`Error parsing file with embeddings ${filePath}:`, error);
      return {
        success: false,
        error: error.message,
        chunks: [],
        embeddings: null,
        hasEmbeddings: false
      };
    }
  }

  /**
   * Walk directory and generate embeddings for all files
   * @param {String} dirPath - Directory path
   * @param {String} sessionId - Session identifier
   * @param {String} userId - User identifier
   * @param {Object} options - Options for directory walking and embedding
   * @returns {Promise<Object>} Directory analysis with embeddings
   */
  async walkDirectoryWithEmbeddings(dirPath, sessionId, userId, options = {}) {
    try {
      // Walk the directory first
      const walkResult = await this.walkDirectory(dirPath, options);
      
      if (!walkResult.success) {
        return walkResult;
      }

      // Collect all chunks from all files
      const allChunks = [];
      for (const file of walkResult.files) {
        if (file.success && file.chunks) {
          allChunks.push(...file.chunks);
        }
      }

      if (allChunks.length === 0) {
        return {
          ...walkResult,
          embeddings: {
            success: true,
            message: 'No chunks found to generate embeddings for',
            totalChunks: 0,
            successfulEmbeddings: 0,
            failedEmbeddings: 0
          },
          hasEmbeddings: false
        };
      }

      // Generate embeddings for all chunks
      const embeddingResult = await this.generateEmbeddings(
        allChunks,
        sessionId,
        userId,
        options.embeddingOptions || {}
      );

      return {
        ...walkResult,
        embeddings: embeddingResult,
        hasEmbeddings: embeddingResult.success,
        totalChunksWithEmbeddings: embeddingResult.successfulEmbeddings
      };

    } catch (error) {
      console.error('Error walking directory with embeddings:', error);
      return {
        success: false,
        error: error.message,
        files: [],
        embeddings: null,
        hasEmbeddings: false
      };
    }
  }

  /**
   * Find similar chunks using embeddings
   * @param {String} sessionId - Session identifier
   * @param {String} chunkId - Reference chunk ID
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Similar chunks
   */
  async findSimilarChunks(sessionId, chunkId, options = {}) {
    try {
      const {
        threshold = 0.7,
        limit = 10,
        chunkType = null,
        language = null
      } = options;

      // Get the reference chunk's embedding
      const referenceChunk = await Embedding.findOne({ 
        sessionId, 
        chunkId 
      }).lean();

      if (!referenceChunk) {
        return {
          success: false,
          error: 'Reference chunk not found',
          similarChunks: []
        };
      }

      // Find similar chunks
      const similarChunks = await Embedding.findSimilarChunks(
        sessionId,
        referenceChunk.embedding,
        {
          threshold,
          limit,
          excludeChunkId: chunkId,
          chunkType,
          language
        }
      );

      return {
        success: true,
        referenceChunk: {
          chunkId: referenceChunk.chunkId,
          chunkName: referenceChunk.chunkName,
          chunkType: referenceChunk.chunkType,
          filePath: referenceChunk.filePath
        },
        similarChunks,
        totalFound: similarChunks.length
      };

    } catch (error) {
      console.error('Error finding similar chunks:', error);
      return {
        success: false,
        error: error.message,
        similarChunks: []
      };
    }
  }

  /**
   * Get embedding statistics for a session
   * @param {String} sessionId - Session identifier
   * @returns {Promise<Object>} Embedding statistics
   */
  async getEmbeddingStatistics(sessionId) {
    try {
      const statistics = await Embedding.getSessionStatistics(sessionId);
      
      return {
        success: true,
        sessionId,
        statistics
      };

    } catch (error) {
      console.error('Error getting embedding statistics:', error);
      return {
        success: false,
        error: error.message,
        statistics: null
      };
    }
  }

  /**
   * Calculate average dimensions from embedding results
   * @param {Array} embeddingResults - Embedding generation results
   * @returns {Number} Average dimensions
   */
  calculateAverageDimensions(embeddingResults) {
    const successfulResults = embeddingResults.filter(r => r.success && r.dimensions);
    if (successfulResults.length === 0) return 0;
    
    const totalDimensions = successfulResults.reduce((sum, r) => sum + r.dimensions, 0);
    return Math.round(totalDimensions / successfulResults.length);
  }

  /**
   * Check if embedding service is available
   * @returns {Boolean} True if embedding service is available
   */
  isEmbeddingServiceAvailable() {
    return this.embeddingService !== null;
  }

  /**
   * Get embedding service instance
   * @returns {EmbeddingService|null} Embedding service instance
   */
  getEmbeddingService() {
    return this.embeddingService;
  }

  /**
   * Get analysis for a session (placeholder method)
   * @param {String} sessionId - Session identifier
   * @returns {Promise<Object>} Analysis result
   */
  async getAnalysisForSession(sessionId) {
    // This is a placeholder method that should be implemented
    // based on your existing Tree-sitter analysis storage
    return {
      success: true,
      sessionId,
      files: [],
      message: 'Analysis retrieval not implemented - please implement based on your storage system'
    };
  }

  /**
   * Get language from file path
   */
  getLanguageFromPath(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.php': 'php',
      '.rb': 'ruby',
      '.go': 'go',
      '.rs': 'rust',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala'
    };
    return languageMap[ext] || 'unknown';
  }

  /**
   * Check if embedding service is available
   */
  isEmbeddingServiceAvailable() {
    return !!this.embeddingService;
  }

  /**
   * Get singleton instance
   */
  static getInstance() {
    if (!TreeSitterService.instance) {
      TreeSitterService.instance = new TreeSitterService();
    }
    return TreeSitterService.instance;
  }
}

// Export singleton instance
export default TreeSitterService.getInstance();