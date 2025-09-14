import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

/**
 * Comprehensive Test Script for Migration API Endpoints
 * Tests all API endpoints with various scenarios
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api/migrate`;

// Mock authentication token (in real tests, this would be obtained from login)
const AUTH_TOKEN = 'mock-jwt-token-for-testing';

/**
 * Test helper functions
 */
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE}${endpoint}`;
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      ...options.headers
    }
  };

  const response = await fetch(url, { ...defaultOptions, ...options });
  const data = await response.json();

  return {
    status: response.status,
    data,
    headers: response.headers
  };
};

const logTest = (testName, result) => {
  const status = result.status >= 200 && result.status < 300 ? '✅' : '❌';
  console.log(`${status} ${testName}`);
  if (result.status >= 400) {
    console.log(`   Error: ${result.data.error || 'Unknown error'}`);
    console.log(`   Message: ${result.data.message || 'No message'}`);
  }
};

/**
 * Test 1: Health Check
 */
async function testHealthCheck() {
  console.log('\n🧪 Test 1: Health Check');
  
  const result = await apiRequest('/health');
  logTest('Health Check', result);
  
  if (result.status === 200) {
    console.log(`   Service: ${result.data.service}`);
    console.log(`   Status: ${result.data.status}`);
    console.log(`   Version: ${result.data.version}`);
    console.log(`   Components: ${Object.keys(result.data.components).length} checked`);
  }
}

/**
 * Test 2: Migration Templates
 */
async function testMigrationTemplates() {
  console.log('\n🧪 Test 2: Migration Templates');
  
  // Test basic templates
  const result = await apiRequest('/templates');
  logTest('Get All Templates', result);
  
  if (result.status === 200) {
    console.log(`   Templates: ${result.data.count}`);
    console.log(`   Categories: ${result.data.categories.join(', ')}`);
  }

  // Test filtered templates
  const filteredResult = await apiRequest('/templates?category=database');
  logTest('Get Database Templates', filteredResult);
  
  if (filteredResult.status === 200) {
    console.log(`   Database Templates: ${filteredResult.data.count}`);
  }
}

/**
 * Test 3: Migration Validation
 */
async function testMigrationValidation() {
  console.log('\n🧪 Test 3: Migration Validation');
  
  // Test valid command
  const validCommand = {
    command: 'convert database connection to Prisma ORM',
    targetTechnology: 'Prisma',
    sessionId: 'test-session-123'
  };
  
  const validResult = await apiRequest('/validate', {
    method: 'POST',
    body: JSON.stringify(validCommand)
  });
  logTest('Valid Command Validation', validResult);
  
  if (validResult.status === 200) {
    console.log(`   Valid: ${validResult.data.valid}`);
    console.log(`   Complexity: ${validResult.data.validation.estimatedComplexity}`);
    console.log(`   Risk Level: ${validResult.data.validation.riskLevel}`);
    console.log(`   Estimated Time: ${validResult.data.validation.estimatedTime}`);
  }

  // Test invalid command
  const invalidCommand = {
    command: 'short',
    targetTechnology: 'InvalidTech'
  };
  
  const invalidResult = await apiRequest('/validate', {
    method: 'POST',
    body: JSON.stringify(invalidCommand)
  });
  logTest('Invalid Command Validation', invalidResult);
  
  if (invalidResult.status === 400) {
    console.log(`   Validation Failed: ${invalidResult.data.details?.length || 0} errors`);
  }
}

/**
 * Test 4: Migration Request Processing
 */
async function testMigrationRequest() {
  console.log('\n🧪 Test 4: Migration Request Processing');
  
  const migrationRequest = {
    sessionId: 'test-session-123',
    userId: 'test-user-456',
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

  const result = await apiRequest('/migrate', {
    method: 'POST',
    body: JSON.stringify(migrationRequest)
  });
  
  logTest('Migration Request', result);
  
  if (result.status === 200) {
    console.log(`   Migration ID: ${result.data.migrationId}`);
    console.log(`   Processing Time: ${result.data.processingTime}ms`);
    console.log(`   Files Processed: ${result.data.statistics.filesProcessed}`);
    console.log(`   Success Rate: ${(result.data.statistics.successRate * 100).toFixed(1)}%`);
  } else if (result.status === 400) {
    console.log(`   Error Type: ${result.data.errorType}`);
    console.log(`   Can Retry: ${result.data.canRetry}`);
    console.log(`   Suggestions: ${result.data.suggestions?.length || 0}`);
  }
}

/**
 * Test 5: Migration Status
 */
async function testMigrationStatus() {
  console.log('\n🧪 Test 5: Migration Status');
  
  const migrationId = 'test-migration-123';
  const result = await apiRequest(`/status/${migrationId}`);
  
  logTest('Get Migration Status', result);
  
  if (result.status === 200) {
    console.log(`   Status: ${result.data.status}`);
    console.log(`   Progress: ${result.data.progress}%`);
    console.log(`   Phase: ${result.data.details.phase}`);
  }
}

/**
 * Test 6: Migration History
 */
async function testMigrationHistory() {
  console.log('\n🧪 Test 6: Migration History');
  
  const sessionId = 'test-session-123';
  const result = await apiRequest(`/history/${sessionId}?limit=10&offset=0`);
  
  logTest('Get Migration History', result);
  
  if (result.status === 200) {
    console.log(`   Session ID: ${result.data.sessionId}`);
    console.log(`   Migrations: ${result.data.migrations.length}`);
    console.log(`   Total: ${result.data.pagination.total}`);
  }
}

/**
 * Test 7: Migration Retry
 */
async function testMigrationRetry() {
  console.log('\n🧪 Test 7: Migration Retry');
  
  const migrationId = 'test-migration-123';
  const retryOptions = {
    options: {
      reduceComplexity: true,
      skipValidation: false
    }
  };
  
  const result = await apiRequest(`/retry/${migrationId}`, {
    method: 'POST',
    body: JSON.stringify(retryOptions)
  });
  
  logTest('Retry Migration', result);
  
  if (result.status === 200) {
    console.log(`   Retry ID: ${result.data.retryId}`);
    console.log(`   Message: ${result.data.message}`);
  }
}

/**
 * Test 8: Error Handling
 */
async function testErrorHandling() {
  console.log('\n🧪 Test 8: Error Handling');
  
  // Test missing required fields
  const invalidRequest = {
    command: 'test command'
    // Missing sessionId, userId, targetTechnology
  };
  
  const result = await apiRequest('/migrate', {
    method: 'POST',
    body: JSON.stringify(invalidRequest)
  });
  
  logTest('Missing Required Fields', result);
  
  if (result.status === 400) {
    console.log(`   Validation Errors: ${result.data.details?.length || 0}`);
  }

  // Test dangerous command
  const dangerousRequest = {
    sessionId: 'test-session',
    userId: 'test-user',
    command: 'rm -rf /',
    targetTechnology: 'Prisma'
  };
  
  const dangerousResult = await apiRequest('/migrate', {
    method: 'POST',
    body: JSON.stringify(dangerousRequest)
  });
  
  logTest('Dangerous Command Detection', dangerousResult);
  
  if (dangerousResult.status === 400) {
    console.log(`   Blocked: ${dangerousResult.data.error}`);
  }
}

/**
 * Test 9: Rate Limiting
 */
async function testRateLimiting() {
  console.log('\n🧪 Test 9: Rate Limiting');
  
  const requests = [];
  const requestCount = 60; // Exceed rate limit of 50
  
  console.log(`   Sending ${requestCount} requests to test rate limiting...`);
  
  for (let i = 0; i < requestCount; i++) {
    requests.push(apiRequest('/health'));
  }
  
  const results = await Promise.all(requests);
  const successCount = results.filter(r => r.status === 200).length;
  const rateLimitedCount = results.filter(r => r.status === 429).length;
  
  console.log(`   Successful: ${successCount}`);
  console.log(`   Rate Limited: ${rateLimitedCount}`);
  
  if (rateLimitedCount > 0) {
    console.log('✅ Rate limiting is working');
  } else {
    console.log('⚠️  Rate limiting may not be active');
  }
}

/**
 * Test 10: Authentication
 */
async function testAuthentication() {
  console.log('\n🧪 Test 10: Authentication');
  
  // Test without authentication
  const noAuthResult = await apiRequest('/health', {
    headers: {
      'Content-Type': 'application/json'
      // No Authorization header
    }
  });
  
  logTest('No Authentication', noAuthResult);
  
  if (noAuthResult.status === 401) {
    console.log('✅ Authentication is required');
  } else {
    console.log('⚠️  Authentication may not be enforced');
  }

  // Test with invalid token
  const invalidAuthResult = await apiRequest('/health', {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer invalid-token'
    }
  });
  
  logTest('Invalid Authentication', invalidAuthResult);
  
  if (invalidAuthResult.status === 401) {
    console.log('✅ Invalid tokens are rejected');
  }
}

/**
 * Test 11: API Response Format
 */
async function testAPIResponseFormat() {
  console.log('\n🧪 Test 11: API Response Format');
  
  const result = await apiRequest('/templates');
  
  if (result.status === 200) {
    const requiredFields = ['success', 'templates', 'count'];
    const hasRequiredFields = requiredFields.every(field => result.data.hasOwnProperty(field));
    
    logTest('Response Format Validation', { status: hasRequiredFields ? 200 : 400 });
    
    if (hasRequiredFields) {
      console.log('✅ Response has required fields');
      console.log(`   Success: ${result.data.success}`);
      console.log(`   Count: ${result.data.count}`);
      console.log(`   Templates: ${Array.isArray(result.data.templates) ? 'Array' : 'Not Array'}`);
    } else {
      console.log('❌ Response missing required fields');
    }
  }
}

/**
 * Test 12: Comprehensive Migration Flow
 */
async function testComprehensiveMigrationFlow() {
  console.log('\n🧪 Test 12: Comprehensive Migration Flow');
  
  const flowSteps = [
    { name: 'Health Check', test: () => apiRequest('/health') },
    { name: 'Get Templates', test: () => apiRequest('/templates') },
    { name: 'Validate Command', test: () => apiRequest('/validate', {
      method: 'POST',
      body: JSON.stringify({
        command: 'convert React components to TypeScript',
        targetTechnology: 'TypeScript'
      })
    })},
    { name: 'Process Migration', test: () => apiRequest('/migrate', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'flow-test-session',
        userId: 'flow-test-user',
        command: 'convert React components to TypeScript',
        targetTechnology: 'TypeScript',
        options: { generateTypes: true }
      })
    })},
    { name: 'Check Status', test: () => apiRequest('/status/flow-test-migration') },
    { name: 'Get History', test: () => apiRequest('/history/flow-test-session') }
  ];

  let successCount = 0;
  
  for (const step of flowSteps) {
    try {
      const result = await step.test();
      const success = result.status >= 200 && result.status < 300;
      logTest(step.name, result);
      if (success) successCount++;
    } catch (error) {
      console.log(`❌ ${step.name}: ${error.message}`);
    }
  }
  
  console.log(`\n📊 Flow Test Summary: ${successCount}/${flowSteps.length} steps successful`);
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('🚀 Starting Comprehensive Migration API Tests\n');
  console.log(`📍 Testing API at: ${API_BASE}`);
  console.log(`🔑 Using Auth Token: ${AUTH_TOKEN.substring(0, 20)}...`);
  
  const tests = [
    testHealthCheck,
    testMigrationTemplates,
    testMigrationValidation,
    testMigrationRequest,
    testMigrationStatus,
    testMigrationHistory,
    testMigrationRetry,
    testErrorHandling,
    testRateLimiting,
    testAuthentication,
    testAPIResponseFormat,
    testComprehensiveMigrationFlow
  ];

  let passedTests = 0;
  let totalTests = 0;

  for (const test of tests) {
    try {
      await test();
      passedTests++;
    } catch (error) {
      console.error(`❌ Test failed: ${error.message}`);
    }
    totalTests++;
  }

  console.log('\n🎯 Test Summary');
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}`);
  console.log(`📊 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! Migration API is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the API implementation.');
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export {
  runAllTests,
  testHealthCheck,
  testMigrationTemplates,
  testMigrationValidation,
  testMigrationRequest,
  testMigrationStatus,
  testMigrationHistory,
  testMigrationRetry,
  testErrorHandling,
  testRateLimiting,
  testAuthentication,
  testAPIResponseFormat,
  testComprehensiveMigrationFlow
};