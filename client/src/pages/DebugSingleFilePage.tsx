import React, { useState, useEffect } from 'react';
import apiService from '../services/api';

const DebugSingleFilePage: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('authToken');
    if (token) {
      setIsAuthenticated(true);
      // Try to get user info
      testAuthentication();
    }
  }, []);

  const testAuthentication = async () => {
    try {
      const response = await apiService.getUserSingleFiles();
      if (response.success) {
        setTestResult('✅ Authentication successful - can access single file endpoints');
        setUser({ authenticated: true });
      } else {
        setTestResult('❌ Authentication failed - cannot access single file endpoints');
      }
    } catch (error) {
      setTestResult(`❌ Authentication error: ${error.message}`);
    }
  };

  const testFileUpload = async () => {
    setIsLoading(true);
    try {
      // Create a test file
      const testContent = 'Test file content for debugging\nCreated at: ' + new Date().toISOString();
      const testFile = new File([testContent], 'test-debug.txt', { type: 'text/plain' });
      
      const response = await apiService.uploadSingleFileToCloudinary(testFile);
      if (response.success) {
        setTestResult(`✅ File upload successful! File ID: ${response.data.file.id}`);
      } else {
        setTestResult(`❌ File upload failed: ${response.message}`);
      }
    } catch (error) {
      setTestResult(`❌ File upload error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loginTest = async () => {
    try {
      const response = await apiService.login({
        email: 'test@example.com',
        password: 'testpassword123'
      });
      if (response.success) {
        setIsAuthenticated(true);
        setTestResult('✅ Login successful');
        await testAuthentication();
      } else {
        setTestResult(`❌ Login failed: ${response.message}`);
      }
    } catch (error) {
      setTestResult(`❌ Login error: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Single File Upload Debug Page
          </h1>
          
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h2 className="text-lg font-semibold mb-2">Authentication Status</h2>
              <p className="text-sm text-gray-600">
                Authenticated: {isAuthenticated ? '✅ Yes' : '❌ No'}
              </p>
              <p className="text-sm text-gray-600">
                Token: {localStorage.getItem('authToken') ? '✅ Present' : '❌ Missing'}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <h2 className="text-lg font-semibold mb-2">Test Results</h2>
              <p className="text-sm text-gray-600">{testResult || 'No tests run yet'}</p>
            </div>

            <div className="flex space-x-4">
              {!isAuthenticated ? (
                <button
                  onClick={loginTest}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Login with Test Account
                </button>
              ) : (
                <>
                  <button
                    onClick={testAuthentication}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Test Authentication
                  </button>
                  <button
                    onClick={testFileUpload}
                    disabled={isLoading}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    {isLoading ? 'Testing...' : 'Test File Upload'}
                  </button>
                </>
              )}
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="text-md font-semibold text-blue-800 mb-2">Instructions</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>1. If not authenticated, click "Login with Test Account"</li>
                <li>2. Click "Test Authentication" to verify API access</li>
                <li>3. Click "Test File Upload" to test the upload functionality</li>
                <li>4. Check the test results above for any errors</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugSingleFilePage;

