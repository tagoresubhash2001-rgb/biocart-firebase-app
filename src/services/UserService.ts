import { UserProfile, UserProfileSchema } from '../types/backend';
import { userRepository } from '../repositories/UserRepository';
import { normalizeError } from '../utils/errors';

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
    return { items: [] };
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
