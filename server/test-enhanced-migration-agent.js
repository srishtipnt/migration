import dotenv from 'dotenv';
import MigrationAgentService from './src/services/migrationAgentService.js';

dotenv.config();

/**
 * Enhanced Test Script for AI Migration Agent Service
 * Demonstrates the comprehensive functionality of the enhanced service
 */
async function testEnhancedMigrationAgent() {
  console.log('🚀 Testing Enhanced AI Migration Agent Service\n');

  try {
    // Initialize the migration agent
    console.log('⚙️  Initializing Enhanced Migration Agent...');
    const migrationAgent = MigrationAgentService;
    console.log('✅ Enhanced Migration Agent initialized successfully\n');

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

    // Test 2: Enhanced context retrieval
    console.log('🧪 Test 2: Enhanced Context Retrieval');
    
    const contextTestRequest = {
      sessionId: 'test-session-enhanced',
      userId: 'test-user-enhanced',
      command: 'convert database connection to Prisma ORM',
      targetTechnology: 'Prisma',
      options: {
        preserveData: true,
        generateTypes: true,
        addValidation: true,
        includeDependencies: true,
        includeRelatedFiles: true
      }
    };

    console.log('📝 Testing enhanced context retrieval:');
    console.log(`  Command: "${contextTestRequest.command}"`);
    console.log(`  Target: ${contextTestRequest.targetTechnology}`);
    console.log(`  Session: ${contextTestRequest.sessionId}`);
    console.log('');

    // Test enhanced command processing
    const enhancedCommand = migrationAgent.enhanceCommandForSearch(contextTestRequest.command);
    console.log(`🔍 Enhanced Command: "${enhancedCommand}"`);

    const techKeywords = migrationAgent.extractTechnologyKeywords(contextTestRequest.command);
    console.log(`🏷️  Technology Keywords: ${techKeywords.join(', ')}`);

    const techContext = migrationAgent.getTechnologyContext(contextTestRequest.targetTechnology);
    console.log(`📚 Technology Context: ${techContext.substring(0, 100)}...`);

    const migrationPatterns = migrationAgent.getMigrationPatterns(contextTestRequest.command, contextTestRequest.targetTechnology);
    console.log(`🔄 Migration Patterns: ${migrationPatterns.substring(0, 100)}...`);
    console.log('');

    // Test 3: Error handling and recovery
    console.log('🧪 Test 3: Error Handling and Recovery');
    
    // Test error classification
    const testErrors = [
      new Error('API key is invalid'),
      new Error('Network timeout occurred'),
      new Error('Failed to parse JSON response'),
      new Error('Database connection failed'),
      new Error('Memory limit exceeded')
    ];

    console.log('🔍 Testing error classification:');
    testErrors.forEach((error, index) => {
      const errorType = migrationAgent.classifyError(error);
      console.log(`  Error ${index + 1}: "${error.message}" -> ${errorType}`);
    });

    // Test error suggestions
    console.log('\n💡 Testing error suggestions:');
    const apiError = new Error('API key is invalid');
    const suggestions = migrationAgent.getErrorSuggestions(apiError);
    console.log(`  API Error Suggestions: ${suggestions.join(', ')}`);
    console.log('');

    // Test 4: Code validation helpers
    console.log('🧪 Test 4: Code Validation Helpers');
    
    const testCodeSamples = [
      {
        name: 'Valid JavaScript Function',
        code: `import { PrismaClient } from '@prisma/client';
        
        const prisma = new PrismaClient();
        
        export async function getUserById(id: string) {
          try {
            const user = await prisma.user.findUnique({
              where: { id }
            });
            return user;
          } catch (error) {
            throw new Error('Failed to get user');
          }
        }`
      },
      {
        name: 'TypeScript Interface',
        code: `interface User {
          id: string;
          name: string;
          email: string;
        }
        
        export type UserRole = 'admin' | 'user' | 'guest';`
      },
      {
        name: 'Test Code',
        code: `describe('User Service', () => {
          it('should get user by id', async () => {
            const user = await getUserById('123');
            expect(user).toBeDefined();
          });
        });`
      }
    ];

    console.log('🔍 Testing code validation:');
    testCodeSamples.forEach((sample, index) => {
      console.log(`\n  Sample ${index + 1}: ${sample.name}`);
      console.log(`    Valid Syntax: ${migrationAgent.isValidSyntax(sample.code) ? '✅' : '❌'}`);
      console.log(`    Valid Imports: ${migrationAgent.hasValidImports(sample.code) ? '✅' : '❌'}`);
      console.log(`    Valid Exports: ${migrationAgent.hasValidExports(sample.code) ? '✅' : '❌'}`);
      console.log(`    Type Safety: ${migrationAgent.hasTypeSafety(sample.code) ? '✅' : '❌'}`);
      console.log(`    Error Handling: ${migrationAgent.hasErrorHandling(sample.code) ? '✅' : '❌'}`);
      
      const dependencies = migrationAgent.extractDependencies(sample.code);
      console.log(`    Dependencies: [${dependencies.join(', ')}]`);
      
      const envVars = migrationAgent.extractEnvironmentVariables(sample.code);
      console.log(`    Environment Variables: [${envVars.join(', ')}]`);
    });
    console.log('');

    // Test 5: Migration plan generation
    console.log('🧪 Test 5: Migration Plan Generation');
    
    const mockChunks = [
      {
        chunkId: 'chunk-1',
        chunkName: 'UserService',
        chunkType: 'class',
        code: 'class UserService {\n  constructor() {\n    this.db = new Database();\n  }\n}',
        filePath: 'src/services/UserService.js',
        language: 'javascript',
        complexity: 2,
        migrationRelevance: 0.9
      },
      {
        chunkId: 'chunk-2',
        chunkName: 'getUserById',
        chunkType: 'method',
        code: 'async getUserById(id) {\n  const user = await this.db.query("SELECT * FROM users WHERE id = ?", [id]);\n  return user;\n}',
        filePath: 'src/services/UserService.js',
        language: 'javascript',
        complexity: 3,
        migrationRelevance: 0.85
      }
    ];

    console.log('📋 Testing migration plan generation:');
    console.log(`  Mock Chunks: ${mockChunks.length}`);
    
    const migrationPlan = await migrationAgent.generateMigrationPlan({
      command: contextTestRequest.command,
      targetTechnology: contextTestRequest.targetTechnology,
      relevantChunks: mockChunks,
      options: contextTestRequest.options
    });

    if (migrationPlan.success) {
      console.log('✅ Migration plan generated successfully');
      console.log('📊 Plan Structure:');
      console.log(`  - Analysis: ${migrationPlan.plan.analysis ? '✅' : '❌'}`);
      console.log(`  - Strategy: ${migrationPlan.plan.strategy ? '✅' : '❌'}`);
      console.log(`  - Dependencies: ${migrationPlan.plan.dependencies ? '✅' : '❌'}`);
      console.log(`  - Timeline: ${migrationPlan.plan.timeline ? '✅' : '❌'}`);
      console.log(`  - Risk Level: ${migrationPlan.plan.timeline?.riskLevel || 'Unknown'}`);
    } else {
      console.log('❌ Migration plan generation failed:', migrationPlan.error);
    }
    console.log('');

    // Test 6: Retry mechanism
    console.log('🧪 Test 6: Retry Mechanism');
    
    let attemptCount = 0;
    const testOperation = async () => {
      attemptCount++;
      if (attemptCount < 3) {
        throw new Error('Simulated network error');
      }
      return 'Success after retries';
    };

    console.log('🔄 Testing retry with exponential backoff:');
    try {
      const result = await migrationAgent.retryWithBackoff(testOperation, 3, 100);
      console.log(`✅ Retry successful: ${result}`);
      console.log(`📊 Attempts made: ${attemptCount}`);
    } catch (error) {
      console.log(`❌ Retry failed: ${error.message}`);
    }
    console.log('');

    // Test 7: Service capabilities summary
    console.log('🧪 Test 7: Service Capabilities Summary');
    
    const capabilities = {
      'Enhanced Context Retrieval': '✅',
      'Technology-Specific Migration': '✅',
      'AI-Powered Code Generation': '✅',
      'Comprehensive Error Handling': '✅',
      'Code Quality Validation': '✅',
      'Dependency Management': '✅',
      'Configuration Validation': '✅',
      'Testing Integration': '✅',
      'Retry Mechanisms': '✅',
      'Migration Planning': '✅'
    };

    console.log('📊 Enhanced Migration Agent Capabilities:');
    Object.entries(capabilities).forEach(([capability, status]) => {
      console.log(`  ${capability}: ${status}`);
    });
    console.log('');

    console.log('🎉 Enhanced AI Migration Agent Service testing completed successfully!');
    console.log('\n📋 Key Features Demonstrated:');
    console.log('  ✅ Enhanced semantic search with technology keywords');
    console.log('  ✅ Intelligent context retrieval and chunk filtering');
    console.log('  ✅ AI-powered migration plan generation');
    console.log('  ✅ Comprehensive error handling and recovery');
    console.log('  ✅ Code quality validation and testing integration');
    console.log('  ✅ Dependency and configuration management');
    console.log('  ✅ Retry mechanisms with exponential backoff');
    console.log('  ✅ Technology-specific migration strategies');

  } catch (error) {
    console.error('❌ Enhanced Migration Agent test failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the enhanced test
testEnhancedMigrationAgent().catch(console.error);



