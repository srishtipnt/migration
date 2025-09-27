import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import archiver from 'archiver';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import FileStorage from '../models/FileStorage.js';
import { generateFileName } from '../middleware/upload.js';

// Load environment variables
dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dwpj1cr3e',
  api_key: process.env.CLOUDINARY_API_KEY || '252216879214925',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'vQzTI2sfVrJTd1-g_Ff4vuSiMTY',
  secure: true
});

console.log('📁 File Controller loaded with Cloudinary support');

// Calculate file checksum
const calculateChecksum = (filePath) => {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
};

// Upload files (simplified - no sessions needed)
export const uploadFiles = async (req, res) => {
  try {
    const files = req.files;
    const userId = req.user.id;

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded',
        message: 'Please select files to upload'
      });
    }

    const uploadedFiles = [];

    console.log('📁 Starting file upload for user:', userId);
    console.log('📊 Files to process:', files.length);

    for (const file of files) {
      try {
        // Validate file type - prevent ZIP files in regular file upload
        const fileExtension = path.extname(file.originalname).toLowerCase();
        const isZipFile = fileExtension === '.zip' || file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed';
        
        if (isZipFile) {
          return res.status(400).json({
            success: false,
            error: 'Invalid file type for regular file upload',
            message: 'ZIP files are not allowed in regular file upload. Please use the ZIP upload section instead.',
            receivedFileType: fileExtension,
            receivedMimeType: file.mimetype
          });
        }
        
        // Process regular file
        console.log('📁 Processing regular file:', file.originalname);
        
        const fileName = generateFileName(file.originalname);
        const filePath = path.join(process.env.UPLOAD_PATH || './uploads', userId, fileName);
        
        // Ensure directory exists
        await fs.ensureDir(path.dirname(filePath));
        
        // Move file to final location
        await fs.move(file.path, filePath);

        // Upload to Cloudinary with robust error handling
        let cloudinaryResult = null;
        try {
          console.log('☁️  Uploading to Cloudinary:', file.originalname);
          
          // Determine resource type based on file type
          let resourceType = 'raw';
          if (file.mimetype.startsWith('image/')) {
            resourceType = 'image';
          } else if (file.mimetype.startsWith('video/')) {
            resourceType = 'video';
          }

          // Generate unique Cloudinary path
          const fileId = crypto.randomBytes(8).toString('hex');
          const timestamp = Date.now();
          const cloudinaryPath = `migrateapp/users/${userId}/files/${timestamp}_${fileId}`;
          const userTag = `user-${userId}`;

          cloudinaryResult = await cloudinary.uploader.upload(filePath, {
            public_id: cloudinaryPath,
            resource_type: resourceType,
            use_filename: false,
            unique_filename: true,
            overwrite: false,
            tags: [userTag, 'regular-file', 'migrateapp']
          });

          console.log('✅ Cloudinary upload successful:', {
            public_id: cloudinaryResult.public_id,
            secure_url: cloudinaryResult.secure_url
          });

        } catch (cloudinaryError) {
          console.warn('⚠️  Cloudinary upload failed (continuing with local storage):', cloudinaryError.message);
          // Don't throw error - just continue with local storage
        }

        // Get file extension for format detection
        const extension = path.extname(file.originalname).toLowerCase();
        const format = extension.replace('.', '') || 'unknown';

        const fileRecord = new FileStorage({
          userId,
          originalFilename: file.originalname,
          fileName,
          filePath,
          fileSize: file.size,
          mimeType: file.mimetype,
          format: format,
          folderPath: '',
          relativePath: file.originalname,
          uploadedAt: new Date(),
          
          // Cloudinary fields (if upload was successful)
          storageType: cloudinaryResult ? 'cloudinary' : 'local',
          public_id: cloudinaryResult?.public_id || null,
          secure_url: cloudinaryResult?.secure_url || null,
          resource_type: cloudinaryResult?.resource_type || 'raw',
          bytes: cloudinaryResult?.bytes || file.size,
          
          // Application-specific fields
          sessionId: null,
          isExtractedFromZip: false,
          zipFileName: null,
          fileType: 'regular-file',
          
          // Store complete Cloudinary response as metadata
          metadata: {
            cloudinary: cloudinaryResult,
            uploadMethod: 'regular-file',
            uploadedAt: new Date(),
            localPath: filePath
          }
        });

        await fileRecord.save();
        uploadedFiles.push(fileRecord);
        
        console.log('✅ File processed successfully:', file.originalname);
      } catch (fileError) {
        console.error('Error processing file', file.originalname, ':', fileError);
      }
    }

    // Prepare response message
    const safeUploadedFiles = Array.isArray(uploadedFiles) ? uploadedFiles : [];
    
    console.log('✅ File upload completed. Processed files:', safeUploadedFiles.length);
    
    let message = `${safeUploadedFiles.length} files uploaded successfully`;

    res.status(200).json({
      success: true,
      message: message,
      files: safeUploadedFiles.map(file => ({
        id: file._id,
        originalFilename: file.originalFilename,
        fileName: file.fileName,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
        uploadedAt: file.uploadedAt,
        storageType: file.storageType,
        public_id: file.public_id,
        secure_url: file.secure_url
      })),
      stats: {
        totalFiles: safeUploadedFiles.length,
        cloudinaryFiles: safeUploadedFiles.filter(f => f.storageType === 'cloudinary').length,
        localFiles: safeUploadedFiles.filter(f => f.storageType === 'local').length
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Upload failed',
      message: error.message
    });
  }
};

