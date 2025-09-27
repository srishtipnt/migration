import React, { useState } from 'react';
import { Upload, Archive, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import SingleFileCloudinaryUpload from './SingleFileCloudinaryUpload';
import ZipUpload from './ZipUpload';

interface UploadSectionProps {
  onFileUpload: (file: File) => void;
  onZipUpload: (file: File, abortController: AbortController) => void;
  onClearZip: () => void;
  onTabChange?: (tab: UploadType) => void;
}

type UploadType = 'files' | 'zip';

const UploadSection: React.FC<UploadSectionProps> = ({ 
  onFileUpload, 
  onZipUpload, 
  onClearZip,
  onTabChange
}) => {
  const [activeTab, setActiveTab] = useState<UploadType>('files');
  const [isExpanded, setIsExpanded] = useState(true);

  // Handle tab change and notify parent
  const handleTabChange = (tab: UploadType) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  const tabs = [
    {
      id: 'files' as UploadType,
      label: 'Single File Upload',
      icon: FileText,
      description: 'Upload individual files to MongoDB and Cloudinary'
    },
    {
      id: 'zip' as UploadType,
      label: 'Upload ZIP File',
      icon: Archive,
      description: 'Upload a ZIP archive with preserved folder structure'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Upload className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Upload Files</h2>
                <p className="text-sm text-gray-500">Choose between single file upload or ZIP archive upload</p>
              </div>
            </div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronRight className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        {isExpanded && (
          <div className="px-6">
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-6">
          {/* Tab Description */}
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              {tabs.find(tab => tab.id === activeTab)?.description}
            </p>
          </div>

          {/* Upload Components */}
          <div className="space-y-4">
            {activeTab === 'files' && (
              <div>
                <SingleFileCloudinaryUpload onUpload={onFileUpload} />
              </div>
            )}

            {activeTab === 'zip' && (
              <div>
                <ZipUpload 
                  onZipUpload={onZipUpload} 
                  onClearZip={onClearZip}
                />
              </div>
            )}
          </div>

          {/* Upload Tips */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Upload Tips</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              {activeTab === 'files' ? (
                <>
                  <li>• Files are stored in both MongoDB (metadata) and Cloudinary (actual files)</li>
                  <li>• Supported formats: JS, TS, JSON, HTML, CSS, images, and more</li>
                  <li>• You can upload multiple files at once</li>
                  <li>• Files are processed individually with Cloudinary integration</li>
                </>
              ) : (
                <>
                  <li>• ZIP files uploaded directly to Cloudinary with structured storage</li>
                  <li>• Folder structure preserved for easy organization</li>
                  <li>• Files organized by type and size for optimization</li>
                  <li>• Maximum file size: 100MB</li>
                </>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadSection;
