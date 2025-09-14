# 🚀 Embedding Generation Setup Guide

This guide will help you set up the code chunk embedding generation system using the Gemini API.

## 📋 Prerequisites

1. **Node.js** (v16 or higher)
2. **Google AI Studio Account** (for API key)
3. **MongoDB** (optional, for persistent storage)

## 🔑 Step 1: Get Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key

## ⚙️ Step 2: Configure Environment

1. **Create `.env` file** in `project/server/` directory:
```env
# Gemini API Configuration
GEMINI_API_KEY=your-actual-api-key-here
GEMINI_EMBEDDING_MODEL=text-embedding-004
GEMINI_EMBEDDING_DIMENSIONS=768
```

2. **Replace `your-actual-api-key-here`** with your actual API key

## 🧪 Step 3: Test the Setup

Run the setup test to verify everything is working:

```bash
cd project/server
node test-gemini-setup.js
```

**Expected output:**
```
🔑 Testing Gemini API Setup

✅ GEMINI_API_KEY found in environment variables
🔑 API Key: AIzaSyBx...xyz1

🚀 Initializing Embedding Service...
✅ Embedding service initialized successfully

⚙️  Service Configuration:
  Model: text-embedding-004
  Dimensions: 768
  API Key configured: Yes

🧪 Testing Embedding Generation...
Testing with: helloWorld
✅ Embedding generation successful!
📊 Dimensions: 768
📝 Text length: 245 characters
🔢 First 5 values: [0.0123, -0.0456, 0.0789, -0.0123, 0.0456, ...]
🏷️  Model used: text-embedding-004

🎉 Gemini API setup is working correctly!
```

## 🧠 Step 4: Test Embedding Generation

### Option A: Mock Tree-sitter (Recommended for Windows)
```bash
node test-embeddings-mock.js
```
This uses Mock Tree-sitter to avoid native compilation issues on Windows.

### Option B: Embedding Service Only
```bash
node test-embeddings-only.js
```
This tests only the embedding functionality without Tree-sitter.

## 🏗️ Step 5: Production Setup

### Install Dependencies
```bash
npm install @google/generative-ai
```

### Start the Server
```bash
npm start
```

### Test API Endpoints
```bash
# Check service status
curl http://localhost:5000/api/embeddings/status

# Generate embeddings (requires authentication)
curl -X POST http://localhost:5000/api/embeddings/session123/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{"batchSize": 5}'
```

## 🔧 Troubleshooting

### Common Issues

#### 1. "GEMINI_API_KEY not found"
- **Solution**: Create `.env` file with your API key
- **Check**: File is in `project/server/.env`

#### 2. "models/text-embedding-004 is not found"
- **Solution**: Use correct model name `text-embedding-004`
- **Check**: Model is available in your region

#### 3. "Tree-sitter binding not found"
- **Solution**: Use Mock Tree-sitter for testing
- **Command**: `node test-embeddings-mock.js`

#### 4. "Rate limit exceeded"
- **Solution**: Increase delays between batches
- **Config**: Set `delayBetweenBatches: 2000`

### API Key Issues

#### Invalid API Key
```
Error: [GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent: [401 Unauthorized]
```
- **Solution**: Verify API key is correct
- **Check**: No extra spaces or characters

#### Quota Exceeded
```
Error: [GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent: [429 Too Many Requests]
```
- **Solution**: Wait or increase quota limits
- **Check**: Google AI Studio quota settings

## 📊 Understanding Embeddings

### What are Embeddings?
Embeddings are numerical vectors that represent the semantic meaning of text. For code chunks:

```javascript
// Input: Code chunk
function calculateSum(a, b) { return a + b; }

// Output: Numerical vector (768 dimensions)
[0.01, -0.023, 0.45, ..., 0.98]
```

### How Similarity Works
```javascript
// Calculate similarity between two chunks
const similarity = calculateSimilarity(embedding1, embedding2);
// Result: 0.8234 (82.34% similar)
```

### Use Cases
- **Code Search**: Find similar functions across codebase
- **Migration Analysis**: Compare patterns between frameworks
- **Quality Assessment**: Analyze complexity patterns
- **Documentation**: Find related code chunks

## 🚀 Next Steps

1. **Set up MongoDB** for persistent storage
2. **Configure authentication** for API endpoints
3. **Implement batch processing** for large codebases
4. **Add similarity search** functionality
5. **Create visualization** tools for embeddings

## 📚 Additional Resources

- [Google AI Studio](https://makersuite.google.com/)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Embedding Models Guide](https://ai.google.dev/docs/embedding_guide)
- [Tree-sitter Documentation](https://tree-sitter.github.io/)

## 🆘 Support

If you encounter issues:

1. **Check the test output** for specific error messages
2. **Verify your API key** is valid and has proper permissions
3. **Test with Mock Tree-sitter** to avoid compilation issues
4. **Check network connectivity** to Google's servers

---

**Note**: This implementation provides a solid foundation for code chunk embedding generation. The numerical vectors can be used for various AI/ML applications including code search, similarity detection, and automated code analysis.

