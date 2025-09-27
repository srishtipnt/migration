import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

class GeminiEmbeddingService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.genAI = this.apiKey ? new GoogleGenerativeAI(this.apiKey) : null;
  }

  /**
   * Test connection to Gemini API
   */
  static async testConnection() {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY not found in environment variables');
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      
      // Try to get available models to test connection
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      const data = await response.json();
      
      if (response.ok) {
        return {
          success: true,
          message: 'Gemini API connection successful',
          availableModels: data.models?.length || 0
        };
      } else {
        throw new Error(`API Error: ${data.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to connect to Gemini API'
      };
    }
  }

  /**
   * Generate embeddings for code chunks
   */
  async generateEmbeddings(chunks) {
    if (!this.genAI) {
      throw new Error('Gemini API not initialized');
    }

    try {
      // For now, return chunks with mock embeddings
      // This will be implemented properly once quota issues are resolved
      return chunks.map(chunk => ({
        ...chunk,
        embedding: new Array(768).fill(0).map(() => Math.random()),
        metadata: {
          ...chunk.metadata,
          embeddingModel: 'gemini-embedding-001',
          complexity: Math.floor(Math.random() * 10) + 1,
          dependencies: [],
          exports: []
        }
      }));
    } catch (error) {
      console.error('Error generating embeddings:', error);
      throw error;
    }
  }

  /**
   * Static method to generate embeddings for code chunks
   */
  static async generateEmbeddings(chunks) {
    const service = new GeminiEmbeddingService();
    return await service.generateEmbeddings(chunks);
  }
}

export default GeminiEmbeddingService;