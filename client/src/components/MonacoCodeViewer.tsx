import React, { useRef } from 'react';
import Editor from '@monaco-editor/react';
import { FileText, Download, Copy, Check } from 'lucide-react';

interface MonacoCodeViewerProps {
  originalCode: string;
  migratedCode: string;
  originalLanguage?: string;
  migratedLanguage?: string;
  originalFileName?: string;
  migratedFileName?: string;
  onDownload?: (code: string, filename: string) => void;
  onCopy?: (code: string) => void;
}

const MonacoCodeViewer: React.FC<MonacoCodeViewerProps> = ({
  originalCode,
  migratedCode,
  originalLanguage = 'javascript',
  migratedLanguage = 'typescript',
  originalFileName = 'original.js',
  migratedFileName = 'migrated.ts',
  onDownload,
  onCopy
}) => {
  const [copied, setCopied] = React.useState<string | null>(null);
  const originalEditorRef = useRef<any>(null);
  const migratedEditorRef = useRef<any>(null);

  // Auto-detect language from file extension
  const detectLanguage = (filename: string): string => {
    const extension = filename.split('.').pop()?.toLowerCase();
    const languageMap: { [key: string]: string } = {
      'js': 'javascript',
      'ts': 'typescript',
      'jsx': 'javascript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'swift': 'swift',
      'kt': 'kotlin',
      'scala': 'scala',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'less': 'less',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'sql': 'sql',
      'sh': 'shell',
      'bash': 'shell',
      'dockerfile': 'dockerfile'
    };
    return languageMap[extension || ''] || 'plaintext';
  };

  const originalLang = detectLanguage(originalFileName);
  const migratedLang = detectLanguage(migratedFileName);

  const handleEditorDidMount = (editor: unknown, monaco: unknown, isOriginal: boolean) => {
    if (isOriginal) {
      originalEditorRef.current = editor;
    } else {
      migratedEditorRef.current = editor;
    }

    // Configure editor options
    editor.updateOptions({
      readOnly: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      lineNumbers: 'on',
      glyphMargin: false,
      folding: true,
      lineDecorationsWidth: 0,
      lineNumbersMinChars: 3,
      renderLineHighlight: 'gutter',
      selectOnLineNumbers: true,
      roundedSelection: false,
      cursorStyle: 'line',
      automaticLayout: true,
      theme: 'vs-dark'
    });

    // Add custom theme
    monaco.editor.defineTheme('migration-theme', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
        { token: 'keyword', foreground: '569CD6' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'type', foreground: '4EC9B0' },
        { token: 'function', foreground: 'DCDCAA' }
      ],
      colors: {
        'editor.background': '#1e1e1e',
        'editor.foreground': '#d4d4d4',
        'editorLineNumber.foreground': '#858585',
        'editor.selectionBackground': '#264f78',
        'editor.inactiveSelectionBackground': '#3a3d41'
      }
    });

    monaco.editor.setTheme('migration-theme');
  };

  const handleCopy = async (code: string, type: 'original' | 'migrated') => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
      onCopy?.(code);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleDownload = (code: string, filename: string) => {
    onDownload?.(code, filename);
  };

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden shadow-xl">
      {/* Header */}
      <div className="bg-gray-800 px-4 py-3 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-gray-300">Code Comparison</span>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-400">
            <span>VS Code Editor</span>
          </div>
        </div>
      </div>

      {/* Side by Side Editors */}
      <div className="flex h-96">
        {/* Original Code */}
        <div className="flex-1 border-r border-gray-700">
          <div className="bg-gray-800 px-3 py-2 border-b border-gray-700 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-300">{originalFileName}</span>
              <span className="text-xs text-gray-500">({originalLang})</span>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handleCopy(originalCode, 'original')}
                className="p-1 text-gray-400 hover:text-white transition-colors"
                title="Copy code"
              >
                {copied === 'original' ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => handleDownload(originalCode, originalFileName)}
                className="p-1 text-gray-400 hover:text-white transition-colors"
                title="Download file"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="h-80">
            <Editor
              height="100%"
              language={originalLang}
              value={originalCode}
              onMount={(editor, monaco) => handleEditorDidMount(editor, monaco, true)}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                lineNumbers: 'on',
                glyphMargin: false,
                folding: true,
                lineDecorationsWidth: 0,
                lineNumbersMinChars: 3,
                renderLineHighlight: 'gutter',
                selectOnLineNumbers: true,
                roundedSelection: false,
                cursorStyle: 'line',
                automaticLayout: true,
                theme: 'migration-theme'
              }}
            />
          </div>
        </div>

        {/* Migrated Code */}
        <div className="flex-1">
          <div className="bg-gray-800 px-3 py-2 border-b border-gray-700 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-300">{migratedFileName}</span>
              <span className="text-xs text-gray-500">({migratedLang})</span>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handleCopy(migratedCode, 'migrated')}
                className="p-1 text-gray-400 hover:text-white transition-colors"
                title="Copy code"
              >
                {copied === 'migrated' ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => handleDownload(migratedCode, migratedFileName)}
                className="p-1 text-gray-400 hover:text-white transition-colors"
                title="Download file"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="h-80">
            <Editor
              height="100%"
              language={migratedLang}
              value={migratedCode}
              onMount={(editor, monaco) => handleEditorDidMount(editor, monaco, false)}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                lineNumbers: 'on',
                glyphMargin: false,
                folding: true,
                lineDecorationsWidth: 0,
                lineNumbersMinChars: 3,
                renderLineHighlight: 'gutter',
                selectOnLineNumbers: true,
                roundedSelection: false,
                cursorStyle: 'line',
                automaticLayout: true,
                theme: 'migration-theme'
              }}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-800 px-4 py-2 border-t border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center space-x-4">
            <span>Original: {originalCode.split('\n').length} lines</span>
            <span>Migrated: {migratedCode.split('\n').length} lines</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>Monaco Editor</span>
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonacoCodeViewer;
