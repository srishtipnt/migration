import { v4 as uuidv4 } from 'uuid';
import Session from '../models/Session.js';
import User from '../models/User.js';
import FileStorage from '../models/FileStorage.js';

// Create new session
export const createSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description, settings } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Session name is required'
      });
    }

    // Check user's session limit
    const user = await User.findById(userId);
    const userSessions = await Session.countDocuments({ userId, isActive: true });
    
    const maxSessions = user.role === 'premium' ? 50 : 10; // Premium users get more sessions
    
    if (userSessions >= maxSessions) {
      return res.status(400).json({
        success: false,
        error: 'Session limit exceeded',
        message: `Maximum ${maxSessions} active sessions allowed. Please delete some sessions or upgrade your plan.`
      });
    }

    // Create new session
    const session = new Session({
      userId,
      sessionId: uuidv4(),
      name: name.trim(),
      description: description?.trim(),
      settings: {
        theme: settings?.theme || 'auto',
        autoSave: settings?.autoSave !== undefined ? settings.autoSave : true,
        parallelProcessing: settings?.parallelProcessing !== undefined ? settings.parallelProcessing : false,
        maxFileSize: settings?.maxFileSize || user.maxFileSize
      }
    });

    await session.save();

    // Update user's total sessions count
    await User.findByIdAndUpdate(userId, { $inc: { totalSessions: 1 } });

    res.status(201).json({
      success: true,
      message: 'Session created successfully',
      data: {
        session: {
          id: session._id,
          sessionId: session.sessionId,
          name: session.name,
          description: session.description,
          currentStep: session.currentStep,
          overallProgress: session.overallProgress,
          isActive: session.isActive,
          settings: session.settings,
          createdAt: session.createdAt,
          expiresAt: session.expiresAt
        }
      }
    });

  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create session',
      message: error.message
    });
  }
};

// Get session by ID
export const getSession = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const session = await Session.findOne({ sessionId: id, userId });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        message: 'Session does not exist or you do not have permission to access it'
      });
    }

    // Get file statistics
    const fileStats = await FileStorage.getStorageStats(userId);

    res.json({
      success: true,
      data: {
        session: {
          id: session._id,
          sessionId: session.sessionId,
          name: session.name,
          description: session.description,
          currentStep: session.currentStep,
          uploadedFiles: session.uploadedFiles,
          selectedOptions: session.selectedOptions,
          overallProgress: session.overallProgress,
          isActive: session.isActive,
          isCompleted: session.isCompleted,
          settings: session.settings,
          totalProcessingTime: session.totalProcessingTime,
          errorCount: session.errorCount,
          warningCount: session.warningCount,
          totalFiles: session.totalFiles,
          totalFileSize: session.totalFileSize,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
          expiresAt: session.expiresAt
        },
        fileStats
      }
    });

  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve session',
      message: error.message
    });
  }
};

