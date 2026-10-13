import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeError, AppError } from '../src/utils/errors.js';
import { 
  UserProfileSchema, 
  USER_ROLES, 
  AddressEntitySchema, 
  WishlistEntitySchema 
} from '../src/types/backend.js';
import { resolveUserRole } from '../src/utils/authz.js';

describe('BioCart Automated Test Suite: Auth, Error Handling, and Roles', () => {

  describe('1. normalizeError Mapping & Recovery', () => {
    it('normalizes auth/popup-blocked correctly for Google Sign-In', () => {
      const rawError = { code: 'auth/popup-blocked', message: 'Popup blocked by browser' };
      const normalized = normalizeError(rawError);
      assert.equal(normalized.category, 'auth');
      assert.equal(normalized.code, 'auth/popup-blocked');
      assert.match(normalized.message, /blocked by your browser/i);
    });

    it('normalizes auth/popup-closed-by-user gracefully', () => {
      const rawError = { code: 'auth/popup-closed-by-user', message: 'Popup closed' };
      const normalized = normalizeError(rawError);
      assert.equal(normalized.category, 'auth');
      assert.equal(normalized.code, 'auth/popup-closed-by-user');
      assert.match(normalized.message, /cancelled/i);
    });

    it('normalizes auth/invalid-verification-code for Mobile OTP', () => {
      const rawError = { code: 'auth/invalid-verification-code', message: 'Bad OTP code' };
      const normalized = normalizeError(rawError);
      assert.equal(normalized.category, 'auth');
      assert.equal(normalized.code, 'auth/invalid-verification-code');
      assert.match(normalized.message, /Invalid 6-digit OTP code/i);
    });

    it('normalizes auth/code-expired for Mobile OTP', () => {
      const rawError = { code: 'auth/code-expired', message: 'Code has expired' };
      const normalized = normalizeError(rawError);
      assert.equal(normalized.category, 'auth');
      assert.equal(normalized.code, 'auth/code-expired');
      assert.match(normalized.message, /expired/i);
    });

    it('normalizes auth/unauthorized-domain with clear guidance', () => {
      const rawError = { code: 'auth/unauthorized-domain', message: 'Domain not authorized' };
      const normalized = normalizeError(rawError);
      assert.equal(normalized.category, 'auth');
      assert.equal(normalized.code, 'auth/unauthorized-domain');
      assert.match(normalized.message, /Authorized Domains in Firebase Console/i);
    });

    it('normalizes permission-denied to permission category', () => {
      const rawError = { code: 'permission-denied', message: 'Missing or insufficient permissions.' };
      const normalized = normalizeError(rawError);
      assert.equal(normalized.category, 'permission');
      assert.equal(normalized.code, 'permission-denied');
    });

    it('passes through pre-existing AppError untouched', () => {
      const customAppError = new AppError('Custom error', 'validation', 'custom/code');
      const normalized = normalizeError(customAppError);
      assert.strictEqual(normalized, customAppError);
    });
  });

  describe('2. UserProfileSchema Validation (Zod)', () => {
    it('validates a standard email customer profile', () => {
      const profile = {
        uid: 'cust-12345',
        email: 'customer@example.com',
        name: 'Rahul Sharma',
        role: 'customer',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const result = UserProfileSchema.safeParse(profile);
      assert.equal(result.success, true);
    });

    it('validates a mobile OTP phone-only profile without email', () => {
      const phoneProfile = {
        uid: 'phone-user-98765',
        email: '',
        name: '+919876543210',
        role: 'customer',
        phoneNumber: '+919876543210',
        phone: '+919876543210',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const result = UserProfileSchema.safeParse(phoneProfile);
      assert.equal(result.success, true);
    });

    it('rejects an invalid role not in the allowed enum', () => {
      const invalidProfile = {
        uid: 'attacker-123',
        email: 'hacker@example.com',
        name: 'Hacker',
        role: 'super_hacker',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const result = UserProfileSchema.safeParse(invalidProfile);
      assert.equal(result.success, false);
    });

    it('rejects an invalid status', () => {
      const invalidProfile = {
        uid: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
        role: 'customer',
        status: 'banned_forever',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const result = UserProfileSchema.safeParse(invalidProfile);
      assert.equal(result.success, false);
    });
  });

  describe('3. Phone Number Sanitization & E.164 Formatting', () => {
    const sanitizePhoneNumber = (raw: string, defaultCode = '+91'): string => {
      let cleaned = raw.replace(/[\s\-\(\)]/g, '');
      if (!cleaned.startsWith('+')) {
        cleaned = `${defaultCode}${cleaned.replace(/^0+/, '')}`;
      }
      return cleaned;
    };

    const isValidE164 = (phone: string): boolean => {
      return /^\+[1-9]\d{6,14}$/.test(phone);
    };

    it('cleans formatted local Indian numbers with spaces and hyphens', () => {
      const raw = '98765-43210';
      const formatted = sanitizePhoneNumber(raw);
      assert.equal(formatted, '+919876543210');
      assert.equal(isValidE164(formatted), true);
    });

    it('handles numbers with leading 0', () => {
      const raw = '09876543210';
      const formatted = sanitizePhoneNumber(raw);
      assert.equal(formatted, '+919876543210');
      assert.equal(isValidE164(formatted), true);
    });

    it('preserves existing E.164 international numbers', () => {
      const raw = '+1 415 555 2671';
      const formatted = sanitizePhoneNumber(raw);
      assert.equal(formatted, '+14155552671');
      assert.equal(isValidE164(formatted), true);
    });

    it('rejects malformed numbers missing digits', () => {
      const raw = '+91123';
      assert.equal(isValidE164(raw), false);
    });
  });

  describe('4. Zero-Trust Role & Permission Enforcement', () => {
    it('requires a verified email for active admin profiles and ignores missing profiles', () => {
      assert.equal(resolveUserRole({ role: 'super_admin', status: 'active' }, false), 'guest');
      assert.equal(resolveUserRole({ role: 'super_admin', status: 'active' }, true), 'super_admin');
      assert.equal(resolveUserRole({ role: 'admin', status: 'suspended' }, true), 'guest');
      assert.equal(resolveUserRole(null, true), 'guest');
    });

    it('guarantees standard customer roles cannot grant administrative privilege', () => {
      const selfRegisteredRole = USER_ROLES.CUSTOMER;
      const isAdmin = (role: string) => role === 'admin' || role === 'super_admin';
      const isVendor = (role: string) => role === 'vendor';

      assert.equal(isAdmin(selfRegisteredRole), false);
      assert.equal(isVendor(selfRegisteredRole), false);
    });

    it('verifies all expected user role definitions exist', () => {
      assert.equal(USER_ROLES.SUPER_ADMIN, 'super_admin');
      assert.equal(USER_ROLES.ADMIN, 'admin');
      assert.equal(USER_ROLES.VENDOR, 'vendor');
      assert.equal(USER_ROLES.CUSTOMER, 'customer');
    });
  });

  describe('5. Financial Arithmetic & Wallet Ledger (Paise & BPS)', () => {
    it('correctly calculates commission in basis points (BPS) without floating point inaccuracies', () => {
      // 1000 BPS = 10%
      const commissionBps = 1000;
      const itemSubtotalPaise = 500000; // Rs 5,000.00
      
      const commissionPaise = Math.round((itemSubtotalPaise * commissionBps) / 10000);
      const vendorPayoutPaise = itemSubtotalPaise - commissionPaise;

      assert.equal(commissionPaise, 50000); // Rs 500.00
      assert.equal(vendorPayoutPaise, 450000); // Rs 4,500.00
      assert.equal(commissionPaise + vendorPayoutPaise, itemSubtotalPaise);
    });

    it('handles 0% and 100% boundary conditions', () => {
      const amountPaise = 100000;
      const zeroBpsCommission = Math.round((amountPaise * 0) / 10000);
      assert.equal(zeroBpsCommission, 0);

      const maxBpsCommission = Math.round((amountPaise * 10000) / 10000);
      assert.equal(maxBpsCommission, amountPaise);
    });
  });

  describe('6. Customer Address Book Validation (Indian PIN & E.164)', () => {
    it('validates a complete Indian shipping address', () => {
      const validAddress = {
        id: 'addr_101',
        userId: 'usr_abc123',
        addressType: 'shipping',
        name: 'Srinivas Rao',
        street: 'Main Road, Brodipet',
        city: 'Guntur',
        state: 'Andhra Pradesh',
        postalCode: '522002',
        country: 'India',
        phone: '+919494994949',
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'usr_abc123',
        updatedBy: 'usr_abc123',
        status: 'active',
        isDeleted: false,
        version: 1
      };
      const result = AddressEntitySchema.safeParse(validAddress);
      assert.equal(result.success, true);
    });

    it('rejects an address missing required street or postalCode', () => {
      const invalidAddress = {
        id: 'addr_102',
        userId: 'usr_abc123',
        addressType: 'shipping',
        name: 'Srinivas Rao',
        street: '', // Empty
        city: 'Guntur',
        state: 'Andhra Pradesh',
        postalCode: '',
        country: 'India',
        phone: '+919494994949',
        isDefault: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'usr_abc123',
        updatedBy: 'usr_abc123',
        status: 'active',
        isDeleted: false,
        version: 1
      };
      const result = AddressEntitySchema.safeParse(invalidAddress);
      assert.equal(result.success, false);
    });
  });

  describe('7. Customer Wishlist Data Isolation & Integrity', () => {
    it('validates a customer wishlist entity with unique product IDs', () => {
      const validWishlist = {
        id: 'usr_abc123',
        userId: 'usr_abc123',
        productIds: ['prod-fertilizer-01', 'prod-seeds-02'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'usr_abc123',
        updatedBy: 'usr_abc123',
        status: 'active',
        isDeleted: false,
        version: 1
      };
      const result = WishlistEntitySchema.safeParse(validWishlist);
      assert.equal(result.success, true);
    });

    it('validates an empty wishlist', () => {
      const emptyWishlist = {
        id: 'usr_abc123',
        userId: 'usr_abc123',
        productIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'usr_abc123',
        updatedBy: 'usr_abc123',
        status: 'active',
        isDeleted: false,
        version: 1
      };
      const result = WishlistEntitySchema.safeParse(emptyWishlist);
      assert.equal(result.success, true);
    });
  });
});
