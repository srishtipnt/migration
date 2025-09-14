import TreeSitterService from '../services/treeSitterService.js';
import TreeSitterAnalysis from '../models/TreeSitterAnalysis.js';
import fs from 'fs-extra';
import path from 'path';

/**
 * Worker for processing Tree-sitter analysis jobs
 */
class TreeSitterWorker {
  constructor() {
    this.treeSitterService = TreeSitterService; // Use singleton instance
    this.isProcessing = false;
  }

  /**
   * Process a Tree-sitter analysis job
   */
  async processAnalysisJob(job) {
    const { sessionId, userId, analysisOptions } = job.data;
    
    try {
      console.log(`Starting Tree-sitter analysis for session ${sessionId}`);
      
      // Create or update analysis record
      let analysis = await TreeSitterAnalysis.findOne({ sessionId });
      if (!analysis) {
        analysis = new TreeSitterAnalysis({
          sessionId,
          userId,
          analysisOptions,
          status: 'processing'
        });
        await analysis.save();
      } else {
        analysis.status = 'processing';
        analysis.analysisOptions = analysisOptions;
        await analysis.save();
      }

      // Update progress
      await analysis.updateProgress({
        percentage: 0,
        currentFile: 'Initializing...',
        filesProcessed: 0,
        totalFiles: 0,
        chunksFound: 0,
        errors: []
      });

      // Find the extracted files directory
      const tempDir = path.join(process.env.UPLOAD_PATH || './uploads', 'temp', sessionId);
      
      if (!await fs.pathExists(tempDir)) {
        throw new Error('Session files not found');
      }

      // Walk through the directory and analyze files
      const analysisResult = await this.treeSitterService.walkDirectory(tempDir, analysisOptions);
      
      // Update progress during analysis
      await analysis.updateProgress({
        percentage: 50,
        currentFile: 'Processing files...',
        filesProcessed: analysisResult.files.length,
        totalFiles: analysisResult.files.length,
        chunksFound: analysisResult.summary.totalChunks
      });

      // Calculate statistics
      const statistics = this.treeSitterService.getChunkStatistics(analysisResult.files);

      // Save results
      analysis.results = analysisResult;
      analysis.statistics = statistics;
      analysis.status = 'completed';
      analysis.completedAt = new Date();

      await analysis.updateProgress({
        percentage: 100,
        currentFile: 'Analysis completed',
        filesProcessed: analysisResult.files.length,
        totalFiles: analysisResult.files.length,
        chunksFound: analysisResult.summary.totalChunks
      });

      console.log(`Tree-sitter analysis completed for session ${sessionId}`);
      console.log(`Found ${analysisResult.summary.totalChunks} chunks in ${analysisResult.summary.parsedFiles} files`);

      return {
        success: true,
        sessionId,
        analysisId: analysis._id,
        statistics,
        summary: analysisResult.summary
      };

    } catch (error) {
      console.error(`Error processing Tree-sitter analysis for session ${sessionId}:`, error);
      
      // Update analysis record with error
      const analysis = await TreeSitterAnalysis.findOne({ sessionId });
      if (analysis) {
        analysis.status = 'failed';
        await analysis.addError(error.message);
        await analysis.save();
      }

      throw error;
    }
  }

