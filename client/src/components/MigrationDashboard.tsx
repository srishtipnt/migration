import React, { useState, useEffect, useCallback } from 'react';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock, 
  FileText, 
  Code, 
  Settings,
  Download,
  RefreshCw,
  Eye,
  Copy,
  ExternalLink,
  Upload,
  Folder,
  Lightbulb,
  Zap,
  Target,
  ArrowRight
} from 'lucide-react';
import { useMigration } from '../hooks/useApi';
import DiffViewer from './DiffViewer';
import FileUpload from './FileUpload';

interface MigrationDashboardProps {
  sessionId: string;
  userId: string;
}

interface SmartMigrationSuggestion {
  id: string;
  title: string;
  description: string;
  category: 'framework' | 'language' | 'database' | 'styling' | 'testing' | 'build';
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: string;
  confidence: number;
  benefits: string[];
  risks: string[];
  icon: string;
  autoDetected: boolean;
}

interface MigrationResult {
  success: boolean;
  migrationId: string;
  command: string;
  targetTechnology: string;
  processingTime: number;
  plan: {
    analysis: string;
    strategy: string;
    codeTransformations: any[];
    dependencies: any[];
    configuration: any[];
    testing: any[];
    risks: any[];
    implementationOrder: any[];
    timeline: any;
  };
  results: Array<{
    success: boolean;
    filePath: string;
    migratedChunks: Array<{
      originalChunk: {
        id: string;
        name: string;
        type: string;
        filePath: string;
        language: string;
        complexity: string;
      };
      migratedCode: string;
      validation: any;
      error: string | null;
    }>;
    migratedFile: {
      content: string;
      metadata: any;
    } | null;
    statistics: any;
  }>;
  validation: any;
  statistics: {
    chunksAnalyzed: number;
    filesProcessed: number;
    successfulFiles: number;
    failedFiles: number;
    successRate: number;
    averageTimePerChunk: number;
  };
  metadata: any;
  message: string;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
  message: string;
}

