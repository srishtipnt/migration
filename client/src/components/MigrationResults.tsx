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
    const processedContent = file.content
      ?.replace(/\\n/g, '\n')
      .replace(/\\r\\n/g, '\n')
      .replace(/\\r/g, '\n') || '';
    const blob = new Blob([processedContent], { type: 'text/plain' });
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
  
  // Function to extract actual code from JSON structures
  const extractCodeFromJson = (content: string): string => {
    if (!content) return '';
    
    // Check if content contains JSON structure
    if (content.includes('"migratedCode"') || content.includes('"content"')) {
      try {
        // Try to parse as JSON and extract the code
        const jsonMatch = content.match(/"migratedCode":\s*"([^"]+)"/);
        if (jsonMatch) {
          return jsonMatch[1].replace(/\\n/g, '\n').replace(/\\r\\n/g, '\n').replace(/\\r/g, '\n');
        }
        
        // Try to extract from content field
        const contentMatch = content.match(/"content":\s*"([^"]+)"/);
        if (contentMatch) {
          return contentMatch[1].replace(/\\n/g, '\n').replace(/\\r\\n/g, '\n').replace(/\\r/g, '\n');
        }
      } catch (e) {
        console.log('🔍 JSON extraction failed, using raw content');
      }
    }
    
    return content;
  };

  // Process content to convert escaped newlines to actual newlines and clean up
  const processedOriginalContent = originalContent
    .replace(/\\n/g, '\n')
    .replace(/\\r\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\s+$/gm, '') // Remove trailing whitespace from each line
    .trim(); // Remove leading/trailing whitespace
  
  const processedMigratedContent = extractCodeFromJson(currentFile?.content || '')
    .replace(/\\n/g, '\n')
    .replace(/\\r\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\s+$/gm, '') // Remove trailing whitespace from each line
    .trim(); // Remove leading/trailing whitespace

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
                    onClick={() => handleCopyCode(processedMigratedContent, activeFileIndex)}
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

              {/* Enhanced Diff Content */}
              <div className="flex-1 overflow-hidden">
                <div className="h-full bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
                  {processedOriginalContent && processedMigratedContent ? (
                    <ReactDiffViewer
                      oldValue={processedOriginalContent}
                      newValue={processedMigratedContent}
                      splitView={true}
                      showDiffOnly={false}
                      useDarkTheme={false}
                      compareMethod={DiffMethod.WORDS}
                      leftTitle={
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <span className="font-semibold text-gray-700">Original Code</span>
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                            {currentFile.filename}
                          </span>
                        </div>
                      }
                      rightTitle={
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="font-semibold text-gray-700">Migrated Code</span>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                            {currentFile.migratedFilename}
                          </span>
                        </div>
                      }
                      styles={{
                        diffContainer: {
                          fontSize: '14px',
                          height: 'auto',
                          minHeight: '400px',
                          maxHeight: '80vh',
                          fontFamily: 'JetBrains Mono, Monaco, Consolas, "Courier New", monospace',
                          borderRadius: '8px',
                          overflow: 'auto',
                          overflowY: 'scroll',
                          overflowX: 'auto',
                        },
                        diffTable: {
                          height: 'auto',
                          minHeight: '400px',
                          borderCollapse: 'separate',
                          borderSpacing: '0',
                          width: '100%',
                        },
                        diffTableContainer: {
                          height: 'auto',
                          minHeight: '400px',
                          maxHeight: '80vh',
                          borderRadius: '8px',
                          overflow: 'auto',
                          overflowY: 'scroll',
                          overflowX: 'auto',
                        },
                        title: {
                          backgroundColor: '#f8fafc',
                          borderBottom: '1px solid #e2e8f0',
                          padding: '12px 16px',
                          fontSize: '14px',
                          fontWeight: '600',
                        },
                        diffRemoved: {
                          backgroundColor: '#fef2f2',
                          color: '#dc2626',
                          borderLeft: '3px solid #fca5a5',
                          padding: '8px 12px',
                        },
                        diffAdded: {
                          backgroundColor: '#f0fdf4',
                          color: '#16a34a',
                          borderLeft: '3px solid #86efac',
                          padding: '8px 12px',
                        },
                        diffChanged: {
                          backgroundColor: '#fefce8',
                          color: '#ca8a04',
                          borderLeft: '3px solid #fde047',
                          padding: '8px 12px',
                        },
                        wordDiff: {
                          backgroundColor: '#fef3c7',
                          borderRadius: '3px',
                          padding: '1px 3px',
                        },
                        wordAdded: {
                          backgroundColor: '#bbf7d0',
                          color: '#166534',
                          borderRadius: '3px',
                          padding: '1px 3px',
                          fontWeight: '500',
                        },
                        wordRemoved: {
                          backgroundColor: '#fecaca',
                          color: '#991b1b',
                          borderRadius: '3px',
                          padding: '1px 3px',
                          fontWeight: '500',
                        },
                        gutter: {
                          backgroundColor: '#f1f5f9',
                          color: '#64748b',
                          fontSize: '12px',
                          padding: '8px 8px',
                          borderRight: '1px solid #e2e8f0',
                          minWidth: '50px',
                          textAlign: 'center',
                        },
                        line: {
                          padding: '4px 0',
                          lineHeight: '1.6',
                        },
                        lineNumber: {
                          color: '#94a3b8',
                          fontSize: '12px',
                          fontWeight: '400',
                        },
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-96 text-gray-500">
                      <div className="text-center">
                        <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">No Content to Display</h3>
                        <div className="space-y-1 text-sm">
                          <p className="flex items-center justify-center space-x-2">
                            <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                            <span>Original: {originalContent ? 'Available' : 'Missing'}</span>
                          </p>
                          <p className="flex items-center justify-center space-x-2">
                            <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                            <span>Migrated: {currentFile.content ? 'Available' : 'Missing'}</span>
                          </p>
                        </div>
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