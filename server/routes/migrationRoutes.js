import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import migrationAgentService from '../services/MigrationAgentService.js';

const router = express.Router();

/**
 * POST /api/migrate/:sessionId
 * Process a migration command for a specific session
 */
router.post('/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { command, fromLang, toLang } = req.body;
    const userId = req.user.id;

    console.log(`🚀 Migration request for session: ${sessionId}`);
    console.log(`👤 User: ${userId}`);
    console.log(`📝 Command: ${command}`);
    console.log(`🔄 From Language: ${fromLang}`);
    console.log(`🔄 To Language: ${toLang}`);

    // Validate input - either command or fromLang/toLang required
    if (!command && (!fromLang || !toLang)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        message: 'Either command or fromLang/toLang is required'
      });
    }

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid session ID',
        message: 'Session ID is required'
      });
    }

    // Prepare options for enhanced command generation
    const options = {};
    if (fromLang && toLang) {
      options.fromLang = fromLang;
      options.toLang = toLang;
    }

    // Process the migration command using RAG with enhanced command generation
    const result = await migrationAgentService.processMigrationCommand(
      sessionId, 
      command || 'Convert code', // Fallback command if using fromLang/toLang
      userId,
      options
    );

    if (result.success) {
      console.log(`✅ Migration completed for session: ${sessionId}`);
      res.json({
        success: true,
        data: result.result,
        metadata: {
          sessionId: sessionId,
          chunksUsed: result.chunksUsed,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      console.log(`❌ Migration failed for session: ${sessionId} - ${result.error}`);
      res.status(400).json({
        success: false,
        error: result.error,
        message: result.message
      });
    }

  } catch (error) {
    console.error('❌ Migration API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred during migration processing'
    });
  }
});

/**
 * GET /api/migrate/test
 * Test the migration agent service
 */
router.get('/test', authenticateToken, async (req, res) => {
  try {
    const testResult = await migrationAgentService.testConnection();
    
    if (testResult.success) {
      res.json({
        success: true,
        message: 'Migration agent is ready',
        data: testResult
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Migration agent test failed',
        message: testResult.error
      });
    }
  } catch (error) {
    console.error('❌ Migration test error:', error);
    res.status(500).json({
      success: false,
      error: 'Migration agent test failed',
      message: error.message
    });
  }
});

/**
 * GET /api/migrate/sessions/:sessionId/chunks
 * Get available chunks for a session (for debugging)
 */
router.get('/sessions/:sessionId/chunks', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const CodeChunk = (await import('../models/CodeChunk.js')).default;
    const chunks = await CodeChunk.find({ sessionId, userId });

    res.json({
      success: true,
      data: {
        sessionId,
        totalChunks: chunks.length,
        chunks: chunks.map(chunk => ({
          id: chunk._id,
          filename: chunk.filename,
          type: chunk.type,
          language: chunk.language,
          content: chunk.content.substring(0, 200) + '...', // Truncated for preview
          hasEmbedding: !!chunk.embedding
        }))
      }
    });
  } catch (error) {
    console.error('❌ Get chunks error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve chunks',
      message: error.message
    });
  }
});

/**
 * POST /api/migrate/test/:sessionId
 * Test migration without authentication (for debugging)
 */
router.post('/test/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { fromLang, toLang } = req.body;
    const userId = '68d6a0caedcd958a1de3d682'; // Dev user ID from auth middleware - matches the user with chunks

    console.log(`🧪 Test migration for session: ${sessionId}`);

    // Process the migration command using RAG with enhanced command generation
    const result = await migrationAgentService.processMigrationCommand(
      sessionId, 
      'Convert code', // Fallback command if using fromLang/toLang
      userId,
      { fromLang, toLang }
    );

    if (result.success) {
      console.log(`✅ Test migration successful: ${result.chunksUsed} chunks used`);
      res.json({
        success: true,
        data: result.result,
        metadata: {
          sessionId: result.sessionId,
          chunksUsed: result.chunksUsed,
          command: result.command,
          embeddingDimensions: result.embeddingDimensions
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Test migration failed',
        message: result.message || 'Unknown error'
      });
    }
  } catch (error) {
    console.error('❌ Test migration error:', error);
    res.status(500).json({
      success: false,
      error: 'Test migration failed',
      message: error.message
    });
  }
});

