import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import AdmZip from 'adm-zip';
import { isZipFile, getMimeTypeFromExtension } from '../utils/zipUtils.js';
import FileStorage from '../models/FileStorage.js';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dwpj1cr3e',
  api_key: process.env.CLOUDINARY_API_KEY || '252216879214925',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'vQzTI2sfVrJTd1-g_Ff4vuSiMTY',
  secure: true
});

console.log('☁️  Cloudinary ZIP Controller configured');
console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME || 'dwpj1cr3e');

/**
 * Upload ZIP file to Cloudinary with structured storage for easy chunking
 */
export const uploadZipToCloudinary = async (req, res) => {
  try {
    console.log('🚀 ZIP upload endpoint hit');
    console.log('📋 Request user:', req.user);
    console.log('📋 Request file:', req.file);
    console.log('📋 Request headers:', req.headers);
    console.log('📋 Request method:', req.method);
    console.log('📋 Request URL:', req.url);
    
    const zipFile = req.file; // Single file upload
    const userId = req.user.id;

    if (!zipFile) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
        message: 'Please select a ZIP file to upload'
      });
    }

    // Check if the uploaded file is actually a ZIP file
    if (!isZipFile(zipFile.originalname, zipFile.mimetype)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file type',
        message: 'Please upload a ZIP file'
      });
    }

    console.log(`📦 Processing ZIP file: ${zipFile.originalname} for user: ${userId}`);
    console.log(`📦 File path: ${zipFile.path}`);
    console.log(`📦 File size: ${zipFile.size}`);

    // Generate unique session ID for this ZIP upload
    const sessionId = `zip-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    const zipBasePath = `migrateapp/users/${userId}/sessions/${sessionId}`;

    console.log(`📦 Session ID: ${sessionId}`);
    console.log(`📦 Base path: ${zipBasePath}`);

    // Process ZIP file with AdmZip for better control
    console.log(`📦 Reading ZIP file...`);
    const zip = new AdmZip(zipFile.path);
    const zipEntries = zip.getEntries();

    console.log(`📦 ZIP contains ${zipEntries.length} entries`);

    const uploadedFiles = [];
    const folderStructure = {};
    const processingStats = {
      totalFiles: 0,
      processedFiles: 0,
      skippedFiles: 0,
      errors: [],
      folders: new Set()
    };

    // Process each entry in the ZIP
    for (const entry of zipEntries) {
      console.log(`🔍 Processing entry: ${entry.entryName} (isDirectory: ${entry.isDirectory})`);
      
      if (entry.isDirectory) {
        // Track folder structure
        const folderPath = entry.entryName.replace(/\/$/, ''); // Remove trailing slash
        if (folderPath) {
          processingStats.folders.add(folderPath);
          folderStructure[folderPath] = {
            type: 'folder',
            path: folderPath,
            createdAt: new Date().toISOString()
          };
        }
        continue;
      }

      processingStats.totalFiles++;
      console.log(`📄 Processing file ${processingStats.totalFiles}: ${entry.entryName}`);

      try {
        // Extract file content
        const fileContent = entry.getData();
        const fileName = path.basename(entry.entryName);
        const folderPath = path.dirname(entry.entryName).replace(/^\./, ''); // Remove leading dot
        const relativePath = entry.entryName;

        // Determine file type and create appropriate folder structure
        const extension = path.extname(fileName).toLowerCase();
        const fileType = getFileTypeFromExtension(extension);
        
        // Create chunking-friendly folder structure
        const cloudinaryFolder = createChunkingFriendlyPath(zipBasePath, folderPath, fileType, fileName);
        
        // Upload to Cloudinary using upload_stream with proper Promise handling
        const cloudinaryResult = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error(`Upload timeout for ${relativePath}`));
          }, 30000); // 30 second timeout

          const uploadResult = cloudinary.uploader.upload_stream(
            {
              folder: cloudinaryFolder,
              resource_type: 'raw',
              public_id: fileName.replace(/\.[^/.]+$/, ""), // Remove extension for public_id
              use_filename: true,
              unique_filename: true,
              tags: [
                `user:${userId}`,
                `session:${sessionId}`,
                `type:${fileType}`,
                `zip:${zipFile.originalname}`,
                `folder:${folderPath || 'root'}`
              ],
              context: {
                original_name: fileName,
                folder_path: folderPath,
                relative_path: relativePath,
                zip_file: zipFile.originalname,
                file_type: fileType,
                session_id: sessionId,
                user_id: userId
              }
            },
            (error, result) => {
              clearTimeout(timeout);
              if (error) {
                console.error(`❌ Cloudinary upload error for ${relativePath}:`, error);
                reject(error);
              } else {
                console.log(`✅ Uploaded to Cloudinary: ${relativePath}`);
                console.log(`📋 Public ID: ${result.public_id}`);
                console.log(`🔗 URL: ${result.secure_url}`);
                console.log(`📋 Result type:`, typeof result);
                console.log(`📋 Result keys:`, result ? Object.keys(result) : 'null');
                
                if (result && result.secure_url && result.public_id) {
                  console.log(`✅ Found valid Cloudinary result`);
                  resolve(result);
                } else {
                  reject(new Error(`Invalid Cloudinary result structure for ${relativePath}`));
                }
              }
            }
          );

          // Write file content to upload stream
          uploadResult.end(fileContent);
        });

        // Create file record for database using simplified field names
        const fileRecord = new FileStorage({
          userId: new mongoose.Types.ObjectId(userId),
          originalFilename: fileName,
          fileSize: entry.header.size,
          mimeType: getMimeTypeFromExtension(fileName),
          uploadedAt: new Date(),
          sessionId: sessionId,
          folderPath: folderPath,
          relativePath: relativePath,
          isExtractedFromZip: true,
          zipFileName: zipFile.originalname,
          
          // Essential Cloudinary fields
          storageType: 'cloudinary',
          public_id: cloudinaryResult.public_id,
          secure_url: cloudinaryResult.secure_url,
          resource_type: cloudinaryResult.resource_type || 'raw',
          
          // Recommended Cloudinary fields
          format: cloudinaryResult.format || extension.replace('.', ''), // Remove dot from extension
          bytes: cloudinaryResult.bytes || entry.header.size,
          
          // Application-specific fields
          fileType: fileType,
          
          metadata: {
            zipFile: zipFile.originalname,
            sessionId: sessionId,
            folderStructure: folderPath,
            chunkingPath: cloudinaryFolder,
            fileType: fileType,
            extension: extension,
            cloudinaryResult: cloudinaryResult // Store complete Cloudinary response as source of truth
          }
        });

        // Save to database
        try {
          console.log(`💾 Attempting to save to database: ${fileName}`);
          console.log(`💾 UserId type:`, typeof userId, userId);
          console.log(`💾 Converted ObjectId:`, new mongoose.Types.ObjectId(userId));
          console.log(`💾 Cloudinary result:`, {
            secure_url: cloudinaryResult.secure_url,
            public_id: cloudinaryResult.public_id
          });
          console.log(`💾 File record before save:`, {
            userId: new mongoose.Types.ObjectId(userId),
            originalFilename: fileName,
            fileSize: entry.header.size,
            mimeType: getMimeTypeFromExtension(fileName),
            sessionId: sessionId,
            // Essential Cloudinary fields
            public_id: cloudinaryResult.public_id,
            secure_url: cloudinaryResult.secure_url,
            resource_type: cloudinaryResult.resource_type || 'raw',
            // Recommended Cloudinary fields
            format: cloudinaryResult.format || extension.replace('.', ''),
            bytes: cloudinaryResult.bytes || entry.header.size
          });

          const savedRecord = await fileRecord.save();
          console.log(`💾 ✅ Saved to database: ${fileName} (ID: ${savedRecord._id})`);
          uploadedFiles.push(savedRecord);
          processingStats.processedFiles++;
        } catch (dbError) {
          console.error(`❌ Database save error for ${fileName}:`, dbError);
          console.error(`❌ Error details:`, {
            name: dbError.name,
            message: dbError.message,
            code: dbError.code,
            errors: dbError.errors
          });
          processingStats.errors.push({
            file: relativePath,
            error: `Database save failed: ${dbError.message}`
          });
          processingStats.skippedFiles++;
        }

        // Track folder structure
        if (folderPath) {
          folderStructure[folderPath] = folderStructure[folderPath] || {
            type: 'folder',
            path: folderPath,
            files: [],
            createdAt: new Date().toISOString()
          };
          folderStructure[folderPath].files.push({
            name: fileName,
            type: fileType,
            size: entry.header.size,
            cloudinaryUrl: cloudinaryResult.secure_url,
            publicId: cloudinaryResult.public_id,
            databaseId: fileRecord._id
          });
        }

      } catch (fileError) {
        console.error(`❌ Error processing file ${entry.entryName}:`, fileError);
        processingStats.errors.push({
          file: entry.entryName,
          error: fileError.message
        });
        processingStats.skippedFiles++;
      }
    }

    // Clean up temporary ZIP file
    try {
      await fs.remove(zipFile.path);
      console.log(`🗑️  Cleaned up temporary ZIP file: ${zipFile.originalname}`);
    } catch (cleanupError) {
      console.error(`❌ Cleanup error:`, cleanupError.message);
    }

    // Create session metadata
    const sessionMetadata = {
      sessionId: sessionId,
      zipFileName: zipFile.originalname,
      userId: userId,
      uploadedAt: new Date().toISOString(),
      totalFiles: processingStats.totalFiles,
      processedFiles: processingStats.processedFiles,
      skippedFiles: processingStats.skippedFiles,
      folderStructure: folderStructure,
      cloudinaryBasePath: zipBasePath,
      stats: processingStats
    };

    console.log(`✅ ZIP processing completed for session: ${sessionId}`);
    console.log(`📊 Stats: ${processingStats.processedFiles}/${processingStats.totalFiles} files processed`);
    console.log(`📁 Folders: ${processingStats.folders.size} folders created`);
    console.log(`❌ Errors: ${processingStats.errors.length} files failed`);
    console.log(`⏭️  Skipped: ${processingStats.skippedFiles} files skipped`);
    console.log(`💾 Database records: ${uploadedFiles.length} files saved`);
    
    if (processingStats.errors.length > 0) {
      console.log(`\n❌ Files with errors:`);
      processingStats.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.file}: ${error.error}`);
      });
    }

    res.status(201).json({
      success: true,
      message: `ZIP file processed successfully. ${processingStats.processedFiles} files uploaded to Cloudinary and saved to database.`,
      data: {
        sessionId: sessionId,
        zipFileName: zipFile.originalname,
        uploadedFiles: uploadedFiles.map(file => ({
          id: file._id,
          originalName: file.originalName,
          fileName: file.fileName,
          fileSize: file.fileSize,
          mimeType: file.mimeType,
          uploadedAt: file.uploadedAt,
          folderPath: file.folderPath,
          relativePath: file.relativePath,
          cloudinaryUrl: file.cloudinaryUrl,
          cloudinaryPublicId: file.cloudinaryPublicId,
          fileType: file.fileType,
          chunkingPath: file.cloudinaryFolder
        })),
        totalFiles: uploadedFiles.length,
        totalSize: uploadedFiles.reduce((sum, file) => sum + (file.fileSize || 0), 0),
        folderStructure: folderStructure,
        sessionMetadata: sessionMetadata,
        processingStats: processingStats
      }
    });

  } catch (error) {
    console.error('ZIP upload error:', error);
    res.status(500).json({
      success: false,
      error: 'ZIP upload failed',
      message: error.message
    });
  }
};

