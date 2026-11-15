// Money-flow tests for the courier hold: runs the real ledger code against an in-memory wallet
// (no network, no real database) to prove the courier charge is deducted exactly once.
process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || 'unit-test';
const test = require('node:test');
const assert = require('node:assert/strict');
const { FieldValue } = require('firebase-admin/firestore');
const ledger = require('../lib/ledger.js');

/** Minimal stand-in for a Firestore transaction: applies set/merge and increments to plain objects. */
function fakeTx() {
  const docs = new Map();
  const apply = (ref, data) => {
    const cur = docs.get(ref.path) || {};
    for (const [k, v] of Object.entries(data)) {
      if (v instanceof FieldValue && typeof v.operand === 'number') cur[k] = (cur[k] || 0) + v.operand;
      else cur[k] = v;
    }
    docs.set(ref.path, cur);
  };
  return { set: apply, update: apply, docs, wallet: (id) => docs.get(`vendor_wallets/${id}`) || {}, entries: () => [...docs.entries()].filter(([p]) => p.startsWith('financial_ledger/')).map(([, d]) => d) };
}

const ORDER = { id: 'BC-TEST-1', totalAmountPaise: 109900, shippingAmountPaise: 9900 };
const SUB = () => ({ vendorId: 'v1', data: { vendorPayablePaise: 80000, commissionBasePaise: 100000, commissionPaise: 20000, commissionRateBps: 2000, subtotalPaise: 100000 } });

test('paid order: ₹800 share, ₹106.20 held → ₹693.80 pending; BioCart keeps commission and the ₹99 delivery fee', () => {
  const t = fakeTx();
  ledger.bookOrderAllocation(t, ORDER, [SUB()]);
  ledger.bookCourierCharge(t, ORDER.id, 'v1', 'hold', 10620, 'pending');
  assert.equal(t.wallet('v1').pending, 69380);
  const company = t.docs.get('company_wallet/main');
  assert.equal(company.commissionEarnedPaise, 20000);
  assert.equal(company.shippingIncomePaise, 9900);
  assert.equal(company.courierChargesFromVendorsPaise, 10620);
  const hold = t.entries().find((e) => e.entryType === 'courier_charge_held');
  assert.equal(hold.amountPaise, 10620);
  assert.equal(hold.direction, 'debit');
  assert.equal(hold.bucket, 'pending');
});

test('delivered: exactly share − courier moves to "ready for Tuesday payout" (no double deduction)', () => {
  const t = fakeTx();
  ledger.bookOrderAllocation(t, ORDER, [SUB()]);
  ledger.bookCourierCharge(t, ORDER.id, 'v1', 'hold', 10620, 'pending');
  const so = { vendorPayablePaise: 80000, courierChargePaise: 10620 };
  assert.equal(ledger.netPayablePaise(so), 69380);
  ledger.bookEarningsEligible(t, ORDER.id, 'v1', ledger.netPayablePaise(so));
  assert.equal(t.wallet('v1').pending, 0);
  assert.equal(t.wallet('v1').available, 69380);
});

test('booking: real charge higher than the estimate → more is held', () => {
  const t = fakeTx();
  ledger.bookOrderAllocation(t, ORDER, [SUB()]);
  ledger.bookCourierCharge(t, ORDER.id, 'v1', 'hold', 10620, 'pending');
  ledger.bookCourierCharge(t, ORDER.id, 'v1', 'adjust', 14750 - 10620, 'pending', '_AWB1');
  assert.equal(t.wallet('v1').pending, 80000 - 14750);
  const adj = t.entries().find((e) => e.entryType === 'courier_charge_adjusted');
  assert.equal(adj.amountPaise, 4130);
  assert.equal(adj.direction, 'debit');
});

test('booking: real charge lower than the estimate → the difference goes back to the seller', () => {
  const t = fakeTx();
  ledger.bookOrderAllocation(t, ORDER, [SUB()]);
  ledger.bookCourierCharge(t, ORDER.id, 'v1', 'hold', 14750, 'pending');
  ledger.bookCourierCharge(t, ORDER.id, 'v1', 'adjust', 10620 - 14750, 'pending', '_AWB1');
  assert.equal(t.wallet('v1').pending, 80000 - 10620);
  const adj = t.entries().find((e) => e.entryType === 'courier_charge_adjusted');
  assert.equal(adj.amountPaise, -4130);
  assert.equal(adj.direction, 'credit');
  assert.equal(t.docs.get('company_wallet/main').courierChargesFromVendorsPaise, 10620);
});

test('cancelled before shipping: hold fully released, seller owes nothing', () => {
  const t = fakeTx();
  ledger.bookOrderAllocation(t, ORDER, [SUB()]);
  ledger.bookCourierCharge(t, ORDER.id, 'v1', 'hold', 10620, 'pending');
  // what initiateRefund does for a never-shipped order: release, then reverse the sale with no courier charge left
  ledger.bookCourierCharge(t, ORDER.id, 'v1', 'release', -10620, 'pending', '_RF1');
  ledger.bookSubOrderReversal(t, 'RF1', ORDER.id, 'v1', { ...SUB().data, courierChargePaise: 0 }, 'pending');
  const w = t.wallet('v1');
  assert.equal(w.pending, 0);
  assert.equal(w.adjustmentDue || 0, 0);
  assert.equal(w.lifetimeCourierCharges, 0);
  assert.equal(t.entries().find((e) => e.entryType === 'courier_charge_released').amountPaise, -10620);
});

test('cancelled after shipping: the courier charge stays the seller\'s cost', () => {
  const t = fakeTx();
  ledger.bookOrderAllocation(t, ORDER, [SUB()]);
  ledger.bookCourierCharge(t, ORDER.id, 'v1', 'hold', 10620, 'pending');
  ledger.bookSubOrderReversal(t, 'RF2', ORDER.id, 'v1', { ...SUB().data, courierChargePaise: 10620 }, 'pending');
  const w = t.wallet('v1');
  assert.equal(w.pending, 0);
  assert.equal(w.adjustmentDue, 10620);
});
