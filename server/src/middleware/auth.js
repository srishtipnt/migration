import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Session from '../models/Session.js';
import MigrationJob from '../models/MigrationJob.js';
import FileStorage from '../models/FileStorage.js';

// Authenticate JWT token
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    // If no token provided, use development bypass for localhost
    if (!token && (req.hostname === 'localhost' || req.hostname === '127.0.0.1' || process.env.NODE_ENV === 'development')) {
      const mongoose = await import('mongoose');
      
      // Create a mock user for development
      req.user = {
        id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'), // Valid ObjectId format
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'), // Valid ObjectId format
        email: 'dev@example.com',
        username: 'devuser',
        firstName: 'Dev',
        lastName: 'User',
        role: 'user',
        isActive: true
      };
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
        message: 'User associated with token not found'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account deactivated',
        message: 'Your account has been deactivated'
      });
    }

    // Add user to request object
    req.user = {
      ...user.toObject(),
      id: user._id  // Ensure id is available for compatibility
    };
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'The provided token is invalid'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        message: 'Your session has expired. Please log in again.'
      });
    }

    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: 'An error occurred during authentication'
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
    // Continue without authentication
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

// Check if user has premium subscription
export const requirePremium = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'Please log in to access this resource'
    });
  }

  const { subscription } = req.user;
  
  if (!subscription || !subscription.isActive || subscription.plan === 'free') {
    return res.status(403).json({
      success: false,
      error: 'Premium subscription required',
      message: 'This feature requires a premium subscription. Please upgrade your plan.'
    });
  }

  next();
};

// ============================================================================
// RESOURCE OWNERSHIP MIDDLEWARE
// ============================================================================

// Check if user owns a session
export const checkSessionOwnership = async (req, res, next) => {
  try {
    // Development mode bypass - create mock session
    if (req.hostname === 'localhost' || req.hostname === '127.0.0.1' || process.env.NODE_ENV === 'development') {
      const sessionId = req.params.sessionId || req.params.id || req.body.sessionId;
      const mongoose = await import('mongoose');
      
      // Create a mock session for development
      req.session = {
        _id: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'), // Valid ObjectId format
        name: 'Development Session',
        description: 'Mock session for development',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      return next();
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Please log in to access this resource'
      });
    }

    const sessionId = req.params.sessionId || req.params.id || req.body.sessionId;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID required',
        message: 'Session ID is required for this operation'
      });
    }

    const session = await Session.findById(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        message: 'The requested session does not exist'
      });
    }

    // Check ownership
    if (session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You can only access your own sessions'
      });
    }

    // Add session to request for use in controllers
    req.session = session;
    next();

  } catch (error) {
    console.error('Session ownership check error:', error);
    res.status(500).json({
      success: false,
      error: 'Ownership verification failed',
      message: 'Unable to verify session ownership'
    });
  }
};

// Check if user owns a migration job
export const checkJobOwnership = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Please log in to access this resource'
      });
    }

    const jobId = req.params.jobId || req.params.id || req.body.jobId;
    
    if (!jobId) {
      return res.status(400).json({
        success: false,
        error: 'Job ID required',
        message: 'Job ID is required for this operation'
      });
    }

    const job = await MigrationJob.findById(jobId);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
        message: 'The requested migration job does not exist'
      });
    }

    // Check ownership
    if (job.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You can only access your own migration jobs'
      });
    }

    // Add job to request for use in controllers
    req.job = job;
    next();

  } catch (error) {
    console.error('Job ownership check error:', error);
    res.status(500).json({
      success: false,
      error: 'Ownership verification failed',
      message: 'Unable to verify job ownership'
    });
  }
};

// Check if user owns a file
export const checkFileOwnership = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Please log in to access this resource'
      });
    }

    const fileId = req.params.fileId || req.params.id || req.body.fileId;
    
    if (!fileId) {
      return res.status(400).json({
        success: false,
        error: 'File ID required',
        message: 'File ID is required for this operation'
      });
    }

    const file = await FileStorage.findById(fileId);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: 'The requested file does not exist'
      });
    }

    // Check ownership
    if (file.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You can only access your own files'
      });
    }

    // Add file to request for use in controllers
    req.file = file;
    next();

  } catch (error) {
    console.error('File ownership check error:', error);
    res.status(500).json({
      success: false,
      error: 'Ownership verification failed',
      message: 'Unable to verify file ownership'
    });
  }
};

// ============================================================================
// ROLE-BASED ACCESS CONTROL MIDDLEWARE
// ============================================================================

// Role hierarchy: admin > premium > user
const ROLE_HIERARCHY = {
  'admin': 3,
  'premium': 2,
  'user': 1
};

// Check if user has minimum role level
export const requireMinimumRole = (minimumRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Please log in to access this resource'
      });
    }

    const userRoleLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minimumRole] || 0;

    if (userRoleLevel < requiredLevel) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: `This action requires ${minimumRole} role or higher`
      });
    }

    next();
  };
};

// Check if user is admin
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

// Check if user can access other users' data (admin or self)
export const requireAdminOrSelf = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'Please log in to access this resource'
    });
  }

  const targetUserId = req.params.userId || req.params.id;
  
  // Admin can access any user's data
  if (req.user.role === 'admin') {
    return next();
  }

  // Regular users can only access their own data
  if (targetUserId && targetUserId !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'You can only access your own data'
    });
  }

  next();
};

// ============================================================================
// RESOURCE ACCESS CONTROL MIDDLEWARE
// ============================================================================

