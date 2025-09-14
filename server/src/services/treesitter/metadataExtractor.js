/**
 * Metadata extraction utilities for code analysis
 */
class MetadataExtractor {
  constructor() {
    this.complexityCalculator = new ComplexityCalculator();
    this.dependencyExtractor = new DependencyExtractor();
    this.parameterExtractor = new ParameterExtractor();
    this.commentExtractor = new CommentExtractor();
  }

  /**
   * Extract comprehensive metadata from a chunk
   */
  extractMetadata(node, codeText, filePath) {
    return {
      filePath,
      complexity: this.complexityCalculator.calculate(node),
      dependencies: this.dependencyExtractor.extract(node, codeText),
      parameters: this.parameterExtractor.extract(node),
      returnType: this.extractReturnType(node),
      visibility: this.extractVisibility(node),
      isAsync: this.isAsync(node),
      isGenerator: this.isGenerator(node),
      isStatic: this.isStatic(node),
      comments: this.commentExtractor.extract(codeText),
      modifiers: this.extractModifiers(node),
      annotations: this.extractAnnotations(node)
    };
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
   * Extract all modifiers
   */
  extractModifiers(node) {
    const modifiers = [];
    const modifierTypes = ['async', 'static', 'public', 'private', 'protected', 'readonly'];
    
    for (const modifierType of modifierTypes) {
      const modifierNodes = node.descendantsOfType(modifierType);
      if (modifierNodes.length > 0) {
        modifiers.push(modifierType);
      }
    }
    
    return modifiers;
  }

  /**
   * Extract annotations (JSDoc, decorators, etc.)
   */
  extractAnnotations(node) {
    const annotations = [];
    
    // Extract JSDoc comments
    const jsdocNodes = node.descendantsOfType('comment');
    for (const jsdocNode of jsdocNodes) {
      if (jsdocNode.text.includes('@')) {
        annotations.push({
          type: 'jsdoc',
          text: jsdocNode.text,
          line: jsdocNode.startPosition.row + 1
        });
      }
    }
    
    // Extract decorators
    const decoratorNodes = node.descendantsOfType('decorator');
    for (const decoratorNode of decoratorNodes) {
      annotations.push({
        type: 'decorator',
        text: decoratorNode.text,
        line: decoratorNode.startPosition.row + 1
      });
    }
    
    return annotations;
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
}

/**
 * Complexity calculation utility
 */
class ComplexityCalculator {
  constructor() {
    this.controlFlowTypes = [
      'if_statement',
      'for_statement',
      'while_statement',
      'switch_statement',
      'try_statement',
      'catch_clause',
      'conditional_expression',
      'do_statement'
    ];
    
    this.logicalOperators = ['&&', '||', '!'];
  }

  /**
   * Calculate complexity score for a node
   */
  calculate(node) {
    let complexity = 1; // Base complexity

    // Count control flow statements
    const controlFlowNodes = node.descendantsOfType(this.controlFlowTypes);
    complexity += controlFlowNodes.length;

    // Count logical operators
    const logicalOperatorNodes = node.descendantsOfType(this.logicalOperators);
    complexity += logicalOperatorNodes.length;

    // Count nested loops
    const nestedLoops = this.countNestedLoops(node);
    complexity += nestedLoops;

    return Math.min(complexity, 10); // Cap at 10
  }

  /**
   * Count nested loops
   */
  countNestedLoops(node) {
    let nestedCount = 0;
    const loopTypes = ['for_statement', 'while_statement', 'do_statement'];
    
    const loopNodes = node.descendantsOfType(loopTypes);
    for (const loopNode of loopNodes) {
      const innerLoops = loopNode.descendantsOfType(loopTypes);
      nestedCount += innerLoops.length;
    }
    
    return nestedCount;
  }
}

/**
 * Dependency extraction utility
 */
class DependencyExtractor {
  /**
   * Extract dependencies from a node
   */
  extract(node, codeText) {
    const dependencies = [];
    
    // Extract import statements
    dependencies.push(...this.extractImports(node));
    
    // Extract require statements
    dependencies.push(...this.extractRequires(codeText));
    
    // Extract dynamic imports
    dependencies.push(...this.extractDynamicImports(node));
    
    return dependencies;
  }

  /**
   * Extract import statements
   */
  extractImports(node) {
    const dependencies = [];
    const importNodes = node.descendantsOfType('import_statement');
    
    for (const importNode of importNodes) {
      const sourceNode = importNode.childForFieldName('source');
      if (sourceNode) {
        dependencies.push({
          type: 'import',
          source: sourceNode.text.replace(/['"]/g, ''),
          line: importNode.startPosition.row + 1,
          specifiers: this.extractImportSpecifiers(importNode)
        });
      }
    }
    
    return dependencies;
  }

  /**
   * Extract import specifiers
   */
  extractImportSpecifiers(importNode) {
    const specifiers = [];
    const specifierNodes = importNode.descendantsOfType(['import_specifier', 'namespace_import']);
    
    for (const specifierNode of specifierNodes) {
      if (specifierNode.type === 'import_specifier') {
        const nameNode = specifierNode.childForFieldName('name');
        const aliasNode = specifierNode.childForFieldName('alias');
        
        specifiers.push({
          type: 'named',
          name: nameNode ? nameNode.text : null,
          alias: aliasNode ? aliasNode.text : null
        });
      } else if (specifierNode.type === 'namespace_import') {
        const nameNode = specifierNode.childForFieldName('name');
        specifiers.push({
          type: 'namespace',
          name: nameNode ? nameNode.text : null
        });
      }
    }
    
    return specifiers;
  }

  /**
   * Extract require statements
   */
  extractRequires(codeText) {
    const dependencies = [];
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
   * Extract dynamic imports
   */
  extractDynamicImports(node) {
    const dependencies = [];
    const dynamicImportNodes = node.descendantsOfType('call_expression');
    
    for (const callNode of dynamicImportNodes) {
      const functionNode = callNode.childForFieldName('function');
      if (functionNode && functionNode.text === 'import') {
        const args = callNode.descendantsOfType('string');
        if (args.length > 0) {
          dependencies.push({
            type: 'dynamic_import',
            source: args[0].text.replace(/['"]/g, ''),
            line: callNode.startPosition.row + 1
          });
        }
      }
    }
    
    return dependencies;
  }
}

/**
 * Parameter extraction utility
 */
class ParameterExtractor {
  /**
   * Extract parameters from a function node
   */
  extract(node) {
    const parameters = [];
    
    if (this.isFunctionNode(node)) {
      const paramsNode = node.childForFieldName('parameters');
      if (paramsNode) {
        parameters.push(...this.extractParameterList(paramsNode));
      }
    }
    
    return parameters;
  }

  /**
   * Extract parameter list
   */
  extractParameterList(paramsNode) {
    const parameters = [];
    const paramNodes = paramsNode.descendantsOfType(['identifier', 'rest_pattern', 'assignment_pattern']);
    
    for (const paramNode of paramNodes) {
      const param = this.extractParameter(paramNode);
      if (param) {
        parameters.push(param);
      }
    }
    
    return parameters;
  }

  /**
   * Extract individual parameter
   */
  extractParameter(paramNode) {
    const parameter = {
      name: null,
      type: 'unknown',
      line: paramNode.startPosition.row + 1,
      isRest: false,
      hasDefault: false,
      defaultValue: null
    };

    if (paramNode.type === 'identifier') {
      parameter.name = paramNode.text;
    } else if (paramNode.type === 'rest_pattern') {
      parameter.isRest = true;
      const nameNode = paramNode.childForFieldName('name');
      if (nameNode) {
        parameter.name = nameNode.text;
      }
    } else if (paramNode.type === 'assignment_pattern') {
      parameter.hasDefault = true;
      const nameNode = paramNode.childForFieldName('left');
      const valueNode = paramNode.childForFieldName('right');
      
      if (nameNode) {
        parameter.name = nameNode.text;
      }
      if (valueNode) {
        parameter.defaultValue = valueNode.text;
      }
    }

    return parameter;
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
}

/**
 * Comment extraction utility
 */
class CommentExtractor {
  /**
   * Extract comments from code text
   */
  extract(codeText) {
    const comments = [];
    
    // Extract single-line comments
    const lineComments = this.extractLineComments(codeText);
    comments.push(...lineComments);
    
    // Extract block comments
    const blockComments = this.extractBlockComments(codeText);
    comments.push(...blockComments);
    
    return comments;
  }

  /**
   * Extract single-line comments
   */
  extractLineComments(codeText) {
    const comments = [];
    const lines = codeText.split('\n');
    
    lines.forEach((line, index) => {
      const commentMatch = line.match(/^\s*\/\/(.*)$/);
      if (commentMatch) {
        comments.push({
          text: commentMatch[1].trim(),
          type: 'line',
          line: index + 1
        });
      }
    });
    
    return comments;
  }

  /**
   * Extract block comments
   */
  extractBlockComments(codeText) {
    const comments = [];
    const blockCommentRegex = /\/\*([\s\S]*?)\*\//g;
    let match;
    
    while ((match = blockCommentRegex.exec(codeText)) !== null) {
      const lineNumber = codeText.substring(0, match.index).split('\n').length;
      comments.push({
        text: match[1].trim(),
        type: 'block',
        line: lineNumber
      });
    }
    
    return comments;
  }
}

export default MetadataExtractor;
