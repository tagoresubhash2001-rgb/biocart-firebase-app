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
  ConfirmationResult,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  verifyBeforeUpdateEmail,
  updateProfile
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
  return mobileRegex.test(userAgent);
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
   * Attempts popup authentication first; falls back to redirect if popup is blocked or on mobile.
   */
  static async loginWithGoogle(): Promise<FirebaseUser | null> {
    try {
      if (isMobileDevice()) {
        try {
          const result = await signInWithPopup(auth, googleProvider);
          return result.user;
        } catch (popupErr: any) {
          if (popupErr?.code === 'auth/popup-blocked' || popupErr?.code === 'auth/cancelled-popup-request') {
            console.warn('Popup blocked on mobile device, falling back to signInWithRedirect...');
            await signInWithRedirect(auth, googleProvider);
            return null;
          }
          throw popupErr;
        }
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
   * Safely normalize phone numbers to E.164 format.
   * Handles Indian local conventions (leading 0s, spaces, hyphens) and international codes.
   */
  static normalizePhoneNumber(rawNumber: string, defaultCountryCode: string = '+91'): string {
    if (!rawNumber || typeof rawNumber !== 'string') {
      throw new Error('Please enter a mobile phone number.');
    }

    // Strip all whitespace, hyphens, and parentheses
    let cleaned = rawNumber.trim().replace(/[\s\-\(\)]/g, '');

    if (cleaned.startsWith('+')) {
      // If user typed +91... or another country code
      if (cleaned.startsWith('+91')) {
        let digits = cleaned.slice(3).replace(/^0+/, ''); // Strip leading zeros after +91
        if (!/^[6-9]\d{9}$/.test(digits)) {
          throw new Error('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
        }
        return `+91${digits}`;
      }

      // Other international country codes (E.164 format: + followed by 7 to 15 digits)
      if (!/^\+[1-9]\d{6,14}$/.test(cleaned)) {
        throw new Error('Please enter a valid phone number in international format (e.g. +91 9876543210).');
      }
      return cleaned;
    }

    // Numbers entered without a leading +
    cleaned = cleaned.replace(/^0+/, ''); // Strip leading 0 (common STD/trunk dialing prefix in India)

    if (defaultCountryCode === '+91') {
      // If entered as 91XXXXXXXXXX (12 digits starting with 91)
      if (/^91[6-9]\d{9}$/.test(cleaned)) {
        return `+${cleaned}`;
      }
      // If entered as 10 digits (standard Indian mobile format)
      if (/^[6-9]\d{9}$/.test(cleaned)) {
        return `+91${cleaned}`;
      }
      throw new Error('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9 (e.g. 98765 43210).');
    }

    // General fallback using default country code
    const normalized = `${defaultCountryCode}${cleaned}`;
    if (!/^\+[1-9]\d{6,14}$/.test(normalized)) {
      throw new Error('Please enter a valid phone number with country code.');
    }
    return normalized;
  }

  /**
   * Initialize or return an active RecaptchaVerifier with clean DOM reset
   */
  static getRecaptchaVerifier(containerId: string = 'recaptcha-container'): RecaptchaVerifier {
    if (typeof window === 'undefined') {
      throw new Error('reCAPTCHA can only be initialized in the browser.');
    }

    // Clear any existing active verifier to prevent stale widget or duplicate binding
    AuthService.clearRecaptcha(containerId);

    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`reCAPTCHA container '#${containerId}' was not found in the DOM.`);
    }

    // Ensure container is empty before re-attaching
    container.innerHTML = '';

    AuthService.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved automatically by invisible challenge
      },
      'expired-callback': () => {
        console.warn('reCAPTCHA token expired. Clearing verifier for retry.');
        AuthService.clearRecaptcha(containerId);
      }
    });

    return AuthService.recaptchaVerifier;
  }

  /**
   * Clear active RecaptchaVerifier instance and reset its DOM container
   */
  static clearRecaptcha(containerId: string = 'recaptcha-container'): void {
    if (AuthService.recaptchaVerifier) {
      try {
        AuthService.recaptchaVerifier.clear();
      } catch (e) {
        console.warn('Error clearing RecaptchaVerifier:', e);
      }
      AuthService.recaptchaVerifier = null;
    }

    if (typeof document !== 'undefined') {
      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML = '';
      }
    }
  }

  /**
   * Send Phone OTP verification code via SMS with E.164 normalization
   */
  static async sendPhoneOtp(
    phoneNumber: string, 
    containerId: string = 'recaptcha-container'
  ): Promise<ConfirmationResult> {
    try {
      const normalizedPhone = AuthService.normalizePhoneNumber(phoneNumber);
      const verifier = AuthService.getRecaptchaVerifier(containerId);
      const confirmationResult = await signInWithPhoneNumber(auth, normalizedPhone, verifier);
      return confirmationResult;
    } catch (err) {
      AuthService.clearRecaptcha(containerId);
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
      if (!confirmationResult || typeof confirmationResult.confirm !== 'function') {
        throw new Error('Verification session has expired or is invalid. Please request a new OTP.');
      }

      const trimmedOtp = otpCode.trim().replace(/\D/g, '');
      if (trimmedOtp.length !== 6) {
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
    const allowedAdmins = ['sinfoxmedia@gmail.com', 'tagoresubhash2001@gmail.com'];
    const email = user?.email?.toLowerCase();
    if (!user || !email || !allowedAdmins.includes(email) || !user.emailVerified) return;
    // Refresh the ID token so the callable sees the latest email_verified claim.
    await user.getIdToken(true);
    const { httpsCallable } = await import('firebase/functions');
    const { functions } = await import('../config/firebase');
    const provision = httpsCallable(functions, 'provisionBioCartOwner');
    const defaultName = email === 'tagoresubhash2001@gmail.com' ? 'Subhash Tagore' : 'BioCart Administrator';
    await provision({ displayName: user.displayName || defaultName });
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
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (phoneNumber) {
        newProfile.phoneNumber = phoneNumber;
        newProfile.phone = phoneNumber;
      }
      if (location) {
        newProfile.location = location;
      }
      
      try {
        await UserService.saveProfile(newProfile);
      } catch (e) { console.warn("Failed saving normal registration profile", e); }
      return user;
    } catch (err) {
      throw normalizeError(err);
    }
  }

  /**
   * Securely change login email address with reauthentication and verification
   */
  static async updateAdminEmail(currentPassword: string, newEmail: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No administrator is currently authenticated.');
    }
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      throw new Error('Please enter a valid email address.');
    }

    try {
      if (user.email && currentPassword) {
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
      }
      // Firebase Auth v9+ requires verifyBeforeUpdateEmail for secure email transitions
      await verifyBeforeUpdateEmail(user, cleanEmail);
    } catch (err) {
      throw normalizeError(err);
    }
  }

  /**
   * Update administrator profile display metadata
   */
  static async updateAdminProfile(name: string, photoURL?: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No administrator is currently authenticated.');
    }
    try {
      await updateProfile(user, {
        displayName: name.trim(),
        ...(photoURL ? { photoURL: photoURL.trim() } : {})
      });
      await UserService.updateProfile(user.uid, {
        name: name.trim(),
        ...(photoURL ? { photoURL: photoURL.trim() } : {}),
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      throw normalizeError(err);
    }
  }

  /**
   * Securely change password for current user with reauthentication support
   */
  static async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user is currently authenticated.');
    }
    if (!newPassword || newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long.');
    }

    try {
      if (user.email && currentPassword) {
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
      }
      await updatePassword(user, newPassword);
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
