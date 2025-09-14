#!/usr/bin/env node

/**
 * Quick Redis Fix Script
 * 
 * This script helps resolve Redis connection issues
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function checkRedisStatus() {
  console.log('🔍 Checking Redis status...');
  
  try {
    // Check if WSL Redis is running
    const { stdout } = await execAsync('wsl redis-cli ping');
    if (stdout.trim() === 'PONG') {
      console.log('✅ WSL Redis is running');
      
      // Get WSL Redis version
      const { stdout: version } = await execAsync('wsl redis-cli --version');
      console.log('📊 WSL Redis version:', version.trim());
      
      return true;
    }
  } catch (error) {
    console.log('❌ WSL Redis is not responding');
    return false;
  }
}

async function startWSLRedis() {
  console.log('🚀 Starting WSL Redis...');
  
  try {
    await execAsync('wsl sudo service redis-server start');
    console.log('✅ WSL Redis started');
  } catch (error) {
    console.log('❌ Failed to start WSL Redis:', error.message);
  }
}

async function main() {
  console.log('🔧 Quick Redis Fix\n');
  
  // Check Redis status
  const isRunning = await checkRedisStatus();
  
  if (!isRunning) {
    // Start WSL Redis
    await startWSLRedis();
    
    // Check again
    await checkRedisStatus();
  }
  
  console.log('\n💡 Next steps:');
  console.log('1. Stop Windows Redis service (run as Administrator):');
  console.log('   net stop redis');
  console.log('   sc config redis start= disabled');
  console.log('2. Start your migration app:');
  console.log('   npm run dev');
}

main().catch(console.error);
