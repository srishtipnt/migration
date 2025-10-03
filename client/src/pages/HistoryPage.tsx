import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Eye, Trash2, AlertCircle } from 'lucide-react';
import MigrationHistory from '../components/MigrationHistory';
import apiService from '../services/api';
import toast from 'react-hot-toast';

const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize user data
  useEffect(() => {
    const initializeUser = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check if user is authenticated
        await apiService.getUserFiles();
        
        // Use the same user ID logic as MigrationPage
        // In a real app, you'd extract this from the JWT token
        const token = localStorage.getItem('authToken');
        if (token) {
          // Use the same user ID as MigrationPage
          setUserId('authenticated-user');
        } else {
          setError('Authentication required');
        }
      } catch (err: any) {
        console.error('Error initializing user:', err);
        setError('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    initializeUser();
  }, []);

  // Handle viewing a migration
  const handleViewMigration = (sessionId: string) => {
    // Navigate to migration results page with the session ID
    navigate(`/migration-results?sessionId=${sessionId}`);
  };

  // Handle downloading a migration result
  const handleDownloadMigration = async (sessionId: string, filename: string) => {
    try {
      toast.loading('Preparing download...', { id: 'download' });
      
      const blob = await apiService.downloadMigrationResult(sessionId, filename);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Download started!', { id: 'download' });
    } catch (error: any) {
      console.error('Error downloading migration:', error);
      toast.error('Failed to download migration result', { id: 'download' });
    }
  };

  // Handle deleting a migration
  const handleDeleteMigration = async (sessionId: string) => {
    try {
      if (!window.confirm('Are you sure you want to delete this migration? This action cannot be undone.')) {
        return;
      }

      toast.loading('Deleting migration...', { id: 'delete' });
      
      await apiService.deleteMigration(sessionId);
      
      toast.success('Migration deleted successfully!', { id: 'delete' });
      
      // Refresh the page to update the history
      window.location.reload();
    } catch (error: any) {
      console.error('Error deleting migration:', error);
      toast.error('Failed to delete migration', { id: 'delete' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading migration history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading History</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Retry
            </button>
            <button
              onClick={() => navigate('/migrate')}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Back to Migration
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/migrate')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Migration</span>
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Migration History</h1>
                <p className="text-gray-600 mt-1">
                  View and manage your past code migrations
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/migrate')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                New Migration
              </button>
            </div>
          </div>
        </div>

        {/* Migration History Component */}
        {userId && (
          <MigrationHistory
            userId={userId}
            onViewMigration={handleViewMigration}
            onDownloadMigration={handleDownloadMigration}
            onDeleteMigration={handleDeleteMigration}
          />
        )}

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-3">
              <Eye className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">View Results</h3>
            </div>
            <p className="text-gray-600 text-sm">
              Click the eye icon on any migration to view detailed results and code comparisons.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-3">
              <Download className="w-6 h-6 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Download Files</h3>
            </div>
            <p className="text-gray-600 text-sm">
              Download migrated code files directly to your computer for further use.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-3">
              <Trash2 className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900">Manage History</h3>
            </div>
            <p className="text-gray-600 text-sm">
              Delete old migrations to keep your history clean and organized.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;
