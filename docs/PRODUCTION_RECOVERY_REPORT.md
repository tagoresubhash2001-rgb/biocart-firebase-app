# BioCart production recovery — what changed and how it was verified

Base: `fix/production-recovery` @ `91f3ec4`. Verified on 7 Nov 2026 by running the real compiled code.

## Verification evidence

| Check | Result | Evidence |
|---|---|---|
| Frontend type-check (`tsc --noEmit`) | 0 errors | `npm run verify` |
| Functions type-check | 0 errors | `npm run verify` |
| Backend money-flow test (compiled functions; Firestore in memory; Cashfree + EKART HTTP mocked) | **42 / 42 pass** | `docs/evidence/money-flow-results.json` |
| Production build | builds | `npm run build` |
| Browser checkout test on the built site (desktop 1280px + mobile 375px) | pass, no runtime errors | `docs/evidence/ui-checkout-*.png` |
| Migration script on simulated legacy data (dry run + apply) | correct | see section "Migration" |

Not verified here (needs live systems): real Cashfree payment, real EKART booking, Firestore rules in the
emulator (emulator download was blocked in the build sandbox). These are covered by the live ₹1 test in
`docs/RELEASE_NOTES.md` step 6.

## Business rules implemented (owner decisions, Nov 2026)

| Rule | Implementation |
|---|---|
| Commission per vendor, set at onboarding (e.g. 15% → 85:15) | `functions/src/pricing.ts`; vendor without a commission cannot sell; BioCart's own store pays too |
| Gateway fee = actual Cashfree fee, borne by BioCart | not estimated; booked daily from Cashfree reconciliation (`reconcileGatewayFees`) |
| Shipping ₹99 below ₹1,499, free from ₹1,499, 100% to BioCart | `pricing.ts` + company ledger; admin-editable |
| COD off; admin master switch; vendor per-product toggle | `createOrder` + Admin Settings + Vendor product form |
| Vendor earnings eligible only after delivery | EKART delivered event → `markSubOrderDelivered` |
| Settlement every Tuesday 18:00 IST, cycle Tue–Mon, once | `functions/src/settlement.ts` (`0 18 * * 2`, Asia/Kolkata, locked cycles) |
| Manual payouts until Cashfree Payouts keys exist | admin enters UTR; amount must match; paid once |
| Order confirmation only (WhatsApp provider later) | PDF "Order Confirmation / Bill of Supply" after payment; WhatsApp module present but switched off |
| Business identity | Sindulis Innovative Solutions, Udyam UDYAM-AP-23-0104910, Tirupati address; no GSTIN printed |

## Defects fixed (from the audit)

| Area | Before | Now |
|---|---|---|
| Payments | Simulated Cashfree session; payment could never succeed | Real Cashfree PG API with Secret Manager secrets; retry reuses the same Cashfree order |
| Webhooks | Unsigned payment/payout webhooks accepted | Signed only (timing-safe, replay window); event + update idempotent; webhook body never trusted for money (re-read from Cashfree) |
| Money timing | Wallets credited and stock deducted before payment | Stock **reserved** at order; money booked once, only after verified payment (`allocateOrderFinancials`) |
| Unpaid orders | Stock locked forever | Expire after 20 min; Cashfree order terminated; stock returned |
| Double click | Two orders, double stock deduction | `checkoutId` idempotency |
| Approval | Suspended vendors & unapproved products sellable; vendors could self-approve | Rejected server-side; vendor edits re-enter review |
| EKART | 100% fake (random AWB, invented tracking) | Real Ekart Elite API (spec in `docs/integrations/ekart/`): serviceability, booking, label, tracking, cancel, webhook + poller |
| Vendor orders | Blocked by rules; no address; client-side status changes | Collection-group rule; address snapshot; server-enforced lifecycle; vendors cannot mark delivered |
| Refunds/cancel | No Cashfree refund, double reversals, negative balances | Cashfree refunds API, idempotent refund ids, correct bucket reversal, restock, post-payout adjustments |
| Settlement | 5 PM, no cycles, never released earnings, PENDING payout treated as failure | Tuesday 6 PM cycles, delivered-only, manual UTR payout, no fake payouts |
| Invoice | Fake GSTIN, wrong address, generated before payment, broken PDF import | Correct identity, generated after payment, downloadable in My Orders |
| Security rules | Bank details readable by other vendors; customers could set order status; shipments/counters open | Bank details in admin-only `private/settlement`; all status changes server-side; per-owner reads |
| Stock edits | Admin/vendor edits overwrote reservations | `setProductStock` keeps reserved units |
| Checkout UI | Crash; "success" shown without payment | Renders on desktop/mobile; honest "Payment pending" with Retry / Check status |
| Tests | Source-text matching only | Real backend flow test + browser test; CI blocks deploy on failure |

## Migration (existing live data)

`scripts/migrate-recovery-v1.ts` (dry run by default). On simulated legacy data it: kept paid and COD orders,
moved never-paid online orders to `payment_expired` and returned their stock, recomputed wallets
(removing credits from unpaid orders), moved bank details to `private/settlement`, and flagged shipments with
fake `EKT…IN` AWBs and vendors with no commission.

## Not done in this release

Vendor self-registration with KYC review, returns workflow, support tickets, batch/expiry/FSSAI traceability,
admin staff roles, sponsored ads, automatic Cashfree Payouts (needs Payouts keys), WhatsApp sending (needs a
Meta WhatsApp Business token + approved `order_confirmed` template), App Check.
Store-locator page (`GenericCMSPage.tsx`) still lists sample depot locations — replace with real ones.
