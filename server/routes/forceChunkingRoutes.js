import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import GeminiEmbeddingService from '../services/GeminiEmbeddingService.js';
import ASTParsingService from '../services/ASTParsingService.js';
import CodeChunk from '../models/CodeChunk.js';
import MigrationJob from '../models/MigrationJob.js';

const router = express.Router();

/**
 * Force semantic chunking for a specific session
 */
router.post('/force-chunking/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    
    console.log(`🚀 Force chunking for session: ${sessionId}`);
    
    // Find the migration job
    const job = await MigrationJob.findOne({ sessionId, userId });
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Migration job not found'
      });
    }
    
    // Get files for this session
    const FileStorage = (await import('../models/FileStorage.js')).default;
    const files = await FileStorage.find({ sessionId, userId });
    
    console.log(`📄 Found ${files.length} files for chunking`);
    
    if (files.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No files found for this session'
      });
    }
    
    // Create temporary workspace
    const fs = await import('fs-extra');
    const path = await import('path');
    const os = await import('os');
    
    const workspacePath = path.join(os.tmpdir(), `chunking-${sessionId}-${Date.now()}`);
    await fs.ensureDir(workspacePath);
    
    console.log(`📁 Created workspace: ${workspacePath}`);
    
    // Download files to workspace
    const axios = (await import('axios')).default;
    let downloadedFiles = 0;
    
    for (const file of files) {
      try {
        console.log(`📥 Downloading: ${file.originalFilename}`);
        
        const response = await axios.get(file.secure_url, {
          responseType: 'arraybuffer',
          timeout: 30000
        });
        
        const filePath = path.join(workspacePath, file.originalFilename);
        const fileDir = path.dirname(filePath);
        await fs.ensureDir(fileDir);
        
        await fs.writeFile(filePath, response.data);
        downloadedFiles++;
        
        console.log(`✅ Downloaded: ${file.originalFilename}`);
      } catch (error) {
        console.error(`❌ Failed to download ${file.originalFilename}:`, error.message);
      }
    }
    
    console.log(`📊 Downloaded ${downloadedFiles}/${files.length} files`);
    
    // Start semantic chunking
    console.log(`🌳 Starting AST parsing...`);
    const chunks = [];
    
    // Walk through downloaded files and chunk them
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
          if (isCodeFile(fileExtension)) {
            try {
              console.log(`🌳 Parsing: ${currentRelativePath}`);
              const fileChunks = await ASTParsingService.parseFile(fullPath, currentRelativePath, fileExtension);
              chunks.push(...fileChunks);
              console.log(`✅ Parsed ${currentRelativePath}: ${fileChunks.length} chunks`);
            } catch (error) {
              console.error(`❌ Error parsing ${currentRelativePath}:`, error.message);
            }
          }
        }
      }
    };
    
    await walkDir(workspacePath);
    
    console.log(`🌳 Total chunks created: ${chunks.length}`);
    
    // Generate embeddings
    console.log(`🧠 Generating embeddings...`);
    const chunksWithEmbeddings = await GeminiEmbeddingService.generateEmbeddings(chunks);
    
    console.log(`🧠 Generated embeddings for ${chunksWithEmbeddings.length} chunks`);
    
    // Save chunks to database
    console.log(`💾 Saving chunks to database...`);
    const savedChunks = [];
    
    for (const chunk of chunksWithEmbeddings) {
      try {
        const savedChunk = await CodeChunk.createChunk({
          jobId: job._id,
          sessionId: job.sessionId,
          userId: job.userId,
          ...chunk
        });
        savedChunks.push(savedChunk);
      } catch (error) {
        console.error(`❌ Failed to save chunk:`, error.message);
      }
    }
    
    console.log(`💾 Saved ${savedChunks.length} chunks to database`);
    
    // Update job status
    await job.updateProgress(files.length, savedChunks.length);
    await job.updateStatus('ready');
    
    // Clean up workspace
    await fs.remove(workspacePath);
    console.log(`🧹 Cleaned up workspace`);
    
    res.json({
      success: true,
      message: 'Semantic chunking completed successfully',
      stats: {
        totalFiles: files.length,
        downloadedFiles,
        totalChunks: chunks.length,
        savedChunks: savedChunks.length,
        chunkTypes: [...new Set(chunks.map(c => c.chunkType))],
        embeddingModel: chunksWithEmbeddings[0]?.metadata?.embeddingModel || 'unknown'
      }
    });
    
  } catch (error) {
    console.error('❌ Force chunking failed:', error);
    res.status(500).json({
      success: false,
      error: 'Force chunking failed',
      message: error.message
    });
  }
});

/**
 * Check if file extension is a code file
 */
function isCodeFile(extension) {
  const codeExtensions = [
    // Core languages
    '.js', '.ts', '.jsx', '.tsx', '.py', '.py2', '.py3', '.java', '.cpp', '.c', '.cs',
    '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.r',
    // Objective-C
    '.m', '.h', '.hpp', '.cc', '.cxx',
    // Frontend frameworks
    '.vue', '.svelte', '.html', '.htm'
  ];
  return codeExtensions.includes(extension);
}

export default router;













