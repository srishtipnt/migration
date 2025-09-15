import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' }
    });

    // Auto-add auth token to requests
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle auth errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.logout();
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth methods
  async login(credentials) {
    const response = await this.client.post('/auth/login', credentials);
    this.setToken(response.data.data.token);
    return response.data;
  }

  async register(userData) {
    const response = await this.client.post('/auth/register', userData);
    this.setToken(response.data.data.token);
    return response.data;
  }

  logout() {
    localStorage.removeItem('authToken');
  }

  setToken(token) {
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }

  // File methods
  async uploadFiles(files) {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    
    const response = await this.client.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  async getUserFiles(params = {}) {
    const response = await this.client.get('/files', { params });
    return response.data;
  }

  async downloadFile(fileId) {
    const response = await this.client.get(`/files/${fileId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  }

  async deleteFile(fileId) {
    const response = await this.client.delete(`/files/${fileId}`);
    return response.data;
  }

  async createZipArchive(fileIds = []) {
    const params = fileIds.length > 0 ? { fileIds: fileIds.join(',') } : {};
    const response = await this.client.get('/files/archive/zip', {
      params,
      responseType: 'blob'
    });
    return response.data;
  }
}

export default new ApiService();