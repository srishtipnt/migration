#!/usr/bin/env node

/**
 * Simple Atlas Vector Search Test
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import AtlasVectorSearchService from './src/services/atlasVectorSearchService.js';

// Load environment variables
dotenv.config();

async function simpleTest() {
  try {
    console.log('🚀 Simple Atlas Vector Search Test...');
    
    // Connect to MongoDB Atlas
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    // Initialize Atlas Vector Search Service
    const atlasService = new AtlasVectorSearchService();
    console.log('✅ Atlas Vector Search Service initialized');
    
    // Check service status
    const status = atlasService.getServiceStatus();
    console.log('📊 Service Status:', status);

    // Test basic functionality
    console.log('🔍 Testing basic vector search...');
    const testSessionId = new mongoose.Types.ObjectId();
    const testEmbedding = new Array(768).fill(0.1);
    
    // This should work even with empty results
    const results = await atlasService.findSimilarChunks(
      testSessionId,
      testEmbedding,
      { threshold: 0.5, limit: 5 }
    );
    
    console.log(`✅ Vector search completed - found ${results.length} results`);
    console.log('🎉 Atlas Vector Search is working!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('$vectorSearch')) {
      console.log('\n💡 The Vector Search Index might still be building...');
      console.log('Wait a few minutes and try again.');
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB Atlas');
  }
}

simpleTest();
