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
    } else if (extension === 'java') {
      setFromLanguage('java');
      setToLanguage('kotlin');
      detectedFrom = 'Java';
      detectedTo = 'Kotlin';
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
        'vue': 'vue'
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
    '.py': 'python3',
    '.py2': 'python2',
    '.java': 'java',
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

  // Get language from file extension
  const getLanguageFromFileExtension = (filename: string, content?: string): string | null => {
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    
    // Use enhanced detection for frontend frameworks if content is available
    if (content && (extension === '.js' || extension === '.jsx' || extension === '.ts' || extension === '.tsx' || extension === '.html')) {
      const detected = detectFrontendFramework(filename, content);
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
      '.ts': ['typescript', 'react-ts', 'angular'], // TS files can be TypeScript, React with TS, or Angular
      '.js': ['javascript', 'react-js', 'jquery', 'angularjs'], // JS files can be various JS variants
      '.vue': ['vue'], // Vue files must be Vue
      '.py': ['python2', 'python3'], // Python files can be either version
      '.java': ['java'],
      '.kt': ['kotlin'],
      '.cs': ['csharp'],
      '.swift': ['swift'],
      '.m': ['objc'],
      '.html': ['angularjs', 'jquery']
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
    'java': ['kotlin', 'csharp'],
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
    'angularjs': ['react-js', 'react-ts', 'vue', 'angular'] // AngularJS to modern frameworks
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
    { value: 'python2', label: 'Python 2', tag: 'PY2' },
    { value: 'python3', label: 'Python 3', tag: 'PY3' },
    { value: 'java', label: 'Java', tag: 'JAVA' },
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