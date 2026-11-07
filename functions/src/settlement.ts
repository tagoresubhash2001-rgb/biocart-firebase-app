/**
 * Weekly vendor settlement (R5–R7).
 *  - Every Tuesday 18:00 IST a cycle (previous Tuesday 00:00 → Monday 23:59:59 IST) is created once and locked.
 *  - Only delivered sub-orders (earnings.state == 'eligible', eligibleAt ≤ cycle end) are included.
 *  - Refunds after settlement (wallet.adjustmentDue) are deducted.
 *  - Manual payout mode: settlement becomes `ready_for_payment`; admin pays from the bank and
 *    records the UTR with markSettlementPaid. Nothing is ever marked paid without a UTR.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { db, FieldValue, REGION, requireAdmin, nowIso, rupees, audit } from './core';
import { netPayablePaise } from './ledger';

const IST_OFFSET_MS = 330 * 60_000;

/** End of the most recent completed cycle (Monday 23:59:59.999 IST) at or before `now`. */
export function cycleWindow(now: Date) {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);           // wall clock in IST, read via UTC getters
  const day = ist.getUTCDay();                                     // 0 Sun … 2 Tue
  const daysSinceMonday = (day + 6) % 7;                           // Mon → 0
  const monday = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() - (daysSinceMonday === 0 ? 7 : daysSinceMonday)));
  // If today is Monday the cycle ending today is not complete yet → use last Monday (handled above).
  const endIst = new Date(monday.getTime() + 86400_000 - 1);       // Monday 23:59:59.999 (IST wall clock)
  const startIst = new Date(endIst.getTime() - 7 * 86400_000 + 1); // previous Tuesday 00:00 IST
  const end = new Date(endIst.getTime() - IST_OFFSET_MS);
  const start = new Date(startIst.getTime() - IST_OFFSET_MS);
  const cycleId = `CYCLE-${monday.toISOString().slice(0, 10)}`;
  return { cycleId, startIso: start.toISOString(), endIso: end.toISOString() };
}

async function bankSnapshot(vendorId: string) {
  const [v, priv] = await Promise.all([
    db().collection('vendors').doc(vendorId).get(),
    db().collection('vendors').doc(vendorId).collection('private').doc('settlement').get(),
  ]);
  const vd = v.data() || {};
  const s = { ...(vd.settlement || {}), ...(priv.data() || {}) };
  const acc = String(s.accountNumber || '');
  return {
    vendorName: vd.storeName || vd.businessName || vendorId,
    ownerUid: vd.ownerUid || vendorId,
    bank: {
      beneficiaryName: s.beneficiaryName || vd.ownerName || '', bankName: s.bankName || '', ifscCode: s.ifscCode || '',
      accountNumberMasked: acc.length > 4 ? `•••• ${acc.slice(-4)}` : (acc ? '••••' : ''), hasBankDetails: Boolean(acc && s.ifscCode),
    },
  };
}

