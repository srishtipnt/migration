# Cleanup Service Documentation

## Overview

The Cleanup Service automatically removes pending uploads and orphaned files from both MongoDB and Cloudinary to prevent storage bloat and reduce costs.

## Features

### 🕐 **Automatic Cleanup**
- **Cron Job**: Runs every 30 minutes automatically
- **Pending Jobs**: Cleans up migration jobs in 'pending' status older than 1 hour
- **Orphaned Files**: Removes files without associated migration jobs older than 2 hours
- **Cloudinary Cleanup**: Deletes assets from Cloudinary storage
- **Database Cleanup**: Removes records from MongoDB

### 🧹 **What Gets Cleaned**

#### Pending Migration Jobs (1+ hours old)
- Migration jobs with status 'pending'
- Associated file records
- Code chunks
- Cloudinary assets

#### Orphaned Files (2+ hours old)
- Files without associated migration jobs
- Cloudinary assets
- Database records

### 📊 **Monitoring**

#### API Endpoints
- `GET /api/cleanup/stats` - Get cleanup statistics
- `POST /api/cleanup/trigger` - Manually trigger cleanup

#### Statistics Available
```json
{
  "success": true,
  "data": {
    "pendingJobsToClean": 5,
    "oldFilesToClean": 12,
    "totalFiles": 150,
    "totalJobs": 25,
    "isRunning": false
  }
}
```

## Usage

### Automatic Operation
The cleanup service starts automatically when the server starts. No manual intervention required.

### Manual Trigger
```bash
# Via API
curl -X POST http://localhost:5000/api/cleanup/trigger

# Via Node.js
import cleanupService from './services/CleanupService.js';
await cleanupService.triggerCleanup();
```

### Get Statistics
```bash
# Via API
curl http://localhost:5000/api/cleanup/stats

# Via Node.js
import cleanupService from './services/CleanupService.js';
const stats = await cleanupService.getCleanupStats();
```

## Configuration

### Cron Schedule
Currently set to run every 30 minutes:
```javascript
cron.schedule('*/30 * * * *', () => {
  this.cleanupPendingUploads();
});
```

### Time Thresholds
- **Pending Jobs**: 1 hour (60 minutes)
- **Orphaned Files**: 2 hours (120 minutes)

### Cloudinary Settings
- Invalidates CDN cache when deleting assets
- Handles different resource types (raw, image, video)
- Gracefully handles "not found" errors

## Database Collections Cleaned

### MigrationJob Collection
- Removes jobs with status 'pending' older than 1 hour
- Includes all associated data (zipFile, metadata, etc.)

### FileStorage Collection
- Removes files associated with cleaned migration jobs
- Removes orphaned files without migration jobs
- Includes Cloudinary metadata cleanup

### CodeChunk Collection
- Removes code chunks associated with cleaned migration jobs
- Prevents orphaned embedding data

## Error Handling

### Graceful Degradation
- Continues cleanup even if individual items fail
- Logs errors but doesn't stop the process
- Handles Cloudinary API errors gracefully

### Logging
- Detailed progress logging
- Error logging with context
- Performance metrics (duration, counts)

## Testing

### Manual Test
```bash
cd project/server
node test-cleanup.js
```

### API Testing
```bash
# Get stats
curl http://localhost:5000/api/cleanup/stats

# Trigger cleanup
curl -X POST http://localhost:5000/api/cleanup/trigger
```

## Performance Considerations

### Batch Operations
- Processes multiple items in batches
- Uses MongoDB bulk operations where possible
- Efficient Cloudinary API usage

### Resource Management
- Prevents concurrent cleanup runs
- Memory-efficient processing
- Timeout handling

## Monitoring and Alerts

### Log Messages
- `🧹 Starting scheduled cleanup of pending uploads...`
- `🧹 Found X pending migration jobs to clean up`
- `☁️ Deleted from Cloudinary: public_id`
- `🧹 Cleanup completed in Xms`

### Error Indicators
- `❌ Failed to delete from Cloudinary`
- `❌ Error cleaning up job`
- `❌ Error during cleanup`

## Security Considerations

### Access Control
- Cleanup routes should be protected in production
- Consider adding authentication for manual triggers
- Rate limiting for manual triggers

### Data Safety
- Only removes clearly orphaned or old data
- Preserves active user sessions
- Maintains data integrity

## Troubleshooting

### Common Issues

#### Cleanup Not Running
- Check server logs for cron job initialization
- Verify node-cron package installation
- Check for JavaScript errors in cleanup service

#### Cloudinary Errors
- Verify Cloudinary credentials
- Check network connectivity
- Review Cloudinary API limits

#### Database Errors
- Verify MongoDB connection
- Check database permissions
- Review query performance

### Debug Mode
Enable detailed logging by setting:
```javascript
console.log('🧹 Debug: Starting cleanup...');
```

## Future Enhancements

### Potential Improvements
- Configurable time thresholds via environment variables
- Webhook notifications for cleanup events
- Detailed cleanup reports
- Integration with monitoring systems
- Cleanup scheduling customization

### Metrics to Add
- Storage space saved
- Cost reduction calculations
- Cleanup frequency metrics
- Error rate monitoring
