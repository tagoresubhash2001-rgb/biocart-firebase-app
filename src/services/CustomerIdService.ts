import { doc, runTransaction } from 'firebase/firestore';
import { db } from '../config/firebase';
import { UserProfile } from '../types/backend';
import { UserService } from './UserService';

/**
 * Three-letter English month abbreviations
 */
const MONTH_NAMES = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
];

/**
 * Business timezone for BioCart India (Asia/Kolkata)
 */
export const BUSINESS_TIMEZONE = 'Asia/Kolkata';

/**
 * Formats a serial number and date into BioCart Customer ID: MMMNNNNYY
 * Example: October 2026, Serial 1 -> OCT000126
 * If serial exceeds 9999, it expands naturally to 5 or more digits (e.g. OCT1000026).
 */
export function formatCustomerId(serial: number, date: Date = new Date()): string {
  if (!Number.isInteger(serial) || serial <= 0) {
    throw new Error(`Customer ID serial must be a positive integer, received: ${serial}`);
  }

  // Format date in Asia/Kolkata timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIMEZONE,
    month: 'numeric',
    year: '2-digit',
  });

  const parts = formatter.formatToParts(date);
  const monthNum = parseInt(parts.find((p) => p.type === 'month')?.value || '1', 10);
  const yearStr = parts.find((p) => p.type === 'year')?.value || '26';

  const monthAbbr = MONTH_NAMES[(monthNum - 1 + 12) % 12];
  const paddedSerial = serial.toString().padStart(4, '0');

  return `${monthAbbr}${paddedSerial}${yearStr}`;
}

/**
 * Validates whether a string matches the required BioCart Customer ID format: MMMNNNNYY
 */
export function isValidCustomerId(id: string | null | undefined): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^[A-Z]{3}\d{4,}\d{2}$/.test(id);
}

/**
 * Allocates the next unique, globally increasing customer serial number and formats the ID.
 * Concurrency-safe: executes inside a Firestore atomic transaction.
 */
export async function allocateNextCustomerId(registrationDate: Date = new Date()): Promise<string> {
  const counterRef = doc(db, 'counters', 'customers');

  try {
    const nextSerial = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(counterRef);
      let current = 0;
      if (snap.exists()) {
        const data = snap.data();
        if (typeof data?.currentSerial === 'number' && Number.isFinite(data.currentSerial)) {
          current = data.currentSerial;
        }
      }

      const allocated = current + 1;
      transaction.set(counterRef, {
        currentSerial: allocated,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      return allocated;
    });

    return formatCustomerId(nextSerial, registrationDate);
  } catch (err: any) {
    console.error('Failed to allocate unique customer ID:', err);
    throw new Error(`Unable to generate Customer ID: ${err?.message || 'Transaction aborted'}`);
  }
}

/**
 * Ensures a customer profile contains a permanent Customer ID.
 * If already assigned, preserves it. If missing, allocates one safely and saves it.
 */
export async function ensureCustomerIdForProfile(profile: UserProfile): Promise<UserProfile> {
  // If already has a valid Customer ID, preserve it
  if (isValidCustomerId(profile.customerId)) {
    return profile;
  }

  // Allocate new ID using profile's registration timestamp (createdAt)
  const regDate = profile.createdAt ? new Date(profile.createdAt) : new Date();
  const customerId = await allocateNextCustomerId(isNaN(regDate.getTime()) ? new Date() : regDate);

  // Persist to Firestore
  try {
    await UserService.updateProfile(profile.uid, { customerId });
  } catch (err) {
    console.warn(`Failed saving customer ID ${customerId} to profile ${profile.uid}:`, err);
  }

  return { ...profile, customerId };
}
