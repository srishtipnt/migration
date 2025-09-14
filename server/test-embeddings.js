import TreeSitterService from './src/services/treeSitterService.js';
import EmbeddingService from './src/services/embeddingService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Test script demonstrating embedding generation for code chunks
 */
async function testEmbeddingGeneration() {
  console.log('🚀 Testing Embedding Generation for Code Chunks\n');

  try {
    // Initialize Tree-sitter service
    const treeSitterService = new TreeSitterService();
    
    // Check if embedding service is available
    if (!treeSitterService.isEmbeddingServiceAvailable()) {
      console.log('❌ Embedding service not available');
      console.log('Please set GEMINI_API_KEY in your environment variables');
      console.log('Example: GEMINI_API_KEY=your-api-key-here');
      return;
    }

    console.log('✅ Embedding service is available\n');

    // Test 1: Parse JavaScript code and generate embeddings
    console.log('📄 Test 1: JavaScript Code Parsing and Embedding Generation');
    const jsCode = `
// User authentication service
class AuthService {
  constructor(database) {
    this.db = database;
    this.sessions = new Map();
  }

  async login(email, password) {
    try {
      const user = await this.db.users.findOne({ email });
      if (!user) {
        throw new Error('User not found');
      }
      
      const isValid = await this.verifyPassword(password, user.passwordHash);
      if (!isValid) {
        throw new Error('Invalid password');
      }
      
      const sessionToken = this.generateSessionToken(user.id);
      this.sessions.set(sessionToken, user.id);
      
      return {
        success: true,
        token: sessionToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async logout(token) {
    this.sessions.delete(token);
    return { success: true };
  }

  async verifyPassword(password, hash) {
    // Password verification logic
    return password.length >= 8;
  }

  generateSessionToken(userId) {
    return \`session_\${userId}_\${Date.now()}\`;
  }
}

// Utility functions
function validateEmail(email) {
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return emailRegex.test(email);
}

function hashPassword(password) {
  // Simple hash implementation
  return btoa(password);
}

export default AuthService;
`;

    const jsResult = await treeSitterService.parseFile('authService.js', jsCode);
    console.log(`✅ Parsed JavaScript file: ${jsResult.chunks.length} chunks found`);

    // Display chunks
    jsResult.chunks.forEach((chunk, index) => {
      console.log(`  ${index + 1}. ${chunk.type}: ${chunk.name}`);
      console.log(`     Lines: ${chunk.startLine}-${chunk.endLine}, Complexity: ${chunk.metadata.complexity}`);
      if (chunk.metadata.parameters.length > 0) {
        console.log(`     Parameters: ${chunk.metadata.parameters.map(p => p.name).join(', ')}`);
      }
    });
    console.log('');

    // Test 2: Generate embeddings for the chunks
    console.log('🧠 Test 2: Generating Embeddings');
    const sessionId = 'test-session-' + Date.now();
    const userId = 'test-user-123';

    const embeddingResult = await treeSitterService.generateEmbeddings(
      jsResult.chunks,
      sessionId,
      userId,
      {
        batchSize: 5,
        delayBetweenBatches: 500,
        includeMetadata: true,
        includeContext: true,
        saveToDatabase: false // Don't save to DB for this test
      }
    );

    if (embeddingResult.success) {
      console.log(`✅ Generated embeddings: ${embeddingResult.successfulEmbeddings}/${embeddingResult.totalChunks} successful`);
      console.log(`📊 Average dimensions: ${embeddingResult.summary.averageDimensions}`);
      console.log(`📈 Success rate: ${(embeddingResult.summary.successRate * 100).toFixed(1)}%`);
      console.log('');

      // Display embedding details for first few chunks
      console.log('🔍 Embedding Details (first 3 chunks):');
      embeddingResult.embeddingResults.slice(0, 3).forEach((result, index) => {
        if (result.success) {
          console.log(`  ${index + 1}. ${result.metadata.chunkName} (${result.metadata.chunkType})`);
          console.log(`     Dimensions: ${result.dimensions}`);
          console.log(`     Model: ${result.metadata.model}`);
          console.log(`     Text length: ${result.metadata.textLength} chars`);
          console.log(`     First 5 values: [${result.embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}, ...]`);
        } else {
          console.log(`  ${index + 1}. ${result.chunkId}: FAILED - ${result.error}`);
        }
      });
      console.log('');
    } else {
      console.log(`❌ Embedding generation failed: ${embeddingResult.error}`);
      return;
    }

    // Test 3: Test similarity calculation
    console.log('🔗 Test 3: Similarity Calculation');
    const embeddingService = treeSitterService.getEmbeddingService();
    
    if (embeddingResult.embeddingResults.length >= 2) {
      const successfulResults = embeddingResult.embeddingResults.filter(r => r.success);
      if (successfulResults.length >= 2) {
        const embedding1 = successfulResults[0].embedding;
        const embedding2 = successfulResults[1].embedding;
        
        const similarity = embeddingService.calculateSimilarity(embedding1, embedding2);
        console.log(`✅ Similarity between "${successfulResults[0].metadata.chunkName}" and "${successfulResults[1].metadata.chunkName}": ${similarity.toFixed(4)}`);
        console.log('');
      }
    }

    // Test 4: Parse TypeScript code
    console.log('📄 Test 4: TypeScript Code Parsing and Embedding Generation');
    const tsCode = `
interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'guest';
  createdAt: Date;
}

interface CreateUserRequest {
  email: string;
  name: string;
  role?: User['role'];
}

class UserService {
  private users: User[] = [];
  private nextId = 1;

  async createUser(userData: CreateUserRequest): Promise<User> {
    // Validate email
    if (!this.isValidEmail(userData.email)) {
      throw new Error('Invalid email address');
    }

    // Check if user already exists
    const existingUser = this.users.find(u => u.email === userData.email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    const newUser: User = {
      id: this.nextId++,
      email: userData.email,
      name: userData.name,
      role: userData.role || 'user',
      createdAt: new Date()
    };

    this.users.push(newUser);
    return newUser;
  }

  async getUserById(id: number): Promise<User | null> {
    return this.users.find(user => user.id === id) || null;
  }

  async getAllUsers(): Promise<User[]> {
    return [...this.users];
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    return emailRegex.test(email);
  }
}

export { UserService, type User, type CreateUserRequest };
`;

    const tsResult = await treeSitterService.parseFile('userService.ts', tsCode);
    console.log(`✅ Parsed TypeScript file: ${tsResult.chunks.length} chunks found`);

    // Generate embeddings for TypeScript chunks
    const tsEmbeddingResult = await treeSitterService.generateEmbeddings(
      tsResult.chunks,
      sessionId + '-ts',
      userId,
      {
        batchSize: 3,
        delayBetweenBatches: 300,
        includeMetadata: true,
        includeContext: true,
        saveToDatabase: false
      }
    );

    if (tsEmbeddingResult.success) {
      console.log(`✅ Generated TypeScript embeddings: ${tsEmbeddingResult.successfulEmbeddings}/${tsEmbeddingResult.totalChunks} successful`);
      console.log('');
    }

    // Test 5: Cross-language similarity
    console.log('🌐 Test 5: Cross-Language Similarity Analysis');
    const allSuccessfulResults = [
      ...embeddingResult.embeddingResults.filter(r => r.success),
      ...tsEmbeddingResult.embeddingResults.filter(r => r.success)
    ];

    if (allSuccessfulResults.length >= 2) {
      console.log('Comparing chunks across JavaScript and TypeScript:');
      
      // Find similar chunks between JS and TS
      for (let i = 0; i < Math.min(2, allSuccessfulResults.length); i++) {
        const sourceChunk = allSuccessfulResults[i];
        const similarities = [];
        
        for (let j = i + 1; j < allSuccessfulResults.length; j++) {
          const targetChunk = allSuccessfulResults[j];
          const similarity = embeddingService.calculateSimilarity(
            sourceChunk.embedding,
            targetChunk.embedding
          );
          
          similarities.push({
            chunk: targetChunk,
            similarity
          });
        }
        
        similarities.sort((a, b) => b.similarity - a.similarity);
        
        console.log(`\\n  Most similar to "${sourceChunk.metadata.chunkName}" (${sourceChunk.metadata.language}):`);
        similarities.slice(0, 2).forEach((sim, idx) => {
          console.log(`    ${idx + 1}. ${sim.chunk.metadata.chunkName} (${sim.chunk.metadata.language}) - ${sim.similarity.toFixed(4)}`);
        });
      }
    }

    // Test 6: Service configuration
    console.log('\\n⚙️  Test 6: Service Configuration');
    const config = embeddingService.getConfig();
    console.log('Embedding Service Configuration:');
    console.log(`  Model: ${config.model}`);
    console.log(`  Dimensions: ${config.dimensions}`);
    console.log(`  API Key configured: ${config.apiKeyConfigured ? 'Yes' : 'No'}`);

    // Test 7: Service test
    console.log('\\n🧪 Test 7: Service Health Check');
    const testResult = await embeddingService.testService();
    console.log(`Service test: ${testResult.success ? '✅ PASSED' : '❌ FAILED'}`);
    if (testResult.message) {
      console.log(`Message: ${testResult.message}`);
    }

    console.log('\\n🎉 Embedding generation test completed successfully!');
    console.log('\\n💡 Key Features Demonstrated:');
    console.log('  ✅ Code chunk parsing with Tree-sitter');
    console.log('  ✅ Embedding generation using Gemini API');
    console.log('  ✅ Batch processing with rate limiting');
    console.log('  ✅ Similarity calculation between chunks');
    console.log('  ✅ Cross-language similarity analysis');
    console.log('  ✅ Service health monitoring');
    console.log('  ✅ Comprehensive metadata extraction');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testEmbeddingGeneration();
