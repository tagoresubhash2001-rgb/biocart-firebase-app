export type AppErrorCategory = 'auth' | 'permission' | 'network' | 'validation' | 'unknown';

export class AppError extends Error {
  public category: AppErrorCategory;
  public code: string;

  constructor(message: string, category: AppErrorCategory = 'unknown', code: string = 'unknown') {
    super(message);
    this.name = 'AppError';
    this.category = category;
    this.code = code;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Standardizes any Firebase or system error into a normalized AppError.
 */
export function normalizeError(error: any): AppError {
  if (error instanceof AppError) {
    return error;
  }

  const message = error?.message || 'An unexpected error occurred';
  const code = error?.code || 'unknown';

  // Check for offline/network status
  if (!navigator.onLine) {
    return new AppError('No internet connection. Please check your network and try again.', 'network', 'offline');
  }

  // Map Firebase Auth and Firestore codes
  switch (code) {
    // Firebase Auth Codes
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return new AppError('Invalid email or password. Please double-check your credentials.', 'auth', code);
    case 'auth/email-already-in-use':
      return new AppError('An account with this email already exists.', 'auth', code);
    case 'auth/weak-password':
      return new AppError('Password is too weak. It must be at least 6 characters long.', 'auth', code);
    case 'auth/too-many-requests':
      return new AppError('Too many failed attempts. This account is temporarily locked. Please try again later.', 'auth', code);
    case 'auth/network-request-failed':
      return new AppError('A network error occurred. Please check your internet connection.', 'network', code);
    case 'auth/user-disabled':
      return new AppError('This user account has been disabled or suspended.', 'auth', code);
    case 'auth/requires-recent-login':
      return new AppError('This sensitive operation requires you to log in again.', 'auth', code);
    case 'auth/invalid-email':
      return new AppError('The email address format is invalid.', 'auth', code);
    case 'auth/account-exists-with-different-credential':
      return new AppError('This email already has a password account. Sign in with email and password, or use Forgot? to reset it.', 'auth', code);

    // Firebase Firestore Codes
    case 'permission-denied':
      return new AppError('You do not have permission to access or modify this resource.', 'permission', code);
    case 'unavailable':
      return new AppError('The database service is temporarily offline. Please retry in a few seconds.', 'network', code);
    case 'deadline-exceeded':
      return new AppError('The database operation timed out. Please check your network.', 'network', code);
    case 'not-found':
      return new AppError('The requested document or resource was not found.', 'validation', code);

    default:
      // Map based on message signatures
      if (message.includes('permission') || message.includes('denied')) {
        return new AppError('Access denied. Insufficient privileges.', 'permission', 'permission-denied');
      }
      if (message.includes('network') || message.includes('fetch') || message.includes('offline')) {
        return new AppError('Network disruption detected. Retrying connectivity...', 'network', 'offline');
      }
      return new AppError(message, 'unknown', code);
  }
}

/**
 * High-reliability utility to retry an asynchronous operation.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 1000,
  factor = 2
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const normalized = normalizeError(error);
    if (retries <= 0 || normalized.category !== 'network') {
      throw normalized;
    }
    console.warn(`Operation failed, retrying in ${delayMs}ms... (${retries} attempts left). Error: ${normalized.message}`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return retryWithBackoff(fn, retries - 1, delayMs * factor, factor);
  }
}
