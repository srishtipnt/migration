import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import FileStorage from '../models/FileStorage.js';
import MigrationJob from '../models/MigrationJob.js';
import { generateFileName } from '../middleware/upload.js';

// Helper function to check if file is a code file
function isCodeFile(extension) {
  const codeExtensions = [
    // Core languages
    '.js', '.ts', '.jsx', '.tsx', '.py', '.py2', '.py3', '.java', '.cpp', '.c', '.cs', 
    '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala',
    // Database files
    '.sql', '.sqlite', '.db', '.json', '.cql',
    // Objective-C
    '.m', '.mm', '.h',
    // Frontend frameworks
    '.vue', '.html', '.htm'
  ];
  return codeExtensions.includes(extension);
}

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dwpj1cr3e',
  api_key: process.env.CLOUDINARY_API_KEY || '252216879214925',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'vQzTI2sfVrJTd1-g_Ff4vuSiMTY',
  secure: true
});

console.log('☁️  Single File Cloudinary Controller configured');
console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME || 'dwpj1cr3e');

/**
 * Upload single file to both MongoDB and Cloudinary
 */
export const uploadSingleFileToCloudinary = async (req, res) => {
  try {
    console.log('🚀 Single file upload endpoint hit');
    console.log('📋 Request user:', req.user);
    console.log('📋 Request file:', req.file);
    
    const file = req.file; // Single file upload
    const userId = req.user.id;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
        message: 'Please select a file to upload'
      });
    }

    // Validate file type - prevent ZIP files in single file upload
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const isZipFile = fileExtension === '.zip' || file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed';
    
    if (isZipFile) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file type for single file upload',
        message: 'ZIP files are not allowed in single file upload. Please use the ZIP upload section instead.',
        receivedFileType: fileExtension,
        receivedMimeType: file.mimetype
      });
    }

    console.log(`📁 Processing file: ${file.originalname} for user: ${userId}`);
    console.log(`📁 File path: ${file.path}`);
    console.log(`📁 File size: ${file.size}`);
    console.log(`📁 File type: ${file.mimetype}`);

    // Generate unique file identifier
    const fileId = crypto.randomBytes(8).toString('hex');
    const timestamp = Date.now();
    
    // Create Cloudinary path structure
    const cloudinaryPath = `migrateapp/users/${userId}/files/${timestamp}_${fileId}`;
    
    console.log(`☁️  Cloudinary path: ${cloudinaryPath}`);

    // Upload to Cloudinary
    let cloudinaryResult;
    try {
      console.log(`☁️  Uploading to Cloudinary...`);
      
      // Determine resource type based on file type
      let resourceType = 'raw';
      
      // Force code files to be uploaded as raw files regardless of MIME type
      const codeExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.m', '.mm', '.h', '.sql', '.sqlite', '.db', '.json', '.cql'];
      const isCodeFile = codeExtensions.includes(fileExtension.toLowerCase());
      
      if (isCodeFile) {
        resourceType = 'raw'; // Force code files to be raw
        console.log(`🔧 Forcing code file ${file.originalname} to be uploaded as raw file`);
      } else if (file.mimetype.startsWith('image/')) {
        resourceType = 'image';
      } else if (file.mimetype.startsWith('video/') && !isCodeFile) {
        resourceType = 'video';
      }

      cloudinaryResult = await cloudinary.uploader.upload(file.path, {
        public_id: cloudinaryPath,
        resource_type: resourceType,
        folder: `migrateapp/users/${userId}/files`,
        use_filename: false,
        unique_filename: true,
        overwrite: false,
        tags: [`user-${userId}`, 'single-file', 'migrateapp']
      });

      console.log(`✅ Cloudinary upload successful:`, {
        public_id: cloudinaryResult.public_id,
        secure_url: cloudinaryResult.secure_url,
        resource_type: cloudinaryResult.resource_type,
        bytes: cloudinaryResult.bytes
      });

    } catch (cloudinaryError) {
      console.error(`❌ Cloudinary upload error:`, cloudinaryError);
      return res.status(500).json({
        success: false,
        error: 'Cloudinary upload failed',
        message: `Failed to upload file to cloud storage: ${cloudinaryError.message}`
      });
    }

    // Get file extension for format detection
    const extension = path.extname(file.originalname).toLowerCase();
    const format = extension.replace('.', '') || 'unknown';

    // Determine correct MIME type for code files
    let correctMimeType = file.mimetype;
    if (isCodeFile) {
      // Override incorrect MIME types for code files
      if (extension === '.ts' || extension === '.tsx') {
        correctMimeType = 'text/typescript';
      } else if (extension === '.js' || extension === '.jsx') {
        correctMimeType = 'text/javascript';
      } else if (extension === '.py') {
        correctMimeType = 'text/x-python';
      } else if (extension === '.java') {
        correctMimeType = 'text/x-java-source';
      } else if (extension === '.cpp' || extension === '.c') {
        correctMimeType = 'text/x-c++src';
      } else if (extension === '.cs') {
        correctMimeType = 'text/x-csharp';
      } else if (extension === '.php') {
        correctMimeType = 'text/x-php';
      } else if (extension === '.rb') {
        correctMimeType = 'text/x-ruby';
      } else if (extension === '.go') {
        correctMimeType = 'text/x-go';
      } else if (extension === '.rs') {
        correctMimeType = 'text/x-rust';
      } else if (extension === '.swift') {
        correctMimeType = 'text/x-swift';
      } else if (extension === '.kt') {
        correctMimeType = 'text/x-kotlin';
      } else if (extension === '.m' || extension === '.mm') {
        correctMimeType = 'text/x-objc';
      } else if (extension === '.sql') {
        correctMimeType = 'application/sql';
      } else if (extension === '.sqlite' || extension === '.db') {
        correctMimeType = 'application/x-sqlite3';
      } else if (extension === '.json') {
        correctMimeType = 'application/json';
      } else if (extension === '.cql') {
        correctMimeType = 'text/plain';
      } else {
        correctMimeType = 'text/plain';
      }
      console.log(`🔧 Corrected MIME type for ${file.originalname}: ${file.mimetype} → ${correctMimeType}`);
    }

    // Create a session for this single file so the background processor can pick it up
    const sessionId = `single-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;

    // Create file record for MongoDB
    const fileRecord = new FileStorage({
      userId: new mongoose.Types.ObjectId(userId),
      originalFilename: file.originalname,
      fileSize: file.size,
      mimeType: correctMimeType,
      format: format,
      folderPath: '',
      relativePath: file.originalname,
      uploadedAt: new Date(),
      
      // Cloudinary-specific fields
      storageType: 'cloudinary',
      public_id: cloudinaryResult.public_id,
      secure_url: cloudinaryResult.secure_url,
      resource_type: cloudinaryResult.resource_type || 'raw',
      bytes: cloudinaryResult.bytes || file.size,
      
      // Application-specific fields
      sessionId: sessionId,
      isExtractedFromZip: false,
      zipFileName: null,
      fileType: 'single-file',
      
      // Store complete Cloudinary response as metadata
      metadata: {
        cloudinary: cloudinaryResult,
        uploadMethod: 'single-file',
        uploadedAt: new Date(),
        originalPath: file.path
      }
    });

    // Save to MongoDB
    try {
      console.log(`💾 Saving to MongoDB...`);
      const savedRecord = await fileRecord.save();
      console.log(`✅ MongoDB save successful: ${savedRecord._id}`);

      // Create a migration job for this single file (pending)
      let migrationJob = null;
      try {
        migrationJob = await MigrationJob.createJob(
          sessionId,
          userId,
          {
            public_id: savedRecord.public_id,
            secure_url: savedRecord.secure_url,
            originalName: savedRecord.originalFilename,
            size: savedRecord.fileSize
          },
          1
        );
        console.log(`🧾 Created migration job for single file: ${migrationJob._id}`);
        
        // Trigger automatic chunking for single files (only for code files)
        if (migrationJob && isCodeFile(extension)) {
          console.log(`🚀 Triggering automatic chunking for single file: ${savedRecord.originalFilename}`);
          // Import the chunking function
          const { triggerAutomaticChunking } = await import('./zipCloudinaryController.js');
          // Trigger chunking asynchronously (don't wait for it)
          triggerAutomaticChunking(sessionId, userId, migrationJob._id).catch(error => {
            console.error('❌ Single file chunking failed:', error);
          });
        } else {
          console.log(`ℹ️ Non-code file uploaded: ${savedRecord.originalFilename} (${extension}) - Background processor will handle it`);
          // For non-code files, let the background processor handle it gracefully
        }
      } catch (jobErr) {
        console.error('❌ Failed to create migration job for single file:', jobErr);
      }

      // Clean up temporary file
      try {
        await fs.remove(file.path);
        console.log(`🗑️  Temporary file cleaned up: ${file.path}`);
      } catch (cleanupError) {
        console.warn(`⚠️  Failed to clean up temporary file: ${cleanupError.message}`);
      }

      // Prepare response
      const responseData = {
        id: savedRecord._id,
        originalFilename: savedRecord.originalFilename,
        fileSize: savedRecord.fileSize,
        mimeType: savedRecord.mimeType,
        format: savedRecord.format,
        uploadedAt: savedRecord.uploadedAt,
        storageType: savedRecord.storageType,
        sessionId: sessionId,
        cloudinary: {
          public_id: savedRecord.public_id,
          secure_url: savedRecord.secure_url,
          resource_type: savedRecord.resource_type,
          bytes: savedRecord.bytes
        }
      };

      res.status(201).json({
        success: true,
        message: 'File uploaded successfully to both MongoDB and Cloudinary',
        data: {
          file: responseData,
          job: migrationJob ? { id: migrationJob._id, status: migrationJob.status, sessionId: migrationJob.sessionId } : null,
          uploadStats: {
            cloudinaryUploaded: true,
            mongoDBSaved: true,
            temporaryFileCleaned: true,
            totalSize: file.size
          }
        }
      });

    } catch (dbError) {
      console.error(`❌ MongoDB save error:`, dbError);
      
      // Try to clean up Cloudinary resource if database save fails
      try {
        await cloudinary.api.delete_resources([cloudinaryResult.public_id], {
          resource_type: cloudinaryResult.resource_type || 'raw'
        });
        console.log(`🗑️  Cloudinary resource cleaned up after DB failure`);
      } catch (cleanupError) {
        console.error(`❌ Failed to clean up Cloudinary resource:`, cleanupError);
      }

      return res.status(500).json({
        success: false,
        error: 'Database save failed',
        message: `Failed to save file metadata to database: ${dbError.message}`
      });
    }

  } catch (error) {
    console.error('Single file upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Upload failed',
      message: error.message
    });
  }
};

/**
 * Get single file from Cloudinary (if stored there) or local storage
 */
export const getSingleFile = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    console.log(`📁 Getting file ${id} for user ${userId}`);

    const file = await FileStorage.findOne({ _id: id, userId });
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: 'File does not exist or you do not have permission to access it'
      });
    }

    // If file is stored in Cloudinary, return the secure URL
    if (file.storageType === 'cloudinary' && file.secure_url) {
      return res.json({
        success: true,
        data: {
          file: {
            id: file._id,
            originalFilename: file.originalFilename,
            fileSize: file.fileSize,
            mimeType: file.mimeType,
            format: file.format,
            uploadedAt: file.uploadedAt,
            storageType: file.storageType,
            downloadUrl: file.secure_url,
            cloudinary: {
              public_id: file.public_id,
              secure_url: file.secure_url,
              resource_type: file.resource_type,
              bytes: file.bytes
            }
          }
        }
      });
    }

    // If file is stored locally, check if it exists
    if (file.storageType === 'local' && file.filePath) {
      if (!fs.existsSync(file.filePath)) {
        return res.status(404).json({
          success: false,
          error: 'File not found',
          message: 'File has been deleted from local storage'
        });
      }

      return res.json({
        success: true,
        data: {
          file: {
            id: file._id,
            originalFilename: file.originalFilename,
            fileSize: file.fileSize,
            mimeType: file.mimeType,
            format: file.format,
            uploadedAt: file.uploadedAt,
            storageType: file.storageType,
            filePath: file.filePath
          }
        }
      });
    }

    return res.status(404).json({
      success: false,
      error: 'File not found',
      message: 'File storage information is incomplete'
    });

  } catch (error) {
    console.error('Get single file error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get file',
      message: error.message
    });
  }
};

/**
 * Download single file from Cloudinary or local storage
 */
export const downloadSingleFile = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    console.log(`📥 Downloading file ${id} for user ${userId}`);

    const file = await FileStorage.findOne({ _id: id, userId });
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: 'File does not exist or you do not have permission to access it'
      });
    }

    // If file is stored in Cloudinary, redirect to secure URL
    if (file.storageType === 'cloudinary' && file.secure_url) {
      return res.redirect(file.secure_url);
    }

    // If file is stored locally, serve the file
    if (file.storageType === 'local' && file.filePath) {
      if (!fs.existsSync(file.filePath)) {
        return res.status(404).json({
          success: false,
          error: 'File not found',
          message: 'File has been deleted from local storage'
        });
      }

      return res.download(file.filePath, file.originalFilename);
    }

    return res.status(404).json({
      success: false,
      error: 'File not found',
      message: 'File storage information is incomplete'
    });

  } catch (error) {
    console.error('Download single file error:', error);
    res.status(500).json({
      success: false,
      error: 'Download failed',
      message: error.message
    });
  }
};

/**
 * Delete single file from both MongoDB and Cloudinary
 */
export const deleteSingleFile = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    console.log(`🗑️  Deleting file ${id} for user ${userId}`);

    const file = await FileStorage.findOne({ _id: id, userId });
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: 'File does not exist or you do not have permission to access it'
      });
    }

    let cloudinaryDeleteResult = null;

    // Handle Cloudinary files
    if (file.storageType === 'cloudinary' && file.public_id) {
      try {
        console.log(`🗑️  Deleting from Cloudinary: ${file.public_id}`);
        cloudinaryDeleteResult = await cloudinary.api.delete_resources([file.public_id], {
          resource_type: file.resource_type || 'raw'
        });
        console.log(`✅ Cloudinary deletion result:`, cloudinaryDeleteResult);
      } catch (cloudinaryError) {
        console.error(`❌ Cloudinary deletion error:`, cloudinaryError);
        // Continue with database deletion even if Cloudinary fails
      }
    }
    // Handle local files
    else if (file.storageType === 'local' && file.filePath) {
      try {
        if (fs.existsSync(file.filePath)) {
          await fs.remove(file.filePath);
          console.log(`✅ Local file deleted: ${file.filePath}`);
        } else {
          console.log(`⚠️  Local file not found: ${file.filePath}`);
        }
      } catch (fsError) {
        console.error(`❌ Local file deletion error:`, fsError);
        // Continue with database deletion even if file system fails
      }
    }

    // Delete file record from database
    await FileStorage.findByIdAndDelete(id);
    console.log(`✅ Database record deleted: ${id}`);

    res.json({
      success: true,
      message: 'File deleted successfully from both MongoDB and Cloudinary',
      deletedFile: {
        id: file._id,
        originalFilename: file.originalFilename,
        storageType: file.storageType
      },
      cloudinaryResult: cloudinaryDeleteResult,
      details: {
        databaseDeleted: 1,
        cloudinaryDeleted: cloudinaryDeleteResult?.deleted?.length || 0,
        cloudinaryNotFound: cloudinaryDeleteResult?.not_found?.length || 0
      }
    });

  } catch (error) {
    console.error('Delete single file error:', error);
    res.status(500).json({
      success: false,
      error: 'Delete failed',
      message: error.message
    });
  }
};

/**
 * Get user's single files uploaded to Cloudinary
 */
export const getUserSingleFiles = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, search, storageType } = req.query;

    console.log(`📁 Getting single files for user ${userId}`);

    const query = { 
      userId,
      fileType: 'single-file'
    };

    // Filter by storage type if specified
    if (storageType) {
      query.storageType = storageType;
    }

    // Add search functionality
    if (search) {
      query.$or = [
        { originalFilename: { $regex: search, $options: 'i' } },
        { format: { $regex: search, $options: 'i' } }
      ];
    }

    const files = await FileStorage.find(query)
      .sort({ uploadedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalFiles = await FileStorage.countDocuments(query);

    res.json({
      success: true,
      data: {
        files: files.map(file => ({
          id: file._id,
          originalFilename: file.originalFilename,
          fileSize: file.fileSize,
          mimeType: file.mimeType,
          format: file.format,
          uploadedAt: file.uploadedAt,
          storageType: file.storageType,
          cloudinary: file.storageType === 'cloudinary' ? {
            public_id: file.public_id,
            secure_url: file.secure_url,
            resource_type: file.resource_type,
            bytes: file.bytes
          } : null
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalFiles / limit),
          totalFiles,
          hasNext: page < Math.ceil(totalFiles / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get user single files error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get files',
      message: error.message
    });
  }
};

/**
 * Cleanup orphaned single files - delete files uploaded but not committed
 */
export const cleanupOrphanedSingleFiles = async (req, res) => {
  try {
    const userId = req.user.id;
    const { olderThanMinutes = 30 } = req.query;

    console.log(`🧹 Cleaning up orphaned single files for user: ${userId} (older than ${olderThanMinutes} minutes)`);

    // Calculate cutoff time
    const cutoffTime = new Date(Date.now() - (olderThanMinutes * 60 * 1000));

    // Find orphaned single files (files uploaded but not committed)
    const orphanedFiles = await FileStorage.find({
      userId: userId,
      storageType: 'cloudinary',
      fileType: 'single-file',
      uploadedAt: { $lt: cutoffTime },
      // Add any additional criteria to identify orphaned files
      // For example, files without a "committed" flag
    });

    if (orphanedFiles.length === 0) {
      return res.json({
        success: true,
        message: 'No orphaned single files found',
        deletedCount: 0
      });
    }

    // Extract public IDs for Cloudinary deletion
    const publicIds = orphanedFiles
      .filter(file => file.public_id)
      .map(file => file.public_id);

    console.log(`🧹 Found ${orphanedFiles.length} orphaned single files`);
    console.log(`🧹 Public IDs to delete:`, publicIds);

    // Delete from Cloudinary
    let cloudinaryDeleteResult = null;
    if (publicIds.length > 0) {
      try {
        cloudinaryDeleteResult = await cloudinary.api.delete_resources(publicIds, {
          resource_type: 'raw'
        });
        console.log(`✅ Cloudinary cleanup result:`, cloudinaryDeleteResult);
      } catch (cloudinaryError) {
        console.error(`❌ Cloudinary cleanup error:`, cloudinaryError);
        // Continue with database deletion even if Cloudinary fails
      }
    }

    // Delete from database
    const deleteResult = await FileStorage.deleteMany({ 
      userId: userId,
      storageType: 'cloudinary',
      fileType: 'single-file',
      uploadedAt: { $lt: cutoffTime }
    });

    console.log(`🧹 Deleted ${deleteResult.deletedCount} orphaned single files from database`);

    res.json({
      success: true,
      message: `Successfully cleaned up ${deleteResult.deletedCount} orphaned single files`,
      deletedCount: deleteResult.deletedCount,
      cloudinaryResult: cloudinaryDeleteResult,
      details: {
        databaseDeleted: deleteResult.deletedCount,
        cloudinaryDeleted: cloudinaryDeleteResult?.deleted?.length || 0,
        cloudinaryNotFound: cloudinaryDeleteResult?.not_found?.length || 0,
        cutoffTime: cutoffTime.toISOString()
      },
      cleanedFiles: orphanedFiles.map(file => ({
        id: file._id,
        originalFilename: file.originalFilename,
        uploadedAt: file.uploadedAt,
        public_id: file.public_id,
        secure_url: file.secure_url
      }))
    });

  } catch (error) {
    console.error('Cleanup orphaned single files error:', error);
    res.status(500).json({
      success: false,
      error: 'Cleanup failed',
      message: error.message
    });
  }
};

