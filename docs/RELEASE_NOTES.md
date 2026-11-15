# BioCart release `recovery-2026-11` — deploy & rollback runbook

Branch: `fix/production-recovery`. Firebase project: `bio-cart`. Region: `asia-southeast1`.

## 1. Secrets (Google Secret Manager) — set once, before the first deploy

Every secret below must exist or the functions deploy stops. For each one: put the value alone in a temporary
file **outside the repo** (no quotes, no trailing newline), then

```
firebase functions:secrets:set <NAME> --data-file "<temp file>" --project bio-cart --force
```

and delete the temp file.

| Name | What |
|---|---|
| CASHFREE_APP_ID | Cashfree PG App ID (production) |
| CASHFREE_SECRET_KEY | Cashfree PG secret key (production) |
| CASHFREE_ENVIRONMENT | `PRODUCTION` |
| EKART_CLIENT_ID | Ekart Elite client id (`EKART_…`, panel: Settings → API Settings → API Documentation) |
| EKART_USERNAME | Ekart Elite login email |
| EKART_PASSWORD | Ekart Elite login password |
| EKART_WEBHOOK_SECRET | any random 20–30 letters/digits |

Never put these values in code, `.env` files, commits, logs or reports.

## 2. Backup before deploying

```
gcloud firestore export gs://bio-cart.firebasestorage.app/backups/pre-recovery-$(date +%Y%m%d-%H%M) --project bio-cart
```
Write the operation name down here: `__________________`

Also note the current Hosting release (Firebase console → Hosting → release history) and the current
`main` commit: `git rev-parse origin/main`.

## 3. Install, verify, deploy

```
npm ci
npm --prefix functions ci
npm run verify          # type-checks, 42 backend checks, build, browser checkout test (desktop + mobile)
firebase deploy --project bio-cart --only firestore:rules,firestore:indexes,storage,functions,hosting --force
```

`--force` is needed because old functions that no longer exist (generateInvoicePDF, releasePendingEarnings,
cashfreePayoutWebhook, razorpayPayoutWebhook, Delhivery functions) are deleted.
New indexes can take a few minutes to build; the settlement and reservation-expiry jobs need them.

## 4. Migrate existing live data (dry run first)

```
gcloud auth application-default login          # sign in as the project owner
npx tsx scripts/migrate-recovery-v1.ts           # DRY RUN — writes nothing, prints a summary + CSV in docs/evidence/
npx tsx scripts/migrate-recovery-v1.ts --apply   # only after the owner reads the summary and says "apply migration"
```

## 5. One-time setup after deploy (admin panel / dashboards)

1. **Cashfree dashboard → Developers → Webhooks** → add
   `https://asia-southeast1-bio-cart.cloudfunctions.net/cashfreePaymentWebhook` for *Payment* and *Refund* events.
2. **Cashfree dashboard → Developers → whitelist domains**: `biocart.in`, `www.biocart.in`, `bio-cart.web.app`.
3. **Admin → Vendors**: set **Commission %** for every vendor including BioCart's own store (sales are blocked
   for a vendor until it is set). Click **Register EKART pickup** for each vendor (needs pickup address line 1,
   6-digit PIN code and phone in the vendor profile).
4. **Admin → Settings → Marketplace Money Rules**: check ₹99 / ₹1,499 / COD off / hold days 0, press Save once.
5. Register the EKART tracking webhook: call the `registerEkartWebhook` function once as admin
   (or add `https://asia-southeast1-bio-cart.cloudfunctions.net/ekartWebhook`, topic `track_updated`, in the Ekart
   panel → Settings → API Settings → Manage Webhooks). A poller also checks shipments every 3 hours.

## 6. Live ₹1 test (real money)

Create a hidden ₹1 product under the BioCart vendor (approved, visible only while testing), order it with UPI
on a phone, confirm: order shows **Confirmed**, confirmation PDF downloads, Admin → Orders shows payment ref.
Then Admin → Orders → **Cancel & refund order** → refund status becomes *success* within minutes.
Archive the test product.

## 7. Rollback

- Hosting: Firebase console → Hosting → release history → *Rollback* to the release noted in step 2.
- Functions/rules: `git checkout <previous main commit>` then `firebase deploy --only functions,firestore:rules,storage --project bio-cart --force`.
- Data: `gcloud firestore import <backup path from step 2>` (only if the migration must be undone).
