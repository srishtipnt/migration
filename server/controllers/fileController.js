import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import archiver from 'archiver';
import { v4 as uuidv4 } from 'uuid';
import FileStorage from '../models/FileStorage.js';
import { generateFileName } from '../middleware/upload.js';
import { isZipFile, extractZipFile, validateZipFile } from '../utils/zipUtils.js';

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
    const extractionStats = {
      zipFilesProcessed: 0,
      filesExtracted: 0,
      errors: [],
      warnings: []
    };

    console.log(`📁 Starting file upload for user: ${userId}`);
    console.log(`📊 Files to process: ${files.length}`);

    for (const file of files) {
      try {
        // Check if file is a ZIP archive
        console.log(`🔍 Checking file: ${file.originalname}, mimeType: ${file.mimetype}`);
        const isZip = isZipFile(file.originalname, file.mimetype);
        console.log(`📦 Is ZIP file: ${isZip}`);
        if (isZip) {
          console.log(`📦 Processing ZIP file: ${file.originalname}`);
          
          // Validate ZIP file
          console.log('🔍 Validating ZIP file...');
          const zipBuffer = await fs.readFile(file.path);
          const zipValidation = await validateZipFile(zipBuffer);
          console.log('📊 Validation result:', zipValidation);
          if (!zipValidation.valid) {
            extractionStats.errors.push({
              file: file.originalname,
              error: zipValidation.error
            });
            continue;
          }

          // Extract ZIP file
          console.log('🔍 Extracting ZIP file...');
          const extractionResult = await extractZipFile(zipBuffer, { userId });
          console.log('📊 Extraction result success:', extractionResult.success);
          console.log('📊 Extraction result files count:', extractionResult.files ? extractionResult.files.length : 0);
          if (extractionResult.error) {
            console.log('📊 Extraction error:', extractionResult.error);
          }
          if (extractionResult.success) {
            extractionStats.zipFilesProcessed++;
            extractionStats.filesExtracted += extractionResult.files.length;
            
            console.log(`📦 Successfully extracted ${extractionResult.files.length} files from ZIP`);
            
            // Process extracted files
            for (const extractedFile of extractionResult.files) {
              // Create folder structure in uploads
              const folderPath = extractedFile.folderPath || '';
              const relativePath = extractedFile.relativePath || extractedFile.originalName;
              
              // Generate unique filename for storage while preserving structure
              const fileName = generateFileName(extractedFile.originalName);
              const fullFolderPath = path.join(process.env.UPLOAD_PATH || './uploads', userId, folderPath);
              const filePath = path.join(fullFolderPath, fileName);
              
              // Ensure directory exists (including subfolders)
              await fs.ensureDir(path.dirname(filePath));
              
              // Write file buffer to disk
              await fs.writeFile(filePath, extractedFile.fileBuffer);
              
              const fileRecord = new FileStorage({
                userId,
                originalName: extractedFile.originalName,
                fileName: fileName,
                filePath: filePath,
                fileSize: extractedFile.fileSize,
                mimeType: extractedFile.mimeType,
                checksum: extractedFile.checksum,
                folderPath: folderPath,
                relativePath: relativePath,
                metadata: {
                  extractedFrom: file.originalname,
                  extractedAt: new Date(),
                  ...extractedFile.metadata
                }
              });

              try {
                await fileRecord.save();
                uploadedFiles.push(fileRecord);
                console.log(`✅ Saved file: ${extractedFile.originalName}`);
              } catch (saveError) {
                console.error(`❌ Error saving file ${extractedFile.originalName}:`, saveError.message);
                extractionStats.errors.push({
                  file: extractedFile.originalName,
                  error: saveError.message
                });
              }
            }
          } else {
            extractionStats.errors.push({
              file: file.originalname,
              error: extractionResult.error
            });
          }
        } else {
          // Process regular file
          const fileName = generateFileName(file.originalname);
          const filePath = path.join(process.env.UPLOAD_PATH || './uploads', userId, fileName);
          
          // Ensure directory exists
          await fs.ensureDir(path.dirname(filePath));
          
          // Move file to final location
          await fs.move(file.path, filePath);

          const fileRecord = new FileStorage({
            userId,
            originalName: file.originalname,
            fileName,
            filePath,
            fileSize: file.size,
            mimeType: file.mimetype,
            checksum: calculateChecksum(filePath)
          });

          await fileRecord.save();
          uploadedFiles.push(fileRecord);
        }
      } catch (fileError) {
        console.error(`Error processing file ${file.originalname}:`, fileError);
        extractionStats.errors.push({
          file: file.originalname,
          error: fileError.message
        });
      }
    }

    // Prepare response message
    const safeUploadedFiles = Array.isArray(uploadedFiles) ? uploadedFiles : [];
    
    console.log(`✅ File upload completed. Processed files: ${safeUploadedFiles.length}`);
    console.log(`📋 Uploaded files:`, safeUploadedFiles.map(f => f.originalName));
    
    let message = `${safeUploadedFiles.length} files uploaded successfully`;
    if (extractionStats.zipFilesProcessed > 0) {
      message += ` (${extractionStats.zipFilesProcessed} ZIP files processed, ${extractionStats.filesExtracted} files extracted)`;
    }
    if (extractionStats.errors.length > 0) {
      message += ` (${extractionStats.errors.length} errors occurred)`;
    }

    res.status(201).json({
      success: true,
      message,
      data: {
        uploadedFiles: safeUploadedFiles.map(file => ({
          id: file._id,
          originalName: file.originalName,
          fileName: file.fileName,
          fileSize: file.fileSize,
          mimeType: file.mimeType,
          uploadedAt: file.uploadedAt,
          extractedFrom: file.metadata?.extractedFrom || null
        })),
        totalFiles: safeUploadedFiles.length,
        totalSize: safeUploadedFiles.reduce((sum, file) => sum + (file.fileSize || 0), 0),
        extractionStats: {
          zipFilesProcessed: extractionStats.zipFilesProcessed,
          filesExtracted: extractionStats.filesExtracted,
          errors: extractionStats.errors,
          warnings: extractionStats.warnings
        }
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
    const { page = 1, limit = 20, search } = req.query;

    const query = { userId };
    if (search) {
      query.$or = [
        { originalName: { $regex: search, $options: 'i' } },
        { fileName: { $regex: search, $options: 'i' } }
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
          originalName: file.originalName,
          fileName: file.fileName,
          fileSize: file.fileSize,
          mimeType: file.mimeType,
          uploadedAt: file.uploadedAt,
          extractedFrom: file.metadata?.extractedFrom || null,
          folderPath: file.folderPath || '',
          relativePath: file.relativePath || file.originalName
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
    console.error('Get files error:', error);
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
      data: {
        file: {
          id: file._id,
          originalName: file.originalName,
          fileName: file.fileName,
          fileSize: file.fileSize,
          mimeType: file.mimeType,
          uploadedAt: file.uploadedAt,
          extractedFrom: file.metadata?.extractedFrom || null
        }
      }
    });
  } catch (error) {
    console.error('Get file error:', error);
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

    if (!fs.existsSync(file.filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: 'File has been deleted from storage'
      });
    }

    res.download(file.filePath, file.originalName);
  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({
      success: false,
      error: 'Download failed',
      message: error.message
    });
  }
};

