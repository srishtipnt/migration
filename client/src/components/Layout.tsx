import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import apiService from '../services/api';

interface LayoutProps {
  children: React.ReactNode;
  showNavbar?: boolean;
}

interface User {
  name: string;
  email: string;
  avatar?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, showNavbar = true }) => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  // Check for existing user session on component mount
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      // Set the token in the API service
      apiService.setToken(token);
      
      // Try to get current user info
      apiService.request('/auth/me')
        .then((response) => {
          if (response.success) {
            setUser({
              name: `${response.data.user.firstName} ${response.data.user.lastName}`,
              email: response.data.user.email,
              avatar: undefined
            });
          }
        })
        .catch((error) => {
          console.error('Failed to get user info:', error);
          // Clear invalid token
          localStorage.removeItem('authToken');
          apiService.setToken(null);
          setUser(null);
        });
    } else {
      // Don't set mock user - let the navbar show login/register buttons
      setUser(null);
    }
  }, []);

  // Function to handle successful login
  const handleLoginSuccess = (userData: any, token: string) => {
    // Set the token in the API service
    apiService.setToken(token);
    
    setUser({
      name: `${userData.firstName} ${userData.lastName}`,
      email: userData.email,
      avatar: undefined
    });
  };

  const handleLogout = async () => {
    try {
      // Call logout API endpoint
      await apiService.request('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      // Clear local storage and user state
      localStorage.removeItem('authToken');
      setUser(null);
      
      // Redirect to home page
      navigate('/');
      
      // Show success message
      alert('Successfully logged out!');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {showNavbar && (
        <Navbar
          user={user}
          onLogout={handleLogout}
        />
      )}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};

export default Layout;
