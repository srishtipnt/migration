#!/usr/bin/env node

/**
 * Redis Service Manager for Windows
 * 
 * This script helps manage Redis services on Windows
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function stopWindowsRedisService() {
  console.log('🛑 Stopping Windows Redis service...');
  
  try {
    // Stop the Redis service
    await execAsync('net stop redis');
    console.log('✅ Windows Redis service stopped');
    
    // Disable auto-start
    await execAsync('sc config redis start= disabled');
    console.log('✅ Windows Redis service disabled');
    
  } catch (error) {
    console.log('⚠️  Could not stop Windows Redis service:', error.message);
    console.log('💡 You may need to run this script as Administrator');
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

async function checkRedisConnection() {
  console.log('🔍 Checking Redis connection...');
  
  try {
    const { stdout } = await execAsync('wsl redis-cli ping');
    if (stdout.trim() === 'PONG') {
      console.log('✅ Redis is responding in WSL2');
      
      // Get version
      const { stdout: version } = await execAsync('wsl redis-cli --version');
      console.log('📊 Redis version:', version.trim());
      
      return true;
    }
  } catch (error) {
    console.log('❌ Redis connection failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🔧 Redis Service Manager\n');
  
  // Stop Windows Redis service
  await stopWindowsRedisService();
  
  // Start WSL Redis
  await startWSLRedis();
  
  // Check connection
  const isConnected = await checkRedisConnection();
  
  if (isConnected) {
    console.log('\n🎉 Redis setup complete!');
    console.log('💡 You can now run your migration service');
  } else {
    console.log('\n❌ Redis setup failed');
    console.log('💡 Try running this script as Administrator');
  }
}

main().catch(console.error);
