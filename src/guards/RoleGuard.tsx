import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/backend';
import { ShieldAlert } from 'lucide-react';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallback?: React.ReactNode;
}

/**
 * Role-Based Access Control Guard: Limits rendering to authorized employee/admin tiers.
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRoles, fallback }) => {
  const { hasRole, isAuthenticating } = useAuth();

  if (isAuthenticating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] p-6" id="role-guard-loader">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-charcoal-500">Checking security permissions...</p>
      </div>
    );
  }

  if (!hasRole(allowedRoles)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div 
        className="flex flex-col items-center justify-center min-h-[350px] p-8 text-center max-w-md mx-auto bg-rose-50/50 dark:bg-rose-950/10 rounded-2xl border border-rose-100 dark:border-rose-900/30 my-8" 
        id="permission-denied-fallback"
      >
        <div className="p-3 bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-full mb-4">
          <ShieldAlert className="w-8 h-8 animate-bounce" />
        </div>
        <h3 className="text-lg font-bold text-charcoal-900 dark:text-white mb-2">Unauthorized Access</h3>
        <p className="text-sm text-charcoal-600 dark:text-slate-400 mb-4">
          Your account role does not have the privileges required to view this administrative resource.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

export default RoleGuard;