/**
 * Get all Cloudinary files for the authenticated user
 */
export const getUserCloudinaryFiles = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId, limit = 100 } = req.query;

    let query = { userId, storageType: 'cloudinary' };
    
    // If sessionId is provided, filter by session
    if (sessionId) {
      query.sessionId = sessionId;
    }

    const files = await FileStorage.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // Group files by session
    const sessions = {};
    files.forEach(file => {
      if (!sessions[file.sessionId]) {
        sessions[file.sessionId] = {
          sessionId: file.sessionId,
          zipFileName: file.zipFileName,
          uploadedAt: file.uploadedAt,
          totalFiles: 0,
          totalSize: 0,
          files: []
        };
      }
      
      sessions[file.sessionId].totalFiles++;
      sessions[file.sessionId].totalSize += file.fileSize;
      sessions[file.sessionId].files.push({
        id: file._id,
        originalName: file.originalName,
        fileName: file.fileName,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
        uploadedAt: file.uploadedAt,
        folderPath: file.folderPath,
        relativePath: file.relativePath,
        cloudinaryUrl: file.cloudinaryUrl,
        cloudinaryPublicId: file.cloudinaryPublicId,
        fileType: file.fileType,
        chunkingPath: file.cloudinaryFolder
      });
    });

    res.json({
      success: true,
      data: {
        sessions: Object.values(sessions),
        totalSessions: Object.keys(sessions).length,
        totalFiles: files.length,
        totalSize: files.reduce((sum, file) => sum + file.fileSize, 0)
      }
    });

  } catch (error) {
    console.error('Get user Cloudinary files error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Cloudinary files',
      message: error.message
    });
  }
};

