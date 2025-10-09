import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import AdmZip from 'adm-zip';
import { isZipFile, getMimeTypeFromExtension } from '../utils/zipUtils.js';
import FileStorage from '../models/FileStorage.js';
import MigrationJob from '../models/MigrationJob.js';
import CodeChunk from '../models/CodeChunk.js';
import GeminiEmbeddingService from '../services/GeminiEmbeddingService.js';
import ASTParsingService from '../services/ASTParsingService.js';
import axios from 'axios';

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
 * Trigger automatic chunking for uploaded files
 */
export async function triggerAutomaticChunking(sessionId, userId, jobId) {
  try {
    console.log(`🚀 Starting automatic chunking for session: ${sessionId}`);
    
    // Update job status to processing
    const job = await MigrationJob.findById(jobId);
    if (job) {
      await job.updateStatus('processing');
    }
    
    // Get files for this session
    const files = await FileStorage.find({ sessionId, userId });
    console.log(`📄 Found ${files.length} files to process`);
    
    if (files.length === 0) {
      console.log('⚠️ No files found for chunking');
      return;
    }
    
    // Create workspace
    const workspacePath = path.join(process.cwd(), 'temp-workspaces', `auto-${sessionId}`);
    await fs.ensureDir(workspacePath);
    console.log(`📁 Created workspace: ${workspacePath}`);
    
    // Download files using direct URLs
    let downloadedFiles = 0;
    for (const file of files) {
      try {
        console.log(`📥 Downloading: ${file.originalFilename}`);
        
        const response = await axios.get(file.secure_url, {
          responseType: 'text',
          timeout: 30000
        });
        
        const filePath = path.join(workspacePath, file.originalFilename);
        const fileDir = path.dirname(filePath);
        await fs.ensureDir(fileDir);
        
        await fs.writeFile(filePath, response.data, 'utf8');
        downloadedFiles++;
        
        console.log(`✅ Downloaded: ${file.originalFilename}`);
      } catch (error) {
        console.error(`❌ Failed to download ${file.originalFilename}:`, error.message);
      }
    }
    
    console.log(`📊 Downloaded ${downloadedFiles}/${files.length} files`);
    
    // Process files and create chunks
    const chunks = [];
    const entries = await fs.readdir(workspacePath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isFile()) {
        const fullPath = path.join(workspacePath, entry.name);
        const extension = path.extname(entry.name).toLowerCase();
        
        if (isCodeFile(extension)) {
          try {
            console.log(`🌳 Parsing: ${entry.name}`);
            const fileChunks = await ASTParsingService.parseFile(fullPath, entry.name, extension);
            chunks.push(...fileChunks);
            console.log(`✅ Parsed ${entry.name}: ${fileChunks.length} chunks`);
          } catch (error) {
            console.error(`❌ Error parsing ${entry.name}:`, error.message);
          }
        }
      }
    }
    
    console.log(`🌳 Total chunks: ${chunks.length}`);
    
    // Generate embeddings
    console.log(`🧠 Generating embeddings...`);
    const chunksWithEmbeddings = await GeminiEmbeddingService.generateEmbeddings(chunks);
    
    // Save chunks
    console.log(`💾 Saving chunks to database...`);
    let savedChunks = 0;
    for (const chunk of chunksWithEmbeddings) {
      try {
        await CodeChunk.createChunk({
          jobId: jobId,
          sessionId: sessionId,
          userId: userId,
          ...chunk
        });
        savedChunks++;
      } catch (error) {
        console.error(`❌ Failed to save chunk:`, error.message);
      }
    }
    
    console.log(`💾 Saved ${savedChunks} chunks to database`);
    
    // Update job progress and status
    if (job) {
      await job.updateProgress(files.length, savedChunks);
      await job.updateStatus('ready');
    }
    
    // Cleanup
    await fs.remove(workspacePath);
    
    console.log(`✅ Automatic chunking completed: ${files.length} files → ${savedChunks} chunks`);
    
  } catch (error) {
    console.error('❌ Automatic chunking failed:', error);
    // Update job status to failed
    const job = await MigrationJob.findById(jobId);
    if (job) {
      await job.updateStatus('failed', error.message);
    }
    throw error;
  }
}

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
      const fileExtension = path.extname(zipFile.originalname).toLowerCase();
      const isSingleFile = !fileExtension || fileExtension !== '.zip';
      
      let errorMessage = 'Please upload a ZIP file';
      if (isSingleFile) {
        errorMessage = 'Single files are not allowed in ZIP upload. Please use the single file upload section instead.';
      }
      
      return res.status(400).json({
        success: false,
        error: 'Invalid file type for ZIP upload',
        message: errorMessage,
        receivedFileType: fileExtension,
        receivedMimeType: zipFile.mimetype,
        suggestion: isSingleFile ? 'Use single file upload section' : 'Upload a valid ZIP file'
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
            files: [], // Initialize files array
            createdAt: new Date().toISOString()
          };
        }
        continue;
      }

      processingStats.totalFiles++;
      console.log(`📄 Processing file ${processingStats.totalFiles}/${zipEntries.length}: ${entry.entryName}`);

      try {
        // Extract file content
        const fileContent = entry.getData();
        const fileName = path.basename(entry.entryName);
        const folderPath = path.dirname(entry.entryName).replace(/^\./, ''); // Remove leading dot
        const relativePath = entry.entryName;

        console.log(`📄 File details: ${fileName}, size: ${fileContent.length} bytes, extension: ${path.extname(fileName)}`);

        // Determine file type and create appropriate folder structure
        const extension = path.extname(fileName).toLowerCase();
        const fileType = getFileTypeFromExtension(extension);
        
        console.log(`📄 File type detected: ${fileType} for extension: ${extension}`);
        
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
                  console.log(`✅ Found valid Cloudinary result for ${fileName}`);
                  resolve(result);
                } else {
                  console.error(`❌ Invalid Cloudinary result structure for ${relativePath}:`, result);
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
          // Ensure folder structure is properly initialized
          if (!folderStructure[folderPath]) {
            folderStructure[folderPath] = {
              type: 'folder',
              path: folderPath,
              files: [],
              createdAt: new Date().toISOString()
            };
          }
          
          // Ensure files array exists before pushing
          if (!folderStructure[folderPath].files) {
            folderStructure[folderPath].files = [];
          }
          
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
          error: fileError.message,
          stack: fileError.stack
        });
        processingStats.skippedFiles++;
        
        // Continue processing other files even if this one failed
        console.log(`⏭️ Continuing with next file after error in ${entry.entryName}`);
      }
    }

    // Upload the ZIP file itself to Cloudinary for background processing
    let zipCloudinaryResult = null;
    try {
      console.log(`📦 Uploading ZIP file to Cloudinary for background processing...`);
      zipCloudinaryResult = await cloudinary.uploader.upload(zipFile.path, {
        folder: zipBasePath,
        resource_type: 'raw',
        public_id: `zip-${sessionId}`,
        use_filename: false,
        unique_filename: false,
        tags: [
          `user:${userId}`,
          `session:${sessionId}`,
          `type:zip-file`,
          `original:${zipFile.originalname}`
        ]
      });
      console.log(`✅ ZIP file uploaded to Cloudinary: ${zipCloudinaryResult.public_id}`);
    } catch (zipUploadError) {
      console.error(`❌ Failed to upload ZIP file to Cloudinary:`, zipUploadError);
      // Don't fail the entire upload if ZIP upload fails
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
    
    // Processing summary
    console.log(`\n📊 ZIP Processing Summary:`);
    console.log(`   📁 Total entries: ${zipEntries.length}`);
    console.log(`   📄 Total files: ${processingStats.totalFiles}`);
    console.log(`   ✅ Processed: ${processingStats.processedFiles}`);
    console.log(`   ⏭️ Skipped: ${processingStats.skippedFiles}`);
    console.log(`   ❌ Errors: ${processingStats.errors.length}`);
    
    if (processingStats.errors.length > 0) {
      console.log(`\n❌ Files with errors:`);
      processingStats.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.file}: ${error.error}`);
      });
    }

    // Create migration job for background processing (only if ZIP upload succeeded)
    if (zipCloudinaryResult) {
      try {
        console.log(`🔄 Creating migration job for session: ${sessionId}`);
        
        const zipFileInfo = {
          public_id: zipCloudinaryResult.public_id,
          secure_url: zipCloudinaryResult.secure_url,
          originalName: zipFile.originalname,
          size: zipFile.size
        };

        const migrationJob = await MigrationJob.createJob(
          sessionId,
          userId,
          zipFileInfo,
          processingStats.processedFiles
        );

        console.log(`✅ Migration job created: ${migrationJob._id}`);
        console.log(`📦 ZIP file URL: ${zipCloudinaryResult.secure_url}`);
        console.log(`📊 Job details:`, {
          sessionId: migrationJob.sessionId,
          userId: migrationJob.userId,
          totalFiles: migrationJob.totalFiles,
          status: migrationJob.status,
          createdAt: migrationJob.createdAt
        });
        
        // Do NOT trigger inline chunking here.
        // BackgroundJobProcessor will pick up the job and process it to avoid duplicates.
        console.log(`🕒 Chunking will be handled by the background processor for session: ${sessionId}`);
      } catch (jobError) {
        console.error(`❌ Failed to create migration job:`, jobError);
        // Don't fail the entire upload if job creation fails
      }
    } else {
      console.log(`⚠️  Skipping migration job creation: ZIP file upload failed`);
    }

    res.status(201).json({
      success: true,
      message: `ZIP file processed successfully. ${processingStats.processedFiles} files uploaded to Cloudinary and saved to database. Semantic chunking is running in the background.`,
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
        processingStats: processingStats,
        chunkingStatus: 'processing' // Indicate that chunking is happening in background
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
      files: files.map(file => ({
        id: file._id,
        originalFilename: file.originalName,
        fileName: file.fileName,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
        uploadedAt: file.uploadedAt,
        folderPath: file.folderPath,
        relativePath: file.relativePath,
        storageType: file.storageType,
        public_id: file.cloudinaryPublicId,
        secure_url: file.cloudinaryUrl,
        sessionId: file.sessionId,
        zipFileName: file.zipFileName
      })),
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

/**
 * Cleanup orphaned session files - delete files from a specific session when user abandons upload
 */
export const cleanupOrphanedSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    console.log(`🧹 Cleaning up orphaned session: ${sessionId} for user: ${userId}`);

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID required',
        message: 'Please provide a session ID'
      });
    }

    // Get files from database for this session
    const files = await FileStorage.findCloudinaryFilesBySession(sessionId);

    if (files.length === 0) {
      return res.json({
        success: true,
        message: 'No orphaned files found for this session',
        deletedCount: 0
      });
    }

    // Extract public IDs for Cloudinary deletion
    const publicIds = files
      .filter(file => file.public_id)
      .map(file => file.public_id);

    console.log(`🧹 Found ${files.length} orphaned files in session: ${sessionId}`);
    console.log(`🧹 Public IDs to delete:`, publicIds);

    // Delete from Cloudinary if we have public IDs
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

    // Delete files from database
    const deleteResult = await FileStorage.deleteMany({ 
      sessionId: sessionId, 
      userId: userId,
      storageType: 'cloudinary'
    });

    console.log(`🧹 Deleted ${deleteResult.deletedCount} orphaned files from database`);

    // Also delete any code chunks created for this abandoned session
    const chunkDeleteResult = await CodeChunk.deleteMany({
      sessionId: sessionId,
      userId: userId
    });
    console.log(`🧹 Deleted ${chunkDeleteResult.deletedCount} code chunks for session: ${sessionId}`);

    res.json({
      success: true,
      message: `Successfully cleaned up ${deleteResult.deletedCount} orphaned files from session ${sessionId}`,
      deletedCount: deleteResult.deletedCount,
      cloudinaryResult: cloudinaryDeleteResult,
      details: {
        databaseDeleted: deleteResult.deletedCount,
        cloudinaryDeleted: cloudinaryDeleteResult?.deleted?.length || 0,
        cloudinaryNotFound: cloudinaryDeleteResult?.not_found?.length || 0,
        chunksDeleted: chunkDeleteResult.deletedCount
      },
      cleanedFiles: files.map(file => ({
        id: file._id,
        originalFilename: file.originalFilename,
        public_id: file.public_id,
        secure_url: file.secure_url
      }))
    });

  } catch (error) {
    console.error('Cleanup orphaned session error:', error);
    res.status(500).json({
      success: false,
      error: 'Cleanup failed',
      message: error.message
    });
  }
};

/**
 * Cleanup all orphaned files - delete files from incomplete sessions older than 1 hour
 */
export const cleanupAllOrphanedFiles = async (req, res) => {
  try {
    const userId = req.user.id;
    const { olderThanHours = 1 } = req.query;

    console.log(`🧹 Cleaning up all orphaned files for user: ${userId} (older than ${olderThanHours} hours)`);

    // Calculate cutoff time
    const cutoffTime = new Date(Date.now() - (olderThanHours * 60 * 60 * 1000));

    // Find orphaned files (files from incomplete sessions older than cutoff)
    const orphanedFiles = await FileStorage.find({
      userId: userId,
      storageType: 'cloudinary',
      uploadedAt: { $lt: cutoffTime },
      // Add any additional criteria to identify orphaned files
      // For example, files without a "committed" flag or from abandoned sessions
    });

    if (orphanedFiles.length === 0) {
      return res.json({
        success: true,
        message: 'No orphaned files found',
        deletedCount: 0
      });
    }

    // Extract public IDs for Cloudinary deletion
    const publicIds = orphanedFiles
      .filter(file => file.public_id)
      .map(file => file.public_id);

    console.log(`🧹 Found ${orphanedFiles.length} orphaned files`);
    console.log(`🧹 Public IDs to delete:`, publicIds);

    // Delete from Cloudinary in batches
    let cloudinaryDeleteResult = null;
    if (publicIds.length > 0) {
      try {
        const batchSize = 100;
        const batches = [];
        for (let i = 0; i < publicIds.length; i += batchSize) {
          batches.push(publicIds.slice(i, i + batchSize));
        }

        console.log(`🧹 Deleting ${publicIds.length} orphaned files in ${batches.length} batches`);

        const batchResults = [];
        for (const batch of batches) {
          try {
            const result = await cloudinary.api.delete_resources(batch, {
              resource_type: 'raw'
            });
            batchResults.push(result);
            console.log(`✅ Batch cleanup completed: ${batch.length} files`);
          } catch (batchError) {
            console.error(`❌ Batch cleanup error:`, batchError);
            batchResults.push({ error: batchError.message });
          }
        }

        // Combine results
        cloudinaryDeleteResult = {
          batches: batchResults,
          totalDeleted: batchResults.reduce((sum, result) => sum + (result.deleted?.length || 0), 0),
          totalNotFound: batchResults.reduce((sum, result) => sum + (result.not_found?.length || 0), 0)
        };

        console.log(`✅ Cloudinary cleanup completed:`, cloudinaryDeleteResult);
      } catch (cloudinaryError) {
        console.error(`❌ Cloudinary cleanup error:`, cloudinaryError);
        // Continue with database deletion even if Cloudinary fails
      }
    }

    // Delete files from database
    const deleteResult = await FileStorage.deleteMany({ 
      userId: userId,
      storageType: 'cloudinary',
      uploadedAt: { $lt: cutoffTime }
    });

    console.log(`🧹 Deleted ${deleteResult.deletedCount} orphaned files from database`);

    // Also delete code chunks for those sessions (best-effort)
    const orphanedSessionIds = [...new Set(orphanedFiles.map(f => f.sessionId).filter(Boolean))];
    let chunksDeletedTotal = 0;
    if (orphanedSessionIds.length > 0) {
      const chunkDeleteResult = await CodeChunk.deleteMany({
        userId: userId,
        sessionId: { $in: orphanedSessionIds }
      });
      chunksDeletedTotal = chunkDeleteResult.deletedCount || 0;
      console.log(`🧹 Deleted ${chunksDeletedTotal} code chunks across ${orphanedSessionIds.length} sessions`);
    }

    res.json({
      success: true,
      message: `Successfully cleaned up ${deleteResult.deletedCount} orphaned files`,
      deletedCount: deleteResult.deletedCount,
      cloudinaryResult: cloudinaryDeleteResult,
      details: {
        databaseDeleted: deleteResult.deletedCount,
        cloudinaryDeleted: cloudinaryDeleteResult?.totalDeleted || 0,
        cloudinaryNotFound: cloudinaryDeleteResult?.totalNotFound || 0,
        batchesProcessed: cloudinaryDeleteResult?.batches?.length || 0,
        cutoffTime: cutoffTime.toISOString(),
        chunksDeleted: chunksDeletedTotal
      },
      cleanedFiles: orphanedFiles.map(file => ({
        id: file._id,
        originalFilename: file.originalFilename,
        sessionId: file.sessionId,
        uploadedAt: file.uploadedAt,
        public_id: file.public_id,
        secure_url: file.secure_url
      }))
    });

  } catch (error) {
    console.error('Cleanup all orphaned files error:', error);
    res.status(500).json({
      success: false,
      error: 'Cleanup failed',
      message: error.message
    });
  }
};

/**
 * Get chunking status for a session
 */
export const getChunkingStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    console.log(`🔍 Checking chunking status for session: ${sessionId}`);

    // Find the migration job
    const job = await MigrationJob.findOne({ sessionId, userId });
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        message: 'No migration job found for this session'
      });
    }

    // Count chunks for this session
    const chunkCount = await CodeChunk.countDocuments({ sessionId });

    res.json({
      success: true,
      data: {
        sessionId: sessionId,
        jobStatus: job.status,
        totalFiles: job.totalFiles,
        totalChunks: job.totalChunks,
        actualChunks: chunkCount,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        isComplete: job.status === 'ready',
        isProcessing: job.status === 'processing',
        isFailed: job.status === 'failed'
      }
    });

  } catch (error) {
    console.error('Get chunking status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get chunking status',
      message: error.message
    });
  }
};