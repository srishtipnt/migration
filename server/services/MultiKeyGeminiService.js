import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

class MultiKeyGeminiService {
  constructor() {
    this.apiKeys = this.loadApiKeys();
    this.currentKeyIndex = 0;
    this.failedKeys = new Set();
  }

  /**
   * Load multiple API keys from environment
   */
  loadApiKeys() {
    const keys = [];
    
    // Primary key
    if (process.env.GEMINI_API_KEY) {
      keys.push(process.env.GEMINI_API_KEY);
    }
    
    // Additional keys
    if (process.env.GEMINI_API_KEY_2) {
      keys.push(process.env.GEMINI_API_KEY_2);
    }
    if (process.env.GEMINI_API_KEY_3) {
      keys.push(process.env.GEMINI_API_KEY_3);
    }
    if (process.env.GEMINI_API_KEY_4) {
      keys.push(process.env.GEMINI_API_KEY_4);
    }
    if (process.env.GEMINI_API_KEY_5) {
      keys.push(process.env.GEMINI_API_KEY_5);
    }
    
    console.log(`🔑 Loaded ${keys.length} Gemini API keys`);
    return keys;
  }

  /**
   * Get the next available API key
   */
  getNextApiKey() {
    if (this.apiKeys.length === 0) {
      throw new Error('No Gemini API keys configured');
    }

    // Find next available key
    for (let i = 0; i < this.apiKeys.length; i++) {
      const keyIndex = (this.currentKeyIndex + i) % this.apiKeys.length;
      const key = this.apiKeys[keyIndex];
      
      if (!this.failedKeys.has(key)) {
        this.currentKeyIndex = keyIndex;
        return key;
      }
    }

    // All keys failed, reset and try again
    console.warn('⚠️ All API keys have failed, resetting and trying again');
    this.failedKeys.clear();
    this.currentKeyIndex = 0;
    return this.apiKeys[0];
  }

  /**
   * Mark a key as failed
   */
  markKeyAsFailed(key) {
    this.failedKeys.add(key);
    console.log(`❌ Marked API key as failed: ${key.substring(0, 10)}...`);
  }

  /**
   * Get Gemini AI instance with current key
   */
  getGeminiAI() {
    const apiKey = this.getNextApiKey();
    return new GoogleGenerativeAI(apiKey);
  }

  /**
   * Test connection with current key
   */
  async testConnection() {
    try {
      const genAI = this.getGeminiAI();
      const model = genAI.getGenerativeModel({ model: 'embedding-001' });
      const result = await model.embedContent('test');
      
      return {
        success: true,
        model: 'embedding-001',
        embeddingDimensions: result.embedding.values.length,
        message: 'Gemini API connection successful'
      };
    } catch (error) {
      // Mark current key as failed if it's a quota error
      if (error.message.includes('quota') || error.message.includes('Quota') || error.message.includes('429')) {
        const currentKey = this.apiKeys[this.currentKeyIndex];
        this.markKeyAsFailed(currentKey);
        
        // Try next key if available
        if (this.failedKeys.size < this.apiKeys.length) {
          console.log('🔄 Trying next API key...');
          return await this.testConnection();
        }
      }
      
      throw new Error(`Gemini API connection failed: ${error.message}`);
    }
  }