/**
 * Create chunking-friendly folder structure in Cloudinary
 */
function createChunkingFriendlyPath(basePath, folderPath, fileType, fileName) {
  // Create a structured path that's easy to chunk
  const parts = [];
  
  // Base path: migrateapp/users/{userId}/sessions/{sessionId}
  parts.push(basePath);
  
  // Add file type grouping for easier chunking
  parts.push('by-type', fileType);
  
  // Add folder structure if exists
  if (folderPath && folderPath !== '.') {
    // Normalize folder path and split into parts
    const normalizedPath = folderPath.replace(/^\./, '').replace(/\/$/, '');
    if (normalizedPath) {
      parts.push('folders', ...normalizedPath.split('/').filter(Boolean));
    }
  } else {
    parts.push('root');
  }
  
  // Add file size grouping for chunking optimization
  const fileSize = fileName.length; // Use filename length as proxy for size grouping
  const sizeGroup = fileSize < 10 ? 'small' : fileSize < 20 ? 'medium' : 'large';
  parts.push('size-group', sizeGroup);
  
  return parts.join('/');
}

/**
 * Get file type from extension for better organization
 */
function getFileTypeFromExtension(extension) {
  const typeMap = {
    // Web technologies
    '.js': 'javascript',
    '.ts': 'typescript',
    '.jsx': 'react',
    '.tsx': 'react-typescript',
    '.html': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.sass': 'sass',
    '.less': 'less',
    
    // Data formats
    '.json': 'json',
    '.xml': 'xml',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.toml': 'toml',
    
    // Programming languages
    '.py': 'python',
    '.java': 'java',
    '.c': 'c',
    '.cpp': 'cpp',
    '.cc': 'cpp',
    '.cxx': 'cpp',
    '.php': 'php',
    '.rb': 'ruby',
    '.go': 'go',
    '.rs': 'rust',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.scala': 'scala',
    '.clj': 'clojure',
    '.hs': 'haskell',
    '.ml': 'ocaml',
    '.fs': 'fsharp',
    '.dart': 'dart',
    '.lua': 'lua',
    '.pl': 'perl',
    
    // Shell scripts
    '.sh': 'shell',
    '.bash': 'bash',
    '.zsh': 'zsh',
    '.fish': 'fish',
    '.ps1': 'powershell',
    '.bat': 'batch',
    '.cmd': 'batch',
    
    // Documentation
    '.md': 'markdown',
    '.txt': 'text',
    '.rst': 'restructuredtext',
    
    // Configuration
    '.conf': 'config',
    '.ini': 'config',
    '.cfg': 'config',
    '.env': 'config',
    
    // Database
    '.sql': 'sql',
    
    // Default
    '': 'unknown'
  };
  
  return typeMap[extension.toLowerCase()] || 'unknown';
}

