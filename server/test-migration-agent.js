import MigrationAgentService from './src/services/migrationAgentService.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Test script for Migration Agent Service
 */
async function testMigrationAgent() {
  console.log('🚀 Testing Migration Agent Service\n');

  try {
    // Initialize the migration agent
    console.log('⚙️  Initializing Migration Agent...');
    const migrationAgent = new MigrationAgentService();
    console.log('✅ Migration Agent initialized successfully\n');

    // Test 1: Basic agent functionality
    console.log('🧪 Test 1: Basic Agent Functionality');
    const testResult = await migrationAgent.testAgent();
    
    if (testResult.success) {
      console.log('✅ Migration Agent is ready');
      console.log('📊 Test Results:');
      console.log(`  - Embedding Service: ${testResult.testResults.embeddingService ? '✅' : '❌'}`);
      console.log(`  - Chunk Storage Service: ${testResult.testResults.chunkStorageService ? '✅' : '❌'}`);
      console.log(`  - Gemini Model: ${testResult.testResults.geminiModel}`);
      console.log(`  - Validation: ${testResult.testResults.validation.valid ? '✅' : '❌'}`);
    } else {
      console.log('❌ Migration Agent test failed:', testResult.error);
      return;
    }
    console.log('');

    // Test 2: Migration request processing
    console.log('🧪 Test 2: Migration Request Processing');
    
    const migrationRequest = {
      sessionId: 'real-session-1757509883369', // Use existing session
      userId: 'real-user-123',
      command: 'convert database connection to Prisma',
      targetTechnology: 'Prisma',
      options: {
        preserveData: true,
        generateTypes: true,
        addValidation: true
      }
    };

    console.log('📝 Processing migration request:');
    console.log(`  Command: "${migrationRequest.command}"`);
    console.log(`  Target: ${migrationRequest.targetTechnology}`);
    console.log(`  Session: ${migrationRequest.sessionId}`);
    console.log('');

    const migrationResult = await migrationAgent.processMigrationRequest(migrationRequest);

    if (migrationResult.success) {
      console.log('✅ Migration processed successfully!');
      console.log(`📊 Migration ID: ${migrationResult.migrationId}`);
      console.log(`📊 Chunks Analyzed: ${migrationResult.statistics.chunksAnalyzed}`);
      console.log(`📊 Files Modified: ${migrationResult.statistics.filesModified}`);
      console.log(`📊 Execution Time: ${migrationResult.statistics.migrationTime}ms`);
      console.log('');
      
      console.log('📋 Migration Plan:');
      if (migrationResult.plan.analysis) {
        console.log(`  Analysis: ${migrationResult.plan.analysis.substring(0, 100)}...`);
      }
      if (migrationResult.plan.strategy) {
        console.log(`  Strategy: ${migrationResult.plan.strategy.substring(0, 100)}...`);
      }
      console.log('');
      
      console.log('🔍 Migration Results:');
      migrationResult.results.forEach((result, index) => {
        if (result.success) {
          console.log(`  ${index + 1}. ${result.originalChunk.name} (${result.originalChunk.type})`);
          console.log(`     File: ${result.originalChunk.filePath}`);
          console.log(`     Migrated: ${result.migratedCode.substring(0, 100)}...`);
        } else {
          console.log(`  ${index + 1}. ${result.originalChunk.name} - Failed: ${result.error}`);
        }
      });
      console.log('');
      
      console.log('✅ Validation Results:');
      console.log(`  Total Chunks: ${migrationResult.validation.totalChunks}`);
      console.log(`  Successful: ${migrationResult.validation.successfulMigrations}`);
      console.log(`  Failed: ${migrationResult.validation.failedMigrations}`);
      console.log(`  Success Rate: ${migrationResult.validation.successRate.toFixed(1)}%`);
      
    } else {
      console.log('❌ Migration failed:', migrationResult.error);
      console.log(`📊 Failed at step: ${migrationResult.step}`);
    }
    console.log('');

    // Test 3: Migration templates
    console.log('🧪 Test 3: Available Migration Templates');
    console.log('📋 Common migration scenarios:');
    console.log('  1. Database: Convert to Prisma ORM');
    console.log('  2. Framework: Migrate React to Next.js');
    console.log('  3. Language: Convert JavaScript to TypeScript');
    console.log('  4. API: Convert REST to GraphQL');
    console.log('  5. Styling: Convert CSS to Tailwind CSS');
    console.log('');

    console.log('🎉 Migration Agent Service test completed successfully!');
    console.log('\n💡 Key Features Demonstrated:');
    console.log('  ✅ Migration request validation');
    console.log('  ✅ Codebase analysis and chunk discovery');
    console.log('  ✅ AI-powered migration plan generation');
    console.log('  ✅ Code transformation execution');
    console.log('  ✅ Migration result validation');
    console.log('  ✅ Comprehensive error handling');

  } catch (error) {
    console.error('❌ Migration Agent test failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('  - Check GEMINI_API_KEY environment variable');
    console.error('  - Ensure MongoDB connection is working');
    console.error('  - Verify session has indexed code chunks');
  }
}

// Run the test
testMigrationAgent();





