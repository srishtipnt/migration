import React, { useState, useEffect } from 'react';
import CodeDiffViewer from './CodeDiffViewer';

interface CodeChunk {
  id: string;
  chunkName: string;
  chunkType: string;
  originalCode: string;
  migratedCode: string;
  originalLanguage: string;
  targetLanguage: string;
  warnings?: string[];
  recommendations?: string[];
}

interface ChunkReviewInterfaceProps {
  chunks: CodeChunk[];
  onComplete: (reviewedChunks: CodeChunk[]) => void;
  onCancel: () => void;
}

interface ReviewState {
  [chunkId: string]: {
    status: 'pending' | 'accepted' | 'rejected' | 'edited';
    finalCode?: string;
  };
}

const ChunkReviewInterface: React.FC<ChunkReviewInterfaceProps> = ({
  chunks,
  onComplete,
  onCancel
}) => {
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [reviewState, setReviewState] = useState<ReviewState>({});
  const [isComplete, setIsComplete] = useState(false);

  const currentChunk = chunks[currentChunkIndex];
  const totalChunks = chunks.length;
  const reviewedCount = Object.keys(reviewState).length;
  const acceptedCount = Object.values(reviewState).filter(state => 
    state.status === 'accepted' || state.status === 'edited'
  ).length;

  useEffect(() => {
    // Initialize review state for all chunks
    const initialState: ReviewState = {};
    chunks.forEach(chunk => {
      initialState[chunk.id] = { status: 'pending' };
    });
    setReviewState(initialState);
  }, [chunks]);

  const handleAccept = () => {
    setReviewState(prev => ({
      ...prev,
      [currentChunk.id]: { status: 'accepted' }
    }));
    moveToNext();
  };

  const handleEdit = (editedCode: string) => {
    setReviewState(prev => ({
      ...prev,
      [currentChunk.id]: { 
        status: 'edited',
        finalCode: editedCode
      }
    }));
    moveToNext();
  };

  const handleReject = () => {
    setReviewState(prev => ({
      ...prev,
      [currentChunk.id]: { status: 'rejected' }
    }));
    moveToNext();
  };

  const moveToNext = () => {
    if (currentChunkIndex < totalChunks - 1) {
      setCurrentChunkIndex(prev => prev + 1);
    } else {
      setIsComplete(true);
    }
  };

  const moveToPrevious = () => {
    if (currentChunkIndex > 0) {
      setCurrentChunkIndex(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    const reviewedChunks = chunks.map(chunk => {
      const state = reviewState[chunk.id];
      return {
        ...chunk,
        migratedCode: state.finalCode || chunk.migratedCode,
        reviewStatus: state.status
      };
    });
    onComplete(reviewedChunks);
  };

  const getStatusIcon = (chunkId: string) => {
    const state = reviewState[chunkId];
    if (!state) return '⏳';
    
    switch (state.status) {
      case 'accepted': return '✅';
      case 'edited': return '✏️';
      case 'rejected': return '❌';
      default: return '⏳';
    }
  };

  const getStatusColor = (chunkId: string) => {
    const state = reviewState[chunkId];
    if (!state) return 'text-gray-400';
    
    switch (state.status) {
      case 'accepted': return 'text-green-600';
      case 'edited': return 'text-blue-600';
      case 'rejected': return 'text-red-600';
      default: return 'text-gray-400';
    }
  };

  if (isComplete) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Complete!</h2>
            <p className="text-gray-600 mb-6">
              You've reviewed all {totalChunks} code chunks. {acceptedCount} were accepted or edited.
            </p>
            
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">{totalChunks}</div>
                <div className="text-sm text-gray-600">Total Chunks</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">{acceptedCount}</div>
                <div className="text-sm text-gray-600">Accepted/Edited</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-600">{totalChunks - acceptedCount}</div>
                <div className="text-sm text-gray-600">Rejected</div>
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={onCancel}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleComplete}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                Complete Migration
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Progress Header */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Code Migration Review</h2>
              <p className="text-sm text-gray-600">
                Reviewing chunk {currentChunkIndex + 1} of {totalChunks}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                {reviewedCount}/{totalChunks} reviewed
              </div>
              <div className="w-48 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(reviewedCount / totalChunks) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Chunk Navigation */}
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={moveToPrevious}
              disabled={currentChunkIndex === 0}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              ← Previous
            </button>
            
            <div className="flex space-x-2">
              {chunks.map((chunk, index) => (
                <button
                  key={chunk.id}
                  onClick={() => setCurrentChunkIndex(index)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    index === currentChunkIndex
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  <span className={getStatusColor(chunk.id)}>
                    {getStatusIcon(chunk.id)}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentChunkIndex(prev => Math.min(prev + 1, totalChunks - 1))}
              disabled={currentChunkIndex === totalChunks - 1}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* Current Chunk Review */}
      {currentChunk && (
        <CodeDiffViewer
          originalCode={currentChunk.originalCode}
          migratedCode={currentChunk.migratedCode}
          originalLanguage={currentChunk.originalLanguage}
          targetLanguage={currentChunk.targetLanguage}
          chunkName={currentChunk.chunkName}
          chunkType={currentChunk.chunkType}
          onAccept={handleAccept}
          onEdit={handleEdit}
          onReject={handleReject}
        />
      )}

      {/* Warnings and Recommendations */}
      {(currentChunk?.warnings?.length || currentChunk?.recommendations?.length) && (
        <div className="mt-6 space-y-4">
          {currentChunk.warnings?.length && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-yellow-800 mb-2">⚠️ Warnings</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                {currentChunk.warnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}
          
          {currentChunk.recommendations?.length && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Recommendations</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                {currentChunk.recommendations.map((recommendation, index) => (
                  <li key={index}>• {recommendation}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChunkReviewInterface;




