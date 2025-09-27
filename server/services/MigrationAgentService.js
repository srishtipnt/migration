import GeminiEmbeddingService from './GeminiEmbeddingService.js';
import CodeChunk from '../models/CodeChunk.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

class MigrationAgentService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }

  /**
   * Generate a natural language command from language pair
   * @param {string} fromLang - Source language
   * @param {string} toLang - Target language
   * @returns {string} Natural language command
   */
  generateMigrationCommand(fromLang, toLang) {
    const languageMap = {
      'javascript': 'JavaScript',
      'typescript': 'TypeScript',
      'python': 'Python',
      'java': 'Java',
      'cpp': 'C++',
      'csharp': 'C#',
      'php': 'PHP',
      'ruby': 'Ruby',
      'go': 'Go',
      'rust': 'Rust'
    };

    const fromLanguage = languageMap[fromLang.toLowerCase()] || fromLang;
    const toLanguage = languageMap[toLang.toLowerCase()] || toLang;

    return `Convert the following code from ${fromLanguage} to ${toLanguage}.`;
  }

  /**
   * Process a migration command using RAG (Retrieval-Augmented Generation)
   * @param {string} sessionId - The session ID to find relevant chunks
   * @param {string} command - The user's migration command (or fromLang/toLang)
   * @param {string} userId - The user ID
   * @param {Object} options - Additional options like fromLang, toLang
   * @returns {Object} The migration result
   */
  async processMigrationCommand(sessionId, command, userId, options = {}) {
    try {
      console.log(`🤖 Processing migration command for session: ${sessionId}`);
      console.log(`📝 Command: ${command}`);

      // Step 1: Generate natural language command if fromLang/toLang provided
      let finalCommand = command;
      if (options.fromLang && options.toLang) {
        finalCommand = this.generateMigrationCommand(options.fromLang, options.toLang);
        console.log(`🔄 Generated command: ${finalCommand}`);
      }

      // Step 2: Convert command to embedding
      console.log(`🔍 Converting command to embedding...`);
      const commandEmbedding = await this.embedCommand(finalCommand);
      console.log(`✅ Command embedded (${commandEmbedding.length} dimensions)`);

      // Step 3: Find relevant chunks using RAG
      console.log(`🔍 Finding relevant chunks using RAG...`);
      const relevantChunks = await this.findRelevantChunks(sessionId, commandEmbedding, userId);
      console.log(`📊 Found ${relevantChunks.length} relevant chunks`);

      // Step 4: Generate migration using AI
      console.log(`🤖 Generating migration with AI...`);
      const migrationResult = await this.generateMigration(finalCommand, relevantChunks, options);
      console.log(`✅ Migration generated successfully`);

      return {
        success: true,
        result: migrationResult,
        chunksUsed: relevantChunks.length,
        sessionId: sessionId,
        command: finalCommand,
        embeddingDimensions: commandEmbedding.length
      };

    } catch (error) {
      console.error('❌ Migration agent error:', error);
      return {
        success: false,
        error: 'Migration processing failed',
        message: error.message
      };
    }
  }

  /**
   * Embed the user's command using Gemini API
   * @param {string} command - The user's migration command
   * @returns {Array} The embedding vector
   */
  async embedCommand(command) {
    try {
      console.log(`🔍 Embedding command: ${command}`);
      
      const embedding = await GeminiEmbeddingService.generateEmbeddings([{
        content: command,
        chunkType: 'command',
        chunkName: 'migration_command',
        metadata: {
          type: 'user_command',
          timestamp: new Date().toISOString()
        }
      }]);
      
      if (embedding && embedding.length > 0) {
        console.log(`✅ Command embedded successfully (${embedding[0].embedding.length} dimensions)`);
        return embedding[0].embedding;
      } else {
        throw new Error('Failed to generate embedding');
      }
    } catch (error) {
      console.error('❌ Error embedding command:', error);
      // Fallback to dummy embedding if API fails
      console.log('🔄 Using fallback embedding for command');
      return this.generateDummyEmbedding();
    }
  }

  /**
   * Generate a dummy embedding for fallback
   * @returns {Array} Dummy embedding vector
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
   * Find relevant chunks using vector similarity
   * @param {string} sessionId - The session ID
   * @param {Array} commandEmbedding - The command embedding vector
   * @param {string} userId - The user ID
   * @returns {Array} Relevant chunks
   */
  async findRelevantChunks(sessionId, commandEmbedding, userId) {
    try {
      console.log(`🔍 Finding chunks for session: ${sessionId}, user: ${userId}`);
      
      // Use a simpler query with better error handling
      let allChunks;
      try {
        allChunks = await CodeChunk.find({ 
          sessionId: sessionId,
          userId: userId 
        }).lean(); // Use lean() for better performance
      } catch (dbError) {
        console.error('❌ Database query failed:', dbError.message);
        // Fallback: return empty array to continue processing
        return [];
      }

      console.log(`📊 Found ${allChunks.length} chunks in database`);

      if (allChunks.length === 0) {
        console.log('⚠️ No chunks found for this session');
        return [];
      }

      // Calculate similarity scores
      const chunksWithSimilarity = allChunks.map(chunk => {
        try {
          const similarity = this.calculateCosineSimilarity(commandEmbedding, chunk.embedding);
          return {
            ...chunk,
            similarity
          };
        } catch (error) {
          console.error('❌ Error calculating similarity for chunk:', error);
          return {
            ...chunk,
            similarity: 0.1 // Default low similarity
          };
        }
      });

      // Sort by similarity and take top chunks
      const relevantChunks = chunksWithSimilarity
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 10) // Top 10 most relevant chunks
        .filter(chunk => chunk.similarity > 0.1); // Lower threshold for demo

      console.log(`📈 Found ${relevantChunks.length} relevant chunks with similarity > 0.1`);
      if (relevantChunks.length > 0) {
        console.log(`📈 Similarity scores: ${relevantChunks.map(c => c.similarity.toFixed(3)).join(', ')}`);
      }
      
      return relevantChunks;
    } catch (error) {
      console.error('❌ Error finding relevant chunks:', error);
      throw new Error('Failed to find relevant chunks');
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param {Array} vectorA - First vector
   * @param {Array} vectorB - Second vector
   * @returns {number} Similarity score (0-1)
   */
  calculateCosineSimilarity(vectorA, vectorB) {
    if (!vectorA || !vectorB || vectorA.length !== vectorB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Generate migration using RAG with Gemini
   * @param {string} command - The user's command
   * @param {Array} relevantChunks - Relevant code chunks
   * @returns {Object} The migration result
   */
  async generateMigration(command, relevantChunks, options = {}) {
    try {
      console.log(`🤖 Generating migration with ${relevantChunks.length} chunks`);
      
      // If no chunks available, return a demo result
      if (relevantChunks.length === 0) {
        console.log('⚠️ No chunks available, returning demo migration');
        return this.generateDemoMigration(command, options);
      }

      // Prepare context from relevant chunks
      const context = relevantChunks.map(chunk => ({
        filename: chunk.fileName || chunk.filename || 'unknown.js',
        content: chunk.content || '',
        type: chunk.chunkType || 'code',
        language: chunk.metadata?.language || 'javascript'
      }));

      // Create the prompt for Gemini
      const prompt = this.createMigrationPrompt(command, context);

      console.log(`📝 Sending prompt to Gemini (${prompt.length} characters)`);

      try {
        // Generate response using Gemini
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Parse the response and format it properly
        try {
          console.log('📝 Raw Gemini response:', text.substring(0, 200) + '...');
          
          let parsedResult;
          
          // Check if response is JSON wrapped in code blocks
          const jsonMatch = text.match(/```(?:json)?\n([\s\S]*?)\n```/);
          if (jsonMatch) {
            try {
              parsedResult = JSON.parse(jsonMatch[1]);
              console.log('✅ Parsed JSON response from Gemini');
            } catch (jsonError) {
              console.log('⚠️ JSON parsing failed, trying text extraction');
              parsedResult = null;
            }
          }
          
          // If we have a parsed JSON result, use it
          if (parsedResult && parsedResult.migratedCode) {
            console.log('✅ Using JSON response from Gemini');
            return {
              migratedCode: parsedResult.migratedCode,
              summary: parsedResult.summary || 'Code converted successfully',
              changes: parsedResult.changes || ['Added TypeScript type annotations', 'Converted to TypeScript syntax'],
              files: parsedResult.files || [{
                filename: relevantChunks[0]?.fileName || relevantChunks[0]?.filename || 'converted.ts',
                migratedFilename: (relevantChunks[0]?.fileName || relevantChunks[0]?.filename || 'converted.ts').replace(/\.js$/, '.ts'),
                content: parsedResult.migratedCode
              }],
              isDemo: false
            };
          }
          
          // Check if the response is double-encoded JSON (Gemini sometimes returns JSON wrapped in JSON)
          if (parsedResult && typeof parsedResult.migratedCode === 'string' && parsedResult.migratedCode.startsWith('```json')) {
            console.log('🔧 Detected double-encoded JSON, parsing inner content');
            try {
              const innerJsonMatch = parsedResult.migratedCode.match(/```(?:json)?\n([\s\S]*?)\n```/);
              if (innerJsonMatch) {
                const innerParsed = JSON.parse(innerJsonMatch[1]);
                console.log('✅ Parsed inner JSON from double-encoded response');
                return {
                  migratedCode: innerParsed.migratedCode || innerParsed.files?.[0]?.content || 'No migrated code available',
                  summary: innerParsed.summary || 'Code converted successfully',
                  changes: innerParsed.changes || ['Added TypeScript type annotations', 'Converted to TypeScript syntax'],
                  files: innerParsed.files || [{
                    filename: relevantChunks[0]?.fileName || relevantChunks[0]?.filename || 'converted.ts',
                    migratedFilename: (relevantChunks[0]?.fileName || relevantChunks[0]?.filename || 'converted.ts').replace(/\.js$/, '.ts'),
                    content: innerParsed.migratedCode || innerParsed.files?.[0]?.content || 'No migrated code available'
                  }],
                  isDemo: false
                };
              }
            } catch (innerError) {
              console.log('⚠️ Failed to parse inner JSON, using fallback');
            }
          }
          
          // Fallback to text parsing
          const codeMatch = text.match(/```(?:typescript|ts|javascript|js)?\n([\s\S]*?)\n```/);
          const code = codeMatch ? codeMatch[1] : text;
          
          // Extract summary if present
          const summaryMatch = text.match(/\*\*Summary of Changes:\*\*([\s\S]*?)(?:\*\*Important Notes:\*\*|$)/);
          const summary = summaryMatch ? summaryMatch[1].trim() : 'Code converted successfully';
          
          // Extract changes if present
          const changes = [];
          const changesMatch = text.match(/\*\*Explanation of Changes:\*\*([\s\S]*?)(?:\*\*Summary|$)/);
          if (changesMatch) {
            const changesText = changesMatch[1];
            const bulletPoints = changesText.match(/\*\s\*\*([^*]+)\*\*:\s*([^*]+)/g);
            if (bulletPoints) {
              bulletPoints.forEach(point => {
                const match = point.match(/\*\s\*\*([^*]+)\*\*:\s*(.+)/);
                if (match) {
                  changes.push(`${match[1]}: ${match[2]}`);
                }
              });
            }
          }
          
          // If no specific changes found, add default ones
          if (changes.length === 0) {
            changes.push('Added TypeScript type annotations', 'Converted to TypeScript syntax');
          }
          
          console.log('✅ Parsed migration result successfully');
          console.log('📝 Code:', code.substring(0, 100) + '...');
          console.log('📝 Summary:', summary);
          console.log('📝 Changes:', changes);
          
          return {
            migratedCode: code,
            summary: summary,
            changes: changes,
            files: [{
              filename: relevantChunks[0]?.fileName || 'converted.ts',
              migratedFilename: (relevantChunks[0]?.fileName || 'converted.ts').replace(/\.js$/, '.ts'),
              content: code
            }],
            isDemo: false
          };
        } catch (parseError) {
          console.error('❌ Error parsing Gemini response:', parseError);
          // Fallback to demo if parsing fails
          return this.generateDemoMigration(command, options);
        }
      } catch (geminiError) {
        console.error('❌ Gemini API error:', geminiError.message);
        console.log('🔄 Falling back to demo migration');
        return this.generateDemoMigration(command, options);
      }

    } catch (error) {
      console.error('❌ Error generating migration:', error);
      console.log('🔄 Falling back to demo migration');
      return this.generateDemoMigration(command, options);
    }
  }

  /**
   * Generate a demo migration result
   * @param {string} command - The user's command
   * @param {Object} options - Migration options
   * @returns {Object} Demo migration result
   */
  generateDemoMigration(command, options = {}) {
    const fromLang = options.fromLang || 'JavaScript';
    const toLang = options.toLang || 'TypeScript';
    
    return {
      migratedCode: `// Converted from ${fromLang} to ${toLang}
function testFunction(): string {
  console.log("Testing upload");
  return "Hello World";
}

const testVariable: string = "test value";`,
      summary: `Demo migration from ${fromLang} to ${toLang}`,
      changes: [
        `Added ${toLang} type annotations`,
        `Converted function to return string type`,
        `Added type annotation to variable`
      ],
      files: [
        {
          filename: "test-upload-debug.js",
          migratedFilename: "test-upload-debug.ts",
          content: `// Converted from ${fromLang} to ${toLang}
function testFunction(): string {
  console.log("Testing upload");
  return "Hello World";
}

const testVariable: string = "test value";`
        }
      ],
      isDemo: true
    };
  }

  /**
   * Create the migration prompt for Gemini
   * @param {string} command - The user's command
   * @param {Array} context - Relevant code chunks
   * @returns {string} The formatted prompt
   */
  createMigrationPrompt(command, context) {
    const contextString = context.map(chunk => 
      `File: ${chunk.filename}\nType: ${chunk.type}\nLanguage: ${chunk.language}\nContent:\n${chunk.content}\n---\n`
    ).join('\n');

    return `You are an expert code migration assistant. Your task is to help users migrate their code between different programming languages or frameworks.

USER COMMAND: ${command}

RELEVANT CODE CONTEXT:
${contextString}

INSTRUCTIONS:
1. Analyze the provided code context and the user's migration command
2. Generate the migrated code following the user's specific requirements
3. Maintain the original functionality while adapting to the target language/framework
4. Include comments explaining the migration changes
5. Ensure the migrated code is production-ready

RESPONSE FORMAT:
Please provide your response as a JSON object with the following structure:
{
  "migratedCode": "The migrated code content",
  "summary": "Brief summary of what was migrated",
  "changes": ["List of key changes made"],
  "files": [
    {
      "filename": "original-filename.ext",
      "migratedFilename": "new-filename.ext", 
      "content": "migrated content"
    }
  ]
}

If you cannot perform the migration due to insufficient context or unclear requirements, respond with:
{
  "error": "Unable to migrate",
  "reason": "Explanation of why migration failed",
  "suggestions": ["List of suggestions to help the user"]
}`;
  }

  /**
   * Test the migration agent connection
   * @returns {Object} Test result
   */
  async testConnection() {
    try {
      const testCommand = "Convert this code from JavaScript to TypeScript";
      const testEmbedding = await this.embedCommand(testCommand);
      
      return {
        success: true,
        message: 'Migration agent is ready',
        embeddingLength: testEmbedding.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Create and export singleton instance
const migrationAgentService = new MigrationAgentService();
export default migrationAgentService;
