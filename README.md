# BioCart — multi-vendor organic marketplace

Live: https://biocart.in · Firebase project `bio-cart` · region `asia-southeast1`

## What is where

| Folder / file | Purpose |
|---|---|
| `src/` | Website (React + Vite): storefront, customer dashboard, Vendor Console, Admin Console |
| `functions/src/` | Backend (Cloud Functions): orders, Cashfree payments, EKART shipping, wallets, settlements |
| `firestore.rules`, `storage.rules`, `firestore.indexes.json` | Database / storage security and indexes |
| `tests/backend/` | Money-flow test (real compiled functions, Cashfree/EKART mocked) |
| `tests/ui/` | Browser checkout smoke test (desktop + mobile) |
| `scripts/generate-sitemap.ts` | Runs automatically before every build |
| `scripts/migrate-recovery-v1.ts` | One-time data migration — run with `--apply` only after the owner approves |
| `docs/` | Release notes, security notes, EKART API spec |

## Money rules (all calculated on the backend)

- Customer pays: product price + delivery charge (₹99 below the free-delivery limit; set in Admin → Settings → Marketplace Money Rules). No GST is added.
- BioCart keeps: commission (per seller) + the customer's delivery charge, and pays the actual Cashfree fee from that.
- Seller gets: product value − commission − EKART courier charge (EKART rate card).
- Seller money moves Pending → Available (after EKART delivery) → paid in the Tuesday 6 PM IST settlement (manual bank transfer + UTR).

## Commands

```
npm ci && npm --prefix functions ci     # install
npm run dev                              # local website
npm run verify                           # type-check + backend tests + build + browser test
```

Deploy (from Windows PowerShell, one small group at a time because of the Cloud Run CPU limit):

```
firebase deploy --project bio-cart --only hosting
firebase deploy --project bio-cart --only functions:<name>
```

Secrets (Cashfree, EKART) live only in Google Secret Manager — never in code or `.env` files.