  /**
   * Get analysis progress
   */
  async getAnalysisProgress(sessionId) {
    try {
      const analysis = await TreeSitterAnalysis.findOne({ sessionId });
      
      if (!analysis) {
        return {
          success: false,
          error: 'Analysis not found'
        };
      }

      return {
        success: true,
        progress: analysis.progress,
        status: analysis.status,
        statistics: analysis.statistics,
        summary: analysis.results?.summary
      };

    } catch (error) {
      console.error('Error getting analysis progress:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get analysis results
   */
  async getAnalysisResults(sessionId) {
    try {
      const analysis = await TreeSitterAnalysis.findOne({ sessionId });
      
      if (!analysis) {
        return {
          success: false,
          error: 'Analysis not found'
        };
      }

      if (analysis.status !== 'completed') {
        return {
          success: false,
          error: 'Analysis not completed',
          status: analysis.status
        };
      }

      return {
        success: true,
        analysis: analysis.results,
        statistics: analysis.statistics,
        options: analysis.analysisOptions,
        createdAt: analysis.createdAt,
        completedAt: analysis.completedAt
      };

    } catch (error) {
      console.error('Error getting analysis results:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Search chunks in analysis results
   */
  async searchChunks(sessionId, searchCriteria) {
    try {
      const analysis = await TreeSitterAnalysis.findOne({ sessionId });
      
      if (!analysis) {
        return {
          success: false,
          error: 'Analysis not found'
        };
      }

      if (analysis.status !== 'completed') {
        return {
          success: false,
          error: 'Analysis not completed',
          status: analysis.status
        };
      }

      const results = analysis.searchChunks(searchCriteria);
      const totalResults = analysis.results.files.reduce((total, file) => 
        total + (file.chunks ? file.chunks.length : 0), 0);

      return {
        success: true,
        results,
        totalResults,
        searchCriteria
      };

    } catch (error) {
      console.error('Error searching chunks:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Export analysis results
   */
  async exportAnalysis(sessionId, format = 'json') {
    try {
      const analysis = await TreeSitterAnalysis.findOne({ sessionId });
      
      if (!analysis) {
        return {
          success: false,
          error: 'Analysis not found'
        };
      }

      if (analysis.status !== 'completed') {
        return {
          success: false,
          error: 'Analysis not completed',
          status: analysis.status
        };
      }

      let exportData;
      
      switch (format.toLowerCase()) {
        case 'json':
          exportData = {
            sessionId: analysis.sessionId,
            createdAt: analysis.createdAt,
            completedAt: analysis.completedAt,
            analysis: analysis.results,
            statistics: analysis.statistics,
            options: analysis.analysisOptions
          };
          break;
          
        case 'csv':
          // Convert chunks to CSV format
          const csvData = this.convertToCSV(analysis.results.files);
          exportData = csvData;
          break;
          
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      return {
        success: true,
        format,
        data: exportData,
        filename: `treesitter-analysis-${sessionId}-${Date.now()}.${format}`
      };

    } catch (error) {
      console.error('Error exporting analysis:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Convert analysis results to CSV format
   */
  convertToCSV(files) {
    const csvRows = [];
    
    // CSV header
    csvRows.push([
      'File Path',
      'Chunk Type',
      'Chunk Name',
      'Start Line',
      'End Line',
      'Complexity',
      'Language',
      'Is Async',
      'Is Static',
      'Visibility',
      'Parameters Count',
      'Dependencies Count',
      'Has Comments'
    ].join(','));

    // CSV data rows
    for (const file of files) {
      if (!file.success) continue;
      
      for (const chunk of file.chunks) {
        const row = [
          `"${file.filePath}"`,
          chunk.type,
          `"${chunk.name}"`,
          chunk.startLine,
          chunk.endLine,
          chunk.metadata.complexity,
          file.metadata?.language || 'unknown',
          chunk.metadata.isAsync,
          chunk.metadata.isStatic,
          chunk.metadata.visibility,
          chunk.metadata.parameters?.length || 0,
          chunk.metadata.dependencies?.length || 0,
          (chunk.metadata.comments?.length || 0) > 0
        ];
        csvRows.push(row.join(','));
      }
    }

    return csvRows.join('\n');
  }

  /**
   * Clean up old analysis records
   */
  async cleanupOldAnalyses() {
    try {
      const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      
      const result = await TreeSitterAnalysis.deleteMany({
        createdAt: { $lt: cutoffDate }
      });

      console.log(`Cleaned up ${result.deletedCount} old Tree-sitter analysis records`);
      return result.deletedCount;

    } catch (error) {
      console.error('Error cleaning up old analyses:', error);
      throw error;
    }
  }
}

export default TreeSitterWorker;
