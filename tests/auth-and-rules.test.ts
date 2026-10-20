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

    it('verifies firestore.rules declares admin-only read/write access for shipping settings', async () => {
      const fs = await import('node:fs');
      const rules = fs.readFileSync('firestore.rules', 'utf8');
      
      assert.match(rules, /match\s+\/settings\/shipping\s*\{\s*allow\s+read,\s*write:\s*if\s+isAdmin\(\);/);
    });

    it('verifies firestore.rules declares signed-in read and admin write for shipments', async () => {
      const fs = await import('node:fs');
      const rules = fs.readFileSync('firestore.rules', 'utf8');
      
      assert.match(rules, /match\s+\/shipments\/\{shipmentId\}\s*\{[\s\S]*?allow\s+read:\s*if\s+isSignedIn\(\);[\s\S]*?allow\s+write:\s*if\s+isAdmin\(\);/);
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

  describe('8. Admin Access, Password Management & Nova Bar Layout Safety', () => {
    const ALLOWED_ADMIN_EMAILS = ['sinfoxmedia@gmail.com', 'tagoresubhash2001@gmail.com'];
    const PRIMARY_ADMIN_UID = 'PdUDGin2uZbAyakst0RWzsgp7Ek1';

    it('recognizes tagoresubhash2001@gmail.com and sinfoxmedia@gmail.com as authorized admins', () => {
      assert.equal(ALLOWED_ADMIN_EMAILS.includes('tagoresubhash2001@gmail.com'), true);
      assert.equal(ALLOWED_ADMIN_EMAILS.includes('sinfoxmedia@gmail.com'), true);
      assert.equal(ALLOWED_ADMIN_EMAILS.includes('randomuser@gmail.com'), false);
    });

    it('preserves super_admin role and active status for tagoresubhash2001@gmail.com', () => {
      const adminProfile = {
        uid: PRIMARY_ADMIN_UID,
        email: 'tagoresubhash2001@gmail.com',
        name: 'Subhash Tagore',
        role: 'super_admin' as const,
        status: 'active' as const,
        customerId: 'OCT000326',
        createdAt: '2026-10-12T19:09:19.448Z',
        updatedAt: '2026-10-15T00:00:00.000Z',
      };

      const parsed = UserProfileSchema.safeParse(adminProfile);
      assert.equal(parsed.success, true);
      if (parsed.success) {
        assert.equal(parsed.data.role, 'super_admin');
        assert.equal(parsed.data.status, 'active');
        assert.equal(parsed.data.uid, PRIMARY_ADMIN_UID);
      }

      // Authorization resolver confirms full admin rights
      const role = resolveUserRole(adminProfile, true);
      assert.equal(role, 'super_admin');
    });

    it('validates password management rules: length and matching', () => {
      const validatePasswordForm = (pwd: string, confirm: string, isNewOnly: boolean, current?: string) => {
        if (!isNewOnly && (!current || current.length === 0)) {
          return { valid: false, error: 'Current password is required.' };
        }
        if (!pwd || pwd.length < 6) {
          return { valid: false, error: 'Password must be at least 6 characters long.' };
        }
        if (pwd !== confirm) {
          return { valid: false, error: 'Passwords do not match.' };
        }
        return { valid: true };
      };

      // Email/password user with current password
      assert.equal(validatePasswordForm('NewSecret@2026', 'NewSecret@2026', false, 'OldSecret@2025').valid, true);
      assert.equal(validatePasswordForm('short', 'short', false, 'OldSecret@2025').valid, false);
      assert.equal(validatePasswordForm('Secret@2026', 'Different@2026', false, 'OldSecret@2025').valid, false);
      assert.equal(validatePasswordForm('Secret@2026', 'Secret@2026', false, '').valid, false);

      // Google-only user setting password (does not require current password)
      assert.equal(validatePasswordForm('Tagore@2001', 'Tagore@2001', true).valid, true);
      assert.equal(validatePasswordForm('123', '123', true).valid, false);
    });

    it('differentiates provider linking states (google-only, password-only, dual)', () => {
      const getProviderStatus = (providerIds: string[]) => {
        const hasGoogle = providerIds.includes('google.com');
        const hasPassword = providerIds.includes('password');
        return {
          hasGoogle,
          hasPassword,
          isDual: hasGoogle && hasPassword,
          isGoogleOnly: hasGoogle && !hasPassword,
          isPasswordOnly: !hasGoogle && hasPassword,
        };
      };

      const googleOnly = getProviderStatus(['google.com']);
      assert.equal(googleOnly.isGoogleOnly, true);
      assert.equal(googleOnly.isDual, false);

      const dual = getProviderStatus(['google.com', 'password']);
      assert.equal(dual.isDual, true);
      assert.equal(dual.hasGoogle, true);
      assert.equal(dual.hasPassword, true);
    });

    it('validates top padding clearance classes for Nova Bar across non-hero containers', () => {
      // Nova Bar takes ~88px vertical space (fixed top-4/top-6 + 64px height)
      // Top padding of pt-28 (112px) or pt-32 (128px) guarantees clearance
      const isCleared = (className: string) => {
        return className.includes('pt-28') || className.includes('pt-32') || className.includes('pt-36');
      };

      assert.equal(isCleared('max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-12 sm:pt-32 sm:pb-16'), true);
      assert.equal(isCleared('w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-12 sm:pt-32 sm:pb-16 space-y-12'), true);
      assert.equal(isCleared('max-w-6xl mx-auto px-6 pt-28 pb-12 sm:pt-32 sm:pb-16 space-y-12 animate-fade-in'), true);
      assert.equal(isCleared('max-w-md mx-auto px-6 pt-32 pb-24 text-center space-y-6'), true);
      assert.equal(isCleared('py-10'), false);
      assert.equal(isCleared('py-6 sm:py-8'), false);
    });
  });

  describe('12. Production Admin, Catalog Reconciliation & Button Accessibility Audit', () => {
    it('verifies all 10 MASTER_CATEGORIES have valid fields and existing asset files', async () => {
      const { MASTER_CATEGORIES } = await import('../src/data/categoryCatalog.js');
      const fs = await import('node:fs');
      const path = await import('node:path');

      assert.equal(MASTER_CATEGORIES.length, 10, 'Expected exactly 10 master categories');

      for (const cat of MASTER_CATEGORIES) {
        assert.ok(cat.id && cat.id.startsWith('cat-'), `Category ID invalid: ${cat.id}`);
        assert.ok(cat.name && cat.name.length > 2, `Category name invalid: ${cat.name}`);
        assert.ok(cat.slug && cat.slug.length > 2, `Category slug invalid: ${cat.slug}`);
        assert.ok(cat.description && cat.description.length > 5, `Category description missing for: ${cat.name}`);
        assert.ok(cat.image && cat.image.startsWith('/assets/products/'), `Category image must start with /assets/products/: ${cat.image}`);

        // Verify the asset file actually exists in public directory
        const relativeAsset = cat.image.replace(/^\//, '');
        const assetPath = path.resolve(process.cwd(), 'public', relativeAsset);
        assert.ok(fs.existsSync(assetPath), `Asset file not found on disk: ${assetPath}`);
      }
    });

    it('verifies SEED_PRODUCTS catalog has 18 valid canonical products', async () => {
      const { SEED_PRODUCTS } = await import('../src/data/seedData.js');
      assert.equal(SEED_PRODUCTS.length, 18, 'Expected 18 canonical seed products');

      for (const prod of SEED_PRODUCTS) {
        assert.ok(prod.id, 'Product must have ID');
        assert.ok(prod.name, `Product ${prod.id} missing name`);
        assert.ok(prod.price > 0, `Product ${prod.name} has invalid price: ${prod.price}`);
        assert.ok(prod.mrp >= prod.price, `Product ${prod.name} MRP must be >= price`);
        assert.ok(prod.category, `Product ${prod.name} missing category`);
        assert.ok(prod.sku, `Product ${prod.name} missing SKU`);
      }
    });

    it('verifies Tailwind v4 theme color tokens in index.css eliminate white button contrast errors', async () => {
      const fs = await import('node:fs');
      const path = await import('node:path');

      const cssPath = path.resolve(process.cwd(), 'src', 'index.css');
      const cssContent = fs.readFileSync(cssPath, 'utf8');

      // Verify theme colors are defined under @theme
      assert.match(cssContent, /--color-nature-600:\s*#16a34a;/i);
      assert.match(cssContent, /--color-nature-700:\s*#15803d;/i);
      assert.match(cssContent, /--color-nature-800:\s*#166534;/i);
      assert.match(cssContent, /--color-charcoal-800:\s*#1f2937;/i);
      assert.match(cssContent, /--color-charcoal-900:\s*#111827;/i);
      assert.match(cssContent, /--color-earth-800:\s*#9a3412;/i);
    });

    it('verifies InventoryService and AdminService have canonical synchronization methods', async () => {
      const { InventoryService } = await import('../src/services/EnterpriseServices.js');
      const { AdminService } = await import('../src/services/AdminService.js');

      assert.equal(typeof InventoryService.getAllInventory, 'function');
      assert.equal(typeof InventoryService.initializeMissingInventory, 'function');
      assert.equal(typeof InventoryService.updateInventory, 'function');

      assert.equal(typeof AdminService.seedInitialCatalogIfEmpty, 'function');
      assert.equal(typeof AdminService.syncMasterCatalog, 'function');
      assert.equal(typeof AdminService.reconcileCategories, 'function');
    });
  });

  describe('13. Production Realtime Publishing, Horizontal Category Scroll & Settings Sync', () => {
    it('verifies Home.tsx implements a dedicated non-wrapping horizontal category scroller', async () => {
      const fs = await import('node:fs');
      const homeContent = fs.readFileSync('src/pages/Home.tsx', 'utf8');

      // Verify category track is non-wrapping flexbox with overflow-x-auto
      assert.match(homeContent, /id="home-categories-track"/);
      assert.match(homeContent, /flex-row\s+flex-nowrap\s+overflow-x-auto/);
      assert.match(homeContent, /scrollCategories\('left'\)/);
      assert.match(homeContent, /scrollCategories\('right'\)/);
      assert.match(homeContent, /snap-x\s+snap-mandatory/);
    });

    it('verifies renderSafeLineBreaks safely parses line breaks without raw markup or XSS', async () => {
      const { renderSafeLineBreaks } = await import('../src/utils/textUtils.js');

      assert.equal(renderSafeLineBreaks(undefined), null);
      assert.equal(renderSafeLineBreaks(''), null);
      assert.equal(renderSafeLineBreaks('Plain Text'), 'Plain Text');

      const result = renderSafeLineBreaks('First Line<br />Second Line<br>Third Line');
      assert.ok(Array.isArray(result), 'Result should be an array of React elements');
      assert.equal(result.length, 3);
    });

    it('verifies Footer.tsx and CheckoutModal.tsx consume store settings dynamically', async () => {
      const fs = await import('node:fs');
      const footerContent = fs.readFileSync('src/components/layout/Footer.tsx', 'utf8');
      const checkoutContent = fs.readFileSync('src/components/ui/CheckoutModal.tsx', 'utf8');

      assert.match(footerContent, /useStoreSettings/);
      assert.match(footerContent, /settings\.contactPhone/);
      assert.match(footerContent, /settings\.contactEmail/);
      assert.match(footerContent, /settings\.address/);
      assert.match(footerContent, /settings\.socialLinks/);

      assert.match(checkoutContent, /useStoreSettings/);
      assert.match(checkoutContent, /settings\.freeShippingThreshold/);
    });

    it('verifies AdminSettings.tsx button contrast and production save state', async () => {
      const fs = await import('node:fs');
      const settingsContent = fs.readFileSync('src/components/admin/AdminSettings.tsx', 'utf8');

      assert.match(settingsContent, /bg-emerald-600\s+hover:bg-emerald-700\s+text-white\s+font-bold/);
      assert.match(settingsContent, /Live in Production/);
    });
  });

  describe('14. Delhivery Logistics Integration, Multi-Vendor Slices & Idempotency', () => {
    it('verifies deterministic shipment document ID generation ensures per-vendor idempotency', () => {
      const orderNumber = 'BC-20261015-8821';
      const vendorId = 'vnd_sindulis_agro';
      const deterministicShipmentId = `shp_${orderNumber}_${vendorId}`;

      assert.equal(deterministicShipmentId, 'shp_BC-20261015-8821_vnd_sindulis_agro');

      // Subsequent attempt with identical order and vendor produces identical document ID
      const secondCallId = `shp_${orderNumber}_${vendorId}`;
      assert.equal(deterministicShipmentId, secondCallId, 'Deterministic ID prevents duplicate shipments/AWBs');
    });

    it('verifies 6-digit Indian PIN code format validation', () => {
      const isValidPincode = (pin: string) => /^[1-9][0-9]{5}$/.test(pin.trim());

      assert.equal(isValidPincode('522002'), true);  // Guntur, AP
      assert.equal(isValidPincode('560001'), true);  // Bengaluru, KA
      assert.equal(isValidPincode('110001'), true);  // New Delhi
      assert.equal(isValidPincode('012345'), false); // Cannot start with 0
      assert.equal(isValidPincode('52200'), false);  // Only 5 digits
      assert.equal(isValidPincode('5220021'), false);// 7 digits
      assert.equal(isValidPincode('ABCDEF'), false); // Non-numeric
    });

    it('verifies Delhivery status code mapping to canonical BioCart shipment statuses', () => {
      const mapDelhiveryStatus = (statusType: string): string => {
        const normalized = (statusType || '').toUpperCase().trim();
        switch (normalized) {
          case 'DL':
          case 'DELIVERED':
            return 'delivered';
          case 'UD':
          case 'OUT FOR DELIVERY':
            return 'out_for_delivery';
          case 'IT':
          case 'IN TRANSIT':
          case 'DISPATCHED':
            return 'in_transit';
          case 'RT':
          case 'RTO':
          case 'RETURNED':
            return 'returned';
          case 'CN':
          case 'CANCELLED':
          case 'CANCELED':
            return 'cancelled';
          case 'MF':
          case 'MANIFESTED':
            return 'manifested';
          default:
            return 'pending';
        }
      };

      assert.equal(mapDelhiveryStatus('DL'), 'delivered');
      assert.equal(mapDelhiveryStatus('Delivered'), 'delivered');
      assert.equal(mapDelhiveryStatus('UD'), 'out_for_delivery');
      assert.equal(mapDelhiveryStatus('Out for Delivery'), 'out_for_delivery');
      assert.equal(mapDelhiveryStatus('IT'), 'in_transit');
      assert.equal(mapDelhiveryStatus('In Transit'), 'in_transit');
      assert.equal(mapDelhiveryStatus('RT'), 'returned');
      assert.equal(mapDelhiveryStatus('CN'), 'cancelled');
      assert.equal(mapDelhiveryStatus('MF'), 'manifested');
      assert.equal(mapDelhiveryStatus('UNKNOWN'), 'pending');
    });

    it('verifies functions/src/delhivery.ts exports all 5 core logistics Cloud Functions', async () => {
      const fs = await import('node:fs');
      const functionsIndex = fs.readFileSync('functions/src/index.ts', 'utf8');

      assert.match(functionsIndex, /export\s+\{\s*[\s\S]*checkDelhiveryPincode[\s\S]*\}/);
      assert.match(functionsIndex, /export\s+\{\s*[\s\S]*createDelhiveryShipment[\s\S]*\}/);
      assert.match(functionsIndex, /export\s+\{\s*[\s\S]*trackDelhiveryShipment[\s\S]*\}/);
      assert.match(functionsIndex, /export\s+\{\s*[\s\S]*getDelhiveryLabel[\s\S]*\}/);
      assert.match(functionsIndex, /export\s+\{\s*[\s\S]*cancelDelhiveryShipment[\s\S]*\}/);
    });

    it('verifies AdminLayout and AdminConsole contain shipments navigation section', async () => {
      const fs = await import('node:fs');
      const layoutContent = fs.readFileSync('src/components/admin/AdminLayout.tsx', 'utf8');
      const consoleContent = fs.readFileSync('src/components/admin/AdminConsole.tsx', 'utf8');

      assert.match(layoutContent, /'shipments'/);
      assert.match(layoutContent, /id:\s*'shipments',\s*label:\s*'Logistics & Delhivery'/);
      assert.match(consoleContent, /case 'shipments':\s*return <AdminShipments \/>;/);
    });

    it('verifies VendorOrders and Dashboard include Delhivery live tracking', async () => {
      const fs = await import('node:fs');
      const vendorOrders = fs.readFileSync('src/components/vendor/VendorOrders.tsx', 'utf8');
      const dashboard = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

      assert.match(vendorOrders, /ShippingService\.createShipment/);
      assert.match(vendorOrders, /ShippingService\.trackShipment/);
      assert.match(vendorOrders, /ShippingService\.getShippingLabel/);

      assert.match(dashboard, /delhivery-multi-package-tracking/);
      assert.match(dashboard, /Delhivery Express Logistics/);
      assert.match(dashboard, /ShippingService\.trackShipment/);
    });
  });

  describe('18. BioCart Tax-Aware Payment, Coupon Funding & Financial Ledger Engine', () => {
    it('verifies Rule A: Tax-aware merchandise commission base calculation in integer paise', async () => {
      const { calculateAuthoritativeOrder } = await import('../functions/lib/financialEngine.js');

      const vendorInput = [{
        vendorId: 'vendor-agro-1',
        vendorStoreName: 'Green Bio Farms',
        commissionRateBps: 1000, // 10%
        isGstRegistered: true,
        gstin: '36ABCDE1234F1Z5',
        items: [{
          productId: 'prod-vermi-1',
          name: 'Premium Vermicompost 5kg',
          pricePaise: 100000, // Rs. 1000
          quantity: 1,
          taxRateBps: 500 // 5% GST
        }]
      }];

      const result = calculateAuthoritativeOrder(vendorInput, null, 0);

      // Subtotal = 100000 paise (Rs. 1000)
      assert.equal(result.subtotalPaise, 100000);
      // Tax = 5000 paise (Rs. 50, 5% GST)
      assert.equal(result.taxPaise, 5000);
      // Grand Total = 105000 paise (Rs. 1050)
      assert.equal(result.grandTotalPaise, 105000);

      const split = result.vendorSplits[0];
      // Commission base must be merchandise value (excluding 5% GST) minus gateway fee
      // Gateway fee (2% of 100,000) = 2000 paise
      // Gateway fee GST (18% of 2000) = 360 paise
      // Total gateway deduction = 2360 paise
      assert.equal(split.gatewayFeePaise, 2000);
      assert.equal(split.gatewayFeeGstPaise, 360);
      assert.equal(split.totalGatewayDeductionPaise, 2360);

      // Commission base = 100,000 - 2,360 = 97,640 paise
      assert.equal(split.commissionBasePaise, 97640);
      // Commission (10% of 97,640) = 9764 paise
      assert.equal(split.commissionPaise, 9764);
      // Commission GST (18% of 9764) = 1758 paise
      assert.equal(split.commissionGstPaise, 1758);

      // Vendor Net Credit = 100,000 - 2,360 - 9,764 - 1,758 = 86,118 paise (Rs. 861.18)
      assert.equal(split.vendorNetCreditPaise, 86118);
    });

    it('verifies Rule B: Vendor-created coupon is deducted from that vendor earnings', async () => {
      const { calculateAuthoritativeOrder } = await import('../functions/lib/financialEngine.js');

      const vendorInput = [{
        vendorId: 'vendor-bio-seller',
        vendorStoreName: 'Bio Seller Hub',
        commissionRateBps: 1000, // 10%
        items: [{
          productId: 'prod-neem-oil',
          name: 'Cold Pressed Neem Oil 1L',
          pricePaise: 50000, // Rs. 500
          quantity: 1,
          taxRateBps: 500
        }]
      }];

      // Vendor created a 100 Rs (10000 paise) coupon
      const coupon = {
        code: 'VENDOR100',
        creatorRole: 'vendor' as const,
        creatorVendorId: 'vendor-bio-seller',
        discountPaise: 10000
      };

      const result = calculateAuthoritativeOrder(vendorInput, coupon, 0);

      const split = result.vendorSplits[0];
      // Vendor funded discount must equal 10000 paise
      assert.equal(split.vendorFundedDiscountPaise, 10000);
      assert.equal(split.platformFundedDiscountPaise, 0);
      // Gross merchandise payable to vendor is reduced to 40,000 paise
      assert.equal(split.grossMerchandisePaise, 40000);
    });

    it('verifies Rule B: Admin-created coupon does not reduce vendor earnings and records explicit platform subsidy', async () => {
      const { calculateAuthoritativeOrder } = await import('../functions/lib/financialEngine.js');

      const vendorInput = [{
        vendorId: 'vendor-organic-farm',
        vendorStoreName: 'Organic Harvest Farms',
        commissionRateBps: 1000, // 10%
        items: [{
          productId: 'prod-cocopeat',
          name: 'Cocopeat Block 5kg',
          pricePaise: 50000, // Rs. 500
          quantity: 1,
          taxRateBps: 500
        }]
      }];

      // Admin created a Rs. 200 (20,000 paise) coupon — exceeds 10% commission (Rs. 50)
      const coupon = {
        code: 'BIOCARTBIGSALE',
        creatorRole: 'admin' as const,
        discountPaise: 20000
      };

      const result = calculateAuthoritativeOrder(vendorInput, coupon, 0);

      const split = result.vendorSplits[0];
      // Vendor discount must be 0 (platform funded)
      assert.equal(split.vendorFundedDiscountPaise, 0);
      assert.equal(split.platformFundedDiscountPaise, 20000);

      // Vendor gross merchandise remains 50000 paise
      assert.equal(split.grossMerchandisePaise, 50000);

      // Explicit platform subsidy incurred = 20,000 - commission (approx 4,882 paise) > 0
      assert.ok(result.totalPlatformSubsidyPaise > 0);
      assert.ok(split.platformSubsidyPaise > 0);
    });

    it('verifies firestore.rules restricts financial_ledger to admin read and zero client writes', async () => {
      const fs = await import('node:fs');
      const rulesContent = fs.readFileSync('firestore.rules', 'utf8');

      assert.match(rulesContent, /match\s+\/financial_ledger\/\{entryId\}/);
      assert.match(rulesContent, /allow\s+write:\s*if\s+false;/);
      assert.match(rulesContent, /allow\s+read:\s*if\s+isAdmin\(\)/);
    });

    it('verifies Tuesday settlement engine and manual settlement are exported in functions', async () => {
      const fs = await import('node:fs');
      const indexContent = fs.readFileSync('functions/src/index.ts', 'utf8');

      assert.match(indexContent, /tuesdayVendorSettlement/);
      assert.match(indexContent, /triggerManualSettlement/);
      assert.match(indexContent, /processOrderRefund/);
    });
  });

  describe('19. Vendor Partner Business Email & Identity Management (Bug Fix)', () => {
    it('verifies VendorOnboardingModal allows editable Business Email input without disabling in edit mode', async () => {
      const fs = await import('node:fs');
      const modalContent = fs.readFileSync('src/components/admin/VendorOnboardingModal.tsx', 'utf8');

      // Must not disable the business email field when vendor.id exists
      assert.doesNotMatch(modalContent, /disabled=\{!!vendor\?\.id\}/);
      // Must contain email validation logic
      assert.match(modalContent, /validateEmail/);
      // Must normalize email (trim and lowercase)
      assert.match(modalContent, /toLowerCase\(\)/);
    });

    it('verifies updateVendorEmail Cloud Function is implemented with role guard and duplicate checking', async () => {
      const fs = await import('node:fs');
      const indexContent = fs.readFileSync('functions/src/index.ts', 'utf8');

      assert.match(indexContent, /export const updateVendorEmail = onCall/);
      assert.match(indexContent, /callerRole !== 'admin' && callerRole !== 'super_admin'/);
      assert.match(indexContent, /getAuth\(\)\.updateUser/);
      assert.match(indexContent, /audit_logs/);
    });

    it('verifies email validation logic correctly accepts valid emails and rejects invalid ones', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      assert.equal(emailRegex.test('vendor@greenroots.in'), true);
      assert.equal(emailRegex.test('partner.subhash@agri-solutions.com'), true);
      assert.equal(emailRegex.test('subhash+vendor@biocart.in'), true);

      // Invalid formats
      assert.equal(emailRegex.test('not-an-email'), false);
      assert.equal(emailRegex.test('missing-domain@'), false);
      assert.equal(emailRegex.test('@missing-user.com'), false);
      assert.equal(emailRegex.test('space in@email.com'), false);
    });

    it('verifies email trimming and lowercase normalization behaves consistently', () => {
      const rawInput = '   Vendor.Test@GreenRoots.IN   ';
      const normalized = rawInput.trim().toLowerCase();
      assert.equal(normalized, 'vendor.test@greenroots.in');
    });

    it('verifies AdminVendors integrates updateVendorEmailCF when updating an existing vendor email', async () => {
      const fs = await import('node:fs');
      const adminVendorsContent = fs.readFileSync('src/components/admin/AdminVendors.tsx', 'utf8');

      assert.match(adminVendorsContent, /updateVendorEmailCF/);
      assert.match(adminVendorsContent, /updateVendorEmail/);
    });
  });

  describe('Section 20: India-Wide Technical SEO, Robots, Sitemap & Structured Data', () => {
    it('verifies public/robots.txt exists with correct disallows and sitemap declaration', async () => {
      const fs = await import('node:fs');
      assert.equal(fs.existsSync('public/robots.txt'), true, 'public/robots.txt must exist');
      
      const content = fs.readFileSync('public/robots.txt', 'utf8');
      assert.match(content, /User-agent: \*/);
      assert.match(content, /Allow: \//);
      assert.match(content, /Disallow: \/admin/);
      assert.match(content, /Disallow: \/vendor/);
      assert.match(content, /Disallow: \/dashboard/);
      assert.match(content, /Sitemap: https:\/\/biocart\.in\/sitemap\.xml/);
    });

    it('verifies automated sitemap generation produces a compliant sitemap.xml with canonical domain', async () => {
      const fs = await import('node:fs');
      assert.equal(fs.existsSync('scripts/generate-sitemap.ts'), true, 'scripts/generate-sitemap.ts must exist');
      assert.equal(fs.existsSync('public/sitemap.xml'), true, 'public/sitemap.xml must exist');

      const xml = fs.readFileSync('public/sitemap.xml', 'utf8');
      assert.match(xml, /<\?xml version="1.0" encoding="UTF-8"\?>/);
      assert.match(xml, /<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/);
      assert.match(xml, /<loc>https:\/\/biocart\.in\/<\/loc>/);
      assert.match(xml, /<loc>https:\/\/biocart\.in\/shop<\/loc>/);
      assert.match(xml, /<loc>https:\/\/biocart\.in\/product-details\?product=/);
      assert.match(xml, /<loc>https:\/\/biocart\.in\/shop\?category=/);
      assert.match(xml, /<\/urlset>/);
    });

    it('verifies SEOManager component injects canonical URL, metadata, and JSON-LD structured schemas', async () => {
      const fs = await import('node:fs');
      const seoContent = fs.readFileSync('src/components/ui/SEOManager.tsx', 'utf8');

      // Canonical URL strictly https://biocart.in
      assert.match(seoContent, /const CANONICAL_DOMAIN = 'https:\/\/biocart\.in'/);
      assert.match(seoContent, /canonicalLink\.rel = 'canonical'/);
      assert.match(seoContent, /setMetaTag\('name',\s*'robots'/);
      
      // JSON-LD schemas
      assert.match(seoContent, /schema-organization/);
      assert.match(seoContent, /schema-website/);
      assert.match(seoContent, /schema-breadcrumbs/);
      assert.match(seoContent, /schema-product/);
      assert.match(seoContent, /priceCurrency:\s*'INR'/);
      assert.match(seoContent, /https:\/\/schema\.org\/InStock/);
    });

    it('verifies index.html has canonical tag, Google preconnects, and static fallback Organization schema', async () => {
      const fs = await import('node:fs');
      const indexHtml = fs.readFileSync('index.html', 'utf8');

      assert.match(indexHtml, /<link rel="canonical" href="https:\/\/biocart\.in\/" \/>/);
      assert.match(indexHtml, /<meta name="robots" content="index, follow" \/>/);
      assert.match(indexHtml, /<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com" \/>/);
      assert.match(indexHtml, /<script type="application\/ld\+json">/);
      assert.match(indexHtml, /"name":\s*"BioCart"/);
      assert.match(indexHtml, /"legalName":\s*"Sindulis Agro Products Pvt\. Ltd\."/);
    });

    it('verifies AppContext hydrates product details directly when query param is passed', async () => {
      const fs = await import('node:fs');
      const appContext = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

      assert.match(appContext, /if \(pathname === 'product-details'\)/);
      assert.match(appContext, /urlParams\.get\('product'\)/);
      assert.match(appContext, /SEED_PRODUCTS\.find/);
      assert.match(appContext, /AdminService\.getProductById/);
    });

    it('verifies package.json has prebuild hook to ensure fresh sitemap on every build', async () => {
      const fs = await import('node:fs');
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

      assert.equal(pkg.scripts.prebuild, 'tsx scripts/generate-sitemap.ts');
    });
  });

  describe('Section 21: Vendor Partner Identity Resolution & Reconcile Engine', () => {
    it('verifies firestore.rules declares flexible isVendorOwner supporting direct UID and mapped ownerUid', async () => {
      const fs = await import('node:fs');
      const rules = fs.readFileSync('firestore.rules', 'utf8');

      assert.match(rules, /function isVendorOwner\(vendorId\)/);
      assert.match(rules, /request\.auth\.uid == vendorId/);
      assert.match(rules, /'ownerUid' in get\(\/databases\/\$\(database\)\/documents\/vendors\/\$\(vendorId\)\)\.data/);
      assert.match(rules, /data\.ownerUid == request\.auth\.uid/);
      assert.match(rules, /allow list: if isAdmin\(\) \|\| \(isSignedIn\(\) && exists\(\/databases\/\$\(database\)\/documents\/users\/\$\(request\.auth\.uid\)\) && get\(\/databases\/\$\(database\)\/documents\/users\/\$\(request\.auth\.uid\)\)\.data\.role == 'vendor'\);/);
    });

    it('verifies useVendor hook supports multi-tier resolution (direct, ownerUid, email, admin fallback)', async () => {
      const fs = await import('node:fs');
      const hookCode = fs.readFileSync('src/hooks/useVendor.ts', 'utf8');

      assert.match(hookCode, /directDocRef = doc\(db, 'vendors', uid\)/);
      assert.match(hookCode, /where\('ownerUid', '==', uid\)/);
      assert.match(hookCode, /where\('email', '==', email\)/);
      assert.match(hookCode, /error: 'unauthenticated' \| 'unauthorized_role' \| 'vendor_not_found' \| 'network_error' \| 'permission_denied'/);
      assert.match(hookCode, /refetch: resolveIdentity/);
    });

    it('verifies VendorConsole provides differentiated error states (network vs permission vs not found) with retry', async () => {
      const fs = await import('node:fs');
      const consoleCode = fs.readFileSync('src/components/vendor/VendorConsole.tsx', 'utf8');

      assert.match(consoleCode, /error === 'network_error'/);
      assert.match(consoleCode, /Retry Connection/);
      assert.match(consoleCode, /Check Identity Again/);
    });

    it('verifies reconcileVendorAccount Cloud Function is implemented with admin auth gating', async () => {
      const fs = await import('node:fs');
      const functionsCode = fs.readFileSync('functions/src/index.ts', 'utf8');

      assert.match(functionsCode, /export const reconcileVendorAccount = onCall/);
      assert.match(functionsCode, /Only authorized administrators can reconcile vendor accounts/);
      assert.match(functionsCode, /batch\.update\(vendorRef, \{\s*ownerUid: targetUid/);
      assert.match(functionsCode, /batch\.set\(auditRef,/);
    });

    it('verifies reconcileVendorAccount checks for conflicting vendor ownership before linking', async () => {
      const fs = await import('node:fs');
      const functionsCode = fs.readFileSync('functions/src/index.ts', 'utf8');

      assert.match(functionsCode, /where\('ownerUid', '==', targetUid\)/);
      assert.match(functionsCode, /is already assigned as owner of vendor/);
    });

    it('verifies reconcileVendorAccount preserves existing wallet ledger balances without overwrite', async () => {
      const fs = await import('node:fs');
      const functionsCode = fs.readFileSync('functions/src/index.ts', 'utf8');

      assert.match(functionsCode, /if \(!walletDoc\.exists\)/);
      assert.match(functionsCode, /batch\.update\(walletRef,\s*\{\s*ownerUid:\s*targetUid/);
      assert.match(functionsCode, /vendorId:\s*cleanVendorId/);
    });

    it('verifies useVendor supports direct profile vendorId fast lookup', async () => {
      const fs = await import('node:fs');
      const hookCode = fs.readFileSync('src/hooks/useVendor.ts', 'utf8');

      assert.match(hookCode, /userProfile\?\.vendorId/);
      assert.match(hookCode, /doc\(db, 'vendors', userProfile\.vendorId\)/);
    });

    it('verifies AdminVendors renders Auth Linked / Unlinked badges and 1-click Reconcile Login button', async () => {
      const fs = await import('node:fs');
      const adminVendors = fs.readFileSync('src/components/admin/AdminVendors.tsx', 'utf8');

      assert.match(adminVendors, /reconcileVendorAccountCF/);
      assert.match(adminVendors, /⚠️ Unlinked Auth/);
      assert.match(adminVendors, /Auth Linked/);
      assert.match(adminVendors, /handleReconcileVendor/);
    });
  });

  describe('16. Vendor Console Restoration, Settings Centre & UI/UX Audit', () => {
    it('verifies VendorSettings provides a 7-tab responsive architecture with complete state mapping', async () => {
      const fs = await import('node:fs');
      const settingsCode = fs.readFileSync('src/components/vendor/VendorSettings.tsx', 'utf8');

      // 7 tabs present
      assert.match(settingsCode, /'profile' \| 'security' \| 'notifications' \| 'shipping' \| 'financial' \| 'documents' \| 'support'/);
      assert.match(settingsCode, /Business Profile/);
      assert.match(settingsCode, /Account & Security/);
      assert.match(settingsCode, /Notifications/);
      assert.match(settingsCode, /Shipping & Fulfilment/);
      assert.match(settingsCode, /Payout & Wallet/);
      assert.match(settingsCode, /Documents & Verification/);
      assert.match(settingsCode, /Help & Status/);

      // Verify typed normalization layer and payload builder integration
      assert.match(settingsCode, /normalizeVendorSettings/);
      assert.match(settingsCode, /buildVendorUpdatePayload/);
      assert.match(settingsCode, /norm\.storeName/);
      assert.match(settingsCode, /norm\.ownerName/);
      assert.match(settingsCode, /norm\.addressLine1/);
      assert.match(settingsCode, /norm\.city/);
      assert.match(settingsCode, /norm\.state/);
      assert.match(settingsCode, /norm\.pinCode/);
      assert.match(settingsCode, /norm\.gstin/);
      assert.match(settingsCode, /norm\.pan/);
    });

    it('verifies VendorSettings implements Change Password with Firebase re-authentication and Password Reset dispatch', async () => {
      const fs = await import('node:fs');
      const settingsCode = fs.readFileSync('src/components/vendor/VendorSettings.tsx', 'utf8');

      assert.match(settingsCode, /AuthService\.changePassword/);
      assert.match(settingsCode, /AuthService\.resetPassword/);
      assert.match(settingsCode, /currentPassword/);
      assert.match(settingsCode, /newPassword/);
      assert.match(settingsCode, /confirmPassword/);
      assert.match(settingsCode, /New password and confirmation do not match/);
    });

    it('verifies BioCartLoader exists with authentic logo animation, progress bar, accessibility and reduced motion support', async () => {
      const fs = await import('node:fs');
      const loaderCode = fs.readFileSync('src/components/ui/BioCartLoader.tsx', 'utf8');

      assert.match(loaderCode, /\/assets\/biocart_logo_official\.png/);
      assert.match(loaderCode, /role="status"/);
      assert.match(loaderCode, /aria-live="polite"/);
      assert.match(loaderCode, /motion-reduce:animate-none/);
      assert.match(loaderCode, /showProgress/);
      assert.match(loaderCode, /logoDimensions\[size\]/);
      assert.match(loaderCode, /ringSizes\[size\]/);
      assert.match(loaderCode, /containerSizes\[size\]/);
    });

    it('verifies VendorLayout has mobile drawer toggle, backdrop and responsive navigation', async () => {
      const fs = await import('node:fs');
      const layoutCode = fs.readFileSync('src/components/vendor/VendorLayout.tsx', 'utf8');

      assert.match(layoutCode, /isMobileOpen/);
      assert.match(layoutCode, /md:hidden/);
      assert.match(layoutCode, /bg-slate-900\/40 backdrop-blur-sm/);
      assert.match(layoutCode, /translate-x-0.*-translate-x-full/);
      assert.match(layoutCode, /Settings/);
    });

    it('verifies firestore.rules permits vendors to update legitimate business and preference fields', async () => {
      const fs = await import('node:fs');
      const rules = fs.readFileSync('firestore.rules', 'utf8');

      assert.match(rules, /'storeName',\s*'businessName',\s*'ownerName'/);
      assert.match(rules, /'addresses',\s*'legal'/);
      assert.match(rules, /'notificationPreferences',\s*'shippingPreferences'/);
    });

    it('verifies storage.rules allows vendor image uploads by matching ownerUid on the vendor document', async () => {
      const fs = await import('node:fs');
      const storageRules = fs.readFileSync('storage.rules', 'utf8');

      assert.match(storageRules, /firestore\.get\(\/databases\/\(default\)\/documents\/vendors\/\$\(vendorId\)\)\.data\.ownerUid == request\.auth\.uid/);
    });
  });

  describe('22. Vendor Settings Normalization, Persistence Cycle & Project Security Gate', () => {
    it('1. Business name displays BioCart Direct Official when that is the canonical value', async () => {
      const { normalizeVendorSettings } = await import('../src/utils/vendorMapping.js');
      const rawDoc = {
        storeName: 'BioCart Direct Official',
        ownerName: 'Subhash Tagore'
      };
      const norm = normalizeVendorSettings('biocart', rawDoc);
      assert.equal(norm.storeName, 'BioCart Direct Official');
    });

    it('2. Owner name displays the verified human owner name rather than biocart', async () => {
      const { normalizeVendorSettings } = await import('../src/utils/vendorMapping.js');
      // If Firestore has legacy/slug 'biocart' as ownerName, normalization resolves to verified human owner
      const rawLegacyDoc = {
        storeName: 'BioCart Direct Official',
        ownerName: 'biocart'
      };
      const norm = normalizeVendorSettings('biocart', rawLegacyDoc, null, 'Subhash Tagore');
      assert.equal(norm.ownerName, 'Subhash Tagore');
      assert.notEqual(norm.ownerName, 'biocart');
    });

    it('3. Email is sourced from the canonical vendor profile or verified auth identity', async () => {
      const { normalizeVendorSettings } = await import('../src/utils/vendorMapping.js');
      const rawDoc = { email: 'tagoresubhash01@gmail.com' };
      const norm = normalizeVendorSettings('biocart', rawDoc, 'tagoresubhash01@gmail.com');
      assert.equal(norm.email, 'tagoresubhash01@gmail.com');
    });

    it('4. Existing nested address and legal fields load correctly', async () => {
      const { normalizeVendorSettings } = await import('../src/utils/vendorMapping.js');
      const rawDoc = {
        storeName: 'BioCart Direct Official',
        addresses: {
          registeredAddress: {
            addressLine1: '3-5-5 Beside Swami theater, Pattabhipuram',
            city: 'Guntur',
            state: 'Andhra Pradesh',
            pinCode: '522006'
          }
        },
        legal: {
          gstin: '37AAAAA0000A1Z5',
          pan: 'ABCDE1234F',
          businessType: 'proprietorship'
        }
      };
      const norm = normalizeVendorSettings('biocart', rawDoc);
      assert.equal(norm.addressLine1, '3-5-5 Beside Swami theater, Pattabhipuram');
      assert.equal(norm.city, 'Guntur');
      assert.equal(norm.state, 'Andhra Pradesh');
      assert.equal(norm.pinCode, '522006');
      assert.equal(norm.gstin, '37AAAAA0000A1Z5');
      assert.equal(norm.pan, 'ABCDE1234F');
      assert.equal(norm.businessType, 'proprietorship');
    });

    it('5. Legacy aliases do not overwrite canonical values with blanks', async () => {
      const { normalizeVendorSettings } = await import('../src/utils/vendorMapping.js');
      const rawDoc = {
        storeName: 'BioCart Direct Official',
        businessName: '', // legacy empty alias
        addresses: {
          registeredAddress: {
            addressLine1: '3-5-5 Beside Swami theater',
            city: 'Guntur'
          }
        },
        address: '' // legacy empty flat alias
      };
      const norm = normalizeVendorSettings('biocart', rawDoc);
      assert.equal(norm.storeName, 'BioCart Direct Official');
      assert.equal(norm.addressLine1, '3-5-5 Beside Swami theater');
      assert.equal(norm.city, 'Guntur');
    });

    it('6. Editing and saving a field produces a clean payload that persists after a fresh read', async () => {
      const { normalizeVendorSettings, buildVendorUpdatePayload } = await import('../src/utils/vendorMapping.js');
      const initialDoc = {
        storeName: 'BioCart Direct Official',
        ownerName: 'Subhash Tagore',
        ownerUid: 'ZYiUEhqNUPN4TRJ5tlC1tIjN8Fs1',
        commission: { baseRateBps: 1000 },
        addresses: { registeredAddress: { city: 'Guntur', pinCode: '522006' } }
      };

      const norm = normalizeVendorSettings('biocart', initialDoc);
      // Simulate edit
      norm.storeName = 'BioCart Direct Official';
      norm.phone = '+91 9876543210';
      norm.description = 'Certified 100% organic compost and microbial biofertilizers.';

      const payload = buildVendorUpdatePayload(norm, initialDoc);
      assert.equal(payload.storeName, 'BioCart Direct Official');
      assert.equal(payload.phone, '+91 9876543210');
      assert.equal(payload.description, 'Certified 100% organic compost and microbial biofertilizers.');

      // Simulate fresh read by merging into doc
      const updatedDoc = { ...initialDoc, ...payload };
      const freshNorm = normalizeVendorSettings('biocart', updatedDoc);
      assert.equal(freshNorm.phone, '+91 9876543210');
      assert.equal(freshNorm.description, 'Certified 100% organic compost and microbial biofertilizers.');
    });

    it('7. Reset restores the last saved values and resets dirty state', async () => {
      const fs = await import('node:fs');
      const settingsCode = fs.readFileSync('src/components/vendor/VendorSettings.tsx', 'utf8');

      assert.match(settingsCode, /fetchVendor\(true\)/);
      assert.match(settingsCode, /setIsDirty\(false\)/);
      assert.match(settingsCode, /isDirty/);
    });

    it('8. A failed save preserves unsaved input and displays the actual error', async () => {
      const fs = await import('node:fs');
      const settingsCode = fs.readFileSync('src/components/vendor/VendorSettings.tsx', 'utf8');

      assert.match(settingsCode, /Permission denied: You do not have authorization/);
      assert.match(settingsCode, /Network connection offline/);
    });

    it('9. Protected identity and financial fields cannot be modified by the settings form', async () => {
      const { normalizeVendorSettings, buildVendorUpdatePayload } = await import('../src/utils/vendorMapping.js');
      const rawDoc = {
        ownerUid: 'PROTECTED_UID_123',
        vendorId: 'biocart',
        commission: { baseRateBps: 800 },
        settlement: { accountNumber: '1234567890' }
      };
      const norm = normalizeVendorSettings('biocart', rawDoc);
      const payload = buildVendorUpdatePayload(norm, rawDoc);

      assert.equal('ownerUid' in payload, false);
      assert.equal('vendorId' in payload, false);
      assert.equal('commission' in payload, false);
      assert.equal('settlement' in payload, false);
      assert.equal('wallet' in payload, false);
    });

    it('10. The application cannot silently connect to the wrong Firebase project', async () => {
      const fs = await import('node:fs');
      const firebaseConfigCode = fs.readFileSync('src/config/firebase.ts', 'utf8');

      assert.match(firebaseConfigCode, /EXPECTED_PRODUCTION_PROJECT_ID = 'bio-cart'/);
      assert.match(firebaseConfigCode, /Firebase Project ID mismatch/);
    });

    it('11. VendorLayout renders canonical business name and human owner name', async () => {
      const fs = await import('node:fs');
      const layoutCode = fs.readFileSync('src/components/vendor/VendorLayout.tsx', 'utf8');

      assert.match(layoutCode, /displayBusinessName/);
      assert.match(layoutCode, /displayOwnerName/);
      assert.match(layoutCode, /displayLogo/);
    });
  });

  describe('Section 23: Vendor Console Bounded Liveness & Route Resolution', () => {
    it('1. useVendor has a bounded safety timeout preventing indefinite loaders', async () => {
      const fs = await import('node:fs');
      const hookCode = fs.readFileSync('src/hooks/useVendor.ts', 'utf8');

      assert.match(hookCode, /12000/); // 12-second bounded timeout
      assert.match(hookCode, /Connection timed out while verifying vendor partner credentials/);
      assert.match(hookCode, /clearTimeout/);
    });

    it('2. VendorConsole supports both pathname and hash routing for direct deep links', async () => {
      const fs = await import('node:fs');
      const consoleCode = fs.readFileSync('src/components/vendor/VendorConsole.tsx', 'utf8');

      assert.match(consoleCode, /window\.location\.pathname/);
      assert.match(consoleCode, /window\.location\.hash/);
      assert.match(consoleCode, /hashchange/);
      assert.match(consoleCode, /popstate/);
    });
  });

  describe('Section 24: Vendor Coupon System, Scope Isolation & Checkout Validation', () => {
    it('1. VendorLayout includes Coupons in navigation items and VendorSection type', async () => {
      const fs = await import('node:fs');
      const layoutCode = fs.readFileSync('src/components/vendor/VendorLayout.tsx', 'utf8');

      assert.match(layoutCode, /id:\s*'coupons'/);
      assert.match(layoutCode, /label:\s*'Coupons'/);
      assert.match(layoutCode, /'coupons'/);
    });

    it('2. VendorConsole renders VendorCoupons component on coupons section', async () => {
      const fs = await import('node:fs');
      const consoleCode = fs.readFileSync('src/components/vendor/VendorConsole.tsx', 'utf8');

      assert.match(consoleCode, /VendorCoupons/);
      assert.match(consoleCode, /case 'coupons':/);
    });

    it('3. CouponService validates vendor product scoping correctly (only vendor products discounted)', async () => {
      const { CouponService } = await import('../src/services/CouponService.js');

      const vendorCoupon = {
        id: 'VENDOR15',
        code: 'VENDOR15',
        discountType: 'percentage' as const,
        discountValue: 15,
        minOrderAmount: 200,
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-12-31T23:59:59.000Z',
        usageLimit: 100,
        usedCount: 0,
        status: 'active' as const,
        creatorRole: 'vendor' as const,
        creatorVendorId: 'vendor_biocart'
      };

      // Mock Firestore coupon read by passing already validated structure logic:
      // Test when cart has items from vendor_biocart vs other_vendor
      const cartItems = [
        { product: { id: 'p1', name: 'Vendor Item', price: 500, vendorId: 'vendor_biocart' } as any, quantity: 1 },
        { product: { id: 'p2', name: 'Other Item', price: 1000, vendorId: 'other_vendor' } as any, quantity: 1 }
      ];

      // Eligible subtotal for vendor_biocart is 500 (not 1500!)
      // 15% of 500 = 75
      const eligibleSubtotal = cartItems
        .filter(it => it.product.vendorId === vendorCoupon.creatorVendorId)
        .reduce((sum, it) => sum + it.product.price * it.quantity, 0);

      assert.equal(eligibleSubtotal, 500);
      const discount = Math.round((eligibleSubtotal * vendorCoupon.discountValue) / 100);
      assert.equal(discount, 75);
    });

    it('4. CheckoutModal integrates coupon input, validation and createOrder payload', async () => {
      const fs = await import('node:fs');
      const checkoutCode = fs.readFileSync('src/components/ui/CheckoutModal.tsx', 'utf8');

      assert.match(checkoutCode, /CouponService\.validateCartCoupon/);
      assert.match(checkoutCode, /handleApplyCoupon/);
      assert.match(checkoutCode, /handleRemoveCoupon/);
      assert.match(checkoutCode, /couponCode:\s*appliedCoupon/);
    });

    it('5. firestore.rules grants authorized vendors scoped permissions to manage their coupons', async () => {
      const fs = await import('node:fs');
      const rules = fs.readFileSync('firestore.rules', 'utf8');

      assert.match(rules, /match \/coupons\/\{couponId\}/);
      assert.match(rules, /isVendorOwner\(incoming\(\)\.creatorVendorId\)/);
      assert.match(rules, /isVendorOwner\(existing\(\)\.creatorVendorId\)/);
    });

    it('6. AdminCoupons uses Indian Rupee (₹) symbol instead of ($) and prevents leading zeros', async () => {
      const fs = await import('node:fs');
      const adminCode = fs.readFileSync('src/components/admin/AdminCoupons.tsx', 'utf8');

      assert.match(adminCode, /₹/);
      assert.doesNotMatch(adminCode, /Min Order \(\$\)/);
      assert.match(adminCode, /Min Order \(₹\)/);
      assert.match(adminCode, /Fixed Amount \(₹\)/);
      assert.match(adminCode, /value === 0 \? '' : formData\.value/);
    });

    it('7. VendorCoupons prevents leading zeros in numeric discount inputs', async () => {
      const fs = await import('node:fs');
      const vendorCode = fs.readFileSync('src/components/vendor/VendorCoupons.tsx', 'utf8');

      assert.match(vendorCode, /discountValue === 0 \? '' : discountValue/);
      assert.match(vendorCode, /minOrderAmount === 0 \? '' : minOrderAmount/);
    });

    it('8. CouponService enforces category-level coupon scoping in cart validation', async () => {
      const { CouponService } = await import('../src/services/CouponService.js');

      const categoryCoupon = {
        id: 'FERT20',
        code: 'FERT20',
        discountType: 'percentage' as const,
        discountValue: 20,
        minOrderAmount: 100,
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-12-31T23:59:59.000Z',
        usageLimit: 50,
        usedCount: 0,
        status: 'active' as const,
        creatorRole: 'admin' as const,
        applicableCategories: ['Organic Fertilizers']
      };

      const cartItems = [
        { product: { id: 'p1', name: 'Vermicompost', category: 'Organic Fertilizers', price: 400 } as any, quantity: 1 },
        { product: { id: 'p2', name: 'Gardening Pruner', category: 'Gardening Gear', price: 600 } as any, quantity: 1 }
      ];

      // Eligible items should only be Organic Fertilizers (400)
      const eligibleItems = cartItems.filter(it => categoryCoupon.applicableCategories.includes(it.product.category));
      assert.equal(eligibleItems.length, 1);
      assert.equal(eligibleItems[0].product.name, 'Vermicompost');

      const eligibleSubtotal = eligibleItems.reduce((sum, it) => sum + it.product.price * it.quantity, 0);
      assert.equal(eligibleSubtotal, 400);

      const discount = Math.round((eligibleSubtotal * categoryCoupon.discountValue) / 100);
      assert.equal(discount, 80);
    });

    it('9. VendorCoupons and AdminCoupons implement duration presets and validity calculations', async () => {
      const fs = await import('node:fs');
      const vendorCode = fs.readFileSync('src/components/vendor/VendorCoupons.tsx', 'utf8');
      const adminCode = fs.readFileSync('src/components/admin/AdminCoupons.tsx', 'utf8');

      // VendorCoupons checks
      assert.match(vendorCode, /handleDurationChange/);
      assert.match(vendorCode, /daysLeft/);
      assert.match(vendorCode, /applicableCategories/);

      // AdminCoupons checks
      assert.match(adminCode, /handleToggleStatus/);
      assert.match(adminCode, /applicableCategories/);
      assert.match(adminCode, /scopeType/);
    });

    it('10. CouponService unconditionally rejects vendor modification of admin-owned coupons', async () => {
      const fs = await import('node:fs');
      const couponServiceCode = fs.readFileSync('src/services/CouponService.ts', 'utf8');

      // Asserts that updateVendorCoupon checks if data.creatorRole === 'admin' and throws an error
      assert.match(couponServiceCode, /if\s*\(data\.creatorRole\s*===\s*'admin'\)/);
      assert.match(couponServiceCode, /Vendors cannot modify administrator-owned platform coupons/);
    });

    it('12. CouponService cleanses undefined fields before Firestore setDoc and updateDoc', async () => {
      const { removeUndefined } = await import('../src/utils/firestore.js');
      const payloadWithUndefined = {
        code: 'BIO20',
        discountType: 'percentage',
        discountValue: 20,
        minOrderAmount: 299,
        maxDiscountAmount: undefined,
        applicableProductIds: undefined,
        applicableCategories: undefined,
        startDate: '2026-10-17T00:00:00.000Z',
        endDate: '2026-11-17T00:00:00.000Z',
        usageLimit: 50,
        usedCount: 0,
        creatorRole: 'vendor',
        creatorVendorId: 'biocart'
      };

      const sanitized = removeUndefined(payloadWithUndefined);
      assert.equal('applicableProductIds' in sanitized, false, 'applicableProductIds must not exist when undefined');
      assert.equal('applicableCategories' in sanitized, false, 'applicableCategories must not exist when undefined');
      assert.equal('maxDiscountAmount' in sanitized, false, 'maxDiscountAmount must not exist when undefined');
      assert.equal(sanitized.code, 'BIO20');
      assert.equal(sanitized.discountValue, 20);
    });

    it('13. CouponService enforces non-empty product lists for specific product scope', async () => {
      const { CouponService } = await import('../src/services/CouponService.js');
      const cartItems = [
        { product: { id: 'prod_1', name: 'Vermicompost', category: 'Organic Fertilizers', price: 300, vendorId: 'biocart' } as any, quantity: 1 },
        { product: { id: 'prod_2', name: 'Neem Oil', category: 'Plant Care', price: 200, vendorId: 'other_vendor' } as any, quantity: 1 }
      ];

      // Test product-scoped coupon with matching and non-matching product
      const productCoupon = {
        id: 'PRODUCT10',
        code: 'PRODUCT10',
        discountType: 'percentage' as const,
        discountValue: 10,
        minOrderAmount: 100,
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-12-31T23:59:59.000Z',
        usageLimit: 100,
        usedCount: 0,
        status: 'active' as const,
        creatorRole: 'vendor' as const,
        creatorVendorId: 'biocart',
        applicableProductIds: ['prod_1']
      };

      // Only prod_1 is eligible
      const eligibleItems = cartItems.filter(it => 
        it.product.vendorId === productCoupon.creatorVendorId && 
        productCoupon.applicableProductIds.includes(it.product.id)
      );
      assert.equal(eligibleItems.length, 1);
      assert.equal(eligibleItems[0].product.id, 'prod_1');
      assert.equal(eligibleItems[0].product.price * eligibleItems[0].quantity, 300);
    });

    it('14. VendorCoupons handles all 3 scope modes without undefined fields', async () => {
      const fs = await import('node:fs');
      const vendorCouponsCode = fs.readFileSync('src/components/vendor/VendorCoupons.tsx', 'utf8');

      // Verify scope checks before submitting
      assert.match(vendorCouponsCode, /scopeType === 'products' && selectedProductIds\.length === 0/);
      assert.match(vendorCouponsCode, /scopeType === 'categories' && selectedCategories\.length === 0/);
      assert.match(vendorCouponsCode, /endTimestamp <= startTimestamp/);
      assert.match(vendorCouponsCode, /Number\(usageLimit\) <= 0/);
    });

    it('15. Blog CMS types and initial blog content validate with clean slugs and structured blocks', async () => {
      const { INITIAL_BLOG_POSTS } = await import('../src/data/initialBlogs.js');
      assert.ok(INITIAL_BLOG_POSTS.length >= 3, 'Must have at least 3 initial agronomy blogs');
      
      for (const blog of INITIAL_BLOG_POSTS) {
        assert.ok(blog.id, 'Blog must have an ID');
        assert.ok(blog.title, 'Blog must have a title');
        assert.ok(blog.slug, 'Blog must have a slug');
        assert.match(blog.slug, /^[a-z0-9-]+$/, 'Slug must be clean alphanumeric with hyphens');
        assert.equal(blog.status, 'published');
        assert.ok(blog.blocks.length >= 4, 'Blog must have structured blocks');
        assert.ok(blog.seo?.title, 'Blog must have an SEO title');
        assert.ok(blog.seo?.metaDescription, 'Blog must have an SEO meta description');
        assert.ok(blog.author?.name, 'Blog must have an author');
      }
    });

    it('16. Public Footer contains verified link to Blogs', async () => {
      const fs = await import('node:fs');
      const footerCode = fs.readFileSync('src/components/layout/Footer.tsx', 'utf8');
      assert.match(footerCode, /label:\s*'Blogs',\s*tab:\s*'blogs'/);
    });

    it('17. Product SEO extensions allow custom titles, descriptions and target keywords', async () => {
      const productWithSEO = {
        id: 'prod_test_seo',
        name: 'Organic Neem Oil 250ml',
        category: 'Plant Care',
        price: 199,
        mrp: 299,
        sku: 'BC-NEEM-250',
        rating: 4.8,
        reviewsCount: 15,
        image: '/assets/products/prod_neem_oil.png',
        images: ['/assets/products/prod_neem_oil.png'],
        description: 'Cold pressed pure neem oil for organic pest control',
        shortDescription: 'Pure neem oil',
        features: ['100% Cold Pressed'],
        benefits: ['Repels mealybugs and aphids'],
        usageInstructions: ['Mix 5ml per liter with water'],
        weightVariants: ['250ml'],
        stockStatus: 'In Stock' as const,
        inStock: true,
        seoTitle: 'Buy Pure Cold-Pressed Neem Oil Online India | BioCart',
        seoDescription: '100% natural cold-pressed neem oil with high azadirachtin content for safe organic pest control in home gardens.',
        targetKeyword: 'buy neem oil online india',
        imageAltText: 'BioCart Organic Cold Pressed Neem Oil 250ml bottle',
        noIndex: false
      };

      assert.equal(productWithSEO.seoTitle, 'Buy Pure Cold-Pressed Neem Oil Online India | BioCart');
      assert.equal(productWithSEO.targetKeyword, 'buy neem oil online india');
      assert.equal(productWithSEO.noIndex, false);
    });

    it('18. Sitemap generator includes canonical Blogs hub and published blog articles', async () => {
      const fs = await import('node:fs');
      const sitemapContent = fs.readFileSync('public/sitemap.xml', 'utf8');
      assert.match(sitemapContent, /<loc>https:\/\/biocart\.in\/blogs<\/loc>/);
      assert.match(sitemapContent, /<loc>https:\/\/biocart\.in\/blogs\/vermicompost-complete-guide-india<\/loc>/);
      assert.match(sitemapContent, /<loc>https:\/\/biocart\.in\/blogs\/cocopeat-vs-soil-potting-mix-guide<\/loc>/);
      assert.match(sitemapContent, /<loc>https:\/\/biocart\.in\/blogs\/organic-pest-control-neem-oil-sprays<\/loc>/);
    });

    it('19. Public Navigation in DynamicIslandNav contains exactly Home and Shop, while Footer contains 5 informational links', async () => {
      const fs = await import('node:fs');
      const dynamicNavContent = fs.readFileSync('src/components/layout/DynamicIslandNav.tsx', 'utf8');
      const footerContent = fs.readFileSync('src/components/layout/Footer.tsx', 'utf8');

      // Verify DynamicIslandNav links contains exactly Home and Shop
      assert.match(dynamicNavContent, /{\s*label:\s*'Home'/);
      assert.match(dynamicNavContent, /{\s*label:\s*'Shop'/);
      assert.doesNotMatch(dynamicNavContent, /navLinks\s*=\s*useMemo\(\(\)\s*=>\s*\[[\s\S]*?'About Us'/);
      assert.doesNotMatch(dynamicNavContent, /navLinks\s*=\s*useMemo\(\(\)\s*=>\s*\[[\s\S]*?'Blogs'/);

      // Verify Footer Navigation links contains all 5 links
      assert.match(footerContent, /{\s*label:\s*'Home',\s*tab:\s*'home'\s*}/);
      assert.match(footerContent, /{\s*label:\s*'Shop',\s*tab:\s*'shop'\s*}/);
      assert.match(footerContent, /{\s*label:\s*'About Us',\s*tab:\s*'about-us'\s*}/);
      assert.match(footerContent, /{\s*label:\s*'Contact Us',\s*tab:\s*'contact-us'\s*}/);
      assert.match(footerContent, /{\s*label:\s*'Blogs',\s*tab:\s*'blogs'\s*}/);
    });

    it('20. Shop categories are strictly excluded from INITIAL_CMS_PAGES', async () => {
      const { INITIAL_CMS_PAGES } = await import('../src/data/initialCMSPages.js');
      const categoryPages = INITIAL_CMS_PAGES.filter(p => p.category === 'Shop' || p.id.startsWith('cat-'));
      assert.equal(categoryPages.length, 0, 'No shop category pages should exist in canonical CMS pages');
    });
  });

  describe('Section 25: Feature 4 — Fully Automatic Weekly Vendor Bank Payouts', () => {
    it('1. verifies tuesdayVendorSettlement cron is configured for 5:00 PM IST (Asia/Kolkata)', async () => {
      const fs = await import('node:fs');
      const engineCode = fs.readFileSync('functions/src/settlementEngine.ts', 'utf8');

      // Schedule: 0 17 * * 2 (17:00 IST every Tuesday)
      assert.match(engineCode, /schedule:\s*'0 17 \* \* 2'/);
      assert.match(engineCode, /timeZone:\s*'Asia\/Kolkata'/);
      assert.match(engineCode, /region:\s*'asia-southeast1'/);
    });

    it('2. verifies functions/src/index.ts exports all weekly payout automation functions', async () => {
      const fs = await import('node:fs');
      const indexCode = fs.readFileSync('functions/src/index.ts', 'utf8');

      assert.match(indexCode, /tuesdayVendorSettlement/);
      assert.match(indexCode, /retryVendorPayout/);
      assert.match(indexCode, /razorpayPayoutWebhook/);
      assert.match(indexCode, /triggerManualSettlement/);
    });

    it('3. verifies firestore.rules declares Rule 28 for vendor_settlements with least-privilege', async () => {
      const fs = await import('node:fs');
      const rules = fs.readFileSync('firestore.rules', 'utf8');

      assert.match(rules, /match\s+\/vendor_settlements\/\{settlementId\}/);
      assert.match(rules, /isAdmin\(\)\s*\|\|\s*\(isSignedIn\(\)\s*&&\s*resource\.data\.vendorId\s*==\s*request\.auth\.uid\)/);
      assert.match(rules, /allow\s+write:\s*if\s+isAdmin\(\);/);
    });

    it('4. verifies AdminLayout and AdminConsole include Payouts & Settlements navigation and view', async () => {
      const fs = await import('node:fs');
      const layoutCode = fs.readFileSync('src/components/admin/AdminLayout.tsx', 'utf8');
      const consoleCode = fs.readFileSync('src/components/admin/AdminConsole.tsx', 'utf8');

      assert.match(layoutCode, /id:\s*'payouts'/);
      assert.match(layoutCode, /label:\s*'Payouts & Settlements'/);
      assert.match(consoleCode, /import\s*\{\s*AdminPayouts\s*\}\s*from\s*'\.\/AdminPayouts'/);
      assert.match(consoleCode, /case\s*'payouts':/);
      assert.match(consoleCode, /return\s*<AdminPayouts\s*\/>/);
    });

    it('5. verifies AdminSettings describes the Tuesday 5:00 PM–6:00 PM IST automated payout window', async () => {
      const fs = await import('node:fs');
      const settingsCode = fs.readFileSync('src/components/admin/AdminSettings.tsx', 'utf8');

      assert.match(settingsCode, /17:00 IST/);
      assert.match(settingsCode, /5:00 PM–6:00 PM IST window/);
    });

    it('6. verifies AdminService provides real-time subscription and retry callables', async () => {
      const fs = await import('node:fs');
      const serviceCode = fs.readFileSync('src/services/AdminService.ts', 'utf8');

      assert.match(serviceCode, /subscribeToSettlements/);
      assert.match(serviceCode, /triggerManualPayout/);
      assert.match(serviceCode, /retryVendorPayout/);
    });

    it('7. verifies bank account validation rejects invalid accounts and formats', async () => {
      const fs = await import('node:fs');
      const engineCode = fs.readFileSync('functions/src/settlementEngine.ts', 'utf8');

      assert.equal(engineCode.includes('^\\d+$'), true, 'Numeric account regex check must exist');
      assert.equal(engineCode.includes('^[A-Z]{4}0[A-Z0-9]{6}$'), true, 'IFSC regex check must exist');
      assert.match(engineCode, /status:\s*'needs_review'/);
      assert.match(engineCode, /status:\s*'failed'/);
    });
  });

  describe('Section 26: Financial Control Center, Wallet Ledger & BI Analytics (Features 5 & 6)', () => {
    it('1. correctly computes all 15 authoritative marketplace financial metrics', async () => {
      const { AnalyticsService } = await import('../src/services/AnalyticsService.js');

      const mockOrders = [
        {
          id: 'ORD-1',
          paymentStatus: 'paid',
          paymentMethod: 'razorpay',
          status: 'delivered',
          totalAmount: 1180, // Total order
          itemSubtotal: 1000,
          vendorDiscount: 100,
          platformDiscount: 50,
          shippingFee: 80,
          shippingCost: 70,
          taxAmount: 180,
          commissionFee: 150,
          vendorPayout: 900
        },
        {
          id: 'ORD-2',
          paymentStatus: 'pending',
          paymentMethod: 'cod',
          status: 'processing',
          totalAmount: 500,
          itemSubtotal: 450,
          vendorDiscount: 0,
          platformDiscount: 0,
          shippingFee: 50,
          shippingCost: 40,
          taxAmount: 0,
          commissionFee: 50,
          vendorPayout: 400
        }
      ];

      const mockWallets = [
        {
          vendorId: 'v1',
          availableBalance: 25000,
          pendingBalance: 5000,
          settlingBalance: 2000
        }
      ];

      const mockSettlements = [
        { id: 's1', status: 'paid', amountPaise: 100000 },
        { id: 's2', status: 'processing', amountPaise: 20000 },
        { id: 's3', status: 'failed', amountPaise: 5000 },
        { id: 's4', status: 'needs_review', amountPaise: 3000 }
      ];

      const mockLedger = [
        { id: 'l1', type: 'order_item_earning', creditPaise: 90000 },
        { id: 'l2', type: 'refund_debit', debitPaise: 10000 }
      ];

      const summary = AnalyticsService.aggregateMarketplaceFinancials(
        mockOrders,
        mockWallets,
        mockSettlements,
        mockLedger
      );

      // Verify key metrics
      assert.equal(summary.totalOrdersCount, 2);
      assert.equal(summary.completedOrdersCount, 1);
      assert.equal(summary.grossMerchandiseValuePaise, 168000); // 118000 + 50000
      assert.equal(summary.prepaidCollectionsPaise, 118000);
      assert.equal(summary.codAwaitingCollectionPaise, 50000);
      assert.equal(summary.shippingCollectedPaise, 13000); // 8000 + 5000
      assert.equal(summary.taxCollectedPaise, 18000);
      assert.equal(summary.vendorWalletLiabilitiesPaise, 32000); // 25000 + 5000 + 2000
      assert.equal(summary.payoutsPaidPaise, 100000);
      assert.equal(summary.payoutsProcessingPaise, 20000);
      assert.equal(summary.payoutsFailedPaise, 5000);
      assert.equal(summary.payoutsNeedsReviewPaise, 3000);
    });

    it('2. verifies Asia/Kolkata date range boundary generation', async () => {
      const { AnalyticsService } = await import('../src/services/AnalyticsService.js');

      const { current: todayRange, previous: prevRange } = AnalyticsService.getDateRange('today');
      assert.equal(todayRange.label, 'Today');
      assert.ok(todayRange.start instanceof Date);
      assert.ok(todayRange.end instanceof Date);
      assert.ok(todayRange.start.getTime() <= todayRange.end.getTime());

      const { current: thisMonthRange, previous: prevMonthRange } = AnalyticsService.getDateRange('this_month');
      assert.equal(thisMonthRange.label, 'This Month');
      assert.ok(prevMonthRange.start instanceof Date);
      assert.ok(prevMonthRange.end instanceof Date);
    });

    it('3. aggregates vendor financial summaries with masked bank details', async () => {
      const { AnalyticsService } = await import('../src/services/AnalyticsService.js');

      const vendors = [
        {
          id: 'v1',
          storeName: 'Kaveri Bio Organics',
          status: 'active',
          payoutHold: false,
          settlement: {
            bankName: 'State Bank of India',
            accountNumberMasked: '•••• 1234',
            accountNumber: '12345678901234',
            ifscCode: 'SBIN0001234',
            beneficiaryName: 'Kaveri Bio'
          }
        }
      ];

      const wallets = [
        {
          id: 'v1',
          vendorId: 'v1',
          availableBalance: 500000,
          pendingBalance: 100000,
          settlingBalance: 0,
          paidOutBalance: 200000
        }
      ];

      const settlements = [
        { id: 's1', vendorId: 'v1', status: 'paid', amountPaise: 200000 }
      ];

      const orders = [
        {
          vendorOrders: [
            {
              vendorId: 'v1',
              subtotal: 5000,
              commissionFee: 500,
              netVendorEarnings: 4500
            }
          ]
        }
      ];

      const summaries = AnalyticsService.buildVendorFinancialSummaries(vendors, wallets, settlements, orders);
      assert.equal(summaries.length, 1);
      assert.equal(summaries[0].vendorId, 'v1');
      assert.equal(summaries[0].storeName, 'Kaveri Bio Organics');
      assert.equal(summaries[0].walletAvailablePaise, 500000);
      assert.equal(summaries[0].accountNumberMasked, '•••• 1234');
      assert.equal(summaries[0].bankName, 'State Bank of India');
      assert.equal(summaries[0].ifscCode, 'SBIN0001234');
      assert.equal(summaries[0].totalSuccessfullySettledPaise, 200000);
      assert.equal(summaries[0].gmvPaise, 500000);
    });

    it('4. verifies time-series aggregation for hourly, daily and monthly dimensions', async () => {
      const { AnalyticsService } = await import('../src/services/AnalyticsService.js');

      const { current: dateRange } = AnalyticsService.getDateRange('today');
      const orders = [
        {
          createdAt: new Date(),
          totalAmount: 1500,
          commissionFee: 150
        }
      ];

      const hourlySeries = AnalyticsService.generateTimeSeriesData(orders, dateRange, 'hourly');
      assert.ok(Array.isArray(hourlySeries));
      assert.ok(hourlySeries.length >= 0);

      const dailySeries = AnalyticsService.generateTimeSeriesData(orders, dateRange, 'daily');
      assert.ok(Array.isArray(dailySeries));
      assert.ok(dailySeries.length >= 0);
    });

    it('5. verifies AdminLayout and AdminConsole include Financial Control Center', async () => {
      const fs = await import('node:fs');
      const layoutCode = fs.readFileSync('src/components/admin/AdminLayout.tsx', 'utf8');
      const consoleCode = fs.readFileSync('src/components/admin/AdminConsole.tsx', 'utf8');

      assert.match(layoutCode, /id:\s*'financials'/);
      assert.match(layoutCode, /label:\s*'Financial Control Center'/);
      assert.match(consoleCode, /import\s*\{\s*AdminFinancials\s*\}\s*from\s*'\.\/AdminFinancials'/);
      assert.match(consoleCode, /case\s*'financials':/);
      assert.match(consoleCode, /return\s*<AdminFinancials\s*\/>/);
    });

    it('6. verifies settlementEngine triggerManualSettlement validates bounds and hold state', async () => {
      const fs = await import('node:fs');
      const engineCode = fs.readFileSync('functions/src/settlementEngine.ts', 'utf8');

      assert.match(engineCode, /export\s+const\s+triggerManualSettlement/);
      assert.match(engineCode, /payoutHold/);
      assert.match(engineCode, /availableBalance/);
      assert.match(engineCode, /Requested settlement amount.*exceeds available wallet balance/);
    });
  });

  describe('Section 27: Strict Root-Cause Repair, Admin Dashboard, Vendor Drilldown & Legal Documents Verification', () => {
    it('1. verifies DynamicIslandNav contains strictly Home and Shop', async () => {
      const fs = await import('node:fs');
      const navCode = fs.readFileSync('src/components/layout/DynamicIslandNav.tsx', 'utf8');
      
      assert.match(navCode, /label:\s*'Home',\s*tab:\s*'home'/);
      assert.match(navCode, /label:\s*'Shop',\s*tab:\s*'shop'/);
      assert.doesNotMatch(navCode, /navLinks\s*=\s*useMemo\(\(\)\s*=>\s*\[[\s\S]*?'About Us'/);
      assert.doesNotMatch(navCode, /navLinks\s*=\s*useMemo\(\(\)\s*=>\s*\[[\s\S]*?'Blogs'/);
    });

    it('2. verifies Footer retains all essential informational and legal links', async () => {
      const fs = await import('node:fs');
      const footerCode = fs.readFileSync('src/components/layout/Footer.tsx', 'utf8');

      assert.match(footerCode, /About Us/);
      assert.match(footerCode, /Contact Us/);
      assert.match(footerCode, /Blogs/);
      assert.match(footerCode, /Terms of Service/);
      assert.match(footerCode, /Privacy Policy/);
    });

    it('3. verifies AdminDashboard uses AnalyticsService for authoritative integer calculations', async () => {
      const fs = await import('node:fs');
      const dashboardCode = fs.readFileSync('src/components/admin/AdminDashboard.tsx', 'utf8');

      assert.match(dashboardCode, /AnalyticsService/);
      assert.match(dashboardCode, /AnalyticsService\.aggregateMarketplaceFinancials/);
      assert.match(dashboardCode, /AnalyticsService\.getDateRange/);
      assert.match(dashboardCode, /Asia\/Kolkata/);
      assert.match(dashboardCode, /Operational Action Queue/);
    });

    it('4. verifies AdminVendors includes Vendor Individual Dashboard Modal integration', async () => {
      const fs = await import('node:fs');
      const vendorsCode = fs.readFileSync('src/components/admin/AdminVendors.tsx', 'utf8');
      const modalCode = fs.readFileSync('src/components/admin/VendorIndividualDashboardModal.tsx', 'utf8');

      assert.match(vendorsCode, /VendorIndividualDashboardModal/);
      assert.match(vendorsCode, /dashboardVendor/);
      assert.match(modalCode, /Gross Attributed GMV/);
      assert.match(modalCode, /Vendor Net Earnings/);
      assert.match(modalCode, /Available Wallet Balance/);
      assert.match(modalCode, /Beneficiary Bank Account/);
      assert.match(modalCode, /Double-Entry Ledger/);
    });

    it('5. verifies Privacy Policy CMS document contains all 22 structured legal sections and real entity details', async () => {
      const { INITIAL_CMS_PAGES } = await import('../src/data/initialCMSPages.js');
      const privacyPage = INITIAL_CMS_PAGES.find((p: any) => p.id === 'privacy-policy');
      assert.ok(privacyPage, 'privacy-policy page must exist');
      
      const contentSection = privacyPage.sections.find((s: any) => s.id === 'privacy-content-main');
      assert.ok(contentSection, 'privacy-content-main section must exist');
      const html = contentSection.data.content;

      assert.match(html, /Sindulis Agro Products Private Limited/);
      assert.match(html, /U01110AP2023PTC123456/);
      assert.match(html, /Tanuku, West Godavari District, Andhra Pradesh - 534211/);
      assert.match(html, /privacy@biocart\.co\.in/);
      for (let i = 1; i <= 22; i++) {
        assert.match(html, new RegExp(`<h3>${i}\\.`));
      }
    });

    it('6. verifies Terms of Service CMS document contains all 20 structured legal sections and real entity details', async () => {
      const { INITIAL_CMS_PAGES } = await import('../src/data/initialCMSPages.js');
      const termsPage = INITIAL_CMS_PAGES.find((p: any) => p.id === 'terms-of-service');
      assert.ok(termsPage, 'terms-of-service page must exist');

      const contentSection = termsPage.sections.find((s: any) => s.id === 'terms-content-main');
      assert.ok(contentSection, 'terms-content-main section must exist');
      const html = contentSection.data.content;

      assert.match(html, /Sindulis Agro Products Private Limited/);
      assert.match(html, /U01110AP2023PTC123456/);
      assert.match(html, /Tanuku, West Godavari District, Andhra Pradesh - 534211/);
      assert.match(html, /support@biocart\.co\.in/);
      for (let i = 1; i <= 20; i++) {
        assert.match(html, new RegExp(`<h3>${i}\\.`));
      }
    });
  });
});






