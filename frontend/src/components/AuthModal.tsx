import React, { useState } from 'react';
import { Mail, User, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';

interface AuthModalProps {
  onLogin: (email: string, name: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    const displayName = name.trim() || email.split('@')[0];
    onLogin(email.trim(), displayName);
  };

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        {/* Header Badge Icon */}
        <div className="auth-icon-badge">
          <Sparkles size={32} color="#ffffff" />
        </div>

        <h2 className="auth-title">Welcome to Nexus AI</h2>
        <p className="auth-subtitle">
          Please enter your email address to log in and access your personal agentic assistant workspace.
        </p>

        <form onSubmit={handleSubmit} style={{ marginTop: '24px' }}>
          {error && (
            <div className="auth-error-banner">
              {error}
            </div>
          )}

          {/* Email Input Field */}
          <div className="auth-field">
            <label className="auth-label">
              <Mail size={14} color="#f97316" /> Email Address <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div className="auth-input-wrapper">
              <input
                type="email"
                className="auth-input"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                required
                autoFocus
              />
            </div>
          </div>

          {/* Display Name Input Field */}
          <div className="auth-field" style={{ marginTop: '16px' }}>
            <label className="auth-label">
              <User size={14} color="#d97706" /> Full Name <span style={{ color: '#a89a8c', fontWeight: 400 }}>(Optional)</span>
            </label>
            <div className="auth-input-wrapper">
              <input
                type="text"
                className="auth-input"
                placeholder="e.g. Alex Fernando"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          {/* Submit Action Button */}
          <button type="submit" className="auth-submit-btn">
            Continue to Workspace <ArrowRight size={18} />
          </button>
        </form>

        {/* Security Footer Notice */}
        <div className="auth-footer-notice">
          <ShieldCheck size={14} color="#059669" />
          <span>Secure Enterprise Session • Local Trajectory Storage</span>
        </div>
      </div>
    </div>
  );
};
