import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Copy, Download, ChevronLeft, ChevronRight, FileText, FileCode, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

interface InlineMigrationResultsProps {
  result: any;
  originalFiles: { [key: string]: string };
  onStartOver: () => void;
}

const InlineMigrationResults: React.FC<InlineMigrationResultsProps> = ({ result, originalFiles, onStartOver }) => {
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
  
  // Process content to convert escaped newlines to actual newlines and clean up
  const processedOriginalContent = originalContent
    .replace(/\\n/g, '\n')
    .replace(/\\r\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\s+$/gm, '') // Remove trailing whitespace from each line
    .trim(); // Remove leading/trailing whitespace
  
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

  const processedMigratedContent = extractCodeFromJson(currentFile?.content || '')
    .replace(/\\n/g, '\n')
    .replace(/\\r\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\s+$/gm, '') // Remove trailing whitespace from each line
    .trim(); // Remove leading/trailing whitespace
  
  // Debug: Log content processing
  console.log('🔍 Original content (first 200 chars):', originalContent.substring(0, 200));
  console.log('🔍 Processed original content (first 200 chars):', processedOriginalContent.substring(0, 200));
  console.log('🔍 Current file content (first 200 chars):', currentFile?.content?.substring(0, 200));
  console.log('🔍 Processed migrated content (first 200 chars):', processedMigratedContent.substring(0, 200));
  
  // Debug content lengths
  console.log('🔍 Content lengths:');
  console.log('  - originalContent length:', originalContent.length);
  console.log('  - processedOriginalContent length:', processedOriginalContent.length);
  console.log('  - currentFile.content length:', currentFile?.content?.length || 0);
  console.log('  - processedMigratedContent length:', processedMigratedContent.length);
  
  // Debug if content is being truncated
  if (processedMigratedContent.length > 200) {
    console.log('🔍 Full migrated content preview (first 500 chars):', processedMigratedContent.substring(0, 500));
    console.log('🔍 Full migrated content preview (last 200 chars):', processedMigratedContent.substring(Math.max(0, processedMigratedContent.length - 200)));
  }
  
  // Debug character count discrepancy
  console.log('🔍 Character Count Analysis:');
  console.log('  - Original raw length:', originalContent.length);
  console.log('  - Original processed length:', processedOriginalContent.length);
  console.log('  - Migrated raw length:', currentFile?.content?.length || 0);
  console.log('  - Migrated processed length:', processedMigratedContent.length);
  console.log('  - Difference in original:', originalContent.length - processedOriginalContent.length);
  console.log('  - Difference in migrated:', (currentFile?.content?.length || 0) - processedMigratedContent.length);
  
  // Debug content structure
  console.log('🔍 Content Structure Analysis:');
  console.log('  - Original lines:', processedOriginalContent.split('\n').length);
  console.log('  - Migrated lines:', processedMigratedContent.split('\n').length);
  console.log('  - Original has JSON structure:', processedOriginalContent.includes('{') && processedOriginalContent.includes('}'));
  console.log('  - Migrated has JSON structure:', processedMigratedContent.includes('{') && processedMigratedContent.includes('}'));

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 max-h-screen overflow-y-auto">
      {/* Header removed - now controlled by parent component */}

      {/* File Navigation */}
      {result.files.length > 1 && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
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
      <div className="flex-1 overflow-auto" style={{ minHeight: '60vh' }}>
        {currentFile && (
          <div className="h-full flex flex-col">
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

            {/* Clean Side-by-Side Code Display */}
            <div className="flex-1 overflow-hidden">
              <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm">
                {/* Side-by-Side Content */}
                <div className="overflow-auto" style={{ maxHeight: '80vh' }}>
                  {processedOriginalContent && processedMigratedContent ? (
                    <div className="grid grid-cols-2 h-full">
                      {/* Original Code Column */}
                      <div className="border-r border-gray-200">
                        {/* Original Code Header */}
                        <div className="sticky top-0 bg-gray-50 border-b border-gray-200 px-4 py-3 z-10">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                              <span className="font-semibold text-gray-700">Original Code</span>
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                {currentFile.filename}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500">
                              {processedOriginalContent.length} chars • {processedOriginalContent.split('\n').length} lines
                            </div>
                          </div>
                        </div>
                        
                        {/* Original Code Content */}
                        <div className="p-4 h-full overflow-auto">
                          <pre className="text-sm font-mono text-gray-800 leading-relaxed whitespace-pre-wrap">
                            {processedOriginalContent}
                          </pre>
                        </div>
                      </div>

                      {/* Migrated Code Column */}
                      <div>
                        {/* Migrated Code Header */}
                        <div className="sticky top-0 bg-gray-50 border-b border-gray-200 px-4 py-3 z-10">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              <span className="font-semibold text-gray-700">Migrated Code</span>
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                {currentFile.migratedFilename}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500">
                              {processedMigratedContent.length} chars • {processedMigratedContent.split('\n').length} lines
                            </div>
                          </div>
                        </div>
                        
                        {/* Migrated Code Content */}
                        <div className="p-4 h-full overflow-auto">
                          <pre className="text-sm font-mono text-gray-800 leading-relaxed whitespace-pre-wrap">
                            {processedMigratedContent}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-96 text-gray-500">
                      <div className="text-center">
                        <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">No Content to Display</h3>
                        <p className="text-sm text-gray-500">
                          The content is not available for this file.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions - Moved to bottom with smaller size */}
      <div className="p-2 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-center">
          <button
            onClick={handleDownloadAll}
            className="flex items-center space-x-2 px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
          >
            <Download className="h-3 w-3" />
            <span>Download All Files</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default InlineMigrationResults;
