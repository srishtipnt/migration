import fs from 'fs-extra';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import axios from 'axios';
import JSZip from 'jszip';
import mongoose from 'mongoose';
import MigrationJob from '../models/MigrationJob.js';
import CodeChunk from '../models/CodeChunk.js';
import GeminiEmbeddingService from './GeminiEmbeddingService.js';
import ASTParsingService from './ASTParsingService.js';

const execAsync = promisify(exec);

class BackgroundJobProcessor {
  constructor() {
    this.isProcessing = false;
    this.currentJobs = new Set();
    this.tempWorkspaceBase = path.join(process.cwd(), 'temp-workspaces');
  }

  /**
   * Start processing pending jobs
   */
  async startProcessing() {
    if (this.isProcessing) {
      console.log('🔄 Job processor already running');
      return;
    }

    this.isProcessing = true;
    console.log('🚀 Starting background job processor');

    // Ensure temp workspace directory exists
    await this.ensureTempWorkspace();

    // Process jobs in a loop
    while (this.isProcessing) {
      try {
        await this.processNextJob();
        // Wait 5 seconds before checking for next job
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (error) {
        console.error('❌ Error in job processing loop:', error);
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds on error
      }
    }
  }

  /**
   * Stop processing jobs
   */
  stopProcessing() {
    console.log('🛑 Stopping background job processor');
    this.isProcessing = false;
  }

  /**
   * Process the next pending job
   */
  async processNextJob() {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      console.log('⏳ Waiting for MongoDB connection...');
      return;
    }

    const job = await MigrationJob.findOne({ 
      status: { $in: ['pending', 'processing'] },
      _id: { $nin: Array.from(this.currentJobs) },
      totalChunks: 0  // Only process jobs that haven't been chunked yet
    }).sort({ createdAt: 1 });

    if (!job) {
      return; // No pending or processing jobs
    }

    console.log(`📋 Processing job: ${job.sessionId}`);
    this.currentJobs.add(job._id);

    try {
      await job.updateStatus('processing');
      await this.processJob(job);
      await job.updateStatus('ready');
      console.log(`✅ Job completed: ${job.sessionId}`);
    } catch (error) {
      console.error(`❌ Job failed: ${job.sessionId}`, error);
      await job.updateStatus('failed', error);
    } finally {
      this.currentJobs.delete(job._id);
    }
  }

  /**
   * Process a single migration job
   */
  async processJob(job) {
    const workspacePath = path.join(this.tempWorkspaceBase, job.sessionId);
    
    try {
      // Step 1: Download individual files from Cloudinary instead of ZIP
      console.log(`📥 Downloading individual files for job: ${job.sessionId}`);
      await this.downloadIndividualFiles(job.sessionId, workspacePath);
      
      // Step 3: Walk file tree and chunk code
      console.log(`🔍 Walking file tree for job: ${job.sessionId}`);
      const chunks = await this.walkAndChunkFiles(workspacePath, job);
      
      // Step 4: Generate embeddings for chunks using Gemini API
      console.log(`🧠 Generating embeddings for ${chunks.length} chunks using Gemini API`);
      const chunksWithEmbeddings = await GeminiEmbeddingService.generateEmbeddings(chunks);

      // If no chunks were produced, check if this is expected (non-code files)
      if (chunksWithEmbeddings.length === 0) {
        console.log(`⚠️ No chunks generated for session ${job.sessionId}`);
        
        // Check if this session has any code files
        const FileStorage = (await import('../models/FileStorage.js')).default;
        const files = await FileStorage.find({ sessionId: job.sessionId });
        const hasCodeFiles = files.some(file => {
          const extension = path.extname(file.originalFilename).toLowerCase();
          return this.isCodeFile(extension);
        });
        
        if (hasCodeFiles) {
          throw new Error('No chunks generated for this session despite having code files');
        } else {
          console.log(`ℹ️ No code files found in session ${job.sessionId}, marking as ready`);
          // For non-code files, mark job as ready with 0 chunks
          await job.updateProgress(job.totalFiles, 0);
          return; // Exit early, don't try to save chunks
        }
      }

      // Step 5: Save chunks to MongoDB
      console.log(`💾 Saving ${chunksWithEmbeddings.length} chunks to database`);
      await this.saveChunksToDatabase(chunksWithEmbeddings, job);

      // Step 6: Update job progress
      await job.updateProgress(job.totalFiles, chunksWithEmbeddings.length);
      
    } finally {
      // Step 7: Clean up temporary workspace
      await this.cleanupWorkspace(workspacePath);
    }
  }

