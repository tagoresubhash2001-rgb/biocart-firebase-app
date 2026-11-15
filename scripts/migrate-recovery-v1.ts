/**
 * One-time migration of LIVE data to the Nov-2026 order/payment/settlement model.
 *
 *   DRY RUN (default, writes nothing):   npx tsx scripts/migrate-recovery-v1.ts
 *   APPLY (after the owner approved):    npx tsx scripts/migrate-recovery-v1.ts --apply
 *
 * Needs admin credentials: `gcloud auth application-default login` (as the project owner)
 * or GOOGLE_APPLICATION_CREDENTIALS pointing to a service-account key. Project: bio-cart.
 * Always take a Firestore export backup first (see docs/RELEASE_NOTES.md).
 *
 * What it does
 *  1. Legacy orders (no `financialsAllocated` field):
 *     - paid online & verified (paymentStatus 'paid') → kept, converted to the new model.
 *     - COD and not cancelled → kept as a confirmed COD order.
 *     - online orders that were never paid (old checkout used a simulated Cashfree session,
 *       so they could not be paid) → marked payment_expired, stock given back.
 *     - cancelled orders → stock given back if it was never restored.
 *  2. Vendor sub-orders get userId + delivery snapshot + earnings state.
 *  3. Vendor wallets are recomputed from the sub-orders (old code credited wallets for
 *     unpaid orders). The difference is written as a 'migration_adjustment' ledger entry.
 *  4. Vendor bank details move to vendors/{id}/private/settlement (admin-only).
 *  5. Shipments created by the old simulated EKART code (AWB "EKT…IN") are flagged.
 * Output: docs/evidence/migration-<timestamp>.csv + a plain-language summary.
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as fs from 'node:fs';
import * as path from 'node:path';

const APPLY = process.argv.includes('--apply');
initializeApp({ credential: applicationDefault(), projectId: process.env.GCLOUD_PROJECT || 'bio-cart' });
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

type Row = { kind: string; id: string; action: string; detail: string };
const rows: Row[] = [];
const log = (kind: string, id: string, action: string, detail = '') => rows.push({ kind, id, action, detail: detail.replace(/[\n,]/g, ' ') });
const ops: Array<() => Promise<any>> = [];
const later = (fn: () => Promise<any>) => ops.push(fn);
const now = new Date().toISOString();
const paise = (rupees: any) => Math.round(Number(rupees || 0) * 100);

const STATUS_MAP: Record<string, string> = { placed: 'confirmed', pending: 'confirmed', processing: 'processing', shipped: 'shipped', delivered: 'delivered', cancelled: 'cancelled', canceled: 'cancelled' };

async function main() {
  const orders = await db.collection('orders').get();
  const restock = new Map<string, number>();
  let kept = 0, expired = 0, cod = 0, cancelled = 0, already = 0;

  for (const od of orders.docs) {
    const o = od.data();
    if (o.financialsAllocated !== undefined) { already++; continue; }
    const status = String(o.status || o.orderStatus || 'placed').toLowerCase();
    const isCod = String(o.paymentMethod || 'cod') === 'cod';
    const paidOnline = !isCod && String(o.paymentStatus) === 'paid';
    const subs = await od.ref.collection('vendor_orders').get();
    const ship = o.shippingAddress || {};
    const fulfilment = { name: ship.name || '', phone: ship.phone || '', address: ship.address || ship.street || '', city: ship.city || '', state: ship.state || '', zip: ship.zip || ship.postalCode || '', paymentMode: isCod ? 'COD' : 'Prepaid', codAmountPaise: 0 };

    if (status === 'cancelled') {
      cancelled++;
      if (!o.stockRestored) (o.items || []).forEach((it: any) => restock.set(it.productId, (restock.get(it.productId) || 0) + Number(it.quantity || 0)));
      log('order', od.id, 'cancelled_kept', `stock returned: ${!o.stockRestored}`);
      later(() => od.ref.update({ financialsAllocated: false, status: 'cancelled', orderStatus: 'cancelled', stockRestored: true, migratedAt: now }));
      subs.docs.forEach((s) => later(() => s.ref.update({ status: 'cancelled', orderStatus: 'cancelled', userId: o.userId, fulfilment, 'earnings.state': 'reversed', migratedAt: now })));
      continue;
    }
    if (!paidOnline && !isCod) {
      expired++;
      (o.items || []).forEach((it: any) => restock.set(it.productId, (restock.get(it.productId) || 0) + Number(it.quantity || 0)));
      log('order', od.id, 'unpaid_online_to_payment_expired', `total ₹${o.totalAmount}`);
      later(() => od.ref.update({ financialsAllocated: false, status: 'payment_expired', orderStatus: 'payment_expired', paymentStatus: 'failed', reservationReleased: true, stockRestored: true, migratedAt: now, statusHistory: FieldValue.arrayUnion({ status: 'payment_expired', at: now, by: 'migration', role: 'system', reason: 'Payment was never completed (old checkout)' }) }));
      subs.docs.forEach((s) => later(() => s.ref.update({ status: 'payment_expired', orderStatus: 'payment_expired', userId: o.userId, fulfilment, 'earnings.state': 'none', migratedAt: now })));
      continue;
    }
    if (isCod) cod++; else kept++;
    const newStatus = STATUS_MAP[status] || 'confirmed';
    log('order', od.id, isCod ? 'cod_kept' : 'paid_kept', `status ${status} → ${newStatus}`);
    later(() => od.ref.update({
      financialsAllocated: true, financialsAllocatedAt: o.createdAt?.toDate ? o.createdAt.toDate().toISOString() : now,
      status: newStatus, orderStatus: newStatus, paymentStatus: isCod ? 'cod_pending' : 'paid', migratedAt: now,
      totalAmountPaise: o.totalAmountPaise ?? paise(o.totalAmount), shippingAmountPaise: o.shippingAmountPaise ?? paise(o.shippingAmount),
    }));
    subs.docs.forEach((s) => {
      const so = s.data();
      const subStatus = STATUS_MAP[String(so.status || so.orderStatus || '').toLowerCase()] === 'confirmed' ? 'new' : (String(so.status || so.orderStatus || 'new').toLowerCase());
      const delivered = subStatus === 'delivered' || newStatus === 'delivered';
      const earnings = delivered ? (isCod ? 'awaiting_cod_remittance' : 'eligible') : 'pending';
      const subtotalPaise = so.subtotalPaise ?? paise(so.subtotal);
      later(() => s.ref.update({
        userId: o.userId, fulfilment: { ...fulfilment, codAmountPaise: isCod ? subtotalPaise : 0 }, paymentMethod: isCod ? 'cod' : 'cashfree', paymentStatus: isCod ? 'cod_pending' : 'paid',
        status: delivered ? 'delivered' : subStatus, orderStatus: delivered ? 'delivered' : subStatus,
        customerPaidPaise: so.customerPaidPaise ?? subtotalPaise, commissionBasePaise: so.commissionBasePaise ?? subtotalPaise,
        commissionPaise: so.commissionPaise ?? so.commissionAmountPaise ?? 0,
        'earnings.state': earnings, ...(earnings === 'eligible' ? { 'earnings.eligibleAt': now } : {}), migratedAt: now,
      }));
    });
  }

  // 2. Stock returns
  for (const [productId, qty] of restock) {
    log('inventory', productId, 'restock', `+${qty}`);
    later(() => db.collection('inventory').doc(productId).set({ availableQuantity: FieldValue.increment(qty), quantity: FieldValue.increment(qty), updatedAt: now }, { merge: true }));
  }

  // 3. Wallet recompute (runs after the sub-order updates above)
  const vendors = await db.collection('vendors').get();
  later(async () => {
    const allSubs = await db.collectionGroup('vendor_orders').get();
    const sums = new Map<string, { pending: number; available: number }>();
    allSubs.docs.forEach((d) => {
      const v = d.data(); const st = v.earnings?.state; const p = Number(v.vendorPayablePaise ?? paise(v.vendorPayable));
      const cur = sums.get(v.vendorId) || { pending: 0, available: 0 };
      if (st === 'pending' || st === 'awaiting_cod_remittance') cur.pending += p;
      if (st === 'eligible') cur.available += p;
      sums.set(v.vendorId, cur);
    });
    const allWallets = await db.collection('vendor_wallets').get();
    allWallets.docs.forEach((w) => { if (!sums.has(w.id)) sums.set(w.id, { pending: 0, available: 0 }); });
    for (const [vendorId, s] of sums) {
      const wRef = db.collection('vendor_wallets').doc(vendorId);
      const w = (await wRef.get()).data() || {};
      const before = { pending: Number(w.pendingBalance ?? w.pending ?? 0), available: Number(w.availableBalance ?? w.available ?? 0) };
      await wRef.set({ vendorId, pending: s.pending, pendingBalance: s.pending, available: s.available, availableBalance: s.available, settling: Number(w.settling || 0), paidOut: Number(w.paidOut || 0), adjustmentDue: Number(w.adjustmentDue || 0), migratedAt: now, updatedAt: now }, { merge: true });
      await db.collection('financial_ledger').doc(`migration_v1_${vendorId}`).set({ id: `migration_v1_${vendorId}`, vendorId, account: `vendor:${vendorId}`, entryType: 'migration_adjustment', direction: 'adjustment', status: 'settled', amountPaise: (s.pending + s.available) - (before.pending + before.available), metadata: { before, after: s }, description: 'Nov-2026 recovery: wallet recomputed from verified orders (old code credited unpaid orders)', createdAt: now });
    }
  });
  // dry-run wallet preview
  const preview = await previewWallets();
  preview.forEach((p) => log('wallet', p.vendorId, 'recompute', `pending ₹${p.before.pending / 100} → ₹${p.after.pending / 100}; available ₹${p.before.available / 100} → ₹${p.after.available / 100}`));

  // 4. Bank details → private, 5. commission check
  for (const v of vendors.docs) {
    const d = v.data();
    const s = d.settlement || {};
    if (s.accountNumber) {
      log('vendor', v.id, 'bank_details_to_private', `${s.bankName || ''} ••••${String(s.accountNumber).slice(-4)}`);
      later(async () => {
        await v.ref.collection('private').doc('settlement').set({ ...s, movedAt: now }, { merge: true });
        const acc = String(s.accountNumber);
        await v.ref.update({ settlement: { bankName: s.bankName || '', ifscCode: s.ifscCode || '', beneficiaryName: s.beneficiaryName || '', accountNumberMasked: `•••• ${acc.slice(-4)}`, hasBankDetails: Boolean(acc && s.ifscCode) } });
      });
    }
    const bps = d.commission?.baseRateBps ?? (typeof d.commissionRate === 'number' ? Math.round(d.commissionRate * 100) : null);
    if (bps === null || bps === undefined) log('vendor', v.id, 'COMMISSION_NOT_SET', `${d.storeName || d.businessName} — set it in Admin → Vendors before their products can sell`);
    if (v.id === 'biocart' && bps === 0) log('vendor', v.id, 'BIOCART_COMMISSION_IS_0', 'Owner rule: BioCart pays commission too — set the agreed % in Admin → Vendors');
  }

  // 6. Legacy simulated shipments
  const shipments = await db.collection('shipments').get();
  shipments.docs.forEach((s) => {
    const d = s.data();
    const awb = String(d.waybill || d.trackingNumber || d.awb || '');
    if (/^EKT\d{8}IN$/.test(awb)) {
      log('shipment', s.id, 'legacy_simulated_awb', `${awb} was generated by the old fake EKART code — not a real courier booking`);
      later(() => s.ref.update({ legacySimulatedAwb: true, status: 'legacy_unverified', parentOrderId: d.parentOrderId || d.orderNumber, earningsReleased: d.earningsReleased ?? false, migratedAt: now }));
    }
  });

  // Report
  const outDir = path.join(__dirname, '..', 'docs', 'evidence');
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `migration-${now.replace(/[:.]/g, '-')}${APPLY ? '-APPLIED' : '-DRYRUN'}.csv`);
  fs.writeFileSync(file, ['kind,id,action,detail', ...rows.map((r) => `${r.kind},${r.id},${r.action},${r.detail}`)].join('\n'));
  console.log(`\n${APPLY ? 'APPLYING' : 'DRY RUN (nothing written)'} — ${orders.size} orders scanned`);
  console.log(`  already migrated: ${already}\n  paid online kept: ${kept}\n  COD kept: ${cod}\n  unpaid online → payment_expired (stock returned): ${expired}\n  cancelled: ${cancelled}`);
  console.log(`  products restocked: ${restock.size}; vendor wallets recomputed: ${preview.length}; flagged rows: ${rows.filter((r) => /NOT_SET|IS_0|legacy/.test(r.action)).length}`);
  console.log(`  details: ${file}`);
  if (APPLY) {
    for (const op of ops) await op();
    console.log('Migration applied.');
  }
}

async function previewWallets() {
  // Approximation for the dry run: what the wallets will be after the order conversion above.
  const subs = await db.collectionGroup('vendor_orders').get();
  const parents = new Map<string, any>();
  const out = new Map<string, { pending: number; available: number }>();
  for (const d of subs.docs) {
    const orderId = d.ref.parent.parent!.id;
    if (!parents.has(orderId)) parents.set(orderId, (await db.collection('orders').doc(orderId).get()).data() || {});
    const o = parents.get(orderId);
    const v = d.data();
    const st = String(o.status || '').toLowerCase();
    const isCod = String(o.paymentMethod || 'cod') === 'cod';
    const counts = o.financialsAllocated === true || (st !== 'cancelled' && (isCod || o.paymentStatus === 'paid'));
    if (!counts) continue;
    const p = Number(v.vendorPayablePaise ?? paise(v.vendorPayable));
    const delivered = String(v.status || '').toLowerCase() === 'delivered' || st === 'delivered';
    const cur = out.get(v.vendorId) || { pending: 0, available: 0 };
    if (delivered && !isCod) cur.available += p; else cur.pending += p;
    out.set(v.vendorId, cur);
  }
  const wallets = await db.collection('vendor_wallets').get();
  wallets.docs.forEach((w) => { if (!out.has(w.id)) out.set(w.id, { pending: 0, available: 0 }); });
  const res = [];
  for (const [vendorId, after] of out) {
    const w = (await db.collection('vendor_wallets').doc(vendorId).get()).data() || {};
    res.push({ vendorId, before: { pending: Number(w.pendingBalance ?? w.pending ?? 0), available: Number(w.availableBalance ?? w.available ?? 0) }, after });
  }
  return res;
}

main().catch((e) => { console.error('Migration failed:', e); process.exit(1); });
