import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import cloudinary from 'cloudinary';
import FileStorage from '../models/FileStorage.js';
import MigrationJob from '../models/MigrationJob.js';

const router = express.Router();

/**
 * POST /api/save-migration/:sessionId
 * Save migration results as new files
 */
router.post('/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { migratedCode, filename, migratedFilename } = req.body;
    const userId = req.user.id;

    console.log(`💾 Saving migration result for session: ${sessionId}`);

    // Upload migrated code to Cloudinary
    const uploadResult = await cloudinary.v2.uploader.upload(
      migratedCode,
      {
        resource_type: 'raw',
        public_id: `migrateapp/users/${userId}/migrated/${Date.now()}_${migratedFilename}`,
        folder: `migrateapp/users/${userId}/migrated`
      }
    );

    // Save to MongoDB
    const fileRecord = new FileStorage({
      originalFilename: migratedFilename,
      fileSize: migratedCode.length,
      mimeType: 'text/plain',
      storageType: 'cloudinary',
      public_id: uploadResult.public_id,
      secure_url: uploadResult.secure_url,
      sessionId: sessionId,
      userId: userId,
      isMigrated: true,
      originalFile: filename
    });

    await fileRecord.save();

    console.log(`✅ Migration result saved: ${migratedFilename}`);

    res.json({
      success: true,
      message: 'Migration result saved successfully',
      data: {
        file: {
          id: fileRecord._id,
          originalFilename: migratedFilename,
          fileSize: migratedCode.length,
          uploadedAt: fileRecord.createdAt,
          storageType: 'cloudinary',
          cloudinary: {
            public_id: uploadResult.public_id,
            secure_url: uploadResult.secure_url
          }
        }
      }
    });

  } catch (error) {
    console.error('❌ Error saving migration result:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save migration result',
      message: error.message
    });
  }
});

export default router;
