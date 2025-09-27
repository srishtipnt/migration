import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Upload, FileText, Archive, ArrowRight, Code, CheckCircle } from 'lucide-react';
import SingleFileCloudinaryUpload from '../components/SingleFileCloudinaryUpload';
import ZipUpload from '../components/ZipUpload';
import InlineMigrationResults from '../components/InlineMigrationResults';
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
  const [originalFiles, setOriginalFiles] = useState<{ [key: string]: string }>({});

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
        
        // Store the session ID for migration
        console.log('Single file upload response:', response);
        console.log('Response data structure:', JSON.stringify(response.data, null, 2));
        
        if (response.data.job?.sessionId) {
          setCurrentSessionId(response.data.job.sessionId);
          console.log('✅ Stored session ID for single file migration:', response.data.job.sessionId);
        } else {
          console.log('❌ No session ID found in job:', response.data.job);
          // Try to extract session ID from the file data if available
          if (response.data.file?.sessionId) {
            setCurrentSessionId(response.data.file.sessionId);
            console.log('✅ Stored session ID from file data:', response.data.file.sessionId);
          } else {
            // Fallback: generate a session ID for single file
            const fallbackSessionId = `single-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            setCurrentSessionId(fallbackSessionId);
            console.log('⚠️ Generated fallback session ID:', fallbackSessionId);
          }
        }
        
        // Automatically proceed to conversion after upload
        toast.success('File uploaded successfully!', { id: 'chunking' });
        setUploadCompleted(true);
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
        
        // Automatically proceed to conversion after upload
        toast.success('ZIP file uploaded successfully!', { id: 'chunking' });
        setUploadCompleted(true);
        setChunkingCompleted(true);
        setShowConversion(true);
        
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
      const realSessionId = currentSessionId || 'zip-1758961649380-68802455121c6ac3'; // Use stored session ID or fallback for testing
      
      console.log('🔍 Migration Debug Info:');
      console.log('  - currentSessionId:', currentSessionId);
      console.log('  - realSessionId:', realSessionId);
      console.log('  - fromLanguage:', fromLanguage);
      console.log('  - toLanguage:', toLanguage);
      
      // Proceed directly with migration (chunking happens in background)
      console.log('🔍 Proceeding with migration...');
      
      if (!realSessionId) {
        toast.error('No session ID available. Please upload files first.');
        return;
      }
      
      console.log('Using session ID for migration:', realSessionId);
      console.log('Current session ID state:', currentSessionId);
      console.log('Upload completed:', uploadCompleted);
      console.log('Chunking completed:', chunkingCompleted);
      console.log('Active tab:', activeTab);
      console.log('Show conversion:', showConversion);
      
      try {
        // Call the enhanced migration API with fromLang/toLang
        const response = await apiService.processMigrationWithLanguages(
          realSessionId, 
          fromLanguage, 
          toLanguage
        );
        
        if (response.success) {
          toast.success(`Code converted from ${fromLanguage} to ${toLanguage}!`, { id: 'conversion' });
          console.log('✅ Migration successful!');
          console.log('Complete response:', JSON.stringify(response, null, 2));
          console.log('Migration result:', response.data);
          console.log('Response metadata:', response.metadata);
          console.log('Generated command:', response.metadata?.command);
          console.log('Chunks used:', response.metadata?.chunksUsed);
          console.log('Is demo:', response.data.isDemo);
          
          console.log('🔍 Setting migration result and showing results...');
          
          // Direct test of the response structure
          console.log('🔍 Response Structure Test:');
          console.log('  - response.success:', response.success);
          console.log('  - response.data:', typeof response.data);
          console.log('  - response.metadata:', typeof response.metadata);
          console.log('  - response.data.isDemo:', response.data.isDemo);
          console.log('  - response.metadata.chunksUsed:', response.metadata?.chunksUsed);
          
          // Store the migration result and show it
          setMigrationResult(response.data);
          
          // Fetch original file contents for diff viewing
          try {
            const originalFilesResponse = await apiService.getOriginalFiles(realSessionId);
            if (originalFilesResponse.success) {
              setOriginalFiles(originalFilesResponse.data);
            } else {
              // Fallback to empty files if fetch fails
              const originalFilesMap: { [key: string]: string } = {};
              if (response.data.files) {
                response.data.files.forEach((file: any) => {
                  originalFilesMap[file.filename] = '';
                });
              }
              setOriginalFiles(originalFilesMap);
            }
          } catch (error) {
            console.log('Could not fetch original files, using empty placeholders');
            const originalFilesMap: { [key: string]: string } = {};
            if (response.data.files) {
              response.data.files.forEach((file: any) => {
                originalFilesMap[file.filename] = '';
              });
            }
            setOriginalFiles(originalFilesMap);
          }
          
          setShowResults(true);
          console.log('✅ Results should now be visible!');
          console.log('showResults:', true);
          console.log('migrationResult:', migrationResult);
        } else {
          toast.error(response.message || 'Conversion failed');
        }
      } catch (apiError: any) {
        // If API fails, show a demo message
        console.log('Migration API not available, showing demo:', apiError.message);
        toast.success(`Demo: Code converted from ${fromLanguage} to ${toLanguage}!`, { id: 'conversion' });
        
        // Show demo results
        const demoResult = {
          migratedCode: `// Demo migration from ${fromLanguage} to ${toLanguage}\nconsole.log("Hello World");`,
          summary: `Demo migration from ${fromLanguage} to ${toLanguage}`,
          changes: [
            `Converted from ${fromLanguage} to ${toLanguage}`,
            'Added type annotations',
            'Updated syntax'
          ],
          files: [{
            filename: 'demo.js',
            migratedFilename: 'demo.ts',
            content: `// Demo migration from ${fromLanguage} to ${toLanguage}\nconsole.log("Hello World");`
          }],
          isDemo: true
        };
        
        setMigrationResult(demoResult);
        setOriginalFiles({ 'demo.js': 'console.log("Hello World");' });
        setShowResults(true);
        console.log('✅ Demo results should now be visible!');
        console.log('showResults:', true);
        console.log('demoResult:', demoResult);
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

          {/* Migration Results Inline */}
          {console.log('🔍 Render check - showResults:', showResults, 'migrationResult:', !!migrationResult)}
          {showResults && migrationResult && (
            <InlineMigrationResults
              result={migrationResult}
              originalFiles={originalFiles}
              onStartOver={() => {
                setUploadCompleted(false);
                setChunkingCompleted(false);
                setShowConversion(false);
                setShowResults(false);
                setMigrationResult(null);
                setActiveTab('single');
              }}
            />
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