import connectDB from './src/config/database.js';
import CodeChunk from './src/models/CodeChunk.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Simple test to check if MongoDB storage is working
 */
async function testMongoDBStorage() {
  console.log('🗄️  Testing MongoDB Storage...\n');

  try {
    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB successfully\n');

    // Test 1: Create a simple test chunk
    console.log('📝 Test 1: Creating Test Chunk');
    const testChunk = {
      sessionId: 'test-session-' + Date.now(),
      userId: 'test-user-123',
      projectId: 'test-project',
      projectName: 'Test Project',
      chunkId: 'test-chunk-' + Date.now(),
      filePath: 'test.js',
      fileName: 'test.js',
      fileExtension: '.js',
      code: 'function test() { return "Hello World"; }',
      chunkType: 'function',
      chunkName: 'test',
      startLine: 1,
      endLine: 1,
      startColumn: 0,
      endColumn: 50,
      startIndex: 0,
      endIndex: 50,
      language: 'javascript',
      complexity: 1,
      isAsync: false,
      isStatic: false,
      visibility: 'public',
      parameters: [],
      dependencies: [],
      comments: [],
      embedding: Array(768).fill(0).map(() => Math.random() * 2 - 1), // Random 768-dim vector
      embeddingDimensions: 768,
      embeddingModel: 'test-model',
      embeddingGeneratedAt: new Date(),
      tags: ['function', 'javascript'],
      fileSize: 100,
      lastModified: new Date()
    };

    // Save to MongoDB
    const savedChunk = new CodeChunk(testChunk);
    const result = await savedChunk.save();
    
    console.log('✅ Successfully saved chunk to MongoDB!');
    console.log(`📊 Chunk ID: ${result.chunkId}`);
    console.log(`📊 Session ID: ${result.sessionId}`);
    console.log(`📊 Embedding dimensions: ${result.embeddingDimensions}`);
    console.log('');

    // Test 2: Retrieve the chunk
    console.log('📥 Test 2: Retrieving Chunk from MongoDB');
    const retrievedChunk = await CodeChunk.findOne({ chunkId: result.chunkId });
    
    if (retrievedChunk) {
      console.log('✅ Successfully retrieved chunk from MongoDB!');
      console.log(`📊 Chunk name: ${retrievedChunk.chunkName}`);
      console.log(`📊 Code: ${retrievedChunk.code}`);
      console.log(`📊 Language: ${retrievedChunk.language}`);
      console.log(`📊 Embedding length: ${retrievedChunk.embedding.length}`);
    } else {
      console.log('❌ Failed to retrieve chunk from MongoDB');
    }
    console.log('');

    // Test 3: Count total chunks
    console.log('📊 Test 3: Counting Total Chunks');
    const totalChunks = await CodeChunk.countDocuments();
    console.log(`✅ Total chunks in database: ${totalChunks}`);
    console.log('');

    // Test 4: List recent chunks
    console.log('📋 Test 4: Listing Recent Chunks');
    const recentChunks = await CodeChunk.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('chunkName chunkType language createdAt');
    
    console.log('✅ Recent chunks:');
    recentChunks.forEach((chunk, index) => {
      console.log(`  ${index + 1}. ${chunk.chunkName} (${chunk.chunkType}) - ${chunk.language} - ${chunk.createdAt.toISOString()}`);
    });
    console.log('');

    // Test 5: Clean up test data
    console.log('🧹 Test 5: Cleaning Up Test Data');
    const deleteResult = await CodeChunk.deleteOne({ chunkId: result.chunkId });
    console.log(`✅ Deleted test chunk: ${deleteResult.deletedCount} document(s) removed`);
    console.log('');

    console.log('🎉 MongoDB storage test completed successfully!');
    console.log('\\n💡 MongoDB is working correctly and can:');
    console.log('  ✅ Store code chunks with embeddings');
    console.log('  ✅ Retrieve chunks by ID');
    console.log('  ✅ Count documents');
    console.log('  ✅ Query and filter data');
    console.log('  ✅ Delete documents');

  } catch (error) {
    console.error('❌ MongoDB storage test failed:', error.message);
    console.error('\\n🔧 Common issues:');
    console.error('  - MongoDB not running');
    console.error('  - Connection string incorrect');
    console.error('  - Database permissions');
    console.error('  - Schema validation errors');
  }
}

// Run the test
testMongoDBStorage();





