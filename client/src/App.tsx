import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import MigrationPage from './pages/MigrationPage';
import DebugSingleFilePage from './pages/DebugSingleFilePage';
import SignIn from './components/SignIn';
import SignUp from './components/SignUp';

function App() {
  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={
            <Layout showNavbar={true}>
              <LandingPage />
            </Layout>
          } 
        />
        <Route 
          path="/migrate" 
          element={
            <Layout showNavbar={true}>
              <MigrationPage />
            </Layout>
          } 
        />
        <Route 
          path="/debug-single-file" 
          element={
            <Layout showNavbar={true}>
              <DebugSingleFilePage />
            </Layout>
          } 
        />
        <Route 
          path="/history" 
          element={
            <Layout showNavbar={true}>
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    Migration History
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    Your migration history will appear here.
                  </p>
                </div>
              </div>
            </Layout>
          } 
        />
        <Route 
          path="/help" 
          element={
            <Layout showNavbar={true}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    Help & Support
                  </h1>
                      <p className="text-gray-600 dark:text-gray-400">
                    Help documentation and support information will be available here.
                      </p>
                    </div>
              </div>
            </Layout>
          } 
        />
        <Route 
          path="/login" 
          element={<SignIn />}
        />
        <Route 
          path="/register" 
          element={<SignUp />}
        />
      </Routes>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            style: {
              background: '#10B981',
            },
          },
          error: {
            duration: 5000,
            style: {
              background: '#EF4444',
            },
          },
        }}
      />
    </Router>
  );
}

export default App;