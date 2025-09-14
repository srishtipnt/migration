import React, { useState } from 'react';
import MigrationDashboard from '../components/MigrationDashboard';

const MigrationPage: React.FC = () => {
  // Mock session and user data - in a real app, this would come from authentication
  const [sessionId] = useState('session-' + Date.now());
  const [userId] = useState('user-' + Math.random().toString(36).substr(2, 9));

  return (
    <MigrationDashboard 
      sessionId={sessionId}
      userId={userId}
    />
  );
};

export default MigrationPage;
