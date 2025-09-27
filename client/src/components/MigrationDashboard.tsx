import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { 
  FileText, 
  Download,
  Trash2,
  Folder,
  RefreshCw,
  Code,
  Play,
  Archive,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  XCircle
} from 'lucide-react';
import UploadSection from './UploadSection';
// Removed cleanup service UI/state
import apiService from '../services/api';
// Removed cleanupService from import

interface MigrationDashboardProps {
  userId: string;
}

interface FileData {
  id: string;
  originalFilename: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  extractedFrom?: string;
  folderPath?: string;
  relativePath?: string;
  storageType?: string;
  public_id?: string;
  secure_url?: string;
}

const MigrationDashboard: React.FC<MigrationDashboardProps> = ({ userId }) => {
  // userId is used for API calls and file organization
  const [files, setFiles] = useState<FileData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [showConversionForm, setShowConversionForm] = useState(false);
  const [conversionForm, setConversionForm] = useState({
    sourceLanguage: '',
    targetLanguage: ''
  });
  const [activeTab, setActiveTab] = useState<'files' | 'zip'>('files');
  const [currentZipSession, setCurrentZipSession] = useState<string | null>(null);
  const [currentJobStatus, setCurrentJobStatus] = useState<'idle' | 'pending' | 'processing' | 'ready' | 'failed'>('idle');
  const [currentJobChunks, setCurrentJobChunks] = useState<number>(0);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  // Removed cleanup stats state

  // Filter files based on active tab
  const filteredFiles = useMemo(() => {
    if (activeTab === 'files') {
      // Show only single files (files uploaded via single file cloudinary)
      return files.filter(file => file.extractedFrom === 'Single File Upload');
    } else {
      // Show only ZIP files (files extracted from ZIP archives)
      return files.filter(file => file.extractedFrom && file.extractedFrom.startsWith('ZIP Archive'));
    }
  }, [activeTab, files]);

  // Create tree structure from ZIP files
  const createTreeStructure = (files: FileData[]) => {
    const tree: any = {};
    
    files.forEach((file) => {
      const pathParts = file.folderPath ? file.folderPath.split('/').filter(Boolean) : [];
      
      // Add file to the appropriate level
      if (pathParts.length === 0) {
        // Root level file
        tree[file.originalFilename] = {
          type: 'file',
          ...file
        };
      } else {
        // File in folder - navigate to the correct folder
        let current = tree;
        
        // Create folder structure and navigate to the correct level
        pathParts.forEach((part, index) => {
          if (!current[part]) {
            current[part] = {
              type: 'folder',
              name: part,
              children: {},
              files: []
            };
          }
          
          // Move to the next level
          if (index === pathParts.length - 1) {
            // This is the last part, add file to this folder
            current[part].files.push({
              type: 'file',
              ...file
            });
          } else {
            // Move to children for next iteration
            current = current[part].children;
          }
        });
      }
    });
    
    return tree;
  };

  // Get current session ZIP files and create tree structure
  const getCurrentSessionZipFiles = () => {
    if (!currentZipSession) {
      return [];
    }
    
    const zipFiles = files.filter(file => {
      const sessionId = file.extractedFrom?.match(/ZIP Archive \((.*?)\)/)?.[1];
      return sessionId === currentZipSession;
    });
    
    return zipFiles;
  };

  const currentSessionFiles = useMemo(() => getCurrentSessionZipFiles(), [currentZipSession, files]);
  const treeStructure = useMemo(() => createTreeStructure(currentSessionFiles), [currentSessionFiles]);

  // Poll migration job status for the current ZIP session
  useEffect(() => {
    let intervalId: number | undefined;
    let isCancelled = false;

    const startPolling = () => {
      if (!currentZipSession) {
        setCurrentJobStatus('idle');
        setCurrentJobChunks(0);
        return;
      }

      const fetchStatus = async () => {
        try {
          const resp = await apiService.getJobStatus(currentZipSession);
          if (isCancelled) return;
          if (resp.success) {
            const status = resp.data.status as 'pending' | 'processing' | 'ready' | 'failed';
            setCurrentJobStatus(status);
            setCurrentJobChunks(resp.data.totalChunks ?? 0);
            // When job becomes ready, stop polling after one confirmation
            if (status === 'ready' && intervalId) {
              window.clearInterval(intervalId);
              intervalId = undefined;
            }
          }
        } catch (e) {
          // Keep polling; transient errors are expected
        }
      };

      // Immediately fetch once, then poll
      fetchStatus();
      intervalId = window.setInterval(fetchStatus, 5000);
    };

    startPolling();

    return () => {
      isCancelled = true;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [currentZipSession]);

  // Handle tab change from UploadSection
  const handleTabChange = async (tab: 'files' | 'zip') => {
    const previousTab = activeTab;
    setActiveTab(tab);
    // Clear selected files when switching tabs
    setSelectedFiles([]);
    
    // Trigger cleanup for the tab we're leaving
    // Removed cleanupService.cleanupOnTabSwitch
  };

  // Available languages and technologies
  const languages = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C', 'C++', 'C#', 'PHP', 'Ruby', 'Go',
    'Rust', 'Swift', 'Kotlin', 'Scala', 'Clojure', 'Haskell', 'OCaml', 'F#', 'Dart', 'Lua',
    'Perl', 'Shell', 'Bash', 'PowerShell', 'Batch'
  ];

  const frameworks = [
    'React', 'Vue', 'Angular', 'Svelte', 'Next.js', 'Nuxt.js', 'SvelteKit', 'Astro',
    'Express', 'FastAPI', 'Django', 'Flask', 'Spring', 'Laravel', 'Rails', 'Gin',
    'Actix', 'Rocket', 'Axum', 'ASP.NET', 'Blazor'
  ];

  const libraries = [
    'jQuery', 'Lodash', 'Moment.js', 'Day.js', 'Axios', 'Fetch', 'Socket.io',
    'WebSocket', 'Redis', 'MongoDB', 'PostgreSQL', 'MySQL', 'SQLite',
    'Prisma', 'Sequelize', 'TypeORM', 'Mongoose'
  ];

  // Load user's files from both regular files and single file cloudinary
  const loadFiles = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Load files from all three endpoints
      const [regularFilesResponse, singleFilesResponse, zipFilesResponse] = await Promise.all([
        apiService.getUserFiles().catch(err => {
          console.warn('Failed to load regular files:', err);
          return { files: [] };
        }),
        apiService.getUserSingleFiles().catch(err => {
          console.warn('Failed to load single files:', err);
          return { data: { files: [] } };
        }),
        apiService.getUserCloudinaryFiles().catch(err => {
          console.warn('Failed to load ZIP files:', err);
          return { files: [] };
        })
      ]);
      
      // Combine files from all sources
      const regularFiles = regularFilesResponse.files || [];
      const singleFiles = singleFilesResponse.data?.files || [];
      const zipFiles = zipFilesResponse.files || [];
      
      // Convert single files to match the regular file format
      const convertedSingleFiles = singleFiles.map((file: any) => ({
        id: file.id,
        originalFilename: file.originalFilename,
        fileName: file.fileName || file.originalFilename,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
        uploadedAt: file.uploadedAt,
        extractedFrom: 'Single File Upload',
        folderPath: '',
        relativePath: file.originalFilename,
        storageType: file.storageType || 'cloudinary',
        public_id: file.public_id,
        secure_url: file.secure_url
      }));
      
      // Convert ZIP files to match the regular file format
      const convertedZipFiles = zipFiles.map((file: any) => ({
        id: file.id,
        originalFilename: file.originalFilename,
        fileName: file.fileName || file.originalFilename,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
        uploadedAt: file.uploadedAt,
        extractedFrom: `ZIP Archive (${file.sessionId || 'Unknown Session'})`,
        folderPath: file.folderPath || '',
        relativePath: file.relativePath || file.originalFilename,
        storageType: file.storageType || 'cloudinary',
        public_id: file.public_id,
        secure_url: file.secure_url
      }));
      
      // Combine and sort by upload date
      const allFiles = [...regularFiles, ...convertedSingleFiles, ...convertedZipFiles]
        .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      
      setFiles(allFiles);
    } catch (err) {
      console.error('Failed to load files:', err);
      setError('Failed to load files');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
    
    // Removed cleanup service listeners/state updates
    return () => {};
  }, []);

  // Handle single file upload using single file cloudinary
  const handleFileUpload = async (file: File) => {
    // Create abort controller for this upload
    const abortController = new AbortController();
    const sessionId = `single-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Removed cleanup service session registration
      
      console.log(`🚀 Starting single file upload: ${file.name}`);
      const response = await apiService.uploadSingleFileToCloudinary(file, abortController);
      
      if (response.success) {
        // Removed cleanup service post-upload registration
        
        console.log(`✅ Single file upload completed: ${file.name}`);
        toast.success(`File "${file.name}" uploaded successfully!`);
        await loadFiles(); // Reload files after upload
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log(`🚫 Single file upload cancelled: ${file.name}`);
        setError('Upload was cancelled');
        toast('Upload was cancelled', { icon: '⚠️' });
      } else {
        console.error('File upload failed:', err);
        
        // Extract error message from server response
        let errorMessage = 'File upload failed';
        if (err.response?.data?.message) {
          errorMessage = err.response.data.message;
        } else if (err.response?.data?.error) {
          errorMessage = err.response.data.error;
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        setError(errorMessage);
        toast.error(errorMessage);
      }
    }
  };

  // Handle ZIP file upload
  const handleZipUpload = async (zipFile: File, abortController: AbortController) => {
    console.log(`🔍 handleZipUpload called for: ${zipFile.name}`);
    
    const tempSessionId = `zip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Removed cleanup service session registration
      
      console.log(`🚀 Starting ZIP file upload: ${zipFile.name}`);
      const response = await apiService.uploadZipToCloudinary(zipFile, abortController);
      
      if (response.success) {
        // Use the actual sessionId from the backend response
        const actualSessionId = response.data.sessionId;
        if (actualSessionId) {
          setCurrentZipSession(actualSessionId);
          // Removed cleanup service session registration with actual session ID
          
          console.log(`✅ ZIP file upload completed: ${zipFile.name}`);
          toast.success(`ZIP "${zipFile.name}" uploaded successfully! ${response.data.totalFiles} files processed.`);
        }
        await loadFiles(); // Reload files after upload
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log(`🚫 ZIP file upload cancelled: ${zipFile.name}`);
        setError('ZIP upload was cancelled');
        toast('ZIP upload was cancelled', { icon: '⚠️' });
      } else {
        console.error('ZIP upload failed:', err);
        
        // Extract error message from server response
        let errorMessage = 'ZIP upload failed';
        if (err.response?.data?.message) {
          errorMessage = err.response.data.message;
        } else if (err.response?.data?.error) {
          errorMessage = err.response.data.error;
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        setError(errorMessage);
        toast.error(errorMessage);
      }
    }
  };

  // Handle ZIP clear
  const handleClearZip = () => {
    // This could be used to clear any ZIP-related state
    console.log('ZIP cleared');
  };

  // Handle bulk delete for selected files
  const handleBulkDelete = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select files to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''}?`)) {
      return;
    }

    try {
      setError(null);
      
      // Delete files in parallel
      const deletePromises = selectedFiles.map(async (fileId) => {
        try {
          // Try single file delete first
          await apiService.deleteSingleFile(fileId);
        } catch (singleFileError) {
          // If single file delete fails, try regular file delete
          await apiService.deleteFile(fileId);
        }
      });

      await Promise.all(deletePromises);
      
      // Clear selection and reload files
      setSelectedFiles([]);
      await loadFiles();
      
    } catch (err) {
      console.error('Bulk delete failed:', err);
      setError('Some files could not be deleted');
    }
  };

  // Handle file deletion - try both regular and single file endpoints
  const handleDeleteFile = async (fileId: string) => {
    try {
      // Try single file delete first (for files uploaded via single file cloudinary)
      try {
        await apiService.deleteSingleFile(fileId);
      } catch (singleFileError) {
        // If single file delete fails, try regular file delete
        console.log('Single file delete failed, trying regular delete:', singleFileError.message);
        await apiService.deleteFile(fileId);
      }
      await loadFiles(); // Reload files after deletion
    } catch (err) {
      console.error('File deletion failed:', err);
      setError('File deletion failed');
    }
  };

  // Handle file download
  const handleDownloadFile = async (fileId: string, fileName: string) => {
    try {
      const blob = await apiService.downloadFile(fileId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('File download failed:', err);
      setError('File download failed');
    }
  };

  // Handle create ZIP archive
  const handleCreateZip = async () => {
    try {
      const fileIds: string[] = selectedFiles.length > 0 ? selectedFiles : filteredFiles.map(f => f.id);
      const blob = await apiService.createZipArchive(fileIds);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `files_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('ZIP creation failed:', err);
      setError('ZIP creation failed');
    }
  };

  // Handle conversion
  const handleConversion = async () => {
    if (!conversionForm.sourceLanguage || !conversionForm.targetLanguage) {
      setError('Please select both source and target languages');
      return;
    }

    if (selectedFiles.length === 0) {
      setError('Please select files to convert');
      return;
    }

    try {
      setError(null);
      // TODO: Implement conversion logic
      alert(`Converting ${selectedFiles.length} files from ${conversionForm.sourceLanguage} to ${conversionForm.targetLanguage}`);
    } catch (err) {
      console.error('Conversion failed:', err);
      setError('Conversion failed');
    }
  };

  // Toggle file selection
  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };

  // Toggle folder expansion
  const toggleFolder = (folderPath: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderPath)) {
        newSet.delete(folderPath);
      } else {
        newSet.add(folderPath);
      }
      return newSet;
    });
  };

  // Render tree structure recursively
  const renderTreeItem = (item: any, path: string = '', level: number = 0) => {
    if (item.type === 'file') {
      return (
        <div key={item.id} className="flex items-center justify-between py-2 px-4 hover:bg-gray-50" style={{ paddingLeft: `${level * 20 + 16}px` }}>
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={selectedFiles.includes(item.id)}
              onChange={() => toggleFileSelection(item.id)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <FileText className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-900">{item.originalFilename}</span>
            <span className="text-xs text-gray-500">({formatFileSize(item.fileSize)})</span>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handleDownloadFile(item.id, item.originalFilename)}
              className="text-blue-600 hover:text-blue-900"
              title="Download"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDeleteFile(item.id)}
              className="text-red-600 hover:text-red-900"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      );
    }

    if (item.type === 'folder') {
      const folderPath = path ? `${path}/${item.name}` : item.name;
      const isExpanded = expandedFolders.has(folderPath);
      
      return (
        <div key={folderPath}>
          <div 
            className="flex items-center py-2 px-4 hover:bg-gray-50 cursor-pointer" 
            style={{ paddingLeft: `${level * 20 + 16}px` }}
            onClick={() => toggleFolder(folderPath)}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-400 mr-2" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-400 mr-2" />
            )}
            <Folder className="h-4 w-4 text-blue-500 mr-2" />
            <span className="text-sm font-medium text-gray-900">{item.name}</span>
          </div>
          {isExpanded && (
            <div>
              {/* Render files in this folder */}
              {item.files.map((file: any) => renderTreeItem(file, folderPath, level + 1))}
              {/* Render subfolders */}
              {Object.values(item.children).map((child: any) => renderTreeItem(child, folderPath, level + 1))}
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get all options
  const getAllOptions = () => {
    return [...languages, ...frameworks, ...libraries];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Code Migration Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Upload your code files and convert them between different languages and frameworks
          </p>
          
          {/* Simplified: removed Active Upload Sessions banner and controls */}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Trash2 className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
              <button
                    onClick={() => setError(null)}
                    className="bg-red-100 px-2 py-1 rounded text-sm text-red-800 hover:bg-red-200"
                  >
                    Dismiss
              </button>
        </div>
                </div>
              </div>
          </div>
        )}

        {/* File Upload Section */}
        <div className="mb-8">
          <UploadSection 
            onFileUpload={handleFileUpload}
            onZipUpload={handleZipUpload}
            onClearZip={handleClearZip}
            onTabChange={handleTabChange}
          />
        </div>

        {/* Removed CleanupTest (development-only) */}

        {/* Conversion Form */}
        {filteredFiles.length > 0 && (
          <div className="mb-8 bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Code Conversion</h2>
              <button
                onClick={() => setShowConversionForm(!showConversionForm)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Code className="h-4 w-4 mr-2" />
                {showConversionForm ? 'Hide' : 'Show'} Conversion Form
              </button>
            </div>

            {showConversionForm && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Source Language */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Convert From
                    </label>
                    <select
                      value={conversionForm.sourceLanguage}
                      onChange={(e) => setConversionForm(prev => ({ ...prev, sourceLanguage: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select source language/framework...</option>
                      {getAllOptions().map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>

                  {/* Target Language */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Convert To
                    </label>
                    <select
                      value={conversionForm.targetLanguage}
                      onChange={(e) => setConversionForm(prev => ({ ...prev, targetLanguage: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select target language/framework...</option>
                      {getAllOptions().map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
              </div>
                </div>

                {/* Conversion Button */}
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    {selectedFiles.length > 0 
                      ? `${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''} selected`
                      : 'Select files to convert'
                    }
                  </div>
                  <button
                    onClick={handleConversion}
                    disabled={!conversionForm.sourceLanguage || !conversionForm.targetLanguage || selectedFiles.length === 0}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Convert Files
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions Bar */}
        {filteredFiles.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center justify-between bg-white rounded-lg shadow px-6 py-4">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {filteredFiles.length} file{filteredFiles.length !== 1 ? 's' : ''} {activeTab === 'files' ? 'uploaded individually' : 'from ZIP archives'}
              </span>
              {selectedFiles.length > 0 && (
                <span className="text-sm text-blue-600">
                  {selectedFiles.length} selected
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {selectedFiles.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected ({selectedFiles.length})
                </button>
              )}
              <button
                onClick={handleCreateZip}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Download className="h-4 w-4 mr-2" />
                Download ZIP
              </button>
              <button
                onClick={loadFiles}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        )}

        {/* Files List */}
        <div className="bg-white shadow rounded-lg">
          {isLoading ? (
            <div className="p-8 text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              <p className="mt-2 text-gray-600">Loading files...</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="p-8 text-center">
              <Folder className="h-12 w-12 mx-auto text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {activeTab === 'files' ? 'No individual files' : 'No ZIP files'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {activeTab === 'files' 
                  ? 'Upload individual files using the Single File Upload tab above.'
                  : 'Upload ZIP archives using the Upload ZIP File tab above.'
                }
              </p>
            </div>
          ) : activeTab === 'zip' ? (
            // Tree Structure ZIP Files Display
            <div className="p-6">
              {!currentZipSession ? (
                <div className="text-center py-8">
                  <Folder className="h-12 w-12 mx-auto text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No ZIP upload in progress</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Upload a ZIP file to see its tree structure here.
                  </p>
                </div>
              ) : currentSessionFiles.length === 0 ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                  <p className="mt-2 text-gray-600">Loading ZIP files...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Session Header */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Archive className="h-5 w-5 text-blue-500" />
                        <div>
                          <h3 className="text-sm font-medium text-blue-900">
                            Current ZIP Upload
                          </h3>
                          <p className="text-xs text-blue-700">
                            {currentSessionFiles.length} files • {formatFileSize(currentSessionFiles.reduce((sum, file) => sum + file.fileSize, 0))}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={currentSessionFiles.every(file => selectedFiles.includes(file.id))}
                          onChange={() => {
                            const fileIds = currentSessionFiles.map(f => f.id);
                            if (fileIds.every(id => selectedFiles.includes(id))) {
                              setSelectedFiles(prev => prev.filter(id => !fileIds.includes(id)));
                            } else {
                              setSelectedFiles(prev => [...prev, ...fileIds.filter(id => !prev.includes(id))]);
                            }
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-xs text-blue-700">Select All</span>
                      </div>
                    </div>

                    {/* Job status banner */}
                    {currentJobStatus === 'processing' && (
                      <div className="mt-3 flex items-center justify-between rounded-md bg-yellow-50 border border-yellow-200 px-3 py-2">
                        <div className="flex items-center gap-2 text-yellow-800 text-sm">
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Processing your project... Semantic chunking in progress</span>
                        </div>
                        <span className="text-xs text-yellow-700">{currentJobChunks} chunks so far</span>
                      </div>
                    )}
                    {currentJobStatus === 'ready' && (
                      <div className="mt-3 flex items-center justify-between rounded-md bg-green-50 border border-green-200 px-3 py-2">
                        <div className="flex items-center gap-2 text-green-800 text-sm">
                          <CheckCircle className="h-4 w-4" />
                          <span>Your project is ready for migration!</span>
                        </div>
                        <button
                          onClick={() => setShowConversionForm(true)}
                          className="inline-flex items-center px-3 py-2 rounded-md bg-green-600 text-white text-xs font-medium hover:bg-green-700"
                        >
                          Run Migration
                        </button>
                      </div>
                    )}
                    {currentJobStatus === 'failed' && (
                      <div className="mt-3 flex items-center justify-between rounded-md bg-red-50 border border-red-200 px-3 py-2">
                        <div className="flex items-center gap-2 text-red-800 text-sm">
                          <XCircle className="h-4 w-4" />
                          <span>Processing failed. Please try again.</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Tree Structure */}
                  <div className="border border-gray-200 rounded-lg bg-white">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700">Folder Structure</h4>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {Object.values(treeStructure).map((item: any) => renderTreeItem(item))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Regular Single Files Display
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedFiles.length === filteredFiles.length && filteredFiles.length > 0}
                        onChange={() => {
                          if (selectedFiles.length === filteredFiles.length) {
                            setSelectedFiles([]);
                          } else {
                            setSelectedFiles(filteredFiles.map(f => f.id));
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Uploaded
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredFiles.map((file) => (
                    <tr key={file.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedFiles.includes(file.id)}
                          onChange={() => toggleFileSelection(file.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FileText className="h-5 w-5 text-blue-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {file.originalFilename}
                            </div>
                            {file.extractedFrom && (
                              <div className="text-sm text-gray-500">
                                From: {file.extractedFrom}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatFileSize(file.fileSize)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(file.uploadedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleDownloadFile(file.id, file.originalFilename)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteFile(file.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
            </div>
      </div>
    </div>
  );
};

export default MigrationDashboard;