// Get all sessions for user
export const getUserSessions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status = 'all' } = req.query;

    // Build query
    const query = { userId };
    if (status !== 'all') {
      if (status === 'active') {
        query.isActive = true;
      } else if (status === 'completed') {
        query.isCompleted = true;
      } else if (status === 'expired') {
        query.expiresAt = { $lt: new Date() };
      }
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get sessions with pagination
    const sessions = await Session.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-uploadedFiles'); // Exclude large file data for list view

    const totalSessions = await Session.countDocuments(query);

    res.json({
      success: true,
      data: {
        sessions: sessions.map(session => ({
          id: session._id,
          sessionId: session.sessionId,
          name: session.name,
          description: session.description,
          currentStep: session.currentStep,
          overallProgress: session.overallProgress || 0,
          isActive: session.isActive,
          isCompleted: session.isCompleted,
          totalFiles: session.uploadedFiles ? session.uploadedFiles.length : 0,
          totalFileSize: session.uploadedFiles ? session.uploadedFiles.reduce((total, file) => total + (file.size || 0), 0) : 0,
          errorCount: session.errorCount || 0,
          warningCount: session.warningCount || 0,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
          expiresAt: session.expiresAt
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalSessions / parseInt(limit)),
          totalSessions,
          hasNext: skip + sessions.length < totalSessions,
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Get user sessions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve sessions',
      message: error.message
    });
  }
};

// Update session
export const updateSession = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    const session = await Session.findOne({ sessionId: id, userId });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        message: 'Session does not exist or you do not have permission to update it'
      });
    }

    // Validate updates
    const allowedUpdates = ['name', 'description', 'currentStep', 'selectedOptions', 'settings'];
    const updateData = {};

    for (const field of allowedUpdates) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    // Update session
    Object.assign(session, updateData);
    await session.save();

    res.json({
      success: true,
      message: 'Session updated successfully',
      data: {
        session: {
          id: session._id,
          sessionId: session.sessionId,
          name: session.name,
          description: session.description,
          currentStep: session.currentStep,
          selectedOptions: session.selectedOptions,
          overallProgress: session.overallProgress,
          settings: session.settings,
          updatedAt: session.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update session',
      message: error.message
    });
  }
};

// Delete session
export const deleteSession = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const session = await Session.findOne({ sessionId: id, userId });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        message: 'Session does not exist or you do not have permission to delete it'
      });
    }

    // Mark session as inactive instead of deleting
    session.isActive = false;
    await session.save();

    // Mark all associated files as deleted
    await FileStorage.updateMany(
      { sessionId: session._id },
      { status: 'deleted', deletedAt: new Date() }
    );

    res.json({
      success: true,
      message: 'Session deleted successfully'
    });

  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete session',
      message: error.message
    });
  }
};

// Update session progress
export const updateSessionProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { progress, currentStep } = req.body;

    const session = await Session.findOne({ sessionId: id, userId });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        message: 'Session does not exist or you do not have permission to update it'
      });
    }

    // Update progress
    if (progress !== undefined) {
      await session.updateProgress(progress);
    }

    // Update current step
    if (currentStep && ['upload', 'configure', 'progress', 'export'].includes(currentStep)) {
      session.currentStep = currentStep;
      await session.save();
    }

    res.json({
      success: true,
      message: 'Session progress updated successfully',
      data: {
        session: {
          id: session._id,
          sessionId: session.sessionId,
          currentStep: session.currentStep,
          overallProgress: session.overallProgress,
          isCompleted: session.isCompleted,
          updatedAt: session.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Update session progress error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update session progress',
      message: error.message
    });
  }
};

// Get session statistics
export const getSessionStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await Session.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          activeSessions: { $sum: { $cond: ['$isActive', 1, 0] } },
          completedSessions: { $sum: { $cond: ['$isCompleted', 1, 0] } },
          totalFiles: { $sum: { $cond: [{ $isArray: '$uploadedFiles' }, { $size: '$uploadedFiles' }, 0] } },
          totalProcessingTime: { $sum: '$totalProcessingTime' },
          totalErrors: { $sum: '$errorCount' },
          totalWarnings: { $sum: '$warningCount' }
        }
      }
    ]);

    const sessionStats = stats[0] || {
      totalSessions: 0,
      activeSessions: 0,
      completedSessions: 0,
      totalFiles: 0,
      totalProcessingTime: 0,
      totalErrors: 0,
      totalWarnings: 0
    };

    res.json({
      success: true,
      data: {
        stats: sessionStats,
        averageProcessingTime: sessionStats.totalSessions > 0 
          ? sessionStats.totalProcessingTime / sessionStats.totalSessions 
          : 0,
        successRate: sessionStats.totalSessions > 0 
          ? Math.round((sessionStats.completedSessions / sessionStats.totalSessions) * 100) 
          : 0
      }
    });

  } catch (error) {
    console.error('Get session stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve session statistics',
      message: error.message
    });
  }
};

