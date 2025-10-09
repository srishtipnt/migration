import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';
import languageDetectionService from './LanguageDetectionService.js';
import migrationAgentService from './MigrationAgentService.js';

class ZipAnalysisService {
  constructor() {
    this.languageDetectionService = languageDetectionService;
    this.migrationAgentService = migrationAgentService;
  }

  /**
   * Analyze all files in a ZIP session to detect languages and frameworks
   * @param {string} sessionId - The session ID
   * @returns {Object} Analysis results with file types and conversion plan
   */
  async analyzeZipFiles(sessionId) {
    try {
      console.log(`🔍 Analyzing ZIP files for session: ${sessionId}`);
      
      // Get all files for this session
      const FileStorage = (await import('../models/FileStorage.js')).default;
      const files = await FileStorage.find({ sessionId });
      
      if (files.length === 0) {
        throw new Error(`No files found for session ${sessionId}`);
      }
      
      console.log(`📄 Found ${files.length} files to analyze`);
      
      const analysis = {
        sessionId,
        totalFiles: files.length,
        fileTypes: {},
        conversionPlan: [],
        languages: new Set(),
        frameworks: new Set()
      };
      
      // Analyze each file
      for (const file of files) {
        try {
          console.log(`🔍 Analyzing file: ${file.originalFilename}`);
          
          // Download file content
          const response = await axios.get(file.secure_url, {
            responseType: 'text',
            timeout: 30000
          });
          
          const content = response.data;
          const extension = path.extname(file.originalFilename).toLowerCase();
          
          // Detect language and framework
          const detection = await this.languageDetectionService.detectLanguage(
            content, 
            file.originalFilename, 
            extension
          );
          
          const fileInfo = {
            filename: file.originalFilename,
            extension,
            detectedLanguage: detection.language,
            confidence: detection.confidence,
            framework: detection.framework,
            size: content.length,
            lines: content.split('\n').length,
            needsConversion: this.needsConversion(detection.language, extension)
          };
          
          // Update analysis
          if (!analysis.fileTypes[detection.language]) {
            analysis.fileTypes[detection.language] = [];
          }
          analysis.fileTypes[detection.language].push(fileInfo);
          
          analysis.languages.add(detection.language);
          if (detection.framework) {
            analysis.frameworks.add(detection.framework);
          }
          
          // Add to conversion plan if needed
          if (fileInfo.needsConversion) {
            analysis.conversionPlan.push(fileInfo);
          }
          
          console.log(`✅ Analyzed ${file.originalFilename}: ${detection.language} (${detection.confidence}%)`);
          
        } catch (error) {
          console.error(`❌ Error analyzing ${file.originalFilename}:`, error.message);
        }
      }
      
      console.log(`📊 Analysis complete:`);
      console.log(`   Languages: ${Array.from(analysis.languages).join(', ')}`);
      console.log(`   Frameworks: ${Array.from(analysis.frameworks).join(', ')}`);
      console.log(`   Files needing conversion: ${analysis.conversionPlan.length}`);
      
      return analysis;
      
    } catch (error) {
      console.error('❌ ZIP analysis failed:', error);
      throw error;
    }
  }

