import fs from 'fs-extra';
import path from 'path';

/**
 * File system walker for directory traversal and file processing
 */
class FileSystemWalker {
  constructor(options = {}) {
    this.defaultOptions = {
      maxFiles: 1000,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      includePatterns: [],
      excludePatterns: ['node_modules', '.git', 'dist', 'build', 'coverage'],
      recursive: true,
      followSymlinks: false,
      skipHidden: true
    };
    
    this.options = { ...this.defaultOptions, ...options };
  }

  /**
   * Walk through a directory and process files
   */
  async walkDirectory(dirPath, options = {}) {
    const walkOptions = { ...this.options, ...options };
    
    const results = {
      success: true,
      files: [],
      errors: [],
      summary: {
        totalFiles: 0,
        processedFiles: 0,
        skippedFiles: 0,
        totalSize: 0,
        processingTime: 0
      }
    };

    const startTime = Date.now();

    try {
      await this.processDirectory(dirPath, '', results, walkOptions);
      
      results.summary.processingTime = Date.now() - startTime;
      results.summary.totalFiles = results.files.length;
      results.summary.processedFiles = results.files.filter(f => f.success).length;
      results.summary.skippedFiles = results.files.filter(f => !f.success).length;
      results.summary.totalSize = results.files.reduce((total, file) => 
        total + (file.fileSize || 0), 0);

    } catch (error) {
      results.success = false;
      results.errors.push(error.message);
    }

    return results;
  }

  /**
   * Process a directory recursively
   */
  async processDirectory(dirPath, relativePath, results, options) {
    if (results.files.length >= options.maxFiles) {
      throw new Error(`Maximum file limit exceeded (${options.maxFiles})`);
    }

    try {
      const items = await fs.readdir(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const itemRelativePath = path.join(relativePath, item);
        
        try {
          const stats = await fs.stat(itemPath);
          
          // Skip hidden files if configured
          if (options.skipHidden && item.startsWith('.')) {
            continue;
          }
          
          // Skip symlinks if not following them
          if (stats.isSymbolicLink() && !options.followSymlinks) {
            continue;
          }
          
          // Skip excluded patterns
          if (this.shouldSkipPath(itemRelativePath, options.excludePatterns)) {
            continue;
          }

          if (stats.isDirectory()) {
            if (options.recursive) {
              await this.processDirectory(itemPath, itemRelativePath, results, options);
            }
          } else {
            await this.processFile(itemPath, itemRelativePath, stats, results, options);
          }
        } catch (itemError) {
          console.warn(`Error processing item ${itemRelativePath}:`, itemError.message);
          results.errors.push(`Error processing ${itemRelativePath}: ${itemError.message}`);
        }
      }
    } catch (error) {
      console.warn(`Error reading directory ${dirPath}:`, error.message);
      results.errors.push(`Error reading directory ${dirPath}: ${error.message}`);
    }
  }

  /**
   * Process a single file
   */
  async processFile(filePath, relativePath, stats, results, options) {
    // Check file size
    if (stats.size > options.maxFileSize) {
      results.files.push({
        filePath: relativePath,
        success: false,
        error: 'File too large',
        fileSize: stats.size,
        lastModified: stats.mtime
      });
      return;
    }

    // Check include patterns
    if (options.includePatterns.length > 0) {
      const matchesPattern = this.matchesIncludePattern(relativePath, options.includePatterns);
      if (!matchesPattern) {
        results.files.push({
          filePath: relativePath,
          success: false,
          error: 'Does not match include patterns',
          fileSize: stats.size,
          lastModified: stats.mtime
        });
        return;
      }
    }

    // File passed all checks
    results.files.push({
      filePath: relativePath,
      success: true,
      fileSize: stats.size,
      lastModified: stats.mtime,
      extension: path.extname(filePath).toLowerCase(),
      isFile: true
    });
  }

  /**
   * Check if path should be skipped based on exclude patterns
   */
  shouldSkipPath(filePath, excludePatterns) {
    return excludePatterns.some(pattern => {
      // Check if pattern matches any part of the path
      if (filePath.includes(pattern)) {
        return true;
      }
      
      // Check if pattern matches the filename
      const fileName = path.basename(filePath);
      if (fileName.includes(pattern)) {
        return true;
      }
      
      // Check if pattern matches directory names in the path
      const pathParts = filePath.split(path.sep);
      return pathParts.some(part => part.includes(pattern));
    });
  }

