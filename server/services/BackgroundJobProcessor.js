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
      return;
    }

    this.isProcessing = true;

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
    this.isProcessing = false;
  }

  /**
   * Process the next pending job
   */
  async processNextJob() {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
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

    this.currentJobs.add(job._id);

    try {
      await job.updateStatus('processing');
      await this.processJob(job);
      await job.updateStatus('ready');
    } catch (error) {
      console.error(`Job failed: ${job.sessionId}`, error);
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
      // JavaScript/TypeScript
      '.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs',
      // Python
      '.py', '.pyw', '.pyi', '.py2', '.py3',
      // Java
      '.java', '.jsp', '.jspx',
      // C/C++
      '.c', '.cpp', '.cc', '.cxx', '.c++', '.h', '.hpp', '.hxx', '.h++',
      // C#
      '.cs', '.csx',
      // PHP
      '.php', '.phtml', '.php3', '.php4', '.php5', '.php7', '.phps',
      // Ruby
      '.rb', '.rbw', '.rake', '.gemspec',
      // Go
      '.go',
      // Rust
      '.rs',
      // Swift
      '.swift',
      // Objective-C
      '.m', '.mm', '.h',
      // Kotlin
      '.kt', '.kts',
      // Scala
      '.scala', '.sc',
      // R
      '.r', '.R',
      // MATLAB
      '.m', '.matlab',
      // Perl
      '.pl', '.pm', '.t', '.pod',
      // Lua
      '.lua',
      // Dart
      '.dart',
      // Elixir
      '.ex', '.exs',
      // Clojure
      '.clj', '.cljs', '.cljc', '.edn',
      // Haskell
      '.hs', '.lhs',
      // F#
      '.fs', '.fsi', '.fsx',
      // OCaml
      '.ml', '.mli',
      // Erlang
      '.erl', '.hrl',
      // Julia
      '.jl',
      // Crystal
      '.cr',
      // Nim
      '.nim', '.nims',
      // Zig
      '.zig',
      // Frontend Frameworks
      '.vue', '.svelte', '.astro', '.html', '.htm'
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
   * Semantic chunking implementation - creates meaningful logical units
   */
  simpleChunking(content, filePath, fileName, extension) {
    // Special handling for HTML files
    if (extension === '.html' || extension === '.htm') {
      return this.chunkHtmlFile(content, filePath, fileName, extension);
    }
    
    // For small files (< 500 lines), process as single unit
    const lines = content.split('\n');
    if (lines.length < 500) {
      return [{
        filePath,
        fileName,
        fileExtension: extension,
        chunkType: 'file',
        chunkName: fileName,
        content: content.trim(),
        startLine: 1,
        endLine: lines.length
      }];
    }
    
    const chunks = [];
    
    // Semantic chunking: group related constructs together
    let currentChunk = '';
    let startLine = 1;
    let chunkType = 'other';
    let chunkName = fileName;
    let braceLevel = 0;
    let inClass = false;
    let inFunction = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      const trimmed = line.trim();
      
      // Track brace levels for proper scope detection
      braceLevel += (line.match(/{/g) || []).length;
      braceLevel -= (line.match(/}/g) || []).length;
      
      // Detect major constructs (classes, interfaces, enums)
      if (this.isClassDefinition(line, extension) || this.isInterfaceDefinition(line, extension) || this.isEnumDefinition(line, extension)) {
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
        
        // Start new major construct chunk
        currentChunk = line;
        startLine = lineNumber;
        chunkType = this.getChunkTypeFromLine(line, extension);
        chunkName = this.extractConstructName(line, extension);
        inClass = true;
        inFunction = false;
      }
      // Detect standalone functions (not inside classes)
      else if (this.isFunctionDefinition(line, extension) && !inClass) {
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
        inFunction = true;
      }
      // If we're inside a class and encounter a function, include it in the class chunk
      else if (inClass && this.isFunctionDefinition(line, extension)) {
        currentChunk += '\n' + line;
        inFunction = true;
      }
      // If we're inside a class and the brace level goes back to 0, end the class
      else if (inClass && braceLevel === 0 && trimmed === '}') {
        currentChunk += '\n' + line;
        // Save the complete class chunk
        chunks.push({
          filePath,
          fileName,
          fileExtension: extension,
          chunkType,
          chunkName,
          content: currentChunk.trim(),
          startLine,
          endLine: lineNumber
        });
        currentChunk = '';
        inClass = false;
        inFunction = false;
      }
      // If we're in a standalone function and the brace level goes back to 0, end the function
      else if (inFunction && !inClass && braceLevel === 0 && trimmed === '}') {
        currentChunk += '\n' + line;
        // Save the complete function chunk
        chunks.push({
          filePath,
          fileName,
          fileExtension: extension,
          chunkType,
          chunkName,
          content: currentChunk.trim(),
          startLine,
          endLine: lineNumber
        });
        currentChunk = '';
        inFunction = false;
      }
      else {
        currentChunk += '\n' + line;
      }
    }
    
    // Save final chunk if exists
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
   * Special chunking for HTML files (AngularJS, Vue, etc.)
   */
  chunkHtmlFile(content, filePath, fileName, extension) {
    const chunks = [];
    const lines = content.split('\n');
    
    let currentChunk = '';
    let startLine = 1;
    let chunkType = 'html';
    let chunkName = fileName;
    let inScript = false;
    let inTemplate = false;
    let inStyle = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      const trimmed = line.trim();
      
      // Detect script sections
      if (trimmed.includes('<script>') || trimmed.includes('<script ')) {
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
        
        currentChunk = line;
        startLine = lineNumber;
        chunkType = 'script';
        chunkName = 'script_section';
        inScript = true;
        inTemplate = false;
        inStyle = false;
      }
      // Detect template sections
      else if (trimmed.includes('<template>') || trimmed.includes('<div')) {
        if (!inScript && !inStyle) {
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
          
          currentChunk = line;
          startLine = lineNumber;
          chunkType = 'template';
          chunkName = 'template_section';
          inTemplate = true;
          inScript = false;
          inStyle = false;
        }
      }
      // Detect style sections
      else if (trimmed.includes('<style>') || trimmed.includes('<style ')) {
        if (!inScript && !inTemplate) {
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
          
          currentChunk = line;
          startLine = lineNumber;
          chunkType = 'style';
          chunkName = 'style_section';
          inStyle = true;
          inScript = false;
          inTemplate = false;
        }
      }
      // Detect AngularJS patterns
      else if (trimmed.includes('.controller(') || trimmed.includes('.service(') || 
               trimmed.includes('.directive(') || trimmed.includes('.factory(') ||
               trimmed.includes('.filter(')) {
        if (inScript) {
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
          
          currentChunk = line;
          startLine = lineNumber;
          chunkType = 'angularjs';
          chunkName = this.extractAngularJSName(line);
        }
      }
      // Detect Vue patterns
      else if (trimmed.includes('export default') || trimmed.includes('methods:') ||
               trimmed.includes('computed:') || trimmed.includes('watch:')) {
        if (inScript) {
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
          
          currentChunk = line;
          startLine = lineNumber;
          chunkType = 'vue';
          chunkName = this.extractVueName(line);
        }
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
      case '.cs':
        // C# methods: public/private/protected, static/virtual/override, return type, method name
        return /^(public|private|protected|internal)?\s*(static|virtual|override|abstract)?\s*\w+\s+\w+\s*\(/.test(trimmed);
      case '.c':
      case '.cpp':
      case '.cc':
      case '.cxx':
      case '.c++':
        // C/C++ functions: return type, function name
        return /^\w+\s+\w+\s*\(/.test(trimmed);
      case '.html':
      case '.htm':
        // AngularJS controller functions, Vue methods, etc.
        return /^\s*function\s+\w+\s*\(|^\s*\w+\s*:\s*function\s*\(|^\s*\w+\s*\([^)]*\)\s*{/.test(trimmed);
      case '.vue':
        // Vue component methods
        return /^\s*(methods|computed|watch)\s*:\s*{|^\s*\w+\s*\([^)]*\)\s*{/.test(trimmed);
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
      case '.cs':
        // C# classes: public/private/protected, class/struct/interface, class name
        return /^(public|private|protected|internal)?\s*(class|struct|interface)\s+\w+/.test(trimmed);
      case '.c':
      case '.cpp':
      case '.cc':
      case '.cxx':
      case '.c++':
        // C++ classes: class/struct, class name
        return /^(class|struct)\s+\w+/.test(trimmed);
      case '.html':
      case '.htm':
        // AngularJS controllers, services, directives
        return /^\s*\.controller\s*\(|^\s*\.service\s*\(|^\s*\.directive\s*\(|^\s*\.factory\s*\(|^\s*\.filter\s*\(/.test(trimmed);
      case '.vue':
        // Vue component definition
        return /^\s*export\s+default\s*{|^\s*<script>|^\s*<template>|^\s*<style>/.test(trimmed);
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
      case '.cs':
        // C# method name extraction: return type methodName(
        const csMatch = trimmed.match(/(?:public|private|protected|internal)?\s*(?:static|virtual|override|abstract)?\s*\w+\s+(\w+)\s*\(/);
        return csMatch ? csMatch[1] : 'anonymous';
      case '.c':
      case '.cpp':
      case '.cc':
      case '.cxx':
      case '.c++':
        // C/C++ function name extraction: return_type functionName(
        const cMatch = trimmed.match(/\w+\s+(\w+)\s*\(/);
        return cMatch ? cMatch[1] : 'anonymous';
      case '.html':
      case '.htm':
        const htmlMatch = trimmed.match(/function\s+(\w+)|(\w+)\s*:\s*function/);
        return htmlMatch ? (htmlMatch[1] || htmlMatch[2]) : 'anonymous';
      case '.vue':
        const vueMatch = trimmed.match(/(\w+)\s*\([^)]*\)\s*{/);
        return vueMatch ? vueMatch[1] : 'anonymous';
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
      case '.cs':
        // C# class name extraction: class/struct/interface ClassName
        const csMatch = trimmed.match(/(?:public|private|protected|internal)?\s*(?:class|struct|interface)\s+(\w+)/);
        return csMatch ? csMatch[1] : 'UnknownClass';
      case '.c':
      case '.cpp':
      case '.cc':
      case '.cxx':
      case '.c++':
        // C++ class name extraction: class/struct ClassName
        const cMatch = trimmed.match(/(?:class|struct)\s+(\w+)/);
        return cMatch ? cMatch[1] : 'UnknownClass';
      default:
        return 'UnknownClass';
    }
  }

  /**
   * Check if line is an interface definition
   */
  isInterfaceDefinition(line, extension) {
    const trimmed = line.trim();
    
    switch (extension) {
      case '.cs':
        return /^(public|private|protected|internal)?\s*interface\s+\w+/.test(trimmed);
      case '.java':
        return /^(public|private|protected)?\s*interface\s+\w+/.test(trimmed);
      case '.ts':
      case '.tsx':
        return /^(export\s+)?interface\s+\w+/.test(trimmed);
      default:
        return false;
    }
  }

  /**
   * Check if line is an enum definition
   */
  isEnumDefinition(line, extension) {
    const trimmed = line.trim();
    
    switch (extension) {
      case '.cs':
        return /^(public|private|protected|internal)?\s*enum\s+\w+/.test(trimmed);
      case '.java':
        return /^(public|private|protected)?\s*enum\s+\w+/.test(trimmed);
      case '.ts':
      case '.tsx':
        return /^(export\s+)?enum\s+\w+/.test(trimmed);
      default:
        return false;
    }
  }

  /**
   * Get chunk type from line
   */
  getChunkTypeFromLine(line, extension) {
    if (this.isClassDefinition(line, extension)) return 'class';
    if (this.isInterfaceDefinition(line, extension)) return 'interface';
    if (this.isEnumDefinition(line, extension)) return 'enum';
    if (this.isFunctionDefinition(line, extension)) return 'function';
    return 'other';
  }

  /**
   * Extract construct name (class, interface, enum)
   */
  extractConstructName(line, extension) {
    const trimmed = line.trim();
    
    switch (extension) {
      case '.cs':
        const csMatch = trimmed.match(/(?:public|private|protected|internal)?\s*(?:class|struct|interface|enum)\s+(\w+)/);
        return csMatch ? csMatch[1] : 'UnknownConstruct';
      case '.java':
        const javaMatch = trimmed.match(/(?:public|private|protected)?\s*(?:class|interface|enum)\s+(\w+)/);
        return javaMatch ? javaMatch[1] : 'UnknownConstruct';
      case '.ts':
      case '.tsx':
        const tsMatch = trimmed.match(/(?:export\s+)?(?:class|interface|enum)\s+(\w+)/);
        return tsMatch ? tsMatch[1] : 'UnknownConstruct';
      default:
        return 'UnknownConstruct';
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
      console.log(`🔍 Debug: About to save ${chunks.length} chunks for job ${job._id}`);
      console.log(`🔍 Debug: Job sessionId: ${job.sessionId}, userId: ${job.userId}`);
      
      // Clear existing chunks for this job to avoid duplicates
      console.log(`🧹 Clearing existing chunks for job: ${job._id}`);
      const deleteResult = await CodeChunk.deleteMany({ jobId: job._id });
      console.log(`🧹 Deleted ${deleteResult.deletedCount} existing chunks`);
      
      // Small delay to ensure deletion is complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      let savedCount = 0;
      let skippedCount = 0;
      
      for (const chunk of chunks) {
        try {
          const chunkData = {
            jobId: job._id,
            sessionId: job.sessionId,
            userId: job.userId,
            fileExtension: chunk.fileName ? chunk.fileName.split('.').pop() || 'js' : 'js',
            ...chunk
          };
          
          console.log(`🔍 Debug: Saving chunk with data:`, {
            jobId: chunkData.jobId,
            sessionId: chunkData.sessionId,
            userId: chunkData.userId,
            filePath: chunkData.filePath,
            fileName: chunkData.fileName,
            chunkType: chunkData.chunkType,
            chunkName: chunkData.chunkName
          });
          
          // Use upsert to handle potential duplicates gracefully
          await CodeChunk.upsertChunk(chunkData);
          savedCount++;
          
        } catch (error) {
          if (error.code === 11000) {
            // Duplicate key error - skip this chunk
            console.log(`⚠️ Duplicate chunk skipped: ${chunk.chunkName || 'anonymous'}`);
            skippedCount++;
          } else {
          console.error(`❌ Failed to save chunk: ${error.message}`);
          console.error(`❌ Chunk data:`, chunk);
          throw error;
          }
        }
      }
      
      console.log(`💾 Saved ${savedCount} chunks to database (${skippedCount} duplicates skipped)`);
      
    } catch (error) {
      console.error(`❌ Error in saveChunksToDatabase:`, error);
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

  /**
   * Extract AngularJS component name from line
   */
  extractAngularJSName(line) {
    const trimmed = line.trim();
    
    // Match .controller('Name', ...), .service('Name', ...), etc.
    const match = trimmed.match(/\.(controller|service|directive|factory|filter)\s*\(\s*['"`]([^'"`]+)['"`]/);
    if (match) {
      return `${match[1]}_${match[2]}`;
    }
    
    return 'angularjs_component';
  }

  /**
   * Extract Vue component name from line
   */
  extractVueName(line) {
    const trimmed = line.trim();
    
    // Match export default { name: 'ComponentName' }
    const nameMatch = trimmed.match(/name\s*:\s*['"`]([^'"`]+)['"`]/);
    if (nameMatch) {
      return `vue_${nameMatch[1]}`;
    }
    
    // Match methods:, computed:, watch:, etc.
    const sectionMatch = trimmed.match(/(methods|computed|watch|data|created|mounted|updated|destroyed)\s*:/);
    if (sectionMatch) {
      return `vue_${sectionMatch[1]}`;
    }
    
    return 'vue_component';
  }
}

export default BackgroundJobProcessor;
