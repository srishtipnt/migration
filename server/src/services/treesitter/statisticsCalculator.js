/**
 * Statistics calculation utilities for code analysis
 */
class StatisticsCalculator {
  constructor() {
    this.complexityAnalyzer = new ComplexityAnalyzer();
    this.languageAnalyzer = new LanguageAnalyzer();
    this.typeAnalyzer = new TypeAnalyzer();
  }

  /**
   * Calculate comprehensive statistics for analysis results
   */
  calculateStatistics(files) {
    const stats = {
      byType: {},
      byLanguage: {},
      byComplexity: {},
      totalChunks: 0,
      averageComplexity: 0,
      totalFiles: files.length,
      successfulFiles: 0,
      skippedFiles: 0,
      totalSize: 0,
      processingTime: 0,
      complexityDistribution: {},
      languageDistribution: {},
      typeDistribution: {},
      fileSizeDistribution: {},
      chunkSizeDistribution: {},
      dependencyStats: {},
      parameterStats: {},
      commentStats: {}
    };

    let totalComplexity = 0;
    let totalChunkSize = 0;

    for (const file of files) {
      if (file.success) {
        stats.successfulFiles++;
        stats.totalSize += file.fileSize || 0;
        
        const language = file.metadata?.language || 'unknown';
        stats.byLanguage[language] = (stats.byLanguage[language] || 0) + 1;

        for (const chunk of file.chunks || []) {
          stats.totalChunks++;
          totalComplexity += chunk.metadata.complexity || 0;
          totalChunkSize += chunk.code.length;

          // Count by type
          stats.byType[chunk.type] = (stats.byType[chunk.type] || 0) + 1;

          // Count by complexity
          const complexity = chunk.metadata.complexity || 1;
          stats.byComplexity[complexity] = (stats.byComplexity[complexity] || 0) + 1;

          // Analyze dependencies
          this.analyzeDependencies(chunk, stats);

          // Analyze parameters
          this.analyzeParameters(chunk, stats);

          // Analyze comments
          this.analyzeComments(chunk, stats);
        }
      } else {
        stats.skippedFiles++;
      }
    }

    // Calculate averages
    stats.averageComplexity = stats.totalChunks > 0 ? 
      totalComplexity / stats.totalChunks : 0;

    // Calculate distributions
    stats.complexityDistribution = this.calculateDistribution(stats.byComplexity, stats.totalChunks);
    stats.languageDistribution = this.calculateDistribution(stats.byLanguage, stats.successfulFiles);
    stats.typeDistribution = this.calculateDistribution(stats.byType, stats.totalChunks);

    // Calculate file size distribution
    stats.fileSizeDistribution = this.calculateFileSizeDistribution(files);

    // Calculate chunk size distribution
    stats.chunkSizeDistribution = this.calculateChunkSizeDistribution(files);

    return stats;
  }

  /**
   * Analyze dependencies across chunks
   */
  analyzeDependencies(chunk, stats) {
    const dependencies = chunk.metadata.dependencies || [];
    
    if (!stats.dependencyStats.totalDependencies) {
      stats.dependencyStats = {
        totalDependencies: 0,
        byType: {},
        mostUsed: {},
        uniqueSources: new Set()
      };
    }

    stats.dependencyStats.totalDependencies += dependencies.length;

    dependencies.forEach(dep => {
      // Count by type
      stats.dependencyStats.byType[dep.type] = 
        (stats.dependencyStats.byType[dep.type] || 0) + 1;

      // Count usage
      stats.dependencyStats.mostUsed[dep.source] = 
        (stats.dependencyStats.mostUsed[dep.source] || 0) + 1;

      // Track unique sources
      stats.dependencyStats.uniqueSources.add(dep.source);
    });
  }

  /**
   * Analyze parameters across chunks
   */
  analyzeParameters(chunk, stats) {
    const parameters = chunk.metadata.parameters || [];
    
    if (!stats.parameterStats.totalParameters) {
      stats.parameterStats = {
        totalParameters: 0,
        averagePerFunction: 0,
        functionsWithParameters: 0,
        functionsWithoutParameters: 0,
        maxParameters: 0,
        parameterTypes: {}
      };
    }

    if (parameters.length > 0) {
      stats.parameterStats.totalParameters += parameters.length;
      stats.parameterStats.functionsWithParameters++;
      stats.parameterStats.maxParameters = Math.max(stats.parameterStats.maxParameters, parameters.length);

      // Count parameter types
      parameters.forEach(param => {
        const type = param.type || 'unknown';
        stats.parameterStats.parameterTypes[type] = 
          (stats.parameterStats.parameterTypes[type] || 0) + 1;
      });
    } else if (this.isFunctionChunk(chunk)) {
      stats.parameterStats.functionsWithoutParameters++;
    }

    // Calculate average
    const totalFunctions = stats.parameterStats.functionsWithParameters + stats.parameterStats.functionsWithoutParameters;
    stats.parameterStats.averagePerFunction = totalFunctions > 0 ? 
      stats.parameterStats.totalParameters / totalFunctions : 0;
  }

