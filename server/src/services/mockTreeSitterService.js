import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';

/**
 * Mock Tree-sitter service for demonstrating code breaking functionality
 * This simulates what Tree-sitter would do without the actual parsing
 */
class MockTreeSitterService {
  constructor() {
    this.supportedExtensions = ['.js', '.jsx', '.ts', '.tsx'];
    console.log('Mock Tree-sitter service initialized (simulating Tree-sitter functionality)');
  }

  isFileSupported(filePath) {
    const extension = path.extname(filePath).toLowerCase();
    return this.supportedExtensions.includes(extension);
  }

  getSupportedExtensions() {
    return this.supportedExtensions;
  }

  getSupportedLanguages() {
    return ['javascript', 'typescript'];
  }

  async parseFile(filePath, content) {
    if (!this.isFileSupported(filePath)) {
      return {
        success: false,
        error: 'Unsupported file type',
        chunks: []
      };
    }

    try {
      // Simulate Tree-sitter parsing by using regex patterns
      const chunks = this.simulateParsing(content, filePath);
      
      return {
        success: true,
        chunks,
        metadata: {
          filePath,
          language: this.getLanguageFromExtension(filePath),
          totalChunks: chunks.length,
          parsedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error(`Error parsing file ${filePath}:`, error);
      return {
        success: false,
        error: error.message,
        chunks: []
      };
    }
  }

  simulateParsing(content, filePath) {
    const chunks = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      
      // Function declarations (including async)
      const functionMatch = line.match(/(?:async\s+)?function\s+(\w+)\s*\(/);
      if (functionMatch) {
        chunks.push(this.createMockChunk('function', functionMatch[1], lineNumber, line, filePath));
      }
      
      // Class declarations
      const classMatch = line.match(/class\s+(\w+)/);
      if (classMatch) {
        chunks.push(this.createMockChunk('class', classMatch[1], lineNumber, line, filePath));
      }
      
      // Method definitions (including async and static)
      const methodMatch = line.match(/(?:async\s+|static\s+)*(\w+)\s*\([^)]*\)\s*{/);
      if (methodMatch && !functionMatch && !line.includes('if') && !line.includes('for') && !line.includes('while')) {
        chunks.push(this.createMockChunk('method', methodMatch[1], lineNumber, line, filePath));
      }
      
      // Arrow functions
      const arrowMatch = line.match(/(\w+)\s*=\s*\([^)]*\)\s*=>/);
      if (arrowMatch) {
        chunks.push(this.createMockChunk('arrow-function', arrowMatch[1], lineNumber, line, filePath));
      }
      
      // Import statements
      if (line.trim().startsWith('import ')) {
        chunks.push(this.createMockChunk('import', 'import', lineNumber, line, filePath));
      }
      
      // Export statements
      if (line.trim().startsWith('export ')) {
        chunks.push(this.createMockChunk('export', 'export', lineNumber, line, filePath));
      }
      
      // Variable declarations
      const varMatch = line.match(/(?:const|let|var)\s+(\w+)/);
      if (varMatch) {
        chunks.push(this.createMockChunk('variable', varMatch[1], lineNumber, line, filePath));
      }
    }
    
    return chunks;
  }

  createMockChunk(type, name, lineNumber, code, filePath) {
    return {
      id: crypto.randomUUID(),
      type: type,
      name: name,
      code: code.trim(),
      startLine: lineNumber,
      endLine: lineNumber,
      startColumn: 0,
      endColumn: code.length,
      startIndex: 0,
      endIndex: code.length,
      metadata: {
        filePath,
        complexity: this.calculateMockComplexity(code),
        parameters: this.extractMockParameters(code),
        dependencies: this.extractMockDependencies(code),
        isAsync: this.isAsync(code),
        isStatic: this.isStatic(code),
        visibility: 'public'
      }
    };
  }

  calculateMockComplexity(code) {
    let complexity = 1;
    
    // Count control flow statements
    if (code.includes('if')) complexity++;
    if (code.includes('for')) complexity++;
    if (code.includes('while')) complexity++;
    if (code.includes('switch')) complexity++;
    if (code.includes('try')) complexity++;
    if (code.includes('catch')) complexity++;
    
    // Count logical operators
    const logicalOps = (code.match(/&&|\|\||!/g) || []).length;
    complexity += logicalOps;
    
    // Count nested structures
    const nestedLevels = (code.match(/\{/g) || []).length;
    complexity += Math.min(nestedLevels, 3);
    
    return Math.min(complexity, 10);
  }

  extractMockParameters(code) {
    const params = [];
    
    // Function parameters
    const functionMatch = code.match(/function\s+\w+\s*\(([^)]*)\)/);
    if (functionMatch) {
      const paramList = functionMatch[1].split(',').map(p => p.trim());
      paramList.forEach(param => {
        if (param && param !== '') {
          params.push({
            name: param.split('=')[0].trim(),
            type: 'unknown',
            line: 1
          });
        }
      });
    }
    
    // Arrow function parameters
    const arrowMatch = code.match(/\(([^)]*)\)\s*=>/);
    if (arrowMatch) {
      const paramList = arrowMatch[1].split(',').map(p => p.trim());
      paramList.forEach(param => {
        if (param && param !== '') {
          params.push({
            name: param.split('=')[0].trim(),
            type: 'unknown',
            line: 1
          });
        }
      });
    }
    
    return params;
  }

  extractMockDependencies(code) {
    const dependencies = [];
    if (code.includes('import')) {
      const importMatch = code.match(/import.*from\s+['"]([^'"]+)['"]/);
      if (importMatch) {
        dependencies.push({
          type: 'import',
          source: importMatch[1],
          line: 1
        });
      }
    }
    return dependencies;
  }

  getLanguageFromExtension(filePath) {
    const extension = path.extname(filePath).toLowerCase();
    if (['.ts', '.tsx'].includes(extension)) {
      return 'typescript';
    }
    return 'javascript';
  }

  /**
   * Better async detection
   */
  isAsync(code) {
    return code.includes('async') || code.includes('await');
  }

  /**
   * Better static detection
   */
  isStatic(code) {
    return code.includes('static');
  }

  getChunkStatistics(files) {
    const stats = {
      byType: {},
      byLanguage: {},
      totalChunks: 0,
      averageComplexity: 0,
      totalFiles: files.length,
      successfulFiles: 0
    };

    let totalComplexity = 0;

    for (const file of files) {
      if (file.success) {
        stats.successfulFiles++;
        const language = file.metadata?.language || 'unknown';
        stats.byLanguage[language] = (stats.byLanguage[language] || 0) + 1;

        for (const chunk of file.chunks) {
          stats.totalChunks++;
          stats.byType[chunk.type] = (stats.byType[chunk.type] || 0) + 1;
          totalComplexity += chunk.metadata.complexity || 0;
        }
      }
    }

    stats.averageComplexity = stats.totalChunks > 0 ? 
      totalComplexity / stats.totalChunks : 0;

    return stats;
  }
}

export default MockTreeSitterService;
