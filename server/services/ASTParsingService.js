import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
import TypeScript from 'tree-sitter-typescript';
import Python from 'tree-sitter-python';
import Java from 'tree-sitter-java';
import fs from 'fs-extra';
import path from 'path';

class ASTParsingService {
  constructor() {
    this.parser = new Parser();
    this.languages = {
      '.js': JavaScript,
      '.jsx': JavaScript,
      '.ts': TypeScript,
      '.tsx': TypeScript,
      '.py': Python,
      '.java': Java
    };
    
    console.log('✅ AST Parsing Service initialized');
  }

  /**
   * Parse a file and extract semantic chunks
   */
  async parseFile(filePath, relativePath, extension) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const fileName = path.basename(filePath);
      
      // Set the appropriate language
      const Language = this.languages[extension];
      if (!Language) {
        console.warn(`⚠️ No AST parser available for ${extension}, falling back to simple parsing`);
        return this.simpleChunking(content, relativePath, fileName, extension);
      }
      
      this.parser.setLanguage(Language);
      const tree = this.parser.parse(content);
      
      // Extract semantic chunks from AST
      const chunks = this.extractChunksFromAST(tree.rootNode, content, relativePath, fileName, extension);

      // If AST produced no chunks (e.g., simple files), fallback to simple chunking
      if (!chunks || chunks.length === 0) {
        console.warn(`⚠️ AST produced 0 chunks for ${fileName}, falling back to simple chunking`);
        return this.simpleChunking(content, relativePath, fileName, extension);
      }
      
