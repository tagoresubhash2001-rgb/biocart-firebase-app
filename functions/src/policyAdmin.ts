import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db, REGION, requireAdmin, loadPolicy, nowIso, audit, getCaller, isAdminCaller, callerOwnsVendor } from './core';

/** Admin: edit the marketplace rules (shipping fee, free-shipping threshold, COD switch, payout hold). */
export const updateFinancialPolicy = onCall({ region: REGION }, async (request) => {
  const caller = await requireAdmin(request.auth);
  const d = request.data || {};
  const cur = await loadPolicy();
  const next: Record<string, any> = {};
  const rupeesToPaise = (v: any, label: string, max: number) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > max) throw new HttpsError('invalid-argument', `${label} must be between 0 and ${max}.`);
    return Math.round(n * 100);
  };
  if (d.shippingFee !== undefined) next.shippingFeePaise = rupeesToPaise(d.shippingFee, 'Shipping fee (₹)', 1000);
  if (d.freeShippingThreshold !== undefined) next.freeShippingThresholdPaise = rupeesToPaise(d.freeShippingThreshold, 'Free-shipping threshold (₹)', 100000);
  if (d.codEnabled !== undefined) next.codEnabled = d.codEnabled === true;
  if (d.payoutHoldDaysAfterDelivery !== undefined) {
    const n = Number(d.payoutHoldDaysAfterDelivery);
    if (!Number.isInteger(n) || n < 0 || n > 30) throw new HttpsError('invalid-argument', 'Hold days must be 0–30.');
    next.payoutHoldDaysAfterDelivery = n;
  }
  if (!Object.keys(next).length) throw new HttpsError('invalid-argument', 'Nothing to update.');
  const version = `${new Date().toISOString().slice(0, 10)}-${Date.now().toString(36)}`;
  await db().collection('settings').doc('financialPolicy').set({ ...next, policyVersion: version, updatedAt: nowIso(), updatedBy: caller.uid }, { merge: true });
  await audit(caller.uid, 'financial_policy_updated', 'settings', 'financialPolicy', { before: cur, after: next, version });
  return { success: true, policy: await loadPolicy() };
});

/**
 * Stock on hand → inventory, without breaking open reservations.
 * availableQuantity = stockOnHand − reservedQuantity (never negative).
 */
export async function applyStockOnHand(productId: string, stockOnHand: number) {
  const invRef = db().collection('inventory').doc(productId);
  const prodRef = db().collection('products').doc(productId);
  return db().runTransaction(async (t) => {
    const [inv, prod] = await Promise.all([t.get(invRef), t.get(prodRef)]);
    if (!prod.exists) throw new HttpsError('not-found', 'Product not found.');
    const reserved = Math.max(0, Number(inv.data()?.reservedQuantity || 0));
    const available = Math.max(0, stockOnHand - reserved);
    const ts = nowIso();
    const stockStatus = available > 0 ? (available <= 10 ? 'Low Stock' : 'In Stock') : 'Out of Stock';
    t.set(invRef, { productId, vendorId: prod.data()!.vendorId || 'biocart', quantity: stockOnHand, availableQuantity: available, reservedQuantity: reserved, stockStatus, inStock: available > 0, updatedAt: ts }, { merge: true });
    t.update(prodRef, { stockQuantity: stockOnHand, inStock: available > 0, stockStatus, updatedAt: ts });
    return { productId, stockOnHand, reserved, available };
  });
}

export const setProductStock = onCall({ region: REGION }, async (request) => {
  const caller = await getCaller(request.auth);
  const productId = String(request.data?.productId || '');
  const stock = Number(request.data?.stockOnHand);
  if (!Number.isInteger(stock) || stock < 0 || stock > 1_000_000) throw new HttpsError('invalid-argument', 'Stock must be a whole number of units.');
  const prod = await db().collection('products').doc(productId).get();
  if (!prod.exists) throw new HttpsError('not-found', 'Product not found.');
  const ownerVendor = prod.data()!.vendorId || 'biocart';
  if (!isAdminCaller(caller) && !(await callerOwnsVendor(caller, ownerVendor))) throw new HttpsError('permission-denied', 'Not your product.');
  return { success: true, ...(await applyStockOnHand(productId, stock)) };
});
