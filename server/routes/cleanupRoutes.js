import express from 'express';
import cleanupService from '../services/CleanupService.js';

const router = express.Router();

/**
 * GET /api/cleanup/stats
 * Get cleanup statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await cleanupService.getCleanupStats();
    
    if (!stats) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get cleanup statistics'
      });
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting cleanup stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * POST /api/cleanup/trigger
 * Manually trigger cleanup
 */
router.post('/trigger', async (req, res) => {
  try {
    console.log('🧹 Manual cleanup triggered via API');
    
    // Run cleanup in background
    cleanupService.triggerCleanup().catch(error => {
      console.error('❌ Manual cleanup failed:', error);
    });

    res.json({
      success: true,
      message: 'Cleanup triggered successfully',
      data: {
        triggeredAt: new Date().toISOString(),
        note: 'Cleanup is running in the background. Check logs for progress.'
      }
    });
  } catch (error) {
    console.error('Error triggering cleanup:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

export default router;
