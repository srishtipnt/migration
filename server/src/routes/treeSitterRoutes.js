import express from 'express';
import TreeSitterController from '../controllers/treeSitterController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const treeSitterController = new TreeSitterController();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route POST /api/treesitter/:sessionId/analyze
 * @desc Analyze uploaded ZIP file and extract semantic chunks
 * @access Private
 */
router.post('/:sessionId/analyze', treeSitterController.analyzeZipFile.bind(treeSitterController));

/**
 * @route POST /api/treesitter/:sessionId/file/:filePath/analyze
 * @desc Analyze a specific file
 * @access Private
 */
router.post('/:sessionId/file/:filePath/analyze', treeSitterController.analyzeFile.bind(treeSitterController));

/**
 * @route GET /api/treesitter/supported-types
 * @desc Get supported file types for Tree-sitter analysis
 * @access Private
 */
router.get('/supported-types', treeSitterController.getSupportedTypes.bind(treeSitterController));

/**
 * @route GET /api/treesitter/:sessionId/statistics
 * @desc Get chunk statistics for a session
 * @access Private
 */
router.get('/:sessionId/statistics', treeSitterController.getChunkStatistics.bind(treeSitterController));

/**
 * @route GET /api/treesitter/:sessionId/search
 * @desc Search chunks by criteria
 * @access Private
 */
router.get('/:sessionId/search', treeSitterController.searchChunks.bind(treeSitterController));

/**
 * @route GET /api/treesitter/:sessionId/export
 * @desc Export analysis results
 * @access Private
 */
router.get('/:sessionId/export', treeSitterController.exportAnalysis.bind(treeSitterController));

/**
 * @route GET /api/treesitter/:sessionId/progress
 * @desc Get analysis progress for a session
 * @access Private
 */
router.get('/:sessionId/progress', treeSitterController.getAnalysisProgress.bind(treeSitterController));

export default router;
