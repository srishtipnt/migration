import Parser from 'tree-sitter';
import fs from 'fs-extra';
import path from 'path';

class ASTParsingService {
  constructor() {
    this.parser = new Parser();
    this.languages = {};
    this.initialized = false;
    
    console.log('✅ AST Parsing Service initialized');
  }

  /**
   * Initialize language parsers with error handling
   */
  async initializeLanguages() {
    if (this.initialized) return;
    
    try {
      // Try to load JavaScript parser
      try {
        const JavaScript = await import('tree-sitter-javascript');
        this.languages['.js'] = JavaScript.default;
        this.languages['.jsx'] = JavaScript.default;
        console.log('✅ JavaScript parser loaded');
      } catch (error) {
        console.warn('⚠️ JavaScript parser not available:', error.message);
      }

      // Try to load TypeScript parser
      try {
        const TypeScript = await import('tree-sitter-typescript');
        this.languages['.ts'] = TypeScript.default;
        this.languages['.tsx'] = TypeScript.default;
        console.log('✅ TypeScript parser loaded');
      } catch (error) {
        console.warn('⚠️ TypeScript parser not available:', error.message);
      }

      // Try to load Python parser
      try {
        const Python = await import('tree-sitter-python');
        this.languages['.py'] = Python.default;
        console.log('✅ Python parser loaded');
      } catch (error) {
        console.warn('⚠️ Python parser not available:', error.message);
      }

      // Try to load Java parser
      try {
        const Java = await import('tree-sitter-java');
        this.languages['.java'] = Java.default;
        console.log('✅ Java parser loaded');
      } catch (error) {
        console.warn('⚠️ Java parser not available:', error.message);
      }

      // Try to load Ruby parser
      try {
        const Ruby = await import('tree-sitter-ruby');
        this.languages['.rb'] = Ruby.default;
        console.log('✅ Ruby parser loaded');
      } catch (error) {
        console.warn('⚠️ Ruby parser not available:', error.message);
      }

      // Try to load PHP parser
      try {
        const PHP = await import('tree-sitter-php');
        this.languages['.php'] = PHP.default;
        console.log('✅ PHP parser loaded');
      } catch (error) {
        console.warn('⚠️ PHP parser not available:', error.message);
      }

      this.initialized = true;
      console.log(`✅ AST Parsing Service initialized with ${Object.keys(this.languages).length} language parsers`);
    } catch (error) {
      console.error('❌ Error initializing language parsers:', error);
      this.initialized = true; // Mark as initialized even if failed
    }
  }

  /**
   * Parse a file and extract semantic chunks
   */
  async parseFile(filePath, relativePath, extension) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const fileName = path.basename(filePath);
      
      // For small files (< 500 lines), use semantic chunking directly
      const lines = content.split('\n');
      if (lines.length < 500) {
        console.log(`📄 Small file ${fileName} (${lines.length} lines), using semantic chunking`);
        return this.simpleChunking(content, relativePath, fileName, extension);
      }
      
      // Initialize languages if not already done
      await this.initializeLanguages();
      
      // Set the appropriate language
      const Language = this.languages[extension];
      if (!Language) {
        console.warn(`⚠️ No AST parser available for ${extension}, falling back to simple parsing`);
        return this.simpleChunking(content, relativePath, fileName, extension);
      }
      
