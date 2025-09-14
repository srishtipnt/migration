import axios from 'axios';

// API service for connecting frontend to backend
const API_BASE_URL = 'http://localhost:3000/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('authToken');
    
    // Create axios instance
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000, // 30 seconds timeout
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.client.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          this.setToken(null);
          // Redirect to login or show auth error
        }
        return Promise.reject(error);
      }
    );
  }

  // Set authentication token
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }

  // Generic request method using axios
  async request(endpoint, options = {}) {
    try {
      const response = await this.client.request({
        url: endpoint,
        ...options,
      });
      return response.data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Session API methods
  async createSession(sessionData) {
    return this.request('/sessions', {
      method: 'POST',
      data: sessionData,
    });
  }

  async getSession(sessionId) {
    return this.request(`/sessions/${sessionId}`);
  }

  async getUserSessions(params = {}) {
    return this.request('/sessions', {
      params,
    });
  }

  async updateSession(sessionId, updates) {
    return this.request(`/sessions/${sessionId}`, {
      method: 'PUT',
      data: updates,
    });
  }

  async deleteSession(sessionId) {
    return this.request(`/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  }

  async updateSessionProgress(sessionId, progress) {
    return this.request(`/sessions/${sessionId}/progress`, {
      method: 'PATCH',
      data: progress,
    });
  }

  // File API methods
  async uploadFiles(sessionId, files) {
    const formData = new FormData();
    formData.append('sessionId', sessionId);
    
    files.forEach((file) => {
      formData.append('files', file);
    });

    try {
      const response = await this.client.post(`/files/upload/${sessionId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    }
  }

  async getSessionFiles(sessionId) {
    return this.request(`/files/session/${sessionId}`);
  }

  async getFile(fileId) {
    return this.request(`/files/${fileId}`);
  }

  async downloadFile(fileId) {
    try {
      const response = await this.client.get(`/files/${fileId}/download`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    }
  }

  async deleteFile(fileId) {
    return this.request(`/files/${fileId}`, {
      method: 'DELETE',
    });
  }

  async createZipArchive(sessionId) {
    try {
      const response = await this.client.get(`/files/session/${sessionId}/archive`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      console.error('Archive creation failed:', error);
      throw error;
    }
  }

  // Migration API methods
  async processMigration(sessionId, userId, command, targetTechnology, options = {}) {
    return this.request('/migrate/migrate', {
      method: 'POST',
      data: {
        sessionId,
        userId,
        command,
        targetTechnology,
        options: {
          preserveData: true,
          generateTypes: true,
          addValidation: true,
          ...options,
        },
      },
    });
  }

  async getMigrationTemplates() {
    return this.request('/migrate/templates');
  }

  async validateMigrationCommand(command, targetTechnology) {
    return this.request('/migrate/validate', {
      method: 'POST',
      data: { command, targetTechnology },
    });
  }

  async getMigrationStatus(migrationId) {
    return this.request(`/migrate/status/${migrationId}`);
  }

  async getMigrationHistory(sessionId, userId) {
    return this.request(`/migrate/history/${sessionId}`, {
      params: { userId },
    });
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }
}

// Create singleton instance
const apiService = new ApiService();

export default apiService;

