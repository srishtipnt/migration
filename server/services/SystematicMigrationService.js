import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { GoogleGenerativeAI } from '@google/generative-ai';

const execAsync = promisify(exec);

/**
 * Systematic Migration Service
 * Implements the structured workflow for JavaScript to TypeScript migration:
 * 1. Isolate: Choose a single .js file to convert
 * 2. Rename: Change its extension to .ts
 * 3. Analyze Errors: Run TypeScript compiler and review errors
 * 4. Add Types: Add explicit types for variables, parameters, return values
 * 5. Define Interfaces: Create interfaces for complex objects
 * 6. Fix and Verify: Resolve compiler errors until successful compilation
 * 7. Commit: Track successful migration
 * 8. Refactor (Optional): Separate refactoring step
 */
class SystematicMigrationService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    this.workflowSteps = [
      'isolate',
      'rename', 
      'analyze',
      'addTypes',
      'defineInterfaces',
      'fixAndVerify',
      'commit',
      'refactor'
    ];
  }

  /**
   * Execute the systematic migration workflow
   * @param {string} filePath - Path to the JavaScript file
   * @param {Object} options - Migration options
   * @returns {Object} Migration result with step-by-step progress
   */
  async migrateFile(filePath, options = {}) {
    const migrationId = `migration_${Date.now()}`;
    const results = {
      migrationId,
      originalFile: filePath,
      steps: {},
      success: false,
      errors: [],
      warnings: []
    };

    try {
      console.log(`🔄 Starting systematic migration for: ${filePath}`);
      
      // Step 1: Isolate - Validate the file
      results.steps.isolate = await this.isolateFile(filePath);
      if (!results.steps.isolate.success) {
        throw new Error(`Isolation failed: ${results.steps.isolate.error}`);
      }

      // Step 2: Rename - Change extension to .ts
      results.steps.rename = await this.renameToTypeScript(filePath);
      if (!results.steps.rename.success) {
        throw new Error(`Rename failed: ${results.steps.rename.error}`);
      }

      // Step 3: Analyze - Run TypeScript compiler
      results.steps.analyze = await this.analyzeTypeScriptErrors(results.steps.rename.newPath);
      console.log(`📊 Found ${results.steps.analyze.errors.length} TypeScript errors`);

      // Step 4: Add Types - Add explicit type annotations
      results.steps.addTypes = await this.addTypeAnnotations(
        results.steps.rename.newPath, 
        results.steps.analyze.errors
      );

      // Step 5: Define Interfaces - Create interfaces for complex objects
      results.steps.defineInterfaces = await this.defineInterfaces(
        results.steps.rename.newPath
      );

      // Step 6: Fix and Verify - Resolve all compiler errors
      results.steps.fixAndVerify = await this.fixAndVerify(
        results.steps.rename.newPath
      );

      // Step 7: Commit - Track successful migration
      results.steps.commit = await this.commitMigration(migrationId, results);

      // Step 8: Refactor (Optional) - Only if requested
      if (options.includeRefactoring) {
        results.steps.refactor = await this.refactorCode(results.steps.rename.newPath);
      }

      results.success = true;
      console.log(`✅ Systematic migration completed successfully: ${migrationId}`);
      
    } catch (error) {
      console.error(`❌ Migration failed: ${error.message}`);
      results.errors.push(error.message);
    }

    return results;
  }

  /**
   * Step 1: Isolate - Validate the JavaScript file
   */
  async isolateFile(filePath) {
    try {
      console.log(`🔍 Step 1: Isolating file ${filePath}`);
      
      // Check if file exists
      if (!await fs.pathExists(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Check if it's a JavaScript file
      if (!filePath.endsWith('.js') && !filePath.endsWith('.jsx')) {
        throw new Error(`File is not a JavaScript file: ${filePath}`);
      }

      // Read and validate file content
      const content = await fs.readFile(filePath, 'utf8');
      if (!content.trim()) {
        throw new Error(`File is empty: ${filePath}`);
      }

      // Basic syntax validation
      try {
        // Try to parse as JavaScript (basic validation)
        new Function(content);
      } catch (syntaxError) {
        throw new Error(`Invalid JavaScript syntax: ${syntaxError.message}`);
      }

      return {
        success: true,
        filePath,
        content,
        size: content.length,
        lines: content.split('\n').length
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Step 2: Rename - Change extension to .ts
   */
  async renameToTypeScript(filePath) {
    try {
      console.log(`📝 Step 2: Renaming ${filePath} to TypeScript`);
      
      const newPath = filePath.replace(/\.jsx?$/, '.ts');
      
      // Copy file to new location with .ts extension
      await fs.copy(filePath, newPath);
      
      return {
        success: true,
        originalPath: filePath,
        newPath,
        message: `File renamed from ${path.basename(filePath)} to ${path.basename(newPath)}`
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Step 3: Analyze - Run TypeScript compiler and get errors
   */
  async analyzeTypeScriptErrors(filePath) {
    try {
      console.log(`🔍 Step 3: Analyzing TypeScript errors for ${filePath}`);
      
      // Create a temporary tsconfig.json for this file
      const tsconfigPath = path.join(path.dirname(filePath), 'tsconfig.json');
      const tsconfig = {
        compilerOptions: {
          target: 'ES2020',
          module: 'ESNext',
          moduleResolution: 'node',
          strict: true,
          noImplicitAny: true,
          strictNullChecks: true,
          strictFunctionTypes: true,
          noImplicitReturns: true,
          noFallthroughCasesInSwitch: true,
          noUncheckedIndexedAccess: true,
          exactOptionalPropertyTypes: true,
          noImplicitOverride: true,
          noPropertyAccessFromIndexSignature: true,
          noUncheckedIndexedAccess: true,
          allowJs: false,
          checkJs: false,
          declaration: true,
          declarationMap: true,
          sourceMap: true,
          outDir: './dist',
          rootDir: './',
          removeComments: false,
          skipLibCheck: true
        },
        include: [path.basename(filePath)],
        exclude: ['node_modules', 'dist']
      };

      await fs.writeFile(tsconfigPath, JSON.stringify(tsconfig, null, 2));

      // Run TypeScript compiler
      const { stdout, stderr } = await execAsync(`npx tsc --noEmit --pretty false "${filePath}"`);
      
      // Parse TypeScript errors
      const errors = this.parseTypeScriptErrors(stderr);
      
      // Clean up tsconfig
      await fs.remove(tsconfigPath);

      return {
        success: true,
        errors,
        errorCount: errors.length,
        stdout,
        stderr
      };

    } catch (error) {
      // TypeScript compiler errors are expected, parse them
      const errors = this.parseTypeScriptErrors(error.stderr || error.message);
      return {
        success: true, // We expect errors at this stage
        errors,
        errorCount: errors.length,
        stderr: error.stderr || error.message
      };
    }
  }

  /**
   * Parse TypeScript compiler errors
   */
  parseTypeScriptErrors(stderr) {
    const errors = [];
    const lines = stderr.split('\n');
    
    for (const line of lines) {
      if (line.includes('error TS')) {
        const match = line.match(/\((\d+),(\d+)\): error TS(\d+): (.+)/);
        if (match) {
          errors.push({
            line: parseInt(match[1]),
            column: parseInt(match[2]),
            code: `TS${match[3]}`,
            message: match[4],
            severity: 'error'
          });
        }
      }
    }
    
    return errors;
  }

  /**
   * Step 4: Add Types - Add explicit type annotations
   */
  async addTypeAnnotations(filePath, errors) {
    try {
      console.log(`🏷️ Step 4: Adding type annotations to ${filePath}`);
      
      let content = await fs.readFile(filePath, 'utf8');
      
      // Use AI to add type annotations based on errors
      const prompt = this.createTypeAnnotationPrompt(content, errors);
      const response = await this.model.generateContent(prompt);
      const aiResponse = await response.response;
      const aiText = aiResponse.text();
      
      // Extract the improved code from AI response
      const codeMatch = aiText.match(/```typescript\n([\s\S]*?)\n```/) || 
                       aiText.match(/```\n([\s\S]*?)\n```/);
      
      if (codeMatch) {
        content = codeMatch[1];
      } else {
        // Fallback: try to extract code from the response
        const lines = aiText.split('\n');
        const codeStart = lines.findIndex(line => line.includes('// TypeScript version') || line.includes('// Migrated code'));
        if (codeStart !== -1) {
          content = lines.slice(codeStart + 1).join('\n');
        }
      }

      // Write the updated content
      await fs.writeFile(filePath, content);

      return {
        success: true,
        message: 'Type annotations added',
        content
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Step 5: Define Interfaces - Create interfaces for complex objects
   */
  async defineInterfaces(filePath) {
    try {
      console.log(`🏗️ Step 5: Defining interfaces for ${filePath}`);
      
      let content = await fs.readFile(filePath, 'utf8');
      
      // Use AI to create interfaces for complex objects
      const prompt = this.createInterfaceDefinitionPrompt(content);
      const response = await this.model.generateContent(prompt);
      const aiResponse = await response.response;
      const aiText = aiResponse.text();
      
      // Extract interfaces and updated code
      const codeMatch = aiText.match(/```typescript\n([\s\S]*?)\n```/) || 
                       aiText.match(/```\n([\s\S]*?)\n```/);
      
      if (codeMatch) {
        content = codeMatch[1];
      }

      // Write the updated content
      await fs.writeFile(filePath, content);

      return {
        success: true,
        message: 'Interfaces defined',
        content
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Step 6: Fix and Verify - Resolve all compiler errors
   */
  async fixAndVerify(filePath) {
    try {
      console.log(`🔧 Step 6: Fixing and verifying ${filePath}`);
      
      let attempts = 0;
      const maxAttempts = 5;
      
      while (attempts < maxAttempts) {
        // Check for remaining errors
        const analysis = await this.analyzeTypeScriptErrors(filePath);
        
        if (analysis.errors.length === 0) {
          return {
            success: true,
            message: 'All TypeScript errors resolved',
            attempts: attempts + 1
          };
        }

        // Fix remaining errors
        const fixPrompt = this.createErrorFixPrompt(filePath, analysis.errors);
        const response = await this.model.generateContent(fixPrompt);
        const aiResponse = await response.response;
        const aiText = aiResponse.text();
        
        const codeMatch = aiText.match(/```typescript\n([\s\S]*?)\n```/) || 
                         aiText.match(/```\n([\s\S]*?)\n```/);
        
        if (codeMatch) {
          await fs.writeFile(filePath, codeMatch[1]);
        }
        
        attempts++;
      }

      return {
        success: false,
        message: `Could not resolve all errors after ${maxAttempts} attempts`,
        remainingErrors: (await this.analyzeTypeScriptErrors(filePath)).errors
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Step 7: Commit - Track successful migration
   */
  async commitMigration(migrationId, results) {
    try {
      console.log(`💾 Step 7: Committing migration ${migrationId}`);
      
      // Create migration record
      const migrationRecord = {
        id: migrationId,
        timestamp: new Date().toISOString(),
        originalFile: results.originalFile,
        steps: Object.keys(results.steps),
        success: results.success,
        errors: results.errors,
        warnings: results.warnings
      };

      // In a real implementation, this would save to database
      console.log(`📝 Migration record created: ${JSON.stringify(migrationRecord, null, 2)}`);

      return {
        success: true,
        message: 'Migration committed successfully',
        record: migrationRecord
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Step 8: Refactor (Optional) - Improve code structure
   */
  async refactorCode(filePath) {
    try {
      console.log(`♻️ Step 8: Refactoring ${filePath}`);
      
      let content = await fs.readFile(filePath, 'utf8');
      
      // Use AI to suggest refactoring improvements
      const prompt = this.createRefactoringPrompt(content);
      const response = await this.model.generateContent(prompt);
      const aiResponse = await response.response;
      const aiText = aiResponse.text();
      
      // Extract refactored code
      const codeMatch = aiText.match(/```typescript\n([\s\S]*?)\n```/) || 
                       aiText.match(/```\n([\s\S]*?)\n```/);
      
      if (codeMatch) {
        content = codeMatch[1];
        await fs.writeFile(filePath, content);
      }

      return {
        success: true,
        message: 'Code refactored',
        content
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create prompt for type annotation
   */
  createTypeAnnotationPrompt(content, errors) {
    return `You are a TypeScript expert. Add precise type annotations to this JavaScript code to resolve TypeScript compilation errors.

ORIGINAL CODE:
\`\`\`javascript
${content}
\`\`\`

TYPESCRIPT ERRORS:
${errors.map(e => `Line ${e.line}: ${e.message} (${e.code})`).join('\n')}

REQUIREMENTS:
1. Add explicit types for all variables, function parameters, and return values
2. Preserve ALL original code structure and logic exactly
3. Do not refactor or change the code structure
4. Only add type annotations
5. Use proper TypeScript syntax
6. Maintain all original variable names, function names, and logic

Return the TypeScript version with type annotations:
\`\`\`typescript
// Your TypeScript code here
\`\`\``;
  }

  /**
   * Create prompt for interface definition
   */
  createInterfaceDefinitionPrompt(content) {
    return `You are a TypeScript expert. Create proper interfaces for complex objects in this code.

CODE:
\`\`\`typescript
${content}
\`\`\`

REQUIREMENTS:
1. Create interfaces for all complex objects
2. Preserve ALL original code structure and logic exactly
3. Do not refactor or change the code structure
4. Only add interface definitions and update object types
5. Maintain all original variable names, function names, and logic

Return the TypeScript version with interfaces:
\`\`\`typescript
// Your TypeScript code here
\`\`\``;
  }

  /**
   * Create prompt for error fixing
   */
  createErrorFixPrompt(filePath, errors) {
    return `You are a TypeScript expert. Fix the remaining TypeScript compilation errors in this code.

CODE:
\`\`\`typescript
${filePath}
\`\`\`

REMAINING ERRORS:
${errors.map(e => `Line ${e.line}: ${e.message} (${e.code})`).join('\n')}

REQUIREMENTS:
1. Fix all TypeScript compilation errors
2. Preserve ALL original code structure and logic exactly
3. Do not refactor or change the code structure
4. Only fix type-related issues
5. Maintain all original variable names, function names, and logic

Return the fixed TypeScript code:
\`\`\`typescript
// Your fixed TypeScript code here
\`\`\``;
  }

  /**
   * Create prompt for refactoring
   */
  createRefactoringPrompt(content) {
    return `You are a TypeScript expert. Suggest refactoring improvements for this TypeScript code.

CODE:
\`\`\`typescript
${content}
\`\`\`

REQUIREMENTS:
1. Suggest structural improvements (IIFE, better organization, etc.)
2. Improve code readability and maintainability
3. Keep all original functionality intact
4. Use modern TypeScript best practices
5. This is OPTIONAL refactoring - only suggest if beneficial

Return the refactored TypeScript code:
\`\`\`typescript
// Your refactored TypeScript code here
\`\`\``;
  }
}

export default SystematicMigrationService;




