import EmbeddingService from './src/services/embeddingService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Simple test to verify Gemini API setup and embedding generation
 * This test will help you verify your API key and model configuration
 */
async function testGeminiAPISetup() {
  console.log('🔑 Testing Gemini API Setup\n');

  // Check if API key is configured
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('❌ GEMINI_API_KEY not found in environment variables');
    console.log('\\n📋 Setup Instructions:');
    console.log('1. Get your API key from: https://makersuite.google.com/app/apikey');
    console.log('2. Create a .env file in the project/server directory');
    console.log('3. Add: GEMINI_API_KEY=your-api-key-here');
    console.log('4. Run this test again');
    return;
  }

  console.log('✅ GEMINI_API_KEY found in environment variables');
  console.log(`🔑 API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
  console.log('');

  try {
    // Initialize embedding service
    console.log('🚀 Initializing Embedding Service...');
    const embeddingService = new EmbeddingService();
    console.log('✅ Embedding service initialized successfully');
    console.log('');

    // Show configuration
    console.log('⚙️  Service Configuration:');
    const config = embeddingService.getConfig();
    console.log(`  Model: ${config.model}`);
    console.log(`  Dimensions: ${config.dimensions}`);
    console.log(`  API Key configured: ${config.apiKeyConfigured ? 'Yes' : 'No'}`);
    console.log('');

    // Test with a simple code snippet
    console.log('🧪 Testing Embedding Generation...');
    const testChunk = {
      id: 'test-chunk',
      type: 'function',
      name: 'helloWorld',
      code: 'function helloWorld() { return "Hello, World!"; }',
      startLine: 1,
      endLine: 1,
      startColumn: 0,
      endColumn: 50,
      metadata: {
        filePath: 'test.js',
        language: 'javascript',
        complexity: 1,
        isAsync: false,
        parameters: [],
        dependencies: [],
        visibility: 'public'
      }
    };

    console.log(`Testing with: ${testChunk.name}`);
    const result = await embeddingService.generateEmbedding(testChunk, {
      includeMetadata: true,
      includeContext: true
    });

    if (result.success) {
      console.log('✅ Embedding generation successful!');
      console.log(`📊 Dimensions: ${result.dimensions}`);
      console.log(`📝 Text length: ${result.metadata.textLength} characters`);
      console.log(`🔢 First 5 values: [${result.embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}, ...]`);
      console.log(`🏷️  Model used: ${result.metadata.model}`);
      console.log('');
      
      console.log('🎉 Gemini API setup is working correctly!');
      console.log('\\n💡 Next steps:');
      console.log('  - Run: node test-embeddings-mock.js (uses Mock Tree-sitter)');
      console.log('  - Run: node test-embeddings-only.js (embedding service only)');
      console.log('  - Set up MongoDB for persistent storage');
      console.log('  - Use the API endpoints for production');
      
    } else {
      console.log(`❌ Embedding generation failed: ${result.error}`);
      console.log('\\n🔧 Troubleshooting:');
      console.log('  - Verify your API key is correct');
      console.log('  - Check if you have access to the embedding model');
      console.log('  - Ensure your internet connection is working');
      console.log('  - Check Google AI Studio for any service issues');
    }

  } catch (error) {
    console.log(`❌ Error initializing embedding service: ${error.message}`);
    console.log('\\n🔧 Common issues:');
    console.log('  - Invalid API key format');
    console.log('  - Network connectivity problems');
    console.log('  - API quota exceeded');
    console.log('  - Model not available in your region');
  }
}

// Run the test
testGeminiAPISetup();