// Check if user can perform specific operations on resources
export const checkResourceAccess = (operation, resourceType) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'Please log in to access this resource'
        });
      }

      // Admin can do everything
      if (req.user.role === 'admin') {
        return next();
      }

      // Check operation-specific permissions
      switch (operation) {
        case 'read':
          // All authenticated users can read their own resources
          return next();

        case 'write':
        case 'update':
          // Premium users and above can write/update
          if (req.user.role === 'premium' || req.user.role === 'admin') {
            return next();
          }
          break;

        case 'delete':
          // Only admin can delete (or users can delete their own resources)
          if (req.user.role === 'admin') {
            return next();
          }
          // Users can delete their own resources (handled by ownership middleware)
          return next();

        case 'create':
          // All authenticated users can create resources
          return next();

        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid operation',
            message: 'Unknown operation specified'
          });
      }

      // If we reach here, user doesn't have permission
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: `${operation} operation requires premium subscription or higher`
      });

    } catch (error) {
      console.error('Resource access check error:', error);
      res.status(500).json({
        success: false,
        error: 'Access verification failed',
        message: 'Unable to verify resource access permissions'
      });
    }
  };
};

// ============================================================================
// QUOTA AND LIMIT MIDDLEWARE
// ============================================================================

// Check user's file upload limits
export const checkUploadLimits = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Please log in to upload files'
      });
    }

    const user = req.user;
    const fileSize = parseInt(req.headers['content-length']) || 0;
    const maxFileSize = user.maxFileSize || (50 * 1024 * 1024); // 50MB default

    // Check individual file size
    if (fileSize > maxFileSize) {
      return res.status(413).json({
        success: false,
        error: 'File too large',
        message: `File size exceeds maximum allowed size of ${Math.round(maxFileSize / (1024 * 1024))}MB`
      });
    }

    // Check total files per session limit
    const sessionId = req.params.sessionId || req.body.sessionId;
    if (sessionId) {
      const sessionFileCount = await FileStorage.countDocuments({ 
        sessionId, 
        userId: user._id,
        status: { $ne: 'deleted' }
      });

      if (sessionFileCount >= user.maxFilesPerSession) {
        return res.status(429).json({
          success: false,
          error: 'File limit exceeded',
          message: `Maximum ${user.maxFilesPerSession} files allowed per session`
        });
      }
    }

    next();

  } catch (error) {
    console.error('Upload limits check error:', error);
    res.status(500).json({
      success: false,
      error: 'Limit verification failed',
      message: 'Unable to verify upload limits'
    });
  }
};

// Check user's session limits
export const checkSessionLimits = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Please log in to create sessions'
      });
    }

    const user = req.user;
    
    // Count active sessions
    const activeSessions = await Session.countDocuments({ 
      userId: user._id, 
      isActive: true 
    });

    // Define limits based on user role
    let maxSessions;
    switch (user.role) {
      case 'admin':
        maxSessions = 1000; // No practical limit for admin
        break;
      case 'premium':
        maxSessions = 50;
        break;
      case 'user':
      default:
        maxSessions = 5;
        break;
    }

    if (activeSessions >= maxSessions) {
      return res.status(429).json({
        success: false,
        error: 'Session limit exceeded',
        message: `Maximum ${maxSessions} active sessions allowed. Please complete or delete existing sessions.`
      });
    }

    next();

  } catch (error) {
    console.error('Session limits check error:', error);
    res.status(500).json({
      success: false,
      error: 'Limit verification failed',
      message: 'Unable to verify session limits'
    });
  }
};

// ============================================================================
// COMBINED MIDDLEWARE FUNCTIONS
// ============================================================================

// Middleware for session operations (ownership + access)
export const sessionAccess = [
  authenticateToken,
  checkSessionOwnership
];

// Middleware for job operations (ownership + access)
export const jobAccess = [
  authenticateToken,
  checkJobOwnership
];

// Middleware for file operations (ownership + access)
export const fileAccess = [
  authenticateToken,
  checkFileOwnership
];

// Middleware for admin operations
export const adminAccess = [
  authenticateToken,
  requireAdmin
];

// Middleware for premium operations
export const premiumAccess = [
  authenticateToken,
  requireMinimumRole('premium')
];

// Middleware for user management (admin or self)
export const userManagementAccess = [
  authenticateToken,
  requireAdminOrSelf
];

// Middleware for file uploads (auth + limits)
export const uploadAccess = [
  authenticateToken,
  checkUploadLimits
];

// Middleware for session creation (auth + limits)
export const sessionCreationAccess = [
  authenticateToken,
  checkSessionLimits
];

// Rate limiting middleware (basic implementation)
export const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();

  return (req, res, next) => {
    const userId = req.user?.id || req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up old entries
    for (const [key, data] of requests.entries()) {
      if (data.windowStart < windowStart) {
        requests.delete(key);
      }
    }

    // Get or create user request data
    let userRequests = requests.get(userId);
    if (!userRequests) {
      userRequests = { count: 0, windowStart: now };
      requests.set(userId, userRequests);
    }

    // Reset window if needed
    if (userRequests.windowStart < windowStart) {
      userRequests.count = 0;
      userRequests.windowStart = now;
    }

    // Check rate limit
    if (userRequests.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: `Too many requests. Please try again in ${Math.ceil((userRequests.windowStart + windowMs - now) / 1000)} seconds.`
      });
    }

    // Increment counter
    userRequests.count++;

    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': maxRequests,
      'X-RateLimit-Remaining': maxRequests - userRequests.count,
      'X-RateLimit-Reset': new Date(userRequests.windowStart + windowMs).toISOString()
    });

    next();
  };
};