/**
 * GET /api/migrate/original-files/:sessionId
 * Get original file contents for diff viewing
 */
router.get('/original-files/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    console.log(`📁 Fetching original files for session: ${sessionId}`);

    // Get chunks for this session - try multiple approaches
    const CodeChunk = (await import('../models/CodeChunk.js')).default;
    let chunks = [];
    
    // First try with hardcoded user ID
    try {
      const userId = '68d6a0caedcd958a1de3d682';
      chunks = await CodeChunk.find({ 
        sessionId: sessionId,
        userId: userId 
      }).lean();
      console.log(`📊 Found ${chunks.length} chunks with userId filter`);
    } catch (dbError) {
      console.error('❌ Database query with userId failed:', dbError.message);
    }
    
    // If no chunks found, try without userId filter
    if (chunks.length === 0) {
      try {
        chunks = await CodeChunk.find({ 
          sessionId: sessionId
        }).lean();
        console.log(`📊 Found ${chunks.length} chunks without userId filter`);
      } catch (dbError) {
        console.error('❌ Database query without userId failed:', dbError.message);
      }
    }
    
    // If still no chunks, try to get files from FileStorage
    if (chunks.length === 0) {
      console.log('📁 No chunks found, trying to get files from FileStorage...');
      const FileStorage = (await import('../models/FileStorage.js')).default;
      const files = await FileStorage.find({ sessionId: sessionId });
      console.log(`📊 Found ${files.length} files in FileStorage`);
      
      if (files.length > 0) {
        // Create filesMap from FileStorage
        const filesMap = {};
        for (const file of files) {
          try {
            // Try to download and read the file content
            const axios = (await import('axios')).default;
            const response = await axios.get(file.secure_url, {
              responseType: 'text',
              timeout: 30000
            });
            filesMap[file.originalFilename] = response.data;
            console.log(`✅ Downloaded content for ${file.originalFilename}`);
          } catch (downloadError) {
            console.error(`❌ Failed to download ${file.originalFilename}:`, downloadError.message);
            filesMap[file.originalFilename] = ''; // Empty content as fallback
          }
        }
        
        return res.json({
          success: true,
          data: filesMap
        });
      }
    }

    // Group chunks by filename
    const filesMap = {};
    chunks.forEach(chunk => {
      const filename = chunk.fileName || chunk.filename || 'unknown.js';
      if (!filesMap[filename]) {
        filesMap[filename] = '';
      }
      // Concatenate all chunks for the same file
      filesMap[filename] += chunk.content + '\n';
    });

    console.log(`📊 Created filesMap with ${Object.keys(filesMap).length} files`);

    res.json({
      success: true,
      data: filesMap
    });
  } catch (error) {
    console.error('❌ Error fetching original files:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch original files',
      message: error.message
    });
  }
});

/**
 * GET /api/migrate/chunks-status/:sessionId
 * Check chunks status for a session
 */
