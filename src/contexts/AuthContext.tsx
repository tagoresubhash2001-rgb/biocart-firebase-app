import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { UserProfile, UserRole } from '../types/backend';
import { AuthService, ConfirmationResult } from '../services/AuthService';
import { UserService } from '../services/UserService';
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

  // Refresh or fetch the latest profile details from Firestore
  const refreshProfile = useCallback(async () => {
    if (!firebaseUser) {
      updateAndCacheProfile(null);
      return;
    }
    try {
      const profile = await UserService.getUserProfile(firebaseUser.uid);
      if (profile) {
        updateAndCacheProfile(profile);
      } else {
        // Missing profiles may only be provisioned as customers. The owner
        // callable is the only path that can grant administrative roles.
        if (firebaseUser.email?.toLowerCase() === 'sinfoxmedia@gmail.com' && firebaseUser.emailVerified) {
          await AuthService.provisionVerifiedOwner();
          const ownerProfile = await UserService.getUserProfile(firebaseUser.uid);
          updateAndCacheProfile(ownerProfile);
          return;
        }
        const fallbackProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || firebaseUser.phoneNumber || 'BioCart Customer',
          role: 'customer',
          phoneNumber: firebaseUser.phoneNumber || undefined,
          phone: firebaseUser.phoneNumber || undefined,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await UserService.saveProfile(fallbackProfile);
        updateAndCacheProfile(fallbackProfile);
      }
    } catch (error) {
      console.error('Failed to sync user profile:', error);
      updateAndCacheProfile(null);
      showNotification('Unable to sync profile. Check network connection.', 'warning');
    }
  }, [firebaseUser, updateAndCacheProfile, showNotification]);

  // Synchronize on Auth state change
  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChanged(async (user) => {
      setIsAuthenticating(true);
      setFirebaseUser(user);

      if (user) {
        updateAndCacheProfile(null);
        try {
          if (user.email?.toLowerCase() === 'sinfoxmedia@gmail.com') {
            await user.reload();
            if (user.emailVerified) await AuthService.provisionVerifiedOwner();
          }
          const profile = await UserService.getUserProfile(user.uid);
          if (profile) {
            updateAndCacheProfile(profile);
          } else {
            // A verified owner is provisioned only by the trusted callable.
            const isOwner = user.emailVerified && user.email?.toLowerCase() === 'sinfoxmedia@gmail.com';
            if (isOwner) {
              await AuthService.provisionVerifiedOwner();
              const ownerProfile = await UserService.getUserProfile(user.uid);
              updateAndCacheProfile(ownerProfile);
            } else {
              const newProfile: UserProfile = {
                uid: user.uid,
                email: user.email || '',
                name: user.displayName || user.phoneNumber || 'BioCart Customer',
                role: 'customer',
                phoneNumber: user.phoneNumber || undefined,
                phone: user.phoneNumber || undefined,
                status: 'active',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              await UserService.saveProfile(newProfile);
              updateAndCacheProfile(newProfile);
            }
          }
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
  }, [updateAndCacheProfile, showNotification]);

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
  }, [startLoading, stopLoading, showNotification]);

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
