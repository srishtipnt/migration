import express from 'express';
import EmbeddingController from '../controllers/embeddingController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const embeddingController = new EmbeddingController();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route POST /api/embeddings/:sessionId/generate
 * @desc Generate embeddings for all chunks in a session
 * @access Private
 */
router.post('/:sessionId/generate', embeddingController.generateEmbeddings.bind(embeddingController));

/**
 * @route POST /api/embeddings/:sessionId/files/:filePath
 * @desc Parse a file and generate embeddings for its chunks
 * @access Private
 */
router.post('/:sessionId/files/:filePath', embeddingController.parseFileWithEmbeddings.bind(embeddingController));

/**
 * @route GET /api/embeddings/:sessionId/chunks/:chunkId/similar
 * @desc Find similar chunks using embeddings
 * @access Private
 */
router.get('/:sessionId/chunks/:chunkId/similar', embeddingController.findSimilarChunks.bind(embeddingController));

/**
 * @route GET /api/embeddings/:sessionId/statistics
 * @desc Get embedding statistics for a session
 * @access Private
 */
router.get('/:sessionId/statistics', embeddingController.getEmbeddingStatistics.bind(embeddingController));

/**
 * @route GET /api/embeddings/:sessionId/search
 * @desc Search embeddings by text query
 * @access Private
 */
router.get('/:sessionId/search', embeddingController.searchEmbeddings.bind(embeddingController));

/**
 * @route GET /api/embeddings/:sessionId/chunks/:chunkId
 * @desc Get embedding details for a specific chunk
 * @access Private
 */
router.get('/:sessionId/chunks/:chunkId', embeddingController.getChunkEmbedding.bind(embeddingController));

/**
 * @route GET /api/embeddings/:sessionId/export
 * @desc Export embeddings for a session
 * @access Private
 */
router.get('/:sessionId/export', embeddingController.exportEmbeddings.bind(embeddingController));

/**
 * @route DELETE /api/embeddings/:sessionId
 * @desc Delete all embeddings for a session
 * @access Private
 */
router.delete('/:sessionId', embeddingController.deleteEmbeddings.bind(embeddingController));

/**
 * @route GET /api/embeddings/status
 * @desc Get embedding service status
 * @access Private
 */
router.get('/status', embeddingController.getServiceStatus.bind(embeddingController));

export default router;
