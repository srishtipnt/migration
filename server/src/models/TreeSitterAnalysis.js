import mongoose from 'mongoose';

// Schema for individual code chunks
const codeChunkSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'function', 'method', 'class', 'interface', 'type', 'enum',
      'variable', 'import', 'export', 'try-catch', 'conditional',
      'loop', 'switch', 'arrow-function', 'generator', 'async-function', 'block'
    ]
  },
  name: {
    type: String,
    required: true
  },
  code: {
    type: String,
    required: true
  },
  startLine: {
    type: Number,
    required: true
  },
  endLine: {
    type: Number,
    required: true
  },
  startColumn: {
    type: Number,
    required: true
  },
  endColumn: {
    type: Number,
    required: true
  },
  startIndex: {
    type: Number,
    required: true
  },
  endIndex: {
    type: Number,
    required: true
  },
  metadata: {
    filePath: {
      type: String,
      required: true
    },
    complexity: {
      type: Number,
      default: 1,
      min: 1,
      max: 10
    },
    dependencies: [{
      type: {
        type: String,
        enum: ['import', 'require']
      },
      source: String,
      line: Number
    }],
    parameters: [{
      name: String,
      type: String,
      line: Number
    }],
    returnType: String,
    visibility: {
      type: String,
      enum: ['public', 'private', 'protected'],
      default: 'public'
    },
    isAsync: {
      type: Boolean,
      default: false
    },
    isGenerator: {
      type: Boolean,
      default: false
    },
    isStatic: {
      type: Boolean,
      default: false
    },
    comments: [{
      text: String,
      type: {
        type: String,
        enum: ['line', 'block']
      }
    }]
  }
}, { _id: false });

// Schema for file analysis results
const fileAnalysisSchema = new mongoose.Schema({
  filePath: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  lastModified: {
    type: Date,
    required: true
  },
  success: {
    type: Boolean,
    required: true
  },
  error: String,
  chunks: [codeChunkSchema],
  metadata: {
    language: {
      type: String,
      enum: ['javascript', 'typescript']
    },
    totalChunks: {
      type: Number,
      default: 0
    },
    parsedAt: {
      type: Date,
      default: Date.now
    }
  }
}, { _id: false });

// Main schema for Tree-sitter analysis sessions
const treeSitterAnalysisSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    ref: 'Session'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  progress: {
    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    currentFile: String,
    filesProcessed: {
      type: Number,
      default: 0
    },
    totalFiles: {
      type: Number,
      default: 0
    },
    chunksFound: {
      type: Number,
      default: 0
    },
    errors: [String]
  },
  analysisOptions: {
    maxFiles: {
      type: Number,
      default: 500
    },
    maxFileSize: {
      type: Number,
      default: 5 * 1024 * 1024 // 5MB
    },
    includePatterns: [String],
    excludePatterns: [String],
    recursive: {
      type: Boolean,
      default: true
    }
  },
  results: {
    success: {
      type: Boolean,
      default: false
    },
    files: [fileAnalysisSchema],
    errors: [String],
    summary: {
      totalFiles: {
        type: Number,
        default: 0
      },
      parsedFiles: {
        type: Number,
        default: 0
      },
      skippedFiles: {
        type: Number,
        default: 0
      },
      totalChunks: {
        type: Number,
        default: 0
      },
      processingTime: {
        type: Number,
        default: 0
      }
    }
  },
  statistics: {
    byType: mongoose.Schema.Types.Mixed,
    byLanguage: mongoose.Schema.Types.Mixed,
    totalChunks: {
      type: Number,
      default: 0
    },
    averageComplexity: {
      type: Number,
      default: 0
    },
    totalFiles: {
      type: Number,
      default: 0
    },
    successfulFiles: {
      type: Number,
      default: 0
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    }
  }
});

// Indexes for better query performance
// Note: sessionId already has unique index from unique: true
treeSitterAnalysisSchema.index({ userId: 1, createdAt: -1 });
treeSitterAnalysisSchema.index({ status: 1 });
treeSitterAnalysisSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Update the updatedAt field before saving
treeSitterAnalysisSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to update progress
treeSitterAnalysisSchema.methods.updateProgress = function(progressData) {
  this.progress = {
    ...this.progress,
    ...progressData,
    percentage: Math.min(100, Math.max(0, progressData.percentage || this.progress.percentage))
  };
  
  if (this.progress.percentage === 100) {
    this.status = 'completed';
    this.completedAt = new Date();
  }
  
  return this.save();
};

// Method to add error
treeSitterAnalysisSchema.methods.addError = function(error) {
  this.progress.errors.push(error);
  return this.save();
};

// Method to get chunk statistics
treeSitterAnalysisSchema.methods.getChunkStatistics = function() {
  if (!this.results.success || !this.results.files) {
    return null;
  }

  const stats = {
    byType: {},
    byLanguage: {},
    totalChunks: 0,
    averageComplexity: 0,
    totalFiles: this.results.files.length,
    successfulFiles: 0
  };

  let totalComplexity = 0;

  for (const file of this.results.files) {
    if (file.success) {
      stats.successfulFiles++;
      
      const language = file.metadata?.language || 'unknown';
      stats.byLanguage[language] = (stats.byLanguage[language] || 0) + 1;

      for (const chunk of file.chunks) {
        stats.totalChunks++;
        stats.byType[chunk.type] = (stats.byType[chunk.type] || 0) + 1;
        totalComplexity += chunk.metadata.complexity || 0;
      }
    }
  }

  stats.averageComplexity = stats.totalChunks > 0 ? 
    totalComplexity / stats.totalChunks : 0;

  return stats;
};

// Method to search chunks
treeSitterAnalysisSchema.methods.searchChunks = function(criteria) {
  if (!this.results.success || !this.results.files) {
    return [];
  }

  const results = [];
  
  for (const file of this.results.files) {
    if (!file.success) continue;
    
    for (const chunk of file.chunks) {
      let matches = true;
      
      // Filter by type
      if (criteria.type && chunk.type !== criteria.type) {
        matches = false;
      }
      
      // Filter by language
      if (criteria.language && file.metadata?.language !== criteria.language) {
        matches = false;
      }
      
      // Filter by complexity
      if (criteria.minComplexity && chunk.metadata.complexity < criteria.minComplexity) {
        matches = false;
      }
      if (criteria.maxComplexity && chunk.metadata.complexity > criteria.maxComplexity) {
        matches = false;
      }
      
      // Filter by async
      if (criteria.isAsync !== undefined && chunk.metadata.isAsync !== criteria.isAsync) {
        matches = false;
      }
      
      // Filter by comments
      if (criteria.hasComments !== undefined) {
        const hasComments = chunk.metadata.comments && chunk.metadata.comments.length > 0;
        if (hasComments !== criteria.hasComments) {
          matches = false;
        }
      }
      
      // Filter by query (search in name and code)
      if (criteria.query) {
        const query = criteria.query.toLowerCase();
        const nameMatch = chunk.name.toLowerCase().includes(query);
        const codeMatch = chunk.code.toLowerCase().includes(query);
        if (!nameMatch && !codeMatch) {
          matches = false;
        }
      }
      
      if (matches) {
        results.push({
          ...chunk.toObject(),
          filePath: file.filePath,
          fileSize: file.fileSize,
          lastModified: file.lastModified
        });
      }
    }
  }
  
  // Apply limit and offset
  const offset = parseInt(criteria.offset) || 0;
  const limit = parseInt(criteria.limit) || 50;
  
  return results.slice(offset, offset + limit);
};

export default mongoose.model('TreeSitterAnalysis', treeSitterAnalysisSchema);
