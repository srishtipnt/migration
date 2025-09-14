import express from 'express';
import ChunkStorageController from '../controllers/chunkStorageController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const chunkStorageController = new ChunkStorageController();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route POST /api/chunks/:sessionId/store
 * @desc Store code chunks with embeddings in MongoDB
 * @access Private
 */
router.post('/:sessionId/store', chunkStorageController.storeChunksWithEmbeddings.bind(chunkStorageController));

/**
 * @route POST /api/chunks/:sessionId/parse-and-store
 * @desc Parse files and store chunks with embeddings
 * @access Private
 */
router.post('/:sessionId/parse-and-store', chunkStorageController.parseAndStoreFiles.bind(chunkStorageController));

/**
 * @route GET /api/chunks/:sessionId
 * @desc Get chunks by session ID
 * @access Private
 */
router.get('/:sessionId', chunkStorageController.getChunksBySession.bind(chunkStorageController));

/**
 * @route GET /api/chunks/:sessionId/chunks/:chunkId/similar
 * @desc Find similar chunks using embeddings
 * @access Private
 */
router.get('/:sessionId/chunks/:chunkId/similar', chunkStorageController.findSimilarChunks.bind(chunkStorageController));

/**
 * @route GET /api/chunks/:sessionId/statistics
 * @desc Get project statistics
 * @access Private
 */
router.get('/:sessionId/statistics', chunkStorageController.getProjectStatistics.bind(chunkStorageController));

/**
 * @route GET /api/chunks/:sessionId/search
 * @desc Search chunks by text query
 * @access Private
 */
router.get('/:sessionId/search', chunkStorageController.searchChunks.bind(chunkStorageController));

/**
 * @route GET /api/chunks/:sessionId/export
 * @desc Export chunks for a session
 * @access Private
 */
router.get('/:sessionId/export', chunkStorageController.exportChunks.bind(chunkStorageController));

/**
 * @route GET /api/chunks/chunk/:chunkId
 * @desc Get chunk by ID
 * @access Private
 */
router.get('/chunk/:chunkId', chunkStorageController.getChunkById.bind(chunkStorageController));

/**
 * @route PUT /api/chunks/chunk/:chunkId
 * @desc Update chunk metadata
 * @access Private
 */
router.put('/chunk/:chunkId', chunkStorageController.updateChunk.bind(chunkStorageController));

/**
 * @route DELETE /api/chunks/:sessionId
 * @desc Delete all chunks for a session
 * @access Private
 */
router.delete('/:sessionId', chunkStorageController.deleteChunksBySession.bind(chunkStorageController));

/**
 * @route GET /api/chunks/status
 * @desc Get storage service status
 * @access Private
 */
router.get('/status', chunkStorageController.getStorageStatus.bind(chunkStorageController));

export default router;





