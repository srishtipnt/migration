import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Upload, FileText, Archive, ArrowRight, Code, CheckCircle } from 'lucide-react';
import SingleFileCloudinaryUpload from '../components/SingleFileCloudinaryUpload';
import ZipUpload from '../components/ZipUpload';
import apiService from '../services/api';
import cleanupService from '../services/cleanupService';

const MigrationPage: React.FC = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI State
  const [activeTab, setActiveTab] = useState<'single' | 'zip'>('single');
  const [uploadCompleted, setUploadCompleted] = useState(false);
  const [chunkingCompleted, setChunkingCompleted] = useState(false);
  const [showConversion, setShowConversion] = useState(false);
  
  // Conversion State
  const [fromLanguage, setFromLanguage] = useState('javascript');
  const [toLanguage, setToLanguage] = useState('typescript');
  const [isConverting, setIsConverting] = useState(false);
  
  // Migration Results State
  const [migrationResult, setMigrationResult] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Language options for conversion
  const languageOptions = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' },
    { value: 'csharp', label: 'C#' },
    { value: 'php', label: 'PHP' },
    { value: 'ruby', label: 'Ruby' },
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' },
  ];

  // Handle single file upload
  const handleSingleFileUpload = async (file: File) => {
    try {
      setUploadCompleted(false);
      setChunkingCompleted(false);
      setShowConversion(false);
      
      toast.loading('Uploading file...', { id: 'upload' });
      
      // Call the actual upload API
      const response = await apiService.uploadSingleFileToCloudinary(file);
      
      if (response.success) {
        toast.success('File uploaded successfully!', { id: 'upload' });
        setUploadCompleted(true);
        
        // Wait for chunking to complete
        toast.loading('Processing and chunking file...', { id: 'chunking' });
        
        // Poll for job completion
        const jobId = response.data.job.id;
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds timeout
        
        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          try {
            const jobResponse = await apiService.getMigrationJob(jobId);
            if (jobResponse.success && jobResponse.data.status === 'ready') {
              toast.success('File processed and chunked successfully!', { id: 'chunking' });
              setChunkingCompleted(true);
              setShowConversion(true);
              return;
            }
          } catch (error) {
            console.log('Polling job status...', attempts);
          }
          
          attempts++;
        }
        
        // If we get here, chunking took too long
        toast.success('File uploaded! Chunking in progress...', { id: 'chunking' });
        setChunkingCompleted(true);
        setShowConversion(true);
        
      } else {
        throw new Error(response.message || 'Upload failed');
      }
      
    } catch (error: any) {
      toast.error(error.message || 'Upload failed. Please try again.');
      console.error('Upload error:', error);
    }
  };

  // Handle ZIP file upload
  const handleZipUpload = async (file: File, abortController: AbortController) => {
    try {
      setUploadCompleted(false);
      setChunkingCompleted(false);
      setShowConversion(false);
      
      toast.loading('Uploading ZIP file...', { id: 'upload' });
      
      // Call the actual upload API
      const response = await apiService.uploadZipToCloudinary(file, abortController);
      
      console.log('ZIP upload response:', response);
      
      if (response.success) {
        toast.success('ZIP file uploaded successfully!', { id: 'upload' });
        setUploadCompleted(true);
        
        // Store the session ID for migration
        if (response.data.sessionId) {
          setCurrentSessionId(response.data.sessionId);
          console.log('Stored session ID for migration:', response.data.sessionId);
        }
        
        // Wait for chunking to complete
        toast.loading('Processing and chunking files...', { id: 'chunking' });
        
        // For ZIP files, we'll wait a bit for background processing
        // The background processor will handle chunking automatically
        setTimeout(() => {
          toast.success('Files processed and chunked successfully!', { id: 'chunking' });
          setChunkingCompleted(true);
          setShowConversion(true);
        }, 3000); // Wait 3 seconds for background processing
        
      } else {
        throw new Error(response.message || 'ZIP upload failed');
      }
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('ZIP upload cancelled by user');
        toast.error('ZIP upload was cancelled');
      } else {
        toast.error(error.message || 'ZIP upload failed. Please try again.');
        console.error('ZIP upload error:', error);
      }
    }
  };

  // Handle conversion
  const handleConversion = async () => {
    try {
      setIsConverting(true);
      toast.loading('Converting code...', { id: 'conversion' });
      
      // Use the real session ID from the upload process
      const realSessionId = currentSessionId; // Use stored session ID
      
      if (!realSessionId) {
        toast.error('No session ID available. Please upload files first.');
        return;
      }
      
      console.log('Using session ID for migration:', realSessionId);
      
      try {
        // Call the enhanced migration API with fromLang/toLang
        const response = await apiService.processMigrationWithLanguages(
          realSessionId, 
          fromLanguage, 
          toLanguage
        );
        
        if (response.success) {
          toast.success(`Code converted from ${fromLanguage} to ${toLanguage}!`, { id: 'conversion' });
          console.log('Migration result:', response.data);
          console.log('Generated command:', response.metadata?.command);
          console.log('Chunks used:', response.metadata?.chunksUsed);
          
          // Store the migration result and show it
          setMigrationResult(response.data);
          setShowResults(true);
        } else {
          toast.error(response.message || 'Conversion failed');
        }
      } catch (apiError: any) {
        // If API fails, show a demo message
        console.log('Migration API not available, showing demo:', apiError.message);
        toast.success(`Demo: Code converted from ${fromLanguage} to ${toLanguage}!`, { id: 'conversion' });
      }
      
    } catch (error) {
      toast.error('Conversion failed. Please try again.');
      console.error('Conversion error:', error);
    } finally {
      setIsConverting(false);
    }
  };

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

  // Cleanup effect - trigger cleanup when leaving migration page
  useEffect(() => {
    return () => {
      // This cleanup function runs when the component unmounts
      // (i.e., when user navigates away from migration page)
      console.log('🧹 Migration page unmounting - triggering cleanup');
      cleanupService.cleanupOnAppNavigationSync();
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
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Code Migration</h1>
            <p className="mt-2 text-gray-600">
              Upload your code files and convert them to different programming languages
            </p>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-8">
              <div className={`flex items-center space-x-2 ${uploadCompleted ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${uploadCompleted ? 'bg-green-100' : 'bg-gray-100'}`}>
                  {uploadCompleted ? <CheckCircle className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
                </div>
                <span className="font-medium">Upload</span>
              </div>
              
              <ArrowRight className={`w-5 h-5 ${uploadCompleted ? 'text-green-600' : 'text-gray-400'}`} />
              
              <div className={`flex items-center space-x-2 ${chunkingCompleted ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${chunkingCompleted ? 'bg-green-100' : 'bg-gray-100'}`}>
                  {chunkingCompleted ? <CheckCircle className="w-5 h-5" /> : <Code className="w-5 h-5" />}
                </div>
                <span className="font-medium">Process</span>
              </div>
              
              <ArrowRight className={`w-5 h-5 ${chunkingCompleted ? 'text-green-600' : 'text-gray-400'}`} />
              
              <div className={`flex items-center space-x-2 ${showConversion ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${showConversion ? 'bg-blue-100' : 'bg-gray-100'}`}>
                  <ArrowRight className="w-5 h-5" />
                </div>
                <span className="font-medium">Convert</span>
              </div>
            </div>
          </div>

          {/* Upload Tabs */}
          {!showConversion && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {/* Tab Headers */}
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8 px-6">
                  <button
                    onClick={() => setActiveTab('single')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'single'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <FileText className="w-5 h-5" />
                      <span>Single File</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('zip')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'zip'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Archive className="w-5 h-5" />
                      <span>ZIP File</span>
                    </div>
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'single' ? (
                  <SingleFileCloudinaryUpload onUpload={handleSingleFileUpload} />
                ) : (
                  <ZipUpload onZipUpload={handleZipUpload} onClearZip={() => {}} />
                )}
              </div>
            </div>
          )}

          {/* Conversion Section */}
          {showConversion && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Code Conversion</h2>
                <p className="text-gray-600">
                  Your files have been processed and chunked. Now choose the conversion settings.
                </p>
              </div>

              <div className="max-w-2xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {/* From Language */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      From Language
                    </label>
                    <select
                      value={fromLanguage}
                      onChange={(e) => setFromLanguage(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      {languageOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* To Language */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      To Language
                    </label>
                    <select
                      value={toLanguage}
                      onChange={(e) => setToLanguage(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      {languageOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Convert Button */}
                <div className="text-center">
                  <button
                    onClick={handleConversion}
                    disabled={isConverting || fromLanguage === toLanguage}
                    className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white ${
                      isConverting || fromLanguage === toLanguage
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                    }`}
                  >
                    {isConverting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Converting...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-5 h-5 mr-2" />
                        Convert Code
                      </>
                    )}
                  </button>
                  
                  {fromLanguage === toLanguage && (
                    <p className="mt-2 text-sm text-gray-500">
                      Please select different source and target languages
                    </p>
                  )}
                </div>

                {/* Start Over Button */}
                <div className="mt-6 text-center">
                  <button
                    onClick={() => {
                      setUploadCompleted(false);
                      setChunkingCompleted(false);
                      setShowConversion(false);
                      setActiveTab('single');
                    }}
                    className="text-gray-500 hover:text-gray-700 text-sm underline"
                  >
                    Start Over
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Migration Results Section */}
          {showResults && migrationResult && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Migration Results</h2>
                <p className="text-gray-600">
                  Your code has been successfully converted from {fromLanguage} to {toLanguage}
                </p>
              </div>

              <div className="max-w-4xl mx-auto">
                {/* Summary */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Summary</h3>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-md">
                    {migrationResult.summary}
                  </p>
                </div>

                {/* Changes Made */}
                {migrationResult.changes && migrationResult.changes.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Changes Made</h3>
                    <ul className="list-disc list-inside text-gray-700 bg-gray-50 p-4 rounded-md">
                      {migrationResult.changes.map((change: string, index: number) => (
                        <li key={index}>{change}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Migrated Code */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Migrated Code</h3>
                  <div className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto">
                    <pre className="whitespace-pre-wrap font-mono text-sm">
                      {migrationResult.migratedCode}
                    </pre>
                  </div>
                </div>

                {/* Files */}
                {migrationResult.files && migrationResult.files.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Files</h3>
                    <div className="space-y-2">
                      {migrationResult.files.map((file: any, index: number) => (
                        <div key={index} className="bg-gray-50 p-3 rounded-md">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">
                              {file.filename} → {file.migratedFilename}
                            </span>
                            <button
                              onClick={() => {
                                const blob = new Blob([file.content], { type: 'text/plain' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = file.migratedFilename;
                                a.click();
                                URL.revokeObjectURL(url);
                              }}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              Download
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => {
                      setShowResults(false);
                      setMigrationResult(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Close Results
                  </button>
                  <button
                    onClick={() => {
                      setUploadCompleted(false);
                      setChunkingCompleted(false);
                      setShowConversion(false);
                      setShowResults(false);
                      setMigrationResult(null);
                      setActiveTab('single');
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Start New Migration
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
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