/** Builds (once) the settlement for one vendor in one cycle. Returns null when nothing is due. */
export async function settleVendorForCycle(vendorId: string, cycleId: string, cutoffIso: string, triggeredBy: string) {
  const candidates = await db().collectionGroup('vendor_orders')
    .where('vendorId', '==', vendorId).where('earnings.state', '==', 'eligible').get();
  const due = candidates.docs.filter((d) => String(d.data().earnings?.eligibleAt || '') <= cutoffIso);
  const walletRef = db().collection('vendor_wallets').doc(vendorId);
  const settlementId = `${cycleId}_${vendorId}`;
  const sRef = db().collection('vendor_settlements').doc(settlementId);
  const info = await bankSnapshot(vendorId);

  return db().runTransaction(async (t) => {
    const existing = await t.get(sRef);
    if (existing.exists) return { settlementId, skipped: 'already_created' };
    const w = (await t.get(walletRef)).data() || {};
    const fresh = due.length ? await t.getAll(...due.map((d) => d.ref)) : [];
    const rows = fresh.filter((d) => d.data()?.earnings?.state === 'eligible');
    const adjustmentDue = Math.max(0, Number(w.adjustmentDue || 0));
    if (rows.length === 0 && adjustmentDue === 0) return null;
    const gross = rows.reduce((s, d) => s + netPayablePaise(d.data()), 0);
    if (gross === 0) return null; // nothing to pay; adjustments wait for future earnings
    const offset = Math.min(gross, adjustmentDue);
    const net = gross - offset;
    const ts = nowIso();
    const status = net > 0 ? 'ready_for_payment' : 'offset_by_adjustments';
    t.set(sRef, {
      id: settlementId, batchId: cycleId, cycleId, vendorId, vendorName: info.vendorName,
      grossPaise: gross, adjustmentsPaise: offset, amountPaise: net, amount: rupees(net), currency: 'INR',
      orderCount: rows.length, orders: rows.map((d) => ({ orderId: d.data()!.orderNumber, vendorPayablePaise: d.data()!.vendorPayablePaise, courierChargePaise: Number(d.data()!.courierChargePaise) || 0, netPaise: netPayablePaise(d.data()) })),
      status, bankDetails: info.bank, needsBankDetails: !info.bank.hasBankDetails,
      scheduledDay: 'Tuesday', cutoffAt: cutoffIso, triggeredBy, createdAt: ts, updatedAt: ts,
    });
    rows.forEach((d) => t.update(d.ref, { 'earnings.state': net > 0 ? 'in_settlement' : 'settled', 'earnings.settlementId': settlementId, updatedAt: ts }));
    t.set(walletRef, {
      available: FieldValue.increment(-gross), availableBalance: FieldValue.increment(-gross),
      settling: FieldValue.increment(net), adjustmentDue: FieldValue.increment(-offset), updatedAt: ts,
    }, { merge: true });
    t.set(db().collection('financial_ledger').doc(`${settlementId}_batched`), {
      id: `${settlementId}_batched`, vendorId, account: `vendor:${vendorId}`, settlementId, entryType: 'settlement_batched', direction: 'transfer',
      bucket: 'settling', status: 'settled', amountPaise: net, metadata: { grossPaise: gross, adjustmentsPaise: offset, orderCount: rows.length },
      description: `Settlement ${settlementId}: ₹${rupees(gross)} earnings − ₹${rupees(offset)} adjustments = ₹${rupees(net)} to pay`, createdAt: ts,
    });
    t.set(db().collection('notifications').doc(`${settlementId}_ready`), {
      userId: info.ownerUid, vendorId, type: 'settlement_ready', title: 'Weekly settlement calculated',
      message: `₹${rupees(net)} for ${rows.length} delivered order(s) will be transferred to your bank.`, settlementId, read: false, createdAt: ts,
    });
    return { settlementId, amountPaise: net, status };
  });
}

export async function runSettlementCycle(now: Date, triggeredBy: string) {
  const { cycleId, startIso, endIso } = cycleWindow(now);
  const cycleRef = db().collection('settlement_cycles').doc(cycleId);
  try {
    await cycleRef.create({ cycleId, startAt: startIso, endAt: endIso, status: 'running', triggeredBy, createdAt: nowIso() });
  } catch {
    const c = (await cycleRef.get()).data();
    if (c?.status === 'completed') return { cycleId, skipped: 'already_completed' };
  }
  const eligible = await db().collectionGroup('vendor_orders').where('earnings.state', '==', 'eligible').get();
  const vendors = Array.from(new Set(eligible.docs.filter((d) => String(d.data().earnings?.eligibleAt || '') <= endIso).map((d) => String(d.data().vendorId))));
  const results: any[] = [];
  for (const vendorId of vendors) {
    try { results.push(await settleVendorForCycle(vendorId, cycleId, endIso, triggeredBy)); }
    catch (e: any) { console.error(`[settlement] ${cycleId} ${vendorId}`, e?.message); results.push({ vendorId, error: String(e?.message || e) }); }
  }
  const created = results.filter((r) => r && r.settlementId && !r.skipped);
  await cycleRef.set({
    status: results.some((r) => r?.error) ? 'completed_with_errors' : 'completed', completedAt: nowIso(),
    vendorsCount: created.length, totalPaise: created.reduce((s, r) => s + (r.amountPaise || 0), 0),
  }, { merge: true });
  return { cycleId, created: created.length, results };
}

export const tuesdayVendorSettlement = onSchedule({ schedule: '0 18 * * 2', timeZone: 'Asia/Kolkata', region: REGION, timeoutSeconds: 540 }, async () => {
  const r = await runSettlementCycle(new Date(), 'scheduler');
  console.log('[settlement] done', JSON.stringify({ cycleId: r.cycleId, created: (r as any).created }));
});

