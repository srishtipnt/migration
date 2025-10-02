/**
 * Migration Recipes Service
 * Provides specialized prompts and patterns for common migration scenarios
 */

class MigrationRecipesService {
  constructor() {
    this.recipes = this.initializeRecipes();
  }

  initializeRecipes() {
    return {
      // React to Angular Recipes
      'react-useeffect-to-angular': {
        name: 'React useEffect to Angular Lifecycle',
        description: 'Convert React useEffect hooks to Angular lifecycle methods',
        pattern: /useEffect\s*\(/,
        prompt: `You are an expert developer migrating a React component to Angular. 

CRITICAL INSTRUCTIONS:
- Convert useEffect hooks to appropriate Angular lifecycle methods
- useEffect(() => {}, []) becomes ngOnInit()
- useEffect(() => {}, [dependency]) becomes ngOnChanges() or ngOnInit() with proper dependency tracking
- useEffect(() => { return cleanup }, []) becomes ngOnDestroy() for cleanup
- Convert React state updates to Angular property binding
- Replace React refs with Angular ViewChild/ElementRef
- Convert React event handlers to Angular event binding

Convert the following React useEffect hook to Angular lifecycle methods:`
      },

      'react-state-to-angular': {
        name: 'React State to Angular Properties',
        description: 'Convert React useState to Angular component properties',
        pattern: /useState\s*\(/,
        prompt: `You are an expert developer migrating React state management to Angular.

CRITICAL INSTRUCTIONS:
- Convert useState hooks to Angular component properties
- Replace setState calls with direct property assignment
- Use Angular's change detection instead of React's re-rendering
- Convert state updates to Angular's property binding
- Handle async state updates with Angular's async pipe or observables
- Replace React's functional state updates with Angular's imperative updates

Convert the following React state management to Angular:`
      },

      // Node.js to PHP Recipes
      'express-route-to-php': {
        name: 'Express Route to PHP Handler',
        description: 'Convert Express.js routes to PHP request handlers',
        pattern: /app\.(get|post|put|delete|patch)\s*\(/,
        prompt: `You are an expert developer migrating Express.js routes to PHP.

CRITICAL INSTRUCTIONS:
- Convert Express route handlers to PHP functions
- Replace req.params with $_GET or $_POST parameters
- Replace req.body with $_POST or json_decode(file_get_contents('php://input'))
- Replace res.json() with echo json_encode() and proper headers
- Replace res.status() with http_response_code()
- Convert Express middleware to PHP functions
- Handle async operations with PHP's synchronous approach
- Replace Express error handling with PHP try-catch blocks

Convert the following Express route to PHP:`
      },

      'mongoose-schema-to-php': {
        name: 'Mongoose Schema to PHP Model',
        description: 'Convert Mongoose schemas to PHP database models',
        pattern: /mongoose\.Schema\s*\(/,
        prompt: `You are an expert developer migrating Mongoose schemas to PHP.

CRITICAL INSTRUCTIONS:
- Convert Mongoose schemas to PHP classes or arrays
- Replace Mongoose validation with PHP validation
- Convert Mongoose methods to PHP class methods
- Replace Mongoose queries with PDO or Eloquent ORM queries
- Convert Mongoose middleware to PHP hooks
- Replace Mongoose virtuals with PHP getters/setters
- Handle Mongoose population with PHP joins or separate queries

Convert the following Mongoose schema to PHP:`
      },

      // JavaScript to TypeScript Recipes
      'js-function-to-ts': {
        name: 'JavaScript Function to TypeScript',
        description: 'Convert JavaScript functions to TypeScript with proper typing',
        pattern: /function\s+\w+\s*\(/,
        prompt: `You are an expert developer converting JavaScript to TypeScript.

CRITICAL INSTRUCTIONS:
- Add proper type annotations to all function parameters
- Add return type annotations to all functions
- Replace 'any' types with specific types where possible
- Add interface definitions for object parameters
- Convert JavaScript objects to TypeScript interfaces
- Add proper generic types where applicable
- Handle optional parameters with TypeScript optional syntax
- Add proper error handling with TypeScript error types

Convert the following JavaScript function to TypeScript:`
      },

      'js-class-to-ts': {
        name: 'JavaScript Class to TypeScript',
        description: 'Convert JavaScript classes to TypeScript with proper typing',
        pattern: /class\s+\w+/,
        prompt: `You are an expert developer converting JavaScript classes to TypeScript.

CRITICAL INSTRUCTIONS:
- Add proper type annotations to all class properties
- Add access modifiers (public, private, protected) where appropriate
- Add return type annotations to all methods
- Add parameter type annotations to all methods
- Convert JavaScript object properties to TypeScript interfaces
- Add proper generic types for class methods
- Handle inheritance with TypeScript extends syntax
- Add proper error handling with TypeScript error types

Convert the following JavaScript class to TypeScript:`
      },

      // Vue to React Recipes
      'vue-component-to-react': {
        name: 'Vue Component to React',
        description: 'Convert Vue.js components to React components',
        pattern: /export\s+default\s*\{/,
        prompt: `You are an expert developer migrating Vue.js components to React.

CRITICAL INSTRUCTIONS:
- Convert Vue template syntax to JSX
- Convert Vue data() to React useState hooks
- Convert Vue methods to React functions
- Convert Vue computed properties to React useMemo
- Convert Vue lifecycle hooks to React useEffect
- Convert Vue props to React props interface
- Convert Vue events to React event handlers
- Replace Vue directives with React patterns

Convert the following Vue component to React:`
      },

      // Python to Java Recipes
      'python-function-to-java': {
        name: 'Python Function to Java Method',
        description: 'Convert Python functions to Java methods',
        pattern: /def\s+\w+\s*\(/,
        prompt: `You are an expert developer migrating Python functions to Java.

CRITICAL INSTRUCTIONS:
- Convert Python functions to Java methods with proper access modifiers
- Add proper type annotations for all parameters and return types
- Convert Python dynamic typing to Java static typing
- Replace Python exceptions with Java exceptions
- Convert Python list comprehensions to Java streams
- Replace Python dictionaries with Java Maps
- Convert Python string formatting to Java String.format()
- Handle Python's None with Java's null

Convert the following Python function to Java:`
      },

      // Python 2 to Python 3 Recipes
      'python2-print-to-python3': {
        name: 'Python 2 Print to Python 3 Print Function',
        description: 'Convert Python 2 print statements to Python 3 print function',
        pattern: /print\s+[^(]/,
        prompt: `You are an expert developer migrating Python 2 print statements to Python 3.

CRITICAL INSTRUCTIONS:
- Convert Python 2 print statements to Python 3 print() function calls
- Add parentheses around print arguments
- Handle multiple arguments with proper formatting
- Convert string concatenation to f-strings where appropriate
- Preserve the original output format and behavior

Convert the following Python 2 print statements to Python 3:`
      },

      'python2-division-to-python3': {
        name: 'Python 2 Division to Python 3 Division',
        description: 'Convert Python 2 division behavior to Python 3',
        pattern: /\d+\s*\/\s*\d+/,
        prompt: `You are an expert developer migrating Python 2 division to Python 3.

CRITICAL INSTRUCTIONS:
- Python 2 integer division (/) becomes true division in Python 3
- Use // for integer division in Python 3 where needed
- Convert division operations to maintain the same mathematical behavior
- Add explicit integer division (//) where Python 2 behavior is needed
- Handle mixed integer/float operations correctly

Convert the following Python 2 division operations to Python 3:`
      },

      'python2-unicode-to-python3': {
        name: 'Python 2 Unicode to Python 3 String Handling',
        description: 'Convert Python 2 unicode handling to Python 3',
        pattern: /unicode\s*\(/,
        prompt: `You are an expert developer migrating Python 2 unicode handling to Python 3.

CRITICAL INSTRUCTIONS:
- Python 3 strings are unicode by default
- Remove unicode() function calls
- Convert str() calls to handle unicode properly
- Update string encoding/decoding operations
- Handle string literals with unicode characters correctly

Convert the following Python 2 unicode handling to Python 3:`
      }
    };
  }

  /**
   * Identify which recipe to use for a given code chunk
   * @param {string} code - The code to analyze
   * @param {string} fromLang - Source language
   * @param {string} toLang - Target language
   * @returns {Object|null} The appropriate recipe or null
   */
  identifyRecipe(code, fromLang, toLang) {
    const migrationKey = `${fromLang.toLowerCase()}-to-${toLang.toLowerCase()}`;
    
    // Find recipes that match the migration pattern
    const applicableRecipes = Object.entries(this.recipes).filter(([key, recipe]) => {
      return key.includes(migrationKey) || 
             (key.includes(fromLang.toLowerCase()) && key.includes(toLang.toLowerCase()));
    });

    if (applicableRecipes.length === 0) {
      return null;
    }

    // Find the best matching recipe based on code patterns
    for (const [key, recipe] of applicableRecipes) {
      if (recipe.pattern && recipe.pattern.test(code)) {
        return { key, ...recipe };
      }
    }

    // Return the first applicable recipe if no pattern matches
    const [key, recipe] = applicableRecipes[0];
    return { key, ...recipe };
  }

  /**
   * Get a specialized prompt for a specific migration scenario
   * @param {string} code - The code to migrate
   * @param {string} fromLang - Source language
   * @param {string} toLang - Target language
   * @param {string} chunkType - Type of code chunk
   * @returns {string} Specialized prompt
   */
  getSpecializedPrompt(code, fromLang, toLang, chunkType) {
    const recipe = this.identifyRecipe(code, fromLang, toLang);
    
    if (recipe) {
      console.log(`🍳 Using migration recipe: ${recipe.name}`);
      return `${recipe.prompt}\n\n${code}`;
    }

    // Fallback to generic prompt
    return this.getGenericPrompt(code, fromLang, toLang, chunkType);
  }

  /**
   * Get a generic prompt for migration
   * @param {string} code - The code to migrate
   * @param {string} fromLang - Source language
   * @param {string} toLang - Target language
   * @param {string} chunkType - Type of code chunk
   * @returns {string} Generic prompt
   */
  getGenericPrompt(code, fromLang, toLang, chunkType) {
    return `You are an expert developer migrating code from ${fromLang} to ${toLang}.

CRITICAL INSTRUCTIONS:
- Preserve the original logic and functionality
- Use idiomatic ${toLang} patterns and syntax
- Handle language-specific differences appropriately
- Add proper error handling for the target language
- Include necessary imports and dependencies
- Maintain the same input/output behavior

Convert the following ${chunkType} from ${fromLang} to ${toLang}:

${code}`;
  }

  /**
   * Get all available recipes for a migration
   * @param {string} fromLang - Source language
   * @param {string} toLang - Target language
   * @returns {Array} Array of applicable recipes
   */
  getAvailableRecipes(fromLang, toLang) {
    const migrationKey = `${fromLang.toLowerCase()}-to-${toLang.toLowerCase()}`;
    
    return Object.entries(this.recipes)
      .filter(([key, recipe]) => 
        key.includes(migrationKey) || 
        (key.includes(fromLang.toLowerCase()) && key.includes(toLang.toLowerCase()))
      )
      .map(([key, recipe]) => ({ key, ...recipe }));
  }

  /**
   * Add a custom recipe
   * @param {string} key - Recipe key
   * @param {Object} recipe - Recipe definition
   */
  addRecipe(key, recipe) {
    this.recipes[key] = recipe;
  }
}

export default new MigrationRecipesService();
