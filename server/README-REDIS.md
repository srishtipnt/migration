# Redis Setup for Migration Service

## Installation

### Windows
1. **Download Redis for Windows:**
   - Download from: https://github.com/microsoftarchive/redis/releases
   - Or use WSL with Ubuntu: `sudo apt-get install redis-server`

2. **Using Chocolatey (Recommended):**
   ```bash
   choco install redis-64
   ```

3. **Using Docker (Easiest):**
   ```bash
   docker run -d -p 6379:6379 --name redis redis:latest
   ```

### macOS
```bash
brew install redis
brew services start redis
```

### Linux
```bash
sudo apt-get install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

## Configuration

The Redis configuration is in `config/redis.js` and uses these environment variables:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

## Features

### 1. Migration Result Caching
- Caches migration results for 1 hour by default
- Reduces database load for repeated requests
- Automatic cache invalidation

### 2. User Session Management
- Caches user session data for 24 hours
- Improves authentication performance
- Reduces database queries

### 3. Language Detection Caching
- Caches language detection results for 30 minutes
- Speeds up repeated file analysis
- Reduces AI API calls

### 4. Rate Limiting
- Prevents API abuse
- Configurable limits per user/action
- Automatic cleanup

### 5. Background Job Queue
- Queue system for background processing
- Priority-based job processing
- Reliable job execution

## Usage

### Start Redis Server
```bash
# Windows
redis-server

# macOS/Linux
redis-server /usr/local/etc/redis.conf
```

### Test Redis Connection
```bash
redis-cli ping
# Should return: PONG
```

### Monitor Redis
```bash
redis-cli monitor
```

## Health Check

The service includes a health check endpoint:
```
GET /health
```

Returns:
```json
{
  "success": true,
  "message": "Migration Service API is running",
  "services": {
    "database": true,
    "redis": true
  }
}
```

## Cache Management

### Clear Cache
```javascript
// Clear all cache
await RedisService.clearCache();

// Clear specific pattern
await RedisService.clearCache('migration:*');
```

### Get Cache Statistics
```javascript
const stats = await RedisService.getCacheStats();
console.log(stats);
```

## Production Considerations

1. **Redis Persistence:** Enable AOF and RDB for data durability
2. **Memory Management:** Set appropriate maxmemory policy
3. **Security:** Use Redis AUTH and network security
4. **Monitoring:** Set up Redis monitoring and alerting
5. **Backup:** Regular backup of Redis data

## Troubleshooting

### Common Issues

1. **Connection Refused:**
   - Ensure Redis server is running
   - Check port 6379 is not blocked
   - Verify firewall settings

2. **Memory Issues:**
   - Monitor Redis memory usage
   - Set appropriate maxmemory policy
   - Clear cache if needed

3. **Performance Issues:**
   - Check Redis logs
   - Monitor slow queries
   - Optimize cache TTL values
