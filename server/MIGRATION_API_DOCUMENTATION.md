# 🚀 Migration API Documentation

## Overview

The Migration API provides comprehensive endpoints for AI-powered code migration services. Built with Express.js and integrated with the enhanced AI Migration Agent Service, it offers secure, validated, and feature-rich migration capabilities.

## 🔗 Base URL

```
http://localhost:3000/api/migrate
```

## 🔐 Authentication

All endpoints require authentication via JWT Bearer token:

```http
Authorization: Bearer <your-jwt-token>
```

## 📋 Endpoints

### 1. Health Check

**GET** `/health`

Check the health status of the migration service.

#### Response

```json
{
  "service": "Enhanced Migration API",
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "2.0.0",
  "components": {
    "migrationAgent": true,
    "database": "connected",
    "aiService": "available",
    "embeddingService": "available",
    "chunkStorageService": "available"
  },
  "capabilities": {
    "enhancedContextRetrieval": true,
    "aiPoweredCodeGeneration": true,
    "comprehensiveErrorHandling": true,
    "codeQualityValidation": true,
    "migrationPlanning": true,
    "retryMechanisms": true
  },
  "limits": {
    "maxCommandLength": 500,
    "maxProcessingTime": 300000,
    "maxChunksPerRequest": 50,
    "supportedTechnologies": 25
  }
}
```

---

### 2. Migration Templates

**GET** `/templates`

Get available migration templates with filtering options.

#### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `category` | string | Filter by category | `database`, `framework`, `language` |
| `difficulty` | string | Filter by difficulty | `low`, `medium`, `high` |
| `riskLevel` | string | Filter by risk level | `low`, `medium`, `high` |

#### Example Request

```http
GET /api/migrate/templates?category=database&difficulty=medium
```

#### Response

```json
{
  "success": true,
  "templates": [
    {
      "id": "database-prisma",
      "name": "Convert to Prisma",
      "description": "Convert database connections to Prisma ORM",
      "command": "convert database connection to Prisma",
      "targetTechnology": "Prisma",
      "category": "database",
      "icon": "🗄️",
      "difficulty": "medium",
      "estimatedTime": "2-4 hours",
      "riskLevel": "medium",
      "prerequisites": ["Database connection code", "Schema definitions"],
      "benefits": ["Type safety", "Better performance", "Modern ORM features"]
    }
  ],
  "count": 1,
  "categories": ["database", "framework", "language", "api", "styling", "testing", "build"],
  "difficulties": ["low", "medium", "high"],
  "riskLevels": ["low", "medium", "high"]
}
```

---

### 3. Migration Validation

**POST** `/validate`

Validate a migration command before processing.

#### Request Body

```json
{
  "command": "convert database connection to Prisma ORM",
  "targetTechnology": "Prisma",
  "sessionId": "session-123" // optional
}
```

#### Response

```json
{
  "success": true,
  "valid": true,
  "validation": {
    "commandLength": true,
    "commandComplexity": true,
    "technologySupported": true,
    "estimatedComplexity": "medium",
    "estimatedTime": "2-4 hours",
    "riskLevel": "medium",
    "hasIndexedCode": true,
    "indexedChunksCount": 45
  },
  "suggestions": [],
  "recommendations": [
    "Review the migration plan before execution",
    "Test the migrated code thoroughly"
  ]
}
```

---

### 4. Process Migration

**POST** `/migrate`

Main endpoint for processing migration requests.

#### Request Body

```json
{
  "sessionId": "session-123",
  "userId": "user-456",
  "command": "convert database connection to Prisma ORM",
  "targetTechnology": "Prisma",
  "options": {
    "preserveData": true,
    "generateTypes": true,
    "addValidation": true,
    "includeDependencies": true,
    "includeRelatedFiles": true,
    "threshold": 0.7,
    "limit": 20,
    "chunkTypes": ["class", "function"],
    "languages": ["javascript", "typescript"]
  }
}
```

#### Success Response