// Get user's files
export const getUserFiles = async (req, res) => {
  try {
    const userId = req.user.id;
    const files = await FileStorage.find({ userId }).sort({ uploadedAt: -1 });
    
    res.json({
      success: true,
      files: files.map(file => ({
        id: file._id,
        originalFilename: file.originalFilename,
        fileName: file.fileName,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
        uploadedAt: file.uploadedAt,
        storageType: file.storageType,
        public_id: file.public_id,
        secure_url: file.secure_url
      }))
    });
  } catch (error) {
    console.error('Error getting user files:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get files',
      message: error.message
    });
  }
};

// Get single file
export const getFile = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const file = await FileStorage.findOne({ _id: id, userId });
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: 'File does not exist or you do not have permission to access it'
      });
    }
    
    res.json({
      success: true,
      file: {
        id: file._id,
        originalFilename: file.originalFilename,
        fileName: file.fileName,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
        uploadedAt: file.uploadedAt,
        storageType: file.storageType,
        public_id: file.public_id,
        secure_url: file.secure_url
      }
    });
  } catch (error) {
    console.error('Error getting file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get file',
      message: error.message
    });
  }
};

// Download file
export const downloadFile = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const file = await FileStorage.findOne({ _id: id, userId });
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: 'File does not exist or you do not have permission to access it'
      });
    }
    
    // If file is stored in Cloudinary, redirect to Cloudinary URL
    if (file.storageType === 'cloudinary' && file.secure_url) {
      return res.redirect(file.secure_url);
    }
    
    // If file is stored locally, serve it
    if (fs.existsSync(file.filePath)) {
      res.download(file.filePath, file.originalFilename);
    } else {
      res.status(404).json({
        success: false,
        error: 'File not found',
        message: 'File does not exist on disk'
      });
    }
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download file',
      message: error.message
    });
  }
};

