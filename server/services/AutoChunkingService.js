import connectDB from '../config/database.js';
import MigrationJob from '../models/MigrationJob.js';
import FileStorage from '../models/FileStorage.js';
import CodeChunk from '../models/CodeChunk.js';
import GeminiEmbeddingService from './GeminiEmbeddingService.js';
import ASTParsingService from './ASTParsingService.js';
import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';

class AutoChunkingService {
  constructor() {
    this.isProcessing = false;
  }

  /**
   * Process all pending jobs automatically
   */
  async processPendingJobs() {
    if (this.isProcessing) {
      console.log('🔄 Auto-chunking already in progress');
      return;
    }

    try {
      await connectDB();
      this.isProcessing = true;
      
      console.log('🔍 Checking for pending jobs...');
      
      // Find all pending jobs
      const pendingJobs = await MigrationJob.find({ 
        status: 'pending' 
      }).sort({ createdAt: 1 });
      
      if (pendingJobs.length === 0) {
        console.log('✅ No pending jobs found');
        return;
      }
      
      console.log(`📋 Found ${pendingJobs.length} pending jobs`);
      
      // Process each job
      for (const job of pendingJobs) {
        try {
          console.log(`🚀 Processing job: ${job.sessionId}`);
          await job.updateStatus('processing');
          await this.processJob(job);
          await job.updateStatus('ready');
          console.log(`✅ Job completed: ${job.sessionId}`);
        } catch (error) {
          console.error(`❌ Job failed: ${job.sessionId}`, error);
          await job.updateStatus('failed', error);
        }
      }
      
    } catch (error) {
      console.error('❌ Auto-chunking failed:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single migration job
   */
  async processJob(job) {
    const sessionId = job.sessionId;
    const userId = job.userId;
    
    console.log(`📋 Processing job: ${sessionId}`);
    
    // Get files for this session
    const files = await FileStorage.find({ sessionId, userId });
    console.log(`📄 Found ${files.length} files`);
    
    if (files.length === 0) {
      console.log('⚠️ No files found for this session');
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
        
        if (this.isCodeFile(extension)) {
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
          jobId: job._id,
          sessionId: job.sessionId,
          userId: job.userId,
          ...chunk
        });
        savedChunks++;
      } catch (error) {
        console.error(`❌ Failed to save chunk:`, error.message);
      }
    }
    
    console.log(`💾 Saved ${savedChunks} chunks to database`);
    
    // Update job progress
    await job.updateProgress(files.length, savedChunks);
    
    // Cleanup
    await fs.remove(workspacePath);
    
    console.log(`✅ Job processing completed: ${files.length} files → ${savedChunks} chunks`);
  }

  isCodeFile(extension) {
    const codeExtensions = [
      // Core languages
      '.js', '.ts', '.jsx', '.tsx', '.py', '.py2', '.py3', '.java', '.cpp', '.c', '.cs', 
      '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala',
      // Objective-C
      '.m', '.mm', '.h',
      // Frontend frameworks
      '.vue', '.html', '.htm'
    ];
    return codeExtensions.includes(extension);
  }
}

export default AutoChunkingService;
