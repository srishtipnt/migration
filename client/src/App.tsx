import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import MigrationPage from './pages/MigrationPage';
import MigrationResultsPage from './pages/MigrationResultsPage';
import DebugSingleFilePage from './pages/DebugSingleFilePage';
import HistoryPage from './pages/HistoryPage';
import HelpPage from './pages/HelpPage';
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
          path="/migration" 
          element={<Navigate to="/migrate" replace />} 
        />
        <Route 
          path="/migration-results" 
          element={<MigrationResultsPage />}
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
              <HistoryPage />
            </Layout>
          } 
        />
        <Route 
          path="/help" 
          element={
            <Layout showNavbar={true}>
              <HelpPage />
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