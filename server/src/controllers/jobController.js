import MigrationJob from '../models/MigrationJob.js';
import Session from '../models/Session.js';
import { addMigrationJob, getJobStatus, getQueueStats as getQueueStatsFromQueue } from '../queues/migrationQueue.js';

// Create a new migration job
export const createJob = async (req, res) => {
  try {
    const { sessionId, name, description, migrationOptions, fileFilters, customSettings } = req.body;
    const userId = req.user.id;

    // Validate session exists and belongs to user
    const session = await Session.findOne({ sessionId, userId });
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        message: 'Session not found or you do not have permission to access it'
      });
    }

    // Check if session is active
    if (!session.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Session inactive',
        message: 'Cannot create job for inactive session'
      });
    }

    // Create migration job in database
    const migrationJob = new MigrationJob({
      userId,
      sessionId: session._id, // Use session's ObjectId, not the UUID string
      name: name || 'Migration Job',
      description: description || 'Automated migration job',
      migrationOptions: migrationOptions || ['es6-to-es2022'],
      fileFilters: (fileFilters && fileFilters.length > 0) ? fileFilters : [
        {
          type: 'include',
          pattern: '.*\\.(js|ts|jsx|tsx)$',
          description: 'Include JavaScript and TypeScript files'
        }
      ],
      customSettings: customSettings || {
        preserveComments: true,
        minifyOutput: false,
        generateSourceMaps: true
      }
    });

    await migrationJob.save();

    // Add job to queue (if Redis is available)
    let queueJob = null;
    try {
      queueJob = await addMigrationJob({
        jobId: migrationJob._id.toString(),
        sessionId: sessionId,
        migrationOptions: migrationOptions || [],
        fileFilters: fileFilters || [],
        customSettings: customSettings || {}
      });
    } catch (queueError) {
      console.warn('⚠️ Could not add job to queue (Redis not available):', queueError.message);
      // Job is still created in database, just not queued
    }

    res.status(201).json({
      success: true,
      message: 'Migration job created successfully',
      data: {
        job: migrationJob,
        queueJobId: queueJob ? queueJob.id : null,
        queueStatus: queueJob ? 'queued' : 'pending_redis'
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
};

// Get job by ID
export const getJob = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const job = await MigrationJob.findOne({ _id: id, userId }).populate('sessionId', 'name description');
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
        message: 'Migration job not found or you do not have permission to access it'
      });
    }

    // Get queue job status
    const queueStatus = await getJobStatus(job._id.toString());

    res.json({
      success: true,
      data: {
        job,
        queueStatus
      }
    });

  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch migration job'
    });
  }
};

// Get all jobs for a session
export const getSessionJobs = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    // Verify session belongs to user
    const session = await Session.findOne({ sessionId, userId });
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        message: 'Session not found or you do not have permission to access it'
      });
    }

    const jobs = await MigrationJob.find({ sessionId: session._id, userId })
      .populate('sessionId', 'name description')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: jobs
    });

  } catch (error) {
    console.error('Error fetching session jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch session jobs'
    });
  }
};

// Get all jobs for user
export const getUserJobs = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    const query = { userId };
    if (status) {
      query.status = status;
    }

    const jobs = await MigrationJob.find(query)
      .populate('sessionId', 'name description')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await MigrationJob.countDocuments(query);

    res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('Error fetching user jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch user jobs'
    });
  }
};

// Update job
export const updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    const job = await MigrationJob.findOne({ _id: id, userId });
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
        message: 'Migration job not found or you do not have permission to access it'
      });
    }

    // Don't allow updates to running jobs
    if (job.status === 'running') {
      return res.status(400).json({
        success: false,
        error: 'Job running',
        message: 'Cannot update a job that is currently running'
      });
    }

    // Update allowed fields
    const allowedUpdates = ['name', 'description', 'migrationOptions', 'fileFilters', 'customSettings'];
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        job[field] = updates[field];
      }
    });

    await job.save();

    res.json({
      success: true,
      message: 'Job updated successfully',
      data: job
    });

  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to update migration job'
    });
  }
};

// Cancel job
export const cancelJob = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const job = await MigrationJob.findOne({ _id: id, userId });
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
        message: 'Migration job not found or you do not have permission to access it'
      });
    }

    // Only allow cancellation of queued jobs
    if (job.status !== 'queued') {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel job',
        message: 'Only queued jobs can be cancelled'
      });
    }

    job.status = 'cancelled';
    job.endTime = new Date();
    await job.save();

    res.json({
      success: true,
      message: 'Job cancelled successfully',
      data: job
    });

  } catch (error) {
    console.error('Error cancelling job:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to cancel migration job'
    });
  }
};

// Retry failed job
export const retryJob = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const job = await MigrationJob.findOne({ _id: id, userId });
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
        message: 'Migration job not found or you do not have permission to access it'
      });
    }

    // Only allow retry of failed jobs
    if (job.status !== 'failed') {
      return res.status(400).json({
        success: false,
        error: 'Cannot retry job',
        message: 'Only failed jobs can be retried'
      });
    }

    // Retry the job
    await job.retry();

    // Add job back to queue
    const queueJob = await addMigrationJob({
      jobId: job._id.toString(),
      sessionId: job.sessionId.toString(),
      migrationOptions: job.migrationOptions,
      fileFilters: job.fileFilters,
      customSettings: job.customSettings
    });

    res.json({
      success: true,
      message: 'Job retried successfully',
      data: {
        job,
        queueJobId: queueJob.id
      }
    });

  } catch (error) {
    console.error('Error retrying job:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retry migration job'
    });
  }
};

// Get queue statistics
export const getQueueStats = async (req, res) => {
  try {
    const stats = await getQueueStatsFromQueue();
    
    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching queue stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch queue statistics'
    });
  }
};
