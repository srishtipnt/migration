import Parser from 'tree-sitter';

/**
 * Language parser configuration
 */
const LANGUAGE_CONFIGS = {
  javascript: {
    extensions: ['.js', '.jsx'],
    name: 'JavaScript'
  },
  typescript: {
    extensions: ['.ts'],
    name: 'TypeScript'
  },
  tsx: {
    extensions: ['.tsx'],
    name: 'TSX'
  }
};

/**
 * Parser manager for different programming languages
 */
class ParserManager {
  constructor() {
    this.parsers = new Map();
    this.extensionMap = new Map();
    this.nativeParsersAvailable = false;
    this.initializeParsers();
  }

  /**
   * Initialize parsers for all supported languages
   */
  async initializeParsers() {
    // Check if we're on Windows and skip native parser loading
    if (process.platform === 'win32') {
      console.log('⚠️  Windows detected - skipping native Tree-sitter parser loading');
      this.nativeParsersAvailable = false;
      
      // Initialize extension mapping without native parsers
      for (const [language, config] of Object.entries(LANGUAGE_CONFIGS)) {
        config.extensions.forEach(ext => {
          this.extensionMap.set(ext, language);
        });
      }
      
      console.log('Tree-sitter service initialized (mock mode)');
      return;
    }

    try {
      // Try to load native parsers using dynamic import
      const JavaScript = await import('tree-sitter-javascript');
      const TypeScript = await import('tree-sitter-typescript');
      
      const LANGUAGE_PARSERS = {
        javascript: JavaScript.default,
        typescript: TypeScript.default.typescript,
        tsx: TypeScript.default.tsx
      };

      for (const [language, config] of Object.entries(LANGUAGE_CONFIGS)) {
        const parser = new Parser();
        parser.setLanguage(LANGUAGE_PARSERS[language]);
        this.parsers.set(language, parser);

        // Map extensions to language
        config.extensions.forEach(ext => {
          this.extensionMap.set(ext, language);
        });
      }
      
      this.nativeParsersAvailable = true;
      console.log('Native Tree-sitter parsers initialized successfully');
    } catch (error) {
      console.warn('⚠️  Native Tree-sitter not available, using mock service:', error.message);
      
      // Initialize extension mapping without native parsers
      for (const [language, config] of Object.entries(LANGUAGE_CONFIGS)) {
        config.extensions.forEach(ext => {
          this.extensionMap.set(ext, language);
        });
      }
      
      this.nativeParsersAvailable = false;
      console.log('Tree-sitter service initialized (mock mode)');
    }
  }

  /**
   * Get parser for a specific language
   */
  getParser(language) {
    return this.parsers.get(language);
  }

  /**
   * Get parser for a file based on its extension
   */
  getParserForFile(filePath) {
    const extension = this.getFileExtension(filePath);
    const language = this.extensionMap.get(extension);
    
    if (!language) {
      return null;
    }
    
    return this.parsers.get(language);
  }

  /**
   * Get language for a file based on its extension
   */
  getLanguageForFile(filePath) {
    const extension = this.getFileExtension(filePath);
    return this.extensionMap.get(extension);
  }

  /**
   * Check if a file is supported
   */
  isFileSupported(filePath) {
    const extension = this.getFileExtension(filePath);
    return this.extensionMap.has(extension);
  }

  /**
   * Get file extension
   */
  getFileExtension(filePath) {
    const lastDotIndex = filePath.lastIndexOf('.');
    if (lastDotIndex === -1) return '';
    return filePath.substring(lastDotIndex).toLowerCase();
  }

  /**
   * Get all supported extensions
   */
  getSupportedExtensions() {
    return Array.from(this.extensionMap.keys());
  }

  /**
   * Get all supported languages
   */
  getSupportedLanguages() {
    return Array.from(this.parsers.keys());
  }

  /**
   * Parse a file with the appropriate parser
   */
  parseFile(filePath, content) {
    if (!this.nativeParsersAvailable) {
      throw new Error('Native Tree-sitter parsers not available. Use mock service instead.');
    }

    const parser = this.getParserForFile(filePath);
    
    if (!parser) {
      throw new Error(`Unsupported file type: ${filePath}`);
    }

    try {
      const tree = parser.parse(content);
      return {
        tree,
        language: this.getLanguageForFile(filePath),
        parser
      };
    } catch (error) {
      throw new Error(`Failed to parse file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Check if native parsers are available
   */
  isNativeAvailable() {
    return this.nativeParsersAvailable;
  }

  /**
   * Get parser configuration for a language
   */
  getLanguageConfig(language) {
    return LANGUAGE_CONFIGS[language];
  }
}

export default ParserManager;
