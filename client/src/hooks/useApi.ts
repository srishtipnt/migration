import { useState, useEffect, useCallback } from 'react';
import apiService from '../services/api';

// Custom hook for API calls with loading and error states
export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (apiCall) => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiCall();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { execute, loading, error };
};

// Hook for session management
export const useSession = (sessionId) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSession = useCallback(async () => {
    if (!sessionId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiService.getSession(sessionId);
      setSession(response.data.session);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const updateSession = useCallback(async (updates) => {
    if (!sessionId) return;

    try {
      const response = await apiService.updateSession(sessionId, updates);
      setSession(response.data.session);
      return response.data.session;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [sessionId]);

  const updateProgress = useCallback(async (progress) => {
    if (!sessionId) return;

    try {
      const response = await apiService.updateSessionProgress(sessionId, progress);
      setSession(response.data.session);
      return response.data.session;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  return {
    session,
    loading,
    error,
    refetch: fetchSession,
    updateSession,
    updateProgress
  };
};

// Hook for file operations
export const useFiles = (sessionId) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchFiles = useCallback(async () => {
    if (!sessionId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiService.getSessionFiles(sessionId);
      setFiles(response.data.files);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const uploadFiles = useCallback(async (fileList) => {
    if (!sessionId || !fileList.length) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiService.uploadFiles(sessionId, fileList);
      await fetchFiles(); // Refresh file list
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [sessionId, fetchFiles]);

  const deleteFile = useCallback(async (fileId) => {
    try {
      await apiService.deleteFile(fileId);
      await fetchFiles(); // Refresh file list
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchFiles]);

  const downloadFile = useCallback(async (fileId) => {
    try {
      const blob = await apiService.downloadFile(fileId);
      return blob;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const createArchive = useCallback(async () => {
    if (!sessionId) return;

    try {
      const blob = await apiService.createZipArchive(sessionId);
      return blob;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [sessionId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  return {
    files,
    loading,
    error,
    refetch: fetchFiles,
    uploadFiles,
    deleteFile,
    downloadFile,
    createArchive
  };
};

// Hook for migration operations
export const useMigration = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [migrationResult, setMigrationResult] = useState<any>(null);

  const processMigration = useCallback(async (sessionId, userId, command, targetTechnology, options = {}) => {
    setIsLoading(true);
    setError(null);
    setMigrationResult(null);

    try {
      const result = await apiService.processMigration(sessionId, userId, command, targetTechnology, options);
      setMigrationResult(result);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getTemplates = useCallback(async () => {
    try {
      return await apiService.getMigrationTemplates();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const validateCommand = useCallback(async (command, targetTechnology) => {
    try {
      return await apiService.validateMigrationCommand(command, targetTechnology);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const getMigrationStatus = useCallback(async (migrationId) => {
    try {
      return await apiService.getMigrationStatus(migrationId);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const getMigrationHistory = useCallback(async (sessionId, userId) => {
    try {
      return await apiService.getMigrationHistory(sessionId, userId);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  return {
    isLoading,
    error,
    migrationResult,
    processMigration,
    getTemplates,
    validateCommand,
    getMigrationStatus,
    getMigrationHistory,
  };
};

// Hook for user sessions
export const useUserSessions = (params = {}) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.getUserSessions(params);
      setSessions(response.data.sessions);
      setPagination(response.data.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [params]);

  const createSession = useCallback(async (sessionData) => {
    try {
      const response = await apiService.createSession(sessionData);
      await fetchSessions(); // Refresh sessions list
      return response.data.session;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchSessions]);

  const deleteSession = useCallback(async (sessionId) => {
    try {
      await apiService.deleteSession(sessionId);
      await fetchSessions(); // Refresh sessions list
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchSessions]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return {
    sessions,
    pagination,
    loading,
    error,
    refetch: fetchSessions,
    createSession,
    deleteSession
  };
};