  /**
   * Convert individual files based on analysis
   * @param {string} sessionId - The session ID
   * @param {Object} analysis - The analysis results
   * @param {string} targetLanguage - The target language for conversion
   * @returns {Object} Conversion results
   */
  async convertIndividualFiles(sessionId, analysis, targetLanguage) {
    try {
      console.log(`🔄 Converting files for session: ${sessionId}`);
      console.log(`🎯 Target language: ${targetLanguage}`);
      
      const results = {
        sessionId,
        targetLanguage,
        totalFiles: analysis.conversionPlan.length,
        convertedFiles: [],
        failedFiles: [],
        summary: {}
      };
      
      // Convert each file individually
      for (const fileInfo of analysis.conversionPlan) {
        try {
          console.log(`🔄 Converting: ${fileInfo.filename} (${fileInfo.detectedLanguage} → ${targetLanguage})`);
          
          // Get file content
          const FileStorage = (await import('../models/FileStorage.js')).default;
          const file = await FileStorage.findOne({ 
            sessionId, 
            originalFilename: fileInfo.filename 
          });
          
          if (!file) {
            throw new Error(`File not found: ${fileInfo.filename}`);
          }
          
          const response = await axios.get(file.secure_url, {
            responseType: 'text',
            timeout: 30000
          });
          
          const originalContent = response.data;
          
          // Create conversion command
          const command = this.createConversionCommand(
            fileInfo.detectedLanguage, 
            targetLanguage, 
            fileInfo.framework
          );
          
          // Convert using migration agent
          const conversionResult = await this.migrationAgentService.generateMigration(
            command,
            [{
              filename: fileInfo.filename,
              content: originalContent,
              type: 'file',
              language: fileInfo.detectedLanguage,
              specializedPrompt: this.getSpecializedPrompt(fileInfo.detectedLanguage, targetLanguage)
            }],
            {
              fromLang: fileInfo.detectedLanguage,
              toLang: targetLanguage
            }
          );
          
          if (conversionResult && conversionResult.migratedCode) {
            const convertedFile = {
              originalFilename: fileInfo.filename,
              convertedFilename: this.generateConvertedFilename(fileInfo.filename, targetLanguage),
              originalContent,
              convertedContent: conversionResult.migratedCode,
              originalLanguage: fileInfo.detectedLanguage,
              targetLanguage,
              changes: conversionResult.changes || [],
              summary: conversionResult.summary || 'File converted successfully'
            };
            
            results.convertedFiles.push(convertedFile);
            console.log(`✅ Converted: ${fileInfo.filename}`);
          } else {
            throw new Error('No conversion result received');
          }
          
        } catch (error) {
          console.error(`❌ Failed to convert ${fileInfo.filename}:`, error.message);
          results.failedFiles.push({
            filename: fileInfo.filename,
            error: error.message
          });
        }
      }
      
      // Generate summary
      results.summary = {
        totalFiles: results.totalFiles,
        successfulConversions: results.convertedFiles.length,
        failedConversions: results.failedFiles.length,
        successRate: `${Math.round((results.convertedFiles.length / results.totalFiles) * 100)}%`
      };
      
      console.log(`📊 Conversion complete: ${results.convertedFiles.length}/${results.totalFiles} files converted`);
      
      return results;
      
    } catch (error) {
      console.error('❌ File conversion failed:', error);
      throw error;
    }
  }

  /**
   * Check if a file needs conversion based on language and extension
   */
  needsConversion(detectedLanguage, extension) {
    // Files that typically need conversion
    const conversionNeeded = [
      'typescript', 'tsx', 'javascript', 'jsx',
      'python', 'java', 'c', 'cpp', 'php', 'ruby',
      'go', 'rust', 'swift', 'kotlin', 'scala'
    ];
    
    return conversionNeeded.includes(detectedLanguage);
  }

  /**
   * Create a specific conversion command
   */
  createConversionCommand(fromLang, toLang, framework) {
    const commands = {
      'typescript-to-javascript': 'Convert this TypeScript code to JavaScript while preserving JSX syntax and all functionality',
      'tsx-to-jsx': 'Convert this TSX code to JSX while preserving all React components and JSX syntax',
      'javascript-to-typescript': 'Convert this JavaScript code to TypeScript by adding appropriate type annotations',
      'jsx-to-tsx': 'Convert this JSX code to TSX by adding TypeScript type annotations',
      'python-to-javascript': 'Convert this Python code to JavaScript while preserving all logic and functionality',
      'java-to-javascript': 'Convert this Java code to JavaScript while preserving all classes and methods'
    };
    
    const key = `${fromLang}-to-${toLang}`;
    return commands[key] || `Convert this ${fromLang} code to ${toLang} while preserving all functionality and structure`;
  }

  /**
   * Get specialized prompt for specific language conversions
   */
  getSpecializedPrompt(fromLang, toLang) {
    const prompts = {
      'typescript-to-javascript': 'CRITICAL: Preserve JSX syntax exactly as written. Only remove TypeScript type annotations. Do not change component structure or logic.',
      'tsx-to-jsx': 'CRITICAL: Preserve all JSX elements and React components exactly as written. Only remove TypeScript type annotations.',
      'javascript-to-typescript': 'Add appropriate TypeScript type annotations while preserving all existing functionality.',
      'jsx-to-tsx': 'Add TypeScript type annotations to React components while preserving all JSX syntax.'
    };
    
    const key = `${fromLang}-to-${toLang}`;
    return prompts[key] || `Convert from ${fromLang} to ${toLang} while preserving all functionality.`;
  }

  /**
   * Generate converted filename
   */
  generateConvertedFilename(originalFilename, targetLanguage) {
    const ext = path.extname(originalFilename);
    const name = path.basename(originalFilename, ext);
    
    const extensionMap = {
      'javascript': '.js',
      'typescript': '.ts',
      'jsx': '.jsx',
      'tsx': '.tsx',
      'python': '.py',
      'java': '.java'
    };
    
    const newExt = extensionMap[targetLanguage] || ext;
    return `${name}${newExt}`;
  }
}

export default new ZipAnalysisService();

