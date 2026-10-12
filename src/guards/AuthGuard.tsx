import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../context/AppContext';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Access Control Guard: Blocks unauthenticated users, redirects to safe tabs,
 * and triggers Auth popup if necessary.
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({ children, fallback }) => {
  const { isAuthenticated, isAuthenticating } = useAuth();
  const { setTab, setSubView, setAuthModalOpen, setAuthModalMode } = useApp();

  useEffect(() => {
    if (!isAuthenticating && !isAuthenticated) {
      // Trigger the auth modal to let them log in
      setAuthModalMode('login');
      setAuthModalOpen(true);
    }
  }, [isAuthenticated, isAuthenticating, setAuthModalOpen, setAuthModalMode]);

  if (isAuthenticating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8" id="auth-guard-loader">
        <div className="w-10 h-10 border-4 border-nature-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-charcoal-600 dark:text-slate-400">Verifying security credentials...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-charcoal-950 p-6 text-center z-50 fixed inset-0">
        <div className="p-4 bg-emerald-100 dark:bg-emerald-900/30 text-[#004643] dark:text-emerald-400 rounded-full mb-6 shadow-sm">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold font-display text-slate-900 dark:text-white mb-2">Secure Authentication Required</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-8 max-w-md mx-auto font-medium">
          Please sign in with your authorized BioCart account credentials to access this portal.
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => {
              setAuthModalMode('login');
              setAuthModalOpen(true);
            }}
            className="px-6 py-3 bg-[#004643] hover:bg-[#003532] text-white rounded-xl text-sm font-bold shadow-md transition-all cursor-pointer"
          >
            Sign In Now
          </button>
          <button
            onClick={() => {
              setSubView(null);
              setTab('home');
              window.location.hash = '';
            }}
            className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
          >
            Return to Store
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthGuard;
