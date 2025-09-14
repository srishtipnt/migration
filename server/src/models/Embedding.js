import mongoose from 'mongoose';

/**
 * Schema for storing code chunk embeddings
 */
const embeddingSchema = new mongoose.Schema({
  // Reference to the session
  sessionId: {
    type: String,
    required: true,
    index: true
  },

  // Reference to the user
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Chunk information
  chunkId: {
    type: String,
    required: true,
    index: true
  },

  chunkType: {
    type: String,
    required: true,
    enum: ['function', 'class', 'method', 'variable', 'import', 'export', 'arrow-function', 'block']
  },

  chunkName: {
    type: String,
    required: true
  },

  // File information
  filePath: {
    type: String,
    required: true
  },

  language: {
    type: String,
    required: true,
    enum: ['javascript', 'typescript']
  },

  // Code content
  code: {
    type: String,
    required: true
  },

  // Position information
  startLine: {
    type: Number,
    required: true
  },

  endLine: {
    type: Number,
    required: true
  },

  startColumn: {
    type: Number,
    required: true
  },

  endColumn: {
    type: Number,
    required: true
  },

  // Embedding vector
  embedding: {
    type: [Number],
    required: true,
    validate: {
      validator: function(v) {
        return Array.isArray(v) && v.length > 0 && v.every(n => typeof n === 'number');
      },
      message: 'Embedding must be a non-empty array of numbers'
    }
  },

  // Embedding metadata
  embeddingDimensions: {
    type: Number,
    required: true
  },

  embeddingModel: {
    type: String,
    required: true,
    default: 'text-embedding-3-small'
  },

  // Chunk metadata
  complexity: {
    type: Number,
    min: 1,
    max: 10
  },

  isAsync: {
    type: Boolean,
    default: false
  },

  parameters: [{
    name: String,
    type: String,
    line: Number
  }],

  dependencies: [{
    type: String,
    source: String,
    line: Number
  }],

  visibility: {
    type: String,
    enum: ['public', 'private', 'protected'],
    default: 'public'
  },

  // Search and indexing
  searchText: {
    type: String,
    index: 'text'
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
embeddingSchema.index({ sessionId: 1, chunkType: 1 });
embeddingSchema.index({ sessionId: 1, language: 1 });
embeddingSchema.index({ sessionId: 1, complexity: 1 });
embeddingSchema.index({ sessionId: 1, isAsync: 1 });
embeddingSchema.index({ userId: 1, createdAt: -1 });
embeddingSchema.index({ filePath: 1, startLine: 1 });

// Text index for search functionality
embeddingSchema.index({ 
  chunkName: 'text', 
  code: 'text', 
  filePath: 'text' 
});

// Instance methods
embeddingSchema.methods.updateSearchText = function() {
  this.searchText = [
    this.chunkName,
    this.code,
    this.filePath,
    this.chunkType,
    this.language
  ].join(' ');
};

embeddingSchema.methods.getSimilarityScore = function(targetEmbedding) {
  if (!targetEmbedding || !Array.isArray(targetEmbedding)) {
    return 0;
  }

  if (this.embedding.length !== targetEmbedding.length) {
    return 0;
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < this.embedding.length; i++) {
    dotProduct += this.embedding[i] * targetEmbedding[i];
    norm1 += this.embedding[i] * this.embedding[i];
    norm2 += targetEmbedding[i] * targetEmbedding[i];
  }

  const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
};

// Static methods
embeddingSchema.statics.findSimilarChunks = async function(sessionId, targetEmbedding, options = {}) {
  const {
    threshold = 0.7,
    limit = 10,
    excludeChunkId = null,
    chunkType = null,
    language = null
  } = options;

  // Build query
  const query = { sessionId };
  if (excludeChunkId) {
    query.chunkId = { $ne: excludeChunkId };
  }
  if (chunkType) {
    query.chunkType = chunkType;
  }
  if (language) {
    query.language = language;
  }

  // Get all embeddings for the session
  const embeddings = await this.find(query).lean();

  // Calculate similarities
  const similarities = embeddings
    .map(embedding => ({
      ...embedding,
      similarity: embedding.getSimilarityScore(targetEmbedding)
    }))
    .filter(item => item.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return similarities;
};

embeddingSchema.statics.getSessionStatistics = async function(sessionId) {
  const stats = await this.aggregate([
    { $match: { sessionId } },
    {
      $group: {
        _id: null,
        totalChunks: { $sum: 1 },
        averageComplexity: { $avg: '$complexity' },
        asyncChunks: { $sum: { $cond: ['$isAsync', 1, 0] } },
        byType: {
          $push: {
            type: '$chunkType',
            complexity: '$complexity',
            isAsync: '$isAsync'
          }
        },
        byLanguage: {
          $push: {
            language: '$language',
            complexity: '$complexity'
          }
        }
      }
    }
  ]);

  if (stats.length === 0) {
    return {
      totalChunks: 0,
      averageComplexity: 0,
      asyncChunks: 0,
      byType: {},
      byLanguage: {}
    };
  }

  const result = stats[0];
  
  // Process type statistics
  const typeStats = {};
  result.byType.forEach(item => {
    if (!typeStats[item.type]) {
      typeStats[item.type] = { count: 0, totalComplexity: 0, asyncCount: 0 };
    }
    typeStats[item.type].count++;
    typeStats[item.type].totalComplexity += item.complexity || 0;
    if (item.isAsync) {
      typeStats[item.type].asyncCount++;
    }
  });

  // Process language statistics
  const languageStats = {};
  result.byLanguage.forEach(item => {
    if (!languageStats[item.language]) {
      languageStats[item.language] = { count: 0, totalComplexity: 0 };
    }
    languageStats[item.language].count++;
    languageStats[item.language].totalComplexity += item.complexity || 0;
  });

  return {
    totalChunks: result.totalChunks,
    averageComplexity: Math.round(result.averageComplexity * 100) / 100,
    asyncChunks: result.asyncChunks,
    byType: typeStats,
    byLanguage: languageStats
  };
};

embeddingSchema.statics.searchChunks = async function(sessionId, searchCriteria) {
  const {
    query,
    chunkType,
    language,
    minComplexity,
    maxComplexity,
    isAsync,
    limit = 50,
    offset = 0
  } = searchCriteria;

  // Build MongoDB query
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

  // Text search if query provided
  if (query && query.trim()) {
    mongoQuery.$text = { $search: query.trim() };
  }

  const results = await this.find(mongoQuery)
    .sort(query ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
    .skip(offset)
    .limit(limit)
    .lean();

  return results;
};

// Pre-save middleware to update search text
embeddingSchema.pre('save', function(next) {
  this.updateSearchText();
  next();
});

const Embedding = mongoose.model('Embedding', embeddingSchema);

export default Embedding;
