import './migrationQueue.js';

console.log('🚀 Background workers started successfully');
console.log('📊 Migration queue worker is running');

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Shutting down workers gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received. Shutting down workers gracefully...');
  process.exit(0);
});
