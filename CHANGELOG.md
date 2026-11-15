# Changelog

Dates are 2026. Newest first.

## 15 Nov

**Recovered the live backend**
- Found that Firebase was running newer code than GitHub (40 live functions; GitHub had 32, with fake EKART code).
- Downloaded the backend source from Firebase's own archive and saved it as branch
  `recovered/live-functions-2026-11-08`.
- `main` now equals that recovered code plus the fixes below. An EKART rewrite made earlier the same
  day on the outdated code was moved to branch `old-ekart-attempt` (archive only).

**EKART fixes** (deployed: all 9 EKART functions)
- EKART's full error reply is now saved, logged (`ekart_api_logs`) and shown to the vendor, with phone
  numbers masked. Before, only a short code such as `SWIFT_VALIDATION_EXCEPTION` was kept.
- A missing GSTIN no longer matters: unregistered sellers are sent with an empty GSTIN and the Udyam
  number in the seller address. A booking is refused only if the seller phone or pickup address is missing.
- Webhook registered at EKART for `track_updated` and `shipment_created`.
- Vendor `biocart` in Firestore: phone, pickup contact phone and Udyam number filled in.
- One real booking attempt for order `BC-2026-241197FF`. EKART's answer: shipment creation is blocked
  until EKART onboarding is completed.

**Courier charge held from the seller's share** (deployed: 15 functions)
- Rate card saved at `settings/courierRates` (₹90 up to 2 kg, ₹35 per extra kg, 18% GST, volumetric L×B×H÷5).
- The estimated courier charge is held from the seller's share when the order is paid, replaced by the
  real charge when the parcel is booked, and released if the order is cancelled before shipping.
- `updateFinancialPolicy` can now also edit the rate card. `setCourierCharge` remains the admin override.
- Unit tests added (`npm test` in `functions/`).

**Repository clean-up** (nothing deployed)
- New `README.md`, `docs/EKART.md`, `docs/WEBSITE_CODE_MISSING.md` and this changelog.
- One-off scripts moved to `scripts/archive/`. The old README moved to `docs/archive/`.
- The GitHub workflow no longer contains any deploy step; it only builds and runs the backend tests.
- A hard-coded EKART client ID was removed from the old website code.

## 12 Nov
- A vendor tried to book EKART for order `BC-2026-241197FF`. EKART rejected it; only the short code
  `SWIFT_VALIDATION_EXCEPTION` was saved (fixed on 15 Nov).

## 11 Nov
- Vendor `biocart` was linked to the pickup address `Biocart warehouse` already saved in the EKART panel.

## 7–8 Nov
- A rebuilt backend and website were deployed to Firebase from the owner's computer, **without being
  pushed to GitHub**: new order, pricing, ledger, settlement, Cashfree and real EKART code.
- New live functions in that deploy: `adminMarkDelivered`, `markCodRemitted`, `markSettlementPaid`,
  `pollEkartShipments`, `reconcileGatewayFees`, `releaseExpiredReservations`, `retryRefund`,
  `setCourierCharge`, `setProductStock`, `syncPendingRefunds`, `updateFinancialPolicy`,
  `updateOrderStatus`, `updateVendorOrderStatus`.
- Some deploys on 7 Nov failed with "Quota exceeded for total allowable CPU per project per region".
- The backend part was recovered into GitHub on 15 Nov. The website part is still missing
  (see `docs/WEBSITE_CODE_MISSING.md`).

## 5 Nov
- Last commit on GitHub before the gap (`5135fb1`): checkout rules, inclusive GST, 20% commission,
  free shipping at ₹1,499.