// Delete file
export const deleteFile = async (req, res) => {
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

    // Delete file from storage
    if (fs.existsSync(file.filePath)) {
      await fs.remove(file.filePath);
    }

    // Delete file record from database
    await FileStorage.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      success: false,
      error: 'Delete failed',
      message: error.message
    });
  }
};

// Create ZIP archive of user's files
export const createZipArchive = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fileIds } = req.query;

    let files;
    if (fileIds) {
      const ids = fileIds.split(',');
      files = await FileStorage.find({ _id: { $in: ids }, userId });
    } else {
      files = await FileStorage.find({ userId });
    }

    if (files.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No files found',
        message: 'No files available to create archive'
      });
    }

    const archive = archiver('zip', { zlib: { level: 9 } });
    const fileName = `files_${userId}_${Date.now()}.zip`;

    res.attachment(fileName);
    archive.pipe(res);

    for (const file of files) {
      if (fs.existsSync(file.filePath)) {
        archive.file(file.filePath, { name: file.originalName });
      }
    }

    await archive.finalize();
  } catch (error) {
    console.error('Create archive error:', error);
    res.status(500).json({
      success: false,
      error: 'Archive creation failed',
      message: error.message
    });
  }
};

// Get file statistics
export const getFileStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const totalFiles = await FileStorage.countDocuments({ userId });
    const totalSize = await FileStorage.aggregate([
      { $match: { userId } },
      { $group: { _id: null, totalSize: { $sum: '$fileSize' } } }
    ]);

    const filesByType = await FileStorage.aggregate([
      { $match: { userId } },
      { $group: { _id: '$mimeType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        totalFiles,
        totalSize: totalSize[0]?.totalSize || 0,
        filesByType: filesByType.map(item => ({
          mimeType: item._id,
          count: item.count
        }))
      }
    });
  } catch (error) {
    console.error('Get file stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get file statistics',
      message: error.message
    });
  }
};