import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, Loader2, Search, FileText, Code, Database } from 'lucide-react';
import apiService from '../services/api';

interface MigrationJob {
  jobId: string;
  sessionId: string;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  totalFiles: number;
  processedFiles: number;
  totalChunks: number;
  error?: {
    message: string;
    timestamp: Date;
  };
  processingStartedAt?: Date;
  processingCompletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface CodeChunk {
  chunkId: string;
  filePath: string;
  fileName: string;
  fileExtension: string;
  chunkType: string;
  chunkName: string;
  content: string;
  startLine: number;
  endLine: number;
  metadata: {
    language: string;
    complexity: number;
    dependencies: string[];
    exports: string[];
  };
  createdAt: Date;
}

const MigrationJobsDashboard: React.FC = () => {
  const [jobs, setJobs] = useState<MigrationJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<MigrationJob | null>(null);
  const [chunks, setChunks] = useState<CodeChunk[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getMigrationJobs();
      if (response.success) {
        setJobs(response.data.jobs);
      }
    } catch (error) {
      console.error('Failed to load jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadJobChunks = async (job: MigrationJob) => {
    try {
      setSelectedJob(job);
      const response = await apiService.getJobChunks(job.sessionId);
      if (response.success) {
        setChunks(response.data.chunks);
      }
    } catch (error) {
      console.error('Failed to load job chunks:', error);
    }
  };

  const searchChunks = async () => {
    if (!searchQuery.trim()) return;

    try {
      setIsSearching(true);
      const response = await apiService.searchCodeChunks(searchQuery);
      if (response.success) {
        setChunks(response.data.chunks);
        setSelectedJob(null); // Clear selected job since we're showing search results
      }
    } catch (error) {
      console.error('Failed to search chunks:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getChunkTypeIcon = (chunkType: string) => {
    switch (chunkType) {
      case 'function':
        return <Code className="h-4 w-4 text-blue-500" />;
      case 'class':
        return <Database className="h-4 w-4 text-purple-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Migration Jobs Dashboard</h1>
          <p className="text-gray-600">Monitor and explore your code migration jobs and chunks</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search code chunks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchChunks()}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <button
              onClick={searchChunks}
              disabled={isSearching || !searchQuery.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Search
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Jobs List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Migration Jobs</h2>
              </div>
              <div className="p-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                  </div>
                ) : jobs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Database className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No migration jobs found</p>
                    <p className="text-sm">Upload a ZIP file to create your first job</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {jobs.map((job) => (
                      <div
                        key={job.jobId}
                        onClick={() => loadJobChunks(job)}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedJob?.jobId === job.jobId
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(job.status)}
                            <span className="font-medium text-sm">{job.sessionId}</span>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                            {job.status}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 space-y-1">
                          <div>Files: {job.processedFiles}/{job.totalFiles}</div>
                          <div>Chunks: {job.totalChunks}</div>
                          <div>Created: {new Date(job.createdAt).toLocaleDateString()}</div>
                        </div>
                        {job.error && (
                          <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                            Error: {job.error.message}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chunks List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedJob ? `Code Chunks - ${selectedJob.sessionId}` : 'Search Results'}
                </h2>
                {selectedJob && (
                  <p className="text-sm text-gray-600 mt-1">
                    {chunks.length} chunks found
                  </p>
                )}
              </div>
              <div className="p-4">
                {chunks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No chunks found</p>
                    <p className="text-sm">
                      {selectedJob ? 'Select a job to view its chunks' : 'Try searching for code'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {chunks.map((chunk) => (
                      <div key={chunk.chunkId} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {getChunkTypeIcon(chunk.chunkType)}
                            <div>
                              <h3 className="font-medium text-gray-900">{chunk.chunkName}</h3>
                              <p className="text-sm text-gray-500">{chunk.filePath}</p>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500">
                            Lines {chunk.startLine}-{chunk.endLine}
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded p-3 mb-3">
                          <pre className="text-sm text-gray-800 whitespace-pre-wrap overflow-x-auto">
                            {chunk.content}
                          </pre>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Code className="h-3 w-3" />
                            {chunk.metadata.language}
                          </span>
                          <span>Complexity: {chunk.metadata.complexity}</span>
                          {chunk.metadata.dependencies.length > 0 && (
                            <span>Dependencies: {chunk.metadata.dependencies.length}</span>
                          )}
                          {chunk.metadata.exports.length > 0 && (
                            <span>Exports: {chunk.metadata.exports.length}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MigrationJobsDashboard;







