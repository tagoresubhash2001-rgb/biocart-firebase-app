import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/backend';
import { ShieldAlert } from 'lucide-react';
import { BioCartLoader } from '../components/ui/BioCartLoader';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallback?: React.ReactNode;
}

/**
 * Role-Based Access Control Guard: Limits rendering to authorized employee/admin tiers.
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRoles, fallback }) => {
  const { hasRole, isAuthenticating, userProfile, firebaseUser, sendEmailVerification } = useAuth();
  const [sendingVerification, setSendingVerification] = React.useState(false);
  const [verificationSent, setVerificationSent] = React.useState(false);

  if (isAuthenticating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] p-6" id="role-guard-loader">
        <BioCartLoader message="Checking security permissions..." size="sm" />
      </div>
    );
  }

  // Check if user is an admin profile but blocked solely by unverified email
  const isAdminProfile = userProfile && ['admin', 'super_admin'].includes(userProfile.role) && userProfile.status === 'active';
  const isEmailUnverifiedAdmin = isAdminProfile && firebaseUser && !firebaseUser.emailVerified;

  if (!hasRole(allowedRoles)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (isEmailUnverifiedAdmin) {
      return (
        <div 
          className="flex flex-col items-center justify-center min-h-[380px] p-8 text-center max-w-lg mx-auto bg-amber-50/70 rounded-3xl border border-amber-200/80 my-8 shadow-sm" 
          id="admin-email-verification-required"
        >
          <div className="p-3 bg-amber-100 text-amber-700 rounded-full mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold font-display text-slate-900 mb-2">Administrator Email Verification Required</h3>
          <p className="text-sm text-slate-600 mb-2 leading-relaxed">
            Your account (<strong className="text-slate-800">{firebaseUser?.email}</strong>) holds <span className="font-semibold text-emerald-800 uppercase text-xs px-2 py-0.5 bg-emerald-100 rounded-full border border-emerald-200">{userProfile.role}</span> privileges, but administrative consoles require a verified email address per BioCart security policy.
          </p>
          <p className="text-xs text-slate-500 mb-6">
            Please check your inbox for the verification link or click below to dispatch a new verification email. After clicking the link in your email, refresh this page or sign in again.
          </p>

          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={async () => {
                setSendingVerification(true);
                try {
                  await sendEmailVerification();
                  setVerificationSent(true);
                } catch {
                  // Handled in context
                } finally {
                  setSendingVerification(false);
                }
              }}
              disabled={sendingVerification || verificationSent}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-60"
            >
              {sendingVerification ? 'Sending Verification Link…' : (verificationSent ? 'Link Dispatched! Check Inbox' : 'Resend Verification Email')}
            </button>
            <button
              onClick={async () => {
                if (firebaseUser) {
                  await firebaseUser.reload();
                  window.location.reload();
                }
              }}
              className="px-5 py-2.5 border border-slate-300 hover:bg-white text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              I Have Verified — Refresh Now
            </button>
          </div>
        </div>
      );
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
