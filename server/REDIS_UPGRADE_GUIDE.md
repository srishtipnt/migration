# Redis Upgrade Guide for Windows

## Current Issue
Your current Redis version (3.0.504) is incompatible with BullMQ, which requires Redis 5.0.0 or higher.

## Solution Options

### Option 1: Use Docker (Recommended)
This is the easiest and most reliable method:

1. **Install Docker Desktop for Windows**
   - Download from: https://www.docker.com/products/docker-desktop/
   - Install and restart your computer

2. **Start Redis using Docker Compose**
   ```bash
   cd project/server
   docker-compose up -d redis
   ```

3. **Verify Redis is running**
   ```bash
   docker ps
   ```

4. **Stop the old Redis service**
   - Open Services (services.msc)
   - Find "Redis" service
   - Right-click → Stop
   - Right-click → Properties → Startup type → Disabled

### Option 2: Manual Redis Installation

1. **Download Redis for Windows**
   - Download Redis 7.x from: https://github.com/microsoftarchive/redis/releases
   - Or use Memurai (Redis-compatible): https://www.memurai.com/

2. **Stop Current Redis Service**
   ```cmd
   net stop redis
   sc config redis start= disabled
   ```

3. **Install New Redis**
   - Extract the downloaded Redis
   - Install as Windows Service
   - Start the service

### Option 3: Use WSL2 (Windows Subsystem for Linux)

1. **Install WSL2**
   ```cmd
   wsl --install
   ```

2. **Install Redis in WSL2**
   ```bash
   sudo apt update
   sudo apt install redis-server
   sudo service redis-server start
   ```

3. **Update connection settings**
   - Change Redis host to `localhost` (WSL2 automatically forwards ports)

## Verification

After upgrading, verify the installation:

```bash
cd project/server
node -e "
const Redis = require('ioredis');
const redis = new Redis();
redis.info('server').then(info => {
  const version = info.match(/redis_version:(\d+\.\d+\.\d+)/)[1];
  console.log('Redis version:', version);
  if (version >= '5.0.0') {
    console.log('✅ Redis version is compatible with BullMQ');
  } else {
    console.log('❌ Redis version is still too old');
  }
  redis.quit();
}).catch(err => console.error('Error:', err));
"
```

## Expected Output After Fix

Once Redis is upgraded, you should see:
- ✅ Redis connection test successful
- ✅ BullMQ queue initialized successfully
- ✅ Migration Agent Service initialized
- No more "Redis version needs to be greater or equal than 5.0.0" errors

## Troubleshooting

### If Redis is still not working:
1. Check if Redis is running: `netstat -an | grep 6379`
2. Verify Redis version: Use the verification script above
3. Check firewall settings
4. Ensure no other services are using port 6379

### If Docker is not available:
- Use Option 2 (Manual Installation) or Option 3 (WSL2)
- Consider using a cloud Redis service (Redis Cloud, AWS ElastiCache)

## Environment Variables

Make sure your `.env` file has the correct Redis settings:
```
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```
