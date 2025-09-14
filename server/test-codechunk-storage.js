import mongoose from 'mongoose';
import CodeChunk from './src/models/CodeChunk.js';
import dotenv from 'dotenv';

dotenv.config();

async function testCodeChunkStorage() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/migration-service');
    console.log('✅ Connected to MongoDB');

    // Create a test chunk
    console.log('📝 Creating test code chunk...');
    const testChunk = new CodeChunk({
      sessionId: 'test-session-' + Date.now(),
      userId: 'test-user-123',
      projectId: 'test-project',
      projectName: 'Test Project',
      chunkId: 'test-chunk-' + Date.now(),
      filePath: 'test.js',
      fileName: 'test.js',
      fileExtension: '.js',
      code: 'function hello() { return "Hello World"; }',
      chunkType: 'function',
      chunkName: 'hello',
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
      embedding: Array(768).fill(0.1), // 768-dimensional vector
      embeddingDimensions: 768,
      embeddingModel: 'text-embedding-004',
      embeddingGeneratedAt: new Date(),
      tags: ['function', 'javascript'],
      fileSize: 100,
      lastModified: new Date()
    });

    // Save the chunk
    console.log('💾 Saving code chunk to MongoDB...');
    const savedChunk = await testChunk.save();
    console.log('✅ Code chunk saved successfully!');
    console.log('📊 Chunk ID:', savedChunk.chunkId);
    console.log('📊 Chunk name:', savedChunk.chunkName);
    console.log('📊 Language:', savedChunk.language);
    console.log('📊 Embedding dimensions:', savedChunk.embeddingDimensions);

    // Retrieve the chunk
    console.log('📥 Retrieving code chunk...');
    const retrievedChunk = await CodeChunk.findOne({ chunkId: savedChunk.chunkId });
    if (retrievedChunk) {
      console.log('✅ Code chunk retrieved successfully!');
      console.log('📊 Retrieved code:', retrievedChunk.code);
      console.log('📊 Retrieved embedding length:', retrievedChunk.embedding.length);
    }

    // Count total chunks
    const totalChunks = await CodeChunk.countDocuments();
    console.log('📊 Total code chunks in database:', totalChunks);

    // Clean up
    await CodeChunk.deleteOne({ chunkId: savedChunk.chunkId });
    console.log('🧹 Test chunk cleaned up');

    console.log('\\n🎉 CodeChunk storage test PASSED!');
    console.log('✅ MongoDB can store code chunks with embeddings');

  } catch (error) {
    console.error('❌ CodeChunk test FAILED:', error.message);
    if (error.errors) {
      console.error('Validation errors:', Object.keys(error.errors));
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testCodeChunkStorage();





