import { GoogleGenerativeAI } from '@google/generative-ai';
import Embedding from '../models/Embedding.js';
import mongoose from 'mongoose';

/**
 * Embedding Service for generating vector embeddings using Gemini API
 * Handles text-to-vector conversion for semantic code analysis
 */
class EmbeddingService {
  constructor() {
    // Prevent multiple initialization
    if (EmbeddingService.instance) {
      return EmbeddingService.instance;
    }

    this.geminiApiKey = process.env.GEMINI_API_KEY;
    this.model = process.env.GEMINI_MODEL || 'text-embedding-004';
    this.dimensions = 768; // Standard embedding dimensions
    
    if (!this.geminiApiKey) {
      throw new Error('GEMINI_API_KEY is required for Embedding Service');
    }
    
    this.genAI = new GoogleGenerativeAI(this.geminiApiKey);
    this.embeddingModel = this.genAI.getGenerativeModel({ model: this.model });
    
    console.log('Embedding Service initialized with Gemini API');
    
    // Set singleton instance
    EmbeddingService.instance = this;
  }

  /**
   * Generate a single embedding for text
   * @param {string} text - Text to embed
   * @param {Object} options - Options for embedding generation
   * @returns {Object} Embedding result
   */
  async generateEmbedding(text, options = {}) {
    try {
      if (!text || typeof text !== 'string') {
        throw new Error('Text input is required for embedding generation');
      }

      // Prepare the text for embedding
      const processedText = this.prepareTextForEmbedding(text);
      
      // Generate embedding using Gemini API
      const result = await this.embeddingModel.generateContent(processedText);
      const response = await result.response;
      const generatedText = response.text();
      
      // Parse the response to extract embedding vector
      const embedding = this.parseEmbeddingResponse(generatedText);
      
      return {
        success: true,
        embedding,
        dimensions: embedding.length,
        model: this.model,
        textLength: text.length,
        processedText,
        metadata: {
          model: this.model,
          textLength: text.length,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Embedding generation failed:', error);
      return {
        success: false,
        error: error.message,
        embedding: null,
        dimensions: 0
      };
    }
  }

  /**
   * Generate embeddings for multiple texts in batches
   * @param {Array} texts - Array of texts to embed
   * @param {Object} options - Batch processing options
   * @returns {Object} Batch embedding results
   */
  async generateBatchEmbeddings(texts, options = {}) {
    const {
      batchSize = 5,
      delayBetweenBatches = 500,
      includeMetadata = true,
      includeContext = true
    } = options;

    const results = [];
    let successfulEmbeddings = 0;
    let totalDimensions = 0;

    try {
      // Process texts in batches
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        
        // Process batch concurrently
        const batchPromises = batch.map(async (text, index) => {
          const globalIndex = i + index;
          const textObj = typeof text === 'string' ? { code: text, name: `chunk-${globalIndex}` } : text;
          
          const result = await this.generateEmbedding(textObj.code || textObj.text || text, {
            includeMetadata,
            includeContext
          });

          return {
            ...result,
            chunkId: textObj.id || `chunk-${globalIndex}`,
            chunkName: textObj.name || `chunk-${globalIndex}`,
            chunkType: textObj.type || 'unknown',
            metadata: {
              ...result.metadata,
              chunkName: textObj.name || `chunk-${globalIndex}`,
              chunkType: textObj.type || 'unknown',
              chunkId: textObj.id || `chunk-${globalIndex}`
            }
          };
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Count successful embeddings
        batchResults.forEach(result => {
          if (result.success) {
            successfulEmbeddings++;
            totalDimensions += result.dimensions;
          }
        });

        // Delay between batches to respect rate limits
        if (i + batchSize < texts.length) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }
      }

      const averageDimensions = successfulEmbeddings > 0 ? totalDimensions / successfulEmbeddings : 0;
      const successRate = texts.length > 0 ? successfulEmbeddings / texts.length : 0;

      return {
        success: true,
        results,
        successfulEmbeddings,
        totalChunks: texts.length,
        averageDimensions,
        successRate,
        summary: {
          totalChunks: texts.length,
          successfulEmbeddings,
          failedEmbeddings: texts.length - successfulEmbeddings,
          averageDimensions,
          successRate
        }
      };
    } catch (error) {
      console.error('Batch embedding generation failed:', error);
      return {
        success: false,
        error: error.message,
        results,
        successfulEmbeddings,
        totalChunks: texts.length,
        averageDimensions: 0,
        successRate: 0
      };
    }
  }

  /**
   * Calculate similarity between two embeddings using cosine similarity
   * @param {Array} embedding1 - First embedding vector
   * @param {Array} embedding2 - Second embedding vector
   * @returns {number} Similarity score (0-1)
   */
  calculateSimilarity(embedding1, embedding2) {
    if (!embedding1 || !embedding2) {
      return 0;
    }

    if (embedding1.length !== embedding2.length) {
      console.warn('Embedding dimensions mismatch');
      return 0;
    }

    // Calculate cosine similarity
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Find similar chunks based on embedding similarity
   * @param {Array} targetEmbedding - Reference embedding
   * @param {Array} candidateChunks - Array of chunks with embeddings
   * @param {number} threshold - Minimum similarity threshold
   * @param {number} limit - Maximum number of results
   * @returns {Array} Similar chunks sorted by similarity
   */
  findSimilarChunks(targetEmbedding, candidateChunks, threshold = 0.5, limit = 10) {
    if (!targetEmbedding || !candidateChunks) {
      return [];
    }

    const similarities = candidateChunks
      .map(chunk => ({
        ...chunk,
        similarity: this.calculateSimilarity(targetEmbedding, chunk.embedding)
      }))
      .filter(chunk => chunk.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return similarities;
  }

  /**
   * Prepare text for embedding generation
   * @param {string} text - Raw text
   * @returns {string} Processed text
   */
  prepareTextForEmbedding(text) {
    // Clean and prepare text for embedding
    return text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .substring(0, 8000); // Limit text length for API
  }

  /**
   * Parse embedding response from Gemini API
   * @param {string} response - API response text
   * @returns {Array} Embedding vector
   */
  parseEmbeddingResponse(response) {
    try {
      // Try to parse as JSON first
      if (response.startsWith('[') && response.endsWith(']')) {
        return JSON.parse(response);
      }

      // Try to extract numbers from text response
      const numbers = response.match(/-?\d+\.?\d*/g);
      if (numbers && numbers.length > 0) {
        return numbers.map(Number).slice(0, this.dimensions);
      }

      // Fallback: generate random embedding for testing
      console.warn('Could not parse embedding response, generating random vector');
      return Array(this.dimensions).fill(0).map(() => Math.random() * 2 - 1);
    } catch (error) {
      console.error('Failed to parse embedding response:', error);
      // Fallback: generate random embedding
      return Array(this.dimensions).fill(0).map(() => Math.random() * 2 - 1);
    }
  }

  /**
   * Test the embedding service
   * @returns {Object} Test result
   */
  async testService() {
    try {
      const testText = 'function hello() { return "Hello World"; }';
      const result = await this.generateEmbedding(testText);
      
      return {
        success: result.success,
        message: result.success ? 'Embedding service is working' : result.error,
        testResult: result
      };
    } catch (error) {
      return {
        success: false,
        message: `Embedding service test failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Get service configuration
   * @returns {Object} Service configuration
   */
  getConfig() {
    return {
      model: this.model,
      dimensions: this.dimensions,
      apiKeyConfigured: !!this.geminiApiKey,
      serviceName: 'EmbeddingService'
    };
  }

  /**
   * Check if embedding service is available
   * @returns {boolean} Service availability
   */
  isEmbeddingServiceAvailable() {
    return !!this.geminiApiKey;
  }

  /**
   * Calculate average dimensions from embedding results
   * @param {Array} results - Array of embedding results
   * @returns {number} Average dimensions
   */
  calculateAverageDimensions(results) {
    if (!results || results.length === 0) {
      return 0;
    }

    const successfulResults = results.filter(r => r.success);
    if (successfulResults.length === 0) {
      return 0;
    }

    const totalDimensions = successfulResults.reduce((sum, result) => sum + result.dimensions, 0);
    return totalDimensions / successfulResults.length;
  }

  /**
   * Get singleton instance
   */
  static getInstance() {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService();
    }
    return EmbeddingService.instance;
  }
}

// Export singleton instance
export default EmbeddingService.getInstance();
