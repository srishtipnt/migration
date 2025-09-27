import express from 'express';
import {
  uploadSingleFileToCloudinary,
  getSingleFile,
  downloadSingleFile,
  deleteSingleFile,
  getUserSingleFiles,
  cleanupOrphanedSingleFiles
} from '../controllers/singleFileCloudinaryController.js';
import { upload, handleUploadError } from '../middleware/upload.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Upload single file to both MongoDB and Cloudinary
router.post('/upload', 
  upload.single('file'), // Single file upload
  handleUploadError,
  uploadSingleFileToCloudinary
);

// Get user's single files
router.get('/', getUserSingleFiles);

// Get single file details
router.get('/:id', getSingleFile);

// Download single file
router.get('/:id/download', downloadSingleFile);

// Delete single file
router.delete('/:id', deleteSingleFile);

// Cleanup orphaned single files - delete files uploaded but not committed
router.delete('/cleanup/orphaned', cleanupOrphanedSingleFiles);

export default router;

