# BioCart Antigravity handoff

Use this as the task brief when continuing BioCart work in Antigravity.

```text
Work from the GitHub source of truth: https://github.com/tagoresubhash2001-rgb/biocart-firebase-app
Firebase project: bio-cart
Live Firebase Hosting site/custom domain: https://biocart.in
Firebase Hosting fallback domain: https://bio-cart.web.app
Firebase App Hosting backend: biocart, asia-southeast1
Firebase owner/admin email: sinfoxmedia@gmail.com

Workflow requirements:
1. Inspect and edit the repository first. Never patch production directly or treat a local ZIP as the source of truth.
2. Keep changes in the repository, review the diff, run the production build, TypeScript check, and Cloud Functions build, then commit and push to GitHub before deployment.
3. Deploy the actual customer-facing website to Firebase Hosting (`dist`) and verify https://biocart.in and https://bio-cart.web.app. Deploy App Hosting separately only when its backend build is healthy; do not treat App Hosting alone as the website publication.
4. Deploy Firestore rules/indexes, Storage rules, Auth provider configuration, and Cloud Functions only when their reviewed source files changed. Confirm all deployment targets belong to project bio-cart.
5. Never commit `.env`, `.env.local`, `.env.*`, service-account JSON, credentials, `node_modules`, build output, or local `.git` data. The supplied ZIP contains those local/generated files and older code; use only safe source files from it as reference.
6. Never put default admin passwords or real credentials in source, logs, or GitHub. The intended owner/admin email is `sinfoxmedia@gmail.com`. In Firebase Authentication → Users, verify that this exact account exists and inspect its email-verification state before reporting it. Never assume account creation means email verification or admin authorization.
7. For password setup, use Firebase's password-reset flow only after confirming the intended account. The owner must open the reset email and choose their password; never ask for, read, store, or report the password or reset link. Do not change the password on the owner's behalf.
8. Admin access must come from the verified owner account and server-side/Firestore authorization, never from a client-controlled role, cached localStorage role, or hard-coded password. Verify the matching `users/{uid}` Firestore profile has the intended admin role and active status; verify protected admin routes after the owner signs in. If the owner must complete sign-in/reset manually, report that verification as pending instead of claiming success.
9. Treat vendor account creation, uploads, inventory, checkout, and order totals as server-authorized operations. Do not add a client-side order fallback when the trusted Cloud Function fails.
10. Do not invent catalog quantities, customer data, or vendor information. Mark starter catalog content and stock as demo data and require the owner to set real stock before sales.
11. Verify auth, admin/users, vendor isolation, Firestore, Storage uploads, checkout, and both hosting URLs after deployment. In the final report include the exact admin email, Firebase Auth emailVerified state, Firestore admin role/status, whether protected admin routes were verified, and any owner action still pending. Never include a password, reset link, or secret.

Known areas to inspect: the supplied ZIP had prefilled owner credentials and older auth/vendor code; the Firebase console screenshots showed an old account alongside the new owner, a pending Storage bucket setup, and historical 404s for the App Hosting root/favicon. Firestore `(default)` is already in `nam5` and a separate Enterprise MongoDB-compatible database exists; do not migrate or delete either database as part of routine fixes.
```
