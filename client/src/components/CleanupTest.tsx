import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, CheckCircle, Clock, Archive, FileText } from 'lucide-react';
import cleanupService from '../services/cleanupService';
import apiService from '../services/api';

const CleanupTest: React.FC = () => {
  const [stats, setStats] = useState(cleanupService.getStats());
  const [testResults, setTestResults] = useState<Array<{
    test: string;
    status: 'pending' | 'running' | 'success' | 'error';
    message: string;
    timestamp: Date;
  }>>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(cleanupService.getStats());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const addTestResult = (test: string, status: 'pending' | 'running' | 'success' | 'error', message: string) => {
    setTestResults(prev => [...prev, {
      test,
      status,
      message,
      timestamp: new Date()
    }]);
  };

  const runTest = async (testName: string, testFn: () => Promise<void>) => {
    addTestResult(testName, 'running', 'Test started...');
    try {
      await testFn();
      addTestResult(testName, 'success', 'Test completed successfully');
    } catch (error) {
      addTestResult(testName, 'error', `Test failed: ${error.message}`);
    }
  };

  const testTabSwitching = async () => {
    await runTest('Tab Switching Cleanup', async () => {
      // Simulate registering sessions
      cleanupService.registerSession('test-zip-1', 'zip', 5);
      cleanupService.registerSession('test-single-1', 'single', 1);
      
      // Simulate tab switching
      await cleanupService.cleanupOnTabSwitch('zip', 'single');
      
      // Check if ZIP session was cleaned up
      const currentStats = cleanupService.getStats();
      if (currentStats.zipSessions > 0) {
        throw new Error('ZIP session was not cleaned up on tab switch');
      }
    });
  };

  const testSessionCommit = async () => {
    await runTest('Session Commit', async () => {
      // Register a session
      cleanupService.registerSession('test-commit-1', 'zip', 3);
      
      // Commit the session
      cleanupService.commitSession('test-commit-1');
      
      // Check if session was removed from tracking
      const currentStats = cleanupService.getStats();
      if (currentStats.totalSessions > 0) {
        throw new Error('Session was not properly committed');
      }
    });
  };

  const testManualCleanup = async () => {
    await runTest('Manual Cleanup', async () => {
      // Register multiple sessions
      cleanupService.registerSession('test-manual-1', 'zip', 2);
      cleanupService.registerSession('test-manual-2', 'single', 1);
      
      // Perform manual cleanup
      const result = await cleanupService.cleanupAllSessions();
      
      if (result.success !== 2) {
        throw new Error(`Expected 2 successful cleanups, got ${result.success}`);
      }
    });
  };

  const testNavigationWarning = async () => {
    await runTest('Navigation Warning', async () => {
      // Register sessions to trigger warning
      cleanupService.registerSession('test-nav-1', 'zip', 1);
      cleanupService.registerSession('test-nav-2', 'single', 1);
      
      // Simulate beforeunload event
      const event = new Event('beforeunload');
      const result = window.dispatchEvent(event);
      
      // The warning should be triggered
      console.log('Navigation warning test completed - check browser behavior');
    });
  };

  const testAppNavigation = async () => {
    await runTest('App Navigation Cleanup', async () => {
      // Register sessions
      cleanupService.registerSession('test-app-nav-1', 'zip', 2);
      cleanupService.registerSession('test-app-nav-2', 'single', 1);
      
      // Test app navigation cleanup
      const result = await cleanupService.cleanupOnAppNavigation();
      
      if (result.success !== 3) {
        throw new Error(`Expected 3 successful cleanups, got ${result.success}`);
      }
      
      // Check that all sessions are cleaned up
      const stats = cleanupService.getStats();
      if (stats.totalSessions > 0) {
        throw new Error(`Expected 0 sessions remaining, got ${stats.totalSessions}`);
      }
    });
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Cleanup Service Test Suite</h3>
        <button
          onClick={clearTestResults}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Clear Results
        </button>
      </div>

      {/* Current Stats */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Current Session Stats</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.totalSessions}</div>
            <div className="text-sm text-gray-500">Total Sessions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.zipSessions}</div>
            <div className="text-sm text-gray-500 flex items-center justify-center">
              <Archive className="h-4 w-4 mr-1" />
              ZIP Sessions
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.singleSessions}</div>
            <div className="text-sm text-gray-500 flex items-center justify-center">
              <FileText className="h-4 w-4 mr-1" />
              Single Sessions
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.totalFiles}</div>
            <div className="text-sm text-gray-500">Total Files</div>
          </div>
        </div>
      </div>

      {/* Test Controls */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Test Controls</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={testTabSwitching}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Test Tab Switching
          </button>
          <button
            onClick={testSessionCommit}
            className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Test Session Commit
          </button>
          <button
            onClick={testManualCleanup}
            className="flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Test Manual Cleanup
          </button>
          <button
            onClick={testAppNavigation}
            className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Test App Navigation
          </button>
          <button
            onClick={testNavigationWarning}
            className="flex items-center justify-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Test Page Warning
          </button>
        </div>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Test Results</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-md border ${
                  result.status === 'success' ? 'bg-green-50 border-green-200' :
                  result.status === 'error' ? 'bg-red-50 border-red-200' :
                  result.status === 'running' ? 'bg-blue-50 border-blue-200' :
                  'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {getStatusIcon(result.status)}
                  <div>
                    <div className="text-sm font-medium text-gray-900">{result.test}</div>
                    <div className="text-xs text-gray-500">{result.message}</div>
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  {result.timestamp.toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Test Instructions</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Tab Switching:</strong> Tests cleanup when switching between ZIP and Single file uploads</li>
          <li>• <strong>Session Commit:</strong> Tests proper session commitment and removal from tracking</li>
          <li>• <strong>Manual Cleanup:</strong> Tests bulk cleanup of all active sessions</li>
          <li>• <strong>App Navigation:</strong> Tests cleanup when navigating within the app (not browser tabs)</li>
          <li>• <strong>Page Warning:</strong> Tests browser warning when leaving the page with active sessions</li>
        </ul>
      </div>
    </div>
  );
};

export default CleanupTest;
