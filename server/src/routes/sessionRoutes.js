import express from 'express';
import {
  createSession,
  getSession,
  getUserSessions,
  updateSession,
  deleteSession,
  updateSessionProgress,
  getSessionStats
} from '../controllers/sessionController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Create new session
router.post('/', createSession);

// Get session by ID
router.get('/:id', getSession);

// Get all sessions for user
router.get('/', getUserSessions);

// Update session
router.put('/:id', updateSession);

// Delete session
router.delete('/:id', deleteSession);

// Update session progress
router.patch('/:id/progress', updateSessionProgress);

// Get session statistics
router.get('/stats/overview', getSessionStats);

export default router;

