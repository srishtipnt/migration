import ChunkStorageService from '../services/chunkStorageService.js';
import TreeSitterService from '../services/treeSitterService.js';
import EmbeddingService from '../services/embeddingService.js';
import fs from 'fs-extra';
import path from 'path';

/**
 * Controller for MongoDB chunk storage operations
 */
class ChunkStorageController {
  constructor() {
    this.chunkStorageService = ChunkStorageService; // Use singleton instance
    this.treeSitterService = TreeSitterService; // Use singleton instance
    
    // Initialize embedding service if available
    try {
      this.embeddingService = EmbeddingService; // Use singleton instance
    } catch (error) {
      console.warn('Embedding service not available:', error.message);
      this.embeddingService = null;
    }
  }

  /**
   * Store code chunks with embeddings in MongoDB
   */
  async storeChunksWithEmbeddings(req, res) {
    try {
      const { sessionId } = req.params;
      const { 
        chunks,
        embeddings,
        projectName,
        projectId
      } = req.body;
      const userId = req.user.id;

      if (!chunks || !Array.isArray(chunks)) {
        return res.status(400).json({
          success: false,
          error: 'Chunks array is required'
        });
      }

      if (!embeddings || !Array.isArray(embeddings)) {
        return res.status(400).json({
          success: false,
          error: 'Embeddings array is required'
        });
      }

      if (chunks.length !== embeddings.length) {
        return res.status(400).json({
          success: false,
          error: 'Chunks and embeddings arrays must have the same length'
        });
      }

      const metadata = {
        sessionId,
        userId,
        projectId: projectId || sessionId,
        projectName: projectName || 'Unknown Project'
      };

      const storageResult = await this.chunkStorageService.storeChunks(
        chunks,
        embeddings,
        metadata
      );

      res.json({
        success: true,
        sessionId,
        userId,
        ...storageResult
      });

    } catch (error) {
      console.error('Error storing chunks with embeddings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to store chunks',
        details: error.message
      });
    }
  }

  /**
   * Parse files and store chunks with embeddings
   */
  async parseAndStoreFiles(req, res) {
    try {
      const { sessionId } = req.params;
      const { 
        files,
        projectName,
        projectId,
        generateEmbeddings = true
      } = req.body;
      const userId = req.user.id;

      if (!files || !Array.isArray(files)) {
        return res.status(400).json({
          success: false,
          error: 'Files array is required'
        });
      }

      const metadata = {
        sessionId,
        userId,
        projectId: projectId || sessionId,
        projectName: projectName || 'Unknown Project'
      };

      // Parse files using Tree-sitter
      const parsedFiles = [];
      const allChunks = [];

      for (const file of files) {
        if (file.content && file.path) {
          const parseResult = await this.treeSitterService.parseFile(file.path, file.content);
          
          parsedFiles.push({
            ...file,
            parseResult
          });

          if (parseResult.success && parseResult.chunks) {
            allChunks.push(...parseResult.chunks);
          }
        }
      }

      if (allChunks.length === 0) {
        return res.json({
          success: true,
          sessionId,
          userId,
          message: 'No chunks found to store',
          parsedFiles,
          storedChunks: []
        });
      }

      let storageResult;

      if (generateEmbeddings && this.embeddingService) {
        // Generate embeddings and store
        const embeddingResult = await this.embeddingService.generateBatchEmbeddings(allChunks, {
          batchSize: 10,
          delayBetweenBatches: 1000,
          includeMetadata: true,
          includeContext: true
        });

        storageResult = await this.chunkStorageService.storeChunks(
          allChunks,
          embeddingResult,
          metadata
        );
      } else {
        // Store without embeddings
        const mockEmbeddings = allChunks.map(chunk => ({
          success: false,
          chunkId: chunk.id,
          error: 'Embeddings not generated'
        }));

        storageResult = await this.chunkStorageService.storeChunks(
          allChunks,
          mockEmbeddings,
          metadata
        );
      }

      res.json({
        success: true,
        sessionId,
        userId,
        parsedFiles,
        ...storageResult
      });

    } catch (error) {
      console.error('Error parsing and storing files:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to parse and store files',
        details: error.message
      });
    }
  }

  /**
   * Get chunks by session ID
   */
  async getChunksBySession(req, res) {
    try {
      const { sessionId } = req.params;
      const { 
        chunkType,
        language,
        limit = 100,
        offset = 0,
        sortBy = 'createdAt',
        sortOrder = -1
      } = req.query;

      const result = await this.chunkStorageService.getChunksBySession(sessionId, {
        chunkType,
        language,
        limit: parseInt(limit),
        offset: parseInt(offset),
        sortBy,
        sortOrder: parseInt(sortOrder)
      });

      res.json({
        success: true,
        sessionId,
        ...result
      });

    } catch (error) {
      console.error('Error getting chunks by session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get chunks',
        details: error.message
      });
    }
  }

  /**
   * Find similar chunks
   */
  async findSimilarChunks(req, res) {
    try {
      const { sessionId, chunkId } = req.params;
      const { 
        threshold = 0.7,
        limit = 10,
        chunkType,
        language
      } = req.query;

      const result = await this.chunkStorageService.findSimilarChunks(sessionId, chunkId, {
        threshold: parseFloat(threshold),
        limit: parseInt(limit),
        chunkType,
        language
      });

      res.json({
        success: true,
        sessionId,
        chunkId,
        ...result
      });

    } catch (error) {
      console.error('Error finding similar chunks:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to find similar chunks',
        details: error.message
      });
    }
  }

  /**
   * Get project statistics
   */
  async getProjectStatistics(req, res) {
    try {
      const { sessionId } = req.params;

      const result = await this.chunkStorageService.getProjectStatistics(sessionId);

      res.json({
        success: true,
        sessionId,
        ...result
      });

    } catch (error) {
      console.error('Error getting project statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get project statistics',
        details: error.message
      });
    }
  }

  /**
   * Search chunks
   */
  async searchChunks(req, res) {
    try {
      const { sessionId } = req.params;
      const { 
        query,
        chunkType,
        language,
        minComplexity,
        maxComplexity,
        isAsync,
        filePath,
        limit = 50,
        offset = 0
      } = req.query;

      const searchCriteria = {
        query,
        chunkType,
        language,
        minComplexity: minComplexity ? parseInt(minComplexity) : undefined,
        maxComplexity: maxComplexity ? parseInt(maxComplexity) : undefined,
        isAsync: isAsync ? isAsync === 'true' : undefined,
        filePath,
        limit: parseInt(limit),
        offset: parseInt(offset)
      };

      const result = await this.chunkStorageService.searchChunks(sessionId, searchCriteria);

      res.json({
        success: true,
        sessionId,
        ...result
      });

    } catch (error) {
      console.error('Error searching chunks:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search chunks',
        details: error.message
      });
    }
  }

  /**
   * Get chunk by ID
   */
  async getChunkById(req, res) {
    try {
      const { chunkId } = req.params;

      const result = await this.chunkStorageService.getChunkById(chunkId);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json({
        success: true,
        chunkId,
        ...result
      });

    } catch (error) {
      console.error('Error getting chunk by ID:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get chunk',
        details: error.message
      });
    }
  }

  /**
   * Update chunk metadata
   */
  async updateChunk(req, res) {
    try {
      const { chunkId } = req.params;
      const updates = req.body;

      const result = await this.chunkStorageService.updateChunk(chunkId, updates);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json({
        success: true,
        chunkId,
        ...result
      });

    } catch (error) {
      console.error('Error updating chunk:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update chunk',
        details: error.message
      });
    }
  }

  /**
   * Delete chunks by session
   */
  async deleteChunksBySession(req, res) {
    try {
      const { sessionId } = req.params;

      const result = await this.chunkStorageService.deleteChunksBySession(sessionId);

      res.json({
        success: true,
        sessionId,
        ...result
      });

    } catch (error) {
      console.error('Error deleting chunks:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete chunks',
        details: error.message
      });
    }
  }

  /**
   * Export chunks for a session
   */
  async exportChunks(req, res) {
    try {
      const { sessionId } = req.params;
      const { format = 'json' } = req.query;

      const result = await this.chunkStorageService.getChunksBySession(sessionId, {
        limit: 10000 // Get all chunks
      });

      if (!result.success) {
        return res.status(500).json(result);
      }

      if (format === 'json') {
        res.json({
          success: true,
          sessionId,
          format,
          count: result.chunks.length,
          chunks: result.chunks
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Unsupported format',
          message: 'Only JSON format is currently supported'
        });
      }

    } catch (error) {
      console.error('Error exporting chunks:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export chunks',
        details: error.message
      });
    }
  }

  /**
   * Get storage service status
   */
  async getStorageStatus(req, res) {
    try {
      const isEmbeddingAvailable = this.embeddingService !== null;
      const isTreeSitterAvailable = this.treeSitterService !== null;

      res.json({
        success: true,
        services: {
          chunkStorage: true,
          treeSitter: isTreeSitterAvailable,
          embedding: isEmbeddingAvailable
        },
        message: 'Chunk storage service is available'
      });

    } catch (error) {
      console.error('Error getting storage status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get storage status',
        details: error.message
      });
    }
  }
}

export default ChunkStorageController;

