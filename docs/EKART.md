# EKART shipping

BioCart ships with **EKART Elite**. Everything here talks to the real EKART API — nothing is simulated.

- API base URL: `https://app.elite.ekartlogistics.in`
- Code: `functions/src/ekartApi.ts` (the API client), `functions/src/ekart.ts` (the Cloud Functions),
  `functions/src/courierRates.ts` (the courier charge formula)

## Secrets

Stored in Firebase Secret Manager. Only the **names** are listed here; the values are never written
in this repository, in chat, or in logs.

| Secret name | What it is |
|---|---|
| `EKART_CLIENT_ID` | EKART client ID (part of the sign-in address) |
| `EKART_USERNAME` | EKART API user's email |
| `EKART_PASSWORD` | EKART API user's password |
| `EKART_WEBHOOK_SECRET` | Shared secret EKART uses to sign webhook messages |

## Which function calls which EKART endpoint

Every function signs in first with `POST /integrations/v2/auth/token/{client_id}` (the token is reused
until it expires). Tracking is an open endpoint and needs no token.

| Cloud Function | Who uses it | EKART endpoint |
|---|---|---|
| `checkEkartPincode` | Checkout | `GET /api/v2/serviceability/{pincode}` |
| `createOrder` | Checkout | `GET /api/v2/serviceability/{pincode}` (blocks the order only on a definite "not serviceable") |
| `createEkartShipment` | Vendor / admin | `PUT /api/v1/package/create`, then `POST /data/pricing/estimate` for the real courier charge |
| `trackEkartShipment` | Customer / vendor / admin | `GET /api/v1/track/{tracking_id}` |
| `pollEkartShipments` | Runs every 3 hours | `GET /api/v1/track/{tracking_id}` for every open shipment |
| `ekartWebhook` | Called by EKART | Receives the message, then re-reads `GET /api/v1/track/{tracking_id}` |
| `getEkartLabel` | Vendor / admin | `POST /api/v1/package/label?json_only=false` (PDF saved to Storage at `labels/{vendorId}/{awb}.pdf`) |
| `cancelEkartShipment` | Vendor / admin | `DELETE /api/v1/package/cancel?tracking_id={id}` |
| `registerEkartPickupAddress` | Admin | `GET /api/v2/addresses`, `GET /api/v2/serviceability/{pincode}`, `POST /api/v2/address` |
| `registerEkartWebhook` | Admin | `GET /api/v2/webhook`, `POST /api/v2/webhook` |
| `setCourierCharge` | Admin | none (manual override of the courier charge, with an audit log entry) |

The webhook is registered at EKART for the topics `track_updated` and `shipment_created`, pointing to
`https://asia-southeast1-bio-cart.cloudfunctions.net/ekartWebhook`.

## Booking rules

- The order must be **Packed** and paid (or confirmed COD).
- The seller must have a pickup address linked to EKART (`vendors/{id}.ekartPickupAlias`).
- A booking is refused only when the seller has **no 10-digit phone** or **no pickup address
  (address line and 6-digit PIN)**.
- A missing GSTIN never blocks a booking. Unregistered sellers are sent with an empty GSTIN and
  GST amount 0, and their Udyam number (`vendors/{id}.legal.udyam`) is added to the seller address.
- If EKART rejects a booking, EKART's full reply is saved on the shipment
  (`shipments/ekart_{orderId}_{vendorId}`: `lastError`, `lastErrorResponse`, `lastErrorRequest`)
  and shown to the vendor.

## Rate card

Contract: **Elite – Flat Rate Card, FORWARD / SURFACE**. Stored in Firestore at
`settings/courierRates`.

| Item | Value | Field |
|---|---|---|
| Up to 2 kg (all zones) | ₹90 | `upTo2kg` |
| Each additional 1 kg, or part of 1 kg | ₹35 | `additionalPerKg` |
| COD charge | ₹0 and 0% | `codFixed`, `codPercent` |
| Fuel surcharge | 0% | `fuelPercent` |
| GST, added on top | 18% | `gstPercent` |
| Volumetric weight (grams) | L × B × H (cm) ÷ 5 | `volumetricDivisor` |
| Return (RTO), up to 2 kg / each extra kg | ₹0 / ₹0 | `rtoUpTo2kg`, `rtoAdditionalKg` |
| Packing allowance added to product weight | 50 g | `packagingAllowanceGrams` |

Formula (the function `computeEkartCourierCharge`):