router.get('/chunks-status/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    console.log(`🔍 Checking chunks status for session: ${sessionId}`);
    
    // Get chunk count for this session - try without userId first, then with different user IDs
    const CodeChunk = (await import('../models/CodeChunk.js')).default;
    
    // First, try to find chunks without userId filter
    let chunksCount = await CodeChunk.countDocuments({ 
      sessionId: sessionId
    });
    
    console.log(`📊 Found ${chunksCount} chunks for session ${sessionId} (without userId filter)`);
    
    // If no chunks found, try with the hardcoded user ID
    if (chunksCount === 0) {
      const userId = '68d6a0caedcd958a1de3d682'; // Dev user ID
      chunksCount = await CodeChunk.countDocuments({ 
        sessionId: sessionId,
        userId: userId 
      });
      console.log(`📊 Found ${chunksCount} chunks for session ${sessionId} (with hardcoded userId)`);
    }
    
    // If still no chunks, try to find any chunks for this session regardless of userId
    if (chunksCount === 0) {
      const allChunks = await CodeChunk.find({ sessionId: sessionId });
      chunksCount = allChunks.length;
      console.log(`📊 Found ${chunksCount} chunks for session ${sessionId} (any userId)`);
      
      if (chunksCount > 0) {
        console.log(`📊 Chunk user IDs:`, allChunks.map(c => c.userId));
      } else {
        // Check if there are any migration jobs for this session
        const MigrationJob = (await import('../models/MigrationJob.js')).default;
        const jobs = await MigrationJob.find({ sessionId: sessionId });
        console.log(`📊 Found ${jobs.length} migration jobs for session ${sessionId}`);
        
        if (jobs.length > 0) {
          jobs.forEach(job => {
            console.log(`📊 Job ${job._id}: status=${job.status}, totalFiles=${job.totalFiles}, totalChunks=${job.totalChunks}`);
          });
        }
        
        // Check if there are any files for this session
        const FileStorage = (await import('../models/FileStorage.js')).default;
        const files = await FileStorage.find({ sessionId: sessionId });
        console.log(`📊 Found ${files.length} files for session ${sessionId}`);
        
        if (files.length > 0) {
          files.forEach(file => {
            console.log(`📊 File ${file.originalFilename}: size=${file.fileSize}, format=${file.format}`);
          });
        }
      }
    }
    
    res.json({ 
      success: true, 
      chunksCount: chunksCount,
      sessionId: sessionId,
      ready: chunksCount > 0
    });
  } catch (error) {
    console.error('Error checking chunks status:', error);
    res.status(500).json({ success: false, error: 'Failed to check chunks status' });
  }
});

/**
 * POST /api/migrate/trigger-chunking/:sessionId
 * Manually trigger chunking for a session
 */
router.post('/trigger-chunking/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    console.log(`🔧 Manually triggering chunking for session: ${sessionId}`);
    
    // Check if there are files for this session
    const FileStorage = (await import('../models/FileStorage.js')).default;
    const files = await FileStorage.find({ sessionId: sessionId });
    
    if (files.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No files found for this session',
        message: 'No files found to chunk'
      });
    }
    
    console.log(`📊 Found ${files.length} files for session ${sessionId}`);
    
    // Check if there are already chunks
    const CodeChunk = (await import('../models/CodeChunk.js')).default;
    const existingChunks = await CodeChunk.countDocuments({ sessionId: sessionId });
    
    if (existingChunks > 0) {
      return res.json({
        success: true,
        message: `Session already has ${existingChunks} chunks`,
        chunksCount: existingChunks
      });
    }
    
    // Trigger chunking
    const { triggerAutomaticChunking } = await import('../controllers/zipCloudinaryController.js');
    const userId = files[0].userId; // Get userId from first file
    
    // Find or create migration job
    const MigrationJob = (await import('../models/MigrationJob.js')).default;
    let job = await MigrationJob.findOne({ sessionId: sessionId });
    
    if (!job) {
      job = await MigrationJob.createJob(
        sessionId,
        userId,
        { originalName: 'Manual trigger', size: 0 },
        files.length
      );
      console.log(`📋 Created migration job: ${job._id}`);
    }
    
    // Trigger chunking asynchronously
    triggerAutomaticChunking(sessionId, userId, job._id).catch(error => {
      console.error('❌ Manual chunking failed:', error);
    });
    
    res.json({
      success: true,
      message: 'Chunking triggered successfully',
      sessionId: sessionId,
      filesCount: files.length,
      jobId: job._id
    });
    
  } catch (error) {
    console.error('Error triggering chunking:', error);
    res.status(500).json({ success: false, error: 'Failed to trigger chunking' });
  }
});

export default router;
