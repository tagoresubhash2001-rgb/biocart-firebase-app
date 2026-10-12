import { UserProfile, UserRole } from '../types/backend';
import { FirestoreBaseRepository } from './BaseRepository';
import { normalizeError } from '../utils/errors';
import { updateDoc } from 'firebase/firestore';

export class UserRepository extends FirestoreBaseRepository<UserProfile> {
  constructor() {
    super('users');
  }

  /**
   * Safe registration of a user profile
   */
  async createProfile(profile: UserProfile): Promise<void> {
    return this.create(profile.uid, profile);
  }

  /**
   * Update the user's role (restricted admin utility)
   */
  async updateRole(uid: string, role: UserRole): Promise<void> {
    try {
      const ref = this.getDocRef(uid);
      await updateDoc(ref, {
        role,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      throw normalizeError(err);
    }
  }

  /**
   * Update last login timestamp for security and user tracking
   */
  async updateLastLogin(uid: string): Promise<void> {
    try {
      const ref = this.getDocRef(uid);
      await updateDoc(ref, {
        lastLoginAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      throw normalizeError(err);
    }
  }
}

// Single instance export for dependency management
export const userRepository = new UserRepository();
export default userRepository;