/**
 * Get ZIP session files for chunking (now uses database instead of Cloudinary search)
 */
export const getZipSessionFiles = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID required',
        message: 'Please provide a session ID'
      });
    }

    // Get files from database instead of Cloudinary search
    const files = await FileStorage.findCloudinaryFilesBySession(sessionId);

    const formattedFiles = files.map(file => ({
      id: file._id,
      originalName: file.originalName,
      fileName: file.fileName,
      fileSize: file.fileSize,
      mimeType: file.mimeType,
      uploadedAt: file.uploadedAt,
      folderPath: file.folderPath,
      relativePath: file.relativePath,
      cloudinaryUrl: file.cloudinaryUrl,
      cloudinaryPublicId: file.cloudinaryPublicId,
      fileType: file.fileType,
      chunkingPath: file.cloudinaryFolder
    }));

    res.json({
      success: true,
      data: {
        sessionId: sessionId,
        files: formattedFiles,
        totalFiles: formattedFiles.length,
        totalSize: formattedFiles.reduce((sum, file) => sum + (file.fileSize || 0), 0)
      }
    });

  } catch (error) {
    console.error('Get session files error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get session files',
      message: error.message
    });
  }
};

/**
 * Delete ZIP session and all associated files (now uses database + Cloudinary)
 */
