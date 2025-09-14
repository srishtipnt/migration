import TreeSitterService from '../services/treeSitterService.js';
import Embedding from '../models/Embedding.js';
import fs from 'fs-extra';
import path from 'path';

/**
 * Controller for embedding operations
 */
class EmbeddingController {
  constructor() {
    this.treeSitterService = TreeSitterService; // Use singleton instance
  }

  /**
   * Generate embeddings for a session's chunks
   */
  async generateEmbeddings(req, res) {
    try {
      const { sessionId } = req.params;
      const { 
        batchSize = 10,
        delayBetweenBatches = 1000,
        includeMetadata = true,
        includeContext = true,
        saveToDatabase = true
      } = req.body;
      const userId = req.user.id;

      if (!this.treeSitterService.isEmbeddingServiceAvailable()) {
        return res.status(400).json({
          success: false,
          error: 'Embedding service not available',
          message: 'Please configure GEMINI_API_KEY in environment variables'
        });
      }

      // Get existing Tree-sitter analysis for the session
      const analysis = await this.treeSitterService.getAnalysisForSession(sessionId);
      if (!analysis || !analysis.success) {
        return res.status(404).json({
          success: false,
          error: 'Analysis not found',
          message: 'Please run Tree-sitter analysis first'
        });
      }

      // Collect all chunks from the analysis
      const allChunks = [];
      if (analysis.files) {
        for (const file of analysis.files) {
          if (file.success && file.chunks) {
            allChunks.push(...file.chunks);
          }
        }
      }

      if (allChunks.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No chunks found',
          message: 'No code chunks available for embedding generation'
        });
      }

      // Generate embeddings
      const embeddingResult = await this.treeSitterService.generateEmbeddings(
        allChunks,
        sessionId,
        userId,
        {
          batchSize,
          delayBetweenBatches,
          includeMetadata,
          includeContext,
          saveToDatabase
        }
      );

      res.json({
        success: true,
        sessionId,
        userId,
        embeddingResult
      });

    } catch (error) {
      console.error('Error generating embeddings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate embeddings',
        details: error.message
      });
    }
  }

  /**
   * Parse a single file and generate embeddings
   */
  async parseFileWithEmbeddings(req, res) {
    try {
      const { sessionId, filePath } = req.params;
      const { content } = req.body;
      const userId = req.user.id;

      if (!content) {
        return res.status(400).json({
          success: false,
          error: 'File content is required'
        });
      }

      if (!this.treeSitterService.isEmbeddingServiceAvailable()) {
        return res.status(400).json({
          success: false,
          error: 'Embedding service not available',
          message: 'Please configure GEMINI_API_KEY in environment variables'
        });
      }

      const result = await this.treeSitterService.parseFileWithEmbeddings(
        filePath,
        content,
        sessionId,
        userId,
        req.body.options || {}
      );

      res.json({
        success: true,
        sessionId,
        filePath,
        userId,
        result
      });

    } catch (error) {
      console.error('Error parsing file with embeddings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to parse file with embeddings',
        details: error.message
      });
    }
  }

  /**
   * Find similar chunks using embeddings
   */
  async findSimilarChunks(req, res) {
    try {
      const { sessionId, chunkId } = req.params;
      const { 
        threshold = 0.7,
        limit = 10,
        chunkType = null,
        language = null
      } = req.query;

      const result = await this.treeSitterService.findSimilarChunks(
        sessionId,
        chunkId,
        {
          threshold: parseFloat(threshold),
          limit: parseInt(limit),
          chunkType,
          language
        }
      );

      res.json({
        success: true,
        sessionId,
        chunkId,
        result
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
   * Get embedding statistics for a session
   */
  async getEmbeddingStatistics(req, res) {
    try {
      const { sessionId } = req.params;

      const result = await this.treeSitterService.getEmbeddingStatistics(sessionId);

      res.json({
        success: true,
        sessionId,
        result
      });

    } catch (error) {
      console.error('Error getting embedding statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get embedding statistics',
        details: error.message
      });
    }
  }

  /**
   * Search embeddings by text query
   */
  async searchEmbeddings(req, res) {
    try {
      const { sessionId } = req.params;
      const { 
        query,
        chunkType,
        language,
        minComplexity,
        maxComplexity,
        isAsync,
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
        limit: parseInt(limit),
        offset: parseInt(offset)
      };

      const results = await Embedding.searchChunks(sessionId, searchCriteria);

      res.json({
        success: true,
        sessionId,
        searchCriteria,
        results,
        totalResults: results.length,
        hasMore: results.length === parseInt(limit)
      });

    } catch (error) {
      console.error('Error searching embeddings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search embeddings',
        details: error.message
      });
    }
  }

  /**
   * Get embedding service status
   */
  async getServiceStatus(req, res) {
    try {
      const isAvailable = this.treeSitterService.isEmbeddingServiceAvailable();
      const embeddingService = this.treeSitterService.getEmbeddingService();
      
      let config = null;
      let testResult = null;

      if (isAvailable && embeddingService) {
        config = embeddingService.getConfig();
        
        // Test the service
        testResult = await embeddingService.testService();
      }

      res.json({
        success: true,
        isAvailable,
        config,
        testResult,
        message: isAvailable ? 'Embedding service is available' : 'Embedding service is not available'
      });

    } catch (error) {
      console.error('Error getting service status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get service status',
        details: error.message
      });
    }
  }

  /**
   * Delete embeddings for a session
   */
  async deleteEmbeddings(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;

      const result = await Embedding.deleteMany({ 
        sessionId, 
        userId 
      });

      res.json({
        success: true,
        sessionId,
        userId,
        deletedCount: result.deletedCount,
        message: `Deleted ${result.deletedCount} embeddings`
      });

    } catch (error) {
      console.error('Error deleting embeddings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete embeddings',
        details: error.message
      });
    }
  }

  /**
   * Get embedding details for a specific chunk
   */
  async getChunkEmbedding(req, res) {
    try {
      const { sessionId, chunkId } = req.params;

      const embedding = await Embedding.findOne({ 
        sessionId, 
        chunkId 
      }).lean();

      if (!embedding) {
        return res.status(404).json({
          success: false,
          error: 'Embedding not found'
        });
      }

      // Remove the actual embedding vector from response for performance
      const response = {
        ...embedding,
        embedding: embedding.embedding ? `[${embedding.embedding.length} dimensions]` : null
      };

      res.json({
        success: true,
        sessionId,
        chunkId,
        embedding: response
      });

    } catch (error) {
      console.error('Error getting chunk embedding:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get chunk embedding',
        details: error.message
      });
    }
  }

  /**
   * Export embeddings for a session
   */
  async exportEmbeddings(req, res) {
    try {
      const { sessionId } = req.params;
      const { format = 'json' } = req.query;

      const embeddings = await Embedding.find({ sessionId }).lean();

      if (embeddings.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No embeddings found',
          message: 'No embeddings available for this session'
        });
      }

      if (format === 'json') {
        res.json({
          success: true,
          sessionId,
          format,
          count: embeddings.length,
          embeddings
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Unsupported format',
          message: 'Only JSON format is currently supported'
        });
      }

    } catch (error) {
      console.error('Error exporting embeddings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export embeddings',
        details: error.message
      });
    }
  }
}

export default EmbeddingController;
