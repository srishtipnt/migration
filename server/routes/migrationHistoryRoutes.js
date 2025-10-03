const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const MigrationJob = require('../models/MigrationJob');
const CodeChunk = require('../models/CodeChunk');

// Get migration history for a user
router.get('/history/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, status, fromLanguage, toLanguage } = req.query;

    // Build filter object
    const filter = { userId };
    if (status) filter.status = status;
    if (fromLanguage) filter.fromLanguage = fromLanguage;
    if (toLanguage) filter.toLanguage = toLanguage;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get migration jobs with pagination
    const migrations = await MigrationJob.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const totalCount = await MigrationJob.countDocuments(filter);

    // Enhance each migration with additional data
    const enhancedMigrations = await Promise.all(
      migrations.map(async (migration) => {
        // Get chunks count for this migration
        const chunksCount = await CodeChunk.countDocuments({ 
          sessionId: migration.sessionId,
          userId: migration.userId 
        });

        // Calculate file size (approximate)
        const fileSize = migration.originalFiles 
          ? Object.values(migration.originalFiles).join('').length 
          : 0;

        // Calculate migration time
        const migrationTime = migration.completedAt && migration.startedAt
          ? Math.round((new Date(migration.completedAt) - new Date(migration.startedAt)) / 1000)
          : 0;

        return {
          id: migration._id.toString(),
          sessionId: migration.sessionId,
          userId: migration.userId,
          fromLanguage: migration.fromLanguage,
          toLanguage: migration.toLanguage,
          originalFilename: migration.originalFilename || 'Unknown',
          migratedFilename: migration.migratedFilename || 'Unknown',
          createdAt: migration.createdAt,
          status: migration.status,
          fileSize,
          migrationTime,
          chunksCount,
          summary: migration.summary || 'No summary available',
          changes: migration.changes || [],
          isDemo: migration.isDemo || false,
          originalFiles: migration.originalFiles,
          migratedFiles: migration.migratedFiles
        };
      })
    );

    res.json({
      success: true,
      data: enhancedMigrations,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalCount,
        hasNext: skip + parseInt(limit) < totalCount,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Error fetching migration history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch migration history',
      details: error.message
    });
  }
});

// Get detailed migration information
router.get('/details/:sessionId', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;

    // Get migration job
    const migration = await MigrationJob.findOne({ 
      sessionId, 
      userId 
    }).lean();

    if (!migration) {
      return res.status(404).json({
        success: false,
        error: 'Migration not found'
      });
    }

    // Get all chunks for this migration
    const chunks = await CodeChunk.find({ 
      sessionId, 
      userId 
    }).lean();

    res.json({
      success: true,
      data: {
        migration,
        chunks: chunks.map(chunk => ({
          id: chunk._id.toString(),
          filename: chunk.filename,
          type: chunk.type,
          language: chunk.language,
          content: chunk.content.substring(0, 500) + '...', // Truncate for overview
          fullContent: chunk.content,
          createdAt: chunk.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching migration details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch migration details',
      details: error.message
    });
  }
});

// Download migration result
router.get('/download/:sessionId/:filename', auth, async (req, res) => {
  try {
    const { sessionId, filename } = req.params;
    const userId = req.user?.id;

    // Get migration job
    const migration = await MigrationJob.findOne({ 
      sessionId, 
      userId 
    }).lean();

    if (!migration) {
      return res.status(404).json({
        success: false,
        error: 'Migration not found'
      });
    }

    // Get the specific file content
    let fileContent = '';
    if (migration.migratedFiles && migration.migratedFiles[filename]) {
      fileContent = migration.migratedFiles[filename];
    } else {
      // Try to get from chunks
      const chunk = await CodeChunk.findOne({ 
        sessionId, 
        userId,
        filename 
      });

      if (chunk) {
        fileContent = chunk.content;
      } else {
        return res.status(404).json({
          success: false,
          error: 'File not found in migration results'
        });
      }
    }

    // Set appropriate headers for download
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength(fileContent, 'utf8'));

    res.send(fileContent);
  } catch (error) {
    console.error('Error downloading migration result:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download migration result',
      details: error.message
    });
  }
});

// Delete migration
router.delete('/:sessionId', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;

    // Delete migration job
    const migrationResult = await MigrationJob.deleteOne({ 
      sessionId, 
      userId 
    });

    // Delete associated chunks
    const chunksResult = await CodeChunk.deleteMany({ 
      sessionId, 
      userId 
    });

    if (migrationResult.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Migration not found'
      });
    }

    res.json({
      success: true,
      message: 'Migration deleted successfully',
      data: {
        migrationDeleted: migrationResult.deletedCount,
        chunksDeleted: chunksResult.deletedCount
      }
    });
  } catch (error) {
    console.error('Error deleting migration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete migration',
      details: error.message
    });
  }
});

// Get migration statistics
router.get('/stats/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Get basic statistics
    const totalMigrations = await MigrationJob.countDocuments({ userId });
    const completedMigrations = await MigrationJob.countDocuments({ 
      userId, 
      status: 'completed' 
    });
    const failedMigrations = await MigrationJob.countDocuments({ 
      userId, 
      status: 'failed' 
    });
    const demoMigrations = await MigrationJob.countDocuments({ 
      userId, 
      isDemo: true 
    });

    // Get language usage statistics
    const languageStats = await MigrationJob.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: { from: '$fromLanguage', to: '$toLanguage' },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Get recent activity
    const recentActivity = await MigrationJob.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('fromLanguage toLanguage status createdAt')
      .lean();

    res.json({
      success: true,
      data: {
        totalMigrations,
        completedMigrations,
        failedMigrations,
        demoMigrations,
        successRate: totalMigrations > 0 ? (completedMigrations / totalMigrations * 100).toFixed(1) : 0,
        languageStats,
        recentActivity
      }
    });
  } catch (error) {
    console.error('Error fetching migration statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch migration statistics',
      details: error.message
    });
  }
});

module.exports = router;
