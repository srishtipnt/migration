import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { FileText, Archive, ArrowRight, CheckCircle, Tag } from 'lucide-react';
import SingleFileCloudinaryUpload from '../components/SingleFileCloudinaryUpload';
import ZipUpload from '../components/ZipUpload';
import InlineMigrationResults from '../components/InlineMigrationResults';
import apiService from '../services/api';
import cleanupService from '../services/cleanupService';
import { LanguageOption, TwoLevelLanguageInfo } from '../types';

const MigrationPage: React.FC = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI State
  const [activeTab, setActiveTab] = useState<'single' | 'zip'>('single');
  const [uploadCompleted, setUploadCompleted] = useState(false);
  const [chunkingCompleted, setChunkingCompleted] = useState(false);
  const [showConversion, setShowConversion] = useState(false);
  
  // Conversion State
  const [fromLanguage, setFromLanguage] = useState('javascript');
  const [toLanguage, setToLanguage] = useState('typescript');
  const [isConverting, setIsConverting] = useState(false);
  const [userHasSelectedLanguages, setUserHasSelectedLanguages] = useState(false);
  
  // Two-Level Detection State
  const [detectedLanguageInfo, setDetectedLanguageInfo] = useState<TwoLevelLanguageInfo | null>(null);
  const [showDetectionDetails, setShowDetectionDetails] = useState(false);
  
  // Migration Results State
  const [migrationResult, setMigrationResult] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  const [isConverted, setIsConverted] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [originalFiles, setOriginalFiles] = useState<{ [key: string]: string }>({});
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);
  
  // Enhanced two-level language detection
  const detectLanguageAndSetTarget = (filename: string, content: string) => {
    // Only auto-detect if user hasn't manually selected languages
    if (userHasSelectedLanguages) {
      console.log('User has already selected languages, skipping auto-detection');
      return;
    }

    const detection = performTwoLevelDetection(filename, content);
    setDetectedLanguageInfo(detection);
    
    // Use the detected primary language for auto-setting
    setFromLanguage(detection.primary);
    
    // Set a smart default target based on the detected language
    let detectedFrom = detection.displayName;
    let detectedTo = '';
    
    if (detection.primary === 'react-ts') {
      setToLanguage('react-js');
      detectedTo = 'React with JavaScript';
    } else if (detection.primary === 'react-js') {
      setToLanguage('react-ts');
      detectedTo = 'React with TypeScript';
    } else {
      // Fallback to original logic for other languages
      const extension = filename.split('.').pop()?.toLowerCase();
      
      // Language detection based on file extension and content for non-React files
    if (extension === 'py') {
      // Check for Python 2 vs Python 3 patterns
      if (content.includes('print ') && !content.includes('print(')) {
        setFromLanguage('python2');
        setToLanguage('python3');
        detectedFrom = 'Python 2';
        detectedTo = 'Python 3';
      } else {
        setFromLanguage('python');
        setToLanguage('python3');
        detectedFrom = 'Python';
        detectedTo = 'Python 3';
      }
    } else if (extension === 'js') {
      // Use enhanced framework detection for JavaScript files
      const detectedFramework = detectFrontendFramework(filename, content);
      console.log(`🔍 Detected framework for ${filename}: ${detectedFramework}`);
      
      if (detectedFramework === 'jquery') {
        setFromLanguage('jquery');
        setToLanguage('react');
        detectedFrom = 'jQuery';
        detectedTo = 'React';
      } else if (detectedFramework === 'react') {
        setFromLanguage('react');
        setToLanguage('vue');
        detectedFrom = 'React';
        detectedTo = 'Vue.js';
      } else if (detectedFramework === 'vue') {
        setFromLanguage('vue');
        setToLanguage('react');
        detectedFrom = 'Vue.js';
        detectedTo = 'React';
      } else if (detectedFramework === 'angular') {
        setFromLanguage('angular');
        setToLanguage('react');
        detectedFrom = 'Angular';
        detectedTo = 'React';
      } else if (detectedFramework === 'angularjs') {
        setFromLanguage('angularjs');
        setToLanguage('react');
        detectedFrom = 'AngularJS';
        detectedTo = 'React';
      } else {
        // Default to JavaScript → TypeScript
        setFromLanguage('javascript');
        setToLanguage('typescript');
        detectedFrom = 'JavaScript';
        detectedTo = 'TypeScript';
      }
    } else if (extension === 'm' || extension === 'mm') {
      setFromLanguage('objc');
      setToLanguage('swift');
      detectedFrom = 'Objective-C';
      detectedTo = 'Swift';
    } else if (extension === 'cs') {
      setFromLanguage('csharp');
      setToLanguage('java');
      detectedFrom = 'C#';
      detectedTo = 'Java';
    } else if (extension === 'ts') {
      setFromLanguage('typescript');
      setToLanguage('javascript');
      detectedFrom = 'TypeScript';
      detectedTo = 'JavaScript';
    } else if (extension === 'jsx') {
      setFromLanguage('react-js');
      setToLanguage('react-ts');
      detectedFrom = 'React with JavaScript';
      detectedTo = 'React with TypeScript';
    } else if (extension === 'tsx') {
      setFromLanguage('react-ts');
      setToLanguage('react-js');
      detectedFrom = 'React with TypeScript';
      detectedTo = 'React with JavaScript';
    } else if (extension === 'vue') {
      setFromLanguage('vue');
      setToLanguage('react');
      detectedFrom = 'Vue.js';
      detectedTo = 'React';
    } else if (extension === 'php') {
      // Use enhanced framework detection for PHP files
      const detectedFramework = detectPHPFramework(filename, content);
      console.log(`🔍 Detected PHP framework for ${filename}: ${detectedFramework}`);
      
      if (detectedFramework === 'wordpress') {
        setFromLanguage('wordpress');
        setToLanguage('express');
        detectedFrom = 'WordPress';
        detectedTo = 'Express.js';
      } else if (detectedFramework === 'laravel') {
        setFromLanguage('laravel');
        setToLanguage('nestjs');
        detectedFrom = 'Laravel';
        detectedTo = 'NestJS';
      } else {
        setFromLanguage('php');
        setToLanguage('nodejs');
        detectedFrom = 'PHP';
        detectedTo = 'Node.js';
      }
    } else if (extension === 'rb') {
      // Use enhanced framework detection for Ruby files
      const detectedFramework = detectRubyFramework(filename, content);
      console.log(`🔍 Detected Ruby framework for ${filename}: ${detectedFramework}`);
      
      if (detectedFramework === 'rails') {
        setFromLanguage('rails');
        setToLanguage('django');
        detectedFrom = 'Ruby on Rails';
        detectedTo = 'Django';
      } else {
        setFromLanguage('ruby');
        setToLanguage('python3');
        detectedFrom = 'Ruby';
        detectedTo = 'Python 3';
      }
    } else if (extension === 'java') {
      // Use enhanced framework detection for Java files
      const detectedFramework = detectJavaFramework(filename, content);
      console.log(`🔍 Detected Java framework for ${filename}: ${detectedFramework}`);
      
      if (detectedFramework === 'springboot') {
        setFromLanguage('springboot');
        setToLanguage('gin');
        detectedFrom = 'Spring Boot';
        detectedTo = 'Gin';
      } else if (detectedFramework === 'spring') {
        setFromLanguage('spring');
        setToLanguage('go');
        detectedFrom = 'Spring Framework';
        detectedTo = 'Go';
      } else {
        setFromLanguage('java');
        setToLanguage('go');
        detectedFrom = 'Java';
        detectedTo = 'Go';
      }
    } else if (extension === 'go') {
      // Use enhanced framework detection for Go files
      const detectedFramework = detectGoFramework(filename, content);
      console.log(`🔍 Detected Go framework for ${filename}: ${detectedFramework}`);
      
      if (detectedFramework === 'gin') {
        setFromLanguage('gin');
        setToLanguage('springboot');
        detectedFrom = 'Gin';
        detectedTo = 'Spring Boot';
      } else if (detectedFramework === 'echo') {
        setFromLanguage('echo');
        setToLanguage('spring');
        detectedFrom = 'Echo';
        detectedTo = 'Spring Framework';
      } else if (detectedFramework === 'fiber') {
        setFromLanguage('fiber');
        setToLanguage('express');
        detectedFrom = 'Fiber';
        detectedTo = 'Express.js';
      } else {
        setFromLanguage('go');
        setToLanguage('java');
        detectedFrom = 'Go';
        detectedTo = 'Java';
      }
    } else if (extension === 'html') {
      // Use enhanced framework detection for HTML files
      const detectedFramework = detectFrontendFramework(filename, content);
      console.log(`🔍 Detected framework for ${filename}: ${detectedFramework}`);
      
      if (detectedFramework === 'angularjs') {
        setFromLanguage('angularjs');
        setToLanguage('react');
        detectedFrom = 'AngularJS';
        detectedTo = 'React';
      } else if (detectedFramework === 'vue') {
        setFromLanguage('vue');
        setToLanguage('react');
        detectedFrom = 'Vue.js';
        detectedTo = 'React';
      } else if (detectedFramework === 'react') {
        setFromLanguage('react');
        setToLanguage('vue');
        detectedFrom = 'React';
        detectedTo = 'Vue.js';
      } else {
        // Default to AngularJS → React
        setFromLanguage('angularjs');
        setToLanguage('react');
        detectedFrom = 'AngularJS';
        detectedTo = 'React';
      }
    }
    
    // Check for database systems first (prioritize for database file extensions)
    if (!detectedFrom && !detectedTo) {
      const detectedDB = detectDatabase(filename, content);
      
      if (detectedDB) {
        setFromLanguage(detectedDB);
        // Set appropriate target based on detected database
        if (detectedDB === 'mysql') {
          setToLanguage('postgresql');
          detectedFrom = 'MySQL';
          detectedTo = 'PostgreSQL';
        } else if (detectedDB === 'postgresql') {
          setToLanguage('mongodb');
          detectedFrom = 'PostgreSQL';
          detectedTo = 'MongoDB';
        } else if (detectedDB === 'mongodb') {
          setToLanguage('postgresql');
          detectedFrom = 'MongoDB';
          detectedTo = 'PostgreSQL';
        } else if (detectedDB === 'sqlite') {
          setToLanguage('postgresql');
          detectedFrom = 'SQLite';
          detectedTo = 'PostgreSQL';
        } else if (detectedDB === 'redis') {
          setToLanguage('mongodb');
          detectedFrom = 'Redis';
          detectedTo = 'MongoDB';
        } else {
          setToLanguage('postgresql');
          detectedFrom = detectedDB.charAt(0).toUpperCase() + detectedDB.slice(1);
          detectedTo = 'PostgreSQL';
        }
      }
      
      // If no database detected, check for API paradigms
      if (!detectedFrom && !detectedTo) {
        const detectedREST = detectRESTAPI(filename, content);
        const detectedGraphQL = detectGraphQL(filename, content);
        
        if (detectedREST) {
          setFromLanguage('rest');
          setToLanguage('graphql');
          detectedFrom = 'REST API';
          detectedTo = 'GraphQL';
        } else if (detectedGraphQL) {
          setFromLanguage('graphql');
          setToLanguage('rest');
          detectedFrom = 'GraphQL';
          detectedTo = 'REST API';
        }
      }
    }
    
    // Handle GraphQL schema files specifically
    if (extension === 'graphql' || extension === 'gql') {
      setFromLanguage('graphql');
      setToLanguage('rest');
      detectedFrom = 'GraphQL';
      detectedTo = 'REST API';
    }
    }
    
    // Show enhanced detection notification
    if (detectedFrom && detectedTo) {
      const tagInfo = detection.tag ? ` (${detection.tag})` : '';
      toast.success(`Auto-detected: ${detectedFrom}${tagInfo} → ${detectedTo}`, {
        duration: 4000,
        icon: '🔍'
      });
    }
  };

  // Perform two-level detection (Framework + Syntax)
  const performTwoLevelDetection = (filename: string, content: string): TwoLevelLanguageInfo => {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    
    // Level 1: Framework Detection
    const framework = detectFramework(filename, content, extension);
    
    // Level 2: Syntax Detection  
    const syntax = detectSyntax(filename, content, extension);
    
    // Determine the primary language value for the dropdown
    let primaryLanguage = framework.name || syntax.name || 'unknown';
    
    // Special handling for React syntax variants
    if (framework.name === 'react') {
      if (syntax.name === 'tsx') {
        primaryLanguage = 'react-ts';
      } else if (syntax.name === 'jsx') {
        primaryLanguage = 'react-js';
      }
    }
    
    return {
      primary: primaryLanguage,
      secondary: syntax.name !== framework.name ? syntax.name || undefined : undefined,
      displayName: generateDisplayName(framework.name, syntax.name),
      tag: generateLanguageTag(syntax.name, extension),
      confidence: Math.max(framework.confidence, syntax.confidence)
    };
  };

  // Framework detection (Level 1)
  const detectFramework = (_filename: string, content: string, extension: string) => {
    // First check for backend languages by extension
    if (extension === 'java') {
      return { name: 'java', confidence: 0.9 };
    }
    if (extension === 'php') {
      return { name: 'php', confidence: 0.9 };
    }
    if (extension === 'rb') {
      return { name: 'ruby', confidence: 0.9 };
    }
    if (extension === 'go') {
      return { name: 'go', confidence: 0.9 };
    }
    if (extension === 'py') {
      return { name: 'python', confidence: 0.9 };
    }
    
    
    const frameworkPatterns = {
      react: {
        extensions: ['.jsx', '.tsx'],
        patterns: [
          /import\s+React\s+from\s+['"]react['"]/,
          /import\s+.*from\s+['"]react['"]/,
          /useState\s*\(/,
          /useEffect\s*\(/,
          /React\.Component/,
          /className=/,
          /<[A-Z]\w+[^>]*>/
        ],
        priority: 0.9
      },
      vue: {
        extensions: ['.vue'],
        patterns: [
          /<template>/,
          /<script>/,
          /<style\s+scoped>/,
          /v-model=/,
          /v-if=/,
          /v-for=/,
          /@click=/,
          /setup\s*\(\s*\)\s*{/
        ],
        priority: 0.95
      },
      angular: {
        extensions: ['.ts'],
        patterns: [
          /@Component\s*\(/,
          /@Injectable\s*\(/,
          /import.*from\s+['"]@angular\/core['"]/,
          /ngOnInit\s*\(/,
          /\*ngFor\s*=/,
          /\*ngIf\s*=/
        ],
        priority: 0.85
      },
      angularjs: {
        extensions: ['.js', '.html'],
        patterns: [
          /ng-app|ng-controller|ng-model|ng-repeat/,
          /angular\.module\s*\(/,
          /\.controller\s*\(/,
          /\$scope\s*[=:]/,
          /\$http\s*\./
        ],
        priority: 0.8
      },
      jquery: {
        extensions: ['.js'],
        patterns: [
          /\$\(document\)\.ready/,
          /\$\(['"][^'"]*['"]\)/,
          /\$\(this\)/,
          /\.ready\s*\(|\.ajax\s*\(|\.fadeIn\s*\(/
        ],
        priority: 0.7
      },
      rest: {
        extensions: ['.js', '.ts', '.py', '.java', '.cs', '.rb', '.go', '.php'],
        patterns: [
          /app\.(get|post|put|delete|patch)\(/,
          /@RestController|@RequestMapping/,
          /@(Get|Post|Put|Delete|Patch)Mapping/,
          /from rest_framework/,
          /\[Http(Get|Post|Put|Delete)\]/,
          /\/api\/|\/v1\/|\/v2\//,
          /ResponseEntity</,
          /@api_view/
        ],
        priority: 0.8
      },
      graphql: {
        extensions: ['.js', '.ts', '.graphql', '.gql', '.py', '.java', '.cs', '.rb', '.go'],
        patterns: [
          /type\s+\w+\s*{/,
          /query\s+\w*\s*{|mutation\s+\w*\s*{/,
          /from ['"]graphql['"]/,
          /@Resolver|@Query|@Mutation/,
          /apollo-server|graphql-yoga/,
          /buildSchema|makeExecutableSchema/,
          /gql`|graphql`/,
          /useQuery|useMutation/
        ],
        priority: 0.9
      },
      mysql: {
        extensions: ['.sql', '.js', '.py', '.java', '.php', '.rb', '.go', '.cs'],
        patterns: [
          /CREATE TABLE.*ENGINE\s*=\s*InnoDB/i,
          /AUTO_INCREMENT/i,
          /VARCHAR\(\d+\)/i,
          /mysql:\/\/|jdbc:mysql/i,
          /ENGINE=MyISAM|ENGINE=InnoDB/i,
          /mysql\.createConnection/i
        ],
        priority: 0.9
      },
      postgresql: {
        extensions: ['.sql', '.js', '.py', '.java', '.php', '.rb', '.go', '.cs'],
        patterns: [
          /CREATE TABLE.*SERIAL/i,
          /JSONB|JSON/i,
          /postgresql:\/\/|jdbc:postgresql/i,
          /RETURNING \*/i,
          /ILIKE|SIMILAR TO/i,
          /CREATE EXTENSION/i
        ],
        priority: 0.9
      },
      mongodb: {
        extensions: ['.js', '.py', '.java', '.cs', '.rb', '.go', '.json'],
        patterns: [
          /db\.\w+\.find\(/i,
          /db\.\w+\.insert\(/i,
          /ObjectId\(/i,
          /mongodb:\/\/|mongodb\+srv:\/\//i,
          /mongoose\./i,
          /\$set|\$push|\$pull/i
        ],
        priority: 0.9
      },
      sqlite: {
        extensions: ['.sql', '.db', '.sqlite', '.js', '.py', '.java', '.cs'],
        patterns: [
          /sqlite3\./i,
          /PRAGMA/i,
          /sqlite:\/\/|jdbc:sqlite/i,
          /AUTOINCREMENT/i,
          /INTEGER PRIMARY KEY/i
        ],
        priority: 0.8
      },
      redis: {
        extensions: ['.js', '.py', '.java', '.cs', '.rb', '.go'],
        patterns: [
          /redis\./i,
          /SET\s+\w+|GET\s+\w+/i,
          /HSET|HGET|HMSET/i,
          /redis:\/\/|redis\.createClient/i,
          /EXPIRE|TTL/i
        ],
        priority: 0.8
      }
    };

    let bestMatch: { name: string | null, confidence: number } = { name: null, confidence: 0 };

    for (const [name, rules] of Object.entries(frameworkPatterns)) {
      let confidence = 0;
      
      if (rules.extensions.includes(`.${extension}`)) {
        confidence += 0.3;
      }

      const matchingPatterns = rules.patterns.filter(pattern => pattern.test(content));
      if (matchingPatterns.length > 0) {
        confidence += (matchingPatterns.length / rules.patterns.length) * 0.7;
        confidence *= rules.priority;
      }

      if (confidence > bestMatch.confidence) {
        bestMatch = { name, confidence };
      }
    }

    return bestMatch;
  };

  // Syntax detection (Level 2)
  const detectSyntax = (_filename: string, content: string, extension: string) => {
    const syntaxPatterns = {
      tsx: {
        extensions: ['.tsx'],
        patterns: [
          /<[A-Z]\w+/,
          /interface\s+\w+/,
          /:\s*React\./,
          /:\s*string|:\s*number/
        ]
      },
      jsx: {
        extensions: ['.jsx'],
        patterns: [
          /<[A-Z]\w+/,
          /className=/,
          /onClick=/
        ]
      },
      typescript: {
        extensions: ['.ts'],
        patterns: [
          /interface\s+\w+/,
          /type\s+\w+\s*=/,
          /:\s*string|:\s*number|:\s*boolean/,
          /as\s+\w+/
        ]
      },
      javascript: {
        extensions: ['.js'],
        patterns: [
          /var\s+\w+|let\s+\w+|const\s+\w+/,
          /function\s+\w+/,
          /=>\s*{/
        ]
      },
      java: {
        extensions: ['.java'],
        patterns: [
          /public\s+class\s+\w+/,
          /public\s+static\s+void\s+main/,
          /import\s+java\./,
          /System\.out\.println/,
          /public\s+\w+\s+\w+\s*\(/,
          /private\s+\w+\s+\w+/,
          /package\s+[\w.]+/
        ]
      },
      php: {
        extensions: ['.php'],
        patterns: [
          /<\?php/,
          /\$\w+/,
          /function\s+\w+/,
          /class\s+\w+/,
          /echo\s+/,
          /require_once|include_once/
        ]
      },
      ruby: {
        extensions: ['.rb'],
        patterns: [
          /def\s+\w+/,
          /class\s+\w+/,
          /module\s+\w+/,
          /end$/m,
          /@\w+/,
          /puts\s+|print\s+/
        ]
      },
      go: {
        extensions: ['.go'],
        patterns: [
          /package\s+\w+/,
          /func\s+\w+/,
          /import\s+/,
          /fmt\.Print/,
          /var\s+\w+\s+\w+/,
          /type\s+\w+\s+struct/
        ]
      },
      python: {
        extensions: ['.py'],
        patterns: [
          /def\s+\w+/,
          /class\s+\w+/,
          /import\s+\w+/,
          /from\s+\w+\s+import/,
          /print\s*\(/,
          /if\s+__name__\s*==\s*['"']__main__['"']/
        ]
      }
    };

    let bestMatch: { name: string | null, confidence: number } = { name: null, confidence: 0 };

    for (const [name, rules] of Object.entries(syntaxPatterns)) {
      let confidence = 0;
      
      if (rules.extensions.includes(`.${extension}`)) {
        confidence += 0.5;
      }

      const matchingPatterns = rules.patterns.filter(pattern => pattern.test(content));
      if (matchingPatterns.length > 0) {
        confidence += (matchingPatterns.length / rules.patterns.length) * 0.5;
      }

      if (confidence > bestMatch.confidence) {
        bestMatch = { name, confidence };
      }
    }

    // Fallback based on extension
    if (bestMatch.confidence < 0.3) {
      const extensionMap: { [key: string]: string } = {
        'tsx': 'tsx',
        'jsx': 'jsx', 
        'ts': 'typescript',
        'js': 'javascript',
        'vue': 'vue',
        'java': 'java',
        'php': 'php',
        'rb': 'ruby',
        'go': 'go',
        'py': 'python'
      };
      
      const fallback = extensionMap[extension];
      if (fallback) {
        bestMatch = { name: fallback, confidence: 0.8 };
      }
    }

    return bestMatch;
  };

  // Generate display name for the detected language
  const generateDisplayName = (framework: string | null, syntax: string | null): string => {
    // Special handling for React syntax variants - be more specific
    if (framework === 'react') {
      if (syntax === 'tsx') return 'React with TypeScript';
      if (syntax === 'jsx') return 'React with JavaScript';
      return 'React';
    }
    
    if (framework && framework !== syntax) {
      const frameworkNames: { [key: string]: string } = {
        'react': 'React',
        'vue': 'Vue.js',
        'angular': 'Angular',
        'angularjs': 'AngularJS',
        'jquery': 'jQuery'
      };
      return frameworkNames[framework] || framework;
    }
    
    const syntaxNames: { [key: string]: string } = {
      'tsx': 'React with TypeScript',
      'jsx': 'React with JavaScript',
      'typescript': 'TypeScript',
      'javascript': 'JavaScript',
      'vue': 'Vue.js'
    };
    
    return syntaxNames[syntax || ''] || syntax || 'Unknown';
  };

  // Generate language tag/badge
  const generateLanguageTag = (syntax: string | null, extension: string): string => {
    const tagMap: { [key: string]: string } = {
      'tsx': 'TypeScript/TSX',
      'jsx': 'JavaScript/JSX',
      'typescript': 'TypeScript',
      'javascript': 'JavaScript',
      'vue': 'Vue SFC'
    };
    
    return tagMap[syntax || ''] || extension.toUpperCase();
  };

  // File extension to language mapping - Only supported languages
  const fileExtensionToLanguage = {
    '.js': 'javascript',
    '.jsx': 'react', // React JSX files
    '.ts': 'typescript',
    '.tsx': 'react', // React TypeScript files
    '.php': 'php', // PHP files
    '.rb': 'ruby', // Ruby files
    '.py': 'python3',
    '.py2': 'python2',
    '.java': 'java', // Java files
    '.go': 'go',
    '.graphql': 'graphql',
    '.gql': 'graphql',
    '.sql': 'mysql', // Default SQL files to MySQL
    '.db': 'sqlite',
    '.sqlite': 'sqlite',
    '.cql': 'cassandra', // Cassandra Query Language files
    '.kt': 'kotlin',
    '.cs': 'csharp',
    '.swift': 'swift',
    '.m': 'objc',
    '.mm': 'objc',
    '.h': 'objc',
    // Frontend Framework Extensions
    '.vue': 'vue', // Vue single file components
    '.html': 'angularjs' // AngularJS HTML templates
  };

  // Enhanced two-layer framework detection system
  const detectFrontendFramework = (filename: string, content: string): string | null => {
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    
    // Layer 1: Initial Detection - Is the file JavaScript/TypeScript?
    if (extension === '.js' || extension === '.jsx' || extension === '.ts' || extension === '.tsx') {
      // Layer 2: Framework/Library Scan - Detect specific frameworks
      const framework = detectFrameworkPatterns(content);
      if (framework) return framework;
      
      // If no framework detected, return base language
      return extension.startsWith('.ts') ? 'typescript' : 'javascript';
    }
    
    if (extension === '.html' || extension === '.htm') {
      const framework = detectHTMLFrameworkPatterns(content);
      if (framework) return framework;
      return 'html';
    }
    
    if (extension === '.vue') {
      return 'vue';
    }
    
    return null;
  };

  // Enhanced framework detection with detailed pattern matching
  const detectFrameworkPatterns = (content: string): string | null => {
    // Vue Detection - Check first (most specific patterns)
    if (isVueFile(content)) {
      return 'vue';
    }
    
    // React Detection - Check second
    if (isReactFile(content)) {
      return 'react';
    }
    
    // Angular Detection - Check third for Angular-specific patterns
    if (isAngularFile(content)) {
      return 'angular';
    }
    
    // AngularJS Detection - Check fourth (after React to avoid conflicts)
    if (isAngularJSFile(content)) {
      return 'angularjs';
    }
    
    // jQuery Detection - Check last to avoid false positives
    if (isJQueryFile(content)) {
      return 'jquery';
    }
    
    return null;
  };

  // jQuery Detection with comprehensive patterns
  const isJQueryFile = (content: string): boolean => {
    // First check if this is clearly NOT jQuery (Angular/React/Vue patterns)
    if (isAngularFile(content) || isReactFile(content) || isVueFile(content)) {
      return false;
    }
    
    // Dollar sign usage patterns (more specific)
    const dollarPatterns = [
      /\$\(document\)\.ready/g,           // $(document).ready
      /\$\(['"][^'"]*['"]\)/g,           // $('selector')
      /\$\(this\)/g,                      // $(this)
      /\$\w+\./g,                         // $variable.method
    ];
    
    // jQuery-specific methods (more specific to avoid Angular conflicts)
    const jqueryMethods = [
      'ready', 'ajax', 'get', 'post', 'load',
      'fadeIn', 'fadeOut', 'slideUp', 'slideDown', 'animate',
      'append', 'prepend', 'html', 'text', 'val', 'attr', 'prop',
      'addClass', 'removeClass', 'toggleClass', 'hasClass',
      'on', 'off', 'bind', 'unbind', 'trigger',
      'each', 'map', 'filter', 'find', 'closest', 'parent', 'children',
      'css', 'width', 'height', 'offset', 'position', 'scrollTop'
    ];
    
    // Check for dollar sign patterns
    const hasDollarPatterns = dollarPatterns.some(pattern => pattern.test(content));
    
    // Check for jQuery methods (more specific patterns)
    const hasJQueryMethods = jqueryMethods.some(method => 
      new RegExp(`\\.${method}\\s*\\(`, 'g').test(content)
    );
    
    // Check for jQuery object usage
    const hasJQueryObject = /jQuery\s*\(/g.test(content);
    
    // Check for jQuery CDN or script tags
    const hasJQueryScript = /jquery\.js|jquery\.min\.js|cdn\.jquery|googleapis\.com.*jquery/i.test(content);
    
    // Check for jQuery-specific patterns that are unlikely in Angular
    const hasJQuerySpecificPatterns = /\.ready\s*\(|\.ajax\s*\(|\.fadeIn\s*\(|\.slideUp\s*\(/g.test(content);
    
    return (hasDollarPatterns || hasJQueryMethods || hasJQueryObject || hasJQueryScript) && hasJQuerySpecificPatterns;
  };

  // React Detection - More specific patterns to avoid false positives
  const isReactFile = (content: string): boolean => {
    
    // Check for Vue-specific patterns that would indicate this is NOT React
    const vueIndicators = [
      /<template>/g,
      /<script>/g,
      /<style\s+scoped>/g,
      /v-model=/g,
      /v-if=/g,
      /v-for=/g,
      /@click=/g,
      /@submit=/g,
      /setup\s*\(\s*\)\s*{/g,
      /ref\s*\(/g,
      /computed\s*\(/g,
      /onMounted\s*\(/g,
      /watch\s*\(/g,
      /export\s+default\s*{/g,
      /data\s*\(\s*\)\s*{/g,
      /methods\s*:\s*{/g
    ];
    
    const hasVueIndicators = vueIndicators.some(pattern => pattern.test(content));
    if (hasVueIndicators) {
      console.log(`🔍 React Detection: Vue indicators found, not React`);
      return false;
    }
    
    const reactPatterns = [
      // React imports - most specific
      /import\s+React\s+from\s+['"]react['"]/g,
      /import\s+.*from\s+['"]react['"]/g,
      // React hooks - very specific
      /useState\s*\(/g,
      /useEffect\s*\(/g,
      /useContext\s*\(/g,
      /useReducer\s*\(/g,
      /useMemo\s*\(/g,
      /useCallback\s*\(/g,
      // React class components
      /React\.Component/g,
      /Component\s+extends\s+React\.Component/g,
      // React functional components with JSX
      /const\s+\w+\s*=\s*\(\s*\)\s*=>\s*{[\s\S]*?<[A-Z]\w+/g,
      // React-specific JSX patterns
      /className=/g,
      // React event handlers
      /onClick=/g,
      /onChange=/g,
      /onSubmit=/g,
      /onMouseOver=/g,
      /onMouseOut=/g,
      // React-specific patterns
      /setState\s*\(/g,
      /props\./g,
      /this\.state/g,
      // React JSX elements
      /<div\s+className=/g,
      /<button\s+onClick=/g,
      /<input\s+onChange=/g
    ];
    
    // Check for React-specific JSX (more restrictive)
    const hasReactJSX = /<[A-Z]\w+[^>]*>[\s\S]*?<\/[A-Z]\w+>/g.test(content) && 
                       !content.includes('ng-') && 
                       !content.includes('v-') &&
                       !content.includes('@Component') &&
                       !content.includes('<template>') &&
                       !content.includes('<script>');
    
    // Count matching patterns
    const matchingPatterns = reactPatterns.filter(pattern => pattern.test(content));
    const hasReactPatterns = matchingPatterns.length > 0;
    
    // Debug logging
    console.log(`🔍 React Detection Debug:`, {
      hasReactPatterns,
      hasReactJSX,
      matchingPatterns: matchingPatterns.length,
      totalPatterns: reactPatterns.length,
      hasVueIndicators
    });
    
    return hasReactPatterns || hasReactJSX;
  };

  // Vue Detection - More specific patterns to avoid React conflicts
  const isVueFile = (content: string): boolean => {
    // Quick check for Vue single file component structure
    if (content.includes('<template>') && content.includes('<script>')) {
      console.log(`🔍 Vue Detection: Found Vue SFC structure`);
      return true;
    }
    
    const vuePatterns = [
      // Vue imports - most specific
      /import\s+.*from\s+['"]vue['"]/g,
      /import\s+.*from\s+['"]@vue\/composition-api['"]/g,
      // Vue 3 Composition API
      /import\s+{\s*ref\s*,?\s*computed\s*,?\s*onMounted\s*,?\s*watch\s*}\s*from\s+['"]vue['"]/g,
      /setup\s*\(\s*\)\s*{/g,
      /ref\s*\(/g,
      /computed\s*\(/g,
      /onMounted\s*\(/g,
      /watch\s*\(/g,
      // Vue 2 Options API
      /export\s+default\s*{/g,
      /data\s*\(\s*\)\s*{/g,
      /methods\s*:\s*{/g,
      /computed\s*:\s*{/g,
      /watch\s*:\s*{/g,
      /mounted\s*\(\s*\)\s*{/g,
      /created\s*\(\s*\)\s*{/g,
      // Vue template syntax - more specific patterns
      /v-model=/g,
      /v-if=/g,
      /v-for=/g,
      /v-show=/g,
      /v-on:/g,
      /@click=/g,
      /@submit=/g,
      /@change=/g,
      // Vue template interpolation - more specific
      /\{\{\s*[^}]*\s*\}\}/g,
      // Vue component patterns
      /Vue\.component/g,
      /Vue\.createApp/g,
      /Vue\.mount/g,
      // Vue single file component structure - most important
      /<template>/g,
      /<script>/g,
      /<style\s+scoped>/g,
      // Vue-specific attribute binding
      /:class=/g,
      /:disabled=/g,
      /:checked=/g,
      /:value=/g,
      // Vue directives
      /v-model/g,
      /v-if/g,
      /v-for/g,
      /v-show/g,
      /v-on:/g,
      // Vue event handlers
      /@click/g,
      /@submit/g,
      /@change/g,
      /@input/g,
      /@keyup/g,
      /@keydown/g
    ];
    
    // Count matching patterns - require multiple patterns for Vue
    const matchingPatterns = vuePatterns.filter(pattern => pattern.test(content));
    const hasVuePatterns = matchingPatterns.length > 0;
    
    // Debug logging
    console.log(`🔍 Vue Detection Debug:`, {
      hasVuePatterns,
      matchingPatterns: matchingPatterns.length,
      totalPatterns: vuePatterns.length
    });
    
    return hasVuePatterns;
  };

  // Angular Detection - More specific patterns to avoid React conflicts
  const isAngularFile = (content: string): boolean => {
    // First check if this is clearly NOT Angular (React/Vue patterns)
    if (isReactFile(content) || isVueFile(content)) {
      return false;
    }
    
    const angularPatterns = [
      // Angular decorators (most specific)
      /@Component\s*\(/g,
      /@Injectable\s*\(/g,
      /@Directive\s*\(/g,
      /@Pipe\s*\(/g,
      /@NgModule\s*\(/g,
      // Angular imports (very specific)
      /import.*from\s+['"]@angular\/core['"]/g,
      /import.*from\s+['"]@angular\/common['"]/g,
      /import.*from\s+['"]@angular\/forms['"]/g,
      /import.*from\s+['"]@angular\/router['"]/g,
      // Angular lifecycle hooks (specific)
      /ngOnInit\s*\(/g,
      /ngOnDestroy\s*\(/g,
      /ngOnChanges\s*\(/g,
      /ngAfterViewInit\s*\(/g,
      /ngAfterContentInit\s*\(/g,
      // Angular decorators (specific)
      /@Input\s*\(/g,
      /@Output\s*\(/g,
      /@ViewChild\s*\(/g,
      /@ContentChild\s*\(/g,
      // Angular services (specific)
      /HttpClient\s*\)/g,
      /FormBuilder\s*\)/g,
      /ActivatedRoute\s*\)/g,
      /Router\s*\)/g,
      // Angular template syntax (specific)
      /\*ngFor\s*=/g,
      /\*ngIf\s*=/g,
      /\[ngModel\]/g,
      /\(click\)/g,
      /\(ngModel\)/g,
      // Angular component patterns (specific)
      /export\s+class\s+\w+Component/g,
      /implements\s+OnInit/g,
      /implements\s+OnDestroy/g,
      // Angular dependency injection (specific)
      /constructor\s*\([^)]*HttpClient[^)]*\)/g,
      /constructor\s*\([^)]*FormBuilder[^)]*\)/g,
      // Angular observables (specific)
      /Observable<[^>]*>/g,
      /Subject<[^>]*>/g,
      /BehaviorSubject<[^>]*>/g,
      // Angular HTTP patterns (specific)
      /this\.http\.get\s*\(/g,
      /this\.http\.post\s*\(/g,
      /this\.http\.put\s*\(/g,
      /this\.http\.delete\s*\(/g,
      // Angular form patterns (specific)
      /FormGroup\s*\(/g,
      /FormControl\s*\(/g,
      /FormArray\s*\(/g,
      /Validators\./g
    ];
    
    // Count matching patterns - require multiple patterns for Angular
    const matchingPatterns = angularPatterns.filter(pattern => pattern.test(content));
    return matchingPatterns.length >= 2; // Require at least 2 patterns to confirm Angular
  };

  // AngularJS Detection - Enhanced patterns (more specific to avoid React conflicts)
  const isAngularJSFile = (content: string): boolean => {
    // First check if this is clearly NOT AngularJS (React/Vue/Angular patterns)
    if (isReactFile(content) || isVueFile(content) || isAngularFile(content)) {
      return false;
    }
    
    const angularJSPatterns = [
      // AngularJS directives (most specific)
      /ng-app|ng-controller|ng-model|ng-repeat|ng-if|ng-show|ng-hide|ng-click|ng-submit/g,
      // AngularJS module patterns (more specific)
      /angular\.module\s*\(/g,
      /\.controller\s*\(/g,
      /\.service\s*\(/g,
      /\.directive\s*\(/g,
      /\.factory\s*\(/g,
      /\.filter\s*\(/g,
      // AngularJS scope and services (more specific)
      /\$scope\s*[=:]/g,
      /\$rootScope\s*[=:]/g,
      /\$http\s*\./g,
      /\$timeout\s*\(/g,
      /\$interval\s*\(/g,
      /\$q\s*\./g,
      /\$route\s*\./g,
      // AngularJS script tags
      /angular\.js|angular\.min\.js|angular-1\./i,
      // AngularJS template syntax (more specific)
      /\{\{\s*[^}]*\s*\}\}/g,  // {{ variable }} interpolation
      // AngularJS routing
      /ngRoute|ui-router|angular-route/i
    ];
    
    // Require multiple patterns to be present for AngularJS detection
    const matchingPatterns = angularJSPatterns.filter(pattern => pattern.test(content));
    return matchingPatterns.length >= 2; // Require at least 2 patterns to confirm AngularJS
  };

  // HTML Framework Detection
  const detectHTMLFrameworkPatterns = (content: string): string | null => {
    if (isAngularJSFile(content)) return 'angularjs';
    if (isVueFile(content)) return 'vue';
    if (isReactFile(content)) return 'react';
    return null;
  };

  // PHP Framework Detection
  const detectPHPFramework = (filename: string, content: string): string | null => {
    console.log(`🔍 Detecting PHP framework for ${filename}`);
    
    // WordPress detection patterns
    const wordpressPatterns = [
      /wp_/,
      /get_header\(\)|get_footer\(\)|get_sidebar\(\)/,
      /the_content\(\)|the_title\(\)|the_excerpt\(\)/,
      /add_action\s*\(|add_filter\s*\(/,
      /wp-config\.php|wp-content|wp-includes/,
      /WP_Query|wp_query/,
      /\$wpdb/
    ];
    
    // Laravel detection patterns
    const laravelPatterns = [
      /use\s+Illuminate\\/,
      /Artisan::|Route::|Schema::/,
      /class\s+\w+\s+extends\s+(Controller|Model|Middleware)/,
      /@extends\s*\(|@section\s*\(|@yield\s*\(/,
      /composer\.json|artisan/,
      /App\\|config\//
    ];
    
    // Count WordPress patterns
    const wordpressMatches = wordpressPatterns.filter(pattern => pattern.test(content)).length;
    
    // Count Laravel patterns  
    const laravelMatches = laravelPatterns.filter(pattern => pattern.test(content)).length;
    
    console.log(`🔍 WordPress patterns: ${wordpressMatches}, Laravel patterns: ${laravelMatches}`);
    
    // Require at least 2 patterns to confirm framework
    if (wordpressMatches >= 2) {
      console.log(`✅ Detected WordPress (${wordpressMatches} patterns)`);
      return 'wordpress';
    }
    
    if (laravelMatches >= 2) {
      console.log(`✅ Detected Laravel (${laravelMatches} patterns)`);
      return 'laravel';
    }
    
    // If no specific framework detected, return generic PHP
    console.log(`✅ Detected generic PHP`);
    return 'php';
  };

  // Ruby Framework Detection
  const detectRubyFramework = (filename: string, content: string): string | null => {
    console.log(`🔍 Detecting Ruby framework for ${filename}`);
    
    // Rails detection patterns
    const railsPatterns = [
      /class\s+\w+\s*<\s*ApplicationController/,
      /class\s+\w+\s*<\s*ActiveRecord::Base/,
      /class\s+\w+\s*<\s*ApplicationRecord/,
      /Rails\.application/,
      /config\/routes\.rb|config\/application\.rb/,
      /ActiveRecord::|ActionController::|ActionView::/,
      /has_many|belongs_to|has_one/,
      /before_action|after_action/,
      /render\s+(json|xml|html)/,
      /redirect_to/,
      /params\[/,
      /flash\[/
    ];
    
    // Count Rails patterns
    const railsMatches = railsPatterns.filter(pattern => pattern.test(content)).length;
    
    console.log(`🔍 Rails patterns: ${railsMatches}`);
    
    // Require at least 2 patterns to confirm Rails
    if (railsMatches >= 2) {
      console.log(`✅ Detected Ruby on Rails (${railsMatches} patterns)`);
      return 'rails';
    }
    
    // If no specific framework detected, return generic Ruby
    console.log(`✅ Detected generic Ruby`);
    return 'ruby';
  };

  // Java Framework Detection
  const detectJavaFramework = (filename: string, content: string): string | null => {
    console.log(`🔍 Detecting Java framework for ${filename}`);
    
    // Spring Boot detection patterns
    const springBootPatterns = [
      /@SpringBootApplication/,
      /@RestController|@Controller/,
      /@Service|@Repository|@Component/,
      /@Autowired|@Inject/,
      /@RequestMapping|@GetMapping|@PostMapping|@PutMapping|@DeleteMapping/,
      /spring-boot-starter/,
      /SpringApplication\.run/,
      /@EnableAutoConfiguration/,
      /@ComponentScan/,
      /application\.properties|application\.yml/
    ];
    
    // Spring Framework detection patterns
    const springPatterns = [
      /@Controller|@RestController/,
      /@Service|@Repository|@Component/,
      /@Autowired|@Qualifier/,
      /@RequestMapping|@ResponseBody/,
      /ApplicationContext|BeanFactory/,
      /org\.springframework/,
      /@Configuration|@Bean/,
      /@Transactional/,
      /DispatcherServlet/
    ];
    
    // Count Spring Boot patterns
    const springBootMatches = springBootPatterns.filter(pattern => pattern.test(content)).length;
    
    // Count Spring patterns
    const springMatches = springPatterns.filter(pattern => pattern.test(content)).length;
    
    console.log(`🔍 Spring Boot patterns: ${springBootMatches}, Spring patterns: ${springMatches}`);
    
    // Require at least 2 patterns to confirm framework
    if (springBootMatches >= 2) {
      console.log(`✅ Detected Spring Boot (${springBootMatches} patterns)`);
      return 'springboot';
    }
    
    if (springMatches >= 2) {
      console.log(`✅ Detected Spring Framework (${springMatches} patterns)`);
      return 'spring';
    }
    
    // If no specific framework detected, return generic Java
    console.log(`✅ Detected generic Java`);
    return 'java';
  };

  // REST API Detection
  const detectRESTAPI = (filename: string, content: string): string | null => {
    console.log(`🔍 Detecting REST API patterns for ${filename}`);
    
    const restPatterns = [
      // Express.js REST patterns
      /app\.(get|post|put|delete|patch)\(/,
      /router\.(get|post|put|delete|patch)\(/,
      /express\.Router\(\)/,
      /@(Get|Post|Put|Delete|Patch)\(/,
      
      // Spring Boot REST patterns
      /@RestController/,
      /@RequestMapping/,
      /@GetMapping|@PostMapping|@PutMapping|@DeleteMapping/,
      /@PathVariable|@RequestParam|@RequestBody/,
      /ResponseEntity</,
      
      // ASP.NET REST patterns
      /\[HttpGet\]|\[HttpPost\]|\[HttpPut\]|\[HttpDelete\]/,
      /ApiController/,
      /IActionResult/,
      
      // Django REST patterns
      /from rest_framework/,
      /APIView|ViewSet/,
      /serializers\./,
      /@api_view/,
      
      // FastAPI patterns
      /from fastapi/,
      /@app\.(get|post|put|delete)/,
      /FastAPI\(\)/,
      
      // General REST patterns
      /\/api\/|\/v1\/|\/v2\//,
      /Content-Type.*application\/json/,
      /HTTP\/1\.|HTTP\/2/,
      /status.*200|201|404|500/
    ];
    
    const matches = restPatterns.filter(pattern => pattern.test(content)).length;
    console.log(`🔍 REST API patterns found: ${matches}`);
    
    if (matches >= 3) {
      console.log(`✅ Detected REST API (${matches} patterns)`);
      return 'rest';
    }
    
    return null;
  };

  // GraphQL Detection
  const detectGraphQL = (filename: string, content: string): string | null => {
    console.log(`🔍 Detecting GraphQL patterns for ${filename}`);
    
    const graphqlPatterns = [
      // GraphQL schema patterns
      /type\s+\w+\s*{/,
      /input\s+\w+\s*{/,
      /interface\s+\w+\s*{/,
      /union\s+\w+\s*=/,
      /enum\s+\w+\s*{/,
      /scalar\s+\w+/,
      /extend\s+type/,
      /directive\s+@\w+/,
      
      // GraphQL query/mutation patterns
      /query\s+\w*\s*{/,
      /mutation\s+\w*\s*{/,
      /subscription\s+\w*\s*{/,
      /fragment\s+\w+\s+on/,
      
      // GraphQL resolver patterns
      /resolvers\s*[:=]/,
      /Query\s*[:=]\s*{/,
      /Mutation\s*[:=]\s*{/,
      /Subscription\s*[:=]\s*{/,
      
      // GraphQL library imports
      /from ['"]graphql['"]/,
      /import.*graphql/,
      /apollo-server|@apollo\/server/,
      /graphql-yoga/,
      /type-graphql/,
      /@Resolver|@Query|@Mutation|@Subscription/,
      /@Field|@ObjectType|@InputType/,
      
      // GraphQL tools
      /buildSchema|makeExecutableSchema/,
      /GraphQLSchema|GraphQLObjectType/,
      /gql`|graphql`/,
      /useQuery|useMutation|useSubscription/,
      
      // File extensions
      /\.graphql|\.gql/
    ];
    
    const matches = graphqlPatterns.filter(pattern => pattern.test(content)).length;
    console.log(`🔍 GraphQL patterns found: ${matches}`);
    
    if (matches >= 3) {
      console.log(`✅ Detected GraphQL (${matches} patterns)`);
      return 'graphql';
    }
    
    return null;
  };

  // Database Detection
  const detectDatabase = (filename: string, content: string): string | null => {
    console.log(`🔍 Detecting database system for ${filename}`);
    
    // MySQL detection patterns
    const mysqlPatterns = [
      /CREATE TABLE.*ENGINE\s*=\s*InnoDB/i,
      /AUTO_INCREMENT/i,
      /ENGINE\s*=\s*(InnoDB|MyISAM)/i,
      /TINYINT|MEDIUMINT|BIGINT/i,
      /mysql_connect|mysqli_/i,
      /SHOW TABLES|DESCRIBE/i,
      /mysql:\/\/|jdbc:mysql/i,
      /CHARSET\s*=\s*utf8/i,
      /mysql\.createConnection/i,
      /UNSIGNED\s+(INT|INTEGER|BIGINT)/i
    ];
    
    // PostgreSQL detection patterns
    const postgresqlPatterns = [
      /SERIAL PRIMARY KEY/i,
      /SERIAL\s+PRIMARY\s+KEY/i,
      /\bSERIAL\b/i, // Any SERIAL keyword
      /JSONB/i,
      /\bREFERENCES\b/i, // Foreign key references
      /->>/i, // JSON operators
      /->/i, // JSON operators
      /ARRAY\[.*\]/i,
      /pg_connect|pg\./i,
      /postgresql:\/\/|jdbc:postgresql/i,
      /RETURNING \*/i,
      /ILIKE|SIMILAR TO/i,
      /CREATE EXTENSION/i,
      /SELECT.*FROM pg_/i,
      /CONSTRAINT.*FOREIGN KEY/i
    ];
    
    // MongoDB detection patterns
    const mongodbPatterns = [
      /db\.\w+\.find\(/i,
      /db\.\w+\.insert\(/i,
      /db\.\w+\.update\(/i,
      /db\.\w+\.aggregate\(/i,
      /ObjectId\(/i,
      /mongodb:\/\/|mongodb\+srv:\/\//i,
      /mongoose\./i,
      /MongoClient/i,
      /\$set|\$push|\$pull/i,
      /collection\./i,
      /\.toArray\(\)/i
    ];
    
    // SQLite detection patterns
    const sqlitePatterns = [
      /sqlite3\./i,
      /\.db$|\.sqlite$/i,
      /PRAGMA/i,
      /sqlite:\/\/|jdbc:sqlite/i,
      /AUTOINCREMENT/i,
      /sqlite3\.connect/i,
      /\.execute\(.*CREATE TABLE/i,
      /INTEGER PRIMARY KEY/i
    ];
    
    // Redis detection patterns
    const redisPatterns = [
      /redis\./i,
      /SET\s+\w+|GET\s+\w+/i,
      /HSET|HGET|HMSET/i,
      /LPUSH|RPUSH|LPOP/i,
      /SADD|SMEMBERS/i,
      /redis:\/\/|redis\.createClient/i,
      /EXPIRE|TTL/i,
      /ZADD|ZRANGE/i,
      /PUBLISH|SUBSCRIBE/i
    ];
    
    // Cassandra detection patterns
    const cassandraPatterns = [
      /CREATE KEYSPACE/i,
      /CREATE TABLE.*WITH/i,
      /PRIMARY KEY.*\)/i,
      /cassandra\./i,
      /cql|CQL/i,
      /SELECT.*FROM.*WHERE.*ALLOW FILTERING/i,
      /CONSISTENCY/i,
      /BATCH.*APPLY BATCH/i
    ];
    
    // DynamoDB detection patterns
    const dynamodbPatterns = [
      /dynamodb\./i,
      /aws-sdk.*DynamoDB/i,
      /putItem|getItem|updateItem/i,
      /scan\(|query\(/i,
      /AttributeValue/i,
      /TableName:/i,
      /Key:/i,
      /UpdateExpression/i,
      /ConditionExpression/i
    ];
    
    // Elasticsearch detection patterns
    const elasticsearchPatterns = [
      /"mappings"\s*:/i,
      /"properties"\s*:/i,
      /"type"\s*:\s*"(keyword|text|date|integer|float|boolean)"/i,
      /"analyzer"\s*:/i,
      /"format"\s*:\s*".*epoch_millis"/i,
      /elasticsearch\./i,
      /GET.*\/_search/i,
      /POST.*\/_doc/i,
      /PUT.*\/_mapping/i,
      /query.*match/i,
      /aggregations/i,
      /bool.*must/i,
      /index.*type/i,
      /Client\(\{.*host/i,
      /"settings"\s*:/i,
      /"number_of_shards"/i,
      /"number_of_replicas"/i
    ];
    
    // Count pattern matches for each database
    const databases = [
      { name: 'mysql', patterns: mysqlPatterns },
      { name: 'postgresql', patterns: postgresqlPatterns },
      { name: 'mongodb', patterns: mongodbPatterns },
      { name: 'sqlite', patterns: sqlitePatterns },
      { name: 'redis', patterns: redisPatterns },
      { name: 'cassandra', patterns: cassandraPatterns },
      { name: 'dynamodb', patterns: dynamodbPatterns },
      { name: 'elasticsearch', patterns: elasticsearchPatterns }
    ];
    
    let bestMatch = { name: null as string | null, matches: 0 };
    
    for (const db of databases) {
      const matches = db.patterns.filter(pattern => pattern.test(content)).length;
      console.log(`🔍 ${db.name} patterns found: ${matches}`);
      
      if (matches > bestMatch.matches && matches >= 2) {
        bestMatch = { name: db.name, matches };
      }
    }
    
    if (bestMatch.name) {
      console.log(`✅ Detected ${bestMatch.name} database (${bestMatch.matches} patterns)`);
      return bestMatch.name;
    }
    
    return null;
  };

  // Go Framework Detection
  const detectGoFramework = (filename: string, content: string): string | null => {
    console.log(`🔍 Detecting Go framework for ${filename}`);
    
    // Gin detection patterns
    const ginPatterns = [
      /gin\.Default\(\)|gin\.New\(\)/,
      /router\.GET|router\.POST|router\.PUT|router\.DELETE/,
      /gin\.Context/,
      /c\.JSON\(|c\.String\(|c\.HTML\(/,
      /gin\.H\{/,
      /github\.com\/gin-gonic\/gin/,
      /router\.Use\(/,
      /gin\.Recovery\(\)|gin\.Logger\(\)/
    ];
    
    // Echo detection patterns
    const echoPatterns = [
      /echo\.New\(\)/,
      /e\.GET|e\.POST|e\.PUT|e\.DELETE/,
      /echo\.Context/,
      /c\.JSON\(|c\.String\(|c\.HTML\(/,
      /github\.com\/labstack\/echo/,
      /e\.Use\(/,
      /middleware\./
    ];
    
    // Fiber detection patterns
    const fiberPatterns = [
      /fiber\.New\(\)/,
      /app\.Get|app\.Post|app\.Put|app\.Delete/,
      /fiber\.Ctx/,
      /c\.JSON\(|c\.SendString\(/,
      /github\.com\/gofiber\/fiber/,
      /app\.Use\(/,
      /fiber\.Map\{/
    ];
    
    // Count framework patterns
    const ginMatches = ginPatterns.filter(pattern => pattern.test(content)).length;
    const echoMatches = echoPatterns.filter(pattern => pattern.test(content)).length;
    const fiberMatches = fiberPatterns.filter(pattern => pattern.test(content)).length;
    
    console.log(`🔍 Gin patterns: ${ginMatches}, Echo patterns: ${echoMatches}, Fiber patterns: ${fiberMatches}`);
    
    // Require at least 2 patterns to confirm framework
    if (ginMatches >= 2) {
      console.log(`✅ Detected Gin (${ginMatches} patterns)`);
      return 'gin';
    }
    
    if (echoMatches >= 2) {
      console.log(`✅ Detected Echo (${echoMatches} patterns)`);
      return 'echo';
    }
    
    if (fiberMatches >= 2) {
      console.log(`✅ Detected Fiber (${fiberMatches} patterns)`);
      return 'fiber';
    }
    
    // If no specific framework detected, return generic Go
    console.log(`✅ Detected generic Go`);
    return 'go';
  };

  // Get language from file extension
  const getLanguageFromFileExtension = (filename: string, content?: string): string | null => {
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    
    // Use enhanced detection for frontend frameworks if content is available
    if (content && (extension === '.js' || extension === '.jsx' || extension === '.ts' || extension === '.tsx' || extension === '.html')) {
      const detected = detectFrontendFramework(filename, content);
      if (detected) return detected;
    }
    
    // Use enhanced detection for PHP files if content is available
    if (content && extension === '.php') {
      const detected = detectPHPFramework(filename, content);
      if (detected) return detected;
    }
    
    // Use enhanced detection for Ruby files if content is available
    if (content && extension === '.rb') {
      const detected = detectRubyFramework(filename, content);
      if (detected) return detected;
    }
    
    // Use enhanced detection for Java files if content is available
    if (content && extension === '.java') {
      const detected = detectJavaFramework(filename, content);
      if (detected) return detected;
    }
    
    // Use enhanced detection for Go files if content is available
    if (content && extension === '.go') {
      const detected = detectGoFramework(filename, content);
      if (detected) return detected;
    }
    
    // Use enhanced detection for SQL files if content is available
    if (content && extension === '.sql') {
      const detected = detectDatabase(filename, content);
      if (detected) return detected;
    }
    
    return fileExtensionToLanguage[extension as keyof typeof fileExtensionToLanguage] || null;
  };

  // Validate if selected language matches file type - More flexible validation
  const validateFileLanguageMatch = (filename: string, selectedLanguage: string, content?: string): boolean => {
    console.log(`🔍 Validating file: ${filename}, selected: ${selectedLanguage}, has content: ${!!content}`);
    
      const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    
    // Define flexible mapping - allow multiple valid options per file type
    const flexibleValidation: { [key: string]: string[] } = {
      '.tsx': ['react-ts', 'react-js', 'typescript', 'react'], // TSX files can be any React variant or TypeScript
      '.jsx': ['react-js', 'react-ts', 'javascript', 'react'], // JSX files can be any React variant or JavaScript
      '.ts': ['typescript', 'react-ts', 'angular', 'nestjs', 'rest', 'graphql'], // TS files can be TypeScript, React with TS, Angular, NestJS, or API paradigms
      '.js': ['javascript', 'react-js', 'jquery', 'angularjs', 'nodejs', 'express', 'serverless', 'rest', 'graphql', 'mongodb', 'redis'], // JS files can be various JS variants, Node.js, API paradigms, or database systems
      '.vue': ['vue'], // Vue files must be Vue
      '.php': ['php', 'wordpress', 'laravel'], // PHP files can be general PHP, WordPress, or Laravel
      '.rb': ['ruby', 'rails'], // Ruby files can be general Ruby or Rails
      '.py': ['python2', 'python3', 'django', 'flask', 'rest', 'graphql'], // Python files can be Python versions, frameworks, or API paradigms
      '.java': ['java', 'spring', 'springboot', 'rest', 'graphql'], // Java files can be general Java, Spring, Spring Boot, or API paradigms
      '.go': ['go', 'gin', 'echo', 'fiber', 'rest', 'graphql'], // Go files can be general Go, Go frameworks, or API paradigms
      '.graphql': ['graphql'], // GraphQL schema files
      '.gql': ['graphql'], // GraphQL query files
      '.kt': ['kotlin'],
      '.cs': ['csharp'],
      '.swift': ['swift'],
      '.m': ['objc'],
      '.html': ['angularjs', 'jquery'],
      // Database files
      '.sql': ['mysql', 'postgresql', 'sqlite'], // SQL files can be MySQL, PostgreSQL, or SQLite
      '.json': ['mongodb', 'elasticsearch'], // JSON files can be MongoDB or Elasticsearch
      '.db': ['sqlite'], // DB files are SQLite
      '.sqlite': ['sqlite'], // SQLite files
      '.cql': ['cassandra'], // Cassandra Query Language files
    };
    
    const validOptions = flexibleValidation[extension];
    if (!validOptions) {
      console.log(`⚠️ Unknown file extension ${extension}, allowing validation to pass`);
      return true; // Allow unknown extensions
    }
    
    
    const isValid = validOptions.includes(selectedLanguage);
    console.log(`✅ Flexible validation: ${extension} allows [${validOptions.join(', ')}], selected: ${selectedLanguage} = ${isValid}`);
    return isValid;
  };

  // Valid language migration pairs - Smart conversions based on detected React variant
  const validMigrationPairs = {
    'javascript': ['typescript'],
    'typescript': ['javascript'],
    'python2': ['python3'],
    'python3': ['python2'],
    'kotlin': ['java'],
    'objc': ['swift'],
    'swift': ['objc'],
    'csharp': ['java'],
    // Frontend Framework Migrations with specific React variants
    'jquery': ['react-js', 'react-ts', 'vue', 'angular'], // jQuery to modern frameworks
    'react-js': ['react-ts', 'vue', 'angular'], // React with JS → React with TS, or other frameworks
    'react-ts': ['react-js', 'vue', 'angular'], // React with TS → React with JS, or other frameworks
    'vue': ['react-js', 'react-ts', 'angular'], // Vue to React variants or Angular
    'angular': ['react-js', 'react-ts', 'vue'], // Angular to React variants or Vue
    'angularjs': ['react-js', 'react-ts', 'vue', 'angular'], // AngularJS to modern frameworks
    
    // Backend Platform Migrations
    'php': ['nodejs', 'express', 'nestjs'], // PHP to Node.js ecosystems
    'wordpress': ['nodejs', 'express', 'nestjs'], // WordPress to Node.js frameworks
    'laravel': ['nodejs', 'express', 'nestjs'], // Laravel to Node.js frameworks
    'nodejs': ['php', 'laravel', 'nestjs', 'express', 'django', 'flask'], // Node.js to other backends or frameworks
    'express': ['nestjs', 'laravel', 'nodejs', 'django', 'flask'], // Express to other frameworks
    'nestjs': ['express', 'laravel', 'nodejs', 'django', 'flask'], // NestJS to other frameworks
    
    // Ruby Platform Migrations
    'ruby': ['python3', 'nodejs', 'django', 'flask'], // Ruby to Python/Node.js
    'rails': ['django', 'flask', 'nodejs', 'express', 'nestjs'], // Rails to Python/Node.js frameworks
    
    // Python Platform Migrations
    'django': ['rails', 'nodejs', 'express', 'nestjs', 'flask'], // Django to other frameworks
    'flask': ['rails', 'nodejs', 'express', 'nestjs', 'django'], // Flask to other frameworks
    
    // Java Platform Migrations
    'java': ['go', 'nodejs', 'gin', 'echo', 'fiber', 'express', 'nestjs'], // Java to Go/Node.js
    'spring': ['go', 'gin', 'echo', 'fiber', 'nodejs', 'express', 'nestjs'], // Spring to Go/Node.js frameworks
    'springboot': ['go', 'gin', 'echo', 'fiber', 'nodejs', 'express', 'nestjs'], // Spring Boot to Go/Node.js frameworks
    
    // Go Platform Migrations
    'go': ['java', 'spring', 'springboot', 'nodejs', 'express', 'nestjs'], // Go to Java/Node.js
    'gin': ['java', 'spring', 'springboot', 'express', 'nestjs', 'echo', 'fiber'], // Gin to other frameworks
    'echo': ['java', 'spring', 'springboot', 'express', 'nestjs', 'gin', 'fiber'], // Echo to other frameworks
    'fiber': ['java', 'spring', 'springboot', 'express', 'nestjs', 'gin', 'echo'], // Fiber to other frameworks
    
    // API Paradigm Migrations
    'rest': ['graphql'], // REST API to GraphQL
    'graphql': ['rest'], // GraphQL to REST API
    
    // Database Migrations
    'mysql': ['postgresql', 'mongodb', 'sqlite', 'dynamodb'], // MySQL to other databases
    'postgresql': ['mysql', 'mongodb', 'sqlite', 'dynamodb'], // PostgreSQL to other databases
    'mongodb': ['mysql', 'postgresql', 'sqlite', 'dynamodb'], // MongoDB to SQL/other NoSQL
    'sqlite': ['mysql', 'postgresql', 'mongodb'], // SQLite to other databases
    'redis': ['mongodb', 'dynamodb', 'cassandra'], // Redis to document/wide-column stores
    'cassandra': ['mongodb', 'dynamodb', 'postgresql'], // Cassandra to other databases
    'dynamodb': ['mongodb', 'mysql', 'postgresql'], // DynamoDB to other databases
    'elasticsearch': ['mongodb', 'postgresql', 'mysql'], // Elasticsearch to other databases
  };

  // Validate if migration pair is valid
  const isValidMigrationPair = (from: string, to: string): boolean => {
    if (from === to) return false; // Same language
    const validTargets = validMigrationPairs[from as keyof typeof validMigrationPairs];
    return validTargets ? validTargets.includes(to) : false;
  };

  // Enhanced language options with tags - Specific React variants based on detection
  const languageOptions: LanguageOption[] = [
    { value: 'javascript', label: 'JavaScript', tag: 'JS' },
    { value: 'typescript', label: 'TypeScript', tag: 'TS' },
    { value: 'react-js', label: 'React with JavaScript', tag: 'JSX', isFramework: true },
    { value: 'react-ts', label: 'React with TypeScript', tag: 'TSX', isFramework: true },
    { value: 'vue', label: 'Vue.js', tag: 'SFC', isFramework: true },
    { value: 'angular', label: 'Angular', tag: 'TS', isFramework: true },
    { value: 'angularjs', label: 'AngularJS', tag: 'JS', isFramework: true },
    { value: 'jquery', label: 'jQuery', tag: 'JS', isFramework: true },
    
    // Backend Platform Languages
    { value: 'php', label: 'PHP', tag: 'PHP', description: 'General PHP code' },
    { value: 'wordpress', label: 'WordPress', tag: 'PHP', description: 'WordPress themes/plugins', isFramework: true },
    { value: 'laravel', label: 'Laravel', tag: 'PHP', description: 'Laravel framework', isFramework: true },
    { value: 'nodejs', label: 'Node.js', tag: 'JS', description: 'Node.js backend', isFramework: true },
    { value: 'express', label: 'Express.js', tag: 'JS', description: 'Express framework', isFramework: true },
    { value: 'nestjs', label: 'NestJS', tag: 'TS', description: 'NestJS framework', isFramework: true },
    
    // Ruby Platform Languages
    { value: 'ruby', label: 'Ruby', tag: 'RB', description: 'General Ruby code' },
    { value: 'rails', label: 'Ruby on Rails', tag: 'RB', description: 'Rails framework', isFramework: true },
    
    // Python Platform Languages  
    { value: 'django', label: 'Django', tag: 'PY', description: 'Django framework', isFramework: true },
    { value: 'flask', label: 'Flask', tag: 'PY', description: 'Flask framework', isFramework: true },
    
    // Java Platform Languages
    { value: 'java', label: 'Java', tag: 'JAVA', description: 'General Java code' },
    { value: 'spring', label: 'Spring Framework', tag: 'JAVA', description: 'Spring framework', isFramework: true },
    { value: 'springboot', label: 'Spring Boot', tag: 'JAVA', description: 'Spring Boot framework', isFramework: true },
    
    // Go Platform Languages
    { value: 'go', label: 'Go', tag: 'GO', description: 'Go programming language' },
    { value: 'gin', label: 'Gin', tag: 'GO', description: 'Gin web framework', isFramework: true },
    { value: 'echo', label: 'Echo', tag: 'GO', description: 'Echo web framework', isFramework: true },
    { value: 'fiber', label: 'Fiber', tag: 'GO', description: 'Fiber web framework', isFramework: true },
    
    // API Paradigms
    { value: 'rest', label: 'REST API', tag: 'REST', description: 'RESTful web services', isFramework: true },
    { value: 'graphql', label: 'GraphQL', tag: 'GQL', description: 'GraphQL query language and runtime', isFramework: true },
    
    // Database Systems
    { value: 'mysql', label: 'MySQL', tag: 'SQL', description: 'MySQL relational database', isFramework: true },
    { value: 'postgresql', label: 'PostgreSQL', tag: 'SQL', description: 'PostgreSQL relational database', isFramework: true },
    { value: 'mongodb', label: 'MongoDB', tag: 'NoSQL', description: 'MongoDB document database', isFramework: true },
    { value: 'sqlite', label: 'SQLite', tag: 'SQL', description: 'SQLite embedded database', isFramework: true },
    { value: 'redis', label: 'Redis', tag: 'KV', description: 'Redis key-value store', isFramework: true },
    { value: 'cassandra', label: 'Cassandra', tag: 'NoSQL', description: 'Apache Cassandra wide-column database', isFramework: true },
    { value: 'dynamodb', label: 'DynamoDB', tag: 'NoSQL', description: 'Amazon DynamoDB document database', isFramework: true },
    { value: 'elasticsearch', label: 'Elasticsearch', tag: 'SEARCH', description: 'Elasticsearch search engine', isFramework: true },
    
    { value: 'python2', label: 'Python 2', tag: 'PY2' },
    { value: 'python3', label: 'Python 3', tag: 'PY3' },
    { value: 'kotlin', label: 'Kotlin', tag: 'KT' },
    { value: 'objc', label: 'Objective-C', tag: 'OBJC' },
    { value: 'swift', label: 'Swift', tag: 'SWIFT' },
    { value: 'csharp', label: 'C#', tag: 'CS' }
  ];

  // Get language option by value
  const getLanguageOption = (value: string): LanguageOption | undefined => {
    return languageOptions.find(option => option.value === value);
  };

  // Render language option with tag (currently unused but available for future enhancements)
  const renderLanguageOption = (option: LanguageOption, isSelected: boolean = false) => {
    return (
      <div className="flex items-center justify-between w-full">
        <span className={isSelected ? 'font-medium' : ''}>{option.label}</span>
        {option.tag && (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            isSelected 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-gray-100 text-gray-600'
          }`}>
            {option.tag}
          </span>
        )}
      </div>
    );
  };
  
  // Suppress unused variable warning for now
  void renderLanguageOption;

  // Handle single file upload
  const handleSingleFileUpload = async (file: File) => {
    try {
      setUploadCompleted(false);
      setChunkingCompleted(false);
      setShowConversion(false);
      setUserHasSelectedLanguages(false); // Reset for new file upload
      
      toast.loading('Uploading file...', { id: 'upload' });
      
      // Read file content for language detection
      const fileContent = await file.text();
      
      // Call the actual upload API
      const response = await apiService.uploadSingleFileToCloudinary(file);
      
      if (response.success) {
        toast.success('File uploaded successfully!', { id: 'upload' });
        setUploadCompleted(true);
        
      // Store uploaded filename for validation
      setUploadedFilename(file.name);
      
      // Store file content for validation
      setOriginalFiles({ [file.name]: fileContent });
      
      // Auto-detect language and set target
      console.log('🔍 File content preview:', fileContent.substring(0, 200));
      detectLanguageAndSetTarget(file.name, fileContent);
        
        // Store the session ID for migration
        console.log('Single file upload response:', response);
        console.log('Response data structure:', JSON.stringify(response.data, null, 2));
        
        if (response.data.job?.sessionId) {
          setCurrentSessionId(response.data.job.sessionId);
          console.log('✅ Stored session ID for single file migration:', response.data.job.sessionId);
        } else {
          console.log('❌ No session ID found in job:', response.data.job);
          // Try to extract session ID from the file data if available
          if (response.data.file?.sessionId) {
            setCurrentSessionId(response.data.file.sessionId);
            console.log('✅ Stored session ID from file data:', response.data.file.sessionId);
          } else {
            // Fallback: generate a session ID for single file
            const fallbackSessionId = `single-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            setCurrentSessionId(fallbackSessionId);
            console.log('⚠️ Generated fallback session ID:', fallbackSessionId);
          }
        }
        
        // Automatically proceed to conversion after upload
        toast.success('File uploaded successfully!', { id: 'chunking' });
        setUploadCompleted(true);
        setChunkingCompleted(true);
        setShowConversion(true);
        
      } else {
        throw new Error(response.message || 'Upload failed');
      }
      
    } catch (error: any) {
      toast.error(error.message || 'Upload failed. Please try again.');
      console.error('Upload error:', error);
    }
  };

  // Handle ZIP file upload
  const handleZipUpload = async (file: File, abortController: AbortController) => {
    try {
      setUploadCompleted(false);
      setChunkingCompleted(false);
      setShowConversion(false);
      setUserHasSelectedLanguages(false); // Reset for new file upload
      
      toast.loading('Uploading ZIP file...', { id: 'upload' });
      
      // Call the actual upload API
      const response = await apiService.uploadZipToCloudinary(file, abortController);
      
      console.log('ZIP upload response:', response);
      
      if (response.success) {
        toast.success('ZIP file uploaded successfully!', { id: 'upload' });
        setUploadCompleted(true);
        
        // Auto-detect language from first file in ZIP (if available)
        if (response.data.files && response.data.files.length > 0) {
          const firstFile = response.data.files[0];
          detectLanguageAndSetTarget(firstFile.filename, firstFile.content || '');
        }
        
        // Store the session ID for migration
        if (response.data.sessionId) {
          setCurrentSessionId(response.data.sessionId);
          console.log('Stored session ID for migration:', response.data.sessionId);
        }
        
        // Automatically proceed to conversion after upload
        toast.success('ZIP file uploaded successfully!', { id: 'chunking' });
        setUploadCompleted(true);
        setChunkingCompleted(true);
        setShowConversion(true);
        
      } else {
        throw new Error(response.message || 'ZIP upload failed');
      }
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('ZIP upload cancelled by user');
        toast.error('ZIP upload was cancelled');
      } else {
        toast.error(error.message || 'ZIP upload failed. Please try again.');
        console.error('ZIP upload error:', error);
      }
    }
  };

  // Handle conversion
  const handleConversion = async () => {
    try {
      // Validate file type matches selected language
      if (uploadedFilename && !validateFileLanguageMatch(uploadedFilename, fromLanguage, originalFiles[uploadedFilename])) {
        const detectedLanguage = getLanguageFromFileExtension(uploadedFilename, originalFiles[uploadedFilename]);
        toast.error(`File type mismatch. Your file (${uploadedFilename}) is detected as ${detectedLanguage}, but you selected ${fromLanguage}. Please select the correct source language.`, {
          duration: 5000,
          icon: '❌'
        });
        return;
      }

      // Validate migration pair before starting conversion
      if (!isValidMigrationPair(fromLanguage, toLanguage)) {
        toast.error(`Cannot migrate from ${fromLanguage} to ${toLanguage}. Please select a compatible language pair.`, {
          duration: 5000,
          icon: '❌'
        });
        return;
      }

      setIsConverting(true);
      toast.loading('Converting code... This may take up to 3 minutes for complex migrations.', { 
        id: 'conversion',
        duration: 180000 // 3 minutes
      });
      
      // Use the real session ID from the upload process
      const realSessionId = currentSessionId || 'zip-1758961649380-68802455121c6ac3'; // Use stored session ID or fallback for testing
      
      console.log('🔍 Migration Debug Info:');
      console.log('  - currentSessionId:', currentSessionId);
      console.log('  - realSessionId:', realSessionId);
      console.log('  - fromLanguage:', fromLanguage);
      console.log('  - toLanguage:', toLanguage);
      
      // Wait for chunks to be ready before proceeding with migration
      console.log('🔍 Waiting for chunks to be ready...');
      
      if (!realSessionId) {
        toast.error('No session ID available. Please upload files first.');
        return;
      }
      
      console.log('Using session ID for migration:', realSessionId);
      console.log('Current session ID state:', currentSessionId);
      console.log('Upload completed:', uploadCompleted);
      console.log('Chunking completed:', chunkingCompleted);
      console.log('Active tab:', activeTab);
      console.log('Show conversion:', showConversion);
      
      // Poll for chunks to be ready
      let chunksReady = false;
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds max wait
      
      while (!chunksReady && attempts < maxAttempts) {
        try {
          console.log(`🔍 Checking chunks readiness (attempt ${attempts + 1}/${maxAttempts})...`);
          
          // Check if chunks are ready by calling a simple API endpoint
          const chunksResponse = await fetch(`http://localhost:3000/api/migrate/chunks-status/${realSessionId}?t=${Date.now()}`);
          const chunksData = await chunksResponse.json();
          
          if (chunksData.success && chunksData.chunksCount > 0) {
            console.log(`✅ Chunks are ready! Found ${chunksData.chunksCount} chunks`);
            chunksReady = true;
            break;
          }
          
          console.log(`⏳ Chunks not ready yet, waiting 1 second... (${chunksData.chunksCount || 0} chunks found)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
          
        } catch (error) {
          console.log('⚠️ Error checking chunks status:', error);
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
        }
      }
      
      if (!chunksReady) {
        console.log('⚠️ Chunks not ready after 30 seconds, proceeding anyway...');
        toast('Chunks may not be fully ready, but proceeding with migration...', { 
          duration: 5000 
        });
      }
      
      try {
        // Call the enhanced migration API with fromLang/toLang
        const response = await apiService.processMigrationWithLanguages(
          realSessionId, 
          fromLanguage, 
          toLanguage
        );
        
        if (response.success) {
          toast.success(`Code converted from ${fromLanguage} to ${toLanguage}!`, { id: 'conversion' });
          console.log('✅ Migration successful!');
          console.log('Complete response:', JSON.stringify(response, null, 2));
          console.log('Migration result:', response.data);
          console.log('Response metadata:', response.metadata);
          console.log('Generated command:', response.metadata?.command);
          console.log('Chunks used:', response.metadata?.chunksUsed);
          console.log('Is demo:', response.data.isDemo);
          
          console.log('🔍 Setting migration result and showing results...');
          
          // Direct test of the response structure
          console.log('🔍 Response Structure Test:');
          console.log('  - response.success:', response.success);
          console.log('  - response.data:', typeof response.data);
          console.log('  - response.metadata:', typeof response.metadata);
          console.log('  - response.data.isDemo:', response.data.isDemo);
          console.log('  - response.metadata.chunksUsed:', response.metadata?.chunksUsed);
          
          // Store the migration result and show it
          console.log('🔍 About to set migration result:', response.data);
          console.log('🔍 Response data type:', typeof response.data);
          console.log('🔍 Response data keys:', response.data ? Object.keys(response.data) : 'null/undefined');
          setMigrationResult(response.data);
          console.log('🔍 Migration result set, checking state...');
          
          // Fetch original file contents for diff viewing
          try {
            const originalFilesResponse = await apiService.getOriginalFiles(realSessionId);
            if (originalFilesResponse.success) {
              setOriginalFiles(originalFilesResponse.data);
            } else {
              // Fallback to empty files if fetch fails
              const originalFilesMap: { [key: string]: string } = {};
              if (response.data.files) {
                response.data.files.forEach((file: any) => {
                  originalFilesMap[file.filename] = '';
                });
              }
              setOriginalFiles(originalFilesMap);
            }
          } catch (error) {
            console.log('Could not fetch original files, using empty placeholders');
            const originalFilesMap: { [key: string]: string } = {};
            if (response.data.files) {
              response.data.files.forEach((file: any) => {
                originalFilesMap[file.filename] = '';
              });
            }
            setOriginalFiles(originalFilesMap);
          }
          
          setShowResults(true);
          setIsConverted(true);
          console.log('✅ Results should now be visible!');
          console.log('showResults:', true);
          console.log('isConverted:', true);
          console.log('migrationResult:', response.data);
          console.log('migrationResult type:', typeof response.data);
          console.log('migrationResult files:', response.data?.files?.length || 'no files');
        } else {
          toast.error(response.message || 'Conversion failed');
        }
      } catch (apiError: any) {
        // If API fails, show a demo message
        console.log('Migration API not available, showing demo:', apiError.message);
        
        // Check if it's a timeout error
        if (apiError.message.includes('timeout') || apiError.message.includes('ECONNABORTED')) {
          toast.error('Migration request timed out. The server may be processing a large file. Please try again with a smaller file.', { 
            id: 'conversion',
            duration: 5000
          });
        } else {
        toast.success(`Demo: Code converted from ${fromLanguage} to ${toLanguage}!`, { id: 'conversion' });
        }
        
        // Show demo results
        const demoResult = {
          migratedCode: `// Demo migration from ${fromLanguage} to ${toLanguage}\nconsole.log("Hello World");`,
          summary: `Demo migration from ${fromLanguage} to ${toLanguage}`,
          changes: [
            `Converted from ${fromLanguage} to ${toLanguage}`,
            'Added type annotations',
            'Updated syntax'
          ],
          files: [{
            filename: 'demo.js',
            migratedFilename: 'demo.ts',
            content: `// Demo migration from ${fromLanguage} to ${toLanguage}\nconsole.log("Hello World");`
          }],
          isDemo: true
        };
        
        setMigrationResult(demoResult);
        setOriginalFiles({ 'demo.js': 'console.log("Hello World");' });
        setShowResults(true);
        console.log('✅ Demo results should now be visible!');
        console.log('showResults:', true);
        console.log('demoResult:', demoResult);
      }
      
    } catch (error) {
      toast.error('Conversion failed. Please try again.');
      console.error('Conversion error:', error);
    } finally {
      setIsConverting(false);
    }
  };

  // Initialize user data from JWT token
  useEffect(() => {
    let isMounted = true;
    let timeoutId: number;

    const initializeUser = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Add timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Initialization timeout')), 10000)
        );

        // Check if user is authenticated by trying to get their files
        // This will validate the JWT token
        await Promise.race([
          apiService.getUserFiles(),
          timeoutPromise
        ]);
        
        if (isMounted) {
          // If we can get files, the user is authenticated
          // We can extract userId from the token or use a simple approach
          setUserId('authenticated-user'); // Simplified - we know user is authenticated
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to initialize user:', err);
          // Don't show error for timeout or network issues, just proceed
          if (err instanceof Error && err.message !== 'Initialization timeout') {
          setError('Please log in to access the migration dashboard');
          }
          // Set a default user ID to allow the app to work
          setUserId('default-user');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeUser();

    // Fallback timeout to ensure loading never gets stuck
    timeoutId = setTimeout(() => {
      if (isMounted) {
        console.warn('Initialization timeout - forcing loading to stop');
        setIsLoading(false);
        setUserId('default-user');
      }
    }, 15000); // 15 seconds total fallback

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  // Cleanup effect - trigger cleanup when leaving migration page
  useEffect(() => {
    return () => {
      // This cleanup function runs when the component unmounts
      // (i.e., when user navigates away from migration page)
      console.log('🧹 Migration page unmounting - triggering cleanup');
      cleanupService.cleanupOnAppNavigationSync();
    };
  }, []);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading migration dashboard...</p>
        </div>
      </div>
    );
  }


  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.href = '/login'} 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Show migration dashboard when user is ready
  if (userId) {
    return (
      <div className="min-h-screen bg-gray-50">
      {/* Enhanced dropdown styling */}
      <style>{`
        select option {
          color: #1F2937 !important;
          background-color: white !important;
          padding: 8px 12px;
        }
        select option:hover {
          background-color: #F3F4F6 !important;
        }
        select option[style*="bold"] {
          font-weight: bold !important;
        }
        select option[style*="#059669"] {
          color: #059669 !important;
          background-color: #F0FDF4 !important;
        }
      `}</style>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Code Migration</h1>
                <p className="text-gray-600">
              Upload your code files and convert them to different programming languages
            </p>
              </div>
            </div>
          </div>

          {/* Step Progress Indicator */}
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-center">
                {/* Step 1: Upload */}
                <div className="flex items-center">
                  <div className={`flex items-center space-x-3 px-6 py-3 rounded-lg ${
                    uploadCompleted ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      uploadCompleted ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
                    }`}>
                      ↑
                </div>
                    <span className="font-semibold">Upload</span>
                    {uploadCompleted && <CheckCircle className="h-5 w-5 text-green-500" />}
                  </div>
              </div>
              
                {/* Arrow */}
                <div className="mx-4">
                  <ArrowRight className="h-6 w-6 text-gray-400" />
                </div>

                {/* Step 2: Convert */}
                <div className="flex items-center">
                  <div className={`flex items-center space-x-3 px-6 py-3 rounded-lg ${
                    isConverted ? 'bg-green-100 text-green-800' : 
                    isConverting ? 'bg-blue-100 text-blue-800' : 
                    showConversion ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      isConverted ? 'bg-green-500 text-white' :
                      isConverting ? 'bg-blue-500 text-white' :
                      showConversion ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'
                    }`}>
                      →
              </div>
                    <span className="font-semibold">Convert</span>
                    {isConverting && <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />}
                    {isConverted && <CheckCircle className="h-5 w-5 text-green-500" />}
            </div>
          </div>

                {/* Arrow */}
                <div className="mx-4">
                  <ArrowRight className="h-6 w-6 text-gray-400" />
                </div>

                {/* Step 3: Result */}
                <div className="flex items-center">
                  <div className={`flex items-center space-x-3 px-6 py-3 rounded-lg ${
                    isConverted ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      isConverted ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
                    }`}>
                      ✓
                    </div>
                    <span className="font-semibold">Result</span>
                    {isConverted && <CheckCircle className="h-5 w-5 text-green-500" />}
                  </div>
                </div>
              </div>
            </div>
          </div>


          {/* Upload Tabs */}
          {!showConversion && !isConverted && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {/* Tab Headers */}
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8 px-6">
                  <button
                    onClick={() => setActiveTab('single')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'single'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <FileText className="w-5 h-5" />
                      <span>Single File</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('zip')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'zip'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Archive className="w-5 h-5" />
                      <span>ZIP File</span>
                    </div>
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'single' ? (
                  <SingleFileCloudinaryUpload onUpload={handleSingleFileUpload} />
                ) : (
                  <ZipUpload onZipUpload={handleZipUpload} onClearZip={() => {}} />
                )}
              </div>
            </div>
          )}

          {/* Conversion Section */}
          {showConversion && !isConverted && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Code Conversion</h2>
                <p className="text-gray-600">
                  Your files have been processed and chunked. Now choose the conversion settings.
                </p>
              </div>

              <div className="max-w-2xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {/* From Language */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                      From Language
                    </label>
                      {detectedLanguageInfo && (
                        <button
                          onClick={() => setShowDetectionDetails(!showDetectionDetails)}
                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                        >
                          <Tag className="w-3 h-3" />
                          <span>Auto-detected</span>
                        </button>
                      )}
                    </div>
                    
                    {/* Detection Details */}
                    {detectedLanguageInfo && showDetectionDetails && (
                      <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-blue-900">
                              {detectedLanguageInfo.displayName}
                            </p>
                            <p className="text-xs text-blue-700">
                              Confidence: {Math.round(detectedLanguageInfo.confidence * 100)}%
                            </p>
                          </div>
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {detectedLanguageInfo.tag}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <div className="relative">
                    <select
                      value={fromLanguage}
                      onChange={(e) => {
                        const newFromLanguage = e.target.value;
                        
                          // More flexible validation - warn but allow user choice
                        if (uploadedFilename && !validateFileLanguageMatch(uploadedFilename, newFromLanguage, originalFiles[uploadedFilename])) {
                            toast(`Note: Your file (${uploadedFilename}) may not match ${newFromLanguage}. You can still proceed if you're sure.`, {
                              duration: 4000,
                              icon: '⚠️',
                              style: {
                                background: '#FEF3C7',
                                color: '#92400E',
                                border: '1px solid #F59E0B'
                              }
                            });
                        }
                        
                        setFromLanguage(newFromLanguage);
                        setUserHasSelectedLanguages(true);
                      }}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 appearance-none text-gray-900 bg-white"
                    >
                      {languageOptions.map((option) => {
                          const isAutoDetected = detectedLanguageInfo?.primary === option.value;
                        return (
                          <option 
                            key={option.value} 
                            value={option.value}
                            style={{ 
                                fontWeight: isAutoDetected ? 'bold' : 'normal',
                                color: isAutoDetected ? '#059669' : '#1F2937', // Darker color for better visibility
                                backgroundColor: isAutoDetected ? '#F0FDF4' : 'white'
                            }}
                          >
                              {isAutoDetected ? '🎯 ' : ''}{option.label} {option.tag ? `(${option.tag})` : ''} {isAutoDetected ? ' - Auto-detected' : ''}
                        </option>
                        );
                      })}
                    </select>
                      
                      {/* Selected language tag */}
                      {(() => {
                        const selectedOption = getLanguageOption(fromLanguage);
                        return selectedOption?.tag ? (
                          <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                              {selectedOption.tag}
                            </span>
                          </div>
                        ) : null;
                      })()} 
                    </div>
                  </div>

                  {/* To Language */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      To Language
                    </label>
                    <div className="relative">
                    <select
                      value={toLanguage}
                      onChange={(e) => {
                        setToLanguage(e.target.value);
                        setUserHasSelectedLanguages(true);
                      }}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 appearance-none text-gray-900 bg-white"
                    >
                      {languageOptions
                        .filter((option) => option.value !== fromLanguage) // Don't show same language
                        .map((option) => {
                            const isRecommended = isValidMigrationPair(fromLanguage, option.value);
                          return (
                            <option 
                              key={option.value} 
                              value={option.value}
                              style={{ 
                                  fontWeight: isRecommended ? 'bold' : 'normal',
                                  color: isRecommended ? '#059669' : '#1F2937', // Darker color for better visibility
                                  backgroundColor: isRecommended ? '#F0FDF4' : 'white'
                              }}
                            >
                                {isRecommended ? '⭐ ' : ''}{option.label} {option.tag ? `(${option.tag})` : ''} {isRecommended ? ' - Recommended' : ''}
                        </option>
                          );
                        })}
                    </select>
                      
                      {/* Selected language tag */}
                      {(() => {
                        const selectedOption = getLanguageOption(toLanguage);
                        return selectedOption?.tag ? (
                          <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-600">
                              {selectedOption.tag}
                            </span>
                      </div>
                        ) : null;
                      })()} 
                        </div>
                      </div>
                    </div>


                {/* Convert Button */}
                <div className="text-center">
                  <button
                    onClick={handleConversion}
                    disabled={isConverting || fromLanguage === toLanguage}
                    className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white ${
                      isConverting || fromLanguage === toLanguage
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                    }`}
                  >
                    {isConverting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Converting...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-5 h-5 mr-2" />
                        Convert Code
                      </>
                    )}
                  </button>
                  
                  {fromLanguage === toLanguage && (
                    <p className="mt-2 text-sm text-gray-500">
                      Please select different source and target languages
                    </p>
                  )}
                </div>

                {/* Start Over Button */}
                <div className="mt-6 text-center">
                  <button
                    onClick={() => {
                      setUploadCompleted(false);
                      setChunkingCompleted(false);
                      setShowConversion(false);
                      setActiveTab('single');
                    }}
                    className="text-gray-500 hover:text-gray-700 text-sm underline"
                  >
                    Start Over
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: RESULTS SECTION - Only appears after conversion is complete */}
          {console.log('🔍 Results Section Check - showResults:', showResults, 'migrationResult:', !!migrationResult, 'isConverted:', isConverted)}
          {isConverted && migrationResult && (
            <div className="mt-16">
              {/* Results Content - Direct display without extra sections */}
              <div className="bg-white rounded-lg shadow-lg border border-gray-200">
                {/* Results Header */}
                <div className="p-6 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <CheckCircle className="h-8 w-8 text-green-500" />
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">Migration Complete</h3>
                        <p className="text-gray-600">
                          Successfully migrated from {fromLanguage} to {toLanguage}
                        </p>
                      </div>
                      {migrationResult.isDemo && (
                        <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                          Demo Mode
                        </span>
                      )}
                    </div>
                    
                    <button
                      onClick={() => {
                        setUploadCompleted(false);
                        setChunkingCompleted(false);
                        setShowConversion(false);
                        setShowResults(false);
                        setIsConverting(false);
                        setIsConverted(false);
                        setMigrationResult(null);
                        setActiveTab('single');
                      }}
                      className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Start New Migration
                    </button>
                  </div>
                </div>

                {/* Side-by-Side Results */}
                <div>
            <InlineMigrationResults
              result={migrationResult}
              originalFiles={originalFiles}
              onStartOver={() => {
                setUploadCompleted(false);
                setChunkingCompleted(false);
                setShowConversion(false);
                setShowResults(false);
                      setIsConverting(false);
                      setIsConverted(false);
                setMigrationResult(null);
                setActiveTab('single');
              }}
            />
                </div>
              </div>
            </div>
          )}
          
        </div>
      </div>
    );
  }

  // Fallback state
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600">Preparing migration environment...</p>
      </div>
    </div>
  );
};

export default MigrationPage;