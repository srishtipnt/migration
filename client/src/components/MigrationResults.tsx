import React, { useState, useEffect } from 'react';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';
import { X, CheckCircle, AlertCircle, Copy, Download, ChevronLeft, ChevronRight, FileText, FileCode, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

interface MigrationResultsProps {
  result: any;
  originalFiles: { [key: string]: string };
  onClose: () => void;
  onStartOver: () => void;
}

const MigrationResults: React.FC<MigrationResultsProps> = ({ result, originalFiles, onClose, onStartOver }) => {
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [copiedFiles, setCopiedFiles] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (result.files && result.files.length > 0) {
      setActiveFileIndex(0);
    }
  }, [result.files]);

  const handleCopyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code).then(() => {
      toast.success('Code copied to clipboard!');
      setCopiedFiles((prev) => new Set(prev).add(index));
      setTimeout(() => {
        setCopiedFiles((prev) => {
          const newSet = new Set(prev);
          newSet.delete(index);
          return newSet;
        });
      }, 2000);
    });
  };

  const handleDownloadFile = (file: any) => {
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.migratedFilename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${file.migratedFilename}`);
  };

  const handleDownloadAll = () => {
    result.files.forEach((file: any) => {
      handleDownloadFile(file);
    });
    toast.success('All files downloaded!');
  };

  const nextFile = () => {
    setActiveFileIndex((prev) => (prev + 1) % result.files.length);
  };

  const prevFile = () => {
    setActiveFileIndex((prev) => (prev - 1 + result.files.length) % result.files.length);
  };

  const currentFile = result.files[activeFileIndex];
  const originalContent = originalFiles[currentFile?.filename] || '';

  // Debug: Log modal dimensions
  React.useEffect(() => {
    console.log('MigrationResults modal mounted');
    console.log('Files count:', result.files.length);
    console.log('Current file:', currentFile?.migratedFilename);
  }, [result.files.length, currentFile]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-2 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[95vh] flex flex-col migration-results-modal my-1 sm:my-2">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              {result.isDemo ? (
                <AlertCircle className="h-6 w-6 text-yellow-500" />
              ) : (
                <CheckCircle className="h-6 w-6 text-green-500" />
              )}
              <h2 className="text-2xl font-bold text-gray-900">Migration Results</h2>
            </div>
            {result.isDemo && (
              <span className="ml-4 px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
                Demo Mode
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close results"
          >
            <X className="h-6 w-6" />
          </button>
        </div>


        {/* File Navigation */}
        {result.files.length > 1 && (
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileCode className="h-5 w-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  File {activeFileIndex + 1} of {result.files.length}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={prevFile}
                  disabled={result.files.length <= 1}
                  className="p-1 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-5 w-5 text-gray-700" />
                </button>
                <button
                  onClick={nextFile}
                  disabled={result.files.length <= 1}
                  className="p-1 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-5 w-5 text-gray-700" />
                </button>
              </div>
            </div>
            
            {/* File Tabs */}
            <div className="flex space-x-1 mt-3 overflow-x-auto">
              {result.files.map((file: any, index: number) => (
                <button
                  key={index}
                  onClick={() => setActiveFileIndex(index)}
                  className={`px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors file-tab ${
                    index === activeFileIndex
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {file.migratedFilename}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Diff Viewer */}
        <div className="flex-1 overflow-auto min-h-0">
          {currentFile && (
            <div className="h-full flex flex-col min-h-0">
              {/* File Header */}
              <div className="flex items-center justify-between p-3 bg-gray-50 border-b">
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-gray-500" />
                  <div>
                    <div className="font-medium text-gray-900">
                      {currentFile.filename} → {currentFile.migratedFilename}
                    </div>
                    <div className="text-sm text-gray-500">
                      {currentFile.content.length} characters
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleCopyCode(currentFile.content, activeFileIndex)}
                    className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors copy-button"
                  >
                    {copiedFiles.has(activeFileIndex) ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    <span className="text-sm">
                      {copiedFiles.has(activeFileIndex) ? 'Copied!' : 'Copy'}
                    </span>
                  </button>
                  <button
                    onClick={() => handleDownloadFile(currentFile)}
                    className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors download-button"
                  >
                    <Download className="h-4 w-4" />
                    <span className="text-sm">Download</span>
                  </button>
                </div>
              </div>

              {/* Diff Content */}
              <div className="flex-1 overflow-auto min-h-0 p-2">
                <div className="diff-viewer h-full">
                  {originalContent && currentFile.content ? (
                    <ReactDiffViewer
                      oldValue={originalContent}
                      newValue={currentFile.content}
                      splitView={true}
                      showDiffOnly={false}
                      useDarkTheme={false}
                      compareMethod={DiffMethod.WORDS}
                      leftTitle="Original"
                      rightTitle="Migrated"
                      styles={{
                        diffContainer: {
                          fontSize: '14px',
                          height: '100%',
                          minHeight: '600px',
                          fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                        },
                        diffTable: {
                          height: '100%',
                          minHeight: '600px',
                        },
                        diffTableContainer: {
                          height: '100%',
                          minHeight: '600px',
                        },
                        diffRemoved: {
                          backgroundColor: '#fee2e2',
                          color: '#dc2626',
                        },
                        diffAdded: {
                          backgroundColor: '#dcfce7',
                          color: '#16a34a',
                        },
                        wordDiff: {
                          backgroundColor: '#fef3c7',
                        },
                        wordAdded: {
                          backgroundColor: '#bbf7d0',
                        },
                        wordRemoved: {
                          backgroundColor: '#fecaca',
                        },
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-64 text-gray-500">
                      <div className="text-center">
                        <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                        <p>No content to display</p>
                        <p className="text-sm">Original: {originalContent ? 'Available' : 'Missing'}</p>
                        <p className="text-sm">Migrated: {currentFile.content ? 'Available' : 'Missing'}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Fallback simple diff if ReactDiffViewer fails */}
                  {originalContent && currentFile.content && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-600 mb-2">Fallback view:</div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs font-semibold text-gray-700 mb-2">Original ({currentFile.filename})</div>
                          <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-64 whitespace-pre-wrap">
                            {originalContent}
                          </pre>
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-gray-700 mb-2">Migrated ({currentFile.migratedFilename})</div>
                          <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-64 whitespace-pre-wrap">
                            {currentFile.content}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleDownloadAll}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Download All Files</span>
              </button>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={onStartOver}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Start New Migration</span>
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MigrationResults;