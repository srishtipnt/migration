import React, { useState, useEffect } from 'react';
import { CheckCircle, Copy, Download, ChevronLeft, ChevronRight, FileText, FileCode } from 'lucide-react';
import toast from 'react-hot-toast';
import MonacoCodeViewer from './MonacoCodeViewer';

interface InlineMigrationResultsProps {
  result: Record<string, unknown>;
  originalFiles: { [key: string]: string };
  onStartOver: () => void;
}

const InlineMigrationResults: React.FC<InlineMigrationResultsProps> = ({ result, originalFiles }) => {
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

  const handleDownloadFile = (file: Record<string, unknown>) => {
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
    if (result.files && Array.isArray(result.files)) {
      result.files.forEach((file: Record<string, unknown>) => {
      handleDownloadFile(file);
    });
    toast.success('All files downloaded!');
    }
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
  
  // Debug current file structure
  console.log(' Current file structure:', {
    filename: currentFile?.filename,
    migratedFilename: currentFile?.migratedFilename,
    contentLength: currentFile?.content?.length,
    contentPreview: currentFile?.content?.substring(0, 200)
  });
  
  // Function to extract actual code from JSON structures
  const extractCodeFromJson = (content: string): string => {
    if (!content) return '';
    
    console.log(' extractCodeFromJson input (first 500 chars):', content.substring(0, 500));
    
    // For architectural migrations, the content should already be the actual code
    // The files array contains the individual service files with their content
    // We don't need to extract from JSON structure here since the content field
    // should already contain the actual code content
    
    // Check if this looks like JSON (starts with { or contains JSON markers)
    const trimmedContent = content.trim();
    if (trimmedContent.startsWith('{') && trimmedContent.includes('"migratedCode"')) {
      console.log(' Content appears to be JSON structure, attempting extraction');
      try {
        // Try to parse the entire JSON to extract migratedCode
        const parsed = JSON.parse(trimmedContent);
        if (parsed.migratedCode) {
          console.log(' Extracted migratedCode from JSON structure');
          return parsed.migratedCode.replace(/\\n/g, '\n').replace(/\\r\\n/g, '\n').replace(/\\r/g, '\n');
        }
      } catch (e) {
        console.log('⚠️ JSON parsing failed, trying regex extraction');
        
        // Fallback: Try to extract migratedCode using a more robust regex
        // This handles multi-line content and escaped quotes
        const migratedCodeMatch = trimmedContent.match(/"migratedCode":\s*"((?:[^"\\]|\\.)*)"/s);
        if (migratedCodeMatch) {
          console.log(' Extracted migratedCode using regex');
          return migratedCodeMatch[1].replace(/\\n/g, '\n').replace(/\\r\\n/g, '\n').replace(/\\r/g, '\n').replace(/\\"/g, '"');
        }
      }
    }
    
    // If it's not JSON or extraction failed, return the content as-is
    console.log(' Using content as-is (not JSON structure)');
    return content.replace(/\\n/g, '\n').replace(/\\r\\n/g, '\n').replace(/\\r/g, '\n');
  };

  // Extract and process the migrated content
  const rawMigratedContent = currentFile?.content || '';
  console.log(' Raw migrated content (first 500 chars):', rawMigratedContent.substring(0, 500));
  
  const extractedContent = extractCodeFromJson(rawMigratedContent);
  console.log(' Extracted content (first 500 chars):', extractedContent.substring(0, 500));
  
  const processedMigratedContent = extractedContent
    .replace(/\\n/g, '\n')
    .replace(/\\r\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\s+$/gm, '') // Remove trailing whitespace from each line
    .trim(); // Remove leading/trailing whitespace
  
  console.log(' Final processed content (first 500 chars):', processedMigratedContent.substring(0, 500));
  console.log(' Final processed content length:', processedMigratedContent.length);
  
  // Debug: Log content processing
  console.log(' Original content (first 200 chars):', originalContent.substring(0, 200));
  console.log(' Processed original content (first 200 chars):', processedOriginalContent.substring(0, 200));
  console.log(' Current file content (first 200 chars):', currentFile?.content?.substring(0, 200));
  console.log(' Processed migrated content (first 200 chars):', processedMigratedContent.substring(0, 200));
  
  // Debug content lengths
  console.log(' Content lengths:');
  console.log('  - originalContent length:', originalContent.length);
  console.log('  - processedOriginalContent length:', processedOriginalContent.length);
  console.log('  - currentFile.content length:', currentFile?.content?.length || 0);
  console.log('  - processedMigratedContent length:', processedMigratedContent.length);
  
  // Debug if content is being truncated
  if (processedMigratedContent.length > 200) {
    console.log(' Full migrated content preview (first 500 chars):', processedMigratedContent.substring(0, 500));
    console.log(' Full migrated content preview (last 200 chars):', processedMigratedContent.substring(Math.max(0, processedMigratedContent.length - 200)));
  }
  
  // Debug character count discrepancy
  console.log(' Character Count Analysis:');
  console.log('  - Original raw length:', originalContent.length);
  console.log('  - Original processed length:', processedOriginalContent.length);
  console.log('  - Migrated raw length:', currentFile?.content?.length || 0);
  console.log('  - Migrated processed length:', processedMigratedContent.length);
  console.log('  - Difference in original:', originalContent.length - processedOriginalContent.length);
  console.log('  - Difference in migrated:', (currentFile?.content?.length || 0) - processedMigratedContent.length);
  
  // Debug content structure
  console.log(' Content Structure Analysis:');
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

            {/* Monaco Editor Side-by-Side Code Display */}
            <div className="flex-1 overflow-hidden">
                  {processedOriginalContent && processedMigratedContent ? (
                <MonacoCodeViewer
                  originalCode={processedOriginalContent}
                  migratedCode={processedMigratedContent}
                  originalFileName={currentFile.filename}
                  migratedFileName={currentFile.migratedFilename}
                  onDownload={(code, filename) => {
                    const blob = new Blob([code], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success(`Downloaded ${filename}`);
                  }}
                  onCopy={(code) => {
                    navigator.clipboard.writeText(code).then(() => {
                      toast.success('Code copied to clipboard!');
                    });
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-96 text-gray-500 bg-gray-50 rounded-lg">
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
