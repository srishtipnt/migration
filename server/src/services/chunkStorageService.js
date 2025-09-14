import CodeChunk from '../models/CodeChunk.js';
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';

/**
 * Service for storing code chunks and their embeddings in MongoDB
 * Provides comprehensive storage and retrieval functionality
 */
class ChunkStorageService {
  constructor() {
    // Prevent multiple initialization
    if (ChunkStorageService.instance) {
      return ChunkStorageService.instance;
    }

    console.log('Chunk storage service initialized');
    
    // Set singleton instance
    ChunkStorageService.instance = this;
  }

  /**
   * Store a single code chunk with its embedding
   * @param {Object} chunk - Code chunk object
   * @param {Array} embedding - Embedding vector
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} Stored chunk document
   */
  async storeChunk(chunk, embedding, metadata = {}) {
    try {
      const {
        sessionId,
        userId,
        projectId,
        projectName,
        fileStats
      } = metadata;

      // Generate unique chunk ID
      const chunkId = this.generateChunkId(chunk, sessionId);

      // Prepare chunk document
      const chunkDoc = {
        sessionId,
        userId,
        projectId: projectId || sessionId,
        projectName: projectName || 'Unknown Project',
        chunkId,
        filePath: chunk.metadata?.filePath || 'unknown',
        fileName: path.basename(chunk.metadata?.filePath || 'unknown'),
        fileExtension: path.extname(chunk.metadata?.filePath || 'unknown'),
        code: chunk.code,
        chunkType: chunk.type,
        chunkName: chunk.name,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        startColumn: chunk.startColumn,
        endColumn: chunk.endColumn,
        startIndex: chunk.startIndex,
        endIndex: chunk.endIndex,
        language: chunk.metadata?.language || 'javascript',
        complexity: chunk.metadata?.complexity || 1,
        isAsync: chunk.metadata?.isAsync || false,
        isStatic: chunk.metadata?.isStatic || false,
        visibility: chunk.metadata?.visibility || 'public',
        parameters: Array.isArray(chunk.metadata?.parameters) ? chunk.metadata.parameters : [],
        dependencies: chunk.metadata?.dependencies || [],
        comments: chunk.metadata?.comments || [],
        embedding,
        embeddingDimensions: embedding.length,
        embeddingModel: chunk.metadata?.model || 'text-embedding-004',
        embeddingGeneratedAt: new Date(),
        tags: this.extractTags(chunk),
        fileSize: fileStats?.size || 0,
        lastModified: fileStats?.mtime || new Date()
      };

      // Check if chunk already exists
      const existingChunk = await CodeChunk.findOne({ chunkId });
      if (existingChunk) {
        // Update existing chunk
        Object.assign(existingChunk, chunkDoc);
        existingChunk.updatedAt = new Date();
        const savedChunk = await existingChunk.save();
        console.log(`Updated existing chunk: ${chunkId}`);
        return savedChunk;
      } else {
        // Create new chunk
        const newChunk = new CodeChunk(chunkDoc);
        const savedChunk = await newChunk.save();
        console.log(`Stored new chunk: ${chunkId}`);
        return savedChunk;
      }

    } catch (error) {
      console.error(`Error storing chunk ${chunk.id}:`, error);
      throw error;
    }
  }

