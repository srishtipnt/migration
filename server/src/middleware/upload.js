import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import crypto from 'crypto';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

// Ensure upload directory exists
const ensureUploadDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Generate unique filename
const generateFileName = (originalName) => {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(16).toString('hex');
  const extension = path.extname(originalName);
  const nameWithoutExt = path.basename(originalName, extension);
  
  return `${timestamp}_${randomString}_${nameWithoutExt}${extension}`;
};

// File filter function
const fileFilter = (req, file, cb) => {
  // Define allowed file types
  const allowedTypes = [
    // JavaScript/TypeScript
    'application/javascript',
    'text/javascript',
    'application/typescript',
    'text/typescript',
    
    // JSON
    'application/json',
    'text/json',
    
    // SQL
    'application/sql',
    'text/sql',
    
    // Text files
    'text/plain',
    'text/html',
    'text/css',
    'text/xml',
    
    // Archives
    'application/zip',
    'application/x-zip-compressed',
    'application/x-tar',
    'application/gzip',
    
    // Other common types
    'application/xml',
    'text/markdown',
    'application/yaml',
    'text/yaml'
  ];
  
  // Check file extension as fallback
  const allowedExtensions = [
    '.js', '.ts', '.jsx', '.tsx',
    '.json', '.jsonc',
    '.sql',
    '.txt', '.html', '.css', '.xml', '.md',
    '.zip', '.tar', '.gz',
    '.yaml', '.yml'
  ];
  
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`), false);
  }
};

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const sessionId = req.body.sessionId || req.params.sessionId;
    if (!sessionId) {
      return cb(new Error('Session ID is required'), null);
    }
    
    const uploadPath = path.join(process.env.UPLOAD_PATH || './uploads', 'sessions', sessionId, 'input');
    ensureUploadDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const fileName = generateFileName(file.originalname);
    cb(null, fileName);
  }
});

// Memory storage for small files (alternative to disk storage)
const memoryStorage = multer.memoryStorage();

// Multer configuration
const upload = multer({
  storage: process.env.NODE_ENV === 'production' ? memoryStorage : storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024, // 100MB default
    files: parseInt(process.env.MAX_FILES_PER_SESSION) || 100 // 100 files default
  }
});

// Error handling middleware
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          error: 'File too large',
          message: `File size exceeds the limit of ${process.env.MAX_FILE_SIZE || '100MB'}`
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          error: 'Too many files',
          message: `Maximum ${process.env.MAX_FILES_PER_SESSION || 100} files allowed per session`
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          error: 'Unexpected file field',
          message: 'Please use the correct field name for file uploads'
        });
      default:
        return res.status(400).json({
          success: false,
          error: 'Upload error',
          message: error.message
        });
    }
  }
  
  if (error.message.includes('File type')) {
    return res.status(400).json({
      success: false,
      error: 'Invalid file type',
      message: error.message
    });
  }
  
  next(error);
};

// Middleware to validate session before upload
const validateSession = async (req, res, next) => {
  try {
    // Development mode bypass - create mock session
    if (req.hostname === 'localhost' || req.hostname === '127.0.0.1' || process.env.NODE_ENV === 'development') {
      const sessionId = req.body.sessionId || req.params.sessionId;
      
      // Generate a valid ObjectId for the session
      const validObjectId = new mongoose.Types.ObjectId();
      
      // Create a mock session for development
      req.session = {
        _id: validObjectId,
        sessionId: sessionId || `dev-session-${Date.now()}`,
        userId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'), // Valid ObjectId format
        name: 'Development Session',
        description: 'Mock session for development',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      return next();
    }

    const sessionId = req.body.sessionId || req.params.sessionId;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID required',
        message: 'Session ID is required for file uploads'
      });
    }
    
    // Import Session model (avoid circular dependency)
    const { default: Session } = await import('../models/Session.js');
    
    const session = await Session.findOne({ sessionId });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        message: 'Invalid session ID'
      });
    }
    
    if (!session.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Session inactive',
        message: 'Session is no longer active'
      });
    }
    
    // Add session to request for use in controllers
    req.session = session;
    next();
  } catch (error) {
    next(error);
  }
};

// Middleware to check user permissions
const checkUserPermissions = async (req, res, next) => {
  try {
    // Development mode bypass
    if (req.hostname === 'localhost' || req.hostname === '127.0.0.1' || process.env.NODE_ENV === 'development') {
      return next();
    }

    const userId = req.user?._id || req.user?.id;
    const sessionId = req.body.sessionId || req.params.sessionId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'User must be authenticated to upload files'
      });
    }
    
    // Import Session model
    const { default: Session } = await import('../models/Session.js');
    
    // Debug logging
    console.log('🔍 Permission check:', {
      sessionId,
      userId,
      userFromReq: req.user?._id || req.user?.id
    });
    
    const session = await Session.findOne({ 
      sessionId, 
      userId: userId
    });
    
    if (!session) {
      console.log('❌ Session not found or access denied:', {
        sessionId,
        userId,
        sessionExists: await Session.findOne({ sessionId }),
        sessionUserId: (await Session.findOne({ sessionId }))?.userId
      });
      
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You do not have permission to upload files to this session'
      });
    }
    
    console.log('✅ Permission granted for session:', sessionId);
    next();
  } catch (error) {
    console.error('❌ Permission check error:', error);
    next(error);
  }
};

// Utility function to save file to cloud storage (for production)
const saveToCloudStorage = async (file, sessionId, storageProvider = 'local') => {
  // This would be implemented based on the storage provider
  // For now, we'll use local storage
  const fileName = generateFileName(file.originalname);
  const filePath = path.join(process.env.UPLOAD_PATH || './uploads', 'sessions', sessionId, 'input', fileName);
  
  await fs.writeFile(filePath, file.buffer);
  
  return {
    fileName,
    filePath,
    fileSize: file.size,
    mimeType: file.mimetype
  };
};

export {
  upload,
  handleUploadError,
  validateSession,
  checkUserPermissions,
  saveToCloudStorage,
  generateFileName
};

