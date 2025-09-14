import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import archiver from 'archiver';
import { v4 as uuidv4 } from 'uuid';
import FileStorage from '../models/FileStorage.js';
import Session from '../models/Session.js';
import MigrationJob from '../models/MigrationJob.js';
import { generateFileName } from '../middleware/upload.js';
import { isZipFile, extractZipFile, validateZipFile } from '../utils/zipUtils.js';
import { addMigrationJob } from '../queues/migrationQueue.js';

// Calculate file checksum
const calculateChecksum = (filePath) => {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
};

// Upload files
export const uploadFiles = async (req, res) => {
  try {
    const { sessionId } = req.body;
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
    const fileNodes = [];
    const extractionStats = {
      zipFilesProcessed: 0,
      filesExtracted: 0,
      errors: [],
      warnings: []
    };

    for (const file of files) {
      try {
        // Check if file is a ZIP archive
        if (isZipFile(file.originalname, file.mimetype)) {
          console.log(`📦 Processing ZIP file: ${file.originalname}`);
          extractionStats.zipFilesProcessed++;
          
          try {
            // Validate ZIP file first
            const validation = await validateZipFile(file.buffer);
            
            if (!validation.isValid) {
              throw new Error(`ZIP validation failed: ${validation.errors.join(', ')}`);
            }
            
            if (validation.warnings.length > 0) {
              extractionStats.warnings.push({
                fileName: file.originalname,
                warnings: validation.warnings
              });
            }
            
            // Extract ZIP file with options
            const extractedFiles = await extractZipFile(file.buffer, {
              maxFiles: 500,
              maxFileSize: 25 * 1024 * 1024, // 25MB per file
              allowedExtensions: ['.js', '.ts', '.jsx', '.tsx', '.json', '.html', '.css', '.xml', '.txt', '.md', '.sql', '.yaml', '.yml'],
              skipDirectories: true
            });
            
            // Process each extracted file
            for (const extractedFile of extractedFiles) {
              const fileName = generateFileName(extractedFile.fileName);
              const filePath = path.join(
                process.env.UPLOAD_PATH || './uploads', 
                'sessions', 
                sessionId, 
                'input', 
                fileName
              );
              
              await fs.ensureDir(path.dirname(filePath));
              await fs.writeFile(filePath, extractedFile.fileBuffer);
              
              // Create file record
              const fileRecord = new FileStorage({
                userId,
                sessionId: req.session._id,
                originalName: extractedFile.originalName,
                fileName,
                filePath,
                fileSize: extractedFile.fileSize,
                mimeType: extractedFile.mimeType,
                checksum: extractedFile.checksum,
                extension: extractedFile.extension,
                category: 'input',
                storageProvider: 'local',
                storageLocation: filePath,
                tags: [extractedFile.extension.substring(1)],
                metadata: {
                  extractedFrom: file.originalname,
                  extractionPath: extractedFile.path
                }
              });
              
              await fileRecord.save();
              
              // Create file node for session
              const fileNode = {
                name: extractedFile.originalName,
                type: 'file',
                size: extractedFile.fileSize,
                selected: true,
                icon: extractedFile.extension.substring(1),
                path: extractedFile.path,
                extension: extractedFile.extension,
                mimeType: extractedFile.mimeType,
                checksum: extractedFile.checksum,
                status: 'pending',
                metadata: {
                  extractedFrom: file.originalname
                }
              };
              
              uploadedFiles.push(fileRecord);
              fileNodes.push(fileNode);
              extractionStats.filesExtracted++;
            }
            
            console.log(`✅ Extracted ${extractedFiles.length} files from ${file.originalname}`);
            
          } catch (extractionError) {
            console.error(`❌ Error extracting ZIP file ${file.originalname}:`, extractionError);
            extractionStats.errors.push({
              fileName: file.originalname,
              error: extractionError.message
            });
            
            // Fallback: save ZIP file as-is
        const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');
            const fileName = generateFileName(file.originalname);
            const filePath = path.join(process.env.UPLOAD_PATH || './uploads', 'sessions', sessionId, 'input', fileName);
            
            await fs.ensureDir(path.dirname(filePath));
            await fs.writeFile(filePath, file.buffer);
            
            const fileRecord = new FileStorage({
              userId,
              sessionId: req.session._id,
              originalName: file.originalname,
              fileName,
              filePath,
              fileSize: file.size,
              mimeType: file.mimetype,
              checksum,
              extension: path.extname(file.originalname).toLowerCase(),
              category: 'input',
              storageProvider: 'local',
              storageLocation: filePath,
              tags: [path.extname(file.originalname).toLowerCase().substring(1)],
              metadata: {
                extractionFailed: true,
                extractionError: extractionError.message
              }
            });
            
            await fileRecord.save();
            
            const fileNode = {
              name: file.originalname,
              type: 'file',
              size: file.size,
              selected: true,
              icon: path.extname(file.originalname).toLowerCase().substring(1),
              path: file.originalname,
              extension: path.extname(file.originalname).toLowerCase(),
              mimeType: file.mimetype,
              checksum,
              status: 'pending',
              metadata: {
                extractionFailed: true
              }
            };
            
            uploadedFiles.push(fileRecord);
            fileNodes.push(fileNode);
          }
          
        } else {
          // Process regular (non-ZIP) file
          // Handle both memory and disk storage
          let fileBuffer, filePath;
          
          if (file.buffer) {
            // Memory storage - file is in buffer
            fileBuffer = file.buffer;
            const fileName = generateFileName(file.originalname);
            filePath = path.join(process.env.UPLOAD_PATH || './uploads', 'sessions', sessionId, 'input', fileName);
            await fs.ensureDir(path.dirname(filePath));
            await fs.writeFile(filePath, fileBuffer);
          } else {
            // Disk storage - file is already saved to disk
            filePath = file.path;
            fileBuffer = await fs.readFile(filePath);
          }
          
          const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
          const fileName = path.basename(filePath);

          const fileRecord = new FileStorage({
            userId,
            sessionId: req.session._id,
            originalName: file.originalname,
            fileName,
            filePath,
            fileSize: file.size,
            mimeType: file.mimetype,
            checksum,
            extension: path.extname(file.originalname).toLowerCase(),
            category: 'input',
            storageProvider: 'local',
            storageLocation: filePath,
            tags: [path.extname(file.originalname).toLowerCase().substring(1)]
          });

          await fileRecord.save();

          const fileNode = {
            name: file.originalname,
            type: 'file',
            size: file.size,
            selected: true,
            icon: path.extname(file.originalname).toLowerCase().substring(1),
            path: file.originalname,
            extension: path.extname(file.originalname).toLowerCase(),
            mimeType: file.mimetype,
            checksum,
            status: 'pending'
          };

          fileNodes.push(fileNode);
          uploadedFiles.push(fileRecord);
        }

      } catch (fileError) {
        console.error(`Error processing file ${file.originalname}:`, fileError);
        extractionStats.errors.push({
          fileName: file.originalname,
          error: fileError.message
        });
      }
    }

    // Update session with uploaded files
    const session = await Session.findById(req.session._id);
    session.uploadedFiles = [...(session.uploadedFiles || []), ...fileNodes];
    await session.save();

    // Prepare response message
    // Create migration job after successful file upload
    let migrationJob = null;
    try {
      // Default migration options (can be customized based on requirements)
      const migrationOptions = ['es6-to-es2022', 'commonjs-to-esm'];
      const fileFilters = {
        includeExtensions: ['.js', '.ts', '.jsx', '.tsx'],
        excludePatterns: ['node_modules', '.git', 'dist', 'build']
      };
      const customSettings = {
        preserveComments: true,
        minifyOutput: false,
        generateSourceMaps: true
      };

      migrationJob = await addMigrationJob(
        sessionId,
        migrationOptions,
        fileFilters,
        customSettings
      );
      
      console.log(`✅ Migration job created: ${migrationJob.id}`);
    } catch (jobError) {
      console.warn('⚠️ Failed to create migration job:', jobError.message);
      // Don't fail the upload if job creation fails
    }

    let message = `${uploadedFiles.length} files uploaded successfully`;
    if (extractionStats.zipFilesProcessed > 0) {
      message += ` (${extractionStats.zipFilesProcessed} ZIP files processed, ${extractionStats.filesExtracted} files extracted)`;
    }
    if (extractionStats.errors.length > 0) {
      message += ` (${extractionStats.errors.length} errors occurred)`;
    }
    if (migrationJob) {
      message += ` - Migration job ${migrationJob.id} created`;
    }

    res.status(201).json({
      success: true,
      message,
      data: {
        uploadedFiles: uploadedFiles.map(file => ({
          id: file._id,
          originalName: file.originalName,
          fileName: file.fileName,
          fileSize: file.fileSize,
          mimeType: file.mimeType,
          uploadedAt: file.uploadedAt,
          extractedFrom: file.metadata?.extractedFrom || null
        })),
        totalFiles: uploadedFiles.length,
        totalSize: uploadedFiles.reduce((sum, file) => sum + file.fileSize, 0),
        extractionStats: {
          zipFilesProcessed: extractionStats.zipFilesProcessed,
          filesExtracted: extractionStats.filesExtracted,
          errors: extractionStats.errors,
          warnings: extractionStats.warnings
        },
        migrationJob: migrationJob ? {
          id: migrationJob.id,
          status: migrationJob.status,
          createdAt: migrationJob.createdAt
        } : null
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

// Get file by ID
export const getFile = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const file = await FileStorage.findOne({ _id: id, userId, status: { $ne: 'deleted' } });

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: 'File does not exist or you do not have permission to access it'
      });
    }

    // Record access
    await file.recordAccess();

    // Check if file exists on disk
    if (!await fs.pathExists(file.filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found on disk',
        message: 'File has been moved or deleted from storage'
      });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${file.originalName}"`);
    res.setHeader('Content-Length', file.fileSize);

    // Stream file to response
    const fileStream = fs.createReadStream(file.filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve file',
      message: error.message
    });
  }
};

