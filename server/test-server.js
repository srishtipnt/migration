import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Simple Test Server for Migration API
 * Start this server to test HTTP endpoints
 */
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Import routes
import migrateRoutes from './src/routes/migrateRoutes.js';

// Use migration routes
app.use('/api/migrate', migrateRoutes);

// Test endpoint
app.get('/test', (req, res) => {
  res.json({
    message: 'Migration API Test Server is running!',
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET /test - This test endpoint',
      'GET /api/migrate/health - Health check',
      'GET /api/migrate/templates - Get migration templates',
      'POST /api/migrate/validate - Validate migration command',
      'POST /api/migrate/migrate - Process migration request',
      'GET /api/migrate/status/:id - Get migration status',
      'GET /api/migrate/history/:sessionId - Get migration history'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 Migration API Test Server Started!');
  console.log(`📡 Server running on http://localhost:${PORT}`);
  console.log('');
  console.log('🧪 Test endpoints:');
  console.log(`   GET  http://localhost:${PORT}/test`);
  console.log(`   GET  http://localhost:${PORT}/api/migrate/health`);
  console.log(`   GET  http://localhost:${PORT}/api/migrate/templates`);
  console.log('');
  console.log('📝 Example migration request:');
  console.log(`   POST http://localhost:${PORT}/api/migrate/migrate`);
  console.log('   Body: {');
  console.log('     "sessionId": "real-session-1757509883369",');
  console.log('     "userId": "test-user-123",');
  console.log('     "command": "convert database connection to Prisma",');
  console.log('     "targetTechnology": "Prisma"');
  console.log('   }');
  console.log('');
  console.log('💡 Use curl, Postman, or your browser to test these endpoints!');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down test server...');
  process.exit(0);
});





