import express from 'express';
import MigrationController from '../controllers/migrationController.js';

const router = express.Router();
const migrationController = new MigrationController();

/**
 * Migration Routes
 * All routes are prefixed with /api/migrations
 */

// POST /api/migrations/process
// Process a migration request
router.post('/process', (req, res) => {
  migrationController.processMigration(req, res);
});

// GET /api/migrations/:sessionId/history
// Get migration history for a session
router.get('/:sessionId/history', (req, res) => {
  migrationController.getMigrationHistory(req, res);
});

// GET /api/migrations/:migrationId/status
// Get status of a specific migration
router.get('/:migrationId/status', (req, res) => {
  migrationController.getMigrationStatus(req, res);
});

// DELETE /api/migrations/:migrationId
// Cancel a migration
router.delete('/:migrationId', (req, res) => {
  migrationController.cancelMigration(req, res);
});

// GET /api/migrations/templates
// Get available migration templates
router.get('/templates', (req, res) => {
  migrationController.getMigrationTemplates(req, res);
});

// GET /api/migrations/test
// Test the migration agent
router.get('/test', (req, res) => {
  migrationController.testMigrationAgent(req, res);
});

export default router;