  /**
   * Download individual files from Cloudinary for a session
   */
  async downloadIndividualFiles(sessionId, workspacePath) {
    try {
      console.log(`📥 Downloading individual files for session: ${sessionId}`);
      
      // Get all files for this session from database (ZIP-extracted and single-file)
      const FileStorage = (await import('../models/FileStorage.js')).default;
      let files = await FileStorage.find({ sessionId: sessionId });
      
      // Retry a few times if no files found yet (race between job creation and file save)
      if (!files || files.length === 0) {
        for (let attempt = 1; attempt <= 5; attempt++) {
          console.log(`⏳ No files found yet for session ${sessionId}. Retry ${attempt}/5...`);
          await new Promise(r => setTimeout(r, 1000 * attempt));
          files = await FileStorage.find({ sessionId: sessionId });
          if (files.length > 0) break;
        }
      }

      console.log(`📄 Found ${files.length} files to download`);
      if (!files || files.length === 0) {
        throw new Error(`No files found in FileStorage for session ${sessionId}`);
      }
      
      // Create workspace directory
      await fs.ensureDir(workspacePath);
      
      // Download each file
      for (const file of files) {
        try {
          console.log(`📥 Downloading file: ${file.originalFilename}`);
          
          // Download file content directly from stored secure_url
          const response = await axios.get(file.secure_url, {
            responseType: 'text',
            timeout: 30000
          });
          
          // Create directory structure
          const relativePath = file.relativePath || file.originalFilename;
          const filePath = path.join(workspacePath, relativePath);
          const fileDir = path.dirname(filePath);
          await fs.ensureDir(fileDir);
          
          // Write file content
          await fs.writeFile(filePath, response.data, 'utf8');
          
          console.log(`✅ Downloaded: ${file.originalFilename}`);
        } catch (fileError) {
          console.error(`❌ Failed to download file ${file.originalFilename}:`, fileError.message);
          // Continue with other files
        }
      }
      
      console.log(`✅ All files downloaded for session: ${sessionId}`);
    } catch (error) {
      console.error(`❌ Failed to download individual files:`, error);
      throw new Error(`Failed to download individual files: ${error.message}`);
    }
  }

  /**
   * Extract ZIP buffer to workspace directory (deprecated - now using individual files)
   */
  async extractZipToWorkspace(zipBuffer, workspacePath) {
    try {
      // Create workspace directory
      await fs.mkdir(workspacePath, { recursive: true });
      
      // Extract ZIP file
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(zipBuffer);
      
      // Extract all files
      const extractPromises = [];
      zipContent.forEach((relativePath, file) => {
        if (!file.dir) {
          const filePath = path.join(workspacePath, relativePath);
          const fileDir = path.dirname(filePath);
          
          extractPromises.push(
            fs.mkdir(fileDir, { recursive: true }).then(() =>
              file.async('nodebuffer').then(buffer =>
                fs.writeFile(filePath, buffer)
              )
            )
          );
        }
      });
      
      await Promise.all(extractPromises);
      console.log(`📁 Extracted files to: ${workspacePath}`);
      
    } catch (error) {
      throw new Error(`Failed to extract ZIP file: ${error.message}`);
    }
  }

  /**
   * Walk through files and create semantic chunks
   */
  async walkAndChunkFiles(workspacePath, job) {
    const chunks = [];
    let processedFiles = 0;
    
    const walkDir = async (dirPath, relativePath = '') => {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const currentRelativePath = path.join(relativePath, entry.name);
        
        if (entry.isDirectory()) {
          await walkDir(fullPath, currentRelativePath);
        } else if (entry.isFile()) {
          const fileExtension = path.extname(entry.name).toLowerCase();
          
          // Only process code files
          if (this.isCodeFile(fileExtension)) {
            try {
              const fileChunks = await this.chunkFile(fullPath, currentRelativePath, fileExtension);
              chunks.push(...fileChunks);
              processedFiles++;
              
              // Update progress every 10 files
              if (processedFiles % 10 === 0) {
                await job.updateProgress(processedFiles, chunks.length);
              }
            } catch (error) {
              console.error(`❌ Error processing file ${currentRelativePath}:`, error);
            }
          }
        }
      }
    };
    
