/**
 * Test script for CleanupService
 * Run with: node test-cleanup.js
 */

import dotenv from 'dotenv';
import cleanupService from './services/CleanupService.js';

// Load environment variables
dotenv.config();

async function testCleanupService() {
  console.log('🧪 Testing CleanupService...\n');

  try {
    // 1. Get cleanup statistics
    console.log('📊 Getting cleanup statistics...');
    const stats = await cleanupService.getCleanupStats();
    
    if (stats) {
      console.log('✅ Cleanup stats retrieved:');
      console.log(`   - Pending jobs to clean: ${stats.pendingJobsToClean}`);
      console.log(`   - Old files to clean: ${stats.oldFilesToClean}`);
      console.log(`   - Total files in DB: ${stats.totalFiles}`);
      console.log(`   - Total jobs in DB: ${stats.totalJobs}`);
      console.log(`   - Cleanup running: ${stats.isRunning}`);
    } else {
      console.log('❌ Failed to get cleanup statistics');
    }

    console.log('\n🧹 Testing manual cleanup trigger...');
    
    // 2. Trigger manual cleanup
    await cleanupService.triggerCleanup();
    
    console.log('✅ Manual cleanup triggered successfully');
    console.log('📝 Check the logs above for cleanup progress');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testCleanupService().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
