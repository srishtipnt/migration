import MigrationAgentService from '../services/migrationAgentService.js';

/**
 * Migration Controller - Handles HTTP requests for code migrations
 */
class MigrationController {
  constructor() {
    this.migrationAgent = MigrationAgentService; // Use singleton instance
  }

  /**
   * Process a migration request
   * POST /api/migrations/process
   */
  async processMigration(req, res) {
    try {
      const { sessionId, userId, command, targetTechnology, options } = req.body;

      if (!sessionId || !userId || !command || !targetTechnology) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: sessionId, userId, command, targetTechnology'
        });
      }

      console.log(`🚀 Processing migration request from user ${userId}`);
      console.log(`📝 Command: "${command}"`);
      console.log(`🎯 Target: ${targetTechnology}`);

      const migrationRequest = {
        sessionId,
        userId,
        command,
        targetTechnology,
        options: options || {}
      };

      const result = await this.migrationAgent.processMigrationRequest(migrationRequest);

      if (result.success) {
        res.status(200).json({
          success: true,
          migrationId: result.migrationId,
          command: result.command,
          targetTechnology: result.targetTechnology,
          plan: result.plan,
          results: result.results,
          validation: result.validation,
          statistics: result.statistics
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          step: result.step
        });
      }

    } catch (error) {
      console.error('❌ Migration Controller Error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during migration processing',
        details: error.message
      });
    }
  }

  /**
   * Get migration history for a session
   * GET /api/migrations/:sessionId/history
   */
  async getMigrationHistory(req, res) {
    try {
      const { sessionId } = req.params;
      const { userId } = req.query;

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Session ID is required'
        });
      }

      const history = await this.migrationAgent.getMigrationHistory(sessionId);

      res.status(200).json({
        success: true,
        sessionId,
        history: history.migrations,
        message: history.message
      });

    } catch (error) {
      console.error('❌ Migration History Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve migration history',
        details: error.message
      });
    }
  }

  /**
   * Test the migration agent
   * GET /api/migrations/test
   */
  async testMigrationAgent(req, res) {
    try {
      console.log('🧪 Testing Migration Agent...');
      
      const testResult = await this.migrationAgent.testAgent();

      res.status(200).json({
        success: true,
        message: 'Migration Agent test completed',
        testResults: testResult.testResults,
        agentReady: testResult.success
      });

    } catch (error) {
      console.error('❌ Migration Agent Test Error:', error);
      res.status(500).json({
        success: false,
        error: 'Migration Agent test failed',
        details: error.message
      });
    }
  }

  /**
   * Get migration status
   * GET /api/migrations/:migrationId/status
   */
  async getMigrationStatus(req, res) {
    try {
      const { migrationId } = req.params;

      if (!migrationId) {
        return res.status(400).json({
          success: false,
          error: 'Migration ID is required'
        });
      }

      // This would typically query the database for migration status
      // For now, return a placeholder response
      res.status(200).json({
        success: true,
        migrationId,
        status: 'completed',
        message: 'Migration status tracking coming soon'
      });

    } catch (error) {
      console.error('❌ Migration Status Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve migration status',
        details: error.message
      });
    }
  }

  /**
   * Cancel a migration
   * DELETE /api/migrations/:migrationId
   */
  async cancelMigration(req, res) {
    try {
      const { migrationId } = req.params;

      if (!migrationId) {
        return res.status(400).json({
          success: false,
          error: 'Migration ID is required'
        });
      }

      // This would typically cancel the migration process
      // For now, return a placeholder response
      res.status(200).json({
        success: true,
        migrationId,
        status: 'cancelled',
        message: 'Migration cancellation feature coming soon'
      });

    } catch (error) {
      console.error('❌ Migration Cancellation Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel migration',
        details: error.message
      });
    }
  }

  /**
   * Get available migration templates
   * GET /api/migrations/templates
   */
  async getMigrationTemplates(req, res) {
    try {
      const templates = [
        {
          id: 'database-prisma',
          name: 'Convert to Prisma',
          description: 'Convert database connections to Prisma ORM',
          command: 'convert database connection to Prisma',
          targetTechnology: 'Prisma',
          category: 'database'
        },
        {
          id: 'react-nextjs',
          name: 'Migrate to Next.js',
          description: 'Convert React app to Next.js framework',
          command: 'migrate React app to Next.js',
          targetTechnology: 'Next.js',
          category: 'framework'
        },
        {
          id: 'typescript-conversion',
          name: 'Convert to TypeScript',
          description: 'Convert JavaScript code to TypeScript',
          command: 'convert JavaScript to TypeScript',
          targetTechnology: 'TypeScript',
          category: 'language'
        },
        {
          id: 'api-rest-graphql',
          name: 'Convert to GraphQL',
          description: 'Convert REST API to GraphQL',
          command: 'convert REST API to GraphQL',
          targetTechnology: 'GraphQL',
          category: 'api'
        },
        {
          id: 'css-tailwind',
          name: 'Convert to Tailwind CSS',
          description: 'Convert CSS to Tailwind CSS utility classes',
          command: 'convert CSS to Tailwind CSS',
          targetTechnology: 'Tailwind CSS',
          category: 'styling'
        }
      ];

      res.status(200).json({
        success: true,
        templates,
        count: templates.length
      });

    } catch (error) {
      console.error('❌ Migration Templates Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve migration templates',
        details: error.message
      });
    }
  }
}

export default MigrationController;

