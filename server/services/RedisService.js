import redis from '../config/redis.js';

class RedisService {
  constructor() {
    this.redis = redis;
    this.defaultTTL = 3600; // 1 hour default TTL
  }

  // Cache migration results
  async cacheMigrationResult(sessionId, result, ttl = this.defaultTTL) {
    try {
      const key = `migration:${sessionId}`;
      await this.redis.setex(key, ttl, JSON.stringify(result));
      console.log(`💾 Cached migration result for session: ${sessionId}`);
      return true;
    } catch (error) {
      console.error('❌ Error caching migration result:', error);
      return false;
    }
  }

  // Get cached migration result
  async getCachedMigrationResult(sessionId) {
    try {
      const key = `migration:${sessionId}`;
      const result = await this.redis.get(key);
      if (result) {
        console.log(`📥 Retrieved cached migration result for session: ${sessionId}`);
        return JSON.parse(result);
      }
      return null;
    } catch (error) {
      console.error('❌ Error retrieving cached migration result:', error);
      return null;
    }
  }

  // Cache user session data
  async cacheUserSession(userId, sessionData, ttl = 86400) { // 24 hours
    try {
      const key = `user:session:${userId}`;
      await this.redis.setex(key, ttl, JSON.stringify(sessionData));
      console.log(`💾 Cached user session for user: ${userId}`);
      return true;
    } catch (error) {
      console.error('❌ Error caching user session:', error);
      return false;
    }
  }

  // Get cached user session
  async getCachedUserSession(userId) {
    try {
      const key = `user:session:${userId}`;
      const session = await this.redis.get(key);
      if (session) {
        console.log(`📥 Retrieved cached user session for user: ${userId}`);
        return JSON.parse(session);
      }
      return null;
    } catch (error) {
      console.error('❌ Error retrieving cached user session:', error);
      return null;
    }
  }

  // Cache language detection results
  async cacheLanguageDetection(fileHash, detectionResult, ttl = 1800) { // 30 minutes
    try {
      const key = `lang:detection:${fileHash}`;
      await this.redis.setex(key, ttl, JSON.stringify(detectionResult));
      console.log(`💾 Cached language detection for file hash: ${fileHash}`);
      return true;
    } catch (error) {
      console.error('❌ Error caching language detection:', error);
      return false;
    }
  }

  // Get cached language detection
  async getCachedLanguageDetection(fileHash) {
    try {
      const key = `lang:detection:${fileHash}`;
      const result = await this.redis.get(key);
      if (result) {
        console.log(`📥 Retrieved cached language detection for file hash: ${fileHash}`);
        return JSON.parse(result);
      }
      return null;
    } catch (error) {
      console.error('❌ Error retrieving cached language detection:', error);
      return null;
    }
  }

  // Rate limiting
  async checkRateLimit(userId, action, limit = 10, window = 3600) {
    try {
      const key = `rate:${action}:${userId}`;
      const current = await this.redis.incr(key);
      
      if (current === 1) {
        await this.redis.expire(key, window);
      }
      
      if (current > limit) {
        console.log(`🚫 Rate limit exceeded for user ${userId}, action: ${action}`);
        return false;
      }
      
      console.log(`✅ Rate limit check passed for user ${userId}, action: ${action} (${current}/${limit})`);
      return true;
    } catch (error) {
      console.error('❌ Error checking rate limit:', error);
      return true; // Allow on error
    }
  }

  // Queue management for background jobs
  async addToQueue(queueName, jobData, priority = 0) {
    try {
      const key = `queue:${queueName}`;
      const job = {
        id: Date.now() + Math.random(),
        data: jobData,
        priority,
        timestamp: Date.now()
      };
      
      await this.redis.lpush(key, JSON.stringify(job));
      console.log(`📤 Added job to queue ${queueName}:`, job.id);
      return job.id;
    } catch (error) {
      console.error('❌ Error adding to queue:', error);
      return null;
    }
  }

  // Process queue
  async processQueue(queueName, processor) {
    try {
      const key = `queue:${queueName}`;
      const job = await this.redis.brpop(key, 5); // Block for 5 seconds
      
      if (job) {
        const jobData = JSON.parse(job[1]);
        console.log(`🔄 Processing job from queue ${queueName}:`, jobData.id);
        await processor(jobData);
        console.log(`✅ Completed job from queue ${queueName}:`, jobData.id);
      }
    } catch (error) {
      console.error('❌ Error processing queue:', error);
    }
  }

  // Clear cache
  async clearCache(pattern = '*') {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        console.log(`🧹 Cleared ${keys.length} cache entries matching pattern: ${pattern}`);
      }
      return keys.length;
    } catch (error) {
      console.error('❌ Error clearing cache:', error);
      return 0;
    }
  }

  // Get cache statistics
  async getCacheStats() {
    try {
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      return {
        memory: info,
        keyspace: keyspace
      };
    } catch (error) {
      console.error('❌ Error getting cache stats:', error);
      return null;
    }
  }

  // Health check
  async healthCheck() {
    try {
      const pong = await this.redis.ping();
      return pong === 'PONG';
    } catch (error) {
      console.error('❌ Redis health check failed:', error);
      return false;
    }
  }
}

export default new RedisService();
