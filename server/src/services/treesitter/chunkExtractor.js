import crypto from 'crypto';

/**
 * Chunk type definitions and configurations
 */
const CHUNK_TYPES = {
  // Function-related chunks
  'function_declaration': 'function',
  'method_definition': 'method',
  'arrow_function': 'arrow-function',
  'generator_function': 'generator',
  'async_function': 'async-function',
  
  // Class-related chunks
  'class_declaration': 'class',
  'interface_declaration': 'interface',
  'type_alias_declaration': 'type',
  'enum_declaration': 'enum',
  
  // Variable and declaration chunks
  'variable_declaration': 'variable',
  'import_statement': 'import',
  'export_statement': 'export',
  
  // Control flow chunks
  'try_statement': 'try-catch',
  'if_statement': 'conditional',
  'for_statement': 'loop',
  'while_statement': 'loop',
  'switch_statement': 'switch',
  
  // Default fallback
  'default': 'block'
};

/**
 * Chunk extraction utilities
 */
class ChunkExtractor {
  constructor() {
    this.chunkTypes = Object.keys(CHUNK_TYPES);
  }

  /**
   * Extract all semantic chunks from an AST node
   */
  extractChunks(node, sourceCode, filePath, chunks = []) {
    if (!node) return chunks;

    // Check if current node is a chunk we want to extract
    if (this.chunkTypes.includes(node.type)) {
      const chunk = this.createChunk(node, sourceCode, filePath);
      if (chunk) {
        chunks.push(chunk);
      }
    }

    // Recursively process child nodes
    for (const child of node.children) {
      this.extractChunks(child, sourceCode, filePath, chunks);
    }

    return chunks;
  }

  /**
   * Create a semantic chunk from a Tree-sitter node
   */
  createChunk(node, sourceCode, filePath) {
    try {
      const startPosition = node.startPosition;
      const endPosition = node.endPosition;
      
      // Extract the actual code text
      const codeText = sourceCode.slice(node.startIndex, node.endIndex);
      
      // Skip empty or very small chunks
      if (codeText.trim().length < 10) {
        return null;
      }

      // Determine chunk type and extract metadata
      const chunkType = this.getChunkType(node);
      const metadata = this.extractBasicMetadata(node, codeText);

      return {
        id: crypto.randomUUID(),
        type: chunkType,
        name: metadata.name || this.generateChunkName(node, chunkType),
        code: codeText,
        startLine: startPosition.row + 1, // Tree-sitter uses 0-based indexing
        endLine: endPosition.row + 1,
        startColumn: startPosition.column,
        endColumn: endPosition.column,
        startIndex: node.startIndex,
        endIndex: node.endIndex,
        metadata: {
          ...metadata,
          filePath,
          complexity: this.calculateComplexity(node),
          dependencies: this.extractDependencies(node, codeText),
          parameters: this.extractParameters(node),
          returnType: this.extractReturnType(node),
          visibility: this.extractVisibility(node),
          isAsync: this.isAsync(node),
          isGenerator: this.isGenerator(node),
          isStatic: this.isStatic(node)
        }
      };
    } catch (error) {
      console.error('Error creating chunk:', error);
      return null;
    }
  }

  /**
   * Get the semantic type of a chunk
   */
  getChunkType(node) {
    return CHUNK_TYPES[node.type] || CHUNK_TYPES.default;
  }

  /**
   * Extract basic metadata from a chunk node
   */
  extractBasicMetadata(node, codeText) {
    const metadata = {};

    // Extract name for named constructs
    if (this.isNamedConstruct(node)) {
      const nameNode = node.childForFieldName('name');
      if (nameNode) {
        metadata.name = nameNode.text;
      }
    }

    // Extract method name
    if (node.type === 'method_definition') {
      const nameNode = node.childForFieldName('name');
      if (nameNode) {
        metadata.name = nameNode.text;
      }
    }

    // Extract variable names
    if (node.type === 'variable_declaration') {
      const declarators = node.descendantsOfType('variable_declarator');
      if (declarators.length > 0) {
        const nameNode = declarators[0].childForFieldName('name');
        if (nameNode) {
          metadata.name = nameNode.text;
        }
      }
    }

    // Extract comments
    const comments = this.extractComments(codeText);
    if (comments.length > 0) {
      metadata.comments = comments;
    }

    return metadata;
  }

