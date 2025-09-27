import express from 'express';
import MigrationJob from '../models/MigrationJob.js';
import CodeChunk from '../models/CodeChunk.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * Create a new migration job
 */
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { sessionId, zipFile, totalFiles } = req.body;
    const userId = req.user.id;

    if (!sessionId || !zipFile || !totalFiles) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'sessionId, zipFile, and totalFiles are required'
      });
    }

    // Check if job already exists
    const existingJob = await MigrationJob.findOne({ sessionId });
    if (existingJob) {
      return res.status(409).json({
        success: false,
        error: 'Job already exists',
        message: 'A migration job for this session already exists'
      });
    }

    // Create new job
    const job = await MigrationJob.createJob(sessionId, userId, zipFile, totalFiles);

    res.status(201).json({
      success: true,
      message: 'Migration job created successfully',
      data: {
        jobId: job._id,
        sessionId: job.sessionId,
        status: job.status,
        createdAt: job.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating migration job:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to create migration job'
    });
  }
});

/**
 * Get job status
 */
router.get('/status/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const job = await MigrationJob.findOne({ sessionId, userId });
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
        message: 'No migration job found for this session'
      });
    }

    res.json({
      success: true,
      data: {
        jobId: job._id,
        sessionId: job.sessionId,
        status: job.status,
        totalFiles: job.totalFiles,
        processedFiles: job.processedFiles,
        totalChunks: job.totalChunks,
        error: job.error,
        processingStartedAt: job.processingStartedAt,
        processingCompletedAt: job.processingCompletedAt,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt
      }
    });

  } catch (error) {
    console.error('Error getting job status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get job status'
    });
  }
});

/**
 * Get all jobs for user
 */
router.get('/jobs', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, limit = 50, offset = 0 } = req.query;

    const query = { userId };
    if (status) {
      query.status = status;
    }

    const jobs = await MigrationJob.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const totalCount = await MigrationJob.countDocuments(query);

    res.json({
      success: true,
      data: {
        jobs: jobs.map(job => ({
          jobId: job._id,
          sessionId: job.sessionId,
          status: job.status,
          totalFiles: job.totalFiles,
          processedFiles: job.processedFiles,
          totalChunks: job.totalChunks,
          error: job.error,
          processingStartedAt: job.processingStartedAt,
          processingCompletedAt: job.processingCompletedAt,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt
        })),
        pagination: {
          total: totalCount,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: totalCount > parseInt(offset) + parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error getting user jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get user jobs'
    });
  }
});

/**
 * Get a specific job by ID
 */
router.get('/job/:jobId', authenticateToken, async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;

    const job = await MigrationJob.findOne({ _id: jobId, userId });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
        message: 'Migration job not found or access denied'
      });
    }

    res.json({
      success: true,
      data: {
        jobId: job._id,
        sessionId: job.sessionId,
        status: job.status,
        totalFiles: job.totalFiles,
        processedFiles: job.processedFiles,
        totalChunks: job.totalChunks,
        error: job.error,
        processingStartedAt: job.processingStartedAt,
        processingCompletedAt: job.processingCompletedAt,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt
      }
    });

  } catch (error) {
    console.error('Error getting job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get job',
      message: error.message
    });
  }
});

/**
 * Get code chunks for a job
 */
router.get('/chunks/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    const { limit = 100, offset = 0, chunkType, filePath } = req.query;

    // Verify job belongs to user
    const job = await MigrationJob.findOne({ sessionId, userId });
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
        message: 'No migration job found for this session'
      });
    }

    const query = { jobId: job._id };
    if (chunkType) {
      query.chunkType = chunkType;
    }
    if (filePath) {
      query.filePath = { $regex: filePath, $options: 'i' };
    }

    const chunks = await CodeChunk.find(query)
      .sort({ filePath: 1, startLine: 1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .select('-embedding'); // Exclude embedding for performance

    const totalCount = await CodeChunk.countDocuments(query);

    res.json({
      success: true,
      data: {
        chunks: chunks.map(chunk => ({
          chunkId: chunk._id,
          filePath: chunk.filePath,
          fileName: chunk.fileName,
          fileExtension: chunk.fileExtension,
          chunkType: chunk.chunkType,
          chunkName: chunk.chunkName,
          content: chunk.content,
          startLine: chunk.startLine,
          endLine: chunk.endLine,
          metadata: chunk.metadata,
          createdAt: chunk.createdAt
        })),
        pagination: {
          total: totalCount,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: totalCount > parseInt(offset) + parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error getting code chunks:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get code chunks'
    });
  }
});

/**
 * Search code chunks by content
 */
router.post('/search', authenticateToken, async (req, res) => {
  try {
    const { query, sessionId, limit = 20 } = req.body;
    const userId = req.user.id;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Missing query',
        message: 'Search query is required'
      });
    }

    // Build search query
    const searchQuery = { userId };
    if (sessionId) {
      searchQuery.sessionId = sessionId;
    }

    // Simple text search for now
    // TODO: Implement vector similarity search
    const chunks = await CodeChunk.find({
      ...searchQuery,
      $or: [
        { content: { $regex: query, $options: 'i' } },
        { chunkName: { $regex: query, $options: 'i' } },
        { fileName: { $regex: query, $options: 'i' } }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .select('-embedding'); // Exclude embedding for performance

    res.json({
      success: true,
      data: {
        chunks: chunks.map(chunk => ({
          chunkId: chunk._id,
          sessionId: chunk.sessionId,
          filePath: chunk.filePath,
          fileName: chunk.fileName,
          fileExtension: chunk.fileExtension,
          chunkType: chunk.chunkType,
          chunkName: chunk.chunkName,
          content: chunk.content,
          startLine: chunk.startLine,
          endLine: chunk.endLine,
          metadata: chunk.metadata,
          createdAt: chunk.createdAt
        })),
        query,
        totalResults: chunks.length
      }
    });

  } catch (error) {
    console.error('Error searching code chunks:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to search code chunks'
    });
  }
});

