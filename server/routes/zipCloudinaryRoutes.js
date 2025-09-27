import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { upload, handleUploadError } from '../middleware/upload.js';
import {
  uploadZipToCloudinary,
  getZipSessionFiles,
  deleteZipSession,
  getUserCloudinaryFiles,
  deleteAllUserFiles,
  cleanupOrphanedSession,
  cleanupAllOrphanedFiles,
  getChunkingStatus
} from '../controllers/zipCloudinaryController.js';

const router = express.Router();

// Test endpoint without authentication (for debugging)
router.post('/test-upload',
  upload.single('zipFile'),
  handleUploadError,
  (req, res) => {
    console.log('Test upload endpoint hit');
    console.log('Files:', req.files);
    console.log('File:', req.file);
    console.log('Body:', req.body);
    
    res.json({
      success: true,
      message: 'Test endpoint working',
      data: {
        file: req.file ? {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size
        } : null,
        body: req.body
      }
    });
  }
);

// Apply authentication to all routes
router.use(authenticateToken);

// Upload ZIP file to Cloudinary with structured storage
router.post('/upload-zip',
  upload.single('zipFile'), // Single ZIP file upload
  handleUploadError,
  uploadZipToCloudinary
);

// Get all Cloudinary files for the authenticated user
router.get('/files', getUserCloudinaryFiles);

// Get files from a specific ZIP session
router.get('/session/:sessionId', getZipSessionFiles);

// Delete entire ZIP session and all associated files
router.delete('/session/:sessionId', deleteZipSession);

// Delete all Cloudinary files for the authenticated user
router.delete('/files/all', deleteAllUserFiles);

// Cleanup orphaned files - delete files from current session when user abandons upload
router.delete('/cleanup/session/:sessionId', cleanupOrphanedSession);

// Cleanup orphaned files - delete all files from current user's incomplete sessions
router.delete('/cleanup/orphaned', cleanupAllOrphanedFiles);

// Check chunking status for a session
router.get('/chunking-status/:sessionId', getChunkingStatus);

export default router;