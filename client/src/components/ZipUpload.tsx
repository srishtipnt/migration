import React, { useState, useCallback, useRef } from 'react';
import { 
  Archive, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Folder,
  FileText,
  Eye,
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import JSZip from 'jszip';
import apiService from '../services/api';
import { useUpload } from '../contexts/UploadContext';

interface ZipUploadProps {
  onZipUpload: (file: File, abortController: AbortController) => void;
  onClearZip: () => void;
}

interface ZipFileInfo {
  name: string;
  size: number;
  fileCount: number;
  files: ExtractedFile[];
  totalUncompressedSize: number;
}

interface ExtractedFile {
  name: string;
  path: string;
  size: number;
  type: string;
}

const ZipUpload: React.FC<ZipUploadProps> = ({ onZipUpload, onClearZip }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [zipInfo, setZipInfo] = useState<ZipFileInfo | null>(null);
  const [extractedFiles, setExtractedFiles] = useState<ExtractedFile[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadInProgressRef = useRef<boolean>(false); // Prevent duplicate uploads
  const { startUpload, updateProgress, completeUpload, setUploading } = useUpload();

  // Handle drag and drop
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
    
    // Clear any previous errors
    setError(null);
    
    const files = Array.from(e.dataTransfer.files);
    const zipFile = files.find(file => file.name.toLowerCase().endsWith('.zip'));
    
    // Check if any non-ZIP files were dropped
    const nonZipFiles = files.filter(file => !file.name.toLowerCase().endsWith('.zip'));
    if (nonZipFiles.length > 0) {
      toast.error('Only ZIP files are allowed in ZIP upload. Please use the single file upload section for individual files.');
      setError('Only ZIP files are allowed in ZIP upload. Please use the single file upload section for individual files.');
      return;
    }
    
    if (zipFile) {
      handleZipFileSelect(zipFile);
    }
  }, []);

  // Handle auto-upload after ZIP processing
  const handleAutoUpload = useCallback(async (file: File) => {
    // Prevent duplicate uploads
    if (uploadInProgressRef.current) {
      console.log('🚫 Upload already in progress, skipping duplicate call');
      return;
    }
    
    uploadInProgressRef.current = true;
    
    // Start global upload state
    startUpload('zip', file.name);
    setUploading(true);
    
    try {
      console.log('🚀 Processing ZIP file:', file.name);
      
      // Update progress
      updateProgress(10, file.name);
      
      // Create AbortController BEFORE calling parent handler
      const abortController = new AbortController();
      console.log('🎛️ Created AbortController for ZIP upload:', file.name);
      
      // Update progress
      updateProgress(50, file.name);
      
      // Call the parent handler with the AbortController
      await onZipUpload(file, abortController);
      
      // Update progress
      updateProgress(100, file.name);
      
      // Complete global upload state
      completeUpload();
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('🚫 ZIP upload cancelled:', file.name);
        alert('ZIP upload was cancelled');
      } else {
        console.error('❌ ZIP processing failed:', error);
        alert(`ZIP processing failed: ${error.message}`);
      }
      completeUpload();
    } finally {
      uploadInProgressRef.current = false;
      setUploading(false);
    }
  }, [onZipUpload, startUpload, updateProgress, completeUpload, setUploading]);

  // Handle ZIP file selection
  const handleZipFileSelect = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      alert('Please select a ZIP file');
      return;
    }

    // Prevent duplicate processing
    if (uploadInProgressRef.current) {
      console.log('🚫 Upload already in progress, skipping duplicate file selection');
      return;
    }

    setZipFile(file);
    setIsUploading(true);

    try {
      // Extract ZIP file info and preview
      const zipInfo = await extractZipInfo(file);
      setZipInfo(zipInfo);
      setExtractedFiles(zipInfo.files || []);
      setShowPreview(true);
      
      // Auto-upload the ZIP file after processing
      await handleAutoUpload(file);
    } catch (error) {
      console.error('Error processing ZIP file:', error);
      alert('Error processing ZIP file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [handleAutoUpload]);

  // Extract ZIP file information
  const extractZipInfo = async (file: File): Promise<ZipFileInfo> => {
    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);
      
      const files: ExtractedFile[] = [];
      let totalSize = 0;
      
      // Process each file in the ZIP
      for (const [relativePath, zipEntry] of Object.entries(zipContent.files)) {
        if (!zipEntry.dir) { // Skip directories
          const fileName = relativePath.split('/').pop() || relativePath;
          const folderPath = relativePath.substring(0, relativePath.lastIndexOf('/')) || '';
          
          // Determine file type from extension
          const extension = fileName.split('.').pop()?.toLowerCase() || '';
          let fileType = 'unknown';
          
          switch (extension) {
            case 'js':
              fileType = 'javascript';
              break;
            case 'ts':
              fileType = 'typescript';
              break;
            case 'css':
              fileType = 'css';
              break;
            case 'html':
            case 'htm':
              fileType = 'html';
              break;
            case 'json':
              fileType = 'json';
              break;
            case 'py':
              fileType = 'python';
              break;
            case 'java':
              fileType = 'java';
              break;
            case 'cpp':
            case 'cc':
            case 'cxx':
              fileType = 'cpp';
              break;
            case 'c':
              fileType = 'c';
              break;
            case 'php':
              fileType = 'php';
              break;
            case 'rb':
              fileType = 'ruby';
              break;
            case 'go':
              fileType = 'go';
              break;
            case 'rs':
              fileType = 'rust';
              break;
            case 'swift':
              fileType = 'swift';
              break;
            case 'kt':
              fileType = 'kotlin';
              break;
            case 'scala':
              fileType = 'scala';
              break;
            case 'xml':
              fileType = 'xml';
              break;
            case 'md':
              fileType = 'markdown';
              break;
            case 'txt':
              fileType = 'text';
              break;
            default:
              fileType = 'unknown';
          }
          
          files.push({
            name: fileName,
            path: folderPath,
            size: zipEntry._data?.uncompressedSize || 0,
            type: fileType
          });
          
          totalSize += zipEntry._data?.uncompressedSize || 0;
        }
      }
      
      return {
        name: file.name,
        size: file.size,
        fileCount: files.length,
        files: files,
        totalUncompressedSize: totalSize
      };
    } catch (error) {
      console.error('Error extracting ZIP info:', error);
      throw new Error('Invalid ZIP file or corrupted archive');
    }
  };

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Clear any previous errors
    setError(null);
    
    const files = Array.from(e.target.files || []);
    const zipFile = files.find(file => file.name.toLowerCase().endsWith('.zip'));
    
    // Check if any non-ZIP files were selected
    const nonZipFiles = files.filter(file => !file.name.toLowerCase().endsWith('.zip'));
    if (nonZipFiles.length > 0) {
      toast.error('Only ZIP files are allowed in ZIP upload. Please use the single file upload section for individual files.');
      setError('Only ZIP files are allowed in ZIP upload. Please use the single file upload section for individual files.');
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }
    
    if (zipFile) {
      handleZipFileSelect(zipFile);
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleZipFileSelect]);

  // Handle clear
  const handleClear = useCallback(() => {
    setZipFile(null);
    setZipInfo(null);
    setExtractedFiles([]);
    setShowPreview(false);
    uploadInProgressRef.current = false; // Reset upload flag
    onClearZip();
  }, [onClearZip]);

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file icon based on type
  const getFileIcon = (type: string) => {
    switch (type) {
      case 'javascript':
        return <FileText className="h-4 w-4 text-yellow-500" />;
      case 'typescript':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'css':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'html':
        return <FileText className="h-4 w-4 text-orange-500" />;
      case 'json':
        return <FileText className="h-4 w-4 text-green-500" />;
      case 'python':
        return <FileText className="h-4 w-4 text-green-600" />;
      case 'java':
        return <FileText className="h-4 w-4 text-red-500" />;
      case 'cpp':
      case 'c':
        return <FileText className="h-4 w-4 text-blue-700" />;
      case 'php':
        return <FileText className="h-4 w-4 text-purple-500" />;
      case 'ruby':
        return <FileText className="h-4 w-4 text-red-600" />;
      case 'go':
        return <FileText className="h-4 w-4 text-cyan-500" />;
      case 'rust':
        return <FileText className="h-4 w-4 text-orange-600" />;
      case 'swift':
        return <FileText className="h-4 w-4 text-orange-400" />;
      case 'kotlin':
        return <FileText className="h-4 w-4 text-purple-600" />;
      case 'scala':
        return <FileText className="h-4 w-4 text-red-700" />;
      case 'xml':
        return <FileText className="h-4 w-4 text-gray-600" />;
      case 'markdown':
        return <FileText className="h-4 w-4 text-gray-700" />;
      case 'text':
        return <FileText className="h-4 w-4 text-gray-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver
            ? 'border-purple-400 bg-purple-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip"
          onChange={handleFileInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading}
        />
        
        <div className="space-y-4">
          <div className="mx-auto w-12 h-12 text-gray-400">
            {isUploading ? (
              <Loader2 className="w-full h-full animate-spin" />
            ) : (
              <Archive className="w-full h-full" />
            )}
          </div>
          
          <div>
            <p className="text-lg font-medium text-gray-900">
              {isUploading ? 'Processing and uploading ZIP file...' : 'Upload ZIP Archive'}
            </p>
            <p className="text-sm text-gray-500">
              Drag and drop a ZIP file here, or click to select (auto-upload)
            </p>
          </div>
          
          <div className="text-xs text-gray-400">
            Supports: ZIP archives with preserved folder structure
          </div>
        </div>
      </div>

      {/* ZIP File Preview */}
      {zipInfo && showPreview && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">ZIP File Preview</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="inline-flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                <Eye className="h-4 w-4 mr-1" />
                {showPreview ? 'Hide' : 'Show'} Structure
              </button>
              <button
                onClick={handleClear}
                className="inline-flex items-center px-3 py-1 text-sm text-red-600 hover:text-red-800"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </button>
            </div>
          </div>

          {/* ZIP Info */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm font-medium text-gray-700">File Name</p>
              <p className="text-sm text-gray-900 truncate">{zipInfo.name}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm font-medium text-gray-700">Compressed Size</p>
              <p className="text-sm text-gray-900">{formatFileSize(zipInfo.size)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm font-medium text-gray-700">Uncompressed Size</p>
              <p className="text-sm text-gray-900">{formatFileSize(zipInfo.totalUncompressedSize)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm font-medium text-gray-700">Files Inside</p>
              <p className="text-sm text-gray-900">{zipInfo.fileCount} files</p>
            </div>
          </div>

          {/* File Structure */}
          {showPreview && (
            <div className="border border-gray-200 rounded-lg">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <h4 className="text-sm font-medium text-gray-700">File Structure</h4>
              </div>
              <div className="max-h-64 overflow-y-auto p-4">
                <div className="space-y-1">
                  {extractedFiles.map((file, index) => (
                    <div key={index} className="flex items-center space-x-2 text-sm">
                      {file.path ? (
                        <>
                          <Folder className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">{file.path}</span>
                        </>
                      ) : (
                        <div className="w-6" /> // Spacer for root files
                      )}
                      {getFileIcon(file.type)}
                      <span className="text-gray-900">{file.name}</span>
                      <span className="text-gray-500 text-xs ml-auto">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Upload Status */}
          <div className="mt-4 flex justify-center">
            <div className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md bg-green-100 text-green-800">
              <CheckCircle className="h-4 w-4 mr-2" />
              ZIP file uploaded automatically to Cloudinary
            </div>
          </div>
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

export default ZipUpload;
