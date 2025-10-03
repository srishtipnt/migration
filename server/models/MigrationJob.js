import mongoose from 'mongoose';

const migrationJobSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'ready', 'failed'],
    default: 'pending',
    index: true
  },
  zipFile: {
    public_id: String,
    secure_url: String,
    originalName: String,
    size: Number
  },
  totalFiles: {
    type: Number,
    default: 0
  },
  processedFiles: {
    type: Number,
    default: 0
  },
  totalChunks: {
    type: Number,
    default: 0
  },
  error: {
    message: String,
    stack: String,
    timestamp: Date
  },
  // Migration results storage
  fromLanguage: {
    type: String,
    default: 'unknown'
  },
  toLanguage: {
    type: String,
    default: 'unknown'
  },
  originalFilename: {
    type: String,
    default: 'unknown'
  },
  migratedFilename: {
    type: String,
    default: 'unknown'
  },
  migratedCode: {
    type: String,
    default: ''
  },
  migratedFiles: {
    type: Map,
    of: String,
    default: {}
  },
  originalFiles: {
    type: Map,
    of: String,
    default: {}
  },
  summary: {
    type: String,
    default: 'Migration completed successfully'
  },
  changes: [{
    type: String
  }],
  warnings: [{
    type: String
  }],
  recommendations: [{
    type: String
  }],
  isDemo: {
    type: Boolean,
    default: false
  },
  processingStartedAt: Date,
  processingCompletedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update the updatedAt field before saving
migrationJobSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to create a new migration job
migrationJobSchema.statics.createJob = async function(sessionId, userId, zipFile, totalFiles) {
  return await this.create({
    sessionId,
    userId,
    zipFile,
    totalFiles,
    status: 'pending'
  });
};

// Instance method to update job status
migrationJobSchema.methods.updateStatus = async function(status, error = null) {
  this.status = status;
  
  if (status === 'processing') {
    this.processingStartedAt = new Date();
  } else if (status === 'ready' || status === 'failed') {
    this.processingCompletedAt = new Date();
  }
  
  if (error) {
    this.error = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date()
    };
  }
  
  return await this.save();
};

// Instance method to save migration results
migrationJobSchema.methods.saveMigrationResults = async function(migrationResult, options = {}) {
  this.fromLanguage = options.fromLang || 'unknown';
  this.toLanguage = options.toLang || 'unknown';
  this.originalFilename = options.originalFilename || 'unknown';
  this.migratedFilename = options.migratedFilename || 'unknown';
  this.migratedCode = migrationResult.migratedCode || '';
  this.summary = migrationResult.summary || 'Migration completed successfully';
  this.changes = migrationResult.changes || [];
  this.warnings = migrationResult.warnings || [];
  this.recommendations = migrationResult.recommendations || [];
  this.isDemo = migrationResult.isDemo || false;
  
  // Store migrated files
  if (migrationResult.files && Array.isArray(migrationResult.files)) {
    const migratedFilesMap = {};
    migrationResult.files.forEach(file => {
      if (file.migratedFilename && file.content) {
        migratedFilesMap[file.migratedFilename] = file.content;
      }
    });
    this.migratedFiles = migratedFilesMap;
  }
  
  // Store original files if provided
  if (options.originalFiles) {
    this.originalFiles = options.originalFiles;
  }
  
  return await this.save();
};

// Instance method to update progress
migrationJobSchema.methods.updateProgress = async function(processedFiles, totalChunks) {
  this.processedFiles = processedFiles;
  this.totalChunks = totalChunks;
  return await this.save();
};

export default mongoose.model('MigrationJob', migrationJobSchema);








