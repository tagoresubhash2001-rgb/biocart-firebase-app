import { 
  auth, 
  googleProvider 
} from '../config/firebase';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  RecaptchaVerifier,
  ConfirmationResult,
  signInWithPhoneNumber,
  User as FirebaseUser,
  onAuthStateChanged
} from 'firebase/auth';
import { UserProfile, UserRole } from '../types/backend';
import { UserService } from './UserService';
import { normalizeError } from '../utils/errors';

export class AuthService {
  static async sendPhoneCode(phoneNumber: string, verifier: RecaptchaVerifier): Promise<ConfirmationResult> {
    try {
      return await signInWithPhoneNumber(auth, phoneNumber, verifier);
    } catch (err) {
      throw normalizeError(err);
    }
  }

  /**
   * Safe login with email or username and password
   */
  static async login(emailOrUsername: string, password: string): Promise<FirebaseUser> {
    try {
      const targetEmail = emailOrUsername.trim().toLowerCase();

      const result = await signInWithEmailAndPassword(auth, targetEmail, password);
      if (result.user) {
        if (!result.user.emailVerified) await sendEmailVerification(result.user);
        const profile = await UserService.getUserProfile(result.user.uid);
        if (profile) await UserService.updateLastLogin(result.user.uid);
      }
      return result.user;
    } catch (err) {
      throw normalizeError(err);
    }
  }


  /**
   * Google OAuth Pop-up Authentication
   */
  static async loginWithGoogle(): Promise<FirebaseUser> {
    try {
      const result = await signInWithPopup(auth, googleProvider);
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
