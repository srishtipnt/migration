import fs from 'fs-extra';
import path from 'path';
import unzipper from 'unzipper';
import crypto from 'crypto';

/**
 * Check if a file is a ZIP archive based on filename and MIME type
 */
export const isZipFile = (filename, mimeType) => {
  const zipExtensions = ['.zip', '.jar', '.war', '.ear', '.apk'];
  const zipMimeTypes = [
    'application/zip',
    'application/x-zip-compressed',
    'application/x-zip',
    'application/zip-compressed',
    'application/java-archive',
    'application/x-java-archive'
  ];
  
  const extension = path.extname(filename).toLowerCase();
  return zipExtensions.includes(extension) || zipMimeTypes.includes(mimeType);
};

/**
 * Get file MIME type based on extension
 */
export const getMimeTypeFromExtension = (filename) => {
  const extension = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.js': 'application/javascript',
    '.ts': 'application/typescript',
    '.jsx': 'application/javascript',
    '.tsx': 'application/typescript',
    '.json': 'application/json',
    '.html': 'text/html',
    '.css': 'text/css',
    '.xml': 'application/xml',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.sql': 'application/sql',
    '.yaml': 'application/yaml',
    '.yml': 'application/yaml'
  };
  
  return mimeTypes[extension] || 'application/octet-stream';
};

/**
 * Extract ZIP file and return file information
 */
export const extractZipFile = async (zipBuffer, options = {}) => {
  const {
    maxFiles = 5000,
    maxFileSize = 50 * 1024 * 1024, // 50MB
    allowedExtensions = ['.js', '.ts', '.jsx', '.tsx', '.json', '.html', '.css', '.xml', '.txt', '.md', '.sql', '.yaml', '.yml', '.py', '.java', '.c', '.cpp', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.clj', '.hs', '.ml', '.fs', '.dart', '.lua', '.pl', '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd'],
    skipDirectories = false
  } = options;
  
  const extractedFiles = [];
  const tempDir = path.join(process.env.UPLOAD_PATH || './uploads', 'temp', crypto.randomUUID());
  
  try {
    await fs.ensureDir(tempDir);
    
    // Write ZIP buffer to temp file
    const tempZipPath = path.join(tempDir, 'archive.zip');
    await fs.writeFile(tempZipPath, zipBuffer);
    
    // Extract ZIP file
    const extractionDir = path.join(tempDir, 'extracted');
    await fs.ensureDir(extractionDir);
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(tempZipPath)
        .pipe(unzipper.Extract({ path: extractionDir }))
        .on('close', resolve)
        .on('error', reject);
    });
    
    // Process extracted files
    const processExtractedFiles = async (dir, relativePath = '') => {
      if (extractedFiles.length >= maxFiles) {
        throw new Error(`Maximum file limit exceeded (${maxFiles})`);
      }
      
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const itemRelativePath = path.join(relativePath, item);
        const stats = await fs.stat(itemPath);
        
        if (stats.isDirectory()) {
          // Skip common directories that shouldn't be processed
          const skipDirs = ['node_modules', '.git', '__MACOSX', '.DS_Store', 'dist', 'build', 'coverage', '.nyc_output', 'logs', 'tmp', 'temp'];
          if (skipDirs.some(dir => itemRelativePath.includes(dir))) {
            continue;
          }
          if (!skipDirectories) {
            await processExtractedFiles(itemPath, itemRelativePath);
          }
        } else {
          // Skip files in common directories that shouldn't be processed
          const skipDirs = ['node_modules', '.git', '__MACOSX', '.DS_Store', 'dist', 'build', 'coverage', '.nyc_output', 'logs', 'tmp', 'temp'];
          if (skipDirs.some(dir => itemRelativePath.includes(dir))) {
            continue;
          }
          
          // Check file size
          if (stats.size > maxFileSize) {
            console.warn(`Skipping large file: ${itemRelativePath} (${stats.size} bytes)`);
            continue;
          }
          
          // Check file extension
          const extension = path.extname(item).toLowerCase();
          if (allowedExtensions.length > 0 && !allowedExtensions.includes(extension)) {
            console.warn(`Skipping file with unsupported extension: ${itemRelativePath}`);
            continue;
          }
          
          const fileBuffer = await fs.readFile(itemPath);
          const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
          const mimeType = getMimeTypeFromExtension(item);
          
          extractedFiles.push({
            originalName: item,
            fileName: item,
            fileBuffer,
            fileSize: stats.size,
            mimeType,
            checksum,
            extension,
            folderPath: relativePath,
            relativePath: itemRelativePath,
            path: itemRelativePath
          });
        }
      }
    };
    
    await processExtractedFiles(extractionDir);
    
    // Clean up temp directory
    await fs.remove(tempDir);
    
    return {
      success: true,
      files: extractedFiles
    };
    
  } catch (error) {
    // Clean up temp directory on error
    try {
      await fs.remove(tempDir);
    } catch (cleanupError) {
      console.error('Error cleaning up temp directory:', cleanupError);
    }
    return {
      success: false,
      error: error.message,
      files: []
    };
  }
};

/**
 * Validate ZIP file before extraction
 */
export const validateZipFile = async (zipBuffer) => {
  const tempDir = path.join(process.env.UPLOAD_PATH || './uploads', 'temp', crypto.randomUUID());
  
  try {
    await fs.ensureDir(tempDir);
    
    const tempZipPath = path.join(tempDir, 'archive.zip');
    await fs.writeFile(tempZipPath, zipBuffer);
    
    // Try to read ZIP file structure
    const zip = await unzipper.Open.file(tempZipPath);
    const files = zip.files;
    
    const validation = {
      isValid: true,
      fileCount: files.length,
      totalSize: 0,
      errors: [],
      warnings: []
    };
    
    for (const file of files) {
      validation.totalSize += file.uncompressedSize;
      
      // Check for suspicious files
      if (file.path.includes('..') || file.path.startsWith('/')) {
        validation.errors.push(`Suspicious file path: ${file.path}`);
        validation.isValid = false;
      }
      
      // Check file size
      if (file.uncompressedSize > 50 * 1024 * 1024) { // 50MB
        validation.warnings.push(`Large file detected: ${file.path} (${file.uncompressedSize} bytes)`);
      }
    }
    
    // Check total size
    if (validation.totalSize > 500 * 1024 * 1024) { // 500MB
      validation.errors.push(`Total extraction size too large: ${validation.totalSize} bytes`);
      validation.isValid = false;
    }
    
    // Check file count (increased limit and filter out common directories)
    const filteredFileCount = files.filter(file => {
      const skipDirs = ['node_modules', '.git', '__MACOSX', '.DS_Store', 'dist', 'build', 'coverage', '.nyc_output', 'logs', 'tmp', 'temp'];
      return !skipDirs.some(dir => file.path.includes(dir));
    }).length;
    
    if (filteredFileCount > 5000) {
      validation.errors.push(`Too many files after filtering: ${filteredFileCount}`);
      validation.isValid = false;
    }
    
    await fs.remove(tempDir);
    return validation;
    
  } catch (error) {
    try {
      await fs.remove(tempDir);
    } catch (cleanupError) {
      console.error('Error cleaning up temp directory:', cleanupError);
    }
    
    return {
      isValid: false,
      fileCount: 0,
      totalSize: 0,
      errors: [error.message],
      warnings: []
    };
  }
};