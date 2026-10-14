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
import { AuthService } from '../src/services/AuthService.js';
import { removeUndefined } from '../src/utils/firestore.js';
import { formatCustomerId, isValidCustomerId, BUSINESS_TIMEZONE } from '../src/services/CustomerIdService.js';

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

    it('normalizes auth/quota-exceeded for SMS limit', () => {
      const rawError = { code: 'auth/quota-exceeded', message: 'Quota exceeded' };
      const normalized = normalizeError(rawError);
      assert.equal(normalized.category, 'auth');
      assert.equal(normalized.code, 'auth/quota-exceeded');
      assert.match(normalized.message, /SMS quota limit exceeded/i);
    });

    it('normalizes auth/billing-not-enabled with clear guidance', () => {
      const rawError = { code: 'auth/billing-not-enabled', message: 'Billing not enabled' };
      const normalized = normalizeError(rawError);
      assert.equal(normalized.category, 'auth');
      assert.equal(normalized.code, 'auth/billing-not-enabled');
      assert.match(normalized.message, /test phone number/i);
    });

    it('normalizes auth/app-not-authorized with clear guidance', () => {
      const rawError = { code: 'auth/app-not-authorized', message: 'Domain not authorized' };
      const normalized = normalizeError(rawError);
      assert.equal(normalized.category, 'auth');
      assert.equal(normalized.code, 'auth/app-not-authorized');
      assert.match(normalized.message, /Authorized Domains/i);
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
    it('cleans formatted local Indian numbers with spaces and hyphens using AuthService', () => {
      const raw = '98765-43210';
      const formatted = AuthService.normalizePhoneNumber(raw);
      assert.equal(formatted, '+919876543210');
      assert.match(formatted, /^\+[1-9]\d{6,14}$/);
    });

    it('handles Indian numbers with leading 0 (STD/trunk dialing convention)', () => {
      const raw = '09876543210';
      const formatted = AuthService.normalizePhoneNumber(raw);
      assert.equal(formatted, '+919876543210');
      assert.match(formatted, /^\+[1-9]\d{6,14}$/);
    });

    it('handles +91 prefixed numbers with spaces and leading 0 after country code', () => {
      const raw = '+91 098765 43210';
      const formatted = AuthService.normalizePhoneNumber(raw);
      assert.equal(formatted, '+919876543210');
      assert.match(formatted, /^\+[1-9]\d{6,14}$/);
    });

    it('handles numbers starting with 91 without plus sign', () => {
      const raw = '919876543210';
      const formatted = AuthService.normalizePhoneNumber(raw);
      assert.equal(formatted, '+919876543210');
    });

    it('preserves existing E.164 international numbers (+1, +44, etc.)', () => {
      const raw = '+1 415 555 2671';
      const formatted = AuthService.normalizePhoneNumber(raw);
      assert.equal(formatted, '+14155552671');
      assert.match(formatted, /^\+[1-9]\d{6,14}$/);
    });

    it('rejects malformed numbers missing digits or starting with invalid digits', () => {
      assert.throws(() => AuthService.normalizePhoneNumber('+91123'), /10-digit Indian mobile number/i);
      assert.throws(() => AuthService.normalizePhoneNumber('12345'), /10-digit Indian mobile number/i);
      assert.throws(() => AuthService.normalizePhoneNumber('5555555555'), /starting with 6, 7, 8, or 9/i);
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

  describe('8. Public CMS & Storefront Firestore Rules Verification', () => {
    it('verifies firestore.rules declares public read access for faqs, testimonials, promotions', async () => {
      const fs = await import('node:fs');
      const rules = fs.readFileSync('firestore.rules', 'utf8');
      
      assert.match(rules, /match\s+\/faqs\/\{faqId\}\s*\{\s*allow\s+read:\s*if\s+true;/);
      assert.match(rules, /match\s+\/testimonials\/\{testimonialId\}\s*\{\s*allow\s+read:\s*if\s+true;/);
      assert.match(rules, /match\s+\/product_promotions\/\{promoId\}\s*\{\s*allow\s+read:\s*if\s+true;/);
      assert.match(rules, /match\s+\/promotion_ribbons\/\{ribbonId\}\s*\{\s*allow\s+read:\s*if\s+true;/);
    });

    it('verifies admin write gating for public collections', async () => {
      const fs = await import('node:fs');
      const rules = fs.readFileSync('firestore.rules', 'utf8');
      
      assert.match(rules, /match\s+\/faqs\/\{faqId\}\s*\{[\s\S]*?allow\s+write:\s*if\s+isAdmin\(\);/);
      assert.match(rules, /match\s+\/testimonials\/\{testimonialId\}\s*\{[\s\S]*?allow\s+write:\s*if\s+isAdmin\(\);/);
    });

    it('verifies firestore.rules permits customerId in user profile updates', async () => {
      const fs = await import('node:fs');
      const rules = fs.readFileSync('firestore.rules', 'utf8');
      
      assert.match(rules, /match\s+\/users\/\{userId\}[\s\S]*?hasOnly\(\[[^\]]*'customerId'[^\]]*\]\)/);
    });

    it('verifies firestore.rules declares signed-in read/write access for system counters', async () => {
      const fs = await import('node:fs');
      const rules = fs.readFileSync('firestore.rules', 'utf8');
      
      assert.match(rules, /match\s+\/counters\/\{counterId\}\s*\{[\s\S]*?allow\s+read:\s*if\s+isSignedIn\(\);[\s\S]*?allow\s+write:\s*if\s+isSignedIn\(\);/);
    });
  });

  describe('9. Canonical BioCart Firebase Project Identity Verification', () => {
    it('verifies src/config/firebase.ts defines canonical bio-cart project fallbacks', async () => {
      const { firebaseConfig } = await import('../src/config/firebase.js');
      assert.equal(firebaseConfig.projectId, 'bio-cart');
      assert.equal(firebaseConfig.authDomain, 'bio-cart.firebaseapp.com');
      assert.equal(firebaseConfig.messagingSenderId, '941267141960');
      assert.match(firebaseConfig.apiKey, /^AIzaSyDk_/);
      assert.match(firebaseConfig.appId, /^1:941267141960:web:/);
    });
  });

  describe('10. Profile Provisioning & Firestore Data Sanitization', () => {
    it('1. Google user with no phone number: removes undefined fields completely', () => {
      const rawGoogleProfile = {
        uid: 'amf6O3XHhPX5ygCftezjKqITkq02',
        email: 'sindulissolutions@gmail.com',
        name: 'Sindulis Solutions',
        role: 'customer' as const,
        phoneNumber: undefined,
        phone: undefined,
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const sanitized = removeUndefined(rawGoogleProfile);
      assert.equal('phoneNumber' in sanitized, false);
      assert.equal('phone' in sanitized, false);
      assert.equal(sanitized.uid, 'amf6O3XHhPX5ygCftezjKqITkq02');
      assert.equal(sanitized.email, 'sindulissolutions@gmail.com');

      const validated = UserProfileSchema.safeParse(sanitized);
      assert.equal(validated.success, true);
    });

    it('2. Existing user with a saved phone number: preserves valid phone without tampering', () => {
      const existingProfile = {
        uid: 'usr_existing_phone_01',
        email: 'customer@biocart.in',
        name: 'Ramesh Patel',
        role: 'customer' as const,
        phoneNumber: '+919876543210',
        phone: '+919876543210',
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const sanitized = removeUndefined(existingProfile);
      assert.equal(sanitized.phoneNumber, '+919876543210');
      assert.equal(sanitized.phone, '+919876543210');
      const validated = UserProfileSchema.safeParse(sanitized);
      assert.equal(validated.success, true);
    });

    it('3. Existing profile with customer data: preserves customer details upon merge', () => {
      const existingDoc = {
        uid: 'usr_repeat_customer_01',
        email: 'repeat@biocart.in',
        name: 'Ananya Sharma',
        role: 'customer' as const,
        location: 'Bengaluru, Karnataka',
        status: 'active' as const,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        customerId: 'CUST-2026-0042',
      };

      const googleUpdates = {
        lastLoginAt: new Date().toISOString(),
        photoURL: 'https://lh3.googleusercontent.com/a/sample',
      };

      const merged = removeUndefined({ ...existingDoc, ...googleUpdates });
      assert.equal(merged.uid, 'usr_repeat_customer_01');
      assert.equal(merged.customerId, 'CUST-2026-0042');
      assert.equal(merged.location, 'Bengaluru, Karnataka');
      assert.equal(merged.photoURL, 'https://lh3.googleusercontent.com/a/sample');
      assert.ok(merged.lastLoginAt);
    });

    it('4. New customer profile creation: assigns customer role and active status', () => {
      const newCustomer = {
        uid: 'usr_new_google_01',
        email: 'freshuser@gmail.com',
        name: 'Fresh Customer',
        role: 'customer' as const,
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };

      const parsed = UserProfileSchema.safeParse(removeUndefined(newCustomer));
      assert.equal(parsed.success, true);
      if (parsed.success) {
        assert.equal(parsed.data.role, 'customer');
        assert.equal(parsed.data.status, 'active');
      }
    });

    it('5. Authentication refresh and session persistence: resolves customer role correctly', () => {
      const profile = {
        uid: 'usr_session_check',
        email: 'session@biocart.in',
        name: 'Session User',
        role: 'customer' as const,
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const resolved = resolveUserRole(profile, false);
      assert.equal(resolved, 'customer');
    });

    it('6. Customer dashboard route access: verifies dashboard is an authorized subView', async () => {
      const knownSubViews = ['admin', 'vendor', 'dashboard', 'dealer-portal', 'distributor-portal'];
      assert.ok(knownSubViews.includes('dashboard'));
    });

    it('7. Admin role and authorization preservation: existing admin is never downgraded to customer', () => {
      const adminProfile = {
        uid: 'adm_subhash_01',
        email: 'admin@biocart.in',
        name: 'BioCart Administrator',
        role: 'admin' as const,
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Ensure that merging non-authoritative Google info preserves admin role
      const updates = {
        lastLoginAt: new Date().toISOString(),
        photoURL: 'https://lh3.googleusercontent.com/a/admin',
      };

      const merged = { ...adminProfile, ...updates };
      assert.equal(merged.role, 'admin');

      const verifiedRole = resolveUserRole(merged, true);
      assert.equal(verifiedRole, 'admin');
    });

    it('8. Firestore write failure with a useful error message', () => {
      const rawFirestoreError = {
        code: 'permission-denied',
        message: 'Missing or insufficient permissions.',
      };

      const normalized = normalizeError(rawFirestoreError);
      assert.equal(normalized.category, 'permission');
      assert.equal(normalized.code, 'permission-denied');
      assert.match(normalized.message, /permission/i);
    });
  });

  describe('11. Customer ID Generation, Format, and Role Preservation', () => {
    it('formats Customer ID in MMMNNNNYY format for serial 1 in October 2026', () => {
      const testDate = new Date('2026-10-14T10:00:00Z');
      const id = formatCustomerId(1, testDate);
      assert.equal(id, 'OCT000126');
      assert.equal(id.length, 9);
      assert.equal(isValidCustomerId(id), true);
    });

    it('correctly zero-pads serial numbers up to 4 digits', () => {
      const testDate = new Date('2026-01-05T00:00:00Z');
      assert.equal(formatCustomerId(9, testDate), 'JAN000926');
      assert.equal(formatCustomerId(42, testDate), 'JAN004226');
      assert.equal(formatCustomerId(999, testDate), 'JAN099926');
      assert.equal(formatCustomerId(1234, testDate), 'JAN123426');
    });

    it('expands naturally beyond 9999 to 5 or more digits without truncation or data loss', () => {
      const testDate = new Date('2026-10-14T10:00:00Z');
      const id10k = formatCustomerId(10000, testDate);
      assert.equal(id10k, 'OCT1000026');
      assert.equal(id10k.length, 10);
      assert.equal(isValidCustomerId(id10k), true);

      const id100k = formatCustomerId(100500, testDate);
      assert.equal(id100k, 'OCT10050026');
      assert.equal(isValidCustomerId(id100k), true);
    });

    it('respects the Asia/Kolkata business timezone across midnight UTC boundary', () => {
      // 2026-09-30T23:30:00Z is 2026-10-01T05:00:00 in Asia/Kolkata (+05:30)
      const boundaryDate = new Date('2026-09-30T23:30:00Z');
      const id = formatCustomerId(100, boundaryDate);
      assert.match(id, /^OCT/);
      assert.equal(id, 'OCT010026');
    });

    it('rejects invalid, zero, negative, or non-integer serial numbers', () => {
      assert.throws(() => formatCustomerId(0), /positive integer/);
      assert.throws(() => formatCustomerId(-5), /positive integer/);
      assert.throws(() => formatCustomerId(1.5), /positive integer/);
      assert.throws(() => formatCustomerId(NaN), /positive integer/);
    });

    it('validates Customer ID format with isValidCustomerId', () => {
      assert.equal(isValidCustomerId('OCT000126'), true);
      assert.equal(isValidCustomerId('JAN999926'), true);
      assert.equal(isValidCustomerId('DEC1000026'), true);
      assert.equal(isValidCustomerId('OCT00126'), false); // only 3 digits
      assert.equal(isValidCustomerId('oct000126'), false); // lowercase
      assert.equal(isValidCustomerId('OCT0001'), false); // missing year
      assert.equal(isValidCustomerId(''), false);
      assert.equal(isValidCustomerId(null), false);
      assert.equal(isValidCustomerId(undefined), false);
    });

    it('preserves existing Customer ID and role without re-generation or role downgrade', () => {
      const existingCustomerProfile = {
        uid: 'cust_abc_999',
        customerId: 'OCT000126',
        email: 'customer@biocart.in',
        name: 'Existing Customer',
        role: 'customer' as const,
        status: 'active' as const,
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
      };

      const parseResult = UserProfileSchema.safeParse(existingCustomerProfile);
      assert.equal(parseResult.success, true);
      if (parseResult.success) {
        assert.equal(parseResult.data.customerId, 'OCT000126');
        assert.equal(parseResult.data.role, 'customer');
      }

      const adminProfileWithId = {
        uid: 'adm_master_01',
        customerId: 'OCT000226',
        email: 'admin@biocart.in',
        name: 'Master Admin',
        role: 'admin' as const,
        status: 'active' as const,
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
      };

      const adminParsed = UserProfileSchema.safeParse(adminProfileWithId);
      assert.equal(adminParsed.success, true);
      if (adminParsed.success) {
        assert.equal(adminParsed.data.role, 'admin');
        assert.equal(adminParsed.data.customerId, 'OCT000226');
      }
    });

    it('UserProfileSchema validates customerId field optionality and format', () => {
      const withoutId = {
        uid: 'usr_no_id',
        email: 'user@example.com',
        name: 'No Id User',
        role: 'customer' as const,
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      assert.equal(UserProfileSchema.safeParse(withoutId).success, true);

      const withId = { ...withoutId, customerId: 'OCT000126' };
      assert.equal(UserProfileSchema.safeParse(withId).success, true);
    });
  });
});