/** Admin: run the current cycle now (same rules, same lock) — e.g. if the scheduler was down. */
export const triggerManualSettlement = onCall({ region: REGION, timeoutSeconds: 300 }, async (request) => {
  const caller = await requireAdmin(request.auth);
  const r = await runSettlementCycle(new Date(), caller.uid);
  await audit(caller.uid, 'settlement_cycle_run', 'settlement_cycle', r.cycleId, { created: (r as any).created ?? 0 });
  return { success: true, ...r };
});

export const markSettlementPaid = onCall({ region: REGION }, async (request) => {
  const caller = await requireAdmin(request.auth);
  const settlementId = String(request.data?.settlementId || '');
  const utr = String(request.data?.utr || '').trim().toUpperCase();
  const paidOn = String(request.data?.paidOn || '').trim();
  const amountPaise = Number(request.data?.amountPaise);
  if (!/^[A-Z0-9]{6,30}$/.test(utr)) throw new HttpsError('invalid-argument', 'Enter the bank UTR / reference number (6–30 letters or digits).');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidOn)) throw new HttpsError('invalid-argument', 'Enter the payment date.');
  const dup = await db().collection('vendor_settlements').where('utr', '==', utr).limit(1).get();
  if (!dup.empty && dup.docs[0].id !== settlementId) throw new HttpsError('already-exists', 'This UTR is already recorded on another settlement.');
  const sRef = db().collection('vendor_settlements').doc(settlementId);
  const pre = await sRef.get();
  if (!pre.exists) throw new HttpsError('not-found', 'Settlement not found.');
  const owner = (await bankSnapshot(String(pre.data()!.vendorId))).ownerUid;
  await db().runTransaction(async (t) => {
    const s = await t.get(sRef);
    if (!s.exists) throw new HttpsError('not-found', 'Settlement not found.');
    const d = s.data()!;
    if (d.status === 'paid') throw new HttpsError('failed-precondition', 'This settlement is already marked as paid.');
    if (d.status !== 'ready_for_payment') throw new HttpsError('failed-precondition', `Settlement is "${d.status}" and cannot be paid.`);
    if (amountPaise !== d.amountPaise) throw new HttpsError('invalid-argument', `Amount must be exactly ₹${rupees(d.amountPaise)}.`);
    const subRefs = (d.orders || []).map((o: any) => db().collection('orders').doc(o.orderId).collection('vendor_orders').doc(d.vendorId));
    const subs = subRefs.length ? await t.getAll(...subRefs) : [];
    const ts = nowIso();
    t.update(sRef, { status: 'paid', utr, paidOn, paidAt: ts, paidBy: caller.uid, payoutMode: 'manual_bank_transfer', updatedAt: ts });
    subs.forEach((sd) => { if (sd.exists) t.update(sd.ref, { 'earnings.state': 'settled', updatedAt: ts }); });
    t.set(db().collection('vendor_wallets').doc(d.vendorId), {
      settling: FieldValue.increment(-d.amountPaise), paidOut: FieldValue.increment(d.amountPaise),
      lifetimeSettled: FieldValue.increment(d.amountPaise), lastPayoutDate: ts, updatedAt: ts,
    }, { merge: true });
    t.set(db().collection('financial_ledger').doc(`${settlementId}_payout`), {
      id: `${settlementId}_payout`, vendorId: d.vendorId, account: `vendor:${d.vendorId}`, settlementId, entryType: 'vendor_payout_disbursed',
      direction: 'debit', bucket: 'paid_out', status: 'settled', amountPaise: d.amountPaise, utr,
      description: `Settlement ${settlementId} paid by bank transfer, UTR ${utr} on ${paidOn}`, createdAt: ts,
    });
    t.set(db().collection('notifications').doc(`${settlementId}_paid`), {
      userId: owner, vendorId: d.vendorId, type: 'payout_disbursed', title: 'Settlement paid',
      message: `₹${rupees(d.amountPaise)} was transferred to your bank. UTR ${utr}.`, settlementId, read: false, createdAt: ts,
    });
  });
  await audit(caller.uid, 'settlement_marked_paid', 'vendor_settlement', settlementId, { utr, paidOn, amountPaise });
  return { success: true, settlementId, status: 'paid' };
});

/** Automatic payouts are disabled until Cashfree Payouts credentials are provided. */
export const retryVendorPayout = onCall({ region: REGION }, async (request) => {
  await requireAdmin(request.auth);
  throw new HttpsError('failed-precondition', 'Automatic bank payouts are not enabled yet. Pay the vendor from your bank and use "Mark as paid" with the UTR.');
});