  /**
   * Generate embeddings with automatic key rotation
   */
  async generateEmbeddings(chunks) {
    if (!chunks || chunks.length === 0) {
      return [];
    }

    try {
      const genAI = this.getGeminiAI();
      const model = genAI.getGenerativeModel({ model: 'embedding-001' });
      const chunksWithEmbeddings = [];

      // Process chunks in batches
      const batchSize = 5; // Smaller batches to avoid rate limits
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (chunk) => {
          try {
            const embeddingContent = this.createEmbeddingContent(chunk);
            const result = await model.embedContent(embeddingContent);
            const embedding = result.embedding.values;
            
            return {
              ...chunk,
              embedding: embedding,
              metadata: {
                ...chunk.metadata,
                embeddingModel: 'embedding-001',
                embeddingGeneratedAt: new Date().toISOString(),
                apiKeyUsed: this.apiKeys[this.currentKeyIndex].substring(0, 10) + '...'
              }
            };
          } catch (error) {
            if (error.message.includes('quota') || error.message.includes('Quota') || error.message.includes('429')) {
              // Mark current key as failed and try next
              const currentKey = this.apiKeys[this.currentKeyIndex];
              this.markKeyAsFailed(currentKey);
              
              if (this.failedKeys.size < this.apiKeys.length) {
                console.log('🔄 Switching to next API key due to quota exceeded');
                return await this.generateEmbeddings([chunk]);
              }
            }
            
            // Return chunk with dummy embedding on failure
            return this.createChunkWithDummyEmbedding(chunk);
          }
        });

        const batchResults = await Promise.all(batchPromises);
        chunksWithEmbeddings.push(...batchResults);
        
        // Small delay between batches
        if (i + batchSize < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      console.log(`✅ Generated embeddings for ${chunksWithEmbeddings.length} chunks using key ${this.currentKeyIndex + 1}/${this.apiKeys.length}`);
      return chunksWithEmbeddings;

    } catch (error) {
      console.error('❌ Error generating embeddings:', error);
      return this.generateDummyEmbeddings(chunks);
    }
  }

  /**
   * Create rich content for embedding generation
   */
  createEmbeddingContent(chunk) {
    const { chunkType, chunkName, content, metadata } = chunk;
    
    let description = `Code ${chunkType}: ${chunkName}\n\n`;
    
    switch (chunkType) {
      case 'function':
        description += `This is a function named ${chunkName}. `;
        break;
      case 'class':
        description += `This is a class named ${chunkName}. `;
        break;
      case 'interface':
        description += `This is an interface named ${chunkName}. `;
        break;
      case 'variable':
        description += `This is a variable named ${chunkName}. `;
        break;
      case 'import':
        description += `This is an import statement. `;
        break;
      case 'export':
        description += `This is an export statement. `;
        break;
      default:
        description += `This is a code ${chunkType}. `;
    }
    
    description += `Content: ${content}`;
    
    if (metadata && metadata.dependencies && metadata.dependencies.length > 0) {
      description += `\nDependencies: ${metadata.dependencies.join(', ')}`;
    }
    
    return description;
  }

  /**
   * Generate dummy embeddings as fallback
   */
  generateDummyEmbeddings(chunks) {
    console.log('🔧 Generating dummy embeddings for testing');
    
    return chunks.map(chunk => ({
      ...chunk,
      embedding: this.generateDummyEmbedding(),
      metadata: {
        ...chunk.metadata,
        embeddingModel: 'dummy',
        embeddingGeneratedAt: new Date().toISOString(),
        isDummy: true
      }
    }));
  }

  /**
   * Create a chunk with dummy embedding
   */
  createChunkWithDummyEmbedding(chunk) {
    return {
      ...chunk,
      embedding: this.generateDummyEmbedding(),
      metadata: {
        ...chunk.metadata,
        embeddingModel: 'dummy-fallback',
        embeddingGeneratedAt: new Date().toISOString(),
        isDummy: true
      }
    };
  }

  /**
   * Generate a dummy embedding vector (768 dimensions)
   */
  generateDummyEmbedding() {
    const dimensions = 768;
    const embedding = [];
    
    for (let i = 0; i < dimensions; i++) {
      embedding.push(Math.random());
    }
    
    return embedding;
  }

  /**
   * Get status of all API keys
   */
  getKeyStatus() {
    return {
      totalKeys: this.apiKeys.length,
      failedKeys: this.failedKeys.size,
      currentKeyIndex: this.currentKeyIndex,
      availableKeys: this.apiKeys.length - this.failedKeys.size
    };
  }
}

// Create and export singleton instance
const multiKeyGeminiService = new MultiKeyGeminiService();
export default multiKeyGeminiService;


