// VoiceFlow Pro - Main Application with Routing

import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { ProfessionalModeProvider } from './contexts/ProfessionalModeContext';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import PricingPage from './pages/PricingPage';
import AIMLTestPage from './pages/AIMLTestPage';
import DashboardPage from './pages/DashboardPage';
import BlogPage from './pages/BlogPage';
import CaseStudiesPage from './pages/CaseStudiesPage';
import HelpCenterPage from './pages/HelpCenterPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';

// Loading component
const LoadingFallback: React.FC = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
  }}>
    <div style={{
      textAlign: 'center',
      padding: '2rem',
    }}>
      <div style={{
        width: '48px',
        height: '48px',
        border: '4px solid #e5e7eb',
        borderTopColor: '#4f46e5',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '0 auto 1rem',
      }} />
      <p style={{
        color: '#6b7280',
        fontSize: '1rem',
      }}>Loading...</p>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  </div>
);

// Navigation Component
const Navigation: React.FC = () => {
  return (
    <nav style={{
      padding: '1rem 2rem',
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
        <Link to="/" style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4f46e5', textDecoration: 'none' }}>
          VoiceFlow Pro
        </Link>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <Link to="/" style={{ color: '#374151', textDecoration: 'none', fontWeight: 500 }}>
            Home
          </Link>
          <Link to="/features" style={{ color: '#374151', textDecoration: 'none', fontWeight: 500 }}>
            Features
          </Link>
          <Link to="/pricing" style={{ color: '#374151', textDecoration: 'none', fontWeight: 500 }}>
            Pricing
          </Link>
          <Link to="/blog" style={{ color: '#374151', textDecoration: 'none', fontWeight: 500 }}>
            Blog
          </Link>
          <Link to="/case-studies" style={{ color: '#374151', textDecoration: 'none', fontWeight: 500 }}>
            Cases
          </Link>
          <Link to="/help" style={{ color: '#374151', textDecoration: 'none', fontWeight: 500 }}>
            Help
          </Link>
          <Link to="/app" style={{ color: '#374151', textDecoration: 'none', fontWeight: 500 }}>
            App
          </Link>
        </div>
      </div>
      <div>
        <button style={{
          padding: '0.5rem 1.5rem',
          backgroundColor: '#4f46e5',
          color: '#ffffff',
          border: 'none',
          borderRadius: '0.5rem',
          fontWeight: 600,
          cursor: 'pointer',
        }}>
          Get Started
        </button>
      </div>
    </nav>
  );
};

// App Content with Router
const AppContent: React.FC = () => {
  return (
    <Router>
      <Navigation />
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/features" element={<LandingPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/case-studies" element={<CaseStudiesPage />} />
          <Route path="/help" element={<HelpCenterPage />} />
          <Route path="/app" element={<HomePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/aiml-demo" element={<AIMLTestPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Routes>
      </Suspense>
    </Router>
  );
};

// Main App Component with Providers
const App: React.FC = () => {
  return (
    <ThemeProvider defaultTheme="auto">
      <SettingsProvider>
        <ProfessionalModeProvider defaultMode="general">
          <AppContent />
        </ProfessionalModeProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
};

export default App;
