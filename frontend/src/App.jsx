import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PublicView } from './components/PublicView';
import PublicViewExecutive from './components/PublicViewExecutive';
import { AdminDashboard } from './components/AdminDashboard';
import ErrorBoundary from './components/ErrorBoundary';

const App = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    const path = window.location.pathname;
    if (path.includes('/admin')) {
      setShowAdminLogin(true);
    }
  }, []);

  const handleAdminLogin = () => {
    if (email === 'edwin@edwinlovett.com') {
      setIsAdmin(true);
      setShowAdminLogin(false);
      axios.defaults.headers.common['x-admin-email'] = email;
    } else {
      alert('Invalid email');
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    delete axios.defaults.headers.common['x-admin-email'];
    window.history.pushState({}, '', '/roadmap');
  };

  if (showAdminLogin && !isAdmin) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-2xl border border-white/[0.06] p-8"
          style={{
            backgroundColor: 'rgba(37,37,41,0.8)',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
          }}
        >
          <h2 className="text-xl font-bold text-text-hi text-center mb-6">
            Admin Access
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-text-subtle uppercase tracking-wider mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-glass w-full text-sm"
                placeholder="Enter your email"
                onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
              />
            </div>
            <button
              onClick={handleAdminLogin}
              className="w-full bg-accent hover:bg-accent/80 text-white py-2.5 px-4 rounded-lg transition-colors text-sm font-semibold"
            >
              Access Admin Panel
            </button>
            <button
              onClick={() => {
                setShowAdminLogin(false);
                window.history.pushState({}, '', '/roadmap');
              }}
              className="w-full text-text-subtle hover:text-text-muted py-2 px-4 rounded-lg transition-colors text-sm hover:bg-white/5"
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
      {isAdmin ? <AdminDashboard onLogout={handleLogout} /> : <PublicView />}
    </ErrorBoundary>
  );
};

export default App;
