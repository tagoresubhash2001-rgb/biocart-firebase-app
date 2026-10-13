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
      return new AppError('This Google email already has an account using a different sign-in method. Sign in with that original method, or use Forgot? to reset its password.', 'auth', code);
    case 'auth/credential-already-in-use':
      return new AppError('This Google account is already linked to another BioCart login. Sign in to the account already linked to Google.', 'auth', code);
    case 'auth/unauthorized-domain':
      return new AppError('This website domain is not authorized for Firebase sign-in. Add biocart.in under Firebase Authentication → Settings → Authorized domains.', 'auth', code);
    case 'auth/popup-blocked':
      return new AppError('Your browser blocked the Google sign-in popup. Allow popups for biocart.in and try again.', 'auth', code);
    case 'auth/popup-closed-by-user':
      return new AppError('Google sign-in was closed before it finished. Try again and complete the Google prompt.', 'auth', code);
    case 'auth/invalid-phone-number':
      return new AppError('Enter a valid phone number with its country code, such as +91 9876543210.', 'auth', code);
    case 'auth/invalid-verification-code':
      return new AppError('That OTP is incorrect or expired. Request a new code and try again.', 'auth', code);
    case 'auth/missing-phone-number':
      return new AppError('Enter your phone number with country code before requesting an OTP.', 'auth', code);
    case 'auth/operation-not-allowed':
      return new AppError('Phone sign-in is not enabled for this Firebase project. Enable Phone in Authentication → Sign-in method.', 'auth', code);
    case 'auth/captcha-check-failed':
    case 'auth/invalid-app-credential':
      return new AppError('Phone verification could not verify this website. Check Firebase Authorized domains and production phone verification setup.', 'auth', code);
    case 'auth/quota-exceeded':
      return new AppError('Firebase SMS quota has been reached. Try later or check the project billing and SMS limits.', 'auth', code);

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
