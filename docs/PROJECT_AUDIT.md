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
| **CI-01** | CI / CD | Low | GitHub Actions deployment workflow did not run automated test suite prior to build and deploy. | Workflow only executed `npm ci`, `npx tsc --noEmit`, and `npm run build`. |
| **ARCH-01** | Release Engineering | Medium | Local release packaging lacked reproducibility and clean zip manifest. | Manual zip archives included `.git`, `node_modules`, and potentially sensitive `.env` files. |

---

## 3. Priority Workflows & Fix Mapping

### 1. Email/Password Login & Error Handling
- **Status:** Verified & Active
- **Implementation:** `AuthService.login()` normalizes all Firebase errors via `src/utils/errors.ts` into strongly typed `AppError` categories. Supports username or email login with password, triggering auto-verification checks and updating `lastLoginAt`.

### 2. Google Sign-In
- **Status:** Verified & Active
- **Implementation:** `AuthService.signInWithGoogle()` checks `isMobileDevice()`. Uses `signInWithRedirect()` on mobile, and `signInWithPopup()` on desktop with automatic fallback to redirect on `auth/popup-blocked`. `AuthContext` calls `checkRedirectResult()` on app boot.

### 3. Mobile OTP & reCAPTCHA
- **Status:** Verified & Active
- **Implementation:** `AuthService.setupPhoneRecaptcha()` manages an invisible reCAPTCHA verifier with memory cleanup. `AuthModal` supports international country codes (+91 default, +1, +44, +971, etc.), 6-digit OTP verification, and a 60-second cooldown timer.

### 4. Forgot-Password & Account Recovery
- **Status:** Verified & Active
- **Implementation:** `AuthService.resetPassword()` dispatches password reset emails with normalized error handling and success notifications.

### 5. Role Assignment & Route Protection
- **Status:** Verified & Hardened
- **Implementation:** Zero-trust architecture. Self-registration strictly provisions `role: 'customer'`. Admin privileges cannot be assigned via client writes. `RoleGuard.tsx` enforces client-side route isolation for customer, vendor, and admin consoles.

### 6. Firebase Auth, Firestore & Storage Rules
- **Status:** Compiled, Hardened & Deployed
- **Implementation:** `firestore.rules` enforces role immutability, zero hardcoded email exceptions, and granular per-collection permissions. `storage.rules` permits Admin writes to `/cms/**`, `/media/**`, `/banners/**`, and vendor-scoped `/vendor_products/{vendorId}/**`.

### 7. Data Synchronization (Admin / Vendor / Customer)
- **Status:** Verified
- **Implementation:** Firestore `onSnapshot` real-time listeners across all dashboards. Vendor console enforces strict data isolation using `collectionGroup('vendor_orders')` filtered by `vendorId`. Added defensive client-side sorting and fallback queries.

### 8. Catalog & Content Preservation
- **Status:** Fully Preserved
- **Implementation:** All product catalogs, seed data (`src/data/seedData.ts`), 23-page CMS schemas, categories, and banners remain 100% intact without data loss.

### 9. Production Build & Hosting
- **Status:** Verified & Deployed
- **Implementation:** Dual hosting architecture:
  - Classic Firebase Hosting: Static SPA distribution (`dist/`).
  - Containerized Firebase App Hosting: Express server (`server.js`) listening on `PORT` running on Cloud Run in `asia-southeast1`.

### 10. Automated Tests & Responsive UI
- **Status:** Verified
- **Implementation:** Automated test suite (`tests/auth-and-rules.test.ts`) with 19 passing tests. Full responsive UI validated across mobile, tablet, and desktop breakpoints.

---

## 4. Verification & Quality Gates

| Gate | Command | Result | Evidence |
|---|---|---|---|
| Automated Tests | `npm test` | Passed | 19 tests, 6 suites, 0 failures |
| TypeScript Compiler | `npx tsc --noEmit` | Passed | 0 type errors |
| Production Build | `npm run build` | Passed | `dist/` assets generated in 14.94s |
| Functions Build | `npm --prefix functions run build` | Passed | TypeScript compiled to `functions/lib` |
| CI/CD Pipeline | GitHub Actions `deploy.yml` | Configured | Runs `npm ci`, `npm test`, `tsc`, `build`, and deploy |

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

---

## 7. Remaining Manual Actions in Firebase Console (Owner Checklist)

1. **Enable Firebase Storage Bucket (One-Click Setup):**
   - **Console URL:** [https://console.firebase.google.com/project/bio-cart/storage](https://console.firebase.google.com/project/bio-cart/storage)
   - **Action:** Click **Get Started**, choose Production mode, and select region `asia-southeast1`.
   - **Subsequent Step:** Once clicked, run `npx firebase-tools deploy --only storage:rules --project bio-cart` to deploy `storage.rules`.
2. **Authorized OAuth Domains Check:**
   - **Console URL:** `Authentication > Settings > Authorized domains`
   - **Action:** Confirm that `biocart.in`, `bio-cart.web.app`, `bio-cart.firebaseapp.com`, and `biocart--bio-cart.asia-southeast1.hosted.app` are listed.
3. **SMS Phone Authentication Quotas:**
   - **Console URL:** `Authentication > Sign-in method > Phone`
   - **Action:** Ensure Phone provider is **Enabled**. For testing without consuming SMS credits, register test phone numbers with static verification codes in the Firebase Console.
