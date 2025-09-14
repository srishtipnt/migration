import EmbeddingAtlas from '../models/EmbeddingAtlas.js';

class AtlasVectorSearchService {
  constructor() {
    this.isAtlasConnected = false;
    this.testAtlasConnection();
  }

  /**
   * Test if we're connected to MongoDB Atlas
   */
  async testAtlasConnection() {
    try {
      // Check if we're using Atlas connection string
      const mongoUri = process.env.MONGODB_URI || '';
      this.isAtlasConnected = mongoUri.includes('mongodb+srv://') || mongoUri.includes('mongodb.net');
      
      if (this.isAtlasConnected) {
        console.log('✅ MongoDB Atlas connection detected');
        console.log('🔍 Atlas Vector Search will be used for similarity search');
      } else {
        console.log('⚠️  Local MongoDB detected - using manual similarity calculation');
      }
    } catch (error) {
      console.error('❌ Error testing Atlas connection:', error);
      this.isAtlasConnected = false;
    }
  }

  /**
   * Find similar chunks using Atlas Vector Search or fallback to manual calculation
   */
  async findSimilarChunks(sessionId, targetEmbedding, options = {}) {
    try {
      if (this.isAtlasConnected) {
        // Use Atlas Vector Search
        return await EmbeddingAtlas.findSimilarChunksAtlas(sessionId, targetEmbedding, options);
      } else {
        // Use manual similarity calculation
        return await EmbeddingAtlas.findSimilarChunksManual(sessionId, targetEmbedding, options);
      }
    } catch (error) {
      console.error('❌ Error finding similar chunks:', error);
      throw error;
    }
  }

  /**
   * Create embedding document for Atlas Vector Search
   */
  async createEmbedding(embeddingData) {
    try {
      const embedding = new EmbeddingAtlas(embeddingData);
      await embedding.save();
      return embedding;
    } catch (error) {
      console.error('❌ Error creating embedding:', error);
      throw error;
    }
  }

  /**
   * Batch create embeddings for better performance
   */
  async createEmbeddingsBatch(embeddingsData) {
    try {
      const embeddings = await EmbeddingAtlas.insertMany(embeddingsData);
      console.log(`✅ Created ${embeddings.length} embeddings`);
      return embeddings;
    } catch (error) {
      console.error('❌ Error creating embeddings batch:', error);
      throw error;
    }
  }

  /**
   * Search embeddings with text and vector search
   */
  async searchEmbeddings(sessionId, searchCriteria) {
    const {
      query,
      chunkType,
      language,
      minComplexity,
      maxComplexity,
      isAsync,
      limit = 50,
      offset = 0,
      vectorQuery = null // Optional vector for semantic search
    } = searchCriteria;

    try {
      let results = [];

      if (vectorQuery && this.isAtlasConnected) {
        // Use Atlas Vector Search for semantic search
        results = await EmbeddingAtlas.findSimilarChunksAtlas(sessionId, vectorQuery, {
          chunkType,
          language,
          limit,
          threshold: 0.5
        });
      } else {
        // Use traditional text search
        const mongoQuery = { sessionId };

        if (chunkType) {
          mongoQuery.chunkType = chunkType;
        }
        if (language) {
          mongoQuery.language = language;
        }
        if (minComplexity !== undefined || maxComplexity !== undefined) {
          mongoQuery.complexity = {};
          if (minComplexity !== undefined) {
            mongoQuery.complexity.$gte = minComplexity;
          }
          if (maxComplexity !== undefined) {
            mongoQuery.complexity.$lte = maxComplexity;
          }
        }
        if (isAsync !== undefined) {
          mongoQuery.isAsync = isAsync;
        }
        if (query && query.trim()) {
          mongoQuery.$text = { $search: query.trim() };
        }

        results = await EmbeddingAtlas.find(mongoQuery)
          .sort(query ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
          .skip(offset)
          .limit(limit)
          .lean();
      }

      return results;
    } catch (error) {
      console.error('❌ Error searching embeddings:', error);
      throw error;
    }
  }

  /**
   * Get embedding statistics
   */
  async getEmbeddingStatistics(sessionId) {
    try {
      const stats = await EmbeddingAtlas.aggregate([
        { $match: { sessionId: new mongoose.Types.ObjectId(sessionId) } },
        {
          $group: {
            _id: null,
            totalChunks: { $sum: 1 },
            avgComplexity: { $avg: '$complexity' },
            languages: { $addToSet: '$language' },
            chunkTypes: { $addToSet: '$chunkType' },
            asyncChunks: {
              $sum: { $cond: [{ $eq: ['$isAsync', true] }, 1, 0] }
            }
          }
        }
      ]);

      return stats[0] || {
        totalChunks: 0,
        avgComplexity: 0,
        languages: [],
        chunkTypes: [],
        asyncChunks: 0
      };
    } catch (error) {
      console.error('❌ Error getting embedding statistics:', error);
      throw error;
    }
  }

  /**
   * Delete embeddings for a session
   */
  async deleteSessionEmbeddings(sessionId) {
    try {
      const result = await EmbeddingAtlas.deleteMany({ sessionId });
      console.log(`✅ Deleted ${result.deletedCount} embeddings for session ${sessionId}`);
      return result;
    } catch (error) {
      console.error('❌ Error deleting session embeddings:', error);
      throw error;
    }
  }

  /**
   * Check if Atlas Vector Search is available
   */
  isAtlasVectorSearchAvailable() {
    return this.isAtlasConnected;
  }

  /**
   * Get service status
   */
  getServiceStatus() {
    return {
      isAtlasConnected: this.isAtlasConnected,
      vectorSearchAvailable: this.isAtlasConnected,
      service: 'AtlasVectorSearchService',
      status: this.isAtlasConnected ? 'ready' : 'fallback-mode'
    };
  }
}

export default AtlasVectorSearchService;
