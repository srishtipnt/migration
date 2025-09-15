import express from 'express';
import {
  uploadFiles,
  getUserFiles,
  getFile,
  downloadFile,
  deleteFile,
  createZipArchive,
  getFileStats
} from '../controllers/fileController.js';
import { upload, handleUploadError } from '../middleware/upload.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Upload files (no session needed - uses JWT user ID)
router.post('/upload', 
  upload.array('files', 100), // Max 100 files
  handleUploadError,
  uploadFiles
);

// Get user's files
router.get('/', getUserFiles);

// Get single file
router.get('/:id', getFile);

// Download file
router.get('/:id/download', downloadFile);

// Delete file
router.delete('/:id', deleteFile);

// Create ZIP archive of user's files
router.get('/archive/zip', createZipArchive);

// Get file statistics
router.get('/stats/overview', getFileStats);

export default router;