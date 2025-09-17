import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import FileStorage from '../models/FileStorage.js';

// Authenticate JWT token
export const authenticateToken = async (req, res, next) => {
  try {
    console.log('🔐 Auth middleware called');
    console.log('🔐 Hostname:', req.hostname);
    console.log('🔐 Headers:', req.headers);
    
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    console.log('🔐 Token present:', !!token);

    // If no token provided, use development bypass for localhost
    if (!token && (req.hostname === 'localhost' || req.hostname === '127.0.0.1' || process.env.NODE_ENV === 'development')) {
      // Create a mock development user without database access
      req.user = {
        id: '507f1f77bcf86cd799439011', // Valid MongoDB ObjectId format
        email: 'dev@example.com',
        username: 'devuser',
        firstName: 'Dev',
        lastName: 'User',
        role: 'user',
        isActive: true,
        maxFileSize: 104857600 // 100MB
      };
      console.log('🔧 Using development user bypass');
      console.log('🔧 User set:', req.user);
      return next();
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required',
        message: 'Please provide a valid authentication token'
      });
    }

    // Verify token
    const jwtSecret = process.env.JWT_SECRET || 'development-secret-key';
    const decoded = jwt.verify(token, jwtSecret);

    // Get user from database
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account deactivated',
        message: 'Your account has been deactivated'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'Token is malformed or invalid'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        message: 'Please log in again'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: 'Internal server error during authentication'
    });
  }
};

// Optional authentication (doesn't fail if no token)
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const jwtSecret = process.env.JWT_SECRET || 'development-secret-key';
      const decoded = jwt.verify(token, jwtSecret);
      const user = await User.findById(decoded.userId).select('-password');
      if (user && user.isActive) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Ignore auth errors for optional auth
    next();
  }
};

// Check if user has required role
export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Please log in to access this resource'
      });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

// Check file ownership
export const checkFileOwnership = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const file = await FileStorage.findOne({ _id: id, userId });
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: 'File does not exist or you do not have permission to access it'
      });
    }

    req.file = file;
    next();
  } catch (error) {
    console.error('File ownership check error:', error);
    res.status(500).json({
      success: false,
      error: 'File access check failed',
      message: 'Internal server error during file access verification'
    });
  }
};

// Check upload limits
export const checkUploadLimits = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User account not found'
      });
    }

    // Check file size limits
    const maxFileSize = user.maxFileSize || 50 * 1024 * 1024; // Default 50MB
    const files = req.files || [];
    
    for (const file of files) {
      if (file.size > maxFileSize) {
        return res.status(400).json({
          success: false,
          error: 'File too large',
          message: `File ${file.originalname} exceeds the maximum size limit of ${Math.round(maxFileSize / 1024 / 1024)}MB`
        });
      }
    }

    next();
  } catch (error) {
    console.error('Upload limits check error:', error);
    res.status(500).json({
      success: false,
      error: 'Upload limits check failed',
      message: 'Internal server error during upload limits verification'
    });
  }
};

// Admin access control
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'Please log in to access this resource'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
      message: 'This action requires administrator privileges'
    });
  }

  next();
};