import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import apiService from '../services/api';
import { useUpload } from '../contexts/UploadContext';
import { Upload, Lock, X } from 'lucide-react';
import { useNavigationBlocker } from '../hooks/useNavigationBlocker';

interface LayoutProps {
  children: React.ReactNode;
  showNavbar?: boolean;
}

interface User {
  name: string;
  email: string;
  avatar?: string;
}

// Helper function to decode JWT token
const decodeJWT = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
};

const Layout: React.FC<LayoutProps> = ({ children, showNavbar = true }) => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const { uploadState, cancelUpload } = useUpload();
  
  // Prevent browser navigation during uploads
  useNavigationBlocker();

  // Check for existing user session on component mount
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('userData');
    
    if (token && storedUser) {
      // Set the token in the API service
      apiService.setToken(token);
      
      try {
        // Parse stored user data
        const userData = JSON.parse(storedUser);
        setUser({
          name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.username || 'User',
          email: userData.email || 'user@example.com',
          avatar: undefined
        });
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        // Fallback: try to decode JWT token
        const decoded = decodeJWT(token);
        if (decoded && decoded.userId) {
          setUser({
            name: 'Authenticated User',
            email: 'user@example.com',
            avatar: undefined
          });
        }
      }
    } else if (token) {
      // Only token available, try to decode it
      apiService.setToken(token);
      const decoded = decodeJWT(token);
      if (decoded && decoded.userId) {
        setUser({
          name: 'Authenticated User',
          email: 'user@example.com',
          avatar: undefined
        });
      }
    } else {
      setUser(null);
    }
  }, []);

  // Function to handle successful login
  const handleLoginSuccess = (userData: any, token: string) => {
    // Set the token in the API service
    apiService.setToken(token);
    
    // Store user data in localStorage
    localStorage.setItem('userData', JSON.stringify(userData));
    
    setUser({
      name: `${userData.firstName} ${userData.lastName}`,
      email: userData.email,
      avatar: undefined
    });
  };

  const handleLogout = () => {
    // Clear local storage and user state
    apiService.logout();
    localStorage.removeItem('userData');
    setUser(null);
    
    // Redirect to home page
    navigate('/');
    
    // Show success message
    alert('Successfully logged out!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 relative">
      {showNavbar && (
        <Navbar
          user={user}
          onLogout={handleLogout}
        />
      )}
      <main className="flex-1">
        {children}
      </main>
      
      {/* Upload Blocking Overlay */}
      {uploadState.isUploading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Upload className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Upload in Progress</h3>
                  <p className="text-sm text-gray-600">
                    {uploadState.uploadType === 'single' && 'Uploading single file...'}
                    {uploadState.uploadType === 'zip' && 'Processing ZIP file...'}
                    {uploadState.uploadType === 'multiple' && 'Uploading multiple files...'}
                  </p>
                </div>
              </div>
              <button
                onClick={cancelUpload}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Cancel upload"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progress</span>
                <span>{uploadState.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadState.progress}%` }}
                />
              </div>
            </div>
            
            {/* Current File Info */}
            {uploadState.currentFile && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-1">Current file:</p>
                <p className="text-sm font-medium text-gray-900 truncate">{uploadState.currentFile}</p>
              </div>
            )}
            
            {/* File Count Info */}
            {uploadState.totalFiles && (
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  {uploadState.completedFiles || 0} of {uploadState.totalFiles} files completed
                </p>
              </div>
            )}
            
            {/* Info Message */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <Upload className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-green-800 font-medium">Upload in Progress</p>
                  <p className="text-xs text-green-700 mt-1">
                    Please wait for the upload to complete. You can cancel the upload if needed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;