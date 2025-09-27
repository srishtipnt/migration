import express from 'express';
import GeminiEmbeddingService from '../services/GeminiEmbeddingService.js';
import ASTParsingService from '../services/ASTParsingService.js';

const router = express.Router();

/**
 * Test Gemini API connection
 */
router.get('/test-gemini', async (req, res) => {
  try {
    const result = await GeminiEmbeddingService.testConnection();
    
    res.json({
      success: true,
      message: 'Gemini API test completed',
      result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to test Gemini API',
      message: error.message
    });
  }
});

/**
 * Test multi-key Gemini service
 */
router.get('/test-multi-key', async (req, res) => {
  try {
    const MultiKeyGeminiService = (await import('../services/MultiKeyGeminiService.js')).default;
    const multiKeyService = new MultiKeyGeminiService();
    
    const keyStatus = multiKeyService.getKeyStatus();
    const testResult = await multiKeyService.testConnection();
    
    res.json({
      success: true,
      message: 'Multi-key Gemini service test completed',
      keyStatus,
      testResult
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to test multi-key Gemini service',
      message: error.message
    });
  }
});

/**
 * Test AST parsing with sample code
 */
router.post('/test-ast-parsing', async (req, res) => {
  try {
    const { code, language = 'javascript' } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Code content is required'
      });
    }
    
    // Create a temporary file for testing
    const fs = await import('fs-extra');
    const path = await import('path');
    const os = await import('os');
    
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `test-${Date.now()}.${language === 'javascript' ? 'js' : language}`);
    
    await fs.default.writeFile(tempFile, code);
    
    const extension = language === 'javascript' ? '.js' : `.${language}`;
    const chunks = await ASTParsingService.parseFile(tempFile, 'test.js', extension);
    
    // Clean up temp file
    await fs.default.remove(tempFile);
    
    res.json({
      success: true,
      message: 'AST parsing test completed',
      chunks: chunks.map(chunk => ({
        chunkType: chunk.chunkType,
        chunkName: chunk.chunkName,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        content: chunk.content.substring(0, 200) + (chunk.content.length > 200 ? '...' : ''),
        astNodeType: chunk.astNodeType
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to test AST parsing',
      message: error.message
    });
  }
});

/**
 * Test semantic embeddings with sample chunks
 */
router.post('/test-embeddings', async (req, res) => {
  try {
    const { chunks } = req.body;
    
    if (!chunks || !Array.isArray(chunks)) {
      return res.status(400).json({
        success: false,
        error: 'Chunks array is required'
      });
    }
    
    const chunksWithEmbeddings = await GeminiEmbeddingService.generateEmbeddings(chunks);
    
    res.json({
      success: true,
      message: 'Embedding generation test completed',
      results: chunksWithEmbeddings.map(chunk => ({
        chunkName: chunk.chunkName,
        chunkType: chunk.chunkType,
        embeddingLength: chunk.embedding.length,
        embeddingModel: chunk.metadata.embeddingModel,
        complexity: chunk.metadata.complexity,
        dependencies: chunk.metadata.dependencies,
        exports: chunk.metadata.exports
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to test embeddings',
      message: error.message
    });
  }
});

/**
 * Test complete semantic chunking pipeline
 */
router.post('/test-pipeline', async (req, res) => {
  try {
    const { code, language = 'javascript' } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Code content is required'
      });
    }
    
    // Step 1: AST Parsing
    const fs = await import('fs-extra');
    const path = await import('path');
    const os = await import('os');
    
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `pipeline-test-${Date.now()}.${language === 'javascript' ? 'js' : language}`);
    
    await fs.default.writeFile(tempFile, code);
    
    const extension = language === 'javascript' ? '.js' : `.${language}`;
    const chunks = await ASTParsingService.parseFile(tempFile, 'test.js', extension);
    
    // Step 2: Generate Embeddings
    const chunksWithEmbeddings = await GeminiEmbeddingService.generateEmbeddings(chunks);
    
    // Clean up temp file
    await fs.default.remove(tempFile);
    
    res.json({
      success: true,
      message: 'Complete pipeline test completed',
      stats: {
        totalChunks: chunksWithEmbeddings.length,
        chunkTypes: [...new Set(chunksWithEmbeddings.map(c => c.chunkType))],
        averageComplexity: chunksWithEmbeddings.reduce((sum, c) => sum + c.metadata.complexity, 0) / chunksWithEmbeddings.length,
        totalDependencies: [...new Set(chunksWithEmbeddings.flatMap(c => c.metadata.dependencies))].length,
        embeddingModel: chunksWithEmbeddings[0]?.metadata.embeddingModel || 'unknown'
      },
      chunks: chunksWithEmbeddings.map(chunk => ({
        chunkType: chunk.chunkType,
        chunkName: chunk.chunkName,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        content: chunk.content.substring(0, 300) + (chunk.content.length > 300 ? '...' : ''),
        embeddingLength: chunk.embedding.length,
        complexity: chunk.metadata.complexity,
        dependencies: chunk.metadata.dependencies,
        exports: chunk.metadata.exports
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to test pipeline',
      message: error.message
    });
  }
});

export default router;
