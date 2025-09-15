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

// Helper function to decode JWT token
const decodeJWT = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
};

const Layout: React.FC<LayoutProps> = ({ children, showNavbar = true }) => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  // Check for existing user session on component mount
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('userData');
    
    if (token && storedUser) {
      // Set the token in the API service
      apiService.setToken(token);
      
      try {
        // Parse stored user data
        const userData = JSON.parse(storedUser);
        setUser({
          name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.username || 'User',
          email: userData.email || 'user@example.com',
          avatar: undefined
        });
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        // Fallback: try to decode JWT token
        const decoded = decodeJWT(token);
        if (decoded && decoded.userId) {
          setUser({
            name: 'Authenticated User',
            email: 'user@example.com',
            avatar: undefined
          });
        }
      }
    } else if (token) {
      // Only token available, try to decode it
      apiService.setToken(token);
      const decoded = decodeJWT(token);
      if (decoded && decoded.userId) {
        setUser({
          name: 'Authenticated User',
          email: 'user@example.com',
          avatar: undefined
        });
      }
    } else {
      setUser(null);
    }
  }, []);

  // Function to handle successful login
  const handleLoginSuccess = (userData: any, token: string) => {
    // Set the token in the API service
    apiService.setToken(token);
    
    // Store user data in localStorage
    localStorage.setItem('userData', JSON.stringify(userData));
    
    setUser({
      name: `${userData.firstName} ${userData.lastName}`,
      email: userData.email,
      avatar: undefined
    });
  };

  const handleLogout = () => {
    // Clear local storage and user state
    apiService.logout();
    localStorage.removeItem('userData');
    setUser(null);
    
    // Redirect to home page
    navigate('/');
    
    // Show success message
    alert('Successfully logged out!');
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