import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Upload,
  Download,
  Trash2,
  Eye,
  Folder,
  RefreshCw,
  Code,
  ArrowRight,
  Play
} from 'lucide-react';
import FileUpload from './FileUpload';
import apiService from '../services/api';

interface MigrationDashboardProps {
  userId: string;
}

interface FileData {
  id: string;
  originalName: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  extractedFrom?: string;
  folderPath?: string;
  relativePath?: string;
}

const MigrationDashboard: React.FC<MigrationDashboardProps> = ({ userId }) => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [showConversionForm, setShowConversionForm] = useState(false);
  const [conversionForm, setConversionForm] = useState({
    sourceLanguage: '',
    targetLanguage: ''
  });

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

  // Load user's files
  const loadFiles = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiService.getUserFiles();
      setFiles(response.data.files || []);
    } catch (err) {
      console.error('Failed to load files:', err);
      setError('Failed to load files');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  // Handle file upload
  const handleFileUpload = async (uploadedFiles: File[]) => {
    try {
      const response = await apiService.uploadFiles(uploadedFiles);
      if (response.success) {
        await loadFiles(); // Reload files after upload
      }
    } catch (err) {
      console.error('File upload failed:', err);
      setError('File upload failed');
    }
  };

  // Handle file deletion
  const handleDeleteFile = async (fileId: string) => {
    try {
      await apiService.deleteFile(fileId);
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
      const fileIds = selectedFiles.length > 0 ? selectedFiles : files.map(f => f.id);
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
          <FileUpload onUpload={handleFileUpload} />
        </div>

        {/* Conversion Form */}
        {files.length > 0 && (
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
        {files.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center justify-between bg-white rounded-lg shadow px-6 py-4">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {files.length} file{files.length !== 1 ? 's' : ''} total
              </span>
              {selectedFiles.length > 0 && (
                <span className="text-sm text-blue-600">
                  {selectedFiles.length} selected
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
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
          ) : files.length === 0 ? (
            <div className="p-8 text-center">
              <Folder className="h-12 w-12 mx-auto text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No files</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by uploading some files.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedFiles.length === files.length && files.length > 0}
                        onChange={() => {
                          if (selectedFiles.length === files.length) {
                            setSelectedFiles([]);
                          } else {
                            setSelectedFiles(files.map(f => f.id));
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
                  {files.map((file) => (
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
                          <FileText className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {file.originalName}
                            </div>
                            {file.folderPath && (
                              <div className="text-sm text-blue-600">
                                📁 {file.folderPath}
                              </div>
                            )}
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
                            onClick={() => handleDownloadFile(file.id, file.originalName)}
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