# Biocart Fix Package — read this first

Last time, the Antigravity agent couldn't find the zip I'd given it, got stuck, and your 3-day clock kept running while nothing from the recovery plan actually got applied — the codebase you sent back was identical to before. So this time I did the work myself: below are **complete, ready-to-drop-in files**, not instructions for an AI to interpret. Copy each file into your project at the exact path shown. No creativity required from whoever applies this — just replace/add these files.

## 🚨 NEW critical finding (worse than anything found before)

While re-auditing, I found `firestore.rules` had this:
```
function isAdmin() {
  return true; // Temporarily bypassed for local admin access without login
}
```
**Every single `isAdmin()`-gated collection in your entire database has been wide open to anyone on the internet** — signed in or not — this whole time. Combined with `RoleGuard`/`AuthGuard` being commented out in the admin console (found last audit), this means the admin backend has had no real protection at all. This is fixed in the `firestore.rules` file below — do not skip deploying this one.

## Files to copy in AS-IS (full replacements / new files)

| File | What it does |
|---|---|
| `functions/src/index.ts` | Restores the deleted Cloud Functions backend (`createOrder` with real inventory checks + invoice PDF generation), and adds the two new pieces that were never actually built despite being reported as done: real per-vendor order splitting + wallet crediting, and a `createVendorAccount` function that creates a real, linked vendor login. |
| `functions/package.json`, `functions/tsconfig.json` | Restored, unchanged. |
| `firebase.json` | Adds back the `"functions"` key (it had been silently dropped, so `firebase deploy` wasn't even touching your functions). |
| `firestore.rules` | Fixes the `isAdmin()` bypass, adds the missing `vendor_wallets` and `orders/{id}/vendor_orders/{vendorId}` rule blocks (these had NO rule at all before, so those reads always failed), simplifies vendor ownership to use the vendor's Firebase Auth uid as their doc id directly. |
| `src/components/admin/AdminConsole.tsx` | Re-enables `AuthGuard`/`RoleGuard` (was commented out), wires the 6 restored admin screens back in, cleans up the duplicate/dead routing cases. |
| `src/components/admin/AdminLayout.tsx` | Adds nav entries for the 6 restored screens. |
| `src/components/admin/AdminCoupons.tsx`, `AdminInventory.tsx`, `AdminProductPromotions.tsx`, `AdminPromotionalRibbons.tsx`, `AdminContactMessages.tsx`, `AdminUsers.tsx` | Your original, working screens — restored byte-for-byte from before the vendor work started. These were deleted without being asked to be removed. |
| `src/components/admin/AdminVendors.tsx` | "Add Vendor" now actually creates a real login (calls the new `createVendorAccount` function) instead of just writing a directory entry nobody could log into. |
| `src/components/vendor/VendorDashboardHome.tsx` | Fixes a bug where it read `user` from `useAuth()` — a property that doesn't exist on that hook, so it was silently broken the whole time — and reads the wallet doc directly instead of an unfiltered (and rules-blocked) collection scan. |
| `src/components/vendor/VendorOrders.tsx` | Was showing **every vendor's and every customer's orders** with zero filtering. Now scoped to only this vendor's own order slices, with a working shipment-status updater. |

## Patches to apply by hand (files too large to safely send as full replacements)

See `PATCHES/CheckoutModal.patch.md` and `PATCHES/VendorProducts.patch.md` — each has exact FIND/REPLACE blocks.

- **CheckoutModal.tsx**: was completely fake — no order was ever written, no inventory checked, just a random ID and a fake "payment successful" toast. Now calls the real `createOrder` function.
- **VendorProducts.tsx**: had zero data isolation — any vendor could see/edit every other vendor's products, and could reassign any product to any vendor via a dropdown. Now scoped and locked to the logged-in vendor.

## Order to apply this in

1. `firestore.rules` first, deploy it immediately (`firebase deploy --only firestore:rules`) — the `isAdmin()` hole is live right now.
2. Restore `functions/`, run `cd functions && npm install`, then `firebase deploy --only functions`.
3. Drop in the 6 restored admin screens + `AdminConsole.tsx` + `AdminLayout.tsx`.
4. Apply the `CheckoutModal.tsx` patch.
5. Drop in `AdminVendors.tsx`, `VendorDashboardHome.tsx`, `VendorOrders.tsx`, then apply the `VendorProducts.tsx` patch.
6. `npm run build` — must exit 0.
7. Redeploy hosting.

## How to actually verify (don't just trust a "build succeeded" message)

- Open the Firestore console yourself. Place one test order with products from 2 vendors. Confirm `orders/{id}` and `orders/{id}/vendor_orders/*` really exist with correct numbers, and `vendor_wallets/{vendorId}.availableBalance` really went up.
- Log in as a vendor (use the temp password shown after creating them in Admin → Vendors). Confirm "My Products" only shows their own items.
- Log out entirely, open a private/incognito window, and try to read `/products` or `/settings` via the browser console using the Firestore Web SDK with no login — this should now fail (it would have silently succeeded before, given the `isAdmin()` bug).
- Click through all 6 restored admin nav items and confirm they render.
