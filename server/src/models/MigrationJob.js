import mongoose from 'mongoose';

const fileFilterSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['include', 'exclude'],
    required: true
  },
  pattern: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  }
});

const jobErrorSchema = new mongoose.Schema({
  fileId: {
    type: String,
    required: true
  },
  errorCode: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isResolved: {
    type: Boolean,
    default: false
  },
  resolution: {
    type: String,
    default: ''
  }
});

const jobWarningSchema = new mongoose.Schema({
  fileId: {
    type: String,
    required: true
  },
  warningCode: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  acknowledged: {
    type: Boolean,
    default: false
  }
});

const migrationJobSchema = new mongoose.Schema({
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
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Job name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  status: {
    type: String,
    enum: ['queued', 'running', 'paused', 'completed', 'failed', 'cancelled'],
    default: 'queued'
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  currentFile: {
    type: String,
    default: ''
  },
  migrationOptions: [{
    type: String,
    required: true
  }],
  fileFilters: [fileFilterSchema],
  customSettings: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  inputFiles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FileStorage'
  }],
  outputFiles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FileStorage'
  }],
  totalFiles: {
    type: Number,
    default: 0
  },
  processedFiles: {
    type: Number,
    default: 0
  },
  successfulFiles: {
    type: Number,
    default: 0
  },
  failedFiles: {
    type: Number,
    default: 0
  },
  skippedFiles: {
    type: Number,
    default: 0
  },
  startTime: {
    type: Date,
    default: null
  },
  endTime: {
    type: Date,
    default: null
  },
  totalProcessingTime: {
    type: Number,
    default: 0
  },
  averageProcessingTime: {
    type: Number,
    default: 0
  },
  jobErrors: [jobErrorSchema],
  warnings: [jobWarningSchema],
  retryCount: {
    type: Number,
    default: 0
  },
  maxRetries: {
    type: Number,
    default: 3
  },
  nextRetryTime: {
    type: Date,
    default: null
  },
  outputPath: {
    type: String,
    default: ''
  },
  outputSize: {
    type: Number,
    default: 0
  },
  downloadUrl: {
    type: String,
    default: ''
  },
  memoryUsage: {
    type: Number,
    default: 0
  },
  cpuUsage: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for better query performance
migrationJobSchema.index({ userId: 1, createdAt: -1 });
migrationJobSchema.index({ sessionId: 1 });
migrationJobSchema.index({ status: 1 });
migrationJobSchema.index({ createdAt: -1 });

// Virtual for success rate
migrationJobSchema.virtual('successRate').get(function() {
  if (this.totalFiles === 0) return 0;
  return Math.round((this.successfulFiles / this.totalFiles) * 100);
});

// Virtual for failure rate
migrationJobSchema.virtual('failureRate').get(function() {
  if (this.totalFiles === 0) return 0;
  return Math.round((this.failedFiles / this.totalFiles) * 100);
});

// Method to start job
migrationJobSchema.methods.start = function() {
  this.status = 'running';
  this.startTime = new Date();
  return this.save();
};

// Method to complete job
migrationJobSchema.methods.complete = function() {
  this.status = 'completed';
  this.endTime = new Date();
  this.progress = 100;
  
  if (this.startTime) {
    this.totalProcessingTime = this.endTime - this.startTime;
    this.averageProcessingTime = this.totalFiles > 0 
      ? this.totalProcessingTime / this.totalFiles 
      : 0;
  }
  
  return this.save();
};

// Method to fail job
migrationJobSchema.methods.fail = function(errorMessage) {
  this.status = 'failed';
  this.endTime = new Date();
  
  if (this.startTime) {
    this.totalProcessingTime = this.endTime - this.startTime;
  }
  
  // Add error to jobErrors array
  this.jobErrors.push({
    fileId: 'system',
    errorCode: 'JOB_FAILED',
    message: errorMessage || 'Job failed with unknown error',
    timestamp: new Date()
  });
  
  return this.save();
};

// Method to update progress
migrationJobSchema.methods.updateProgress = function(progress, currentFile = '') {
  this.progress = Math.min(100, Math.max(0, progress));
  this.currentFile = currentFile;
  
  if (this.progress === 100) {
    return this.complete();
  }
  
  return this.save();
};

// Method to add error
migrationJobSchema.methods.addError = function(fileId, errorCode, message) {
  this.jobErrors.push({
    fileId,
    errorCode,
    message,
    timestamp: new Date()
  });
  this.failedFiles++;
  return this.save();
};

// Method to add warning
migrationJobSchema.methods.addWarning = function(fileId, warningCode, message) {
  this.warnings.push({
    fileId,
    warningCode,
    message,
    timestamp: new Date()
  });
  return this.save();
};

// Method to retry job
migrationJobSchema.methods.retry = function() {
  if (this.retryCount < this.maxRetries) {
    this.retryCount++;
    this.status = 'queued';
    this.nextRetryTime = new Date(Date.now() + (this.retryCount * 60000)); // Exponential backoff
    this.jobErrors = [];
    this.warnings = [];
    this.progress = 0;
    this.processedFiles = 0;
    this.successfulFiles = 0;
    this.failedFiles = 0;
    this.skippedFiles = 0;
    return this.save();
  }
  return Promise.reject(new Error('Maximum retry attempts exceeded'));
};

export default mongoose.model('MigrationJob', migrationJobSchema);