// Delete file
export const deleteFile = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    console.log('🗑️  ===== DELETE FILE START =====');
    console.log('🗑️  File ID:', id);
    console.log('🗑️  User ID:', userId);
    
    const file = await FileStorage.findOne({ _id: id, userId });
    if (!file) {
      console.log('❌ File not found in database');
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: 'File does not exist or you do not have permission to delete it'
      });
    }
    
    console.log('📋 File found in database:', {
      id: file._id,
      originalFilename: file.originalFilename,
      storageType: file.storageType,
      public_id: file.public_id,
      resource_type: file.resource_type,
      secure_url: file.secure_url ? 'exists' : 'null',
      filePath: file.filePath
    });
    
    // Delete from Cloudinary if applicable
    if (file.storageType === 'cloudinary' && file.public_id) {
      try {
        console.log('🗑️  ===== CLOUDINARY DELETE START =====');
        console.log('🗑️  Deleting from Cloudinary:', file.public_id);
        console.log('🗑️  Resource type:', file.resource_type);
        
        // Delete from Cloudinary with proper resource type
        const destroyOptions = {};
        if (file.resource_type && file.resource_type !== 'raw') {
          destroyOptions.resource_type = file.resource_type;
        }
        
        console.log('🗑️  Destroy options:', destroyOptions);
        
        const result = await cloudinary.uploader.destroy(file.public_id, destroyOptions);
        console.log('✅ Cloudinary deletion result:', result);
        
        if (result.result === 'ok') {
          console.log('🎉 Cloudinary file deleted successfully!');
        } else {
          console.log('⚠️  Cloudinary delete result:', result.result);
        }
        
        console.log('🗑️  ===== CLOUDINARY DELETE END =====');
      } catch (cloudinaryError) {
        console.error('❌ ===== CLOUDINARY DELETE ERROR =====');
        console.error('❌ Cloudinary deletion failed:', cloudinaryError.message);
        console.error('❌ Cloudinary error details:', cloudinaryError);
        console.error('❌ ===== CLOUDINARY DELETE ERROR END =====');
        // Continue with local deletion even if Cloudinary fails
      }
    } else {
      console.log('⚠️  ===== SKIPPING CLOUDINARY DELETE =====');
      console.log('⚠️  Reason:', {
        storageType: file.storageType,
        hasPublicId: !!file.public_id,
        public_id: file.public_id
      });
      console.log('⚠️  ===== SKIPPING CLOUDINARY DELETE END =====');
    }
    
    // Delete local file
    if (fs.existsSync(file.filePath)) {
      await fs.remove(file.filePath);
      console.log('✅ Local file deleted:', file.filePath);
    } else {
      console.log('⚠️  Local file not found:', file.filePath);
    }
    
    // Delete database record
    await FileStorage.deleteOne({ _id: id, userId });
    
    console.log('✅ Database record deleted:', id);
    console.log('🗑️  ===== DELETE FILE END =====');
    
    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('❌ ===== DELETE FILE ERROR =====');
    console.error('❌ Error deleting file:', error);
    console.error('❌ ===== DELETE FILE ERROR END =====');
    res.status(500).json({
      success: false,
      error: 'Failed to delete file',
      message: error.message
    });
  }
};

// Create ZIP archive of user's files
export const createZipArchive = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all files for the user
    const files = await FileStorage.find({ userId });
    
    if (files.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No files found',
        message: 'No files available to create archive'
      });
    }
    
    // Create archive
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    res.attachment('user-files.zip');
    archive.pipe(res);
    
    for (const file of files) {
      if (fs.existsSync(file.filePath)) {
        archive.file(file.filePath, { name: file.originalFilename });
      }
    }
    
    await archive.finalize();
    
  } catch (error) {
    console.error('Error creating ZIP archive:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create archive',
      message: error.message
    });
  }
};

// Get file statistics
export const getFileStats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const files = await FileStorage.find({ userId });
    
    const stats = {
      totalFiles: files.length,
      totalSize: files.reduce((sum, file) => sum + (file.fileSize || 0), 0),
      cloudinaryFiles: files.filter(f => f.storageType === 'cloudinary').length,
      localFiles: files.filter(f => f.storageType === 'local').length,
      byType: {},
      byFormat: {}
    };
    
    // Count by MIME type
    files.forEach(file => {
      const type = file.mimeType?.split('/')[0] || 'unknown';
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    });
    
    // Count by format
    files.forEach(file => {
      const format = file.format || 'unknown';
      stats.byFormat[format] = (stats.byFormat[format] || 0) + 1;
    });
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting file stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get stats',
      message: error.message
    });
  }
};