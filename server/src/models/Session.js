import mongoose from 'mongoose';

const fileNodeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['file', 'folder'],
    required: true
  },
  size: {
    type: Number,
    default: 0
  },
  children: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FileNode'
  }],
  selected: {
    type: Boolean,
    default: true
  },
  icon: {
    type: String,
    default: 'file'
  },
  path: {
    type: String,
    required: true
  },
  extension: {
    type: String,
    default: ''
  },
  mimeType: {
    type: String,
    default: ''
  },
  lastModified: {
    type: Date,
    default: Date.now
  },
  checksum: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'skipped'],
    default: 'pending'
  },
  migrationProgress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  errorMessage: {
    type: String,
    default: ''
  },
  isExpanded: {
    type: Boolean,
    default: false
  },
  isVisible: {
    type: Boolean,
    default: true
  }
}, { _id: true });

const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Session name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  currentStep: {
    type: String,
    enum: ['upload', 'configure', 'progress', 'export'],
    default: 'upload'
  },
  uploadedFiles: [fileNodeSchema],
  selectedOptions: [{
    type: String
  }],
  overallProgress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  settings: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    },
    autoSave: {
      type: Boolean,
      default: true
    },
    parallelProcessing: {
      type: Boolean,
      default: false
    },
    maxFileSize: {
      type: Number,
      default: 50 * 1024 * 1024 // 50MB
    }
  },
  totalProcessingTime: {
    type: Number,
    default: 0
  },
  memoryPeak: {
    type: Number,
    default: 0
  },
  errorCount: {
    type: Number,
    default: 0
  },
  warningCount: {
    type: Number,
    default: 0
  },
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    }
  }
}, {
  timestamps: true
});

// Index for better query performance
sessionSchema.index({ userId: 1, createdAt: -1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Note: sessionId already has unique index from unique: true

// Virtual for total files count
sessionSchema.virtual('totalFiles').get(function() {
  return this.uploadedFiles ? this.uploadedFiles.length : 0;
});

// Virtual for total file size
sessionSchema.virtual('totalFileSize').get(function() {
  return this.uploadedFiles ? this.uploadedFiles.reduce((total, file) => total + (file.size || 0), 0) : 0;
});

// Method to check if session can proceed to next step
sessionSchema.methods.canProceed = function() {
  switch (this.currentStep) {
    case 'upload':
      return this.uploadedFiles ? this.uploadedFiles.length > 0 : false;
    case 'configure':
      return this.selectedOptions ? this.selectedOptions.length > 0 : false;
    case 'progress':
      return this.overallProgress === 100;
    case 'export':
      return this.isCompleted;
    default:
      return false;
  }
};

// Method to get next step
sessionSchema.methods.getNextStep = function() {
  const steps = ['upload', 'configure', 'progress', 'export'];
  const currentIndex = steps.indexOf(this.currentStep);
  return currentIndex < steps.length - 1 ? steps[currentIndex + 1] : null;
};

// Method to update progress
sessionSchema.methods.updateProgress = function(progress) {
  this.overallProgress = Math.min(100, Math.max(0, progress));
  
  if (this.overallProgress === 100) {
    this.isCompleted = true;
    this.currentStep = 'export';
  }
  
  return this.save();
};

export default mongoose.model('Session', sessionSchema);