```json
{
  "success": true,
  "migrationId": "migration-1705312200000-abc123",
  "command": "convert database connection to Prisma ORM",
  "targetTechnology": "Prisma",
  "processingTime": 15420,
  "plan": {
    "analysis": "Migration analysis completed",
    "strategy": "Step-by-step migration approach",
    "codeTransformations": ["Transform database queries", "Update connection logic"],
    "dependencies": ["@prisma/client", "prisma"],
    "configuration": "Update database configuration",
    "testing": "Update test cases",
    "risks": "Potential breaking changes identified",
    "implementationOrder": ["Setup Prisma", "Migrate queries", "Update tests"],
    "timeline": {
      "estimatedTotalTime": "4-8 hours",
      "phases": [
        {
          "phase": "Preparation",
          "duration": "1-2 hours",
          "tasks": ["Setup dependencies", "Backup codebase"]
        }
      ],
      "riskLevel": "Medium"
    }
  },
  "results": [
    {
      "success": true,
      "filePath": "src/services/UserService.js",
      "migratedChunks": [
        {
          "originalChunk": {
            "id": "chunk-1",
            "name": "UserService",
            "type": "class",
            "filePath": "src/services/UserService.js",
            "language": "javascript",
            "complexity": 2
          },
          "migratedCode": "import { PrismaClient } from '@prisma/client';\n\nclass UserService {\n  constructor() {\n    this.prisma = new PrismaClient();\n  }\n}",
          "validation": {
            "hasCode": true,
            "hasImports": true,
            "maintainsStructure": true,
            "followsPatterns": true,
            "isValid": true,
            "issues": []
          }
        }
      ],
      "migratedFile": {
        "content": "import { PrismaClient } from '@prisma/client';\n\nclass UserService {\n  constructor() {\n    this.prisma = new PrismaClient();\n  }\n}",
        "metadata": {
          "originalChunks": 1,
          "migratedChunks": 1,
          "targetTechnology": "Prisma",
          "generatedAt": "2024-01-15T10:30:00.000Z"
        }
      },
      "statistics": {
        "totalChunks": 1,
        "successfulMigrations": 1,
        "failedMigrations": 0
      }
    }
  ],
  "validation": {
    "overall": {
      "success": true,
      "totalFiles": 1,
      "failedFiles": 0,
      "executionTime": 15420,
      "successRate": 100
    },
    "codeQuality": {
      "syntaxValidRate": 1.0,
      "importsCorrectRate": 1.0,
      "exportsCorrectRate": 1.0,
      "typeSafetyRate": 0.8,
      "errorHandlingRate": 0.9
    },
    "functionality": {
      "structurePreservedRate": 1.0,
      "logicIntactRate": 1.0,
      "apiCompatibleRate": 1.0
    },
    "dependencies": {
      "requiredDependencies": ["@prisma/client"],
      "missingDependencies": [],
      "versionConflicts": [],
      "totalRequired": 1
    },
    "issues": [],
    "recommendations": [
      "Review all migrated files before deployment",
      "Run comprehensive tests to ensure functionality"
    ]
  },
  "statistics": {
    "chunksAnalyzed": 45,
    "filesProcessed": 1,
    "successfulFiles": 1,
    "failedFiles": 0,
    "successRate": 100,
    "averageTimePerChunk": 342
  },
  "metadata": {
    "command": "convert database connection to Prisma ORM",
    "targetTechnology": "Prisma",
    "chunksAnalyzed": 45,
    "planGeneratedAt": "2024-01-15T10:30:00.000Z",
    "aiModel": "gemini-1.5-flash"
  },
  "message": "Migration completed successfully!"
}
```

#### Error Response

```json
{
  "success": false,
  "error": "Failed to find relevant chunks",
  "step": "chunk_discovery",
  "processingTime": 2500,
  "errorType": "VALIDATION_ERROR",
  "canRetry": true,
  "suggestions": [
    "Check chunk data integrity",
    "Ensure required fields are present",
    "Validate migration plan structure"
  ],
  "message": "Could not find relevant code to migrate. Please check your command"
}
```

---

### 5. Migration Status

**GET** `/status/:migrationId`

Get detailed status of a specific migration.

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `migrationId` | string | Unique migration identifier |

#### Response

