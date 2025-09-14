import TreeSitterService from '../services/treeSitterService.js';
import TreeSitterAnalysis from '../models/TreeSitterAnalysis.js';
import { treeSitterQueue, treeSitterWorkerInstance } from '../queues/treeSitterQueue.js';
import fs from 'fs-extra';
import path from 'path';
import { extractZipFile } from '../utils/zipUtils.js';

/**
 * Controller for Tree-sitter code analysis operations
 */
class TreeSitterController {
  constructor() {
    this.treeSitterService = TreeSitterService; // Use singleton instance
  }

  /**
   * Analyze uploaded ZIP file and extract semantic chunks
   */
  async analyzeZipFile(req, res) {
    try {
      const { sessionId } = req.params;
      const { options = {} } = req.user; // Get user from auth middleware
      const userId = req.user.id;

      // Default analysis options
      const analysisOptions = {
        maxFiles: options.maxFiles || 500,
        maxFileSize: options.maxFileSize || 5 * 1024 * 1024, // 5MB
        includePatterns: options.includePatterns || ['.js', '.ts', '.jsx', '.tsx'],
        excludePatterns: options.excludePatterns || ['node_modules', '.git', 'dist', 'build', 'coverage'],
        recursive: options.recursive !== false,
        ...options
      };

      // Check if analysis already exists
      const existingAnalysis = await TreeSitterAnalysis.findOne({ sessionId });
      if (existingAnalysis && existingAnalysis.status === 'completed') {
        return res.json({
          success: true,
          sessionId,
          message: 'Analysis already completed',
          analysisId: existingAnalysis._id,
          statistics: existingAnalysis.statistics
        });
      }

      // Add job to queue
      const job = await treeSitterQueue.add('analyze-session', {
        sessionId,
        userId,
        analysisOptions
      }, {
        jobId: `treesitter-${sessionId}`,
        priority: 1
      });

      res.json({
        success: true,
        sessionId,
        jobId: job.id,
        message: 'Analysis job queued successfully',
        status: 'queued'
      });

    } catch (error) {
      console.error('Error queuing analysis job:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to queue analysis job',
        details: error.message
      });
    }
  }

  /**
   * Analyze a specific file
   */
  async analyzeFile(req, res) {
    try {
      const { sessionId, filePath } = req.params;
      const { content } = req.body;

      if (!content) {
        return res.status(400).json({
          success: false,
          error: 'File content is required'
        });
      }

      const analysisResult = await this.treeSitterService.parseFile(filePath, content);

      res.json({
        success: true,
        sessionId,
        filePath,
        analysis: analysisResult
      });

    } catch (error) {
      console.error('Error analyzing file:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to analyze file',
        details: error.message
      });
    }
  }

  /**
   * Get supported file types
   */
  async getSupportedTypes(req, res) {
    try {
      const supportedTypes = Array.from(this.treeSitterService.supportedExtensions.keys());
      
      res.json({
        success: true,
        supportedTypes,
        languages: ['javascript', 'typescript'],
        description: 'File types supported by Tree-sitter analysis'
      });

    } catch (error) {
      console.error('Error getting supported types:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get supported types',
        details: error.message
      });
    }
  }

  /**
   * Get chunk statistics for a session
   */
  async getChunkStatistics(req, res) {
    try {
      const { sessionId } = req.params;
      
      const analysis = await TreeSitterAnalysis.findOne({ sessionId });
      
      if (!analysis) {
        return res.status(404).json({
          success: false,
          error: 'Analysis not found'
        });
      }

      res.json({
        success: true,
        sessionId,
        statistics: analysis.statistics,
        status: analysis.status,
        summary: analysis.results?.summary
      });

    } catch (error) {
      console.error('Error getting chunk statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get statistics',
        details: error.message
      });
    }
  }

  /**
   * Search chunks by criteria
   */
  async searchChunks(req, res) {
    try {
      const { sessionId } = req.params;
      const { 
        query, 
        type, 
        language, 
        minComplexity, 
        maxComplexity,
        hasComments,
        isAsync,
        limit = 50,
        offset = 0
      } = req.query;

      const analysis = await TreeSitterAnalysis.findOne({ sessionId });
      
      if (!analysis) {
        return res.status(404).json({
          success: false,
          error: 'Analysis not found'
        });
      }

      if (analysis.status !== 'completed') {
        return res.status(400).json({
          success: false,
          error: 'Analysis not completed',
          status: analysis.status
        });
      }

      const searchCriteria = {
        query,
        type,
        language,
        minComplexity: minComplexity ? parseInt(minComplexity) : undefined,
        maxComplexity: maxComplexity ? parseInt(maxComplexity) : undefined,
        hasComments: hasComments ? hasComments === 'true' : undefined,
        isAsync: isAsync ? isAsync === 'true' : undefined,
        limit: parseInt(limit),
        offset: parseInt(offset)
      };

      const results = analysis.searchChunks(searchCriteria);
      const totalResults = analysis.results.files.reduce((total, file) => 
        total + (file.chunks ? file.chunks.length : 0), 0);

      res.json({
        success: true,
        sessionId,
        searchCriteria,
        results,
        totalResults,
        hasMore: (parseInt(offset) + results.length) < totalResults
      });

    } catch (error) {
      console.error('Error searching chunks:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search chunks',
        details: error.message
      });
    }
  }

  /**
   * Export analysis results
   */
  async exportAnalysis(req, res) {
    try {
      const { sessionId } = req.params;
      const { format = 'json' } = req.query;

      // In a real implementation, you'd retrieve and export the analysis results
      res.json({
        success: true,
        sessionId,
        format,
        downloadUrl: `/api/treesitter/${sessionId}/export/download`,
        message: 'Export functionality will be available after analysis'
      });

    } catch (error) {
      console.error('Error exporting analysis:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export analysis',
        details: error.message
      });
    }
  }

  /**
   * Get analysis progress for a session
   */
  async getAnalysisProgress(req, res) {
    try {
      const { sessionId } = req.params;

      const analysis = await TreeSitterAnalysis.findOne({ sessionId });
      
      if (!analysis) {
        return res.status(404).json({
          success: false,
          error: 'Analysis not found'
        });
      }

      res.json({
        success: true,
        sessionId,
        progress: analysis.progress,
        status: analysis.status,
        statistics: analysis.statistics,
        summary: analysis.results?.summary
      });

    } catch (error) {
      console.error('Error getting analysis progress:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get analysis progress',
        details: error.message
      });
    }
  }
}

export default TreeSitterController;
