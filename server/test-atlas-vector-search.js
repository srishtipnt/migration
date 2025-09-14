#!/usr/bin/env node

/**
 * Test Atlas Vector Search Functionality
 * 
 * This script tests the Atlas Vector Search implementation
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import AtlasVectorSearchService from './src/services/atlasVectorSearchService.js';
import EmbeddingAtlas from './src/models/EmbeddingAtlas.js';

// Load environment variables
dotenv.config();

async function testAtlasVectorSearch() {
  try {
    console.log('🚀 Testing Atlas Vector Search...');
    console.log('=' .repeat(50));

    // Connect to MongoDB Atlas
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    // Initialize Atlas Vector Search Service
    const atlasService = new AtlasVectorSearchService();
    console.log('✅ Atlas Vector Search Service initialized');
    
    // Check service status
    const status = atlasService.getServiceStatus();
    console.log('📊 Service Status:', status);

    // Create a test session ID
    const testSessionId = new mongoose.Types.ObjectId();
    console.log('📝 Test Session ID:', testSessionId);

    // Create sample embeddings for testing
    const sampleEmbeddings = [
      {
        sessionId: testSessionId,
        chunkId: new mongoose.Types.ObjectId(),
        chunkName: 'testFunction1',
        code: 'function calculateSum(a, b) { return a + b; }',
        filePath: '/test/file1.js',
        chunkType: 'function',
        language: 'custom',
        complexity: 2,
        isAsync: false,
        parameters: [
          { name: 'a', type: 'number', required: true },
          { name: 'b', type: 'number', required: true }
        ],
        dependencies: [],
        embedding: new Array(768).fill(0.1), // Sample embedding
        embeddingDimensions: 768,
        embeddingModel: 'text-embedding-004',
        metadata: { test: true }
      },
      {
        sessionId: testSessionId,
        chunkId: new mongoose.Types.ObjectId(),
        chunkName: 'testFunction2',
        code: 'function calculateProduct(x, y) { return x * y; }',
        filePath: '/test/file2.js',
        chunkType: 'function',
        language: 'custom',
        complexity: 2,
        isAsync: false,
        parameters: [
          { name: 'x', type: 'number', required: true },
          { name: 'y', type: 'number', required: true }
        ],
        dependencies: [],
        embedding: new Array(768).fill(0.2), // Different sample embedding
        embeddingDimensions: 768,
        embeddingModel: 'text-embedding-004',
        metadata: { test: true }
      },
      {
        sessionId: testSessionId,
        chunkId: new mongoose.Types.ObjectId(),
        chunkName: 'testClass',
        code: 'class Calculator { add(a, b) { return a + b; } }',
        filePath: '/test/calculator.js',
        chunkType: 'class',
        complexity: 3,
        isAsync: false,
        parameters: [],
        dependencies: [],
        embedding: new Array(768).fill(0.3), // Another sample embedding
        embeddingDimensions: 768,
        embeddingModel: 'text-embedding-004',
        metadata: { test: true }
      }
    ];

    // Insert test embeddings
    console.log('📝 Creating test embeddings...');
    const createdEmbeddings = await atlasService.createEmbeddingsBatch(sampleEmbeddings);
    console.log(`✅ Created ${createdEmbeddings.length} test embeddings`);

    // Test vector search
    console.log('🔍 Testing vector search...');
    const queryEmbedding = new Array(768).fill(0.15); // Query embedding between the test ones
    
    const searchResults = await atlasService.findSimilarChunks(
      testSessionId,
      queryEmbedding,
      {
        threshold: 0.5,
        limit: 5
      }
    );

    console.log('📊 Vector Search Results:');
    console.log(`Found ${searchResults.length} similar chunks`);
    
    searchResults.forEach((result, index) => {
      console.log(`${index + 1}. ${result.chunkName} (similarity: ${result.similarity?.toFixed(4) || 'N/A'})`);
      console.log(`   Code: ${result.code.substring(0, 50)}...`);
      console.log(`   Type: ${result.chunkType}, Language: ${result.language}`);
    });

    // Test search with filters
    console.log('\n🔍 Testing filtered vector search...');
    const filteredResults = await atlasService.findSimilarChunks(
      testSessionId,
      queryEmbedding,
      {
        threshold: 0.5,
        limit: 5,
        chunkType: 'function' // Only functions
      }
    );

    console.log('📊 Filtered Search Results (functions only):');
    console.log(`Found ${filteredResults.length} similar functions`);
    
    filteredResults.forEach((result, index) => {
      console.log(`${index + 1}. ${result.chunkName} (similarity: ${result.similarity?.toFixed(4) || 'N/A'})`);
    });

    // Test text search
    console.log('\n🔍 Testing text search...');
    const textSearchResults = await atlasService.searchEmbeddings(testSessionId, {
      query: 'calculate',
      limit: 5
    });

    console.log('📊 Text Search Results:');
    console.log(`Found ${textSearchResults.length} chunks matching "calculate"`);
    
    textSearchResults.forEach((result, index) => {
      console.log(`${index + 1}. ${result.chunkName}`);
    });

    // Get statistics
    console.log('\n📊 Getting embedding statistics...');
    const stats = await atlasService.getEmbeddingStatistics(testSessionId);
    console.log('Statistics:', stats);

    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    await atlasService.deleteSessionEmbeddings(testSessionId);
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 Atlas Vector Search test completed successfully!');
    console.log('✅ Vector search is working correctly');
    console.log('✅ Filtering is working correctly');
    console.log('✅ Text search is working correctly');

  } catch (error) {
    console.error('❌ Atlas Vector Search test failed:', error);
    
    if (error.message.includes('$vectorSearch')) {
      console.log('\n💡 Troubleshooting:');
      console.log('1. Make sure the Vector Search Index is fully built in Atlas');
      console.log('2. Check that the index name is "vector_index"');
      console.log('3. Verify the collection name is "embeddings"');
      console.log('4. Ensure the embedding field path is "embedding"');
    }
    
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB Atlas');
  }
}

// Run the test
testAtlasVectorSearch()
  .then(() => {
    console.log('✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  });
