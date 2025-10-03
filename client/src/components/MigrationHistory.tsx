import React, { useState, useEffect } from 'react';
import { Clock, FileText, ArrowRight, Download, Trash2, Calendar, Code, Database } from 'lucide-react';
import apiService from '../services/api';

interface MigrationHistoryItem {
  id: string;
  sessionId: string;
  userId: string;
  fromLanguage: string;
  toLanguage: string;
  originalFilename: string;
  migratedFilename: string;
  createdAt: string;
  status: 'completed' | 'failed' | 'processing';
  summary: string;
  changes: string[];
  isDemo: boolean;
}

interface MigrationHistoryProps {
  userId: string;
  onDownloadMigration: (sessionId: string, filename: string) => void;
  onDeleteMigration: (sessionId: string) => void;
}

const MigrationHistory: React.FC<MigrationHistoryProps> = ({
  userId,
  onDownloadMigration,
  onDeleteMigration
}) => {
  const [history, setHistory] = useState<MigrationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch migration history
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // This would be a new API endpoint to get migration history
        const response = await apiService.getMigrationHistory(userId);
        setHistory(response.data || []);
      } catch (err: any) {
        console.error('Error fetching migration history:', err);
        setError('Failed to load migration history');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchHistory();
    }
  }, [userId]);

  // Filter and sort history - only show completed migrations, sorted by newest first
  const filteredHistory = history
    .filter(item => {
      // Only show completed migrations
      if (item.status !== 'completed') return false;

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          item.originalFilename.toLowerCase().includes(searchLower) ||
          item.fromLanguage.toLowerCase().includes(searchLower) ||
          item.toLanguage.toLowerCase().includes(searchLower) ||
          item.summary.toLowerCase().includes(searchLower)
        );
      }

      return true;
    })
    .sort((a, b) => {
      // Sort by newest first
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });


  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const getStatusColor = (status: string, isDemo: boolean) => {
    if (isDemo) return 'bg-blue-100 text-blue-800';
    if (status === 'completed') return 'bg-green-100 text-green-800';
    if (status === 'failed') return 'bg-red-100 text-red-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const getLanguageIcon = (language: string) => {
    if (language.includes('react') || language.includes('vue') || language.includes('angular')) {
      return <Code className="w-4 h-4" />;
    }
    if (language.includes('mysql') || language.includes('postgresql') || language.includes('mongodb')) {
      return <Database className="w-4 h-4" />;
    }
    return <FileText className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading migration history...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-6xl mb-4">⚠️</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading History</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Migration History</h2>
            <p className="text-sm text-gray-600 mt-1">
              {filteredHistory.length} of {history.length} migrations
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-500">Last updated: {formatDate(new Date().toISOString())}</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search completed migrations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="divide-y divide-gray-200">
        {filteredHistory.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Migrations Found</h3>
            <p className="text-gray-600">
              {searchTerm 
                ? 'No completed migrations match your search.' 
                : 'No completed migrations found. Start your first migration to see it here.'}
            </p>
          </div>
        ) : (
          filteredHistory.map((item) => (
            <div key={item.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* Header Row */}
                  <div className="flex items-center space-x-3 mb-2">
                    {getLanguageIcon(item.fromLanguage)}
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{item.fromLanguage}</span>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">{item.toLanguage}</span>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status, item.isDemo)}`}>
                      {item.isDemo ? 'Demo' : item.status}
                    </span>
                  </div>

                  {/* File Info */}
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                    <div className="flex items-center space-x-1">
                      <FileText className="w-4 h-4" />
                      <span className="truncate max-w-xs">{item.originalFilename}</span>
                    </div>
                    <span>→</span>
                    <span className="truncate max-w-xs">{item.migratedFilename}</span>
                  </div>

                  {/* Summary */}
                  {item.summary && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.summary}</p>
                  )}

                  {/* Changes */}
                  {item.changes && item.changes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {item.changes.slice(0, 3).map((change, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800"
                        >
                          {change}
                        </span>
                      ))}
                      {item.changes.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{item.changes.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(item.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => onDownloadMigration(item.sessionId, item.migratedFilename)}
                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                    title="Download Result"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteMigration(item.sessionId)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Delete Migration"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {filteredHistory.length > 10 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {Math.min(10, filteredHistory.length)} of {filteredHistory.length} migrations
            </p>
            <div className="flex items-center space-x-2">
              <button className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100">
                Previous
              </button>
              <button className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100">
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MigrationHistory;
