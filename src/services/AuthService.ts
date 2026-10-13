import { 
  auth, 
  googleProvider 
} from '../config/firebase';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  User as FirebaseUser,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult
} from 'firebase/auth';
import { UserProfile, UserRole } from '../types/backend';
import { UserService } from './UserService';
import { normalizeError } from '../utils/errors';

export type { ConfirmationResult };

/**
 * Detect mobile devices to prefer redirect over popup
 */
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const isTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 768;
  return mobileRegex.test(userAgent) || (isTouchScreen && isSmallScreen);
};

export class AuthService {
  private static recaptchaVerifier: RecaptchaVerifier | null = null;

  /**
   * Safe login with email or username and password
   */
  static async login(emailOrUsername: string, password: string): Promise<FirebaseUser> {
    try {
      const targetEmail = emailOrUsername.trim().toLowerCase();

      const result = await signInWithEmailAndPassword(auth, targetEmail, password);
      if (result.user) {
        if (!result.user.emailVerified) await sendEmailVerification(result.user);
      }
      return result.user;
    } catch (err) {
      throw normalizeError(err);
    }
  }

  /**
   * Google OAuth Authentication
   * Uses redirect on mobile devices and popup on desktop with redirect fallback.
   */
  static async loginWithGoogle(): Promise<FirebaseUser | null> {
    try {
      if (isMobileDevice()) {
        await signInWithRedirect(auth, googleProvider);
        return null;
      }

      try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
      } catch (popupErr: any) {
        if (popupErr?.code === 'auth/popup-blocked') {
          console.warn('Popup blocked by browser, falling back to signInWithRedirect...');
          await signInWithRedirect(auth, googleProvider);
          return null;
        }
        throw popupErr;
      }
    } catch (err) {
      throw normalizeError(err);
    }
  }

  /**
   * Check and resolve redirect-based Google authentication results
   */
  static async checkRedirectResult(): Promise<FirebaseUser | null> {
    try {
      const result = await getRedirectResult(auth);
      if (result?.user) {
        return result.user;
      }
      return null;
    } catch (err) {
      throw normalizeError(err);
    }
  }

  /**
   * Initialize or return an active RecaptchaVerifier
   */
  static getRecaptchaVerifier(containerId: string = 'recaptcha-container'): RecaptchaVerifier {
    if (typeof window === 'undefined') {
      throw new Error('reCAPTCHA can only be initialized in the browser.');
    }

    if (AuthService.recaptchaVerifier) {
      try {
        AuthService.recaptchaVerifier.clear();
      } catch (e) {
        console.warn('Error clearing previous RecaptchaVerifier:', e);
      }
      AuthService.recaptchaVerifier = null;
    }

    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`reCAPTCHA container '#${containerId}' was not found in the DOM.`);
    }

    AuthService.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved automatically
      },
      'expired-callback': () => {
        console.warn('reCAPTCHA expired. Clearing verifier.');
        AuthService.clearRecaptcha();
      }
    });

    return AuthService.recaptchaVerifier;
  }

  /**
   * Clear active RecaptchaVerifier instance
   */
  static clearRecaptcha(): void {
    if (AuthService.recaptchaVerifier) {
      try {
        AuthService.recaptchaVerifier.clear();
      } catch (e) {
        console.warn('Error clearing RecaptchaVerifier:', e);
      }
      AuthService.recaptchaVerifier = null;
    }
  }

  /**
   * Send Phone OTP verification code via SMS
   */
  static async sendPhoneOtp(
    phoneNumber: string, 
    containerId: string = 'recaptcha-container'
  ): Promise<ConfirmationResult> {
    try {
      const formatted = phoneNumber.trim().replace(/\s+/g, '');
      if (!/^\+[1-9]\d{7,14}$/.test(formatted)) {
        throw new Error('Please enter a valid phone number with country code (e.g. +91 9876543210).');
      }

      const verifier = AuthService.getRecaptchaVerifier(containerId);
      const confirmationResult = await signInWithPhoneNumber(auth, formatted, verifier);
      return confirmationResult;
    } catch (err) {
      AuthService.clearRecaptcha();
      throw normalizeError(err);
    }
  }

  /**
   * Verify Phone OTP code
   */
  static async verifyPhoneOtp(
    confirmationResult: ConfirmationResult, 
    otpCode: string
  ): Promise<FirebaseUser> {
    try {
      const trimmedOtp = otpCode.trim();
      if (!trimmedOtp || trimmedOtp.length < 6) {
        throw new Error('Please enter the complete 6-digit verification code.');
      }

      const result = await confirmationResult.confirm(trimmedOtp);
      AuthService.clearRecaptcha();

      return result.user;
    } catch (err) {
      throw normalizeError(err);
    }
  }

  static async provisionVerifiedOwner(): Promise<void> {
    const user = auth.currentUser;
    if (!user?.email || user.email.toLowerCase() !== 'sinfoxmedia@gmail.com' || !user.emailVerified) return;
    // Refresh the ID token so the callable sees the latest email_verified claim.
    await user.getIdToken(true);
    const { httpsCallable } = await import('firebase/functions');
    const { functions } = await import('../config/firebase');
    const provision = httpsCallable(functions, 'provisionBioCartOwner');
    await provision({ displayName: user.displayName || 'BioCart Owner' });
  }

  /**
   * Account registration with default profile provisioning
   */
  static async register(
    email: string, 
    password: string, 
    name: string,
    phoneNumber?: string,
    location?: string
  ): Promise<FirebaseUser> {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const result = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      const user = result.user;

      // Provision new user profile document
      await sendEmailVerification(user);
      const role: UserRole = 'customer';

      const newProfile: UserProfile = {
        uid: user.uid,
        email: normalizedEmail,
        name,
        role,
        phoneNumber,
        location,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      try {
        await UserService.saveProfile(newProfile);
      } catch (e) { console.warn("Failed saving normal registration profile", e); }
      return user;
    } catch (err) {
      throw normalizeError(err);
    }
  }

  /**
   * Password reset request trigger
   */
  static async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      throw normalizeError(err);
    }
  }

  /**
   * Trigger active email verification link
   */
  static async sendVerification(): Promise<void> {
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
      } else {
        throw new Error('No user is currently authenticated.');
      }
    } catch (err) {
      throw normalizeError(err);
    }
  }

  /**
   * Session Termination
   */
  static async logout(): Promise<void> {
    try {
      AuthService.clearRecaptcha();
      await signOut(auth);
    } catch (err) {
      throw normalizeError(err);
    }
  }

  /**
   * Observe Authentication state change (Core connection to context)
   */
  static onAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  }
}
export default AuthService;
