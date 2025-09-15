import React, { useState, useEffect } from 'react';
import MigrationDashboard from '../components/MigrationDashboard';
import apiService from '../services/api';

const MigrationPage: React.FC = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize user data from JWT token
  useEffect(() => {
    let isMounted = true;

    const initializeUser = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check if user is authenticated by trying to get their files
        // This will validate the JWT token
        const response = await apiService.getUserFiles();
        
        if (isMounted) {
          // If we can get files, the user is authenticated
          // We can extract userId from the token or use a simple approach
          setUserId('authenticated-user'); // Simplified - we know user is authenticated
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to initialize user:', err);
          setError('Please log in to access the migration dashboard');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeUser();

    return () => {
      isMounted = false;
    };
  }, []);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading migration dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.href = '/login'} 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Show migration dashboard when user is ready
  if (userId) {
    return (
      <MigrationDashboard 
        userId={userId}
      />
    );
  }

  // Fallback state
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600">Preparing migration environment...</p>
      </div>
    </div>
  );
};

export default MigrationPage;