    await walkDir(workspacePath);
    return chunks;
  }

  /**
   * Check if file extension is a code file
   */
  isCodeFile(extension) {
    const codeExtensions = [
      '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.cs',
      '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.r',
      '.m', '.h', '.hpp', '.cc', '.cxx', '.vue', '.svelte'
    ];
    return codeExtensions.includes(extension);
  }

  /**
   * Chunk a single file into semantic pieces using AST parsing
   */
  async chunkFile(filePath, relativePath, extension) {
    try {
      // Use AST parsing service for better semantic chunking
      return await ASTParsingService.parseFile(filePath, relativePath, extension);
      
    } catch (error) {
      console.error(`❌ Error parsing file ${relativePath}:`, error);
      return [];
    }
  }

  /**
   * Simple chunking implementation (to be replaced with tree-sitter)
   */
  simpleChunking(content, filePath, fileName, extension) {
    const chunks = [];
    const lines = content.split('\n');
    
    // Split content into logical chunks (functions, classes, etc.)
    let currentChunk = '';
    let startLine = 1;
    let chunkType = 'other';
    let chunkName = fileName;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      
      // Detect function definitions
      if (this.isFunctionDefinition(line, extension)) {
        // Save previous chunk if exists
        if (currentChunk.trim()) {
          chunks.push({
            filePath,
            fileName,
            fileExtension: extension,
            chunkType,
            chunkName,
            content: currentChunk.trim(),
            startLine,
            endLine: lineNumber - 1
          });
        }
        
        // Start new function chunk
        currentChunk = line;
        startLine = lineNumber;
        chunkType = 'function';
        chunkName = this.extractFunctionName(line, extension);
      }
      // Detect class definitions
      else if (this.isClassDefinition(line, extension)) {
        // Save previous chunk if exists
        if (currentChunk.trim()) {
          chunks.push({
            filePath,
            fileName,
            fileExtension: extension,
            chunkType,
            chunkName,
            content: currentChunk.trim(),
            startLine,
            endLine: lineNumber - 1
          });
        }
        
        // Start new class chunk
        currentChunk = line;
        startLine = lineNumber;
        chunkType = 'class';
        chunkName = this.extractClassName(line, extension);
      }
      else {
        currentChunk += '\n' + line;
      }
    }
    
    // Save final chunk
    if (currentChunk.trim()) {
      chunks.push({
        filePath,
        fileName,
        fileExtension: extension,
        chunkType,
        chunkName,
        content: currentChunk.trim(),
        startLine,
        endLine: lines.length
      });
    }
    
    return chunks;
  }

  /**
   * Check if line is a function definition
   */
  isFunctionDefinition(line, extension) {
    const trimmed = line.trim();
    
    switch (extension) {
      case '.js':
      case '.ts':
      case '.jsx':
      case '.tsx':
        return /^(export\s+)?(async\s+)?function\s+\w+|^(export\s+)?const\s+\w+\s*=\s*(async\s+)?\(|^(export\s+)?\w+\s*:\s*(async\s+)?\(/.test(trimmed);
      case '.py':
        return /^def\s+\w+\s*\(/.test(trimmed);
      case '.java':
        return /^(public|private|protected)?\s*(static\s+)?\w+\s+\w+\s*\(/.test(trimmed);
      default:
        return false;
    }
  }

  /**
   * Check if line is a class definition
   */
  isClassDefinition(line, extension) {
    const trimmed = line.trim();
    
    switch (extension) {
      case '.js':
      case '.ts':
      case '.jsx':
      case '.tsx':
        return /^(export\s+)?class\s+\w+/.test(trimmed);
      case '.py':
        return /^class\s+\w+/.test(trimmed);
      case '.java':
        return /^(public|private|protected)?\s*class\s+\w+/.test(trimmed);
      default:
        return false;
    }
  }

  /**
   * Extract function name from line
   */
  extractFunctionName(line, extension) {
    const trimmed = line.trim();
    
    switch (extension) {
      case '.js':
      case '.ts':
      case '.jsx':
      case '.tsx':
        const jsMatch = trimmed.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)|(?:export\s+)?const\s+(\w+)\s*=|(?:export\s+)?(\w+)\s*:/);
        return jsMatch ? (jsMatch[1] || jsMatch[2] || jsMatch[3]) : 'anonymous';
      case '.py':
        const pyMatch = trimmed.match(/def\s+(\w+)/);
        return pyMatch ? pyMatch[1] : 'anonymous';
      case '.java':
        const javaMatch = trimmed.match(/(?:public|private|protected)?\s*(?:static\s+)?\w+\s+(\w+)\s*\(/);
        return javaMatch ? javaMatch[1] : 'anonymous';
      default:
        return 'unknown';
    }
  }

  /**
   * Extract class name from line
   */
  extractClassName(line, extension) {
    const trimmed = line.trim();
    
    switch (extension) {
      case '.js':
      case '.ts':
      case '.jsx':
      case '.tsx':
        const jsMatch = trimmed.match(/(?:export\s+)?class\s+(\w+)/);
        return jsMatch ? jsMatch[1] : 'UnknownClass';
      case '.py':
        const pyMatch = trimmed.match(/class\s+(\w+)/);
        return pyMatch ? pyMatch[1] : 'UnknownClass';
      case '.java':
        const javaMatch = trimmed.match(/(?:public|private|protected)?\s*class\s+(\w+)/);
        return javaMatch ? javaMatch[1] : 'UnknownClass';
      default:
        return 'UnknownClass';
    }
  }

  // Note: Embedding generation methods moved to GeminiEmbeddingService

  /**
   * Calculate simple complexity score
   */
  calculateComplexity(content) {
    const lines = content.split('\n').length;
    const complexity = Math.min(lines / 10, 10); // Simple line-based complexity
    return Math.round(complexity * 10) / 10;
  }

  /**
   * Extract dependencies from code
   */
  extractDependencies(content) {
    const dependencies = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      // Match import statements
      const importMatch = line.match(/import\s+.*from\s+['"]([^'"]+)['"]/);
      if (importMatch) {
        dependencies.push(importMatch[1]);
      }
      
      // Match require statements
      const requireMatch = line.match(/require\(['"]([^'"]+)['"]\)/);
      if (requireMatch) {
        dependencies.push(requireMatch[1]);
      }
    }
    
    return [...new Set(dependencies)]; // Remove duplicates
  }

  /**
   * Extract exports from code
   */
  extractExports(content) {
    const exports = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      // Match export statements
      const exportMatch = line.match(/export\s+(?:default\s+)?(?:const|function|class)\s+(\w+)/);
      if (exportMatch) {
        exports.push(exportMatch[1]);
      }
    }
    
    return [...new Set(exports)]; // Remove duplicates
  }

  /**
   * Save chunks to MongoDB
   */
  async saveChunksToDatabase(chunks, job) {
    try {
      // Clear existing chunks for this job to avoid duplicates
      console.log(`🧹 Clearing existing chunks for job: ${job._id}`);
      await CodeChunk.deleteMany({ jobId: job._id });
      
      let savedCount = 0;
      
      for (const chunk of chunks) {
        try {
          await CodeChunk.createChunk({
            jobId: job._id,
            sessionId: job.sessionId,
            userId: job.userId,
            ...chunk
          });
          savedCount++;
        } catch (error) {
          console.error(`❌ Failed to save chunk: ${error.message}`);
          throw error;
        }
      }
      
      console.log(`💾 Saved ${savedCount} chunks to database`);
      
    } catch (error) {
      throw new Error(`Failed to save chunks to database: ${error.message}`);
    }
  }

  /**
   * Clean up temporary workspace
   */
  async cleanupWorkspace(workspacePath) {
    try {
      await fs.rm(workspacePath, { recursive: true, force: true });
      console.log(`🧹 Cleaned up workspace: ${workspacePath}`);
    } catch (error) {
      console.error(`❌ Error cleaning up workspace:`, error);
    }
  }

  /**
   * Ensure temp workspace directory exists
   */
  async ensureTempWorkspace() {
    try {
      await fs.mkdir(this.tempWorkspaceBase, { recursive: true });
    } catch (error) {
      console.error('❌ Error creating temp workspace directory:', error);
    }
  }
}

export default BackgroundJobProcessor;