```json
{
  "success": true,
  "migrationId": "migration-1705312200000-abc123",
  "status": "completed",
  "progress": 100,
  "message": "Migration completed successfully",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "details": {
    "phase": "completed",
    "currentStep": "validation",
    "stepsCompleted": 6,
    "totalSteps": 6,
    "estimatedTimeRemaining": 0,
    "lastActivity": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### 6. Migration History

**GET** `/history/:sessionId`

Get comprehensive migration history for a session.

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `sessionId` | string | Session identifier |

#### Query Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `limit` | integer | Number of results per page | 20 |
| `offset` | integer | Number of results to skip | 0 |

#### Response

```json
{
  "success": true,
  "sessionId": "session-123",
  "userId": "user-456",
  "migrations": [],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 0,
    "hasMore": false
  },
  "summary": {
    "totalMigrations": 0,
    "successfulMigrations": 0,
    "failedMigrations": 0,
    "averageProcessingTime": 0,
    "mostUsedTechnologies": []
  },
  "message": "Migration history feature coming soon"
}
```

---

### 7. Retry Migration

**POST** `/retry/:migrationId`

Retry a failed migration with optional modifications.

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `migrationId` | string | Unique migration identifier |

#### Request Body

```json
{
  "options": {
    "reduceComplexity": true,
    "skipValidation": false,
    "retryStrategy": "exponential_backoff"
  }
}
```

#### Response

```json
{
  "success": true,
  "migrationId": "migration-1705312200000-abc123",
  "retryId": "retry-1705312300000-def456",
  "message": "Migration retry initiated",
  "options": {
    "reduceComplexity": true,
    "skipValidation": false,
    "retryStrategy": "exponential_backoff"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## 🔒 Security Features

### Authentication
- JWT Bearer token required for all endpoints
- Token validation and user verification
- Session ownership checks

### Rate Limiting
- 50 requests per 15 minutes per user
- Exponential backoff for retries
- Rate limit headers included in responses

### Input Validation
- Comprehensive request validation using express-validator
- Dangerous command detection and blocking
- Sanitization of user inputs

### Error Handling
- Structured error responses
- No sensitive information exposure
- Detailed error classification and recovery suggestions

---

## 📊 Supported Technologies

### Databases
- Prisma
- PostgreSQL
- MongoDB
- Redis

### Frontend Frameworks
- React
- Vue.js
- Angular
- Next.js

### Backend Frameworks
- Express.js
- FastAPI

### Languages
- TypeScript
- JavaScript

### Testing
- Jest
- Vitest

### Build Tools
- Webpack
- Vite
- Rollup

### Styling
- Tailwind CSS

### APIs
- GraphQL
- REST

### Cloud Platforms
- AWS
- Firebase
- Vercel
- Netlify

### Containerization
- Docker
- Kubernetes

---

## 🚨 Error Codes

| Status Code | Description | Common Causes |
|-------------|-------------|---------------|
| 400 | Bad Request | Invalid request data, validation errors |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Insufficient permissions, access denied |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error, service unavailable |
| 503 | Service Unavailable | Migration service not initialized |

---

## 📝 Request Examples

### cURL Examples

#### Health Check
```bash
curl -X GET "http://localhost:3000/api/migrate/health" \
  -H "Authorization: Bearer your-jwt-token"
```

#### Get Templates
```bash
curl -X GET "http://localhost:3000/api/migrate/templates?category=database" \
  -H "Authorization: Bearer your-jwt-token"
```

#### Validate Command
```bash
curl -X POST "http://localhost:3000/api/migrate/validate" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "command": "convert database connection to Prisma",
    "targetTechnology": "Prisma"
  }'
```

#### Process Migration
```bash
curl -X POST "http://localhost:3000/api/migrate/migrate" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session-123",
    "userId": "user-456",
    "command": "convert database connection to Prisma",
    "targetTechnology": "Prisma",
    "options": {
      "preserveData": true,
      "generateTypes": true
    }
  }'
```

### JavaScript Examples

#### Using Fetch API
```javascript
const migrationRequest = {
  sessionId: 'session-123',
  userId: 'user-456',
  command: 'convert React components to TypeScript',
  targetTechnology: 'TypeScript',
  options: {
    generateTypes: true,
    addValidation: true
  }
};

const response = await fetch('http://localhost:3000/api/migrate/migrate', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your-jwt-token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(migrationRequest)
});

const result = await response.json();

if (result.success) {
  console.log('Migration completed:', result.migrationId);
  console.log('Files processed:', result.statistics.filesProcessed);
} else {
  console.error('Migration failed:', result.error);
  console.log('Suggestions:', result.suggestions);
}
```

#### Using Axios
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api/migrate',
  headers: {
    'Authorization': 'Bearer your-jwt-token'
  }
});

try {
  const response = await api.post('/migrate', {
    sessionId: 'session-123',
    userId: 'user-456',
    command: 'convert CSS to Tailwind CSS',
    targetTechnology: 'Tailwind CSS'
  });
  
  console.log('Migration successful:', response.data);
} catch (error) {
  console.error('Migration failed:', error.response.data);
}
```

---

## 🧪 Testing

### Test Script
Run the comprehensive test suite:

```bash
cd project/server
node test-migration-api.js
```

### Test Coverage
The test suite covers:
- ✅ Health checks
- ✅ Template retrieval
- ✅ Command validation
- ✅ Migration processing
- ✅ Status checking
- ✅ History retrieval
- ✅ Retry functionality
- ✅ Error handling
- ✅ Rate limiting
- ✅ Authentication
- ✅ Response format validation

---

## 📈 Performance Considerations

### Response Times
- Health check: < 100ms
- Templates: < 200ms
- Validation: < 500ms
- Migration processing: 5-30 seconds (depending on complexity)

### Rate Limits
- 50 requests per 15 minutes per user
- Burst allowance for critical operations
- Exponential backoff for retries

### Resource Usage
- Memory: Optimized for large codebases
- CPU: Efficient AI processing
- Network: Compressed responses

---

## 🔧 Configuration

### Environment Variables
```env
# Required
GEMINI_API_KEY=your-gemini-api-key
JWT_SECRET=your-jwt-secret

# Optional
API_BASE_URL=http://localhost:3000
NODE_ENV=development
RATE_LIMIT_REQUESTS=50
RATE_LIMIT_WINDOW=900000
```

### Server Configuration
- Port: 3000 (default)
- CORS: Enabled for frontend integration
- Compression: Enabled for response optimization
- Security: Helmet.js for security headers

---

## 📚 Additional Resources

- [AI Migration Agent Service Guide](./AI_MIGRATION_AGENT_GUIDE.md)
- [Setup Guide](./SETUP_GUIDE.md)
- [API Test Suite](./test-migration-api.js)
- [Enhanced Migration Agent Tests](./test-enhanced-migration-agent.js)

---

## 🆘 Support

For API support and questions:
- Check the health endpoint for service status
- Review error messages and suggestions
- Test with the provided test suite
- Contact the development team for assistance

---

**Note**: This API requires a valid Gemini API key and MongoDB connection to function properly. Ensure all dependencies are installed and configured before use.



