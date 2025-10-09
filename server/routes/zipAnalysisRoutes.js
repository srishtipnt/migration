import express from 'express';
import path from 'path';
import { authenticateToken } from '../middleware/auth.js';
import zipAnalysisService from '../services/ZipAnalysisService.js';

const router = express.Router();

/**
 * POST /api/zip-analysis/:sessionId
 * Analyze all files in a ZIP session to detect languages and frameworks
 */
router.post('/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    console.log(`🔍 Analyzing ZIP session: ${sessionId} for user: ${userId}`);

    const analysis = await zipAnalysisService.analyzeZipFiles(sessionId);

    res.json({
      success: true,
      data: analysis
    });

  } catch (error) {
    console.error('❌ ZIP analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze ZIP files',
      message: error.message
    });
  }
});

/**
 * POST /api/zip-analysis/:sessionId/convert
 * Convert individual files based on analysis
 */
router.post('/:sessionId/convert', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { targetLanguage, analysis } = req.body;
    const userId = req.user.id;

    if (!targetLanguage) {
      return res.status(400).json({
        success: false,
        error: 'Target language required',
        message: 'Please specify the target language for conversion'
      });
    }

    console.log(`🔄 Converting ZIP session: ${sessionId} to ${targetLanguage}`);

    const results = await zipAnalysisService.convertIndividualFiles(
      sessionId, 
      analysis, 
      targetLanguage
    );

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('❌ ZIP conversion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to convert ZIP files',
      message: error.message
    });
  }
});

/**
 * GET /api/zip-analysis/:sessionId/status
 * Get analysis status for a session
 */
router.get('/:sessionId/status', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    console.log(`📊 Getting analysis status for session: ${sessionId}`);

    // Check if analysis exists
    const FileStorage = (await import('../models/FileStorage.js')).default;
    const files = await FileStorage.find({ sessionId, userId });

    if (files.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No files found',
        message: 'No files found for this session'
      });
    }

    // Quick analysis without full processing
    const quickAnalysis = {
      sessionId,
      totalFiles: files.length,
      fileExtensions: {},
      needsAnalysis: true
    };

    // Count file extensions
    files.forEach(file => {
      const ext = path.extname(file.originalFilename).toLowerCase();
      quickAnalysis.fileExtensions[ext] = (quickAnalysis.fileExtensions[ext] || 0) + 1;
    });

    res.json({
      success: true,
      data: quickAnalysis
    });

  } catch (error) {
    console.error('❌ Status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check status',
      message: error.message
    });
  }
});

export default router;

