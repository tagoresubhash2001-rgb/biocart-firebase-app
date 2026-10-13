import { UserProfile, UserRole } from '../types/backend';

/** Resolve the UI role only from a current active profile and verified admin identity. */
export function resolveUserRole(
  profile: Pick<UserProfile, 'role' | 'status'> | null,
  emailVerified: boolean
): UserRole {
  if (profile?.status !== 'active') return 'guest';
  if ((profile.role === 'admin' || profile.role === 'super_admin') && !emailVerified) return 'guest';
  return profile.role;
}
