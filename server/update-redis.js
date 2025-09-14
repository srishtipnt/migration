#!/usr/bin/env node

/**
 * Redis Update Script for Windows
 * 
 * This script helps switch from Windows Redis 3.0.504 to WSL2 Redis 6.0.16
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function stopWindowsRedisService() {
  console.log('🛑 Stopping Windows Redis service...');
  
  try {
    // Try to stop the Redis service
    await execAsync('net stop redis');
    console.log('✅ Windows Redis service stopped');
    
    // Disable auto-start
    await execAsync('sc config redis start= disabled');
    console.log('✅ Windows Redis service disabled');
    
  } catch (error) {
    console.log('⚠️  Could not stop Windows Redis service:', error.message);
    console.log('💡 You may need to run this script as Administrator');
    console.log('💡 Or manually stop the Redis service in Services.msc');
  }
}

async function startWSLRedis() {
  console.log('🚀 Starting Redis in WSL2...');
  
  try {
    await execAsync('wsl sudo service redis-server start');
    console.log('✅ Redis started in WSL2');
  } catch (error) {
    console.log('❌ Failed to start Redis in WSL2:', error.message);
  }
}

async function checkRedisVersions() {
  console.log('🔍 Checking Redis versions...');
  
  try {
    // Check WSL Redis version
    const { stdout: wslVersion } = await execAsync('wsl redis-cli --version');
    console.log('📊 WSL Redis version:', wslVersion.trim());
    
    // Check if WSL Redis is compatible
    if (wslVersion.includes('6.0.16')) {
      console.log('✅ WSL Redis version is compatible with BullMQ');
    } else {
      console.log('⚠️  WSL Redis version may not be compatible');
    }
    
  } catch (error) {
    console.log('❌ Failed to check WSL Redis version:', error.message);
  }
}

async function testRedisConnection() {
  console.log('🔍 Testing Redis connection...');
  
  try {
    const { stdout } = await execAsync('wsl redis-cli ping');
    if (stdout.trim() === 'PONG') {
      console.log('✅ Redis is responding in WSL2');
      return true;
    }
  } catch (error) {
    console.log('❌ Redis connection failed:', error.message);
    return false;
  }
}

async function updateEnvironmentFile() {
  console.log('📝 Updating environment configuration...');
  
  const envContent = `# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/migration-service
MONGODB_TEST_URI=mongodb://localhost:27017/migration-service-test

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=7d

# File Storage Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=104857600
MAX_FILES_PER_SESSION=100

# Storage Provider (local, s3, gcs)
STORAGE_PROVIDER=local

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security
ARGON2_MEMORY_COST=65536
ARGON2_TIME_COST=3
ARGON2_PARALLELISM=1
SESSION_SECRET=your-session-secret

# Redis Configuration - Using WSL2 Redis (version 6.0.16)
# Note: WSL2 Redis runs on the same port but is accessible from Windows
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Job Queue Configuration
MIGRATION_CONCURRENCY=1

# Gemini API Configuration
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_EMBEDDING_MODEL=text-embedding-004
GEMINI_EMBEDDING_DIMENSIONS=768
`;

  try {
    const fs = await import('fs');
    await fs.promises.writeFile('.env', envContent);
    console.log('✅ Environment file updated');
  } catch (error) {
    console.log('⚠️  Could not update .env file:', error.message);
    console.log('💡 You may need to manually create/update the .env file');
  }
}

async function main() {
  console.log('🔧 Redis Update Script\n');
  
  // Check current Redis versions
  await checkRedisVersions();
  
  // Stop Windows Redis service
  await stopWindowsRedisService();
  
  // Start WSL Redis
  await startWSLRedis();
  
  // Test connection
  const isConnected = await testRedisConnection();
  
  if (isConnected) {
    // Update environment file
    await updateEnvironmentFile();
    
    console.log('\n🎉 Redis update complete!');
    console.log('💡 You can now restart your migration service');
    console.log('💡 Run: npm run dev');
  } else {
    console.log('\n❌ Redis update failed');
    console.log('💡 Try running this script as Administrator');
  }
}

main().catch(console.error);
