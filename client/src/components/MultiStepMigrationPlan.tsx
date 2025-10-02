import React, { useState, useEffect } from 'react';

interface MigrationStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'skipped';
  chunks: any[];
  estimatedTime: string;
  dependencies: string[];
}

interface MultiStepMigrationPlanProps {
  projectAnalysis: any;
  onStepComplete: (stepId: string, result: any) => void;
  onPlanComplete: (results: any[]) => void;
  onCancel: () => void;
}

const MultiStepMigrationPlan: React.FC<MultiStepMigrationPlanProps> = ({
  projectAnalysis,
  onStepComplete,
  onPlanComplete,
  onCancel
}) => {
  const [steps, setSteps] = useState<MigrationStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(true);

  useEffect(() => {
    // Analyze project and create migration plan
    analyzeProjectAndCreatePlan();
  }, [projectAnalysis]);

  const analyzeProjectAndCreatePlan = async () => {
    setIsAnalyzing(true);
    
    // Simulate project analysis
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Create migration steps based on project analysis
    const migrationSteps = createMigrationSteps(projectAnalysis);
    setSteps(migrationSteps);
    setIsAnalyzing(false);
  };

  const createMigrationSteps = (analysis: any): MigrationStep[] => {
    const steps: MigrationStep[] = [];
    
    // Step 1: Database Models
    if (analysis.hasDatabaseModels) {
      steps.push({
        id: 'database-models',
        name: 'Convert Database Models',
        description: 'Convert Mongoose schemas to PHP models or Eloquent models',
        status: 'pending',
        chunks: analysis.databaseChunks || [],
        estimatedTime: '15-30 minutes',
        dependencies: []
      });
    }

    // Step 2: API Routes
    if (analysis.hasApiRoutes) {
      steps.push({
        id: 'api-routes',
        name: 'Convert API Routes',
        description: 'Convert Express.js routes to PHP request handlers',
        status: 'pending',
        chunks: analysis.apiChunks || [],
        estimatedTime: '20-45 minutes',
        dependencies: ['database-models']
      });
    }

    // Step 3: Middleware
    if (analysis.hasMiddleware) {
      steps.push({
        id: 'middleware',
        name: 'Convert Middleware',
        description: 'Convert Express middleware to PHP middleware',
        status: 'pending',
        chunks: analysis.middlewareChunks || [],
        estimatedTime: '10-20 minutes',
        dependencies: ['api-routes']
      });
    }

    // Step 4: Business Logic
    if (analysis.hasBusinessLogic) {
      steps.push({
        id: 'business-logic',
        name: 'Convert Business Logic',
        description: 'Convert JavaScript functions to PHP functions',
        status: 'pending',
        chunks: analysis.businessLogicChunks || [],
        estimatedTime: '15-30 minutes',
        dependencies: ['middleware']
      });
    }

    // Step 5: Frontend Components (if applicable)
    if (analysis.hasFrontendComponents) {
      steps.push({
        id: 'frontend-components',
        name: 'Convert Frontend Components',
        description: 'Convert React/Vue components to target framework',
        status: 'pending',
        chunks: analysis.frontendChunks || [],
        estimatedTime: '30-60 minutes',
        dependencies: ['business-logic']
      });
    }

    return steps;
  };

  const startStep = (stepId: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status: 'in-progress' }
        : step
    ));
  };

  const completeStep = (stepId: string, result: any) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status: 'completed' }
        : step
    ));
    onStepComplete(stepId, result);
    
    // Move to next step
    const nextStepIndex = steps.findIndex(step => step.id === stepId) + 1;
    if (nextStepIndex < steps.length) {
      setCurrentStepIndex(nextStepIndex);
    }
  };

  const skipStep = (stepId: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status: 'skipped' }
        : step
    ));
    
    // Move to next step
    const nextStepIndex = steps.findIndex(step => step.id === stepId) + 1;
    if (nextStepIndex < steps.length) {
      setCurrentStepIndex(nextStepIndex);
    }
  };

  const canStartStep = (step: MigrationStep) => {
    return step.dependencies.every(depId => 
      steps.find(s => s.id === depId)?.status === 'completed'
    );
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'in-progress': return '🔄';
      case 'skipped': return '⏭️';
      default: return '⏳';
    }
  };

  const getStepColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'in-progress': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'skipped': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-white border-gray-200';
    }
  };

  if (isAnalyzing) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Analyzing Project</h2>
            <p className="text-gray-600 mb-4">
              Analyzing your codebase to create an optimal migration plan...
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const totalSteps = steps.length;

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Migration Plan</h2>
              <p className="text-gray-600">
                Step-by-step migration plan for your project
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{completedSteps}/{totalSteps}</div>
              <div className="text-sm text-gray-600">Steps Completed</div>
            </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="px-6 py-4">
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Migration Steps */}
      <div className="space-y-4">
        {steps.map((step, index) => (
          <div 
            key={step.id}
            className={`bg-white rounded-lg shadow-lg border-2 p-6 transition-all duration-300 ${
              getStepColor(step.status)
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-white border-2 border-current flex items-center justify-center text-lg font-bold">
                    {getStepIcon(step.status)}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {step.name}
                  </h3>
                  <p className="text-gray-600 mb-2">{step.description}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>⏱️ {step.estimatedTime}</span>
                    <span>📁 {step.chunks.length} files</span>
                    {step.dependencies.length > 0 && (
                      <span>🔗 Depends on: {step.dependencies.join(', ')}</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {step.status === 'pending' && canStartStep(step) && (
                  <button
                    onClick={() => startStep(step.id)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                  >
                    Start
                  </button>
                )}
                
                {step.status === 'pending' && !canStartStep(step) && (
                  <span className="text-sm text-gray-500">Waiting for dependencies</span>
                )}
                
                {step.status === 'in-progress' && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-blue-600">In Progress</span>
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                
                {step.status === 'completed' && (
                  <span className="text-sm text-green-600 font-medium">Completed</span>
                )}
                
                {step.status === 'skipped' && (
                  <span className="text-sm text-gray-500">Skipped</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex justify-center space-x-4">
        <button
          onClick={onCancel}
          className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
        >
          Cancel Migration
        </button>
        
        {completedSteps === totalSteps && (
          <button
            onClick={() => onPlanComplete(steps)}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            Complete Migration
          </button>
        )}
      </div>
    </div>
  );
};

export default MultiStepMigrationPlan;




