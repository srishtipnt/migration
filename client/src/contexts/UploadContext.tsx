import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface UploadState {
  isUploading: boolean;
  uploadType: 'single' | 'zip' | 'multiple' | null;
  progress: number;
  currentFile?: string;
  totalFiles?: number;
  completedFiles?: number;
}

interface UploadContextType {
  uploadState: UploadState;
  startUpload: (type: 'single' | 'zip' | 'multiple', currentFile?: string, totalFiles?: number) => void;
  updateProgress: (progress: number, currentFile?: string) => void;
  completeUpload: () => void;
  cancelUpload: () => void;
  setUploading: (isUploading: boolean) => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

interface UploadProviderProps {
  children: ReactNode;
}

export const UploadProvider: React.FC<UploadProviderProps> = ({ children }) => {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    uploadType: null,
    progress: 0,
    currentFile: undefined,
    totalFiles: undefined,
    completedFiles: undefined,
  });

  const startUpload = useCallback((type: 'single' | 'zip' | 'multiple', currentFile?: string, totalFiles?: number) => {
    setUploadState({
      isUploading: true,
      uploadType: type,
      progress: 0,
      currentFile,
      totalFiles,
      completedFiles: 0,
    });
  }, []);

  const updateProgress = useCallback((progress: number, currentFile?: string) => {
    setUploadState(prev => ({
      ...prev,
      progress,
      currentFile,
      completedFiles: prev.totalFiles ? Math.floor((progress / 100) * prev.totalFiles) : undefined,
    }));
  }, []);

  const completeUpload = useCallback(() => {
    setUploadState({
      isUploading: false,
      uploadType: null,
      progress: 0,
      currentFile: undefined,
      totalFiles: undefined,
      completedFiles: undefined,
    });
  }, []);

  const cancelUpload = useCallback(() => {
    setUploadState({
      isUploading: false,
      uploadType: null,
      progress: 0,
      currentFile: undefined,
      totalFiles: undefined,
      completedFiles: undefined,
    });
  }, []);

  const setUploading = useCallback((isUploading: boolean) => {
    setUploadState(prev => ({
      ...prev,
      isUploading,
    }));
  }, []);

  const value: UploadContextType = {
    uploadState,
    startUpload,
    updateProgress,
    completeUpload,
    cancelUpload,
    setUploading,
  };

  return (
    <UploadContext.Provider value={value}>
      {children}
    </UploadContext.Provider>
  );
};

export const useUpload = (): UploadContextType => {
  const context = useContext(UploadContext);
  if (context === undefined) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
};

export default UploadContext;
