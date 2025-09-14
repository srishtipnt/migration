import express from 'express';
import {
  uploadFiles,
  getFile,
  downloadFile,
  getSessionFiles,
  deleteFile,
  createZipArchive,
  getFileStats
} from '../controllers/fileController.js';
import { upload, handleUploadError, validateSession, checkUserPermissions } from '../middleware/upload.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Upload files to session
router.post('/upload/:sessionId', 
  validateSession,
  checkUserPermissions,
  upload.array('files', 100), // Max 100 files
  handleUploadError,
  uploadFiles
);

// Get file by ID
router.get('/:id', getFile);

// Download file by ID
router.get('/:id/download', downloadFile);

// Get all files for a session
router.get('/session/:sessionId', getSessionFiles);

// Delete file by ID
router.delete('/:id', deleteFile);

// Create ZIP archive of session files
router.get('/session/:sessionId/archive', createZipArchive);

// Get file statistics for user
router.get('/stats/overview', getFileStats);

export default router;

