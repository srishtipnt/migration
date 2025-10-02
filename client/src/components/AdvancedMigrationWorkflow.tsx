import React, { useState, useEffect } from 'react';
import MultiStepMigrationPlan from './MultiStepMigrationPlan';
import ChunkReviewInterface from './ChunkReviewInterface';
import CodeDiffViewer from './CodeDiffViewer';

interface AdvancedMigrationWorkflowProps {
  projectFiles: any[];
  fromLanguage: string;
  toLanguage: string;
  onComplete: (results: any) => void;
  onCancel: () => void;
}

type WorkflowStep = 'planning' | 'execution' | 'review' | 'complete';

const AdvancedMigrationWorkflow: React.FC<AdvancedMigrationWorkflowProps> = ({
  projectFiles,
  fromLanguage,
  toLanguage,
  onComplete,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('planning');
  const [projectAnalysis, setProjectAnalysis] = useState<any>(null);
  const [migrationPlan, setMigrationPlan] = useState<any[]>([]);
  const [currentStepData, setCurrentStepData] = useState<any>(null);
  const [reviewChunks, setReviewChunks] = useState<any[]>([]);
  const [migrationResults, setMigrationResults] = useState<any[]>([]);

  useEffect(() => {
    // Analyze project when component mounts
    analyzeProject();
  }, [projectFiles]);

  const analyzeProject = async () => {
    // Simulate project analysis
    const analysis = {
      hasDatabaseModels: projectFiles.some(file => 
        file.content.includes('mongoose.Schema') || file.content.includes('sequelize.define')
      ),
      hasApiRoutes: projectFiles.some(file => 
        file.content.includes('app.get') || file.content.includes('app.post') || file.content.includes('router.')
      ),
      hasMiddleware: projectFiles.some(file => 
        file.content.includes('middleware') || file.content.includes('app.use')
      ),
      hasBusinessLogic: projectFiles.some(file => 
        file.content.includes('function') || file.content.includes('class')
      ),
      hasFrontendComponents: projectFiles.some(file => 
        file.content.includes('React') || file.content.includes('Vue') || file.content.includes('Angular')
      ),
      databaseChunks: projectFiles.filter(file => 
        file.content.includes('mongoose.Schema') || file.content.includes('sequelize.define')
      ),
      apiChunks: projectFiles.filter(file => 
        file.content.includes('app.get') || file.content.includes('app.post')
      ),
      middlewareChunks: projectFiles.filter(file => 
        file.content.includes('middleware') || file.content.includes('app.use')
      ),
      businessLogicChunks: projectFiles.filter(file => 
        file.content.includes('function') || file.content.includes('class')
      ),
      frontendChunks: projectFiles.filter(file => 
        file.content.includes('React') || file.content.includes('Vue')
      )
    };
    
    setProjectAnalysis(analysis);
  };

  const handleStepComplete = (stepId: string, result: any) => {
    setMigrationResults(prev => [...prev, { stepId, result }]);
    
    // Move to review phase for this step
    setCurrentStepData({ stepId, result });
    setReviewChunks(result.chunks || []);
    setCurrentStep('review');
  };

  const handlePlanComplete = (plan: any[]) => {
    setMigrationPlan(plan);
    setCurrentStep('execution');
  };

  const handleReviewComplete = (reviewedChunks: any[]) => {
    // Update the current step with reviewed chunks
    const updatedResults = migrationResults.map(result => 
      result.stepId === currentStepData.stepId 
        ? { ...result, reviewedChunks }
        : result
    );
    setMigrationResults(updatedResults);
    
    // Check if there are more steps to execute
    const nextStep = migrationPlan.find(step => step.status === 'pending');
    if (nextStep) {
      setCurrentStep('execution');
    } else {
      setCurrentStep('complete');
    }
  };

  const handleFinalComplete = () => {
    onComplete({
      migrationPlan,
      results: migrationResults,
      totalSteps: migrationPlan.length,
      completedSteps: migrationResults.length
    });
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'planning':
        return (
          <MultiStepMigrationPlan
            projectAnalysis={projectAnalysis}
            onStepComplete={handleStepComplete}
            onPlanComplete={handlePlanComplete}
            onCancel={onCancel}
          />
        );
        
      case 'execution':
        return (
          <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Executing Migration Steps
                </h2>
                <p className="text-gray-600 mb-6">
                  Migration steps are being executed automatically. You'll be prompted to review each step.
                </p>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${(migrationResults.length / migrationPlan.length) * 100}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {migrationResults.length} of {migrationPlan.length} steps completed
                </p>
              </div>
            </div>
          </div>
        );
        
      case 'review':
        return (
          <ChunkReviewInterface
            chunks={reviewChunks}
            onComplete={handleReviewComplete}
            onCancel={() => setCurrentStep('execution')}
          />
        );
        
      case 'complete':
        return (
          <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Migration Complete!
                </h2>
                <p className="text-gray-600 mb-6">
                  Your {fromLanguage} to {toLanguage} migration has been completed successfully.
                </p>
                
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-gray-900">{migrationPlan.length}</div>
                    <div className="text-sm text-gray-600">Total Steps</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-600">{migrationResults.length}</div>
                    <div className="text-sm text-gray-600">Completed</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-600">
                      {migrationResults.reduce((total, result) => total + (result.reviewedChunks?.length || 0), 0)}
                    </div>
                    <div className="text-sm text-gray-600">Files Migrated</div>
                  </div>
                </div>

                <div className="flex justify-center space-x-4">
                  <button
                    onClick={onCancel}
                    className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleFinalComplete}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    Download Results
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">
                Advanced Migration Workflow
              </h1>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                  {fromLanguage}
                </span>
                <span className="text-gray-400">→</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                  {toLanguage}
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Step: {currentStep.charAt(0).toUpperCase() + currentStep.slice(1)}
              </div>
              <button
                onClick={onCancel}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-8">
        {renderCurrentStep()}
      </div>
    </div>
  );
};

export default AdvancedMigrationWorkflow;




