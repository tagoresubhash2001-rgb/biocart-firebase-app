import { UserProfile, UserProfileSchema } from '../types/backend';
import { userRepository } from '../repositories/UserRepository';
import { normalizeError } from '../utils/errors';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

export class UserService {
  /**
   * Safe fetch with profile check
   */
  static async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      return await userRepository.getById(uid);
    } catch (err) {
      throw normalizeError(err);
    }
  }

  static async getUsers(): Promise<{ items: UserProfile[] }> {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const timestampToIso = (value: unknown): string => {
        if (typeof value === 'string') return value;
        if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
          return value.toDate().toISOString();
        }
        return new Date().toISOString();
      };
      const items = snapshot.docs.flatMap((userDoc) => {
        const data = userDoc.data();
        const parsed = UserProfileSchema.safeParse({
          ...data,
          uid: userDoc.id,
          name: typeof data.name === 'string' && data.name.trim().length >= 2
            ? data.name.trim()
            : (typeof data.email === 'string' ? data.email.split('@')[0] : 'BioCart User'),
          createdAt: timestampToIso(data.createdAt),
          updatedAt: timestampToIso(data.updatedAt),
        });
        if (!parsed.success) {
          console.warn(`Skipping invalid user profile ${userDoc.id}:`, parsed.error.issues);
          return [];
        }
        return [parsed.data];
      });
      items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      return { items };
    } catch (err) {
      throw normalizeError(err);
    }
  }

  /**
   * Save a user's profile with strict schema validation
   */
  static async saveProfile(profile: UserProfile): Promise<void> {
    try {
      // Perform strict validation using Zod schema
      const validated = UserProfileSchema.parse(profile);
      await userRepository.createProfile(validated);
    } catch (err) {
      throw normalizeError(err);
    }
  }

  /**
   * Update selective profile fields with schema integrity checking
   */
  static async updateProfile(uid: string, fields: Partial<UserProfile>): Promise<void> {
    try {
      // Fetch the profile first to ensure integrity
      const current = await userRepository.getById(uid);
      if (!current) {
        throw new Error('User profile not found.');
      }

      const merged = { ...current, ...fields, updatedAt: new Date().toISOString() };
      // Validate merged object
      UserProfileSchema.parse(merged);

      await userRepository.update(uid, fields);
    } catch (err) {
      throw normalizeError(err);
    }
  }

  /**
   * Mark user's last login for security tracking
   */
  static async updateLastLogin(uid: string): Promise<void> {
    try {
      await userRepository.updateLastLogin(uid);
    } catch (err) {
      throw normalizeError(err);
    }
  }
}
export default UserService;
