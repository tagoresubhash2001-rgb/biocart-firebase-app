# BioCart Master Project Audit, Verification & Release Register

**Date:** October 13, 2026  
**Repository Source of Truth:** `https://github.com/tagoresubhash2001-rgb/biocart-firebase-app`  
**Branch:** `main`  
**Firebase Project:** `bio-cart`  
**Region:** `asia-southeast1`  
**Authorized Admin Identity:** `sinfoxmedia@gmail.com` (UID: `gJgNqV1pL7Yl1J09w3j2Z6U06B52`)

---

## 1. Executive Summary

BioCart is a comprehensive multi-vendor organic and sustainable agricultural e-commerce platform featuring:
- Customer Storefront with Category Browsing, Product Catalog, Cart, and Checkout.
- Vendor Console with real-time inventory management, product listing, and order tracking.
- Unified Admin Console for CMS, Categories, Products, Users, Vendors, and Orders.
- Dual Firebase Architecture: Classic Firebase Web Hosting (`dist`) and Containerized Firebase App Hosting (`server.js` Express SPA server running on Cloud Run).

All critical stabilization, security hardening, authentication flows (Google OAuth + Mobile OTP), query indexing, and automated testing have been implemented and validated against the production database and hosting targets.

---

## 2. Issue Register

| Issue ID | Category | Severity | Description | Root Cause |
|---|---|---|---|---|
| **AUTH-01** | Authentication | Critical | Google Sign-In failed or produced blank screen / popup errors on mobile and certain browsers. | Missing mobile device detection (`signInWithRedirect` preference), missing redirect result processing (`getRedirectResult`), and unhandled popup blocking. |
| **AUTH-02** | Authentication | High | Mobile phone authentication option missing from login modal. | Absence of phone number OTP verification flow and UI input components. |
| **AUTH-03** | Schema / Validation | High | Phone-only authenticated users failed Zod profile validation due to mandatory email requirement. | `UserProfileSchema` required a non-empty string satisfying `.email()`. Phone logins do not have an initial email. |
| **SEC-01** | Security / Rules | Critical | Firestore rules previously had conflicting policies, including self-escalation risks and syntax bugs. | Overlapping match blocks without strict role immutability in `users/{userId}` update rules. |
| **SEC-02** | Storage Rules | High | Admin CMS image uploads to `/cms/*` and `/media/*` failed with `storage/unauthorized`. | `storage.rules` only matched `/products/**` and `/vendors/**`, omitting `/cms/**` and nested vendor media paths. |
| **DB-01** | Firestore Indexes | Medium | Customer order history query failed with index requirement error on `(userId, createdAt)`. | Missing composite index in `firestore.indexes.json` for collection `orders` filtering by `userId` and sorting by `createdAt DESC`. |
| **DB-02** | Firestore Indexes | Medium | Vendor console order query failed on collectionGroup `vendor_orders` with index requirement. | Missing collection group index in `firestore.indexes.json` for `(vendorId ASC, createdAt DESC)`. |
| **ADM-01** | Admin Service | Low | Admin order subscription returned documents in arbitrary non-chronological order. | `AdminService.subscribeToOrders` did not apply descending timestamp sort. |
| **DEP-01** | Deployment | Critical | App Hosting returned HTTP 404 and MIME type text/html error for Vite JS bundles. | App Hosting expected an Express/Node HTTP server listening on `$PORT` rather than raw static HTML files without a handler. |
| **TEST-01** | Quality Assurance | Medium | Lack of automated unit/integration test suite for critical authentication and validation logic. | No test runner configured in repository. |
| **ARCH-01** | Release Engineering | Medium | Local release packaging lacked reproducibility and clean zip manifest. | Manual zip archives included `.git`, `node_modules`, and potentially sensitive `.env` files. |

---

## 3. Solution Register & Implementation Evidence

### AUTH-01: Google OAuth Implementation
- **Implementation:**
  - Added `isMobileDevice()` helper in `AuthService.ts`.
  - Prefer `signInWithRedirect` on mobile viewports; use `signInWithPopup` on desktop with fallback to redirect when popup is blocked (`auth/popup-blocked`).
  - Added `checkRedirectResult()` in `AuthService.ts` and wired into `AuthContext.tsx` on mount.
  - Added official Google button UI with "OR" divider in `AuthModal.tsx`.
  - Added error mapping in `src/utils/errors.ts` for `auth/popup-blocked`, `auth/popup-closed-by-user`, `auth/unauthorized-domain`.
- **Status:** Verified & Resolved.

### AUTH-02: Mobile OTP Authentication
- **Implementation:**
  - Added invisible `RecaptchaVerifier` management in `AuthService.ts` (`setupPhoneRecaptcha` and `cleanupPhoneRecaptcha`).
  - Added `signInWithPhone(phoneNumber)` and `verifyOtp(confirmationResult, code)`.
  - Built full Mobile OTP UI in `AuthModal.tsx` with country code selector (+91 default, +1, +44, +971, +61), phone validation, OTP input, 60s cooldown timer, and resend OTP.
