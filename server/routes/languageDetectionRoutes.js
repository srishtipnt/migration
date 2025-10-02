import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import languageDetectionService from '../services/LanguageDetectionService.js';

const router = express.Router();

/**
 * POST /api/language-detection/detect
 * Detect language and framework from file content
 */
router.post('/detect', authenticateToken, async (req, res) => {
  try {
    const { filename, content } = req.body;

    if (!filename || !content) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Both filename and content are required'
      });
    }

    console.log(`🔍 Language detection request for: ${filename}`);

    // Perform two-level detection
    const detection = languageDetectionService.detectLanguage(filename, content);

    console.log(`✅ Detection completed for ${filename}:`, detection);

    res.json({
      success: true,
      data: detection,
      message: 'Language detection completed successfully'
    });

  } catch (error) {
    console.error('❌ Language detection error:', error);
    res.status(500).json({
      success: false,
      error: 'Language detection failed',
      message: error.message
    });
  }
});

/**
 * POST /api/language-detection/validate
 * Validate if a file matches the expected language/framework
 */
router.post('/validate', authenticateToken, async (req, res) => {
  try {
    const { filename, content, expectedLanguage } = req.body;

    if (!filename || !content || !expectedLanguage) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'filename, content, and expectedLanguage are required'
      });
    }

    console.log(`🔍 Language validation request for: ${filename} (expected: ${expectedLanguage})`);

    // Validate file language match
    const isValid = languageDetectionService.validateFileLanguageMatch(filename, content, expectedLanguage);
    const detection = languageDetectionService.detectLanguage(filename, content);

    console.log(`✅ Validation completed for ${filename}: ${isValid}`);

    res.json({
      success: true,
      data: {
        isValid,
        detection,
        expectedLanguage
      },
      message: 'Language validation completed successfully'
    });

  } catch (error) {
    console.error('❌ Language validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Language validation failed',
      message: error.message
    });
  }
});

/**
 * GET /api/language-detection/supported-languages
 * Get list of all supported languages with their display information
 */
router.get('/supported-languages', authenticateToken, async (req, res) => {
  try {
    console.log('📋 Fetching supported languages list');

    const supportedLanguages = languageDetectionService.getSupportedLanguages();

    console.log(`✅ Retrieved ${supportedLanguages.length} supported languages`);

    res.json({
      success: true,
      data: supportedLanguages,
      message: 'Supported languages retrieved successfully'
    });

  } catch (error) {
    console.error('❌ Error fetching supported languages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch supported languages',
      message: error.message
    });
  }
});

/**
 * POST /api/language-detection/batch-detect
 * Detect languages for multiple files at once
 */
router.post('/batch-detect', authenticateToken, async (req, res) => {
  try {
    const { files } = req.body;

    if (!files || !Array.isArray(files)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        message: 'files array is required'
      });
    }

    console.log(`🔍 Batch language detection request for ${files.length} files`);

    const results = [];

    for (const file of files) {
      if (!file.filename || !file.content) {
        results.push({
          filename: file.filename || 'unknown',
          error: 'Missing filename or content'
        });
        continue;
      }

      try {
        const detection = languageDetectionService.detectLanguage(file.filename, file.content);
        results.push({
          filename: file.filename,
          detection
        });
      } catch (fileError) {
        results.push({
          filename: file.filename,
          error: fileError.message
        });
      }
    }

    console.log(`✅ Batch detection completed for ${files.length} files`);

    res.json({
      success: true,
      data: results,
      message: 'Batch language detection completed successfully'
    });

  } catch (error) {
    console.error('❌ Batch language detection error:', error);
    res.status(500).json({
      success: false,
      error: 'Batch language detection failed',
      message: error.message
    });
  }
});

export default router;