  /**
   * Check if node is a named construct
   */
  isNamedConstruct(node) {
    const namedTypes = [
      'function_declaration',
      'class_declaration',
      'interface_declaration',
      'enum_declaration'
    ];
    return namedTypes.includes(node.type);
  }

  /**
   * Extract comments from code
   */
  extractComments(codeText) {
    const comments = [];
    const commentRegex = /(\/\*[\s\S]*?\*\/|\/\/.*$)/gm;
    let match;

    while ((match = commentRegex.exec(codeText)) !== null) {
      comments.push({
        text: match[1].trim(),
        type: match[1].startsWith('/*') ? 'block' : 'line'
      });
    }

    return comments;
  }

  /**
   * Generate a name for unnamed chunks
   */
  generateChunkName(node, chunkType) {
    const lineNumber = node.startPosition.row + 1;
    return `${chunkType}-line-${lineNumber}`;
  }

  /**
   * Calculate complexity score for a chunk
   */
  calculateComplexity(node) {
    let complexity = 1; // Base complexity

    // Count control flow statements
    const controlFlowTypes = [
      'if_statement',
      'for_statement',
      'while_statement',
      'switch_statement',
      'try_statement',
      'catch_clause',
      'conditional_expression'
    ];

    const controlFlowNodes = node.descendantsOfType(controlFlowTypes);
    complexity += controlFlowNodes.length;

    // Count logical operators
    const logicalOperators = node.descendantsOfType(['&&', '||', '!']);
    complexity += logicalOperators.length;

    return Math.min(complexity, 10); // Cap at 10
  }

  /**
   * Extract dependencies (imports, requires, etc.)
   */
  extractDependencies(node, codeText) {
    const dependencies = [];
    
    // Extract import statements
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

    // Extract require statements (for CommonJS)
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    let match;
    while ((match = requireRegex.exec(codeText)) !== null) {
      dependencies.push({
        type: 'require',
        source: match[1],
        line: codeText.substring(0, match.index).split('\n').length
      });
    }

    return dependencies;
  }

  /**
   * Extract function parameters
   */
  extractParameters(node) {
    const parameters = [];
    
    if (this.isFunctionNode(node)) {
      const paramsNode = node.childForFieldName('parameters');
      if (paramsNode) {
        const paramNodes = paramsNode.descendantsOfType('identifier');
        for (const paramNode of paramNodes) {
          parameters.push({
            name: paramNode.text,
            type: 'unknown', // Would need type analysis for full type info
            line: paramNode.startPosition.row + 1
          });
        }
      }
    }

    return parameters;
  }

  /**
   * Check if node is a function
   */
  isFunctionNode(node) {
    const functionTypes = [
      'function_declaration',
      'method_definition',
      'arrow_function'
    ];
    return functionTypes.includes(node.type);
  }

  /**
   * Extract return type information
   */
  extractReturnType(node) {
    if (this.isFunctionNode(node)) {
      const returnTypeNode = node.childForFieldName('return_type');
      if (returnTypeNode) {
        return returnTypeNode.text;
      }
    }
    return null;
  }

  /**
   * Extract visibility modifiers
   */
  extractVisibility(node) {
    const modifiers = node.descendantsOfType('accessibility_modifier');
    if (modifiers.length > 0) {
      return modifiers[0].text;
    }
    return 'public'; // Default
  }

  /**
   * Check if node is async
   */
  isAsync(node) {
    return node.descendantsOfType('async').length > 0;
  }

  /**
   * Check if node is a generator
   */
  isGenerator(node) {
    return node.descendantsOfType('generator').length > 0;
  }

  /**
   * Check if node is static
   */
  isStatic(node) {
    return node.descendantsOfType('static').length > 0;
  }
}

export default ChunkExtractor;
