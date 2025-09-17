import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' }
    });

    // Auto-add auth token to requests
    this.client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      const token = localStorage.getItem('authToken');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle auth errors
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: any) => {
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
    
    const response = await this.client.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
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
  async uploadZipToCloudinary(zipFile: File) {
    const formData = new FormData();
    formData.append('zipFile', zipFile);
    
    const response = await this.client.post('/zip-cloudinary/upload-zip', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
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
}

export default new ApiService();