const MigrationDashboard: React.FC<MigrationDashboardProps> = ({ sessionId, userId }) => {
  const { 
    isLoading, 
    error, 
    migrationResult, 
    processMigration, 
    getTemplates, 
    validateCommand 
  } = useMigration();

  // State management
  const [smartSuggestions, setSmartSuggestions] = useState<SmartMigrationSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<SmartMigrationSuggestion | null>(null);
  const [customMigration, setCustomMigration] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'suggestions' | 'results' | 'plan' | 'validation'>('upload');
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [showDiff, setShowDiff] = useState(false);
  const [analyzingFiles, setAnalyzingFiles] = useState(false);

  // Mock smart suggestions based on common migration patterns
  const generateSmartSuggestions = useCallback(() => {
    const suggestions: SmartMigrationSuggestion[] = [
      {
        id: 'react-hooks',
        title: 'Convert to React Hooks',
        description: 'Convert class components to functional components with hooks',
        category: 'framework',
        difficulty: 'easy',
        estimatedTime: '1-2 hours',
        confidence: 95,
        benefits: ['Modern React patterns', 'Better performance', 'Easier testing'],
        risks: ['State management changes', 'Lifecycle method updates'],
        icon: '⚛️',
        autoDetected: true
      },
      {
        id: 'typescript',
        title: 'Add TypeScript Support',
        description: 'Convert JavaScript files to TypeScript with proper type definitions',
        category: 'language',
        difficulty: 'medium',
        estimatedTime: '2-4 hours',
        confidence: 90,
        benefits: ['Type safety', 'Better IDE support', 'Reduced bugs'],
        risks: ['Build configuration changes', 'Type definition complexity'],
        icon: '📘',
        autoDetected: true
      },
      {
        id: 'tailwind',
        title: 'Convert to Tailwind CSS',
        description: 'Replace custom CSS with Tailwind utility classes',
        category: 'styling',
        difficulty: 'easy',
        estimatedTime: '1-3 hours',
        confidence: 85,
        benefits: ['Utility-first approach', 'Consistent design', 'Smaller bundle'],
        risks: ['Learning curve', 'Design system changes'],
        icon: '🎨',
        autoDetected: true
      },
      {
        id: 'nextjs',
        title: 'Migrate to Next.js',
        description: 'Convert React app to Next.js for better SEO and performance',
        category: 'framework',
        difficulty: 'hard',
        estimatedTime: '4-8 hours',
        confidence: 80,
        benefits: ['SSR/SSG', 'Better SEO', 'Performance optimization'],
        risks: ['Routing changes', 'Build system updates', 'Deployment changes'],
        icon: '🚀',
        autoDetected: true
      }
    ];

    setSmartSuggestions(suggestions);
  }, []);

  // Load smart suggestions on component mount
  useEffect(() => {
    generateSmartSuggestions();
  }, [generateSmartSuggestions]);

  // Handle file upload completion
  const handleFilesUploaded = useCallback((files: any[]) => {
    console.log('Files uploaded:', files);
    setAnalyzingFiles(true);
    
    // Simulate file analysis
    setTimeout(() => {
      setAnalyzingFiles(false);
      setActiveTab('suggestions');
    }, 2000);
  }, []);

  // Handle smart suggestion selection
  const handleSuggestionSelect = useCallback((suggestion: SmartMigrationSuggestion) => {
    setSelectedSuggestion(suggestion);
    setActiveTab('plan');
  }, []);

  // Handle custom migration
  const handleCustomMigration = useCallback((migration: string) => {
    setCustomMigration(migration);
    setActiveTab('plan');
  }, []);

  // Execute migration
  const executeMigration = useCallback(async () => {
    if (!selectedSuggestion && !customMigration) return;

    const command = selectedSuggestion 
      ? `${selectedSuggestion.title.toLowerCase()} migration`
      : customMigration;
    
    const targetTechnology = selectedSuggestion?.title || 'Custom Migration';

    try {
      await processMigration(sessionId, userId, command, targetTechnology);
      setActiveTab('results');
    } catch (err) {
      console.error('Migration failed:', err);
    }
  }, [selectedSuggestion, customMigration, processMigration, sessionId, userId]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            AI Migration Dashboard
          </h1>
          <p className="text-gray-600">
            Upload your project files and let AI suggest the best migrations for your codebase
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            {[
              { id: 'upload', label: 'Upload Files', icon: Upload },
              { id: 'suggestions', label: 'AI Suggestions', icon: Lightbulb },
              { id: 'plan', label: 'Migration Plan', icon: FileText },
              { id: 'results', label: 'Results', icon: CheckCircle },
              { id: 'validation', label: 'Validation', icon: AlertCircle }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center space-x-2 px-3 py-2 border-b-2 font-medium text-sm ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'upload' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Upload Project Files</h2>
            <FileUpload 
              sessionId={sessionId}
              userId={userId}
              onFilesUploaded={handleFilesUploaded}
            />
            
            {analyzingFiles && (
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <RefreshCw className="w-5 h-5 text-blue-500 animate-spin mr-2" />
                  <h3 className="text-sm font-medium text-blue-800">Analyzing your files...</h3>
                </div>
                <p className="mt-1 text-sm text-blue-700">
                  Our AI is examining your codebase to suggest the best migrations
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'suggestions' && (
          <div className="space-y-6">
            {/* AI Suggestions Header */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Lightbulb className="w-6 h-6 text-yellow-500" />
                <h2 className="text-xl font-semibold text-gray-900">AI-Powered Migration Suggestions</h2>
              </div>
              <p className="text-gray-600">
                Based on your uploaded files, here are the migrations our AI recommends for your project
              </p>
            </div>

            {/* Smart Suggestions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {smartSuggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleSuggestionSelect(suggestion)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{suggestion.icon}</span>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{suggestion.title}</h3>
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            suggestion.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                            suggestion.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {suggestion.difficulty}
                          </span>
                          <span className="text-xs text-gray-500">{suggestion.estimatedTime}</span>
                        </div>
                      </div>
                    </div>
                    {suggestion.autoDetected && (
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        AI Detected
                      </span>
                    )}
                  </div>

                  <p className="text-gray-600 mb-4">{suggestion.description}</p>

                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Benefits</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {suggestion.benefits.map((benefit, index) => (
                          <li key={index} className="flex items-center">
                            <CheckCircle className="w-3 h-3 text-green-500 mr-2" />
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Risks</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {suggestion.risks.map((risk, index) => (
                          <li key={index} className="flex items-center">
                            <AlertCircle className="w-3 h-3 text-yellow-500 mr-2" />
                            {risk}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Target className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-500">
                          {suggestion.confidence}% confidence
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSuggestionSelect(suggestion);
                        }}
                        className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        <span>Select</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Custom Migration Option */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Custom Migration</h3>
              <p className="text-gray-600 mb-4">
                Don't see what you're looking for? Describe your migration needs and our AI will help
              </p>
              <div className="flex space-x-4">
                <input
                  type="text"
                  value={customMigration}
                  onChange={(e) => setCustomMigration(e.target.value)}
                  placeholder="e.g., Convert to Vue.js, Add GraphQL support, Migrate to Docker..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={() => handleCustomMigration(customMigration)}
                  disabled={!customMigration.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Analyze
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'plan' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Migration Plan</h2>
            
            {selectedSuggestion ? (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">
                    {selectedSuggestion.icon} {selectedSuggestion.title}
                  </h3>
                  <p className="text-blue-800">{selectedSuggestion.description}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Migration Details</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Difficulty:</span>
                        <span className="font-medium">{selectedSuggestion.difficulty}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Estimated Time:</span>
                        <span className="font-medium">{selectedSuggestion.estimatedTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Confidence:</span>
                        <span className="font-medium">{selectedSuggestion.confidence}%</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Benefits</h4>
                    <ul className="space-y-1">
                      {selectedSuggestion.benefits.map((benefit, index) => (
                        <li key={index} className="flex items-center text-sm text-gray-600">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-200">
                  <button
                    onClick={executeMigration}
                    disabled={isLoading}
                    className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Play className="w-5 h-5" />
                    )}
                    <span>{isLoading ? 'Processing...' : 'Start Migration'}</span>
                  </button>
                </div>
              </div>
            ) : customMigration ? (
              <div className="space-y-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                    Custom Migration: {customMigration}
                  </h3>
                  <p className="text-yellow-800">
                    Our AI will analyze your request and create a custom migration plan
                  </p>
                </div>

                <div className="pt-6 border-t border-gray-200">
                  <button
                    onClick={executeMigration}
                    disabled={isLoading}
                    className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Play className="w-5 h-5" />
                    )}
                    <span>{isLoading ? 'Processing...' : 'Start Custom Migration'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Lightbulb className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Migration Selected</h3>
                <p className="text-gray-600">
                  Please go back to the AI Suggestions tab and select a migration to proceed
                </p>
                <button
                  onClick={() => setActiveTab('suggestions')}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Back to Suggestions
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'results' && (
          <div className="space-y-6">
            {/* Results Header */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Migration Results</h2>
                  <p className="text-gray-600 mt-1">
                    {migrationResult ? 'Migration completed successfully!' : 'No migration results yet'}
                  </p>
                </div>
                {migrationResult && (
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>{(migrationResult as any)?.processingTime}ms</span>
                  </div>
                )}
              </div>
            </div>

            {/* Results Content */}
            {migrationResult ? (
              <div className="space-y-6">
                {/* Statistics */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Migration Statistics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{migrationResult.statistics.chunksAnalyzed}</div>
                      <div className="text-sm text-gray-600">Chunks Analyzed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{migrationResult.statistics.successfulFiles}</div>
                      <div className="text-sm text-gray-600">Successful Files</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{migrationResult.statistics.failedFiles}</div>
                      <div className="text-sm text-gray-600">Failed Files</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{Math.round(migrationResult.statistics.successRate * 100)}%</div>
                      <div className="text-sm text-gray-600">Success Rate</div>
                    </div>
                  </div>
                </div>

                {/* File Results */}
                {migrationResult.results.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Migrated Files</h3>
                    <div className="space-y-4">
                      {migrationResult.results.map((result: MigrationResult['results'][0], index: number) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <FileText className="w-5 h-5 text-gray-500" />
                              <span className="font-medium text-gray-900">{result.filePath}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              {result.success ? (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-500" />
                              )}
                              <span className={`text-sm ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                                {result.success ? 'Success' : 'Failed'}
                              </span>
                            </div>
                          </div>
                          
                          {result.success && result.migratedFile && (
                            <div className="mt-4">
                              <button
                                onClick={() => {
                                  setSelectedFileIndex(index);
                                  setShowDiff(true);
                                }}
                                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                              >
                                <Eye className="w-4 h-4" />
                                <span>View Changes</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Diff Viewer */}
                {showDiff && migrationResult.results[selectedFileIndex] && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Code Changes</h3>
                      <button
                        onClick={() => setShowDiff(false)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                    <DiffViewer
                      originalCode={migrationResult.results[selectedFileIndex]?.migratedChunks?.[0]?.originalChunk?.name || 'No original code available'}
                      migratedCode={migrationResult.results[selectedFileIndex]?.migratedFile?.content || 'No migrated code available'}
                      fileName={migrationResult.results[selectedFileIndex]?.filePath || 'unknown'}
                      showLineNumbers={true}
                      theme="light"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Results Yet</h3>
                <p className="text-gray-600">
                  Run a migration to see the results here
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'validation' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Migration Validation</h2>
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Validation Results</h3>
              <p className="text-gray-600">
                Validation results will appear here after running a migration
              </p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <h4 className="text-sm font-medium text-red-800">Migration Error</h4>
            </div>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MigrationDashboard;