      try {
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
      } catch (parseError) {
        console.warn(`⚠️ AST parsing failed for ${fileName}: ${parseError.message}, falling back to simple parsing`);
        return this.simpleChunking(content, relativePath, fileName, extension);
      }
      
    } catch (error) {
      console.error(`❌ Error parsing file ${relativePath}:`, error);
      // Fallback to simple parsing
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const fileName = path.basename(filePath);
        return this.simpleChunking(content, relativePath, fileName, extension);
      } catch (fallbackError) {
        console.error(`❌ Fallback parsing also failed for ${relativePath}:`, fallbackError);
        return [];
      }
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
    // Special handling for HTML files
    if (extension === '.html' || extension === '.htm') {
      return this.chunkHtmlFile(content, filePath, fileName, extension);
    }
    
    // For small files (< 500 lines), process as single unit
    const lines = content.split('\n');
    if (lines.length < 500) {
      return [{
        filePath,
        fileName,
        fileExtension: extension,
        chunkType: 'file',
        chunkName: fileName,
        content: content.trim(),
        startLine: 1,
        endLine: lines.length
      }];
    }
    
    const chunks = [];
    
    // Semantic chunking: group related constructs together
    let currentChunk = '';
    let startLine = 1;
    let chunkType = 'other';
    let chunkName = fileName;
    let braceLevel = 0;
    let inClass = false;
    let inFunction = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      const trimmed = line.trim();
      
      // Track brace levels for proper scope detection
      braceLevel += (line.match(/{/g) || []).length;
      braceLevel -= (line.match(/}/g) || []).length;
      
      // Detect major constructs (classes, interfaces, enums)
      if (this.isClassDefinition(line, extension) || this.isInterfaceDefinition(line, extension) || this.isEnumDefinition(line, extension)) {
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
        
        // Start new major construct chunk
        currentChunk = line;
        startLine = lineNumber;
        chunkType = this.getChunkTypeFromLine(line, extension);
        chunkName = this.extractConstructName(line, extension);
        inClass = true;
        inFunction = false;
      }
      // Detect standalone functions (not inside classes)
      else if (this.isFunctionDefinition(line, extension) && !inClass) {
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
        inFunction = true;
      }
      // If we're inside a class and encounter a function, include it in the class chunk
      else if (inClass && this.isFunctionDefinition(line, extension)) {
        currentChunk += '\n' + line;
        inFunction = true;
      }
      // If we're inside a class and the brace level goes back to 0, end the class
      else if (inClass && braceLevel === 0 && trimmed === '}') {
        currentChunk += '\n' + line;
        // Save the complete class chunk
        chunks.push({
          filePath,
          fileName,
          fileExtension: extension,
          chunkType,
          chunkName,
          content: currentChunk.trim(),
          startLine,
          endLine: lineNumber
        });
        currentChunk = '';
        inClass = false;
        inFunction = false;
      }
      // If we're in a standalone function and the brace level goes back to 0, end the function
      else if (inFunction && !inClass && braceLevel === 0 && trimmed === '}') {
        currentChunk += '\n' + line;
        // Save the complete function chunk
        chunks.push({
          filePath,
          fileName,
          fileExtension: extension,
          chunkType,
          chunkName,
          content: currentChunk.trim(),
          startLine,
          endLine: lineNumber
        });
        currentChunk = '';
        inFunction = false;
      }
      else {
        currentChunk += '\n' + line;
      }
    }
    
    // Save final chunk if exists
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
   * Special chunking for HTML files (AngularJS, Vue, etc.)
   */
  chunkHtmlFile(content, filePath, fileName, extension) {
    const chunks = [];
    const lines = content.split('\n');
    
    let currentChunk = '';
    let startLine = 1;
    let chunkType = 'html';
    let chunkName = fileName;
    let inScript = false;
    let inTemplate = false;
    let inStyle = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      const trimmed = line.trim();
      
      // Detect script sections
      if (trimmed.includes('<script>') || trimmed.includes('<script ')) {
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
        
        currentChunk = line;
        startLine = lineNumber;
        chunkType = 'script';
        chunkName = 'script_section';
        inScript = true;
        inTemplate = false;
        inStyle = false;
      }
      // Detect template sections
      else if (trimmed.includes('<template>') || trimmed.includes('<div')) {
        if (!inScript && !inStyle) {
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
          
          currentChunk = line;
          startLine = lineNumber;
          chunkType = 'template';
          chunkName = 'template_section';
          inTemplate = true;
          inScript = false;
          inStyle = false;
        }
      }
      // Detect style sections
      else if (trimmed.includes('<style>') || trimmed.includes('<style ')) {
        if (!inScript && !inTemplate) {
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
          
          currentChunk = line;
          startLine = lineNumber;
          chunkType = 'style';
          chunkName = 'style_section';
          inStyle = true;
          inScript = false;
          inTemplate = false;
        }
      }
      // Detect AngularJS patterns
      else if (trimmed.includes('.controller(') || trimmed.includes('.service(') || 
               trimmed.includes('.directive(') || trimmed.includes('.factory(') ||
               trimmed.includes('.filter(')) {
        if (inScript) {
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
          
          currentChunk = line;
          startLine = lineNumber;
          chunkType = 'angularjs';
          chunkName = this.extractAngularJSName(line);
        }
      }
      // Detect Vue patterns
      else if (trimmed.includes('export default') || trimmed.includes('methods:') ||
               trimmed.includes('computed:') || trimmed.includes('watch:')) {
        if (inScript) {
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
          
          currentChunk = line;
          startLine = lineNumber;
          chunkType = 'vue';
          chunkName = this.extractVueName(line);
        }
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
      case '.cs':
        // C# methods: public/private/protected, static/virtual/override, return type, method name
        return /^(public|private|protected|internal)?\s*(static|virtual|override|abstract)?\s*\w+\s+\w+\s*\(/.test(trimmed);
      case '.c':
      case '.cpp':
      case '.cc':
      case '.cxx':
      case '.c++':
        // C/C++ functions: return type, function name
        return /^\w+\s+\w+\s*\(/.test(trimmed);
      case '.html':
      case '.htm':
        // AngularJS controller functions, Vue methods, etc.
        return /^\s*function\s+\w+\s*\(|^\s*\w+\s*:\s*function\s*\(|^\s*\w+\s*\([^)]*\)\s*{/.test(trimmed);
      case '.vue':
        // Vue component methods
        return /^\s*(methods|computed|watch)\s*:\s*{|^\s*\w+\s*\([^)]*\)\s*{/.test(trimmed);
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
      case '.cs':
        // C# classes: public/private/protected, class/struct/interface, class name
        return /^(public|private|protected|internal)?\s*(class|struct|interface)\s+\w+/.test(trimmed);
      case '.c':
      case '.cpp':
      case '.cc':
      case '.cxx':
      case '.c++':
        // C++ classes: class/struct, class name
        return /^(class|struct)\s+\w+/.test(trimmed);
      case '.html':
      case '.htm':
        // AngularJS controllers, services, directives
        return /^\s*\.controller\s*\(|^\s*\.service\s*\(|^\s*\.directive\s*\(|^\s*\.factory\s*\(|^\s*\.filter\s*\(/.test(trimmed);
      case '.vue':
        // Vue component definition
        return /^\s*export\s+default\s*{|^\s*<script>|^\s*<template>|^\s*<style>/.test(trimmed);
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

  /**
   * Extract AngularJS component name from line
   */
  extractAngularJSName(line) {
    const trimmed = line.trim();
    
    // Match .controller('Name', ...), .service('Name', ...), etc.
    const match = trimmed.match(/\.(controller|service|directive|factory|filter)\s*\(\s*['"`]([^'"`]+)['"`]/);
    if (match) {
      return `${match[1]}_${match[2]}`;
    }
    
    return 'angularjs_component';
  }

  /**
   * Extract Vue component name from line
   */
  extractVueName(line) {
    const trimmed = line.trim();
    
    // Match export default { name: 'ComponentName' }
    const nameMatch = trimmed.match(/name\s*:\s*['"`]([^'"`]+)['"`]/);
    if (nameMatch) {
      return `vue_${nameMatch[1]}`;
    }
    
    // Match methods:, computed:, watch:, etc.
    const sectionMatch = trimmed.match(/(methods|computed|watch|data|created|mounted|updated|destroyed)\s*:/);
    if (sectionMatch) {
      return `vue_${sectionMatch[1]}`;
    }
    
    return 'vue_component';
  }

  /**
   * Check if line is an interface definition
   */
  isInterfaceDefinition(line, extension) {
    const trimmed = line.trim();
    
    switch (extension) {
      case '.cs':
        return /^(public|private|protected|internal)?\s*interface\s+\w+/.test(trimmed);
      case '.java':
        return /^(public|private|protected)?\s*interface\s+\w+/.test(trimmed);
      case '.ts':
      case '.tsx':
        return /^(export\s+)?interface\s+\w+/.test(trimmed);
      default:
        return false;
    }
  }

  /**
   * Check if line is an enum definition
   */
  isEnumDefinition(line, extension) {
    const trimmed = line.trim();
    
    switch (extension) {
      case '.cs':
        return /^(public|private|protected|internal)?\s*enum\s+\w+/.test(trimmed);
      case '.java':
        return /^(public|private|protected)?\s*enum\s+\w+/.test(trimmed);
      case '.ts':
      case '.tsx':
        return /^(export\s+)?enum\s+\w+/.test(trimmed);
      default:
        return false;
    }
  }

  /**
   * Get chunk type from line
   */
  getChunkTypeFromLine(line, extension) {
    if (this.isClassDefinition(line, extension)) return 'class';
    if (this.isInterfaceDefinition(line, extension)) return 'interface';
    if (this.isEnumDefinition(line, extension)) return 'enum';
    if (this.isFunctionDefinition(line, extension)) return 'function';
    return 'other';
  }

  /**
   * Extract construct name (class, interface, enum)
   */
  extractConstructName(line, extension) {
    const trimmed = line.trim();
    
    switch (extension) {
      case '.cs':
        const csMatch = trimmed.match(/(?:public|private|protected|internal)?\s*(?:class|struct|interface|enum)\s+(\w+)/);
        return csMatch ? csMatch[1] : 'UnknownConstruct';
      case '.java':
        const javaMatch = trimmed.match(/(?:public|private|protected)?\s*(?:class|interface|enum)\s+(\w+)/);
        return javaMatch ? javaMatch[1] : 'UnknownConstruct';
      case '.ts':
      case '.tsx':
        const tsMatch = trimmed.match(/(?:export\s+)?(?:class|interface|enum)\s+(\w+)/);
        return tsMatch ? tsMatch[1] : 'UnknownConstruct';
      default:
        return 'UnknownConstruct';
    }
  }
}

export default new ASTParsingService();
