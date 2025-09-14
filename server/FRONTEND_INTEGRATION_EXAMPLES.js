/**
 * Frontend Integration Example for Migration API
 * This demonstrates how to integrate the Migration API with your frontend using Axios
 */

import axios from 'axios';

// Example 1: React Hook for Migration API using Axios
import { useState, useCallback } from 'react';

export function useMigrationAPI() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [migrationResult, setMigrationResult] = useState(null);

  // Create axios instance for migration API
  const migrationAPI = axios.create({
    baseURL: '/api/migrate',
    timeout: 60000, // 60 seconds for migration requests
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const processMigration = useCallback(async (sessionId, userId, command, targetTechnology, options = {}) => {
    setIsLoading(true);
    setError(null);
    setMigrationResult(null);

    try {
      const response = await migrationAPI.post('/migrate', {
        sessionId,
        userId,
        command,
        targetTechnology,
        options: {
          preserveData: true,
          generateTypes: true,
          addValidation: true,
          ...options
        }
      });

      const data = response.data;

      if (data.success) {
        setMigrationResult(data);
        return data;
      } else {
        setError(data.message || data.error);
        throw new Error(data.message || data.error);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message;
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getTemplates = useCallback(async () => {
    try {
      const response = await migrationAPI.get('/templates');
      const data = response.data;
      
      if (data.success) {
        return data.templates;
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message;
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const validateCommand = useCallback(async (command, targetTechnology) => {
    try {
      const response = await migrationAPI.post('/validate', {
        command,
        targetTechnology
      });

      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message;
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  return {
    isLoading,
    error,
    migrationResult,
    processMigration,
    getTemplates,
    validateCommand
  };
}

// Example 2: Vue.js Composable using Axios
import { ref, reactive } from 'vue';
import axios from 'axios';

export function useMigrationAPI() {
  const isLoading = ref(false);
  const error = ref(null);
  const migrationResult = reactive({});

  // Create axios instance for migration API
  const migrationAPI = axios.create({
    baseURL: '/api/migrate',
    timeout: 60000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const processMigration = async (sessionId, userId, command, targetTechnology, options = {}) => {
    isLoading.value = true;
    error.value = null;
    Object.keys(migrationResult).forEach(key => delete migrationResult[key]);

    try {
      const response = await migrationAPI.post('/migrate', {
        sessionId,
        userId,
        command,
        targetTechnology,
        options: {
          preserveData: true,
          generateTypes: true,
          addValidation: true,
          ...options
        }
      });

      const data = response.data;

      if (data.success) {
        Object.assign(migrationResult, data);
        return data;
      } else {
        error.value = data.message || data.error;
        throw new Error(data.message || data.error);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message;
      error.value = errorMessage;
      throw new Error(errorMessage);
    } finally {
      isLoading.value = false;
    }
  };

  return {
    isLoading,
    error,
    migrationResult,
    processMigration
  };
}

// Example 3: Plain JavaScript Class using Axios
class MigrationAPIClient {
  constructor(baseURL = '/api/migrate') {
    this.baseURL = baseURL;
    
    // Create axios instance
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for auth if needed
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('authToken');
        }
        return Promise.reject(error);
      }
    );
  }

  async processMigration(sessionId, userId, command, targetTechnology, options = {}) {
    try {
      const response = await this.client.post('/migrate', {
        sessionId,
        userId,
        command,
        targetTechnology,
        options: {
          preserveData: true,
          generateTypes: true,
          addValidation: true,
          ...options
        }
      });

      const data = response.data;

      if (data.success) {
        return data;
      } else {
        throw new Error(data.message || data.error);
      }
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  async getTemplates() {
    try {
      const response = await this.client.get('/templates');
      const data = response.data;
      
      if (data.success) {
        return data.templates;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Failed to get templates:', error);
      throw error;
    }
  }

  async validateCommand(command, targetTechnology) {
    try {
      const response = await this.client.post('/validate', {
        command,
        targetTechnology
      });

      return response.data;
    } catch (error) {
      console.error('Validation failed:', error);
      throw error;
    }
  }

  async getMigrationStatus(migrationId) {
    try {
      const response = await this.client.get(`/status/${migrationId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get status:', error);
      throw error;
    }
  }

  async getMigrationHistory(sessionId, userId) {
    try {
      const response = await this.client.get(`/history/${sessionId}`, {
        params: { userId }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get history:', error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }
}

// Example 4: React Component Usage
import React, { useState, useEffect } from 'react';
import { useMigrationAPI } from './hooks/useMigrationAPI';

function MigrationForm({ sessionId, userId }) {
  const { isLoading, error, migrationResult, processMigration, getTemplates, validateCommand } = useMigrationAPI();
  const [command, setCommand] = useState('');
  const [targetTechnology, setTargetTechnology] = useState('');
  const [templates, setTemplates] = useState([]);
  const [validation, setValidation] = useState(null);

  useEffect(() => {
    // Load templates on component mount
    getTemplates().then(setTemplates).catch(console.error);
  }, [getTemplates]);

  const handleCommandChange = async (newCommand) => {
    setCommand(newCommand);
    if (newCommand && targetTechnology) {
      try {
        const result = await validateCommand(newCommand, targetTechnology);
        setValidation(result);
      } catch (err) {
        setValidation({ valid: false, error: err.message });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!command || !targetTechnology) return;

    try {
      await processMigration(sessionId, userId, command, targetTechnology);
    } catch (err) {
      console.error('Migration failed:', err);
    }
  };

  return (
    <div className="migration-form">
      <h2>AI Code Migration</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="command">Migration Command:</label>
          <input
            id="command"
            type="text"
            value={command}
            onChange={(e) => handleCommandChange(e.target.value)}
            placeholder="e.g., convert database connection to Prisma"
            required
          />
          {validation && (
            <div className={`validation ${validation.valid ? 'valid' : 'invalid'}`}>
              {validation.valid ? '✅ Valid command' : `❌ ${validation.error}`}
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="target">Target Technology:</label>
          <select
            id="target"
            value={targetTechnology}
            onChange={(e) => setTargetTechnology(e.target.value)}
            required
          >
            <option value="">Select target technology</option>
            <option value="Prisma">Prisma</option>
            <option value="TypeScript">TypeScript</option>
            <option value="Next.js">Next.js</option>
            <option value="GraphQL">GraphQL</option>
            <option value="Tailwind CSS">Tailwind CSS</option>
          </select>
        </div>

        <button type="submit" disabled={isLoading || !validation?.valid}>
          {isLoading ? 'Processing...' : 'Start Migration'}
        </button>
      </form>

      {error && (
        <div className="error">
          <h3>Error:</h3>
          <p>{error}</p>
        </div>
      )}

      {migrationResult && (
        <div className="migration-result">
          <h3>Migration Completed!</h3>
          <p>Migration ID: {migrationResult.migrationId}</p>
          <p>Success Rate: {migrationResult.validation.successRate.toFixed(1)}%</p>
          <p>Files Modified: {migrationResult.statistics.filesModified}</p>
          
          <div className="migration-plan">
            <h4>Migration Plan:</h4>
            <p><strong>Analysis:</strong> {migrationResult.plan.analysis}</p>
            <p><strong>Strategy:</strong> {migrationResult.plan.strategy}</p>
          </div>

          <div className="migration-results">
            <h4>Results:</h4>
            {migrationResult.results.map((result, index) => (
              <div key={index} className={`result ${result.success ? 'success' : 'error'}`}>
                <h5>{result.chunkName} ({result.chunkType})</h5>
                <p>File: {result.filePath}</p>
                {result.success ? (
                  <pre><code>{result.migratedCode}</code></pre>
                ) : (
                  <p className="error">Error: {result.error}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="templates">
        <h3>Quick Templates:</h3>
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => {
              setCommand(template.command);
              setTargetTechnology(template.targetTechnology);
            }}
            className="template-button"
          >
            {template.icon} {template.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export default MigrationForm;

// Example 5: Usage in your app
/*
import MigrationForm from './components/MigrationForm';

function App() {
  const sessionId = 'your-session-id';
  const userId = 'your-user-id';

  return (
    <div className="App">
      <MigrationForm sessionId={sessionId} userId={userId} />
    </div>
  );
}
*/

