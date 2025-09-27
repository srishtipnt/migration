import mongoose from 'mongoose';

const codeChunkSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MigrationJob',
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  filePath: {
    type: String,
    required: true,
    index: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileExtension: {
    type: String,
    required: true
  },
  chunkType: {
    type: String,
    enum: ['function', 'class', 'interface', 'variable', 'import', 'export', 'comment', 'other'],
    required: true
  },
  chunkName: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  startLine: {
    type: Number,
    required: true
  },
  endLine: {
    type: Number,
    required: true
  },
  embedding: {
    type: [Number], // Vector embedding array
    required: true
  },
  metadata: {
    language: String,
    complexity: Number, // Simple complexity score
    dependencies: [String], // Imported modules/functions
    exports: [String] // Exported functions/classes
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound indexes for efficient querying
codeChunkSchema.index({ jobId: 1, filePath: 1 });
codeChunkSchema.index({ userId: 1, sessionId: 1 });
codeChunkSchema.index({ chunkType: 1, userId: 1 });
// Prevent duplicate chunk rows when pipelines race
codeChunkSchema.index({ jobId: 1, filePath: 1, startLine: 1, endLine: 1, chunkType: 1, chunkName: 1 }, { unique: true });

// Static method to create a code chunk
codeChunkSchema.statics.createChunk = async function(chunkData) {
  return await this.create(chunkData);
};

// Static method to get chunks by job
codeChunkSchema.statics.getChunksByJob = async function(jobId) {
  return await this.find({ jobId }).sort({ filePath: 1, startLine: 1 });
};

// Static method to search chunks by embedding similarity
codeChunkSchema.statics.searchSimilar = async function(embedding, userId, limit = 10) {
  // This would use MongoDB's vector search capabilities
  // For now, we'll implement a simple text search
  return await this.find({ userId }).limit(limit);
};

export default mongoose.model('CodeChunk', codeChunkSchema);

