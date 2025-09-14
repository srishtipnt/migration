import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Quick Test Script - Test individual components
 * Run specific tests based on what you want to check
 */
async function quickTest() {
  console.log('⚡ QUICK TEST - Choose what to test:\n');

  const args = process.argv.slice(2);
  const testType = args[0] || 'all';

  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/migration-service');
    console.log('✅ Connected to MongoDB\n');

    switch (testType) {
      case 'database':
        await testDatabase();
        break;
      case 'ai':
        await testAI();
        break;
      case 'migration':
        await testMigration();
        break;
      case 'api':
        await testAPI();
        break;
      case 'all':
      default:
        await testAll();
        break;
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

async function testDatabase() {
  console.log('🗄️  Testing Database...');
  
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log(`📋 Collections: ${collections.length}`);
  
  for (const col of collections) {
    const count = await mongoose.connection.db.collection(col.name).countDocuments();
    console.log(`  ${col.name}: ${count} documents`);
  }
  
  console.log('✅ Database test completed');
}

async function testAI() {
  console.log('🧠 Testing AI Services...');
  
  try {
    const EmbeddingService = (await import('./src/services/embeddingService.js')).default;
    const embeddingService = new EmbeddingService();
    
    const embedding = await embeddingService.generateEmbedding('test code');
    console.log(`✅ Embedding: ${embedding.dimensions} dimensions`);
    
    const MigrationAgentService = (await import('./src/services/migrationAgentService.js')).default;
    const migrationAgent = new MigrationAgentService();
    
    const result = await migrationAgent.model.generateContent('Convert this to TypeScript: function test() { return "hello"; }');
    const response = await result.response;
    console.log('✅ AI Code Generation working');
    console.log('📝 Generated:', response.text().substring(0, 100) + '...');
    
  } catch (error) {
    console.log('❌ AI test failed:', error.message);
  }
  
  console.log('✅ AI test completed');
}

async function testMigration() {
  console.log('🤖 Testing Migration Agent...');
  
  try {
    const MigrationAgentService = (await import('./src/services/migrationAgentService.js')).default;
    const migrationAgent = new MigrationAgentService();
    
    const testResult = await migrationAgent.testAgent();
    console.log(`✅ Migration Agent: ${testResult.success ? 'Ready' : 'Failed'}`);
    
    if (testResult.success) {
      console.log('📊 Components:');
      console.log(`  Embedding Service: ${testResult.testResults.embeddingService ? '✅' : '❌'}`);
      console.log(`  Chunk Storage: ${testResult.testResults.chunkStorageService ? '✅' : '❌'}`);
      console.log(`  Gemini Model: ${testResult.testResults.geminiModel}`);
    }
    
  } catch (error) {
    console.log('❌ Migration test failed:', error.message);
  }
  
  console.log('✅ Migration test completed');
}

async function testAPI() {
  console.log('🌐 Testing API Endpoints...');
  
  console.log('📋 Available endpoints:');
  console.log('  POST /api/migrate/migrate - Process migration');
  console.log('  GET /api/migrate/templates - Get templates');
  console.log('  POST /api/migrate/validate - Validate command');
  console.log('  GET /api/migrate/health - Health check');
  
  console.log('💡 To test HTTP endpoints, start the server and run:');
  console.log('   npm start');
  console.log('   Then use curl or Postman to test endpoints');
  
  console.log('✅ API test completed');
}

async function testAll() {
  console.log('🚀 Running All Tests...\n');
  
  await testDatabase();
  console.log('');
  await testAI();
  console.log('');
  await testMigration();
  console.log('');
  await testAPI();
  
  console.log('\n🎉 All tests completed!');
}

// Usage instructions
if (process.argv.length < 3) {
  console.log('⚡ Quick Test Script');
  console.log('Usage: node test-quick.js [test-type]');
  console.log('');
  console.log('Test types:');
  console.log('  database  - Test database connection and collections');
  console.log('  ai        - Test AI services (embeddings, code generation)');
  console.log('  migration - Test migration agent');
  console.log('  api       - Show API endpoint information');
  console.log('  all       - Run all tests (default)');
  console.log('');
  console.log('Examples:');
  console.log('  node test-quick.js database');
  console.log('  node test-quick.js ai');
  console.log('  node test-quick.js migration');
  console.log('  node test-quick.js all');
  console.log('');
}

// Run the test
quickTest();
