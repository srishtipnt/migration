import mongoose from 'mongoose';

const fileStorageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MigrationJob',
    default: null
  },
  
  // File metadata
  originalName: {
    type: String,
    required: true,
    trim: true
  },
  fileName: {
    type: String,
    required: true,
    trim: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true,
    min: 0
  },
  mimeType: {
    type: String,
    required: true
  },
  checksum: {
    type: String,
    required: true
  },
  
  // File type information
  extension: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['input', 'output', 'temp', 'archive'],
    required: true
  },
  
  // Processing status
  status: {
    type: String,
    enum: ['uploaded', 'processing', 'processed', 'failed', 'deleted'],
    default: 'uploaded'
  },
  processingProgress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  errorMessage: {
    type: String,
    default: ''
  },
  
  // Relationships
  parentFileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FileStorage',
    default: null
  },
  relatedFiles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FileStorage'
  }],
  
  // Access control
  isPublic: {
    type: Boolean,
    default: false
  },
  accessCount: {
    type: Number,
    default: 0
  },
  lastAccessed: {
    type: Date,
    default: null
  },
  
  // Storage information
  storageProvider: {
    type: String,
    enum: ['local', 's3', 'gcs', 'azure'],
    required: true
  },
  storageLocation: {
    type: String,
    required: true
  },
  isEncrypted: {
    type: Boolean,
    default: false
  },
  encryptionKey: {
    type: String,
    default: ''
  },
  
  // Lifecycle timestamps
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  processedAt: {
    type: Date,
    default: null
  },
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    }
  },
  deletedAt: {
    type: Date,
    default: null
  },
  
  // Additional metadata
  tags: [{
    type: String,
    trim: true
  }],
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for better query performance
fileStorageSchema.index({ userId: 1, createdAt: -1 });
fileStorageSchema.index({ sessionId: 1 });
fileStorageSchema.index({ jobId: 1 });
fileStorageSchema.index({ checksum: 1 });
fileStorageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
fileStorageSchema.index({ status: 1 });
fileStorageSchema.index({ category: 1 });

// Virtual for file size in human readable format
fileStorageSchema.virtual('fileSizeFormatted').get(function() {
  const bytes = this.fileSize;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
});

// Virtual for file age in days
fileStorageSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.uploadedAt) / (1000 * 60 * 60 * 24));
});

// Method to mark as processed
fileStorageSchema.methods.markAsProcessed = function() {
  this.status = 'processed';
  this.processingProgress = 100;
  this.processedAt = new Date();
  return this.save();
};

// Method to mark as failed
fileStorageSchema.methods.markAsFailed = function(errorMessage) {
  this.status = 'failed';
  this.errorMessage = errorMessage;
  return this.save();
};

// Method to mark as deleted
fileStorageSchema.methods.markAsDeleted = function() {
  this.status = 'deleted';
  this.deletedAt = new Date();
  return this.save();
};

// Method to update access count
fileStorageSchema.methods.recordAccess = function() {
  this.accessCount++;
  this.lastAccessed = new Date();
  return this.save();
};

// Method to check if file is expired
fileStorageSchema.methods.isExpired = function() {
  return this.expiresAt && this.expiresAt < new Date();
};

// Method to get file extension from original name
fileStorageSchema.methods.getExtension = function() {
  const parts = this.originalName.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
};

// Static method to find files by session
fileStorageSchema.statics.findBySession = function(sessionId, category = null) {
  const query = { sessionId, status: { $ne: 'deleted' } };
  if (category) {
    query.category = category;
  }
  return this.find(query).sort({ createdAt: -1 });
};

// Static method to find files by user
fileStorageSchema.statics.findByUser = function(userId, limit = 50) {
  return this.find({ 
    userId, 
    status: { $ne: 'deleted' } 
  })
  .sort({ createdAt: -1 })
  .limit(limit);
};

// Static method to get storage statistics
fileStorageSchema.statics.getStorageStats = function(userId) {
  return this.aggregate([
    { $match: { userId, status: { $ne: 'deleted' } } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        totalSize: { $sum: '$fileSize' },
        averageSize: { $avg: '$fileSize' }
      }
    }
  ]);
};

// Pre-save middleware to set extension
fileStorageSchema.pre('save', function(next) {
  if (this.isModified('originalName') && !this.extension) {
    this.extension = this.getExtension();
  }
  next();
});

export default mongoose.model('FileStorage', fileStorageSchema);