export const deleteZipSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID required',
        message: 'Please provide a session ID'
      });
    }

    // Get files from database first
    const files = await FileStorage.findCloudinaryFilesBySession(sessionId);

    if (files.length === 0) {
      return res.json({
        success: true,
        message: 'No files found for this session',
        deletedCount: 0
      });
    }

    // Extract public IDs for Cloudinary deletion (using new schema)
    const publicIds = files
      .filter(file => file.public_id)
      .map(file => file.public_id);

    console.log(`🗑️  Found ${files.length} files in database for session: ${sessionId}`);
    console.log(`🗑️  Public IDs to delete:`, publicIds);
    console.log(`🗑️  Deleting ${publicIds.length} files from Cloudinary`);

    // Delete from Cloudinary if we have public IDs
    let cloudinaryDeleteResult = null;
    if (publicIds.length > 0) {
      try {
        // Use delete_resources for multiple files
        cloudinaryDeleteResult = await cloudinary.api.delete_resources(publicIds, {
          resource_type: 'raw' // Specify resource type for better reliability
        });
        console.log(`✅ Cloudinary deletion result:`, cloudinaryDeleteResult);
        
        // Log individual deletion results
        if (cloudinaryDeleteResult.deleted) {
          console.log(`✅ Successfully deleted:`, cloudinaryDeleteResult.deleted);
        }
        if (cloudinaryDeleteResult.not_found) {
          console.log(`⚠️  Not found in Cloudinary:`, cloudinaryDeleteResult.not_found);
        }
      } catch (cloudinaryError) {
        console.error(`❌ Cloudinary deletion error:`, cloudinaryError);
        // Continue with database deletion even if Cloudinary fails
      }
    }

    // Delete from database
    const deleteResult = await FileStorage.deleteMany({ 
      sessionId: sessionId, 
      userId: userId,
      storageType: 'cloudinary'
    });

    console.log(`🗑️  Deleted ${deleteResult.deletedCount} files from database`);

    res.json({
      success: true,
      message: `Successfully deleted ${deleteResult.deletedCount} files from session ${sessionId}`,
      deletedCount: deleteResult.deletedCount,
      cloudinaryResult: cloudinaryDeleteResult,
      details: {
        databaseDeleted: deleteResult.deletedCount,
        cloudinaryDeleted: cloudinaryDeleteResult?.deleted?.length || 0,
        cloudinaryNotFound: cloudinaryDeleteResult?.not_found?.length || 0
      },
      deletedFiles: files.map(file => ({
        id: file._id,
        originalFilename: file.originalFilename,
        public_id: file.public_id,
        secure_url: file.secure_url
      }))
    });

  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete session',
      message: error.message
    });
  }
};