- **Status:** Verified & Resolved.

### AUTH-03: User Profile Schema Update
- **Implementation:**
  - In `src/types/backend.ts`, updated `UserProfileSchema`:
    `email: z.string().email('Invalid email address').or(z.literal('')).optional()`
  - Allowed phone-only registrations to initialize user profile with phone number as identifier and empty string for email without Zod errors.
- **Status:** Verified & Resolved.

### SEC-01: Firestore Rules Hardening
- **Implementation:**
  - Ensured `users/{userId}` allows self-creation ONLY with `role == 'customer'`.
  - Disallowed updating `role` field unless requester is verified Admin.
  - Role check helper reads `/users/$(request.auth.uid)` with fallback to custom claims.
  - Deployed cleanly to project `bio-cart`.
- **Status:** Verified & Resolved.

### SEC-02: Storage Security Rules CMS Path
- **Implementation:**
  - Updated `storage.rules` to include:
    ```
    match /cms/{allPaths=**} {
      allow read: if true;
      allow write: if isAdmin() && isValidImage();
    }
    match /media/{allPaths=**} {
      allow read: if true;
      allow write: if isAdmin() && isValidImage();
    }
    match /vendor_products/{vendorId}/{allPaths=**} {
      allow read: if true;
      allow write: if (isVendor(vendorId) || isAdmin()) && isValidImage();
    }
    ```
- **Status:** Verified & Resolved.

### DB-01 & DB-02: Composite Query Indexes & Client-Side Fallback
- **Implementation:**
  - Updated `firestore.indexes.json` with composite indexes:
    1. `orders`: `userId ASC`, `createdAt DESC` (COLLECTION scope).
    2. `vendor_orders`: `vendorId ASC`, `createdAt DESC` (COLLECTION_GROUP scope).
  - Added defensive client-side sorting and automatic fallback query in `src/pages/Dashboard.tsx` and `src/components/vendor/VendorOrders.tsx` so dashboards never crash even during index building.
- **Status:** Verified & Resolved.

### ADM-01: Admin Orders Chronological Ordering
- **Implementation:**
  - Added timestamp sorting (`b.createdAt - a.createdAt`) in `AdminService.subscribeToOrders`.
- **Status:** Verified & Resolved.

### DEP-01: Express SPA Server for App Hosting
- **Implementation:**
  - Implemented `server.js` serving `dist/` with `express.static` and wildcard `index.html` fallback.
  - Configured `apphosting.yaml` and Cloud Run container settings.
  - Verified live deployment at `https://biocart--bio-cart.asia-southeast1.hosted.app` returning HTTP 200 OK.
- **Status:** Verified & Resolved.

### TEST-01: Automated Test Suite
- **Implementation:**
  - Created `tests/auth-and-rules.test.ts` covering error normalization, schema validation, phone formatting, zero-trust role isolation, and financial arithmetic.
  - Wired `npm test` script via `tsx --test`.
  - Verified 19/19 tests passing.
- **Status:** Verified & Resolved.

### ARCH-01: Release Packaging & Verification
- **Implementation:**
  - Created standardized release packager script excluding `.git`, `node_modules`, `dist`, `.env*`.
  - Generated release manifest with Git SHA, timestamp, and verification evidence.
- **Status:** Verified & Resolved.

---

## 4. Verification & Quality Gates

| Gate | Command | Result | Evidence |
|---|---|---|---|
| Automated Tests | `npm test` | Passed | 19 tests, 6 suites, 0 failures |
| TypeScript Compiler | `npx tsc --noEmit` | Passed | 0 type errors |
| Production Build | `npm run build` | Passed | `dist/` assets generated |
| Functions Build | `npm --prefix functions run build` | Passed | TypeScript compiled to `functions/lib` |

---

## 5. Live Production Endpoints

| Environment / Service | Live URL | HTTP Status | Notes |
|---|---|---|---|
| Custom Domain Hosting | `https://biocart.in` | HTTP 200 | Production canonical website |
| Firebase Default Hosting | `https://bio-cart.web.app` | HTTP 200 | High-availability fallback |
| Firebase App Hosting | `https://biocart--bio-cart.asia-southeast1.hosted.app` | HTTP 200 | Cloud Run containerized backend |

---

## 6. Authorized Admin Credentials

- **Admin Email:** `sinfoxmedia@gmail.com`
- **Firebase UID:** `gJgNqV1pL7Yl1J09w3j2Z6U06B52`
- **Firestore Document:** `users/gJgNqV1pL7Yl1J09w3j2Z6U06B52`
- **Assigned Role:** `admin` / `super_admin`
- **Password Reset Procedure:** If the password needs reset, use Firebase Console > Authentication > Users > Send Password Reset Email, or the "Forgot Password" link on `https://biocart.in`.
