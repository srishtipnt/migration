# MongoDB Atlas Vector Search Setup Guide

## Overview
This guide will help you migrate from local MongoDB to MongoDB Atlas and set up Vector Search functionality for your migration app.

## Prerequisites
- MongoDB Atlas account (free tier available)
- Your migration app currently running with local MongoDB
- Node.js and npm installed

## Step 1: Create MongoDB Atlas Account & Cluster

### 1.1 Sign Up for Atlas
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Click "Try Free" and create an account
3. Choose "Build a new app" when prompted

### 1.2 Create Cluster
1. **Cluster Type**: Choose "M0 Sandbox" (free tier)
2. **Cloud Provider**: Choose your preferred provider (AWS, Google Cloud, Azure)
3. **Region**: Select region closest to your location
4. **Cluster Name**: Name it "migration-cluster" (or your preference)
5. Click "Create Cluster"

### 1.3 Configure Database Access
1. Go to "Database Access" in the left sidebar
2. Click "Add New Database User"
3. **Authentication Method**: Password
4. **Username**: `migration-user`
5. **Password**: Generate a secure password (save it!)
6. **Database User Privileges**: "Read and write to any database"
7. Click "Add User"

### 1.4 Configure Network Access
1. Go to "Network Access" in the left sidebar
2. Click "Add IP Address"
3. Choose "Allow access from anywhere" (0.0.0.0/0) for development
   - **Note**: For production, add only your specific IP addresses
4. Click "Confirm"

## Step 2: Get Connection String

### 2.1 Get Connection String
1. Go to "Clusters" in the left sidebar
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. **Driver**: Node.js
5. **Version**: 4.1 or later
6. Copy the connection string (looks like):
   ```
   mongodb+srv://migration-user:<password>@migration-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### 2.2 Update Environment Variables
Update your `.env` file:
```env
# Replace your current MONGODB_URI with Atlas connection string
MONGODB_URI=mongodb+srv://migration-user:your-password@migration-cluster.xxxxx.mongodb.net/migration-service?retryWrites=true&w=majority

# Keep other settings the same
MONGODB_TEST_URI=mongodb+srv://migration-user:your-password@migration-cluster.xxxxx.mongodb.net/migration-service-test?retryWrites=true&w=majority
```

## Step 3: Migrate Data to Atlas

### 3.1 Run Migration Script
```bash
cd project/server
node migrate-to-atlas.js
```

This script will:
- Connect to both local and Atlas databases
- Migrate all your existing data
- Convert embeddings to Atlas format
- Provide migration statistics

### 3.2 Verify Migration
After migration, check your Atlas cluster:
1. Go to "Browse Collections" in Atlas
2. Verify your data is there
3. Check the `embeddings` collection

## Step 4: Create Vector Search Index

### 4.1 Navigate to Search
1. In Atlas, go to your cluster
2. Click "Search" tab
3. Click "Create Search Index"

### 4.2 Configure Vector Search Index
1. **Configuration Method**: "Atlas Vector Search"
2. **Index Name**: `vector_index`
3. **Database**: `migration-service`
4. **Collection**: `embeddings`

### 4.3 Define Index Configuration
Use this JSON configuration:
```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 768,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "sessionId"
    },
    {
      "type": "filter", 
      "path": "chunkType"
    },
    {
      "type": "filter",
      "path": "language"
    },
    {
      "type": "filter",
      "path": "complexity"
    }
  ]
}
```

### 4.4 Create Index
1. Click "Next"
2. Review configuration
3. Click "Create Search Index"
4. Wait for index to build (may take a few minutes)

## Step 5: Update Your Application Code

### 5.1 Use Atlas Vector Search Service
Replace your current embedding service with the new Atlas service:

```javascript
// In your migration agent service
import AtlasVectorSearchService from '../services/atlasVectorSearchService.js';

const atlasVectorService = new AtlasVectorSearchService();

// Use Atlas vector search
const similarChunks = await atlasVectorService.findSimilarChunks(
  sessionId, 
  commandEmbedding, 
  { threshold: 0.7, limit: 20 }
);
```

### 5.2 Test Vector Search
Create a test script to verify vector search is working:

```javascript
// test-atlas-vector-search.js
import AtlasVectorSearchService from './src/services/atlasVectorSearchService.js';

const atlasService = new AtlasVectorSearchService();

async function testVectorSearch() {
  try {
    // Test with a sample embedding
    const testEmbedding = new Array(768).fill(0.1);
    
    const results = await atlasService.findSimilarChunks(
      'your-session-id',
      testEmbedding,
      { threshold: 0.5, limit: 5 }
    );
    
    console.log('✅ Vector search results:', results);
  } catch (error) {
    console.error('❌ Vector search test failed:', error);
  }
}

testVectorSearch();
```

## Step 6: Verify Everything Works

### 6.1 Test Database Connection
```bash
node test-mongo-basic.js
```

### 6.2 Test Vector Search
```bash
node test-atlas-vector-search.js
```

### 6.3 Test Your Migration App
1. Start your server: `npm start`
2. Upload some files
3. Run a migration
4. Verify vector search is working in the logs

## Troubleshooting

### Common Issues

#### 1. Connection String Issues
- **Problem**: Connection refused
- **Solution**: Check username/password, ensure IP is whitelisted

#### 2. Vector Search Not Working
- **Problem**: `$vectorSearch` not recognized
- **Solution**: Ensure you're connected to Atlas, not local MongoDB

#### 3. Index Not Found
- **Problem**: Vector search index not found
- **Solution**: Check index name matches your code (`vector_index`)

#### 4. Dimension Mismatch
- **Problem**: Embedding dimensions don't match
- **Solution**: Ensure `numDimensions` in index matches your embeddings (768)

### Performance Tips

1. **Batch Operations**: Use batch inserts for better performance
2. **Index Optimization**: Create compound indexes for common queries
3. **Connection Pooling**: Use connection pooling for better performance
4. **Monitoring**: Use Atlas monitoring to track performance

## Benefits of Atlas Vector Search

### Performance Improvements
- **Native Vector Search**: Up to 100x faster than manual similarity calculations
- **Scalability**: Handles millions of vectors efficiently
- **Memory Efficient**: No need to load all embeddings into memory

### Advanced Features
- **Hybrid Search**: Combine vector search with text search
- **Filtering**: Filter results by metadata before vector search
- **Scoring**: Built-in relevance scoring
- **Aggregation**: Use with MongoDB aggregation pipeline

## Next Steps

1. **Monitor Performance**: Use Atlas monitoring to track query performance
2. **Optimize Queries**: Fine-tune similarity thresholds and limits
3. **Scale Up**: Upgrade to paid tier when you need more resources
4. **Add Features**: Implement hybrid search, faceted search, etc.

## Support

- **Atlas Documentation**: https://docs.atlas.mongodb.com/
- **Vector Search Guide**: https://docs.atlas.mongodb.com/atlas-vector-search/
- **Community Forum**: https://community.mongodb.com/

---

**Note**: This setup will significantly improve your migration app's performance and enable advanced AI-powered code analysis features!
