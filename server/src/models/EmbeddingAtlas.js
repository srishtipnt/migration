import mongoose from 'mongoose';

const embeddingAtlasSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true,
    index: true
  },
  chunkId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CodeChunk',
    required: true,
    index: true
  },
  chunkName: {
    type: String,
    required: true,
    index: true
  },
  code: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true,
    index: true
  },
  chunkType: {
    type: String,
    enum: ['function', 'class', 'variable', 'import', 'export', 'interface', 'type', 'other'],
    required: true,
    index: true
  },
  language: {
    type: String,
    required: true,
    index: true
  },
  complexity: {
    type: Number,
    min: 0,
    max: 10,
    default: 0
  },
  isAsync: {
    type: Boolean,
    default: false
  },
  parameters: [{
    name: { type: String },
    type: { type: String },
    required: { type: Boolean, default: false },
    defaultValue: { type: String }
  }],
  dependencies: [{
    source: { type: String },
    type: { type: String },
    version: { type: String }
  }],
  embedding: {
    type: [Number],
    required: true,
    validate: {
      validator: function(v) {
        return Array.isArray(v) && v.length > 0;
      },
      message: 'Embedding must be a non-empty array'
    }
  },
  embeddingDimensions: {
    type: Number,
    required: true,
    default: 768
  },
  embeddingModel: {
    type: String,
    required: true,
    default: 'text-embedding-004'
  },
  searchText: {
    type: String,
    index: 'text'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  collection: 'embeddings'
});

// Indexes for Atlas Vector Search
embeddingAtlasSchema.index({ sessionId: 1 });
embeddingAtlasSchema.index({ chunkType: 1, language: 1 });
embeddingAtlasSchema.index({ embeddingDimensions: 1 });

// Text Index for Full-Text Search
embeddingAtlasSchema.index({ 
  chunkName: 'text', 
  code: 'text', 
  filePath: 'text' 
});

// Instance methods
embeddingAtlasSchema.methods.updateSearchText = function() {
  this.searchText = [
    this.chunkName,
    this.code,
    this.filePath,
    this.chunkType,
    this.language
  ].join(' ');
};

// Static methods for Atlas Vector Search
embeddingAtlasSchema.statics.findSimilarChunksAtlas = async function(sessionId, targetEmbedding, options = {}) {
  const {
    threshold = 0.7,
    limit = 10,
    excludeChunkId = null,
    chunkType = null,
    language = null
  } = options;

  // Build filter for Atlas Vector Search
  const filter = { sessionId };
  if (excludeChunkId) {
    filter.chunkId = { $ne: excludeChunkId };
  }
  if (chunkType) {
    filter.chunkType = chunkType;
  }
  if (language) {
    filter.language = language;
  }

  try {
    // Use Atlas Vector Search aggregation
    const pipeline = [
      {
        $vectorSearch: {
          index: 'vector_index',
          path: 'embedding',
          queryVector: targetEmbedding,
          numCandidates: limit * 10, // Get more candidates for filtering
          limit: limit,
          filter: filter
        }
      },
      {
        $addFields: {
          score: { $meta: 'vectorSearchScore' }
        }
      },
      {
        $match: {
          score: { $gte: threshold }
        }
      },
      {
        $project: {
          _id: 1,
          sessionId: 1,
          chunkId: 1,
          chunkName: 1,
          code: 1,
          filePath: 1,
          chunkType: 1,
          language: 1,
          complexity: 1,
          isAsync: 1,
          parameters: 1,
          dependencies: 1,
          embeddingDimensions: 1,
          embeddingModel: 1,
          metadata: 1,
          similarity: '$score',
          createdAt: 1,
          updatedAt: 1
        }
      }
    ];

    const results = await this.aggregate(pipeline);
    return results;

  } catch (error) {
    console.error('Atlas Vector Search error:', error);
    
    // Fallback to manual similarity calculation if Atlas search fails
    console.log('Falling back to manual similarity calculation...');
    return await this.findSimilarChunksManual(sessionId, targetEmbedding, options);
  }
};

// Fallback manual similarity calculation
embeddingAtlasSchema.statics.findSimilarChunksManual = async function(sessionId, targetEmbedding, options = {}) {
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
      similarity: this.calculateCosineSimilarity(embedding.embedding, targetEmbedding)
    }))
    .filter(item => item.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return similarities;
};

// Helper method for cosine similarity calculation
embeddingAtlasSchema.statics.calculateCosineSimilarity = function(embedding1, embedding2) {
  if (!embedding1 || !embedding2 || !Array.isArray(embedding1) || !Array.isArray(embedding2)) {
    return 0;
  }

  if (embedding1.length !== embedding2.length) {
    return 0;
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }

  const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
};

// Pre-save middleware to update search text
embeddingAtlasSchema.pre('save', function(next) {
  this.updateSearchText();
  next();
});

const EmbeddingAtlas = mongoose.model('EmbeddingAtlas', embeddingAtlasSchema);

export default EmbeddingAtlas;
