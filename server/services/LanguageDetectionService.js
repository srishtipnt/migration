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
      },
      // Backend Platform Frameworks
      wordpress: {
        extensions: ['.php'],
        contentPatterns: [
          /wp_/,
          /get_header\(\)|get_footer\(\)|get_sidebar\(\)/,
          /the_content\(\)|the_title\(\)|the_excerpt\(\)/,
          /add_action\s*\(|add_filter\s*\(/,
          /wp-config\.php|wp-content|wp-includes/,
          /WP_Query|wp_query/,
          /\$wpdb/
        ],
        priority: 90
      },
      laravel: {
        extensions: ['.php'],
        contentPatterns: [
          /use\s+Illuminate\\/,
          /Artisan::|Route::|Schema::/,
          /class\s+\w+\s+extends\s+(Controller|Model|Middleware)/,
          /@extends\s*\(|@section\s*\(|@yield\s*\(/,
          /composer\.json|artisan/,
          /App\\|config\//
        ],
        priority: 85
      },
      nodejs: {
        extensions: ['.js'],
        contentPatterns: [
          /require\s*\(['"][\w\-\/]+['"]\)/,
          /module\.exports\s*=/,
          /process\.env/,
          /__dirname|__filename/,
          /npm\s+install|package\.json/,
          /const\s+\w+\s*=\s*require/
        ],
        priority: 75
      },
      express: {
        extensions: ['.js'],
        contentPatterns: [
          /require\s*\(['"]express['"]\)/,
          /app\.get\s*\(|app\.post\s*\(|app\.put\s*\(|app\.delete\s*\(/,
          /res\.json\s*\(|res\.send\s*\(|res\.render\s*\(/,
          /app\.listen\s*\(/,
          /express\(\)/,
          /middleware/i
        ],
        priority: 80
      },
      nestjs: {
        extensions: ['.ts'],
        contentPatterns: [
          /@Controller\s*\(|@Injectable\s*\(|@Module\s*\(/,
          /import\s*{[^}]*}\s*from\s*['"]@nestjs/,
          /@Get\s*\(|@Post\s*\(|@Put\s*\(|@Delete\s*\(/,
          /NestFactory\.create/,
          /nest\s+new|nest\s+generate/
        ],
        priority: 85
      },
      // Ruby Platform Frameworks
      rails: {
        extensions: ['.rb'],
        contentPatterns: [
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
        ],
        priority: 90
      },
      // Python Platform Frameworks
      django: {
        extensions: ['.py'],
        contentPatterns: [
          /from\s+django/,
          /import\s+django/,
          /django\.conf|django\.urls/,
          /class\s+\w+\(models\.Model\)/,
          /class\s+\w+\(forms\.Form\)/,
          /class\s+\w+\(View\)/,
          /HttpResponse|JsonResponse/,
          /render\s*\(/,
          /redirect\s*\(/,
          /settings\.py|urls\.py|models\.py/,
          /@login_required|@csrf_exempt/
        ],
        priority: 85
      },
      flask: {
        extensions: ['.py'],
        contentPatterns: [
          /from\s+flask/,
          /import\s+flask/,
          /Flask\s*\(__name__\)/,
          /@app\.route/,
          /request\.form|request\.json/,
          /render_template\s*\(/,
          /jsonify\s*\(/,
          /redirect\s*\(/,
          /url_for\s*\(/,
          /session\[/
        ],
        priority: 80
      },
      // Java Platform Frameworks
      springboot: {
        extensions: ['.java'],
        contentPatterns: [
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
        ],
        priority: 90
      },
      spring: {
        extensions: ['.java'],
        contentPatterns: [
          /@Controller|@RestController/,
          /@Service|@Repository|@Component/,
          /@Autowired|@Qualifier/,
          /@RequestMapping|@ResponseBody/,
          /ApplicationContext|BeanFactory/,
          /org\.springframework/,
          /@Configuration|@Bean/,
          /@Transactional/,
          /DispatcherServlet/
        ],
        priority: 85
      },
      // Go Platform Frameworks
      gin: {
        extensions: ['.go'],
        contentPatterns: [
          /gin\.Default\(\)|gin\.New\(\)/,
          /router\.GET|router\.POST|router\.PUT|router\.DELETE/,
          /gin\.Context/,
          /c\.JSON\(|c\.String\(|c\.HTML\(/,
          /gin\.H\{/,
          /github\.com\/gin-gonic\/gin/,
          /router\.Use\(/,
          /gin\.Recovery\(\)|gin\.Logger\(\)/
        ],
        priority: 85
      },
      echo: {
        extensions: ['.go'],
        contentPatterns: [
          /echo\.New\(\)/,
          /e\.GET|e\.POST|e\.PUT|e\.DELETE/,
          /echo\.Context/,
          /c\.JSON\(|c\.String\(|c\.HTML\(/,
          /github\.com\/labstack\/echo/,
          /e\.Use\(/,
          /middleware\./
        ],
        priority: 80
      },
      fiber: {
        extensions: ['.go'],
        contentPatterns: [
          /fiber\.New\(\)/,
          /app\.Get|app\.Post|app\.Put|app\.Delete/,
          /fiber\.Ctx/,
          /c\.JSON\(|c\.SendString\(/,
          /github\.com\/gofiber\/fiber/,
          /app\.Use\(/,
          /fiber\.Map\{/
        ],
        priority: 80
      },
      
      // API Paradigms
      rest: {
        extensions: ['.js', '.ts', '.py', '.java', '.cs', '.rb', '.go', '.php'],
        contentPatterns: [
          /app\.(get|post|put|delete|patch)\(/,
          /@RestController|@RequestMapping/,
          /@(Get|Post|Put|Delete|Patch)Mapping/,
          /from rest_framework/,
          /\[Http(Get|Post|Put|Delete)\]/,
          /\/api\/|\/v1\/|\/v2\//,
          /ResponseEntity</,
          /@api_view/,
          /router\.(get|post|put|delete|patch)\(/,
          /express\.Router\(\)/
        ],
        priority: 80
      },
      graphql: {
        extensions: ['.js', '.ts', '.graphql', '.gql', '.py', '.java', '.cs', '.rb', '.go'],
        contentPatterns: [
          /type\s+\w+\s*{/,
          /query\s+\w*\s*{|mutation\s+\w*\s*{/,
          /from ['"]graphql['"]/,
          /@Resolver|@Query|@Mutation|@Subscription/,
          /apollo-server|graphql-yoga/,
          /buildSchema|makeExecutableSchema/,
          /gql`|graphql`/,
          /useQuery|useMutation|useSubscription/,
          /GraphQLSchema|GraphQLObjectType/,
          /input\s+\w+\s*{|interface\s+\w+\s*{/
        ],
        priority: 90
      },
      
      // Database Systems
      mysql: {
        extensions: ['.sql', '.js', '.py', '.java', '.php', '.rb', '.go', '.cs'],
        contentPatterns: [
          /CREATE TABLE.*ENGINE\s*=\s*InnoDB/i,
          /AUTO_INCREMENT/i,
          /VARCHAR\(\d+\)/i,
          /mysql:\/\/|jdbc:mysql/i,
          /ENGINE=MyISAM|ENGINE=InnoDB/i,
          /mysql\.createConnection/i,
          /SHOW TABLES|DESCRIBE/i,
          /CHARSET=utf8/i
        ],
        priority: 90
      },
      postgresql: {
        extensions: ['.sql', '.js', '.py', '.java', '.php', '.rb', '.go', '.cs'],
        contentPatterns: [
          /CREATE TABLE.*SERIAL/i,
          /SERIAL PRIMARY KEY/i,
          /JSONB|JSON/i,
          /ARRAY\[.*\]/i,
          /postgresql:\/\/|jdbc:postgresql/i,
          /RETURNING \*/i,
          /ILIKE|SIMILAR TO/i,
          /CREATE EXTENSION/i,
          /SELECT.*FROM pg_/i
        ],
        priority: 90
      },
      mongodb: {
        extensions: ['.js', '.py', '.java', '.cs', '.rb', '.go', '.json'],
        contentPatterns: [
          /db\.\w+\.find\(/i,
          /db\.\w+\.insert\(/i,
          /db\.\w+\.update\(/i,
          /db\.\w+\.aggregate\(/i,
          /ObjectId\(/i,
          /mongodb:\/\/|mongodb\+srv:\/\//i,
          /mongoose\./i,
          /MongoClient/i,
          /\$set|\$push|\$pull/i,
          /collection\./i
        ],
        priority: 90
      },
      sqlite: {
        extensions: ['.sql', '.db', '.sqlite', '.js', '.py', '.java', '.cs'],
        contentPatterns: [
          /sqlite3\./i,
          /PRAGMA/i,
          /sqlite:\/\/|jdbc:sqlite/i,
          /AUTOINCREMENT/i,
          /sqlite3\.connect/i,
          /INTEGER PRIMARY KEY/i,
          /\.execute\(.*CREATE TABLE/i
        ],
        priority: 85
      },
      redis: {
        extensions: ['.js', '.py', '.java', '.cs', '.rb', '.go'],
        contentPatterns: [
          /redis\./i,
          /SET\s+\w+|GET\s+\w+/i,
          /HSET|HGET|HMSET/i,
          /LPUSH|RPUSH|LPOP/i,
          /SADD|SMEMBERS/i,
          /redis:\/\/|redis\.createClient/i,
          /EXPIRE|TTL/i,
          /ZADD|ZRANGE/i
        ],
        priority: 85
      },
      
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
      },
      php: {
        extensions: ['.php'],
        contentPatterns: [
          /<\?php/,
          /\$\w+\s*=/,
          /echo\s+|print\s+/,
          /function\s+\w+\s*\(/,
          /class\s+\w+/,
          /->/,
          /\$_GET|\$_POST|\$_SESSION/
        ]
      },
      ruby: {
        extensions: ['.rb'],
        contentPatterns: [
          /def\s+\w+/,
          /class\s+\w+/,
          /module\s+\w+/,
          /end$/m,
          /@\w+/,
          /puts\s+|print\s+/,
          /require\s+['"][^'"]+['"]/
        ]
      },
      python: {
        extensions: ['.py'],
        contentPatterns: [
          /def\s+\w+\s*\(/,
          /class\s+\w+/,
          /import\s+\w+/,
          /from\s+\w+\s+import/,
          /print\s*\(/,
          /if\s+__name__\s*==\s*['"]__main__['"]/
        ]
      },
      java: {
        extensions: ['.java'],
        contentPatterns: [
          /public\s+class\s+\w+/,
          /public\s+static\s+void\s+main/,
          /import\s+java\./,
          /System\.out\.println/,
          /public\s+\w+\s+\w+\s*\(/,
          /private\s+\w+\s+\w+/,
          /package\s+[\w.]+/
        ]
      },
      go: {
        extensions: ['.go'],
        contentPatterns: [
          /package\s+\w+/,
          /func\s+\w+\s*\(/,
          /import\s+\(/,
          /fmt\.Print/,
          /var\s+\w+\s+\w+/,
          /type\s+\w+\s+struct/,
          /go\s+\w+\(/
        ]
      }
    };

    // File extension to base language mapping
    this.extensionToLanguage = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.php': 'php',
      '.rb': 'ruby',
      '.py': 'python',
      '.java': 'java',
      '.go': 'go',
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

    console.log(` Detection result for ${filename}:`, result);
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
      // Backend Platform Languages
      { value: 'php', label: 'PHP', tag: 'PHP' },
      { value: 'wordpress', label: 'WordPress', tag: 'PHP' },
      { value: 'laravel', label: 'Laravel', tag: 'PHP' },
      { value: 'nodejs', label: 'Node.js', tag: 'JS' },
      { value: 'express', label: 'Express.js', tag: 'JS' },
      { value: 'nestjs', label: 'NestJS', tag: 'TS' },
      // Ruby Platform Languages
      { value: 'ruby', label: 'Ruby', tag: 'RB' },
      { value: 'rails', label: 'Ruby on Rails', tag: 'RB' },
      // Python Platform Languages
      { value: 'django', label: 'Django', tag: 'PY' },
      { value: 'flask', label: 'Flask', tag: 'PY' },
      // Java Platform Languages
      { value: 'java', label: 'Java', tag: 'JAVA' },
      { value: 'spring', label: 'Spring Framework', tag: 'JAVA' },
      { value: 'springboot', label: 'Spring Boot', tag: 'JAVA' },
      // Go Platform Languages
      { value: 'go', label: 'Go', tag: 'GO' },
      { value: 'gin', label: 'Gin', tag: 'GO' },
      { value: 'echo', label: 'Echo', tag: 'GO' },
      { value: 'fiber', label: 'Fiber', tag: 'GO' },
      // API Paradigms
      { value: 'rest', label: 'REST API', tag: 'REST' },
      { value: 'graphql', label: 'GraphQL', tag: 'GQL' },
      // Database Systems
      { value: 'mysql', label: 'MySQL', tag: 'SQL' },
      { value: 'postgresql', label: 'PostgreSQL', tag: 'SQL' },
      { value: 'mongodb', label: 'MongoDB', tag: 'NoSQL' },
      { value: 'sqlite', label: 'SQLite', tag: 'SQL' },
      { value: 'redis', label: 'Redis', tag: 'KV' },
      { value: 'cassandra', label: 'Cassandra', tag: 'NoSQL' },
      { value: 'dynamodb', label: 'DynamoDB', tag: 'NoSQL' },
      { value: 'elasticsearch', label: 'Elasticsearch', tag: 'SEARCH' },
      { value: 'python2', label: 'Python 2', tag: 'PY2' },
      { value: 'python3', label: 'Python 3', tag: 'PY3' },
      { value: 'kotlin', label: 'Kotlin', tag: 'KT' },
      { value: 'swift', label: 'Swift', tag: 'SWIFT' },
      { value: 'objc', label: 'Objective-C', tag: 'OBJC' },
      { value: 'csharp', label: 'C#', tag: 'CS' }
    ];
  }
}

export default new LanguageDetectionService();
