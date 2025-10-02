/**
 * Enhanced Language Detection Service
 * Implements two-level detection: Framework + Language/Syntax
 */
class LanguageDetectionService {
  constructor() {
    this.initializeDetectionRules();
  }

  /**
   * Initialize detection rules and patterns
   */
  initializeDetectionRules() {
    // Framework detection patterns (Level 1)
    this.frameworkPatterns = {
      react: {
        extensions: ['.jsx', '.tsx'],
        contentPatterns: [
          /import\s+React\s+from\s+['"]react['"]/,
          /import\s+.*from\s+['"]react['"]/,
          /useState\s*\(/,
          /useEffect\s*\(/,
          /React\.Component/,
          /className=/,
          /onClick=/,
          /onChange=/,
          /<[A-Z]\w+[^>]*>/
        ],
        priority: 90
      },
      vue: {
        extensions: ['.vue'],
        contentPatterns: [
          /<template>/,
          /<script>/,
          /<style\s+scoped>/,
          /import\s+.*from\s+['"]vue['"]/,
          /v-model=/,
          /v-if=/,
          /v-for=/,
          /@click=/,
          /setup\s*\(\s*\)\s*{/,
          /ref\s*\(/,
          /computed\s*\(/,
          /onMounted\s*\(/
        ],
        priority: 95
      },
      angular: {
        extensions: ['.ts'],
        contentPatterns: [
          /@Component\s*\(/,
          /@Injectable\s*\(/,
          /@Directive\s*\(/,
          /@NgModule\s*\(/,
          /import.*from\s+['"]@angular\/core['"]/,
          /ngOnInit\s*\(/,
          /ngOnDestroy\s*\(/,
          /\*ngFor\s*=/,
          /\*ngIf\s*=/,
          /export\s+class\s+\w+Component/
        ],
        priority: 85
      },
      angularjs: {
        extensions: ['.js', '.html'],
        contentPatterns: [
          /ng-app|ng-controller|ng-model|ng-repeat|ng-if|ng-show|ng-hide|ng-click/,
          /angular\.module\s*\(/,
          /\.controller\s*\(/,
          /\.service\s*\(/,
          /\.directive\s*\(/,
          /\$scope\s*[=:]/,
          /\$http\s*\./,
          /angular\.js|angular\.min\.js/i
        ],
        priority: 80
      },
      jquery: {
        extensions: ['.js'],
        contentPatterns: [
          /\$\(document\)\.ready/,
          /\$\(['"][^'"]*['"]\)/,
          /\$\(this\)/,
          /\.ready\s*\(|\.ajax\s*\(|\.fadeIn\s*\(|\.slideUp\s*\(/,
          /jquery\.js|jquery\.min\.js|cdn\.jquery/i
        ],
        priority: 70
      }
    };

    // Language/Syntax detection patterns (Level 2)
    this.syntaxPatterns = {
      typescript: {
        extensions: ['.ts', '.tsx'],
        contentPatterns: [
          /interface\s+\w+/,
          /type\s+\w+\s*=/,
          /:\s*string|:\s*number|:\s*boolean/,
          /as\s+\w+/,
          /<[^>]*>/,
          /enum\s+\w+/
        ]
      },
      javascript: {
        extensions: ['.js', '.jsx'],
        contentPatterns: [
          /var\s+\w+|let\s+\w+|const\s+\w+/,
          /function\s+\w+/,
          /=>\s*{/,
          /require\s*\(/,
          /module\.exports/
        ]
      },
      jsx: {
        extensions: ['.jsx'],
        contentPatterns: [
          /<[A-Z]\w+/,
          /className=/,
          /onClick=/,
          /return\s*\(/
        ]
      },
      tsx: {
        extensions: ['.tsx'],
        contentPatterns: [
          /<[A-Z]\w+/,
          /className=/,
          /onClick=/,
          /interface\s+\w+/,
          /:\s*React\./
        ]
      }
    };

    // File extension to base language mapping
    this.extensionToLanguage = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cs': 'csharp',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.m': 'objc',
      '.vue': 'vue',
      '.html': 'html',
      '.htm': 'html'
    };
  }

  /**
   * Perform two-level detection on a file
   * @param {string} filename - The filename
   * @param {string} content - The file content
   * @returns {Object} Detection result with framework and syntax information
   */
  detectLanguage(filename, content) {
    const extension = this.getFileExtension(filename);
    
    // Level 1: Framework Detection
    const framework = this.detectFramework(filename, content, extension);
    
    // Level 2: Language/Syntax Detection
    const syntax = this.detectSyntax(filename, content, extension);
    
    // Combine results
    const result = {
      framework: framework.name,
      frameworkConfidence: framework.confidence,
      syntax: syntax.name,
      syntaxConfidence: syntax.confidence,
      extension: extension,
      displayName: this.generateDisplayName(framework.name, syntax.name),
      tag: this.generateTag(syntax.name, extension),
      isFrameworkDetected: framework.confidence > 0.5,
      isSyntaxDetected: syntax.confidence > 0.5
    };

    console.log(`🔍 Detection result for ${filename}:`, result);
    return result;
  }

  /**
   * Detect the primary framework (Level 1)
   * @param {string} filename - The filename
   * @param {string} content - The file content
   * @param {string} extension - The file extension
   * @returns {Object} Framework detection result
   */
  detectFramework(filename, content, extension) {
    let bestMatch = { name: null, confidence: 0 };

    for (const [frameworkName, rules] of Object.entries(this.frameworkPatterns)) {
      let confidence = 0;
      
      // Check extension match
      if (rules.extensions.includes(extension)) {
        confidence += 0.3;
      }

      // Check content patterns
      const matchingPatterns = rules.contentPatterns.filter(pattern => 
        pattern.test(content)
      );
      
      if (matchingPatterns.length > 0) {
        confidence += (matchingPatterns.length / rules.contentPatterns.length) * 0.7;
        confidence *= (rules.priority / 100); // Apply priority weighting
      }

      if (confidence > bestMatch.confidence) {
        bestMatch = { name: frameworkName, confidence };
      }
    }

    // Fallback to base language if no framework detected
    if (bestMatch.confidence < 0.3) {
      const baseLanguage = this.extensionToLanguage[extension];
      if (baseLanguage) {
        bestMatch = { name: baseLanguage, confidence: 0.8 };
      }
    }

    return bestMatch;
  }

  /**
   * Detect the language syntax (Level 2)
   * @param {string} filename - The filename
   * @param {string} content - The file content
   * @param {string} extension - The file extension
   * @returns {Object} Syntax detection result
   */
  detectSyntax(filename, content, extension) {
    let bestMatch = { name: null, confidence: 0 };

    for (const [syntaxName, rules] of Object.entries(this.syntaxPatterns)) {
      let confidence = 0;
      
      // Check extension match
      if (rules.extensions.includes(extension)) {
        confidence += 0.4;
      }

      // Check content patterns
      const matchingPatterns = rules.contentPatterns.filter(pattern => 
        pattern.test(content)
      );
      
      if (matchingPatterns.length > 0) {
        confidence += (matchingPatterns.length / rules.contentPatterns.length) * 0.6;
      }

      if (confidence > bestMatch.confidence) {
        bestMatch = { name: syntaxName, confidence };
      }
    }

    // Fallback based on extension
    if (bestMatch.confidence < 0.3) {
      if (extension === '.tsx') {
        bestMatch = { name: 'tsx', confidence: 0.9 };
      } else if (extension === '.jsx') {
        bestMatch = { name: 'jsx', confidence: 0.9 };
      } else if (extension === '.ts') {
        bestMatch = { name: 'typescript', confidence: 0.9 };
      } else if (extension === '.js') {
        bestMatch = { name: 'javascript', confidence: 0.9 };
      } else if (extension === '.vue') {
        bestMatch = { name: 'vue', confidence: 0.9 };
      }
    }

    return bestMatch;
  }

  /**
   * Generate a user-friendly display name
   * @param {string} framework - The detected framework
   * @param {string} syntax - The detected syntax
   * @returns {string} Display name
   */
  generateDisplayName(framework, syntax) {
    if (!framework && !syntax) return 'Unknown';
    
    // Special handling for React syntax variants
    if (framework === 'react') {
      if (syntax === 'tsx') return 'react-ts';
      if (syntax === 'jsx') return 'react-js';
    }
    
    // If framework is detected, use it as primary
    if (framework && framework !== syntax) {
      return this.getFrameworkDisplayName(framework);
    }
    
    // Otherwise use syntax
    return this.getSyntaxDisplayName(syntax);
  }

  /**
   * Generate a tag/badge for the language variant
   * @param {string} syntax - The detected syntax
   * @param {string} extension - The file extension
   * @returns {string} Tag text
   */
  generateTag(syntax, extension) {
    const tagMap = {
      'tsx': 'TypeScript/TSX',
      'jsx': 'JavaScript/JSX',
      'typescript': 'TypeScript',
      'javascript': 'JavaScript',
      'vue': 'Vue SFC'
    };

    return tagMap[syntax] || extension.substring(1).toUpperCase();
  }

  /**
   * Get framework display name
   * @param {string} framework - Framework name
   * @returns {string} Display name
   */
  getFrameworkDisplayName(framework) {
    const displayNames = {
      'react': 'React',
      'vue': 'Vue.js',
      'angular': 'Angular',
      'angularjs': 'AngularJS',
      'jquery': 'jQuery',
      'javascript': 'JavaScript',
      'typescript': 'TypeScript'
    };

    return displayNames[framework] || framework;
  }

  /**
   * Get syntax display name
   * @param {string} syntax - Syntax name
   * @returns {string} Display name
   */
  getSyntaxDisplayName(syntax) {
    const displayNames = {
      'tsx': 'React (TypeScript)',
      'jsx': 'React (JavaScript)',
      'typescript': 'TypeScript',
      'javascript': 'JavaScript',
      'vue': 'Vue.js'
    };

    return displayNames[syntax] || syntax;
  }

  /**
   * Get file extension from filename
   * @param {string} filename - The filename
   * @returns {string} File extension
   */
  getFileExtension(filename) {
    return filename.toLowerCase().substring(filename.lastIndexOf('.'));
  }

  /**
   * Validate if a file matches the expected language/framework
   * @param {string} filename - The filename
   * @param {string} content - The file content
   * @param {string} expectedLanguage - The expected language
   * @returns {boolean} Whether the file matches
   */
  validateFileLanguageMatch(filename, content, expectedLanguage) {
    const detection = this.detectLanguage(filename, content);
    
    // Check if the detected framework or syntax matches the expected language
    return detection.framework === expectedLanguage || 
           detection.syntax === expectedLanguage ||
           this.getFrameworkDisplayName(detection.framework).toLowerCase() === expectedLanguage.toLowerCase();
  }

  /**
   * Get all supported language options with their display information
   * @returns {Array} Array of language options
   */
  getSupportedLanguages() {
    return [
      { value: 'javascript', label: 'JavaScript', tag: 'JS' },
      { value: 'typescript', label: 'TypeScript', tag: 'TS' },
      { value: 'react-js', label: 'React with JavaScript', tag: 'JSX' },
      { value: 'react-ts', label: 'React with TypeScript', tag: 'TSX' },
      { value: 'vue', label: 'Vue.js', tag: 'SFC' },
      { value: 'angular', label: 'Angular', tag: 'TS' },
      { value: 'angularjs', label: 'AngularJS', tag: 'JS' },
      { value: 'jquery', label: 'jQuery', tag: 'JS' },
      { value: 'python2', label: 'Python 2', tag: 'PY2' },
      { value: 'python3', label: 'Python 3', tag: 'PY3' },
      { value: 'java', label: 'Java', tag: 'JAVA' },
      { value: 'kotlin', label: 'Kotlin', tag: 'KT' },
      { value: 'swift', label: 'Swift', tag: 'SWIFT' },
      { value: 'objc', label: 'Objective-C', tag: 'OBJC' },
      { value: 'csharp', label: 'C#', tag: 'CS' }
    ];
  }
}

export default new LanguageDetectionService();
