# BioCart Authentication Audit

**Repository:** `tagoresubhash2001-rgb/biocart-firebase-app`  
**Firebase project:** `bio-cart`  
**Audit date:** 2026-10-13

This records what was confirmed from the checked-out source and local builds. A source review does not prove that the production Firebase provider settings, SMS delivery, OAuth consent configuration, or user accounts are correct.

## Findings and fixes

| Area | Finding | Change | Result |
|---|---|---|---|
| Admin authorization | The client promoted the designated owner email to `super_admin` and could trust a cached local profile during offline recovery. | Removed client-side role promotion and cached-role recovery. Admin routes now require an active Firestore profile; admin roles also require a verified email. The owner callable remains the only bootstrap path for the designated owner. | Source fix implemented. No plaintext password is stored or exposed. Production owner account/profile still needs a live sign-in check. |
| Email/password login | Successful Firebase sign-in could be reported as a failure if the follow-up Firestore profile read or last-login write failed. | Removed those Firestore operations from the authentication operation; session/profile synchronization is handled by the auth-state flow. | Source fix implemented and build checked. |
| Google sign-in | Popup/redirect sign-in was followed by an unnecessary profile read that could make a successful OAuth result look like failure. | Removed the follow-up profile read from popup and redirect result handling. Profile provisioning remains in the auth-state flow and uses customer role by default. | Source fix implemented. Live Google OAuth remains unverified. |
| Mobile OTP | OTP UI, reCAPTCHA, E.164 validation, SMS request, and code confirmation were present. The confirmation path also made a redundant profile read. | Removed the follow-up profile read after OTP confirmation; missing phone profiles can only be created as customers. | Source fix implemented. Live SMS/reCAPTCHA delivery remains unverified. |
| Role-based flows | A stale or client-generated role could bypass the intended profile lookup for UI routing. | Role resolution now comes from the current profile, and errors clear the role instead of restoring it from local storage. Firestore rules continue to enforce server-side permissions. | Source fix implemented. Customer/vendor/admin live workflows need account-based verification. |

## Checks completed

- `npm test`: 19 passed, 0 failed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm --prefix functions run build`: passed.
- `git diff --check`: passed.
- Production endpoints responded HTTP 200: `https://biocart.in` and `https://bio-cart.web.app`.
- Firebase CLI is authenticated to `bio-cart`; the hosting target was checked before any deployment.

## Production checks still required

The following cannot be established by compiling the repository. After the code is published, verify these in Firebase Console and with real owner/customer/vendor accounts:

1. Google provider is enabled and its OAuth client/consent settings are valid.
2. Phone provider and reCAPTCHA/SMS policy are enabled; test SMS delivery with an approved test number or real device.
3. `biocart.in`, `bio-cart.web.app`, and `bio-cart.firebaseapp.com` are authorized domains.
4. The designated owner account exists, is email-verified, and its Firestore profile is active with the intended admin role.
5. Test email/password recovery, Google popup and mobile redirect, OTP, logout/session restoration, and customer/vendor/admin route access.

Do not report these production checks as passed until the corresponding live evidence is collected.
