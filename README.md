# BioCart

BioCart is a multi-vendor organic marketplace. Customers buy from several sellers in one order;
BioCart keeps a commission, pays each seller the rest every Tuesday after delivery, and ships
parcels with EKART.

- Firebase project: `bio-cart`
- Cloud Functions: TypeScript, Node 22, region `asia-southeast1`
- Payments: Cashfree. Courier: EKART Elite.

## The three rules

1. **Deploy functions only from `main`.** `main` is the code that is live in Firebase.
2. **Never delete a live function.** If `firebase deploy` asks to delete functions, answer **No**.
3. **Never deploy hosting (the website) from this repository.** The `src/` folder here is an old
   copy. The real live website code is not in GitHub yet — see
   [docs/WEBSITE_CODE_MISSING.md](docs/WEBSITE_CODE_MISSING.md).

## Folder structure

| Path | What it is |
|---|---|
| `functions/src/` | The live backend (Cloud Functions). This is the important part. |
| `functions/src/orders.ts` | Creating orders, payment confirmation, cancellation and refunds |
| `functions/src/pricing.ts` | Prices, commission, delivery fee |
| `functions/src/ledger.ts` | Vendor wallet and money ledger entries |
| `functions/src/settlement.ts` | Tuesday vendor settlement |
| `functions/src/cashfree.ts`, `cashfreeApi.ts` | Cashfree payments and refunds |
| `functions/src/ekart.ts`, `ekartApi.ts` | EKART shipping (see [docs/EKART.md](docs/EKART.md)) |
| `functions/src/courierRates.ts` | The EKART courier charge formula |
| `functions/test/` | Backend unit tests (`npm test` inside `functions/`) |
| `functions/scripts/` | Helper scripts that are run by hand and never deployed |
| `src/`, `public/`, `index.html` | **Old** website code. Do not deploy it. |
| `firestore.rules`, `storage.rules` | Security rules as last saved in git. They may be older than the live rules — do not deploy them without checking. |
| `scripts/generate-sitemap.ts` | Used by the website build |
| `scripts/archive/` | Old one-off scripts, kept for reference only |
| `docs/` | Documentation |

## Branches

| Branch | Meaning |
|---|---|
| `main` | The live backend. Deploy from here. |
| `recovered/live-functions-2026-11-08` | The backend exactly as it was downloaded from Firebase on 15 Nov 2026 (deployed there on 8 Nov). Kept as a reference. |
| `old-ekart-attempt` | An EKART rewrite built on outdated code. **Archive only — never merge it into `main`.** |

## Build and test

```bash
cd functions && npm ci && npm run build && npm test
```

```bash
npm ci && npm run build
```

## Deploy (functions only)

Sign in once with the Google account that owns the project:

```bash
firebase login
```

Build first — the deploy uploads the compiled code in `functions/lib`:

```bash
cd functions && npm ci && npm run build && npm test && cd ..
```

Deploy only the functions you changed, at most 8 at a time:

```bash
firebase deploy --only functions:createOrder,functions:createEkartShipment --project bio-cart
```

Check that nothing disappeared (there should be 40 functions):

```bash
firebase functions:list --project bio-cart
```

Do **not** run a plain `firebase deploy`, `firebase deploy --only hosting`, or
`firebase deploy --only firestore:rules` from this repository.

## Secrets

Passwords and keys are stored in Firebase Secret Manager, never in this repository.
The names are `EKART_CLIENT_ID`, `EKART_USERNAME`, `EKART_PASSWORD`, `EKART_WEBHOOK_SECRET`,
`CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY` and `CASHFREE_ENVIRONMENT`.

## More

- [docs/EKART.md](docs/EKART.md) — shipping, the rate card and the courier-charge hold
- [CHANGELOG.md](CHANGELOG.md) — what changed and when
- [docs/WEBSITE_CODE_MISSING.md](docs/WEBSITE_CODE_MISSING.md) — the missing website code
