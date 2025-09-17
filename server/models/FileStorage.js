import mongoose from 'mongoose';

const fileStorageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Essential file metadata
  originalFilename: {
    type: String,
    required: true,
    trim: true
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
  
  // File type information (simplified)
  format: {
    type: String,
    default: null // File format without dot (e.g., 'js', 'html', 'css')
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
  
  // Additional metadata (includes complete Cloudinary response)
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Cloudinary-specific fields (Essential)
  storageType: {
    type: String,
    enum: ['local', 'cloudinary'],
    default: 'local'
  },
  public_id: {
    type: String,
    default: null,
    sparse: true // Essential: Cloudinary's unique identifier
  },
  secure_url: {
    type: String,
    default: null // Essential: Full HTTPS URL for the asset
  },
  resource_type: {
    type: String,
    enum: ['image', 'video', 'raw', 'auto'],
    default: 'raw' // Essential: Tells Cloudinary what kind of asset it is
  },
  
  // Cloudinary-specific fields (Recommended)
  bytes: {
    type: Number,
    default: null // Recommended: File size in bytes
  },
  
  // Application-specific fields
  sessionId: {
    type: String,
    default: null,
    sparse: true // Allows multiple null values
  },
  isExtractedFromZip: {
    type: Boolean,
    default: false
  },
  zipFileName: {
    type: String,
    default: null
  },
  fileType: {
    type: String,
    default: 'unknown'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
fileStorageSchema.index({ userId: 1, createdAt: -1 });
fileStorageSchema.index({ storageType: 1 });
fileStorageSchema.index({ sessionId: 1 });
fileStorageSchema.index({ public_id: 1 }); // Essential Cloudinary field
fileStorageSchema.index({ userId: 1, sessionId: 1 }); // Compound index for session queries
fileStorageSchema.index({ userId: 1, storageType: 1 }); // Compound index for user's Cloudinary files

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
  const parts = this.originalFilename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
};

// Static method to find files by user
fileStorageSchema.statics.findByUser = function(userId, limit = 50) {
  return this.find({ userId }).sort({ createdAt: -1 }).limit(limit);
};

// Static method to find files by session
fileStorageSchema.statics.findBySession = function(sessionId) {
  return this.find({ sessionId }).sort({ createdAt: -1 });
};

// Static method to find Cloudinary files
fileStorageSchema.statics.findCloudinaryFiles = function(userId) {
  return this.find({ userId, storageType: 'cloudinary' }).sort({ createdAt: -1 });
};

// Static method to find files by session with Cloudinary info
fileStorageSchema.statics.findCloudinaryFilesBySession = function(sessionId) {
  return this.find({ sessionId, storageType: 'cloudinary' }).sort({ createdAt: -1 });
};

// Pre-save middleware to set format from originalFilename
fileStorageSchema.pre('save', function(next) {
  if (this.isModified('originalFilename')) {
    if (!this.format) {
      const extension = this.getExtension();
      this.format = extension; // Store format without dot (e.g., 'js', 'html')
    }
  }
  next();
});

export default mongoose.model('FileStorage', fileStorageSchema);