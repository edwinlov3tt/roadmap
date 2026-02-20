import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PublicView } from './components/PublicView';
import PublicViewExecutive from './components/PublicViewExecutive';
import AdminView from './components/AdminView';
import ErrorBoundary from './components/ErrorBoundary';

const API_BASE = '';

const App = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    // Check if we're on the admin route
    const path = window.location.pathname;
    if (path.includes('/admin')) {
      setShowAdminLogin(true);
    }
  }, []);

  const handleAdminLogin = () => {
    if (email === 'edwin@edwinlovett.com') {
      setIsAdmin(true);
      setShowAdminLogin(false);
      // Set axios default header for admin requests
      axios.defaults.headers.common['x-admin-email'] = email;
    } else {
      alert('Invalid email');
    }
  };

  if (showAdminLogin && !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">
            Admin Access
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Enter your email"
                onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
              />
            </div>
            <button
              onClick={handleAdminLogin}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Access Admin Panel
            </button>
            <button
              onClick={() => {
                setShowAdminLogin(false);
                window.history.pushState({}, '', '/roadmap');
              }}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg transition-colors"
            >
              View Public Roadmap
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      {isAdmin ? <AdminView /> : <PublicView />}
    </ErrorBoundary>
  );
};

export default App;