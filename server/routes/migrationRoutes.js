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
    const userId = '68d6a0caedcd958a1de3d682'; // Hardcoded for testing

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

export default router;