  /**
   * Analyze comments across chunks
   */
  analyzeComments(chunk, stats) {
    const comments = chunk.metadata.comments || [];
    
    if (!stats.commentStats.totalComments) {
      stats.commentStats = {
        totalComments: 0,
        chunksWithComments: 0,
        chunksWithoutComments: 0,
        averageCommentsPerChunk: 0,
        commentTypes: {}
      };
    }

    if (comments.length > 0) {
      stats.commentStats.totalComments += comments.length;
      stats.commentStats.chunksWithComments++;

      // Count comment types
      comments.forEach(comment => {
        const type = comment.type || 'unknown';
        stats.commentStats.commentTypes[type] = 
          (stats.commentStats.commentTypes[type] || 0) + 1;
      });
    } else {
      stats.commentStats.chunksWithoutComments++;
    }

    // Calculate average
    const totalChunks = stats.commentStats.chunksWithComments + stats.commentStats.chunksWithoutComments;
    stats.commentStats.averageCommentsPerChunk = totalChunks > 0 ? 
      stats.commentStats.totalComments / totalChunks : 0;
  }

  /**
   * Calculate percentage distribution
   */
  calculateDistribution(counts, total) {
    const distribution = {};
    for (const [key, count] of Object.entries(counts)) {
      distribution[key] = {
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      };
    }
    return distribution;
  }

  /**
   * Calculate file size distribution
   */
  calculateFileSizeDistribution(files) {
    const distribution = {
      small: 0,    // < 1KB
      medium: 0,   // 1KB - 10KB
      large: 0,    // 10KB - 100KB
      xlarge: 0    // > 100KB
    };

    files.forEach(file => {
      const size = file.fileSize || 0;
      if (size < 1024) {
        distribution.small++;
      } else if (size < 10 * 1024) {
        distribution.medium++;
      } else if (size < 100 * 1024) {
        distribution.large++;
      } else {
        distribution.xlarge++;
      }
    });

    return distribution;
  }

  /**
   * Calculate chunk size distribution
   */
  calculateChunkSizeDistribution(files) {
    const distribution = {
      tiny: 0,     // < 100 chars
      small: 0,    // 100 - 500 chars
      medium: 0,   // 500 - 2000 chars
      large: 0     // > 2000 chars
    };

    files.forEach(file => {
      if (file.success && file.chunks) {
        file.chunks.forEach(chunk => {
          const size = chunk.code.length;
          if (size < 100) {
            distribution.tiny++;
          } else if (size < 500) {
            distribution.small++;
          } else if (size < 2000) {
            distribution.medium++;
          } else {
            distribution.large++;
          }
        });
      }
    });

    return distribution;
  }

  /**
   * Check if chunk is a function
   */
  isFunctionChunk(chunk) {
    const functionTypes = ['function', 'method', 'arrow-function', 'async-function', 'generator'];
    return functionTypes.includes(chunk.type);
  }

  /**
   * Generate summary report
   */
  generateSummaryReport(stats) {
    return {
      overview: {
        totalFiles: stats.totalFiles,
        successfulFiles: stats.successfulFiles,
        skippedFiles: stats.skippedFiles,
        totalChunks: stats.totalChunks,
        averageComplexity: stats.averageComplexity.toFixed(2),
        totalSize: this.formatBytes(stats.totalSize)
      },
      topTypes: this.getTopItems(stats.byType, 5),
      topLanguages: this.getTopItems(stats.byLanguage, 3),
      complexityBreakdown: stats.complexityDistribution,
      fileSizeBreakdown: stats.fileSizeDistribution,
      chunkSizeBreakdown: stats.chunkSizeDistribution,
      dependencySummary: this.summarizeDependencies(stats.dependencyStats),
      parameterSummary: this.summarizeParameters(stats.parameterStats),
      commentSummary: this.summarizeComments(stats.commentStats)
    };
  }

  /**
   * Get top items from a count object
   */
  getTopItems(counts, limit) {
    return Object.entries(counts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([key, count]) => ({ name: key, count }));
  }

  /**
   * Summarize dependency statistics
   */
  summarizeDependencies(depStats) {
    if (!depStats.totalDependencies) {
      return { totalDependencies: 0, uniqueSources: 0 };
    }

    const mostUsed = Object.entries(depStats.mostUsed)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([source, count]) => ({ source, count }));

