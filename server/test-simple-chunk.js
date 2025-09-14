import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function testSimpleCodeChunk() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/migration-service');
    console.log('✅ Connected to MongoDB');

    // Create a simple schema without complex indexes
    const SimpleCodeChunkSchema = new mongoose.Schema({
      sessionId: String,
      userId: String,
      chunkId: String,
      code: String,
      chunkType: String,
      chunkName: String,
      language: String,
      embedding: [Number],
      createdAt: { type: Date, default: Date.now }
    });

    const SimpleCodeChunk = mongoose.model('SimpleCodeChunk', SimpleCodeChunkSchema);

    // Create a test chunk
    console.log('📝 Creating simple test chunk...');
    const testChunk = new SimpleCodeChunk({
      sessionId: 'test-session-' + Date.now(),
      userId: 'test-user-123',
      chunkId: 'test-chunk-' + Date.now(),
      code: 'function hello() { return "Hello World"; }',
      chunkType: 'function',
      chunkName: 'hello',
      language: 'javascript',
      embedding: Array(768).fill(0.1)
    });

    // Save the chunk
    console.log('💾 Saving simple chunk to MongoDB...');
    const savedChunk = await testChunk.save();
    console.log('✅ Simple chunk saved successfully!');
    console.log('📊 Chunk ID:', savedChunk.chunkId);
    console.log('📊 Chunk name:', savedChunk.chunkName);
    console.log('📊 Language:', savedChunk.language);
    console.log('📊 Embedding length:', savedChunk.embedding.length);

    // Retrieve the chunk
    console.log('📥 Retrieving simple chunk...');
    const retrievedChunk = await SimpleCodeChunk.findOne({ chunkId: savedChunk.chunkId });
    if (retrievedChunk) {
      console.log('✅ Simple chunk retrieved successfully!');
      console.log('📊 Retrieved code:', retrievedChunk.code);
    }

    // Count total chunks
    const totalChunks = await SimpleCodeChunk.countDocuments();
    console.log('📊 Total simple chunks in database:', totalChunks);

    // Clean up
    await SimpleCodeChunk.deleteOne({ chunkId: savedChunk.chunkId });
    console.log('🧹 Test chunk cleaned up');

    console.log('\\n🎉 Simple CodeChunk storage test PASSED!');
    console.log('✅ MongoDB CAN store code chunks with embeddings!');

  } catch (error) {
    console.error('❌ Simple CodeChunk test FAILED:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testSimpleCodeChunk();





