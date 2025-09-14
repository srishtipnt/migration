import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB) || 0,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: null, // Required by BullMQ
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 5000, // Reduced timeout
  commandTimeout: 3000, // Reduced timeout
  // Add retry configuration for better handling
  retryDelayOnClusterDown: 300,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  maxLoadingTimeout: 5000, // Reduced timeout
  // Try to connect to WSL Redis if Windows Redis fails
  family: 4, // Force IPv4
  // Disable automatic reconnection to prevent loops
  enableAutoPipelining: false,
  maxRetriesPerRequest: 3, // Limit retries
};

// Create Redis connection with error handling
let redis = null; // Redis temporarily disabled to prevent connection loops
let redisCompatible = false;

// Redis is temporarily disabled to prevent connection loops
// To enable Redis: 1) Start Redis server, 2) Uncomment the lines below
/*
try {
  redis = new Redis(redisConfig);
} catch (error) {
  console.warn('⚠️  Redis initialization failed:', error.message);
  redis = null;
}
*/

// Handle connection events (only if Redis is available)
if (redis) {
  redis.on('connect', () => {
    console.log('🔗 Redis connected successfully');
  });

  redis.on('error', (error) => {
    // Only log connection errors, not every retry attempt
    if (error.code !== 'ECONNREFUSED' && error.code !== 'TIMEOUT') {
      console.error('❌ Redis connection error:', error);
    }
  });

  redis.on('close', () => {
    console.log('🔌 Redis connection closed');
  });

  redis.on('reconnecting', () => {
    console.log('🔄 Redis reconnecting...');
  });
}

// Test connection
const testConnection = async () => {
  if (!redis) {
    console.warn('⚠️  Redis not available - job queue functionality disabled');
    return false;
  }
  
  try {
    await redis.ping();
    console.log('✅ Redis connection test successful');
    
    // Check Redis version and warn if too old
    try {
      const info = await redis.info('server');
      const versionMatch = info.match(/redis_version:(\d+\.\d+\.\d+)/);
      if (versionMatch) {
        const version = versionMatch[1];
        console.log(`📊 Redis version: ${version}`);
        if (version < '5.0.0') {
          console.warn('⚠️  WARNING: Redis version is too old for BullMQ (requires 5.0.0+)');
          console.warn('⚠️  Job queue functionality will be limited');
          redisCompatible = false;
        } else {
          redisCompatible = true;
        }
      }
    } catch (versionError) {
      console.warn('⚠️  Could not check Redis version:', versionError.message);
      redisCompatible = false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Redis connection test failed:', error);
    redisCompatible = false;
    return false;
  }
};

// Graceful shutdown
const closeConnection = async () => {
  if (!redis) {
    return;
  }
  
  try {
    await redis.quit();
    console.log('🔌 Redis connection closed gracefully');
  } catch (error) {
    console.error('❌ Error closing Redis connection:', error);
  }
};

// Check if Redis is compatible with BullMQ
const isRedisCompatible = () => redisCompatible;

export { redis, testConnection, closeConnection, isRedisCompatible };
export default redis;
