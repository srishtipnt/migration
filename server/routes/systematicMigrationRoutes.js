import express from 'express';
import SystematicMigrationService from '../services/SystematicMigrationService.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';

const router = express.Router();
const systematicMigrationService = new SystematicMigrationService();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'temp-workspaces', 'systematic-migration');
    fs.ensureDirSync(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    // Only allow JavaScript files
    if (file.originalname.endsWith('.js') || file.originalname.endsWith('.jsx')) {
      cb(null, true);
    } else {
      cb(new Error('Only JavaScript files (.js, .jsx) are allowed for systematic migration'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

/**
 * POST /api/systematic-migration/migrate-file
 * Migrate a single JavaScript file using the systematic workflow
 */
router.post('/migrate-file', upload.single('file'), async (req, res) => {
  try {
    console.log('🔄 Starting systematic migration workflow');
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided',
        message: 'Please upload a JavaScript file for migration'
      });
    }

    const { includeRefactoring = false } = req.body;
    const filePath = req.file.path;
    
    console.log(`📁 Processing file: ${req.file.originalname}`);
    console.log(`📁 File path: ${filePath}`);
    console.log(`🔧 Include refactoring: ${includeRefactoring}`);

    // Execute systematic migration workflow
    const result = await systematicMigrationService.migrateFile(filePath, {
      includeRefactoring: includeRefactoring === 'true'
    });

    // Clean up uploaded file
    await fs.remove(filePath);

    if (result.success) {
      res.json({
        success: true,
        message: 'Systematic migration completed successfully',
        migrationId: result.migrationId,
        workflow: {
          steps: Object.keys(result.steps),
          completedSteps: Object.keys(result.steps).length,
          totalSteps: systematicMigrationService.workflowSteps.length
        },
        results: result.steps,
        errors: result.errors,
        warnings: result.warnings
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Migration failed',
        message: 'Systematic migration workflow failed',
        errors: result.errors,
        results: result.steps
      });
    }

  } catch (error) {
    console.error('❌ Systematic migration error:', error);
    
    // Clean up file if it exists
    if (req.file && req.file.path) {
      try {
        await fs.remove(req.file.path);
      } catch (cleanupError) {
        console.error('❌ Error cleaning up file:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * POST /api/systematic-migration/migrate-content
 * Migrate JavaScript code content using the systematic workflow
 */
router.post('/migrate-content', async (req, res) => {
  try {
    console.log('🔄 Starting systematic migration from content');
    
    const { content, filename = 'migration.js', includeRefactoring = false } = req.body;
    
    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'No content provided',
        message: 'Please provide JavaScript code content for migration'
      });
    }

    // Create temporary file
    const tempDir = path.join(process.cwd(), 'temp-workspaces', 'systematic-migration');
    await fs.ensureDir(tempDir);
    
    const tempFilePath = path.join(tempDir, filename);
    await fs.writeFile(tempFilePath, content);

    console.log(`📁 Created temporary file: ${tempFilePath}`);
    console.log(`🔧 Include refactoring: ${includeRefactoring}`);

    // Execute systematic migration workflow
    const result = await systematicMigrationService.migrateFile(tempFilePath, {
      includeRefactoring: includeRefactoring === 'true'
    });

    // Clean up temporary file
    await fs.remove(tempFilePath);

    if (result.success) {
      res.json({
        success: true,
        message: 'Systematic migration completed successfully',
        migrationId: result.migrationId,
        workflow: {
          steps: Object.keys(result.steps),
          completedSteps: Object.keys(result.steps).length,
          totalSteps: systematicMigrationService.workflowSteps.length
        },
        results: result.steps,
        errors: result.errors,
        warnings: result.warnings
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Migration failed',
        message: 'Systematic migration workflow failed',
        errors: result.errors,
        results: result.steps
      });
    }

  } catch (error) {
    console.error('❌ Systematic migration error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/systematic-migration/workflow
 * Get information about the systematic migration workflow
 */
router.get('/workflow', (req, res) => {
  res.json({
    success: true,
    workflow: {
      name: 'Systematic JavaScript to TypeScript Migration',
      description: 'A structured 8-step workflow for high-quality code migration',
      steps: [
        {
          step: 1,
          name: 'Isolate',
          description: 'Choose a single .js file to convert',
          purpose: 'Validate the JavaScript file and ensure it\'s ready for migration'
        },
        {
          step: 2,
          name: 'Rename',
          description: 'Change its extension to .ts',
          purpose: 'Create a TypeScript version of the file'
        },
        {
          step: 3,
          name: 'Analyze',
          description: 'Run the TypeScript compiler and review errors',
          purpose: 'Identify all type-related issues that need to be resolved'
        },
        {
          step: 4,
          name: 'Add Types',
          description: 'Add explicit types for variables, parameters, and return values',
          purpose: 'Add precise type annotations to resolve compilation errors'
        },
        {
          step: 5,
          name: 'Define Interfaces',
          description: 'Create interfaces for complex objects',
          purpose: 'Define proper TypeScript interfaces for object types'
        },
        {
          step: 6,
          name: 'Fix and Verify',
          description: 'Resolve all compiler errors until successful compilation',
          purpose: 'Ensure the code compiles without errors'
        },
        {
          step: 7,
          name: 'Commit',
          description: 'Track successful migration',
          purpose: 'Record the successful migration for version control'
        },
        {
          step: 8,
          name: 'Refactor (Optional)',
          description: 'Improve code structure and organization',
          purpose: 'Optional step to improve code quality after successful migration'
        }
      ],
      benefits: [
        'Ensures 1:1 code conversion with no logic changes',
        'Systematic approach reduces errors',
        'Step-by-step verification',
        'Preserves original code structure',
        'High-quality TypeScript output',
        'Traceable migration process'
      ]
    }
  });
});

/**
 * GET /api/systematic-migration/status/:migrationId
 * Get the status of a specific migration
 */
router.get('/status/:migrationId', (req, res) => {
  const { migrationId } = req.params;
  
  // In a real implementation, this would query the database
  res.json({
    success: true,
    migrationId,
    message: 'Migration status endpoint - would query database in production',
    status: 'completed',
    timestamp: new Date().toISOString()
  });
});

export default router;