    return {
      totalDependencies: depStats.totalDependencies,
      uniqueSources: depStats.uniqueSources.size,
      mostUsed,
      byType: depStats.byType
    };
  }

  /**
   * Summarize parameter statistics
   */
  summarizeParameters(paramStats) {
    if (!paramStats.totalParameters) {
      return { totalParameters: 0, averagePerFunction: 0 };
    }

    return {
      totalParameters: paramStats.totalParameters,
      averagePerFunction: paramStats.averagePerFunction.toFixed(2),
      functionsWithParameters: paramStats.functionsWithParameters,
      functionsWithoutParameters: paramStats.functionsWithoutParameters,
      maxParameters: paramStats.maxParameters,
      parameterTypes: paramStats.parameterTypes
    };
  }

  /**
   * Summarize comment statistics
   */
  summarizeComments(commentStats) {
    if (!commentStats.totalComments) {
      return { totalComments: 0, averagePerChunk: 0 };
    }

    return {
      totalComments: commentStats.totalComments,
      averagePerChunk: commentStats.averageCommentsPerChunk.toFixed(2),
      chunksWithComments: commentStats.chunksWithComments,
      chunksWithoutComments: commentStats.chunksWithoutComments,
      commentTypes: commentStats.commentTypes
    };
  }

  /**
   * Format bytes to human readable string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

/**
 * Complexity analysis utility
 */
class ComplexityAnalyzer {
  /**
   * Analyze complexity patterns
   */
  analyzeComplexityPatterns(chunks) {
    const patterns = {
      highComplexityChunks: [],
      lowComplexityChunks: [],
      complexityTrends: {},
      averageByType: {}
    };

    chunks.forEach(chunk => {
      const complexity = chunk.metadata.complexity || 1;
      
      if (complexity >= 7) {
        patterns.highComplexityChunks.push(chunk);
      } else if (complexity <= 2) {
        patterns.lowComplexityChunks.push(chunk);
      }

      // Track trends by type
      if (!patterns.complexityTrends[chunk.type]) {
        patterns.complexityTrends[chunk.type] = [];
      }
      patterns.complexityTrends[chunk.type].push(complexity);
    });

    // Calculate averages by type
    Object.entries(patterns.complexityTrends).forEach(([type, complexities]) => {
      const average = complexities.reduce((sum, c) => sum + c, 0) / complexities.length;
      patterns.averageByType[type] = average.toFixed(2);
    });

    return patterns;
  }
}

/**
 * Language analysis utility
 */
class LanguageAnalyzer {
  /**
   * Analyze language-specific patterns
   */
  analyzeLanguagePatterns(files) {
    const patterns = {
      byLanguage: {},
      languageFeatures: {},
      importsByLanguage: {}
    };

    files.forEach(file => {
      const language = file.metadata?.language || 'unknown';
      
      if (!patterns.byLanguage[language]) {
        patterns.byLanguage[language] = {
          files: 0,
          chunks: 0,
          totalSize: 0,
          features: new Set()
        };
      }

      patterns.byLanguage[language].files++;
      patterns.byLanguage[language].totalSize += file.fileSize || 0;

      if (file.chunks) {
        patterns.byLanguage[language].chunks += file.chunks.length;
        
        file.chunks.forEach(chunk => {
          // Track language-specific features
          if (chunk.metadata.isAsync) {
            patterns.byLanguage[language].features.add('async');
          }
          if (chunk.metadata.isGenerator) {
            patterns.byLanguage[language].features.add('generator');
          }
          if (chunk.metadata.isStatic) {
            patterns.byLanguage[language].features.add('static');
          }
        });
      }
    });

    return patterns;
  }
}

/**
 * Type analysis utility
 */
class TypeAnalyzer {
  /**
   * Analyze chunk type patterns
   */
  analyzeTypePatterns(chunks) {
    const patterns = {
      byType: {},
      typeRelationships: {},
      typeComplexity: {}
    };

    chunks.forEach(chunk => {
      const type = chunk.type;
      
      if (!patterns.byType[type]) {
        patterns.byType[type] = {
          count: 0,
          totalComplexity: 0,
          averageComplexity: 0,
          totalSize: 0,
          averageSize: 0
        };
      }

      patterns.byType[type].count++;
      patterns.byType[type].totalComplexity += chunk.metadata.complexity || 1;
      patterns.byType[type].totalSize += chunk.code.length;
    });

    // Calculate averages
    Object.values(patterns.byType).forEach(typeStats => {
      typeStats.averageComplexity = typeStats.totalComplexity / typeStats.count;
      typeStats.averageSize = typeStats.totalSize / typeStats.count;
    });

    return patterns;
  }
}

export default StatisticsCalculator;
