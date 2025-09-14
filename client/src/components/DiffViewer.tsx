import React, { useState, useEffect } from 'react';
import { Copy, Download, Eye, EyeOff } from 'lucide-react';

interface DiffViewerProps {
  originalCode: string;
  migratedCode: string;
  fileName?: string;
  showLineNumbers?: boolean;
  theme?: 'light' | 'dark';
}

const DiffViewer: React.FC<DiffViewerProps> = ({
  originalCode,
  migratedCode,
  fileName = 'file',
  showLineNumbers = true,
  theme = 'light'
}) => {
  const [showOriginal, setShowOriginal] = useState(true);
  const [showMigrated, setShowMigrated] = useState(true);
  const [copied, setCopied] = useState<'original' | 'migrated' | null>(null);

  const copyToClipboard = async (text: string, type: 'original' | 'migrated') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const downloadCode = (code: string, type: 'original' | 'migrated') => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}-${type}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderCodeBlock = (code: string, type: 'original' | 'migrated', title: string) => {
    const lines = code.split('\n');
    const isVisible = type === 'original' ? showOriginal : showMigrated;
    const bgColor = type === 'original' ? 'bg-gray-50' : 'bg-green-50';
    const borderColor = type === 'original' ? 'border-gray-200' : 'border-green-200';
    const textColor = type === 'original' ? 'text-gray-700' : 'text-green-700';

    return (
      <div className={`border rounded-lg ${borderColor} ${bgColor}`}>
        <div className={`px-4 py-2 border-b ${borderColor} flex items-center justify-between`}>
          <h4 className={`text-sm font-medium ${textColor}`}>{title}</h4>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => copyToClipboard(code, type)}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title="Copy to clipboard"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={() => downloadCode(code, type)}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => type === 'original' ? setShowOriginal(!showOriginal) : setShowMigrated(!showMigrated)}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title={isVisible ? "Hide" : "Show"}
            >
              {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        {isVisible && (
          <div className="p-4 max-h-96 overflow-auto">
            <pre className="text-sm text-gray-800 whitespace-pre-wrap">
              <code>
                {showLineNumbers ? (
                  lines.map((line, index) => (
                    <div key={index} className="flex">
                      <span className="text-gray-400 mr-4 w-8 text-right select-none">
                        {index + 1}
                      </span>
                      <span className="flex-1">{line}</span>
                    </div>
                  ))
                ) : (
                  code
                )}
              </code>
            </pre>
          </div>
        )}
        {copied === type && (
          <div className="px-4 py-2 bg-green-100 text-green-800 text-sm">
            Copied to clipboard!
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between p-4 bg-gray-100 rounded-lg">
        <div className="flex items-center space-x-4">
          <h3 className="font-medium text-gray-900">Code Comparison</h3>
          <span className="text-sm text-gray-600">{fileName}</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowOriginal(!showOriginal)}
            className={`px-3 py-1 rounded text-sm ${
              showOriginal ? 'bg-gray-200 text-gray-800' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {showOriginal ? 'Hide' : 'Show'} Original
          </button>
          <button
            onClick={() => setShowMigrated(!showMigrated)}
            className={`px-3 py-1 rounded text-sm ${
              showMigrated ? 'bg-green-200 text-green-800' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {showMigrated ? 'Hide' : 'Show'} Migrated
          </button>
        </div>
      </div>

      {/* Code Blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {renderCodeBlock(originalCode, 'original', 'Original Code')}
        {renderCodeBlock(migratedCode, 'migrated', 'Migrated Code')}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {originalCode.split('\n').length}
          </div>
          <div className="text-sm text-gray-600">Original Lines</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {migratedCode.split('\n').length}
          </div>
          <div className="text-sm text-gray-600">Migrated Lines</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {Math.abs(originalCode.split('\n').length - migratedCode.split('\n').length)}
          </div>
          <div className="text-sm text-gray-600">Line Difference</div>
        </div>
      </div>
    </div>
  );
};

export default DiffViewer;



