import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

const getEnvVar = (key: string): string => {
  const metaEnv = (import.meta as any).env;
  if (metaEnv && metaEnv[key]) {
    return metaEnv[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return '';
};

// Canonical BioCart Firebase Configuration
export const firebaseConfig = {
  // Firebase web config is public client configuration. Keeping these values
  // as fallbacks lets Firebase Hosting builds work when no local .env file is
  // present; environment values can still override them for other projects.
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY') || 'AIzaSyDk_PmLfTo7g8xIdVv1b-p9pGmALYwHUOA',
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN') || 'bio-cart.firebaseapp.com',
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID') || 'bio-cart',
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET') || 'bio-cart.firebasestorage.app',
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID') || '941267141960',
  appId: getEnvVar('VITE_FIREBASE_APP_ID') || '1:941267141960:web:1a4da53ee13d8f54d61f7d'
};

// Strict production project enforcement: guarantee the application targets 'bio-cart'
export const EXPECTED_PRODUCTION_PROJECT_ID = 'bio-cart';

if (firebaseConfig.projectId !== EXPECTED_PRODUCTION_PROJECT_ID) {
  const errMsg = `[FATAL] Firebase Project ID mismatch: detected "${firebaseConfig.projectId}", but authoritative production target is "${EXPECTED_PRODUCTION_PROJECT_ID}". Halting initialization.`;
  console.error(errMsg);
  if (typeof window !== 'undefined') {
    // Prevent unauthenticated or corrupted writes to wrong project
    throw new Error(errMsg);
  }
}

// Check for missing required config values to prevent silent fallback
const missingKeys = Object.entries(firebaseConfig)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingKeys.length > 0) {
  console.error('Firebase config missing required keys:', missingKeys);
}

// Singleton initialization to prevent multiple Firebase App errors
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
const databaseId = getEnvVar('VITE_FIREBASE_FIRESTORE_DATABASE_ID');

// Initialize Firestore with experimentalAutoDetectLongPolling to eliminate ERR_QUIC_PROTOCOL_ERROR.QUIC_TOO_MANY_RTOs
export const db = (() => {
  try {
    return (databaseId && databaseId !== '(default)')
      ? initializeFirestore(app, { experimentalAutoDetectLongPolling: true }, databaseId)
      : initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
  } catch (_e) {
    return (databaseId && databaseId !== '(default)') ? getFirestore(app, databaseId) : getFirestore(app);
  }
})();

export const storage = getStorage(app, `gs://${firebaseConfig.storageBucket}`);
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export default app;

export const functions = getFunctions(app, 'asia-southeast1');
