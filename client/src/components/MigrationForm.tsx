import React, { useState, useEffect } from 'react';
import { useMigration } from '../hooks/useApi';

interface MigrationFormProps {
  sessionId: string;
  userId: string;
}

const MigrationForm: React.FC<MigrationFormProps> = ({ sessionId, userId }) => {
  const { 
    isLoading, 
    error, 
    migrationResult, 
    processMigration, 
    getTemplates, 
    validateCommand 
  } = useMigration();
  
  const [command, setCommand] = useState('');
  const [targetTechnology, setTargetTechnology] = useState('');
  const [templates, setTemplates] = useState([]);
  const [validation, setValidation] = useState(null);

  useEffect(() => {
    // Load templates on component mount
    getTemplates()
      .then(setTemplates)
      .catch(console.error);
  }, [getTemplates]);

  const handleCommandChange = async (newCommand: string) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command || !targetTechnology) return;

    try {
      await processMigration(sessionId, userId, command, targetTechnology);
    } catch (err) {
      console.error('Migration failed:', err);
    }
  };

  return (
    <div className="migration-form max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">AI Code Migration</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="form-group">
          <label htmlFor="command" className="block text-sm font-medium text-gray-700 mb-2">
            Migration Command:
          </label>
          <input
            id="command"
            type="text"
            value={command}
            onChange={(e) => handleCommandChange(e.target.value)}
            placeholder="e.g., convert database connection to Prisma"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          {validation && (
            <div className={`mt-2 p-2 rounded ${
              validation.valid 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {validation.valid ? '✅ Valid command' : `❌ ${validation.error}`}
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="target" className="block text-sm font-medium text-gray-700 mb-2">
            Target Technology:
          </label>
          <select
            id="target"
            value={targetTechnology}
            onChange={(e) => setTargetTechnology(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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

        <button 
          type="submit" 
          disabled={isLoading || !validation?.valid}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Processing...' : 'Start Migration'}
        </button>
      </form>

      {error && (
        <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <h3 className="font-bold">Error:</h3>
          <p>{error}</p>
        </div>
      )}

      {migrationResult && (
        <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-lg font-bold text-green-800 mb-4">Migration Completed!</h3>
          <div className="space-y-2 text-sm">
            <p><strong>Migration ID:</strong> {migrationResult.migrationId}</p>
            <p><strong>Success Rate:</strong> {migrationResult.validation?.successRate?.toFixed(1)}%</p>
            <p><strong>Files Modified:</strong> {migrationResult.statistics?.filesModified}</p>
          </div>
          
          {migrationResult.plan && (
            <div className="mt-4">
              <h4 className="font-semibold text-green-800">Migration Plan:</h4>
              <div className="mt-2 space-y-2 text-sm">
                {migrationResult.plan.analysis && (
                  <p><strong>Analysis:</strong> {migrationResult.plan.analysis}</p>
                )}
                {migrationResult.plan.strategy && (
                  <p><strong>Strategy:</strong> {migrationResult.plan.strategy}</p>
                )}
              </div>
            </div>
          )}

          {migrationResult.results && (
            <div className="mt-4">
              <h4 className="font-semibold text-green-800">Results:</h4>
              <div className="mt-2 space-y-2">
                {migrationResult.results.map((result: any, index: number) => (
                  <div key={index} className={`p-3 rounded ${
                    result.success ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    <h5 className="font-medium">{result.chunkName} ({result.chunkType})</h5>
                    <p className="text-sm text-gray-600">File: {result.filePath}</p>
                    {result.success ? (
                      <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                        <code>{result.migratedCode}</code>
                      </pre>
                    ) : (
                      <p className="text-red-600 text-sm">Error: {result.error}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Quick Templates:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates.map((template: any) => (
            <button
              key={template.id}
              onClick={() => {
                setCommand(template.command);
                setTargetTechnology(template.targetTechnology);
              }}
              className="p-3 text-left border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <span className="text-lg">{template.icon}</span>
              <div className="mt-1">
                <div className="font-medium">{template.name}</div>
                <div className="text-sm text-gray-600">{template.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MigrationForm;
