import mongoose from 'mongoose';

const fileStorageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
  
  // Folder structure information
  folderPath: {
    type: String,
    default: ''
  },
  relativePath: {
    type: String,
    default: ''
  },
  
  // Timestamps
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  
  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for better query performance
fileStorageSchema.index({ userId: 1, createdAt: -1 });
fileStorageSchema.index({ checksum: 1 });

// Virtual for file size in human readable format
fileStorageSchema.virtual('fileSizeFormatted').get(function() {
  const bytes = this.fileSize;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
});

// Method to get file extension from original name
fileStorageSchema.methods.getExtension = function() {
  const parts = this.originalName.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
};

// Static method to find files by user
fileStorageSchema.statics.findByUser = function(userId, limit = 50) {
  return this.find({ userId }).sort({ createdAt: -1 }).limit(limit);
};

// Pre-save middleware to set extension only
fileStorageSchema.pre('save', function(next) {
  if (this.isModified('originalName')) {
    if (!this.extension) {
      this.extension = this.getExtension();
    }
  }
  next();
});

export default mongoose.model('FileStorage', fileStorageSchema);