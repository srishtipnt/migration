import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';

/**
 * Simple Tree-sitter service for testing code breaking functionality
 */
class SimpleTreeSitterService {
  constructor() {
    this.parser = new Parser();
    this.parser.setLanguage(JavaScript);
    this.supportedExtensions = ['.js', '.jsx'];
    console.log('Simple Tree-sitter service initialized');
  }

  isFileSupported(filePath) {
    const extension = path.extname(filePath).toLowerCase();
    return this.supportedExtensions.includes(extension);
  }

  getSupportedExtensions() {
    return this.supportedExtensions;
  }

  getSupportedLanguages() {
    return ['javascript'];
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
      const tree = this.parser.parse(content);
      const chunks = this.extractChunks(tree.rootNode, content, filePath);
      
      return {
        success: true,
        chunks,
        metadata: {
          filePath,
          language: 'javascript',
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

  extractChunks(node, sourceCode, filePath, chunks = []) {
    if (!node) return chunks;

    const chunkTypes = [
      'function_declaration',
      'method_definition',
      'class_declaration',
      'variable_declaration',
      'import_statement',
      'export_statement',
      'arrow_function'
    ];

    if (chunkTypes.includes(node.type)) {
      const chunk = this.createChunk(node, sourceCode, filePath);
      if (chunk) {
        chunks.push(chunk);
      }
    }

    for (const child of node.children) {
      this.extractChunks(child, sourceCode, filePath, chunks);
    }

    return chunks;
  }

  createChunk(node, sourceCode, filePath) {
    try {
      const startPosition = node.startPosition;
      const endPosition = node.endPosition;
      const codeText = sourceCode.slice(node.startIndex, node.endIndex);
      
      if (codeText.trim().length < 10) {
        return null;
      }

      const chunkType = this.getChunkType(node);
      const name = this.extractName(node) || this.generateChunkName(node, chunkType);

      return {
        id: crypto.randomUUID(),
        type: chunkType,
        name: name,
        code: codeText,
        startLine: startPosition.row + 1,
        endLine: endPosition.row + 1,
        startColumn: startPosition.column,
        endColumn: endPosition.column,
        startIndex: node.startIndex,
        endIndex: node.endIndex,
        metadata: {
          filePath,
          complexity: this.calculateComplexity(node),
          parameters: this.extractParameters(node),
          dependencies: this.extractDependencies(node, codeText),
          isAsync: node.descendantsOfType('async').length > 0,
          isStatic: node.descendantsOfType('static').length > 0,
          visibility: 'public'
        }
      };
    } catch (error) {
      console.error('Error creating chunk:', error);
      return null;
    }
  }

  getChunkType(node) {
    const typeMapping = {
      'function_declaration': 'function',
      'method_definition': 'method',
      'class_declaration': 'class',
      'variable_declaration': 'variable',
      'import_statement': 'import',
      'export_statement': 'export',
      'arrow_function': 'arrow-function'
    };
    return typeMapping[node.type] || 'block';
  }

  extractName(node) {
    if (node.type === 'function_declaration' || 
        node.type === 'class_declaration') {
      const nameNode = node.childForFieldName('name');
      if (nameNode) {
        return nameNode.text;
      }
    }
    if (node.type === 'method_definition') {
      const nameNode = node.childForFieldName('name');
      if (nameNode) {
        return nameNode.text;
      }
    }
    return null;
  }

  generateChunkName(node, chunkType) {
    const lineNumber = node.startPosition.row + 1;
    return `${chunkType}-line-${lineNumber}`;
  }

  calculateComplexity(node) {
    let complexity = 1;
    const controlFlowTypes = [
      'if_statement',
      'for_statement',
      'while_statement',
      'switch_statement',
      'try_statement'
    ];
    const controlFlowNodes = node.descendantsOfType(controlFlowTypes);
    complexity += controlFlowNodes.length;
    return Math.min(complexity, 10);
  }

  extractParameters(node) {
    const parameters = [];
    if (node.type === 'function_declaration' || 
        node.type === 'method_definition' ||
        node.type === 'arrow_function') {
      const paramsNode = node.childForFieldName('parameters');
      if (paramsNode) {
        const paramNodes = paramsNode.descendantsOfType('identifier');
        for (const paramNode of paramNodes) {
          parameters.push({
            name: paramNode.text,
            type: 'unknown',
            line: paramNode.startPosition.row + 1
          });
        }
      }
    }
    return parameters;
  }

  extractDependencies(node, codeText) {
    const dependencies = [];
    const importNodes = node.descendantsOfType('import_statement');
    for (const importNode of importNodes) {
      const sourceNode = importNode.childForFieldName('source');
      if (sourceNode) {
        dependencies.push({
          type: 'import',
          source: sourceNode.text.replace(/['"]/g, ''),
          line: importNode.startPosition.row + 1
        });
      }
    }
    return dependencies;
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

export default SimpleTreeSitterService;