/**
 * Delete a migration job and its chunks
 */
router.delete('/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    // Find and verify job belongs to user
    const job = await MigrationJob.findOne({ sessionId, userId });
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
        message: 'No migration job found for this session'
      });
    }

    // Delete all chunks for this job
    await CodeChunk.deleteMany({ jobId: job._id });

    // Delete the job
    await MigrationJob.findByIdAndDelete(job._id);

    res.json({
      success: true,
      message: 'Migration job and all chunks deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting migration job:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to delete migration job'
    });
  }
});

/**
 * Get embedding statistics for debugging
 */
router.get('/embeddings/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get overall statistics
    const totalChunks = await CodeChunk.countDocuments({ userId });
    const chunksWithEmbeddings = await CodeChunk.countDocuments({ 
      userId,
      embedding: { $exists: true, $ne: null, $not: { $size: 0 } } 
    });
    const chunksWithoutEmbeddings = totalChunks - chunksWithEmbeddings;

    // Get sample embedding info
    const sampleChunk = await CodeChunk.findOne({ 
      userId,
      embedding: { $exists: true, $ne: null, $not: { $size: 0 } } 
    });

    let embeddingInfo = null;
    if (sampleChunk) {
      embeddingInfo = {
        dimensions: sampleChunk.embedding.length,
        valueRange: {
          min: Math.min(...sampleChunk.embedding),
          max: Math.max(...sampleChunk.embedding)
        },
        sampleValues: sampleChunk.embedding.slice(0, 5),
        isDummy: sampleChunk.embedding.every(val => val >= 0 && val <= 1)
      };
    }

    // Get job statistics
    const jobs = await MigrationJob.find({ userId }).sort({ createdAt: -1 });
    const jobStats = jobs.map(job => ({
      sessionId: job.sessionId,
      status: job.status,
      totalFiles: job.totalFiles,
      processedFiles: job.processedFiles,
      totalChunks: job.totalChunks,
      createdAt: job.createdAt,
      processingStartedAt: job.processingStartedAt,
      processingCompletedAt: job.processingCompletedAt,
      hasError: !!job.error
    }));

    res.json({
      success: true,
      data: {
        overall: {
          totalChunks,
          chunksWithEmbeddings,
          chunksWithoutEmbeddings,
          successRate: totalChunks > 0 ? ((chunksWithEmbeddings/totalChunks)*100).toFixed(1) : 0
        },
        embeddingInfo,
        jobs: jobStats
      }
    });

  } catch (error) {
    console.error('Error getting embedding stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get embedding statistics'
    });
  }
});

/**
 * Test endpoint without authentication (for development)
 */
router.get('/test/embeddings', async (req, res) => {
  try {
    // Get overall statistics
    const totalChunks = await CodeChunk.countDocuments();
    const chunksWithEmbeddings = await CodeChunk.countDocuments({ 
      embedding: { $exists: true, $ne: null, $not: { $size: 0 } } 
    });
    const chunksWithoutEmbeddings = totalChunks - chunksWithEmbeddings;

    // Get sample embedding info
    const sampleChunk = await CodeChunk.findOne({ 
      embedding: { $exists: true, $ne: null, $not: { $size: 0 } } 
    });

    let embeddingInfo = null;
    if (sampleChunk) {
      embeddingInfo = {
        dimensions: sampleChunk.embedding.length,
        valueRange: {
          min: Math.min(...sampleChunk.embedding),
          max: Math.max(...sampleChunk.embedding)
        },
        sampleValues: sampleChunk.embedding.slice(0, 5),
        isDummy: sampleChunk.embedding.every(val => val >= 0 && val <= 1)
      };
    }

    // Get job statistics
    const jobs = await MigrationJob.find({}).sort({ createdAt: -1 });
    const jobStats = jobs.map(job => ({
      sessionId: job.sessionId,
      status: job.status,
      totalFiles: job.totalFiles,
      processedFiles: job.processedFiles,
      totalChunks: job.totalChunks,
      createdAt: job.createdAt,
      processingStartedAt: job.processingStartedAt,
      processingCompletedAt: job.processingCompletedAt,
      hasError: !!job.error
    }));

    res.json({
      success: true,
      data: {
        overall: {
          totalChunks,
          chunksWithEmbeddings,
          chunksWithoutEmbeddings,
          successRate: totalChunks > 0 ? ((chunksWithEmbeddings/totalChunks)*100).toFixed(1) : 0
        },
        embeddingInfo,
        jobs: jobStats
      }
    });

  } catch (error) {
    console.error('Error getting embedding stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get embedding statistics'
    });
  }
});

export default router;
