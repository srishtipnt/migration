import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow, vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeDiffViewerProps {
  originalCode: string;
  migratedCode: string;
  originalLanguage: string;
  targetLanguage: string;
  onAccept: () => void;
  onEdit: (editedCode: string) => void;
  onReject: () => void;
  chunkName?: string;
  chunkType?: string;
}

const CodeDiffViewer: React.FC<CodeDiffViewerProps> = ({
  originalCode,
  migratedCode,
  originalLanguage,
  targetLanguage,
  onAccept,
  onEdit,
  onReject,
  chunkName,
  chunkType
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedCode, setEditedCode] = useState(migratedCode);
  const [showDiff, setShowDiff] = useState(true);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    onEdit(editedCode);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedCode(migratedCode);
    setIsEditing(false);
  };

  const getLanguageForHighlighter = (lang: string) => {
    const langMap: { [key: string]: string } = {
      'javascript': 'javascript',
      'nodejs': 'javascript',
      'typescript': 'typescript',
      'php': 'php',
      'python': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'csharp': 'csharp',
      'ruby': 'ruby',
      'go': 'go',
      'rust': 'rust',
      'swift': 'swift',
      'kotlin': 'kotlin'
    };
    return langMap[lang.toLowerCase()] || 'text';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {chunkName || 'Code Migration Review'}
            </h3>
            <p className="text-sm text-gray-600">
              {chunkType && `${chunkType} • `}
              {originalLanguage} → {targetLanguage}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowDiff(!showDiff)}
              className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
            >
              {showDiff ? 'Hide Diff' : 'Show Diff'}
            </button>
          </div>
        </div>
      </div>

      {/* Code Comparison */}
      <div className="flex">
        {/* Original Code */}
        <div className="flex-1 border-r border-gray-200">
          <div className="bg-red-50 px-4 py-2 border-b border-red-200">
            <h4 className="text-sm font-medium text-red-800">Original ({originalLanguage})</h4>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <SyntaxHighlighter
              language={getLanguageForHighlighter(originalLanguage)}
              style={tomorrow}
              showLineNumbers
              wrapLines
            >
              {originalCode}
            </SyntaxHighlighter>
          </div>
        </div>

        {/* Migrated Code */}
        <div className="flex-1">
          <div className="bg-green-50 px-4 py-2 border-b border-green-200">
            <h4 className="text-sm font-medium text-green-800">
              Migrated ({targetLanguage})
              {isEditing && ' - Editing'}
            </h4>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {isEditing ? (
              <textarea
                value={editedCode}
                onChange={(e) => setEditedCode(e.target.value)}
                className="w-full h-96 p-4 font-mono text-sm border-0 resize-none focus:outline-none"
                placeholder="Edit the migrated code..."
              />
            ) : (
              <SyntaxHighlighter
                language={getLanguageForHighlighter(targetLanguage)}
                style={vscDarkPlus}
                showLineNumbers
                wrapLines
              >
                {migratedCode}
              </SyntaxHighlighter>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={onAccept}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Accept</span>
            </button>
            
            <button
              onClick={handleEdit}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Edit</span>
            </button>
            
            <button
              onClick={onReject}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Reject</span>
            </button>
          </div>

          {isEditing && (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
              >
                Save
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodeDiffViewer;
