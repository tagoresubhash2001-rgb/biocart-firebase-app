import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { UserProfile, UserRole } from '../types/backend';
import { AuthService } from '../services/AuthService';
import { UserService } from '../services/UserService';
import { useLoading } from './LoadingContext';
import { useNotification } from './NotificationContext';
import { normalizeError } from '../utils/errors';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  userRole: UserRole;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, name: string, phoneNumber?: string, location?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  sendEmailVerification: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasRole: (allowedRoles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    try {
      const cached = localStorage.getItem('biocart_cached_user_profile');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [isAuthenticating, setIsAuthenticating] = useState(true);

  const { startLoading, stopLoading } = useLoading();
  const { showNotification } = useNotification();

  const userRole = useMemo<UserRole>(() => {
    return userProfile?.role || 'guest';
  }, [userProfile]);

  const isAuthenticated = useMemo<boolean>(() => {
    return !!firebaseUser;
  }, [firebaseUser]);

  // Helper to securely update the react state and the localStorage backup
  const updateAndCacheProfile = useCallback((profile: UserProfile | null) => {
    setUserProfile(profile);
    try {
      if (profile) {
        localStorage.setItem('biocart_cached_user_profile', JSON.stringify(profile));
      } else {
        localStorage.removeItem('biocart_cached_user_profile');
      }
    } catch (e) {
      console.warn('Failed to cache user profile in localStorage:', e);
    }
  }, []);

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
        // Safe profile fallback creation
        const isOwner = firebaseUser.emailVerified && firebaseUser.email === 'tagoresubhash2001@gmail.com';
        const fallbackProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || 'BioCart User',
          role: isOwner ? 'super_admin' : 'customer',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        updateAndCacheProfile(fallbackProfile);
        await UserService.saveProfile(fallbackProfile);
      }
    } catch (error) {
      console.error('Failed to sync user profile:', error);
      // Attempt Network Recovery via localStorage cache check
      try {
        const cached = localStorage.getItem('biocart_cached_user_profile');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.uid === firebaseUser.uid) {
            setUserProfile(parsed);
            showNotification('Network offline. Working with local cache.', 'info');
            return;
          }
        }
      } catch (cacheErr) {
        console.error('Failed to read cached profile:', cacheErr);
      }
      showNotification('Unable to sync profile. Check network connection.', 'warning');
    }
  }, [firebaseUser, updateAndCacheProfile, showNotification]);

  // Synchronize on Auth state change
  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChanged(async (user) => {
      setIsAuthenticating(true);
      setFirebaseUser(user);

      if (user) {
        try {
          const profile = await UserService.getUserProfile(user.uid);
          if (profile) {
            const verifiedOwner = user.emailVerified && user.email === 'tagoresubhash2001@gmail.com';
            const resolvedProfile = verifiedOwner && profile.role === 'customer'
              ? { ...profile, role: 'super_admin' as UserRole, updatedAt: new Date().toISOString() }
              : profile;
            updateAndCacheProfile(resolvedProfile);
            if (resolvedProfile !== profile) await UserService.saveProfile(resolvedProfile);
          } else {
            // Provision if missing
            const isOwner = user.emailVerified && user.email === 'tagoresubhash2001@gmail.com';
            const role: UserRole = isOwner ? 'super_admin' : 'customer';
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              name: user.displayName || 'BioCart User',
              role,
              status: 'active',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            updateAndCacheProfile(newProfile);
            await UserService.saveProfile(newProfile);
          }
        } catch (error) {
          console.error('Error in session provisioning:', error);
          // Try local cache loading recovery during offline boot
          try {
            const cached = localStorage.getItem('biocart_cached_user_profile');
            if (cached) {
              const parsed = JSON.parse(cached);
              if (parsed.uid === user.uid) {
                setUserProfile(parsed);
                showNotification('Network offline. Loaded session from cache.', 'info');
              }
            }
          } catch (cacheErr) {
            console.error('Failed cache restoration:', cacheErr);
          }
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
      await AuthService.login(email, password);
      showNotification('Signed in successfully', 'success');
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
      await AuthService.loginWithGoogle();
      showNotification('Google Sign-In completed successfully', 'success');
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
