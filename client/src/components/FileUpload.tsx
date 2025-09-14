import React, { useState, useCallback, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  Folder, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Download,
  Archive,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  Code
} from 'lucide-react';
import { useFiles } from '../hooks/useApi';

interface FileUploadProps {
  sessionId: string;
  userId: string;
  onFilesUploaded?: (files: any[]) => void;
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

const FileUpload: React.FC<FileUploadProps> = ({ sessionId, userId, onFilesUploaded }) => {
  const { files, loading, error, uploadFiles, deleteFile, downloadFile, createArchive } = useFiles(sessionId);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadedFile[]>([]);
  const [showFileList, setShowFileList] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFileUpload(droppedFiles);
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    handleFileUpload(selectedFiles);
  }, []);

  // Process file upload
  const handleFileUpload = useCallback(async (fileList: File[]) => {
    if (!fileList.length) return;

    // Create upload tracking objects
    const newUploadingFiles: UploadedFile[] = fileList.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'uploading',
      progress: 0
    }));

    setUploadingFiles(prev => [...prev, ...newUploadingFiles]);

    try {
      // Upload files
      const result = await uploadFiles(fileList);
      
      // Update status to uploaded
      setUploadingFiles(prev => 
        prev.map(file => 
          newUploadingFiles.some(uf => uf.id === file.id) 
            ? { ...file, status: 'uploaded', progress: 100 }
            : file
        )
      );

      // Notify parent component
      onFilesUploaded?.(result.files || []);

      // Clear uploading files after delay
      setTimeout(() => {
        setUploadingFiles(prev => 
          prev.filter(file => !newUploadingFiles.some(uf => uf.id === file.id))
        );
      }, 2000);

    } catch (err) {
      // Update status to error
      setUploadingFiles(prev => 
        prev.map(file => 
          newUploadingFiles.some(uf => uf.id === file.id) 
            ? { ...file, status: 'error', error: err.message }
            : file
        )
      );
    }
  }, [uploadFiles, onFilesUploaded]);

  // Handle file deletion
  const handleDeleteFile = useCallback(async (fileId: string) => {
    try {
      await deleteFile(fileId);
    } catch (err) {
      console.error('Failed to delete file:', err);
    }
  }, [deleteFile]);

  // Handle file download
  const handleDownloadFile = useCallback(async (fileId: string, fileName: string) => {
    try {
      const blob = await downloadFile(fileId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download file:', err);
    }
  }, [downloadFile]);

  // Handle archive creation
  const handleCreateArchive = useCallback(async () => {
    try {
      const blob = await createArchive();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `session-${sessionId}-archive.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to create archive:', err);
    }
  }, [createArchive, sessionId]);

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file icon
  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
        return <Code className="w-5 h-5 text-blue-500" />;
      case 'json':
        return <FileText className="w-5 h-5 text-yellow-500" />;
      case 'css':
      case 'scss':
      case 'sass':
        return <FileText className="w-5 h-5 text-pink-500" />;
      case 'html':
      case 'htm':
        return <FileText className="w-5 h-5 text-orange-500" />;
      case 'md':
        return <FileText className="w-5 h-5 text-gray-500" />;
      case 'zip':
      case 'rar':
      case '7z':
        return <Archive className="w-5 h-5 text-purple-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const totalFiles = files.length + uploadingFiles.length;
  const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0) + 
                   uploadingFiles.reduce((sum, file) => sum + file.size, 0);

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
          isDragOver
            ? 'border-blue-500 bg-blue-50 scale-105'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Upload Your Project Files
        </h3>
        <p className="text-gray-600 mb-6">
          Drag and drop files here, or click to select files
        </p>
        <div className="space-y-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Choose Files
          </button>
          <p className="text-sm text-gray-500">
            Supports: .js, .ts, .jsx, .tsx, .json, .css, .html, .md, .zip and more
          </p>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="*/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Uploading Files</h4>
          <div className="space-y-3">
            {uploadingFiles.map((file) => (
              <div key={file.id} className="flex items-center space-x-3">
                {file.status === 'uploading' && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
                {file.status === 'uploaded' && <CheckCircle className="w-5 h-5 text-green-500" />}
                {file.status === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                </div>
                
                {file.status === 'uploading' && (
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                )}
                
                {file.status === 'error' && (
                  <p className="text-xs text-red-600">{file.error}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File List */}
      {totalFiles > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <h4 className="text-lg font-semibold text-gray-900">Uploaded Files</h4>
              <span className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full">
                {totalFiles} files
              </span>
              <span className="text-sm text-gray-500">
                {formatFileSize(totalSize)}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowFileList(!showFileList)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {showFileList ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
              {files.length > 0 && (
                <button
                  onClick={handleCreateArchive}
                  className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download ZIP</span>
                </button>
              )}
            </div>
          </div>
          
          {showFileList && (
            <div className="p-4 max-h-64 overflow-y-auto">
              <div className="space-y-2">
                {files.map((file) => (
                  <div key={file.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    {getFileIcon(file.originalName || file.fileName)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.originalName || file.fileName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.fileSize || 0)} • {file.mimeType}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleDownloadFile(file.id, file.originalName || file.fileName)}
                        className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteFile(file.id)}
                        className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <h4 className="text-sm font-medium text-red-800">Upload Error</h4>
          </div>
          <p className="mt-1 text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-800 mb-2">Upload Instructions</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Upload individual files or ZIP archives containing your project</li>
          <li>• Supported file types: JavaScript, TypeScript, JSON, CSS, HTML, Markdown</li>
          <li>• Maximum file size: 100MB per file</li>
          <li>• Maximum files per session: 100 files</li>
          <li>• ZIP files will be automatically extracted</li>
        </ul>
      </div>
    </div>
  );
};

export default FileUpload;
