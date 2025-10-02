import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Clock, Code, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

interface SystematicMigrationProps {
  onMigrationComplete?: (result: any) => void;
}

interface WorkflowStep {
  step: number;
  name: string;
  description: string;
  purpose: string;
}

const SystematicMigration: React.FC<SystematicMigrationProps> = ({ onMigrationComplete }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [migrationResult, setMigrationResult] = useState<any>(null);
  const [includeRefactoring, setIncludeRefactoring] = useState(false);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);

  // Load workflow information on component mount
  React.useEffect(() => {
    loadWorkflowInfo();
  }, []);

  const loadWorkflowInfo = async () => {
    try {
      const response = await fetch('/api/systematic-migration/workflow');
      const data = await response.json();
      if (data.success) {
        setWorkflowSteps(data.workflow.steps);
      }
    } catch (error) {
      console.error('Failed to load workflow info:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.js') && !file.name.endsWith('.jsx')) {
      toast.error('Please select a JavaScript file (.js or .jsx)');
      return;
    }

    await performMigration(file);
  };

  const handleContentMigration = async (content: string, filename: string) => {
    await performMigration(null, content, filename);
  };

  const performMigration = async (file?: File, content?: string, filename?: string) => {
    setIsLoading(true);
    setMigrationResult(null);

    try {
      const formData = new FormData();
      
      if (file) {
        formData.append('file', file);
      } else if (content) {
        formData.append('content', content);
        formData.append('filename', filename || 'migration.js');
      }
      
      formData.append('includeRefactoring', includeRefactoring.toString());

      const endpoint = file ? '/api/systematic-migration/migrate-file' : '/api/systematic-migration/migrate-content';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        setMigrationResult(result);
        toast.success('Systematic migration completed successfully!');
        onMigrationComplete?.(result);
      } else {
        toast.error(result.message || 'Migration failed');
        console.error('Migration failed:', result);
      }
    } catch (error) {
      console.error('Migration error:', error);
      toast.error('Migration failed: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const testWithExample = async () => {
    const exampleCode = `// JavaScript to TypeScript Migration Example
let userName = "John Doe";
let userAge = 25;
let isActive = true;

function greetUser(name, age) {
    return \`Hello \${name}, you are \${age} years old!\`;
}

const userProfile = {
    id: 1,
    name: "John Doe",
    email: "john@example.com",
    preferences: {
        theme: "dark",
        notifications: true
    }
};

const numbers = [1, 2, 3, 4, 5];
const doubledNumbers = numbers.map(num => num * 2);

class User {
    constructor(name, email) {
        this.name = name;
        this.email = email;
    }
    
    getInfo() {
        return \`\${this.name} (\${this.email})\`;
    }
}

async function fetchUserData(userId) {
    try {
        const response = await fetch(\`/api/users/\${userId}\`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching user:', error);
        return null;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded');
    const button = document.getElementById('submitBtn');
    if (button) {
        button.addEventListener('click', handleSubmit);
    }
});

function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);
    console.log('Form submitted:', data);
}

export { greetUser, User, fetchUserData };
export default userProfile;`;

    await handleContentMigration(exampleCode, 'js-to-ts-example.js');
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Systematic JavaScript to TypeScript Migration
          </h2>
          <p className="text-gray-600 mb-6">
            A structured 8-step workflow for high-quality code migration that preserves 
            original structure and ensures 1:1 conversion with proper type annotations.
          </p>
        </div>

        {/* Workflow Steps */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Migration Workflow</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {workflowSteps.map((step, index) => (
              <div key={step.step} className="bg-gray-50 rounded-lg p-4 border">
                <div className="flex items-center mb-2">
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                    {step.step}
                  </div>
                  <h4 className="font-semibold text-gray-900">{step.name}</h4>
                </div>
                <p className="text-sm text-gray-600 mb-2">{step.description}</p>
                <p className="text-xs text-gray-500">{step.purpose}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Migration Options */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Start Migration</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* File Upload */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Upload JavaScript File</h4>
              <p className="text-gray-600 mb-4">
                Upload a .js or .jsx file for systematic migration
              </p>
              <input
                type="file"
                accept=".js,.jsx"
                onChange={handleFileUpload}
                disabled={isLoading}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            {/* Test with Example */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Code className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Test with Example</h4>
              <p className="text-gray-600 mb-4">
                Try the systematic migration with our example JavaScript file
              </p>
              <button
                onClick={testWithExample}
                disabled={isLoading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Processing...' : 'Test Migration'}
              </button>
            </div>
          </div>

          {/* Options */}
          <div className="mt-6 flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeRefactoring}
                onChange={(e) => setIncludeRefactoring(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Include optional refactoring (Step 8)</span>
            </label>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center">
              <Clock className="w-6 h-6 text-blue-600 mr-3 animate-spin" />
              <div>
                <h4 className="font-semibold text-blue-900">Migration in Progress</h4>
                <p className="text-blue-700 text-sm">
                  Following the systematic workflow: Isolate → Rename → Analyze → Add Types → Define Interfaces → Fix → Verify → Commit
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Migration Results */}
        {migrationResult && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Migration Results</h3>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
              <div className="flex items-center mb-4">
                <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
                <h4 className="font-semibold text-green-900">Migration Completed Successfully</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-semibold text-green-800">Migration ID:</span>
                  <span className="ml-2 text-green-700">{migrationResult.migrationId}</span>
                </div>
                <div>
                  <span className="font-semibold text-green-800">Steps Completed:</span>
                  <span className="ml-2 text-green-700">
                    {migrationResult.workflow.completedSteps}/{migrationResult.workflow.totalSteps}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-green-800">Status:</span>
                  <span className="ml-2 text-green-700">Success</span>
                </div>
              </div>
            </div>

            {/* Step Results */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Step-by-Step Results</h4>
              {Object.entries(migrationResult.results).map(([stepName, result]: [string, any]) => (
                <div key={stepName} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-semibold text-gray-900 capitalize">
                      {stepName.replace(/([A-Z])/g, ' $1').trim()}
                    </h5>
                    <div className="flex items-center">
                      {result.success ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                  </div>
                  {result.message && (
                    <p className="text-sm text-gray-600">{result.message}</p>
                  )}
                  {result.error && (
                    <p className="text-sm text-red-600">{result.error}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Errors and Warnings */}
            {(migrationResult.errors?.length > 0 || migrationResult.warnings?.length > 0) && (
              <div className="mt-6">
                {migrationResult.errors?.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <h5 className="font-semibold text-red-900 mb-2">Errors</h5>
                    <ul className="text-sm text-red-700">
                      {migrationResult.errors.map((error: string, index: number) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {migrationResult.warnings?.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h5 className="font-semibold text-yellow-900 mb-2">Warnings</h5>
                    <ul className="text-sm text-yellow-700">
                      {migrationResult.warnings.map((warning: string, index: number) => (
                        <li key={index}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SystematicMigration;