      console.log(`🌳 Parsed ${fileName} with AST: ${chunks.length} semantic chunks`);
      return chunks;
      
    } catch (error) {
      console.error(`❌ Error parsing file ${relativePath}:`, error);
      // Fallback to simple parsing
      const content = await fs.readFile(filePath, 'utf-8');
      return this.simpleChunking(content, relativePath, fileName, extension);
    }
  }

  /**
   * Extract semantic chunks from AST nodes
   */
  extractChunksFromAST(node, content, filePath, fileName, extension) {
    const chunks = [];
    const lines = content.split('\n');
    
    // Walk the AST and extract meaningful chunks
    this.walkAST(node, (astNode) => {
      const chunk = this.createChunkFromASTNode(astNode, content, filePath, fileName, extension, lines);
      if (chunk) {
        chunks.push(chunk);
      }
    });
    
    return chunks;
  }

  /**
   * Walk AST nodes recursively
   */
  walkAST(node, callback) {
    callback(node);
    
    for (const child of node.children) {
      this.walkAST(child, callback);
    }
  }

  /**
   * Create a semantic chunk from an AST node
   */
  createChunkFromASTNode(node, content, filePath, fileName, extension, lines) {
    const nodeType = node.type;
    const startPosition = node.startPosition;
    const endPosition = node.endPosition;
    
    // Extract content for this node
    const chunkContent = this.extractNodeContent(node, content);
    if (!chunkContent.trim()) return null;
    
    // Determine chunk type and name based on node type
    const { chunkType, chunkName } = this.classifyNode(node, nodeType, extension);
    
    if (!chunkType || chunkType === 'other') return null;
    
    return {
      filePath,
      fileName,
      fileExtension: extension,
      chunkType,
      chunkName,
      content: chunkContent,
      startLine: startPosition.row + 1, // Convert to 1-based indexing
      endLine: endPosition.row + 1,
      astNodeType: nodeType,
      astStartPosition: startPosition,
      astEndPosition: endPosition
    };
  }

  /**
   * Classify AST node to determine chunk type and name
   */
  classifyNode(node, nodeType, extension) {
    let chunkType = 'other';
    let chunkName = 'unknown';
    
    switch (extension) {
      case '.js':
      case '.jsx':
      case '.ts':
      case '.tsx':
        return this.classifyJavaScriptNode(node, nodeType);
      
      case '.py':
        return this.classifyPythonNode(node, nodeType);
      
      case '.java':
        return this.classifyJavaNode(node, nodeType);
      
      default:
        return { chunkType: 'other', chunkName: 'unknown' };
    }
  }

  /**
   * Classify JavaScript/TypeScript AST nodes
   */
  classifyJavaScriptNode(node, nodeType) {
    let chunkType = 'other';
    let chunkName = 'unknown';
    
    switch (nodeType) {
      case 'function_declaration':
        chunkType = 'function';
        chunkName = this.extractFunctionName(node);
        break;
      
      case 'method_definition':
        chunkType = 'function';
        chunkName = this.extractMethodName(node);
        break;
      
      case 'class_declaration':
        chunkType = 'class';
        chunkName = this.extractClassName(node);
        break;
      
      case 'interface_declaration':
        chunkType = 'interface';
        chunkName = this.extractInterfaceName(node);
        break;
      
      case 'variable_declaration':
        chunkType = 'variable';
        chunkName = this.extractVariableName(node);
        break;
      
      case 'import_statement':
        chunkType = 'import';
        chunkName = this.extractImportName(node);
        break;
      
      case 'export_statement':
        chunkType = 'export';
        chunkName = this.extractExportName(node);
        break;
      
      default:
        // Check if it's a function expression or arrow function
        if (nodeType === 'arrow_function' || nodeType === 'function_expression') {
          chunkType = 'function';
          chunkName = this.extractFunctionExpressionName(node);
        }
    }
    
    return { chunkType, chunkName };
  }

  /**
   * Classify Python AST nodes
   */
  classifyPythonNode(node, nodeType) {
    let chunkType = 'other';
    let chunkName = 'unknown';
    
    switch (nodeType) {
      case 'function_definition':
        chunkType = 'function';
        chunkName = this.extractPythonFunctionName(node);
        break;
      
      case 'class_definition':
        chunkType = 'class';
        chunkName = this.extractPythonClassName(node);
        break;
      
      case 'import_statement':
        chunkType = 'import';
        chunkName = this.extractPythonImportName(node);
        break;
      
      case 'assignment':
        chunkType = 'variable';
        chunkName = this.extractPythonVariableName(node);
        break;
    }
    
    return { chunkType, chunkName };
  }

  /**
   * Classify Java AST nodes
   */
  classifyJavaNode(node, nodeType) {
    let chunkType = 'other';
    let chunkName = 'unknown';
    
    switch (nodeType) {
      case 'method_declaration':
        chunkType = 'function';
        chunkName = this.extractJavaMethodName(node);
        break;
      
      case 'class_declaration':
        chunkType = 'class';
        chunkName = this.extractJavaClassName(node);
        break;
      
      case 'interface_declaration':
        chunkType = 'interface';
        chunkName = this.extractJavaInterfaceName(node);
        break;
      
      case 'import_declaration':
        chunkType = 'import';
        chunkName = this.extractJavaImportName(node);
        break;
      
      case 'field_declaration':
        chunkType = 'variable';
        chunkName = this.extractJavaFieldName(node);
        break;
    }
    
    return { chunkType, chunkName };
  }

  /**
   * Extract content for a specific AST node
   */
  extractNodeContent(node, content) {
    const startPosition = node.startPosition;
    const endPosition = node.endPosition;
    
    const lines = content.split('\n');
    const startLine = startPosition.row;
    const endLine = endPosition.row;
    
    if (startLine === endLine) {
      // Single line
      return lines[startLine].substring(startPosition.column, endPosition.column);
    } else {
      // Multi-line
      const firstLine = lines[startLine].substring(startPosition.column);
      const middleLines = lines.slice(startLine + 1, endLine);
      const lastLine = lines[endLine].substring(0, endPosition.column);
      
      return [firstLine, ...middleLines, lastLine].join('\n');
    }
  }

  // JavaScript/TypeScript extraction methods
  extractFunctionName(node) {
    const nameNode = node.childForFieldName('name');
    return nameNode ? nameNode.text : 'anonymous';
  }

  extractMethodName(node) {
    const nameNode = node.childForFieldName('name');
    return nameNode ? nameNode.text : 'anonymous';
  }

  extractClassName(node) {
    const nameNode = node.childForFieldName('name');
    return nameNode ? nameNode.text : 'AnonymousClass';
  }

  extractInterfaceName(node) {
    const nameNode = node.childForFieldName('name');
    return nameNode ? nameNode.text : 'AnonymousInterface';
  }

  extractVariableName(node) {
    const declarator = node.childForFieldName('declarations')?.children[0];
    const nameNode = declarator?.childForFieldName('id');
    return nameNode ? nameNode.text : 'unknown';
  }

  extractImportName(node) {
    const sourceNode = node.childForFieldName('source');
    return sourceNode ? sourceNode.text.replace(/['"]/g, '') : 'unknown';
  }

  extractExportName(node) {
    const declaration = node.childForFieldName('declaration');
    if (declaration) {
      const nameNode = declaration.childForFieldName('name');
      return nameNode ? nameNode.text : 'unknown';
    }
    return 'unknown';
  }

  extractFunctionExpressionName(node) {
    // For function expressions, try to find the variable name
    const parent = node.parent;
    if (parent && parent.type === 'variable_declarator') {
      const nameNode = parent.childForFieldName('id');
      return nameNode ? nameNode.text : 'anonymous';
    }
    return 'anonymous';
  }

  // Python extraction methods
  extractPythonFunctionName(node) {
    const nameNode = node.childForFieldName('name');
    return nameNode ? nameNode.text : 'anonymous';
  }

  extractPythonClassName(node) {
    const nameNode = node.childForFieldName('name');
    return nameNode ? nameNode.text : 'AnonymousClass';
  }

  extractPythonImportName(node) {
    const moduleNode = node.childForFieldName('module');
    return moduleNode ? moduleNode.text : 'unknown';
  }

  extractPythonVariableName(node) {
    const targetNode = node.childForFieldName('target');
    if (targetNode && targetNode.children.length > 0) {
      return targetNode.children[0].text;
    }
    return 'unknown';
  }

  // Java extraction methods
  extractJavaMethodName(node) {
    const nameNode = node.childForFieldName('name');
    return nameNode ? nameNode.text : 'anonymous';
  }

  extractJavaClassName(node) {
    const nameNode = node.childForFieldName('name');
    return nameNode ? nameNode.text : 'AnonymousClass';
  }

  extractJavaInterfaceName(node) {
    const nameNode = node.childForFieldName('name');
    return nameNode ? nameNode.text : 'AnonymousInterface';
  }

  extractJavaImportName(node) {
    const nameNode = node.childForFieldName('name');
    return nameNode ? nameNode.text : 'unknown';
  }

  extractJavaFieldName(node) {
    const declarator = node.childForFieldName('declarators')?.children[0];
    const nameNode = declarator?.childForFieldName('name');
    return nameNode ? nameNode.text : 'unknown';
  }

  /**
   * Fallback simple chunking for unsupported languages
   */
  simpleChunking(content, filePath, fileName, extension) {
    const chunks = [];
    const lines = content.split('\n');
    
    let currentChunk = '';
    let startLine = 1;
    let chunkType = 'other';
    let chunkName = fileName;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      
      // Detect function definitions
      if (this.isFunctionDefinition(line, extension)) {
        // Save previous chunk if exists
        if (currentChunk.trim()) {
          chunks.push({
            filePath,
            fileName,
            fileExtension: extension,
            chunkType,
            chunkName,
            content: currentChunk.trim(),
            startLine,
            endLine: lineNumber - 1
          });
        }
        
        // Start new function chunk
        currentChunk = line;
        startLine = lineNumber;
        chunkType = 'function';
        chunkName = this.extractFunctionNameFromLine(line, extension);
      }
      // Detect class definitions
      else if (this.isClassDefinition(line, extension)) {
        // Save previous chunk if exists
        if (currentChunk.trim()) {
          chunks.push({
            filePath,
            fileName,
            fileExtension: extension,
            chunkType,
            chunkName,
            content: currentChunk.trim(),
            startLine,
            endLine: lineNumber - 1
          });
        }
        
        // Start new class chunk
        currentChunk = line;
        startLine = lineNumber;
        chunkType = 'class';
        chunkName = this.extractClassNameFromLine(line, extension);
      }
      else {
        currentChunk += '\n' + line;
      }
    }
    
    // Save final chunk
    if (currentChunk.trim()) {
      chunks.push({
        filePath,
        fileName,
        fileExtension: extension,
        chunkType,
        chunkName,
        content: currentChunk.trim(),
        startLine,
        endLine: lines.length
      });
    }
    
    return chunks;
  }

  /**
   * Check if line is a function definition (fallback)
   */
  isFunctionDefinition(line, extension) {
    const trimmed = line.trim();
    
    switch (extension) {
      case '.js':
      case '.ts':
      case '.jsx':
      case '.tsx':
        return /^(export\s+)?(async\s+)?function\s+\w+|^(export\s+)?const\s+\w+\s*=\s*(async\s+)?\(|^(export\s+)?\w+\s*:\s*(async\s+)?\(/.test(trimmed);
      case '.py':
        return /^def\s+\w+\s*\(/.test(trimmed);
      case '.java':
        return /^(public|private|protected)\s+.*\s+\w+\s*\(/.test(trimmed);
      default:
        return false;
    }
  }

  /**
   * Check if line is a class definition (fallback)
   */
  isClassDefinition(line, extension) {
    const trimmed = line.trim();
    
    switch (extension) {
      case '.js':
      case '.ts':
      case '.jsx':
      case '.tsx':
        return /^(export\s+)?class\s+\w+|^(export\s+)?interface\s+\w+/.test(trimmed);
      case '.py':
        return /^class\s+\w+/.test(trimmed);
      case '.java':
        return /^(public|private|protected)\s+class\s+\w+|^(public|private|protected)\s+interface\s+\w+/.test(trimmed);
      default:
        return false;
    }
  }

  /**
   * Extract function name from line (fallback)
   */
  extractFunctionNameFromLine(line, extension) {
    const trimmed = line.trim();
    
    switch (extension) {
      case '.js':
      case '.ts':
      case '.jsx':
      case '.tsx':
        const jsMatch = trimmed.match(/(?:function|const|let|var)\s+(\w+)/);
        return jsMatch ? jsMatch[1] : 'anonymous';
      case '.py':
        const pyMatch = trimmed.match(/def\s+(\w+)/);
        return pyMatch ? pyMatch[1] : 'anonymous';
      case '.java':
        const javaMatch = trimmed.match(/\w+\s+(\w+)\s*\(/);
        return javaMatch ? javaMatch[1] : 'anonymous';
      default:
        return 'anonymous';
    }
  }

  /**
   * Extract class name from line (fallback)
   */
  extractClassNameFromLine(line, extension) {
    const trimmed = line.trim();
    
    switch (extension) {
      case '.js':
      case '.ts':
      case '.jsx':
      case '.tsx':
        const jsMatch = trimmed.match(/(?:class|interface)\s+(\w+)/);
        return jsMatch ? jsMatch[1] : 'AnonymousClass';
      case '.py':
        const pyMatch = trimmed.match(/class\s+(\w+)/);
        return pyMatch ? pyMatch[1] : 'AnonymousClass';
      case '.java':
        const javaMatch = trimmed.match(/(?:class|interface)\s+(\w+)/);
        return javaMatch ? javaMatch[1] : 'AnonymousClass';
      default:
        return 'AnonymousClass';
    }
  }
}

export default new ASTParsingService();