// Download file
export const downloadFile = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const file = await FileStorage.findOne({ _id: id, userId, status: { $ne: 'deleted' } });

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: 'File does not exist or you do not have permission to access it'
      });
    }

    // Record access
    await file.recordAccess();

    // Check if file exists on disk
    if (!await fs.pathExists(file.filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found on disk',
        message: 'File has been moved or deleted from storage'
      });
    }

    // Set download headers
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.setHeader('Content-Length', file.fileSize);

    // Stream file to response
    const fileStream = fs.createReadStream(file.filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download file',
      message: error.message
    });
  }
};

// Get files by session
export const getSessionFiles = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    // Verify session belongs to user
    const session = await Session.findOne({ sessionId, userId });
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        message: 'Session does not exist or you do not have permission to access it'
      });
    }

    const files = await FileStorage.findBySession(session._id);

    res.json({
      success: true,
      data: {
        files: files.map(file => ({
          id: file._id,
          originalName: file.originalName,
          fileName: file.fileName,
          fileSize: file.fileSize,
          fileSizeFormatted: file.fileSizeFormatted,
          mimeType: file.mimeType,
          extension: file.extension,
          category: file.category,
          status: file.status,
          processingProgress: file.processingProgress,
          uploadedAt: file.uploadedAt,
          processedAt: file.processedAt,
          tags: file.tags
        })),
        totalFiles: files.length,
        totalSize: files.reduce((sum, file) => sum + file.fileSize, 0)
      }
    });

  } catch (error) {
    console.error('Get session files error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve files',
      message: error.message
    });
  }
};

