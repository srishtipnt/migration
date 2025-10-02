import express from 'express';
import AutoChunkingService from '../services/AutoChunkingService.js';
import connectDB from '../config/database.js';
import MigrationJob from '../models/MigrationJob.js';
import CodeChunk from '../models/CodeChunk.js';

const router = express.Router();
const autoChunkingService = new AutoChunkingService();

// Trigger automatic chunking for all pending jobs
router.post('/trigger-chunking', async (req, res) => {
  try {
    console.log('🚀 Manual trigger for automatic chunking');
    
    await autoChunkingService.processPendingJobs();
    
    res.json({
      success: true,
      message: 'Automatic chunking triggered successfully'
    });
  } catch (error) {
    console.error('❌ Error triggering chunking:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Check chunking status
router.get('/status', async (req, res) => {
  try {
    await connectDB();
    
    const pendingJobs = await MigrationJob.countDocuments({ status: 'pending' });
    const processingJobs = await MigrationJob.countDocuments({ status: 'processing' });
    const readyJobs = await MigrationJob.countDocuments({ status: 'ready' });
    const totalChunks = await CodeChunk.countDocuments();
    
    res.json({
      success: true,
      data: {
        jobs: {
          pending: pendingJobs,
          processing: processingJobs,
          ready: readyJobs
        },
        chunks: {
          total: totalChunks
        },
        autoChunking: {
          isProcessing: autoChunkingService.isProcessing
        }
      }
    });
  } catch (error) {
    console.error('❌ Error checking status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Process specific session
router.post('/process-session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    await connectDB();
    const job = await MigrationJob.findOne({ sessionId });
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Migration job not found'
      });
    }
    
    console.log(`🚀 Processing specific session: ${sessionId}`);
    await job.updateStatus('processing');
    await autoChunkingService.processJob(job);
    await job.updateStatus('ready');
    
    res.json({
      success: true,
      message: `Session ${sessionId} processed successfully`
    });
  } catch (error) {
    console.error('❌ Error processing session:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;







