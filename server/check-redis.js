#!/usr/bin/env node

/**
 * Redis Upgrade Helper Script
 * 
 * This script helps verify Redis installation and provides upgrade guidance
 */

import Redis from 'ioredis';

async function checkRedisVersion() {
  console.log('🔍 Checking Redis installation...\n');
  
  try {
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB) || 0,
      connectTimeout: 5000,
      lazyConnect: true
    });

    // Test connection
    await redis.ping();
    console.log('✅ Redis connection successful');

    // Get version info
    const info = await redis.info('server');
    const versionMatch = info.match(/redis_version:(\d+\.\d+\.\d+)/);
    
    if (versionMatch) {
      const version = versionMatch[1];
      console.log(`📊 Current Redis version: ${version}`);
      
      if (version >= '5.0.0') {
        console.log('✅ Redis version is compatible with BullMQ');
        console.log('🎉 Your Redis installation is ready for the migration service!');
      } else {
        console.log('❌ Redis version is too old for BullMQ');
        console.log('⚠️  BullMQ requires Redis 5.0.0 or higher');
        console.log('\n📋 Upgrade Options:');
        console.log('1. Use Docker: docker-compose up -d redis');
        console.log('2. Manual upgrade: See REDIS_UPGRADE_GUIDE.md');
        console.log('3. Use WSL2: Install Redis in Linux subsystem');
      }
    } else {
      console.log('⚠️  Could not determine Redis version');
    }

    await redis.quit();
    
  } catch (error) {
    console.log('❌ Redis connection failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check if Redis is running: netstat -an | grep 6379');
    console.log('2. Install Redis: See REDIS_UPGRADE_GUIDE.md');
    console.log('3. Use Docker: docker-compose up -d redis');
  }
}

// Run the check
checkRedisVersion().catch(console.error);
