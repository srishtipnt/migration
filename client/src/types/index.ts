// Type definitions for the Migration as a Service application

export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: number;
  children?: FileNode[];
  selected: boolean;
  icon: string;
  path: string;
  lastModified?: Date;
}

export interface MigrationOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  settings?: { [key: string]: any };
  category: 'language' | 'database' | 'api' | 'framework';
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  file?: string;
  details?: string;
}

export interface Session {
  id: string;
  name: string;
  description?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  createdAt: Date;
  updatedAt: Date;
  files: FileNode[];
  migrationOptions: string[];
  logs: LogEntry[];
  userId?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: Date;
  lastLogin?: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

export type Step = 'upload' | 'configure' | 'progress' | 'export';

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon?: React.ReactNode;
  badge?: string | number;
  children?: NavItem[];
}

export interface Theme {
  mode: 'light' | 'dark';
  primary: string;
  secondary: string;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}
