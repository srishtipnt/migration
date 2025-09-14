import express from 'express';
import { 
  createJob, 
  getJob, 
  getSessionJobs, 
  getUserJobs, 
  updateJob, 
  cancelJob, 
  retryJob, 
  getQueueStats 
} from '../controllers/jobController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Job management routes
router.post('/', createJob);
router.get('/stats', getQueueStats);
router.get('/user', getUserJobs);
router.get('/session/:sessionId', getSessionJobs);
router.get('/:id', getJob);
router.put('/:id', updateJob);
router.delete('/:id', cancelJob);
router.post('/:id/retry', retryJob);

export default router;