  /**
   * Check if file matches include patterns
   */
  matchesIncludePattern(filePath, includePatterns) {
    return includePatterns.some(pattern => {
      // Check file extension
      if (pattern.startsWith('.')) {
        return filePath.toLowerCase().endsWith(pattern.toLowerCase());
      }
      
      // Check if pattern matches any part of the path
      if (filePath.includes(pattern)) {
        return true;
      }
      
      // Check if pattern matches the filename
      const fileName = path.basename(filePath);
      if (fileName.includes(pattern)) {
        return true;
      }
      
      return false;
    });
  }

  /**
   * Get file statistics for a directory
   */
  async getDirectoryStats(dirPath, options = {}) {
    const walkOptions = { ...this.options, ...options };
    const stats = {
      totalFiles: 0,
      totalSize: 0,
      fileTypes: {},
      largestFiles: [],
      oldestFiles: [],
      newestFiles: []
    };

    try {
      await this.collectStats(dirPath, '', stats, walkOptions);
      
      // Sort arrays
      stats.largestFiles.sort((a, b) => b.size - a.size);
      stats.oldestFiles.sort((a, b) => a.mtime - b.mtime);
      stats.newestFiles.sort((a, b) => b.mtime - a.mtime);
      
      // Limit arrays
      stats.largestFiles = stats.largestFiles.slice(0, 10);
      stats.oldestFiles = stats.oldestFiles.slice(0, 10);
      stats.newestFiles = stats.newestFiles.slice(0, 10);
      
    } catch (error) {
      console.error('Error collecting directory stats:', error);
    }

    return stats;
  }

  /**
   * Collect statistics while walking
   */
  async collectStats(dirPath, relativePath, stats, options) {
    try {
      const items = await fs.readdir(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const itemRelativePath = path.join(relativePath, item);
        
        try {
          const itemStats = await fs.stat(itemPath);
          
          if (itemStats.isDirectory()) {
            if (options.recursive && !this.shouldSkipPath(itemRelativePath, options.excludePatterns)) {
              await this.collectStats(itemPath, itemRelativePath, stats, options);
            }
          } else {
            const extension = path.extname(item).toLowerCase();
            stats.totalFiles++;
            stats.totalSize += itemStats.size;
            
            // Count file types
            stats.fileTypes[extension] = (stats.fileTypes[extension] || 0) + 1;
            
            // Track largest files
            stats.largestFiles.push({
              path: itemRelativePath,
              size: itemStats.size,
              mtime: itemStats.mtime
            });
            
            // Track oldest files
            stats.oldestFiles.push({
              path: itemRelativePath,
              size: itemStats.size,
              mtime: itemStats.mtime
            });
            
            // Track newest files
            stats.newestFiles.push({
              path: itemRelativePath,
              size: itemStats.size,
              mtime: itemStats.mtime
            });
          }
        } catch (itemError) {
          console.warn(`Error collecting stats for ${itemRelativePath}:`, itemError.message);
        }
      }
    } catch (error) {
      console.warn(`Error reading directory ${dirPath}:`, error.message);
    }
  }

  /**
   * Find files by pattern
   */
  async findFiles(dirPath, pattern, options = {}) {
    const walkOptions = { ...this.options, ...options };
    const results = [];
    
    try {
      await this.searchFiles(dirPath, '', pattern, results, walkOptions);
    } catch (error) {
      console.error('Error finding files:', error);
    }
    
    return results;
  }

  /**
   * Search for files matching pattern
   */
  async searchFiles(dirPath, relativePath, pattern, results, options) {
    try {
      const items = await fs.readdir(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const itemRelativePath = path.join(relativePath, item);
        
        try {
          const stats = await fs.stat(itemPath);
          
          if (stats.isDirectory()) {
            if (options.recursive && !this.shouldSkipPath(itemRelativePath, options.excludePatterns)) {
              await this.searchFiles(itemPath, itemRelativePath, pattern, results, options);
            }
          } else {
            // Check if file matches pattern
            if (this.matchesPattern(item, pattern)) {
              results.push({
                path: itemRelativePath,
                size: stats.size,
                mtime: stats.mtime,
                extension: path.extname(item).toLowerCase()
              });
            }
          }
        } catch (itemError) {
          console.warn(`Error searching ${itemRelativePath}:`, itemError.message);
        }
      }
    } catch (error) {
      console.warn(`Error reading directory ${dirPath}:`, error.message);
    }
  }

  /**
   * Check if filename matches pattern
   */
  matchesPattern(filename, pattern) {
    // Simple pattern matching - can be enhanced with glob patterns
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(filename);
    }
    
    return filename.includes(pattern);
  }
}

export default FileSystemWalker;