/**
 * Delete all Cloudinary files for a user (useful for account cleanup)
 */
export const deleteAllUserFiles = async (req, res) => {
  try {
    const userId = req.user.id;

    console.log(`🗑️  Deleting all files for user: ${userId}`);

    // Get all Cloudinary files for the user
    const files = await FileStorage.findCloudinaryFiles(userId);

    if (files.length === 0) {
      return res.json({
        success: true,
        message: 'No files found for this user',
        deletedCount: 0
      });
    }

    // Extract public IDs for Cloudinary deletion
    const publicIds = files
      .filter(file => file.public_id)
      .map(file => file.public_id);

    console.log(`🗑️  Found ${files.length} files in database for user: ${userId}`);
    console.log(`🗑️  Public IDs to delete:`, publicIds);

    // Delete from Cloudinary if we have public IDs
    let cloudinaryDeleteResult = null;
    if (publicIds.length > 0) {
      try {
        // Delete in batches to avoid API limits
        const batchSize = 100;
        const batches = [];
        for (let i = 0; i < publicIds.length; i += batchSize) {
          batches.push(publicIds.slice(i, i + batchSize));
        }

        console.log(`🗑️  Deleting ${publicIds.length} files in ${batches.length} batches`);

        const batchResults = [];
        for (const batch of batches) {
          try {
            const result = await cloudinary.api.delete_resources(batch, {
              resource_type: 'raw'
            });
            batchResults.push(result);
            console.log(`✅ Batch deletion completed: ${batch.length} files`);
          } catch (batchError) {
            console.error(`❌ Batch deletion error:`, batchError);
            batchResults.push({ error: batchError.message });
          }
        }

        // Combine results
        cloudinaryDeleteResult = {
          batches: batchResults,
          totalDeleted: batchResults.reduce((sum, result) => sum + (result.deleted?.length || 0), 0),
          totalNotFound: batchResults.reduce((sum, result) => sum + (result.not_found?.length || 0), 0)
        };

        console.log(`✅ Cloudinary deletion completed:`, cloudinaryDeleteResult);
      } catch (cloudinaryError) {
        console.error(`❌ Cloudinary deletion error:`, cloudinaryError);
        // Continue with database deletion even if Cloudinary fails
      }
    }

    // Delete from database
    const deleteResult = await FileStorage.deleteMany({ 
      userId: userId,
      storageType: 'cloudinary'
    });

    console.log(`✅ Database deletion completed: ${deleteResult.deletedCount} files`);

    return res.json({
      success: true,
      message: `Successfully deleted ${deleteResult.deletedCount} files for user`,
      deletedCount: deleteResult.deletedCount,
      cloudinaryResult: cloudinaryDeleteResult,
      details: {
        databaseDeleted: deleteResult.deletedCount,
        cloudinaryDeleted: cloudinaryDeleteResult?.totalDeleted || 0,
        cloudinaryNotFound: cloudinaryDeleteResult?.totalNotFound || 0,
        batchesProcessed: cloudinaryDeleteResult?.batches?.length || 0
      }
    });

  } catch (error) {
    console.error('Error deleting all user files:', error);
    res.status(500).json({
      success: false,
      error: 'Deletion failed',
      message: 'An error occurred while deleting user files'
    });
  }
};