// Delete file
export const deleteFile = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const file = await FileStorage.findOne({ _id: id, userId, status: { $ne: 'deleted' } });

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: 'File does not exist or you do not have permission to delete it'
      });
    }

    // Mark as deleted in database
    await file.markAsDeleted();

    // Optionally delete from disk (uncomment if you want to delete files immediately)
    // if (await fs.pathExists(file.filePath)) {
    //   await fs.remove(file.filePath);
    // }

    res.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete file',
      message: error.message
    });
  }
};

// Create ZIP archive of session files
export const createZipArchive = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    // Verify session belongs to user
    const session = await Session.findOne({ sessionId, userId });
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        message: 'Session does not exist or you do not have permission to access it'
      });
    }

    // Get all files for the session
    const files = await FileStorage.findBySession(session._id, 'output');

    if (files.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No files found',
        message: 'No output files found for this session'
      });
    }

    // Create ZIP file
    const zipFileName = `migration_${sessionId}_${Date.now()}.zip`;
    const zipFilePath = path.join(process.env.UPLOAD_PATH || './uploads', 'archives', zipFileName);
    
    await fs.ensureDir(path.dirname(zipFilePath));

    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    // Set response headers
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);

    // Pipe archive to response
    archive.pipe(res);

    // Add files to archive
    for (const file of files) {
      if (await fs.pathExists(file.filePath)) {
        archive.file(file.filePath, { name: file.originalName });
      }
    }

    // Finalize archive
    await archive.finalize();

    // Clean up temporary ZIP file after streaming
    output.on('close', async () => {
      try {
        await fs.remove(zipFilePath);
      } catch (cleanupError) {
        console.error('Error cleaning up ZIP file:', cleanupError);
      }
    });

  } catch (error) {
    console.error('Create ZIP archive error:', error);
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

    const stats = await FileStorage.getStorageStats(userId);

    res.json({
      success: true,
      data: {
        stats,
        totalFiles: stats.reduce((sum, stat) => sum + stat.count, 0),
        totalSize: stats.reduce((sum, stat) => sum + stat.totalSize, 0)
      }
    });

  } catch (error) {
    console.error('Get file stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve file statistics',
      message: error.message
    });
  }
};

