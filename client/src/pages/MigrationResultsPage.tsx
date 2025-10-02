import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Copy, FileText, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';
import toast from 'react-hot-toast';

interface MigrationResult {
  migratedCode: string;
  summary: string;
  changes: string[];
  files: Array<{
    filename: string;
    migratedFilename: string;
    content: string;
  }>;
  warnings: string[];
  recommendations: string[];
  isDemo: boolean;
}

interface OriginalFiles {
  [key: string]: string;
}

const MigrationResultsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [copiedFiles, setCopiedFiles] = useState<Set<number>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Get data from navigation state
  const result: MigrationResult = location.state?.result;
  const originalFiles: OriginalFiles = location.state?.originalFiles || {};
  const sessionId: string = location.state?.sessionId;

  useEffect(() => {
    if (!result) {
      // If no result data, redirect back to migration page
      navigate('/migrate');
      return;
    }
  }, [result, navigate]);

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

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (!result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Migration Results Found</h2>
          <p className="text-gray-500 mb-4">Please complete a migration first.</p>
          <button
            onClick={() => navigate('/migrate')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Migration
          </button>
        </div>
      </div>
    );
  }

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

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50' : 'min-h-screen'} bg-gray-50`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/migrate')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Migration</span>
            </button>
            
            <div className="h-6 w-px bg-gray-300" />
            
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <h1 className="text-xl font-semibold text-gray-900">Migration Results</h1>
              {result.isDemo && (
                <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                  Demo Mode
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={toggleFullscreen}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </button>
            
            <button
              onClick={handleDownloadAll}
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Download All</span>
            </button>
          </div>
        </div>
      </div>

      {/* File Navigation */}
      {result.files.length > 1 && (
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={prevFile}
                disabled={result.files.length <= 1}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              
              <div className="text-sm text-gray-600">
                File {activeFileIndex + 1} of {result.files.length}
              </div>
              
              <button
                onClick={nextFile}
                disabled={result.files.length <= 1}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <div className="text-sm font-medium text-gray-900">
              {currentFile?.filename} → {currentFile?.migratedFilename}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`${isFullscreen ? 'h-[calc(100vh-120px)]' : 'h-[calc(100vh-200px)]'} flex flex-col`}>
        {/* Content Analysis */}
        <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-6">
              <div className="text-gray-700">
                <span className="font-medium">Original:</span> {processedOriginalContent.length} chars ({processedOriginalContent.split('\n').length} lines)
              </div>
              <div className="text-gray-700">
                <span className="font-medium">Migrated:</span> {processedMigratedContent.length} chars ({processedMigratedContent.split('\n').length} lines)
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className={`text-xs px-2 py-1 rounded-full ${
                processedOriginalContent.includes('{') && processedOriginalContent.includes('}') 
                  ? 'bg-red-100 text-red-700' 
                  : 'bg-green-100 text-green-700'
              }`}>
                {processedOriginalContent.includes('{') && processedOriginalContent.includes('}') ? '⚠️ Original contains JSON' : '✅ Original is clean'}
              </div>
              <div className={`text-xs px-2 py-1 rounded-full ${
                processedMigratedContent.includes('{') && processedMigratedContent.includes('}') 
                  ? 'bg-red-100 text-red-700' 
                  : 'bg-green-100 text-green-700'
              }`}>
                {processedMigratedContent.includes('{') && processedMigratedContent.includes('}') ? '⚠️ Migrated contains JSON' : '✅ Migrated is clean'}
              </div>
            </div>
          </div>
        </div>

        {/* Side-by-Side Diff Viewer */}
        <div className="flex-1 overflow-hidden">
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
                  height: '100%',
                  fontFamily: 'JetBrains Mono, Monaco, Consolas, "Courier New", monospace',
                  borderRadius: '0',
                  overflow: 'auto',
                  overflowY: 'scroll',
                  overflowX: 'auto',
                },
                diffTable: {
                  height: '100%',
                  borderCollapse: 'separate',
                  borderSpacing: '0',
                  width: '100%',
                },
                diffTableContainer: {
                  height: '100%',
                  borderRadius: '0',
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
                  color: '#991b1b',
                  borderLeft: '4px solid #fca5a5',
                },
                diffAdded: {
                  backgroundColor: '#f0fdf4',
                  color: '#166534',
                  borderLeft: '4px solid #86efac',
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
            <div className="flex items-center justify-center h-full text-gray-500">
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
        </div>

        {/* Action Bar */}
        <div className="bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => handleCopyCode(processedMigratedContent, activeFileIndex)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  copiedFiles.has(activeFileIndex)
                    ? 'bg-green-100 text-green-700'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                <Copy className="h-4 w-4" />
                <span>{copiedFiles.has(activeFileIndex) ? 'Copied!' : 'Copy Code'}</span>
              </button>
              
              <button
                onClick={() => handleDownloadFile(currentFile)}
                className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Download</span>
              </button>
            </div>

            <div className="text-sm text-gray-500">
              Session: {sessionId}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MigrationResultsPage;