```
billable grams = the higher of actual weight and volumetric weight
base           = ₹90 up to 2000 g, otherwise ₹90 + ₹35 × (each started kg above 2000 g)
courier charge = base × 1.18
```

| Parcel | Base | Courier charge |
|---|---|---|
| 1.5 kg, 20×15×10 cm (volumetric 600 g) | ₹90 | ₹106.20 |
| 2.0 kg | ₹90 | ₹106.20 |
| 2.1 kg | ₹125 | ₹147.50 |
| 3.2 kg | ₹160 | ₹188.80 |
| 0.5 kg, 40×30×30 cm (volumetric 7200 g) | ₹300 | ₹354.00 |

EKART's own price service (`POST /data/pricing/estimate`) returns the same figures for this contract.

To seed the rate card in a new project: `functions/scripts/seed-courier-rates.js` (it never
overwrites an existing document). Changing the rate card only affects orders placed afterwards —
each vendor order keeps a copy of the rates it was priced with.

## The courier-charge hold

The courier charge is the **seller's** cost. It is taken from the seller's share, never from BioCart's.

1. **Order created** — the parcel is estimated from the products (weight × quantity + 50 g packing;
   the largest product box, or 10×10×10 cm when no size is on record; a product with no weight counts
   as 1000 g and the order is flagged `courierEstimateIncomplete`). The estimate and a copy of the
   rates are saved on the vendor order under `courier`.
2. **Order paid** — the estimate is held from the seller's pending money
   (ledger entry `courier_charge_held`). The seller can never be paid that amount.
3. **Parcel booked with EKART** — the hold is replaced by the real charge for the real packed
   weight and size (EKART's price, or the formula if EKART's price service does not answer).
   Lower than the hold: the difference goes back to the seller. Higher: more is held.
   Ledger entry `courier_charge_adjusted`.
4. **Cancelled before shipping** — the whole hold goes back to the seller (`courier_charge_released`).
   **Cancelled after shipping, or returned (RTO)** — the charge stays; RTO uses the RTO rates above.
5. **Delivered** — the seller's share minus the courier charge becomes ready for the next Tuesday settlement.

The ₹99 delivery fee paid by the customer and the Cashfree gateway fee stay on BioCart's side.

### Example

Product ₹1000, commission 20%, parcel 1.5 kg:

| Line | Amount |
|---|---|
| Order value | ₹1000.00 |
| BioCart commission (20%) | − ₹200.00 |
| Seller's share | ₹800.00 |
| Courier charge held (EKART, 1.5 kg) | − ₹106.20 |
| **Seller gets** (Tuesday settlement after delivery) | **₹693.80** |

On the vendor order the fields are `vendorPayablePaise` (the share), `courierChargePaise`
(all courier charges), `netPayoutPaise` (what the seller receives) and `courier.status`
(`estimate` → `held_estimate` → `held_actual`, or `released`). Amounts ending in `Paise` are in
paise: 10620 means ₹106.20.

## Reading `ekart_api_logs`

Firestore collection `ekart_api_logs` holds one document per EKART call that **failed** or that
**changed something** (booking, cancel, label, address, webhook, price estimate). Successful
read-only calls such as tracking and PIN checks are not saved, to keep the log small.

| Field | Meaning |
|---|---|
| `at` | When the call was made |
| `method`, `path` | What was called at EKART |
| `status` | EKART's HTTP status (200 = accepted, 400 = rejected, 0 = EKART could not be reached) |
| `ok` | `true` if EKART accepted the call |
| `requestBody` | What BioCart sent (phone numbers masked, secrets hidden) |
| `responseBody` | EKART's full reply |
| `errorText` | EKART's explanation in one line: message, description, remark and any field errors |
| `durationMs` | How long EKART took to answer |

To find out why a booking failed: open Firestore → `ekart_api_logs`, sort by `at` (newest first),
and read `errorText` on the row with path `/api/v1/package/create`. The same text is on the
shipment document as `lastError`. The same lines are in Cloud Logging under `[EKART API ERROR]`.

## Status on 15 Nov 2026

- EKART sign-in and PIN checks work.
- Pickup address `Biocart warehouse` (Tirupati 517501) is saved at EKART and linked to vendor `biocart`.
- Webhook registered (EKART id `mwhqfz01`).
- **Bookings are blocked by EKART**: "Shipment creation is blocked. Please complete the onboarding
  process to start shipping or contact your account manager." This must be fixed in the EKART
  dashboard; it is not a code problem.
