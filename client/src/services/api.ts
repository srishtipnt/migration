import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 120000, // Increased to 2 minutes for migration operations
      headers: { 'Content-Type': 'application/json' }
    });

    // Auto-add auth token to requests
    this.client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      const token = localStorage.getItem('authToken');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Don't set Content-Type for FormData - let browser set it automatically
      if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
      }
      
      // For development, if no token is present, don't send Authorization header
      // This allows the server's localhost bypass to work
      if (!token && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        delete config.headers.Authorization;
      }
      
      return config;
    });

    // Handle auth errors
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: any) => {
        console.error('API Error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
          method: error.config?.method
        });
        
        if (error.response?.status === 401) {
          this.logout();
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth methods
  async login(credentials: any) {
    const response = await this.client.post('/auth/login', credentials);
    this.setToken(response.data.data.token);
    return response.data;
  }

  async register(userData: any) {
    const response = await this.client.post('/auth/register', userData);
    this.setToken(response.data.data.token);
    return response.data;
  }

  logout() {
    localStorage.removeItem('authToken');
  }

  setToken(token: string | null) {
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }

  // File methods
  async uploadFiles(files: File[]) {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    
    const response = await this.client.post('/files/upload', formData);
    return response.data;
  }

  async getUserFiles(params: any = {}) {
    const response = await this.client.get('/files', { params });
    return response.data;
  }

  async downloadFile(fileId: string) {
    const response = await this.client.get(`/files/${fileId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  }

  async deleteFile(fileId: string) {
    const response = await this.client.delete(`/files/${fileId}`);
    return response.data;
  }

  async createZipArchive(fileIds: string[] = []) {
    const params = fileIds.length > 0 ? { fileIds: fileIds.join(',') } : {};
    const response = await this.client.get('/files/archive/zip', {
      params,
      responseType: 'blob'
    });
    return response.data;
  }

  // ZIP Cloudinary methods
  async uploadZipToCloudinary(zipFile: File, abortController?: AbortController) {
    const formData = new FormData();
    formData.append('zipFile', zipFile);
    
    const config = abortController ? { signal: abortController.signal } : {};
    const response = await this.client.post('/zip-cloudinary/upload-zip', formData, config);
    return response.data;
  }

  async getUserCloudinaryFiles(params: any = {}) {
    const response = await this.client.get('/zip-cloudinary/files', { params });
    return response.data;
  }

  async getZipSessionFiles(sessionId: string) {
    const response = await this.client.get(`/zip-cloudinary/session/${sessionId}`);
    return response.data;
  }

  async deleteZipSession(sessionId: string) {
    const response = await this.client.delete(`/zip-cloudinary/session/${sessionId}`);
    return response.data;
  }

  // Single File Cloudinary methods
  async uploadSingleFileToCloudinary(file: File, abortController?: AbortController) {
    const formData = new FormData();
    formData.append('file', file);
    
    const config = abortController ? { signal: abortController.signal } : {};
    const response = await this.client.post('/single-file-cloudinary/upload', formData, config);
    return response.data;
  }

  async getUserSingleFiles(params: any = {}) {
    const response = await this.client.get('/single-file-cloudinary', { params });
    return response.data;
  }

  async getSingleFile(fileId: string) {
    const response = await this.client.get(`/single-file-cloudinary/${fileId}`);
    return response.data;
  }

  async downloadSingleFile(fileId: string) {
    const response = await this.client.get(`/single-file-cloudinary/${fileId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  }

  async deleteSingleFile(fileId: string) {
    const response = await this.client.delete(`/single-file-cloudinary/${fileId}`);
    return response.data;
  }

  // Cleanup methods for orphaned files
  async cleanupOrphanedSession(sessionId: string) {
    const response = await this.client.delete(`/zip-cloudinary/cleanup/session/${sessionId}`);
    return response.data;
  }

  async cleanupAllOrphanedFiles(olderThanHours: number = 1) {
    const response = await this.client.delete(`/zip-cloudinary/cleanup/orphaned?olderThanHours=${olderThanHours}`);
    return response.data;
  }

  async cleanupOrphanedSingleFiles(olderThanMinutes: number = 30) {
    const response = await this.client.delete(`/single-file-cloudinary/cleanup/orphaned?olderThanMinutes=${olderThanMinutes}`);
    return response.data;
  }

  // Migration Job methods
  async getMigrationJobs(params: any = {}) {
    const response = await this.client.get('/migration-jobs/jobs', { params });
    return response.data;
  }

  async getJobStatus(sessionId: string) {
    const response = await this.client.get(`/migration-jobs/status/${sessionId}`);
    return response.data;
  }

  async getMigrationJob(jobId: string) {
    const response = await this.client.get(`/migration-jobs/job/${jobId}`);
    return response.data;
  }

  async getJobChunks(sessionId: string, params: any = {}) {
    const response = await this.client.get(`/migration-jobs/chunks/${sessionId}`, { params });
    return response.data;
  }

  async searchCodeChunks(query: string, sessionId?: string) {
    const response = await this.client.post('/migration-jobs/search', {
      query,
      sessionId,
      limit: 20
    });
    return response.data;
  }

  async deleteMigrationJob(sessionId: string) {
    const response = await this.client.delete(`/migration-jobs/${sessionId}`);
    return response.data;
  }

  // Migration Agent methods
  async processMigration(sessionId: string, command: string) {
    const response = await this.client.post(`/migrate/${sessionId}`, {
      command
    });
    return response.data;
  }

  async processMigrationWithLanguages(sessionId: string, fromLang: string, toLang: string) {
    console.log('🚀 API Call: processMigrationWithLanguages');
    console.log('  - sessionId:', sessionId);
    console.log('  - fromLang:', fromLang);
    console.log('  - toLang:', toLang);
    console.log('  - endpoint:', `/migrate/${sessionId}`);
    
    try {
      const response = await this.client.post(`/migrate/${sessionId}?t=${Date.now()}`, {
        fromLang,
        toLang
      }, {
        timeout: 180000 // 3 minutes for migration operations
      });
      
      console.log('📥 API Response:', response.data);
      console.log('📥 Response status:', response.status);
      console.log('📥 Response headers:', response.headers);
      console.log('📥 Full response:', response);
      return response.data;
    } catch (error: any) {
      console.error('❌ Migration API Error:', error);
      if (error.code === 'ECONNABORTED') {
        throw new Error('Migration request timed out. The server may be processing a large file. Please try again.');
      }
      throw error;
    }
  }

  async testMigrationAgent() {
    const response = await this.client.get('/migrate/test');
    return response.data;
  }

  async getSessionChunks(sessionId: string) {
    const response = await this.client.get(`/migrate/sessions/${sessionId}/chunks`);
    return response.data;
  }

  async getChunksStatus(sessionId: string) {
    const response = await this.client.get(`/migrate/chunks-status/${sessionId}?t=${Date.now()}`);
    return response.data;
  }

  async getOriginalFiles(sessionId: string) {
    const response = await this.client.get(`/migrate/original-files/${sessionId}`);
    return response.data;
  }

  // Language Detection API methods
  async detectLanguage(filename: string, content: string) {
    try {
      const response = await this.client.post('/language-detection/detect', {
        filename,
        content
      });
      return response.data;
    } catch (error) {
      console.error('Error detecting language:', error);
      throw error;
    }
  }

  async validateLanguage(filename: string, content: string, expectedLanguage: string) {
    try {
      const response = await this.client.post('/language-detection/validate', {
        filename,
        content,
        expectedLanguage
      });
      return response.data;
    } catch (error) {
      console.error('Error validating language:', error);
      throw error;
    }
  }

  async getSupportedLanguages() {
    try {
      const response = await this.client.get('/language-detection/supported-languages');
      return response.data;
    } catch (error) {
      console.error('Error fetching supported languages:', error);
      throw error;
    }
  }

  async batchDetectLanguages(files: Array<{ filename: string; content: string }>) {
    try {
      const response = await this.client.post('/language-detection/batch-detect', {
        files
      });
      return response.data;
    } catch (error) {
      console.error('Error in batch language detection:', error);
      throw error;
    }
  }

  // Migration History API methods
  async getMigrationHistory(userId: string) {
    try {
      const response = await this.client.get(`/migrations/history/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching migration history:', error);
      throw error;
    }
  }

  async getMigrationDetails(sessionId: string) {
    try {
      const response = await this.client.get(`/migrations/details/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching migration details:', error);
      throw error;
    }
  }

  async downloadMigrationResult(sessionId: string, filename: string) {
    try {
      const response = await this.client.get(`/migrations/download/${sessionId}/${filename}`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error downloading migration result:', error);
      throw error;
    }
  }

  async deleteMigration(sessionId: string) {
    try {
      const response = await this.client.delete(`/migrations/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting migration:', error);
      throw error;
    }
  }
}

export default new ApiService();