  /**
   * Store multiple code chunks with their embeddings
   * @param {Array} chunks - Array of code chunks
   * @param {Array} embeddings - Array of embedding results
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Array>} Array of stored chunk documents
   */
  async storeChunks(chunks, embeddings, metadata = {}) {
    try {
      console.log(`Storing ${chunks.length} chunks in MongoDB...`);

      const storedChunks = [];
      const errors = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embeddingResult = embeddings[i];

        if (!embeddingResult.success || !embeddingResult.embedding) {
          errors.push({
            chunkId: chunk.id,
            error: embeddingResult.error || 'No embedding generated'
          });
          continue;
        }

        try {
          const storedChunk = await this.storeChunk(chunk, embeddingResult.embedding, metadata);
          storedChunks.push(storedChunk);
        } catch (error) {
          errors.push({
            chunkId: chunk.id,
            error: error.message
          });
        }
      }

      console.log(`Successfully stored ${storedChunks.length} chunks`);
      if (errors.length > 0) {
        console.log(`Failed to store ${errors.length} chunks:`, errors);
      }

      return {
        success: true,
        storedChunks,
        errors,
        summary: {
          totalChunks: chunks.length,
          successfulStores: storedChunks.length,
          failedStores: errors.length,
          successRate: storedChunks.length / chunks.length
        }
      };

    } catch (error) {
      console.error('Error storing chunks:', error);
      return {
        success: false,
        error: error.message,
        storedChunks: [],
        errors: []
      };
    }
  }

  /**
   * Store chunks from Tree-sitter analysis results
   * @param {Object} analysisResult - Tree-sitter analysis result
   * @param {Object} embeddingResult - Embedding generation result
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} Storage result
   */
  async storeAnalysisResults(analysisResult, embeddingResult, metadata = {}) {
    try {
      if (!analysisResult.success || !embeddingResult.success) {
        return {
          success: false,
          error: 'Analysis or embedding generation failed',
          storedChunks: []
        };
      }

      // Collect all chunks from all files
      const allChunks = [];
      const allEmbeddings = [];

      for (const file of analysisResult.files) {
        if (file.success && file.chunks) {
          allChunks.push(...file.chunks);
        }
      }

      // Match chunks with their embeddings
      for (const chunk of allChunks) {
        const embedding = embeddingResult.embeddingResults.find(
          result => result.chunkId === chunk.id && result.success
        );
        
        if (embedding) {
          allEmbeddings.push(embedding);
        } else {
          // Create a failed embedding result
          allEmbeddings.push({
            success: false,
            chunkId: chunk.id,
            error: 'No embedding found for chunk'
          });
        }
      }

      // Store all chunks
      const storageResult = await this.storeChunks(allChunks, allEmbeddings, metadata);

      return {
        success: true,
        sessionId: metadata.sessionId,
        projectId: metadata.projectId,
        ...storageResult,
        analysisSummary: {
          totalFiles: analysisResult.files.length,
          successfulFiles: analysisResult.files.filter(f => f.success).length,
          totalChunks: allChunks.length
        }
      };

    } catch (error) {
      console.error('Error storing analysis results:', error);
      return {
        success: false,
        error: error.message,
        storedChunks: []
      };
    }
  }

  /**
   * Retrieve chunks by session ID
   * @param {String} sessionId - Session identifier
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of chunk documents
   */
  async getChunksBySession(sessionId, options = {}) {
    try {
      const {
        chunkType = null,
        language = null,
        limit = 100,
        offset = 0,
        sortBy = 'createdAt',
        sortOrder = -1
      } = options;

      const query = { sessionId };
      if (chunkType) query.chunkType = chunkType;
      if (language) query.language = language;

      const chunks = await CodeChunk.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(offset)
        .limit(limit)
        .lean();

      return {
        success: true,
        chunks,
        totalCount: await CodeChunk.countDocuments(query)
      };

    } catch (error) {
      console.error('Error retrieving chunks:', error);
      return {
        success: false,
        error: error.message,
        chunks: []
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

      // Get the reference chunk
      const referenceChunk = await CodeChunk.findOne({ 
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
      const similarChunks = await CodeChunk.findSimilarChunks(
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
   * Get project statistics
   * @param {String} sessionId - Session identifier
   * @returns {Promise<Object>} Project statistics
   */
  async getProjectStatistics(sessionId) {
    try {
      const statistics = await CodeChunk.getProjectStatistics(sessionId);
      
      return {
        success: true,
        sessionId,
        statistics
      };

    } catch (error) {
      console.error('Error getting project statistics:', error);
      return {
        success: false,
        error: error.message,
        statistics: null
      };
    }
  }

  /**
   * Search chunks by text query
   * @param {String} sessionId - Session identifier
   * @param {Object} searchCriteria - Search criteria
   * @returns {Promise<Array>} Search results
   */
  async searchChunks(sessionId, searchCriteria) {
    try {
      const results = await CodeChunk.searchChunks(sessionId, searchCriteria);

      return {
        success: true,
        sessionId,
        searchCriteria,
        results,
        totalResults: results.length
      };

    } catch (error) {
      console.error('Error searching chunks:', error);
      return {
        success: false,
        error: error.message,
        results: []
      };
    }
  }

  /**
   * Delete chunks by session ID
   * @param {String} sessionId - Session identifier
   * @returns {Promise<Object>} Deletion result
   */
  async deleteChunksBySession(sessionId) {
    try {
      const result = await CodeChunk.deleteMany({ sessionId });
      
      return {
        success: true,
        sessionId,
        deletedCount: result.deletedCount
      };

    } catch (error) {
      console.error('Error deleting chunks:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate unique chunk ID
   * @param {Object} chunk - Code chunk
   * @param {String} sessionId - Session identifier
   * @returns {String} Unique chunk ID
   */
  generateChunkId(chunk, sessionId) {
    const content = `${sessionId}-${chunk.metadata?.filePath}-${chunk.startLine}-${chunk.endLine}-${chunk.name}`;
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Extract tags from chunk
   * @param {Object} chunk - Code chunk
   * @returns {Array} Array of tags
   */
  extractTags(chunk) {
    const tags = [];
    
    // Add chunk type as tag
    tags.push(chunk.type);
    
    // Add language as tag
    if (chunk.metadata?.language) {
      tags.push(chunk.metadata.language);
    }
    
    // Add complexity level as tag
    if (chunk.metadata?.complexity) {
      tags.push(`complexity-${chunk.metadata.complexity}`);
    }
    
    // Add async tag
    if (chunk.metadata?.isAsync) {
      tags.push('async');
    }
    
    // Add static tag
    if (chunk.metadata?.isStatic) {
      tags.push('static');
    }
    
    // Add visibility tag
    if (chunk.metadata?.visibility) {
      tags.push(chunk.metadata.visibility);
    }
    
    return tags;
  }

  /**
   * Get chunk by ID
   * @param {String} chunkId - Chunk identifier
   * @returns {Promise<Object>} Chunk document
   */
  async getChunkById(chunkId) {
    try {
      const chunk = await CodeChunk.findOne({ chunkId }).lean();
      
      if (!chunk) {
        return {
          success: false,
          error: 'Chunk not found'
        };
      }

      return {
        success: true,
        chunk
      };

    } catch (error) {
      console.error('Error getting chunk by ID:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update chunk metadata
   * @param {String} chunkId - Chunk identifier
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Update result
   */
  async updateChunk(chunkId, updates) {
    try {
      const updatedChunk = await CodeChunk.findOneAndUpdate(
        { chunkId },
        { ...updates, updatedAt: new Date() },
        { new: true }
      );

      if (!updatedChunk) {
        return {
          success: false,
          error: 'Chunk not found'
        };
      }

      return {
        success: true,
        chunk: updatedChunk
      };

    } catch (error) {
      console.error('Error updating chunk:', error);
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
    if (!ChunkStorageService.instance) {
      ChunkStorageService.instance = new ChunkStorageService();
    }
    return ChunkStorageService.instance;
  }
}

// Export singleton instance
export default ChunkStorageService.getInstance();
