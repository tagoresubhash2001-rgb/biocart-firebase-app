import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { UserProfile, UserRole } from '../types/backend';
import { AuthService, ConfirmationResult } from '../services/AuthService';
import { UserService } from '../services/UserService';
import { allocateNextCustomerId, ensureCustomerIdForProfile, isValidCustomerId } from '../services/CustomerIdService';
import { useLoading } from './LoadingContext';
import { useNotification } from './NotificationContext';
import { normalizeError } from '../utils/errors';
import { resolveUserRole } from '../utils/authz';

export type { ConfirmationResult };

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  userRole: UserRole;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, name: string, phoneNumber?: string, location?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  sendPhoneOtp: (phoneNumber: string, containerId?: string) => Promise<ConfirmationResult>;
  verifyPhoneOtp: (confirmation: ConfirmationResult, otpCode: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  sendEmailVerification: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasRole: (allowedRoles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  // A browser cache is not an authorization source. Start with no role and
  // wait for Firebase Auth + the current Firestore profile to resolve.
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(true);

  const { startLoading, stopLoading } = useLoading();
  const { showNotification } = useNotification();

  const userRole = useMemo<UserRole>(() => {
    return resolveUserRole(userProfile, firebaseUser?.emailVerified === true);
  }, [userProfile, firebaseUser]);

  const isAuthenticated = useMemo<boolean>(() => {
    return !!firebaseUser;
  }, [firebaseUser]);

  // Roles are authorization data and must always come from the current
  // Firestore profile. Never restore them from browser storage.
  const updateAndCacheProfile = useCallback((profile: UserProfile | null) => {
    setUserProfile(profile);
    try {
      localStorage.removeItem('biocart_cached_user_profile');
    } catch { /* Storage may be disabled; authorization remains server-backed. */ }
  }, []);

  // Check for redirect result on app load (e.g. returning from mobile Google sign-in)
  useEffect(() => {
    AuthService.checkRedirectResult()
      .then((user) => {
        if (user) {
          showNotification('Signed in with Google successfully', 'success');
        }
      })
      .catch((err) => {
        const norm = normalizeError(err);
        if (norm.code !== 'auth/popup-closed-by-user' && norm.code !== 'auth/cancelled-popup-request') {
          showNotification(norm.message, 'error');
        }
      });
  }, [showNotification]);

  // Unified, safe customer profile provisioning and synchronization
  const provisionOrFetchProfile = useCallback(async (user: FirebaseUser): Promise<UserProfile | null> => {
    try {
      const userEmail = user.email?.toLowerCase();
      const isAuthorizedAdmin = user.emailVerified && (
        userEmail === 'sinfoxmedia@gmail.com' || userEmail === 'tagoresubhash2001@gmail.com'
      );

      // 1. Check if user profile already exists in Firestore
      const existing = await UserService.getUserProfile(user.uid);
      if (existing) {
        let currentProfile = existing;

        // If this is an authorized admin whose role is not yet super_admin or admin, elevate via callable
        if (isAuthorizedAdmin && currentProfile.role !== 'super_admin' && currentProfile.role !== 'admin') {
          try {
            await AuthService.provisionVerifiedOwner();
            const elevated = await UserService.getUserProfile(user.uid);
            if (elevated) currentProfile = elevated;
          } catch (elevErr) {
            console.warn('Admin elevation failed:', elevErr);
          }
        }

        // Safely backfill Customer ID for existing customers if missing
        if (currentProfile.role === 'customer' && !isValidCustomerId(currentProfile.customerId)) {
          try {
            currentProfile = await ensureCustomerIdForProfile(currentProfile);
          } catch (cidErr) {
            console.warn('Customer ID backfill deferred:', cidErr);
          }
        }

        // Safe non-destructive update: update lastLoginAt and fill missing non-authoritative details
        const updates: Partial<UserProfile> = {
          lastLoginAt: new Date().toISOString(),
        };
        if (user.email && !currentProfile.email) updates.email = user.email;
        if (user.photoURL && !currentProfile.photoURL) updates.photoURL = user.photoURL;
        if (user.phoneNumber && !currentProfile.phoneNumber) {
          updates.phoneNumber = user.phoneNumber;
          updates.phone = user.phoneNumber;
        }
        if (user.displayName && (!currentProfile.name || currentProfile.name === 'BioCart Customer' || currentProfile.name === 'BioCart User')) {
          updates.name = user.displayName;
        }

        await UserService.updateProfile(user.uid, updates).catch((err) => {
          console.warn('Non-critical profile field sync failed:', err);
        });
        return { ...currentProfile, ...updates };
      }

      // 2. Owner & Admin special provisioning via callable
      if (isAuthorizedAdmin) {
        await AuthService.provisionVerifiedOwner();
        const ownerProfile = await UserService.getUserProfile(user.uid);
        if (ownerProfile) return ownerProfile;
      }

      // 3. New customer creation: strictly default customer role and active status
      // Allocate permanent Customer ID for genuine new customer
      let allocatedCustomerId: string | undefined;
      try {
        allocatedCustomerId = await allocateNextCustomerId(new Date());
      } catch (cidErr) {
        console.warn('Initial customer ID allocation deferred:', cidErr);
      }

      const newProfile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        name: (user.displayName && user.displayName.trim().length >= 2)
          ? user.displayName.trim()
          : (user.email ? user.email.split('@')[0] : 'BioCart Customer'),
        role: 'customer',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      if (allocatedCustomerId) {
        newProfile.customerId = allocatedCustomerId;
      }
      if (user.phoneNumber) {
        newProfile.phoneNumber = user.phoneNumber;
        newProfile.phone = user.phoneNumber;
      }
      if (user.photoURL) {
        newProfile.photoURL = user.photoURL;
      }

      await UserService.saveProfile(newProfile);
      return newProfile;
    } catch (err) {
      console.error('Error during profile provisioning:', err);
      throw err;
    }
  }, []);

  // Refresh or fetch the latest profile details from Firestore
  const refreshProfile = useCallback(async () => {
    if (!firebaseUser) {
      updateAndCacheProfile(null);
      return;
    }
    try {
      const profile = await provisionOrFetchProfile(firebaseUser);
      updateAndCacheProfile(profile);
    } catch (error) {
      console.error('Failed to sync user profile:', error);
      updateAndCacheProfile(null);
      showNotification('Unable to sync profile. Check network connection.', 'warning');
    }
  }, [firebaseUser, provisionOrFetchProfile, updateAndCacheProfile, showNotification]);

  // Synchronize on Auth state change
  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChanged(async (user) => {
      setIsAuthenticating(true);
      setFirebaseUser(user);

      if (user) {
        try {
          if (user.email?.toLowerCase() === 'sinfoxmedia@gmail.com') {
            await user.reload();
          }
          const profile = await provisionOrFetchProfile(user);
          updateAndCacheProfile(profile);
        } catch (error) {
          console.error('Error in session provisioning:', error);
          updateAndCacheProfile(null);
          showNotification('Unable to verify your account profile. Please retry.', 'warning');
        }
      } else {
        updateAndCacheProfile(null);
      }
      setIsAuthenticating(false);
    });

    return () => unsubscribe();
  }, [provisionOrFetchProfile, updateAndCacheProfile, showNotification]);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    startLoading('Verifying credentials...');
    try {
      const user = await AuthService.login(email, password);
      if (user.emailVerified) showNotification('Signed in successfully', 'success');
      else showNotification('Verification link sent. Verify your email, then sign in again for admin access.', 'warning');
    } catch (err: any) {
      const norm = normalizeError(err);
      showNotification(norm.message, 'error');
      throw norm;
    } finally {
      stopLoading();
    }
  }, [startLoading, stopLoading, showNotification]);

  const registerWithEmail = useCallback(async (
    email: string, 
    password: string, 
    name: string,
    phoneNumber?: string,
    location?: string
  ) => {
    startLoading('Creating secure account...');
    try {
      await AuthService.register(email, password, name, phoneNumber, location);
      showNotification('Account created. Check your email and verify it before signing in.', 'success');
    } catch (err: any) {
      const norm = normalizeError(err);
      showNotification(norm.message, 'error');
      throw norm;
    } finally {
      stopLoading();
    }
  }, [startLoading, stopLoading, showNotification]);

  const loginWithGoogle = useCallback(async () => {
    startLoading('Connecting to Google...');
    try {
      const user = await AuthService.loginWithGoogle();
      if (user) {
        // Explicitly await profile provisioning so session and user profile are ready
        try {
          const profile = await provisionOrFetchProfile(user);
          updateAndCacheProfile(profile);
        } catch (provisionErr) {
          console.warn('Post-login profile provisioning error:', provisionErr);
        }
        showNotification('Google Sign-In completed successfully', 'success');
      }
      // If null, mobile redirect flow has been initiated
    } catch (err: any) {
      const norm = normalizeError(err);
      if (norm.code !== 'auth/popup-closed-by-user' && norm.code !== 'auth/cancelled-popup-request') {
        showNotification(norm.message, 'error');
      }
      throw norm;
    } finally {
      stopLoading();
    }
  }, [startLoading, stopLoading, showNotification, provisionOrFetchProfile, updateAndCacheProfile]);

  const sendPhoneOtp = useCallback(async (phoneNumber: string, containerId: string = 'recaptcha-container'): Promise<ConfirmationResult> => {
    startLoading('Sending verification code via SMS...');
    try {
      const confirmation = await AuthService.sendPhoneOtp(phoneNumber, containerId);
      showNotification('Verification code sent via SMS', 'success');
      return confirmation;
    } catch (err: any) {
      const norm = normalizeError(err);
      showNotification(norm.message, 'error');
      throw norm;
    } finally {
      stopLoading();
    }
  }, [startLoading, stopLoading, showNotification]);

  const verifyPhoneOtp = useCallback(async (confirmation: ConfirmationResult, otpCode: string): Promise<void> => {
    startLoading('Verifying code...');
    try {
      await AuthService.verifyPhoneOtp(confirmation, otpCode);
      showNotification('Phone verification successful! Welcome to BioCart.', 'success');
    } catch (err: any) {
      const norm = normalizeError(err);
      showNotification(norm.message, 'error');
      throw norm;
    } finally {
      stopLoading();
    }
  }, [startLoading, stopLoading, showNotification]);

  const logout = useCallback(async () => {
    startLoading('Logging out securely...');
    try {
      await AuthService.logout();
      showNotification('Logged out successfully', 'info');
    } catch (err: any) {
      const norm = normalizeError(err);
      showNotification(norm.message, 'error');
      throw norm;
    } finally {
      stopLoading();
    }
  }, [startLoading, stopLoading, showNotification]);

  const resetPassword = useCallback(async (email: string) => {
    startLoading('Sending reset link...');
    try {
      await AuthService.resetPassword(email);
      showNotification('Password reset link sent to your email', 'success');
    } catch (err: any) {
      const norm = normalizeError(err);
      showNotification(norm.message, 'error');
      throw norm;
    } finally {
      stopLoading();
    }
  }, [startLoading, stopLoading, showNotification]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    startLoading('Updating password securely...');
    try {
      await AuthService.changePassword(currentPassword, newPassword);
      showNotification('Password updated successfully', 'success');
    } catch (err: any) {
      const norm = normalizeError(err);
      showNotification(norm.message, 'error');
      throw norm;
    } finally {
      stopLoading();
    }
  }, [startLoading, stopLoading, showNotification]);

  const sendEmailVerification = useCallback(async () => {
    startLoading('Sending verification email...');
    try {
      await AuthService.sendVerification();
      showNotification('Verification email has been dispatched', 'success');
    } catch (err: any) {
      const norm = normalizeError(err);
      showNotification(norm.message, 'error');
      throw norm;
    } finally {
      stopLoading();
    }
  }, [startLoading, stopLoading, showNotification]);

  const hasRole = useCallback((allowedRoles: UserRole[]): boolean => {
    return allowedRoles.includes(userRole);
  }, [userRole]);

  const value = useMemo(() => ({
    firebaseUser,
    userProfile,
    isAuthenticated,
    isAuthenticating,
    userRole,
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    sendPhoneOtp,
    verifyPhoneOtp,
    logout,
    resetPassword,
    changePassword,
    sendEmailVerification,
    refreshProfile,
    hasRole
  }), [
    firebaseUser,
    userProfile,
    isAuthenticated,
    isAuthenticating,
    userRole,
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    sendPhoneOtp,
    verifyPhoneOtp,
    logout,
    resetPassword,
    changePassword,
    sendEmailVerification,
    refreshProfile,
    hasRole
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
export default AuthContext;
