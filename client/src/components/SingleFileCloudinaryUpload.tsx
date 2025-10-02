import React, { useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import apiService from '../services/api';

interface SingleFileUploadProps {
  onUpload: (file: File) => Promise<void>;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'uploaded' | 'error';
  progress: number;
  error?: string;
}

const SingleFileCloudinaryUpload: React.FC<SingleFileUploadProps> = ({ onUpload }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<UploadedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]); // Only take the first file
    }
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    if (!file) return;

    // Clear any previous errors
    setError(null);

    // Client-side file type validation
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const isZipFile = fileExtension === 'zip' || file.type === 'application/zip' || file.type === 'application/x-zip-compressed';
    
    if (isZipFile) {
      toast.error('ZIP files are not allowed in single file upload. Please use the ZIP upload section instead.');
      setError('ZIP files are not allowed in single file upload. Please use the ZIP upload section instead.');
      return;
    }

    // Create uploading file object
    const newUploadingFile: UploadedFile = {
      id: `upload-${Date.now()}`,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'uploading',
      progress: 0
    };

    setUploadingFile(newUploadingFile);
    setIsUploading(true);

    try {
      // Simulate upload progress
      setUploadingFile(prev => prev ? { ...prev, progress: 25 } : null);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      setUploadingFile(prev => prev ? { ...prev, progress: 50 } : null);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      setUploadingFile(prev => prev ? { ...prev, progress: 75 } : null);
      await new Promise(resolve => setTimeout(resolve, 200));

      // Call the upload handler
      await onUpload(file);

      setUploadingFile(prev => prev ? { ...prev, progress: 100, status: 'uploaded' } : null);

      // Clear uploading file after a delay
      setTimeout(() => {
        setUploadingFile(null);
        setIsUploading(false);
      }, 1000);

    } catch (error) {
      console.error('Upload failed:', error);
      setUploadingFile(prev => prev ? { 
        ...prev, 
        status: 'error', 
        error: 'Upload failed' 
      } : null);
      setIsUploading(false);
    }
  }, [onUpload]);

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileSelect(files[0]); // Only take the first file
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFileSelect]);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragOver 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${isUploading ? 'pointer-events-none opacity-50' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="space-y-4">
          {/* Upload Icon */}
          <div className="mx-auto w-16 h-16 text-gray-400">
            <svg
              className="w-full h-full"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>

          {/* Upload Text */}
          <div>
            <p className="text-lg font-medium text-gray-900">
              Upload Single File to Cloudinary
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Drag and drop a file here, or click to select
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Supports images, documents, code files, and more
            </p>
          </div>

          {/* Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Choose File
          </button>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileInputChange}
            className="hidden"
            accept="*/*"
          />
        </div>
      </div>

      {/* Upload Progress */}
      {uploadingFile && (
        <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                {uploadingFile.status === 'uploading' && (
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                )}
                {uploadingFile.status === 'uploaded' && (
                  <div className="w-5 h-5 text-green-600">
                    <svg fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                {uploadingFile.status === 'error' && (
                  <div className="w-5 h-5 text-red-600">
                    <svg fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {uploadingFile.name}
                </p>
                <p className="text-sm text-gray-500">
                  {formatFileSize(uploadingFile.size)}
                </p>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {uploadingFile.status === 'uploading' && `${uploadingFile.progress}%`}
              {uploadingFile.status === 'uploaded' && 'Complete'}
              {uploadingFile.status === 'error' && 'Failed'}
            </div>
          </div>

          {/* Progress Bar */}
          {uploadingFile.status === 'uploading' && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadingFile.progress}%` }}
              ></div>
            </div>
          )}

          {/* Error Message */}
          {uploadingFile.status === 'error' && uploadingFile.error && (
            <div className="mt-2 text-sm text-red-600">
              {uploadingFile.error}
            </div>
          )}
        </div>
      )}


      {/* Error Display */}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Upload Error
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SingleFileCloudinaryUpload;

