import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LogIn, 
  UserPlus, 
  Shield, 
  ArrowRight,
  Sparkles,
  Lock
} from 'lucide-react';

interface AuthPromptProps {
  title?: string;
  description?: string;
  showBackButton?: boolean;
  onBack?: () => void;
}

const AuthPrompt: React.FC<AuthPromptProps> = ({ 
  title = "Authentication Required",
  description = "Please sign in to access this feature",
  showBackButton = true,
  onBack
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            {title}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {description}
          </p>
        </div>

        {/* Auth Options */}
        <div className="space-y-4">
          {/* Sign In Button */}
          <button
            onClick={() => navigate('/login')}
            className="group relative w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <LogIn className="w-5 h-5 mr-2" />
            Sign In
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Sign Up Button */}
          <button
            onClick={() => navigate('/register')}
            className="group relative w-full flex justify-center items-center py-3 px-4 border border-gray-300 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Create Account
            <Sparkles className="w-4 h-4 ml-2 group-hover:rotate-12 transition-transform" />
          </button>
        </div>

        {/* Features List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Lock className="w-5 h-5 text-emerald-600 mr-2" />
            What you'll get access to:
          </h3>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex items-center">
              <div className="w-2 h-2 bg-emerald-500 rounded-full mr-3"></div>
              Upload and migrate your code files
            </li>
            <li className="flex items-center">
              <div className="w-2 h-2 bg-emerald-500 rounded-full mr-3"></div>
              View your migration history
            </li>
            <li className="flex items-center">
              <div className="w-2 h-2 bg-emerald-500 rounded-full mr-3"></div>
              Download migrated code
            </li>
            <li className="flex items-center">
              <div className="w-2 h-2 bg-emerald-500 rounded-full mr-3"></div>
              Save and manage your projects
            </li>
          </ul>
        </div>

        {/* Back Button */}
        {showBackButton && (
          <div className="text-center">
            <button
              onClick={handleBack}
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowRight className="w-4 h-4 mr-1 rotate-180" />
              Back to Home
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-400">
            Secure authentication powered by JWT tokens
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPrompt;
