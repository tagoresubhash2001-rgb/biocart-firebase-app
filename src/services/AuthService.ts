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
  User as FirebaseUser,
  onAuthStateChanged
} from 'firebase/auth';
import { UserProfile, UserRole } from '../types/backend';
import { UserService } from './UserService';
import { normalizeError } from '../utils/errors';

export class AuthService {
  /**
   * Safe login with email or username and password
   */
  static async login(emailOrUsername: string, password: string): Promise<FirebaseUser> {
    try {
      const targetEmail = emailOrUsername.trim();

      const result = await signInWithEmailAndPassword(auth, targetEmail, password);
      if (result.user) {
        await UserService.updateLastLogin(result.user.uid);
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
      const user = result.user;
      
      // Check if user profile already exists
      const profile = await UserService.getUserProfile(user.uid);
      if (!profile) {
        // Automatically provision a new Customer (or Admin if matching the administrative email)
        const isOwner = user.emailVerified && user.email === 'tagoresubhash2001@gmail.com';
        const role: UserRole = isOwner ? 'super_admin' : 'customer';

        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          name: user.displayName || 'BioCart User',
          role,
          status: 'active',
          photoURL: user.photoURL || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await UserService.saveProfile(newProfile);
      } else {
        await UserService.updateLastLogin(user.uid);
      }

      return user;
    } catch (err) {
      throw normalizeError(err);
    }
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
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;

      // Provision new user profile document
      const isOwner = user.emailVerified && email === 'tagoresubhash2001@gmail.com';
      const role: UserRole = isOwner ? 'super_admin' : 'customer';

      const newProfile: UserProfile = {
        uid: user.uid,
        email,
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
