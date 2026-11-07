/**
 * BioCart order engine.
 *
 *  quoteOrder           – authoritative price quote (no writes)
 *  createOrder          – validates cart, reserves stock, writes awaiting_payment order
 *                          (idempotent per checkoutId). NO money is booked here.
 *  allocateOrderFinancials – the ONLY place money is booked; runs once, after verified
 *                          Cashfree payment or COD confirmation.
 *  releaseExpiredReservations – returns stock of unpaid orders.
 *  cancelOrder / updateOrderStatus / updateVendorOrderStatus / adminMarkDelivered /
 *  markCodRemitted / processOrderRefund – lifecycle, all server-side.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { Transaction } from 'firebase-admin/firestore';
import * as crypto from 'node:crypto';
import {
  db, FieldValue, REGION, CASHFREE_SECRETS, EKART_SECRETS, loadPolicy, MarketplacePolicy, getCaller, isAdminCaller,
  requireAdmin, callerOwnsVendor, rateLimit, rupees, nowIso, cleanPhone, cleanPincode, audit, ORDER_STATUS,
} from './core';
import { priceOrder, PricingCoupon, PricingLineInput, PricingResult } from './pricing';
import {
  bookOrderAllocation, bookEarningsEligible, bookSubOrderReversal, bookShippingReversal, bookCustomerRefund, EarningsState,
} from './ledger';
import { cashfreeRequest, CashfreeApiError } from './cashfreeApi';
import { checkServiceability } from './ekartApi';

interface CartItem { productId: string; quantity: number }

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------
function parseItems(raw: any): CartItem[] {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 50) throw new HttpsError('invalid-argument', 'Your cart is empty.');
  const items = raw.map((it: any) => ({ productId: String(it?.productId || ''), quantity: Number(it?.quantity) }));
  if (items.some((it) => !/^[A-Za-z0-9_-]{1,128}$/.test(it.productId) || !Number.isInteger(it.quantity) || it.quantity < 1 || it.quantity > 99)) {
    throw new HttpsError('invalid-argument', 'Some cart items are invalid. Please refresh your cart.');
  }
  if (new Set(items.map((i) => i.productId)).size !== items.length) throw new HttpsError('invalid-argument', 'Cart contains duplicate products.');
  return items;
}

export function isProductApproved(p: any): boolean {
  if (!p || p.active === false || p.status === 'archived' || p.status === 'suspended') return false;
  if (p.approvalStatus) return String(p.approvalStatus).toLowerCase() === 'approved';
  return p.source !== 'vendor_created'; // legacy admin-created catalogue items
}

export function vendorCommissionBps(v: any): number | null {
  const bps = v?.commission?.baseRateBps;
  if (Number.isInteger(bps) && bps >= 0 && bps <= 10000) return bps;
  const pct = v?.commissionRate ?? v?.commissionPercent;
  if (typeof pct === 'number' && Number.isFinite(pct) && pct >= 0 && pct <= 100) return Math.round(pct * 100);
  return null;
}

const vendorIdOf = (p: any) => (typeof p?.vendorId === 'string' && p.vendorId ? p.vendorId : 'biocart');
const toMillis = (v: any) => (v && typeof v.toMillis === 'function' ? v.toMillis() : v ? new Date(v).getTime() : NaN);

interface Plan {
  pricing: PricingResult;
  lines: PricingLineInput[];
  vendors: Record<string, any>;
  coupon: (PricingCoupon & { ref: FirebaseFirestore.DocumentReference }) | null;
  codAllowedForCart: boolean;
}

/** Builds the authoritative plan from already-read documents. Throws user-friendly errors. */
function buildPlan(
  items: CartItem[], productDocs: FirebaseFirestore.DocumentSnapshot[], inventoryDocs: FirebaseFirestore.DocumentSnapshot[],
  vendorDocs: Map<string, FirebaseFirestore.DocumentSnapshot>, couponDoc: FirebaseFirestore.QueryDocumentSnapshot | null,
  couponCode: string | null, policy: MarketplacePolicy, checkStock: boolean,
): Plan {
  const lines: PricingLineInput[] = [];
  const vendors: Record<string, any> = {};
  const commission: Record<string, number> = {};
  items.forEach((it, i) => {
    const pd = productDocs[i];
    const p = pd.exists ? pd.data() : null;
    if (!p || !isProductApproved(p)) throw new HttpsError('failed-precondition', `"${p?.name || it.productId}" is no longer available. Please remove it from your cart.`);
    const price = Number(p.price);
    if (!Number.isFinite(price) || price <= 0) throw new HttpsError('failed-precondition', `"${p.name}" has no valid price.`);
    const vendorId = vendorIdOf(p);
    const vd = vendorDocs.get(vendorId);
    const v = vd && vd.exists ? vd.data() : null;
    if (!v || !['active', 'approved'].includes(String(v.status || '').toLowerCase())) {
      throw new HttpsError('failed-precondition', `"${p.name}" is temporarily unavailable from its seller.`);
    }
    const bps = vendorCommissionBps(v);
    if (bps === null) throw new HttpsError('failed-precondition', `"${p.name}" cannot be sold yet (seller setup incomplete).`);
    vendors[vendorId] = v; commission[vendorId] = bps;
    if (checkStock) {
      const inv = inventoryDocs[i].exists ? inventoryDocs[i].data()! : null;
      const avail = Number(inv?.availableQuantity ?? 0);
      if (!inv || avail < it.quantity) {
        throw new HttpsError('out-of-range', avail > 0 ? `Only ${avail} left of "${p.name}".` : `"${p.name}" is out of stock.`);
      }
    }
    const min = Number(p.minOrderQuantity) || 1;
    const max = Number(p.maxOrderQuantity) || 99;
    if (it.quantity < min || it.quantity > max) throw new HttpsError('out-of-range', `"${p.name}" can be ordered in quantities ${min}–${max}.`);
    lines.push({
      productId: pd.id, name: String(p.name || 'Product'), vendorId, category: String(p.category || ''),
      pricePaise: Math.round(price * 100), quantity: it.quantity, hsnCode: p.hsnCode || '', codAllowed: p.codAllowed === true,
    });
  });

  let coupon: Plan['coupon'] = null;
  if (couponCode) {
    if (!couponDoc) throw new HttpsError('not-found', 'This coupon code is not valid.');
    const c = couponDoc.data();
    const now = Date.now();
    if (c.status && !['active', 'Active'].includes(c.status)) throw new HttpsError('failed-precondition', 'This coupon is not active.');
    if (c.active === false) throw new HttpsError('failed-precondition', 'This coupon is not active.');
    const end = toMillis(c.endDate || c.expiryDate);
    if (Number.isFinite(end) && end < now) throw new HttpsError('failed-precondition', 'This coupon has expired.');
    const start = toMillis(c.startDate);
    if (Number.isFinite(start) && start > now) throw new HttpsError('failed-precondition', 'This coupon is not active yet.');
    if (c.usageLimit && (c.usedCount || 0) >= c.usageLimit) throw new HttpsError('failed-precondition', 'This coupon has reached its usage limit.');
    const creatorVendorId: string | undefined = c.creatorVendorId || c.vendorId || undefined;
    const creatorRole: 'admin' | 'vendor' = creatorVendorId ? 'vendor' : 'admin';
    const prodIds: string[] = Array.isArray(c.applicableProductIds) ? c.applicableProductIds : [];
    const cats: string[] = Array.isArray(c.applicableCategories) ? c.applicableCategories.map((x: string) => String(x).toLowerCase()) : [];
    const eligible = lines.filter((l) =>
      (!creatorVendorId || l.vendorId === creatorVendorId) &&
      (prodIds.length === 0 || prodIds.includes(l.productId)) &&
      (cats.length === 0 || cats.includes(String(l.category || '').toLowerCase())));
    const eligibleTotal = eligible.reduce((s, l) => s + l.pricePaise * l.quantity, 0);
    if (eligibleTotal === 0) throw new HttpsError('failed-precondition', 'This coupon does not apply to the items in your cart.');
    const minOrder = Math.round(Number(c.minOrderAmount || 0) * 100);
    if (minOrder > 0 && eligibleTotal < minOrder) throw new HttpsError('failed-precondition', `This coupon needs a minimum of ₹${c.minOrderAmount} on eligible items.`);
    const type = c.discountType || c.type || 'percentage';
    const value = Number(c.discountValue ?? c.value ?? 0);
    let discount = type === 'fixed' ? Math.round(value * 100) : Math.round((eligibleTotal * value) / 100);
    const cap = Math.round(Number(c.maxDiscountAmount || 0) * 100);
    if (cap > 0) discount = Math.min(discount, cap);
    discount = Math.max(0, Math.min(discount, eligibleTotal));
    coupon = { code: couponCode, creatorRole, creatorVendorId, eligibleProductIds: eligible.map((l) => l.productId), discountPaise: discount, ref: couponDoc.ref };
  }

  let pricing: PricingResult;
  try {
    pricing = priceOrder(lines, commission, coupon, policy);
  } catch (e: any) {
    throw new HttpsError('failed-precondition', e?.message || 'Could not price this cart.');
  }
  const codAllowedForCart = policy.codEnabled && lines.every((l) => l.codAllowed === true);
  return { pricing, lines, vendors, coupon, codAllowedForCart };
}

async function readCartDocs(items: CartItem[], couponCode: string | null, t?: Transaction) {
  const getAll = (refs: FirebaseFirestore.DocumentReference[]) => (t ? t.getAll(...refs) : db().getAll(...refs));
  const productDocs = await getAll(items.map((i) => db().collection('products').doc(i.productId)));
  const inventoryDocs = await getAll(items.map((i) => db().collection('inventory').doc(i.productId)));
  const vendorIds = Array.from(new Set(productDocs.map((d) => vendorIdOf(d.exists ? d.data() : null))));
  const vDocs = await getAll(vendorIds.map((v) => db().collection('vendors').doc(v)));
  const vendorDocs = new Map(vendorIds.map((v, i) => [v, vDocs[i]] as const));
  let couponDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  if (couponCode) {
    const q = db().collection('coupons').where('code', '==', couponCode).limit(1);
    const snap = t ? await t.get(q) : await q.get();
    couponDoc = snap.empty ? null : snap.docs[0];
  }
  return { productDocs, inventoryDocs, vendorDocs, couponDoc };
}

const normCoupon = (c: any) => (typeof c === 'string' && c.trim() ? c.trim().toUpperCase().slice(0, 40) : null);

function quoteResponse(plan: Plan, policy: MarketplacePolicy) {
  const p = plan.pricing;
  return {
    subtotal: rupees(p.subtotalPaise), subtotalPaise: p.subtotalPaise,
    discountAmount: rupees(p.discountPaise), discountAmountPaise: p.discountPaise,
    taxAmount: 0, taxAmountPaise: 0,
    shippingAmount: rupees(p.shippingPaise), shippingAmountPaise: p.shippingPaise,
    totalAmount: rupees(p.totalPaise), totalAmountPaise: p.totalPaise,
    freeShippingThreshold: rupees(policy.freeShippingThresholdPaise),
    shippingFee: rupees(policy.shippingFeePaise),
    minOrderValue: 0,
    codAvailable: plan.codAllowedForCart,
    codMinValue: 0, codMaxValue: 49999,
    couponCode: plan.coupon?.code || null,
    vendors: p.vendorSplits.map((v) => ({ vendorId: v.vendorId, storeName: plan.vendors[v.vendorId]?.storeName || plan.vendors[v.vendorId]?.businessName || v.vendorId, subtotal: rupees(v.subtotalPaise) })),
  };
}

// ---------------------------------------------------------------------------
// quoteOrder
// ---------------------------------------------------------------------------
export const quoteOrder = onCall({ region: REGION }, async (request) => {
  const key = request.auth?.uid || request.rawRequest?.ip || 'anon';
  await rateLimit(`quote_${key}`, 60, 60);
  const items = parseItems(request.data?.items);
  const couponCode = normCoupon(request.data?.couponCode);
  const policy = await loadPolicy();
  const docs = await readCartDocs(items, couponCode);
  const plan = buildPlan(items, docs.productDocs, docs.inventoryDocs, docs.vendorDocs, docs.couponDoc, couponCode, policy, true);
  return quoteResponse(plan, policy);
});

// ---------------------------------------------------------------------------
// createOrder
// ---------------------------------------------------------------------------
function cleanAddress(a: any) {
  if (!a || typeof a !== 'object') return null;
  const s = (v: any, n = 200) => String(v ?? '').trim().slice(0, n);
  const out = {
    name: s(a.name, 100), phone: cleanPhone(a.phone), address: s(a.address || a.street, 300),
    city: s(a.city, 80), state: s(a.state, 80), zip: cleanPincode(a.zip || a.postalCode || a.pincode),
  };
  return out;
}

export const createOrder = onCall({ region: REGION, secrets: [...EKART_SECRETS] }, async (request) => {
  const caller = await getCaller(request.auth);
  const token = request.auth!.token;
  if (token.email_verified !== true && typeof token.phone_number !== 'string') {
    throw new HttpsError('permission-denied', 'Please verify your email or phone number before placing an order.');
  }
  if (caller.status === 'suspended' || caller.status === 'blocked') throw new HttpsError('permission-denied', 'Your account cannot place orders. Please contact support.');
  await rateLimit(`create_${caller.uid}`, 10, 300);

  const data = request.data || {};
  const items = parseItems(data.items);
  const couponCode = normCoupon(data.couponCode);
  const checkoutId = String(data.checkoutId || '');
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(checkoutId)) throw new HttpsError('invalid-argument', 'Checkout session expired. Please refresh and try again.');
  const paymentMethod = data.paymentMethod === 'cod' ? 'cod' : 'cashfree';
  const ship = cleanAddress(data.shippingAddress);
  if (!ship || !ship.name || !ship.phone || !ship.address || !ship.city || !ship.state || !ship.zip) {
    throw new HttpsError('invalid-argument', 'Please enter a complete delivery address with a valid 10-digit mobile number and 6-digit PIN code.');
  }
  const bill = cleanAddress(data.billingAddress) || ship;

  const sessionRef = db().collection('checkout_sessions').doc(`${caller.uid}_${checkoutId}`);
  const existing = await sessionRef.get();
  if (existing.exists) return { success: true, orderId: existing.data()!.orderId, reused: true };

  // Courier serviceability (definitive "no" blocks the order; an EKART outage does not)
  let serviceability: { checked: boolean; serviceable?: boolean; cod?: boolean; maxCodAmount?: number; error?: string } = { checked: false };
  try {
    const s = await checkServiceability(ship.zip);
    serviceability = { checked: true, serviceable: s.serviceable, cod: s.cod, maxCodAmount: s.maxCodAmount };
  } catch (e: any) {
    serviceability = { checked: false, error: String(e?.message || e).slice(0, 200) };
    console.warn('[createOrder] EKART serviceability unavailable:', serviceability.error);
  }
  if (serviceability.checked && serviceability.serviceable === false) {
    throw new HttpsError('failed-precondition', `Sorry, we cannot deliver to PIN code ${ship.zip} yet.`);
  }

  const policy = await loadPolicy();
  const year = new Date().getFullYear();
  const orderId = `BC-${year}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const reservationExpiresAt = new Date(Date.now() + policy.reservationMinutes * 60_000).toISOString();

  const result = await db().runTransaction(async (t) => {
    const sess = await t.get(sessionRef);
    if (sess.exists) return { orderId: sess.data()!.orderId as string, reused: true };
    const docs = await readCartDocs(items, couponCode, t);
    const plan = buildPlan(items, docs.productDocs, docs.inventoryDocs, docs.vendorDocs, docs.couponDoc, couponCode, policy, true);
    if (paymentMethod === 'cod') {
      if (!plan.codAllowedForCart) throw new HttpsError('failed-precondition', 'Cash on Delivery is not available for this order.');
      if (serviceability.checked && (!serviceability.cod || plan.pricing.totalPaise > (serviceability.maxCodAmount || 0) * 100)) {
        throw new HttpsError('failed-precondition', 'Cash on Delivery is not available for this PIN code or amount.');
      }
    }
    const p = plan.pricing;
    const ts = nowIso();

    // reserve stock
    items.forEach((it, i) => {
      t.update(docs.inventoryDocs[i].ref, {
        availableQuantity: FieldValue.increment(-it.quantity),
        reservedQuantity: FieldValue.increment(it.quantity),
        updatedAt: ts,
      });
    });

    const orderRef = db().collection('orders').doc(orderId);
    const orderItems = plan.lines.map((l) => ({
      productId: l.productId, name: l.name, vendorId: l.vendorId, quantity: l.quantity,
      price: rupees(l.pricePaise), pricePaise: l.pricePaise, total: rupees(l.pricePaise * l.quantity), totalPaise: l.pricePaise * l.quantity,
      hsnCode: l.hsnCode || '',
    }));
    t.set(orderRef, {
      id: orderId, orderNumber: orderId, invoiceNumber: orderId.replace('BC-', 'OC-'), userId: caller.uid, checkoutId,
      customerEmail: token.email || caller.data?.email || '', customerName: ship.name,
      items: orderItems, vendorIds: p.vendorSplits.map((v) => v.vendorId),
      subtotal: rupees(p.subtotalPaise), subtotalPaise: p.subtotalPaise,
      discountAmount: rupees(p.discountPaise), discountAmountPaise: p.discountPaise,
      taxAmount: 0, taxAmountPaise: 0,
      shippingAmount: rupees(p.shippingPaise), shippingAmountPaise: p.shippingPaise,
      totalAmount: rupees(p.totalPaise), totalAmountPaise: p.totalPaise,
      couponCode: plan.coupon?.code || null,
      pricingSnapshot: {
        policyVersion: policy.policyVersion, shippingFeePaise: policy.shippingFeePaise, freeShippingThresholdPaise: policy.freeShippingThresholdPaise,
        taxInclusive: true, commissionByVendor: Object.fromEntries(p.vendorSplits.map((v) => [v.vendorId, v.commissionRateBps])),
      },
      financialSummary: { totalPlatformCommissionPaise: p.totalCommissionPaise, totalVendorPayablePaise: p.totalVendorPayablePaise, platformCouponSubsidyPaise: p.platformCouponSubsidyPaise, gatewayFeePaise: null, gatewayFeeStatus: 'pending_reconciliation' },
      shippingAddress: ship, billingAddress: bill,
      customerGstin: typeof data.customerGstin === 'string' ? data.customerGstin.trim().toUpperCase().slice(0, 15) : null,
      customerBusinessName: typeof data.customerBusinessName === 'string' ? data.customerBusinessName.trim().slice(0, 120) : null,
      paymentMethod, paymentStatus: 'pending', status: ORDER_STATUS.AWAITING_PAYMENT, orderStatus: ORDER_STATUS.AWAITING_PAYMENT,
      financialsAllocated: false, reservationExpiresAt, reservationReleased: false,
      serviceability,
      statusHistory: [{ status: ORDER_STATUS.AWAITING_PAYMENT, at: ts, by: caller.uid, role: 'customer', reason: 'Order created, waiting for payment' }],
      createdAt: FieldValue.serverTimestamp(), updatedAt: ts, pdfUrl: null,
    });

    for (const [splitIndex, v] of p.vendorSplits.entries()) {
      const vendor = plan.vendors[v.vendorId] || {};
      // COD: the shipping charge is collected with the first seller's parcel.
      const codAmountPaise = paymentMethod === 'cod' ? v.customerPaidPaise + (splitIndex === 0 ? p.shippingPaise : 0) : 0;
      t.set(orderRef.collection('vendor_orders').doc(v.vendorId), {
        vendorId: v.vendorId, vendorStoreName: vendor.storeName || vendor.businessName || v.vendorId,
        orderNumber: orderId, userId: caller.uid,
        items: v.items.map((it) => ({ productId: it.productId, name: it.name, quantity: it.quantity, price: rupees(it.pricePaise), pricePaise: it.pricePaise, total: rupees(it.lineTotalPaise), discountPaise: it.discountPaise })),
        subtotal: rupees(v.subtotalPaise), subtotalPaise: v.subtotalPaise,
        vendorFundedDiscountPaise: v.vendorFundedDiscountPaise, platformFundedDiscountPaise: v.platformFundedDiscountPaise,
        customerPaidPaise: v.customerPaidPaise, commissionBasePaise: v.commissionBasePaise,
        commissionRateBps: v.commissionRateBps, commissionPercent: v.commissionRateBps / 100,
        commissionAmount: rupees(v.commissionPaise), commissionAmountPaise: v.commissionPaise, commissionPaise: v.commissionPaise,
        vendorPayable: rupees(v.vendorPayablePaise), vendorPayablePaise: v.vendorPayablePaise,
        paymentMethod, paymentStatus: 'pending',
        status: ORDER_STATUS.AWAITING_PAYMENT, orderStatus: ORDER_STATUS.AWAITING_PAYMENT, shipmentStatus: 'pending',
        fulfilment: { name: ship.name, phone: ship.phone, address: ship.address, city: ship.city, state: ship.state, zip: ship.zip, paymentMode: paymentMethod === 'cod' ? 'COD' : 'Prepaid', codAmountPaise },
        earnings: { state: 'none' },
        trackingNumber: null, awbNumber: null,
        statusHistory: [{ status: ORDER_STATUS.AWAITING_PAYMENT, at: ts, by: caller.uid, role: 'customer' }],
        createdAt: FieldValue.serverTimestamp(), updatedAt: ts,
      });
    }
    t.set(sessionRef, { orderId, userId: caller.uid, createdAt: ts });
    return { orderId, reused: false };
  });

  if (!result.reused && paymentMethod === 'cod') {
    await allocateOrderFinancials(result.orderId, { type: 'cod' });
  }
  return { success: true, orderId: result.orderId, reused: result.reused, paymentMethod };
});

// ---------------------------------------------------------------------------
// allocateOrderFinancials — books money exactly once
// ---------------------------------------------------------------------------
export interface PaymentProof { type: 'cashfree' | 'cod'; paymentRef?: string | null; amountPaise?: number; paymentGroup?: string | null; source?: string }

export async function allocateOrderFinancials(orderId: string, proof: PaymentProof): Promise<{ allocated: boolean; reason?: string; refundRequired?: boolean }> {
  const orderRef = db().collection('orders').doc(orderId);
  const outcome = await db().runTransaction(async (t) => {
    const os = await t.get(orderRef);
    if (!os.exists) return { allocated: false, reason: 'order_not_found' };
    const order = os.data()!;
    if (order.financialsAllocated === true) return { allocated: false, reason: 'already_allocated' };
    if (proof.type === 'cashfree' && typeof proof.amountPaise === 'number' && Math.abs(proof.amountPaise - order.totalAmountPaise) > 0) {
      t.update(orderRef, { paymentDiscrepancy: true, paymentDiscrepancyReason: `Paid ${proof.amountPaise} paise, expected ${order.totalAmountPaise}`, updatedAt: nowIso() });
      return { allocated: false, reason: 'amount_mismatch' };
    }
    const subSnap = await t.get(orderRef.collection('vendor_orders'));
    const items: any[] = order.items || [];
    const invRefs = items.map((it) => db().collection('inventory').doc(it.productId));
    const invDocs = invRefs.length ? await t.getAll(...invRefs) : [];
    const couponSnap = order.couponCode ? await t.get(db().collection('coupons').where('code', '==', order.couponCode).limit(1)) : null;
    const ts = nowIso();

    // Late payment after the reservation was released: re-take stock if possible, else refund.
    if (order.reservationReleased === true) {
      const short = items.some((it, i) => Number(invDocs[i].data()?.availableQuantity ?? 0) < it.quantity);
      if (short) {
        t.update(orderRef, {
          paymentStatus: 'paid', paymentReference: proof.paymentRef || null, paidAt: ts, latePaymentRefundRequired: true,
          status: ORDER_STATUS.CANCELLED, orderStatus: ORDER_STATUS.CANCELLED, updatedAt: ts,
          statusHistory: FieldValue.arrayUnion({ status: ORDER_STATUS.CANCELLED, at: ts, by: 'system', role: 'system', reason: 'Payment arrived after the stock hold expired and stock ran out — full refund issued' }),
        });
        return { allocated: false, reason: 'late_payment_no_stock', refundRequired: true };
      }
      items.forEach((it, i) => t.update(invRefs[i], { availableQuantity: FieldValue.increment(-it.quantity), quantity: FieldValue.increment(-it.quantity), updatedAt: ts }));
    } else {
      items.forEach((it, i) => t.update(invRefs[i], { reservedQuantity: FieldValue.increment(-it.quantity), quantity: FieldValue.increment(-it.quantity), updatedAt: ts }));
    }

    if (couponSnap && !couponSnap.empty) t.update(couponSnap.docs[0].ref, { usedCount: FieldValue.increment(1) });

    const subs = subSnap.docs.map((d) => ({ vendorId: d.id, data: d.data(), ref: d.ref }));
    const paymentStatus = proof.type === 'cod' ? 'cod_pending' : 'paid';
    for (const so of subs) {
      t.update(so.ref, {
        status: 'new', orderStatus: 'new', paymentStatus, 'earnings.state': 'pending', confirmedAt: ts, updatedAt: ts,
        statusHistory: FieldValue.arrayUnion({ status: 'new', at: ts, by: 'system', role: 'system', reason: proof.type === 'cod' ? 'COD order confirmed' : 'Payment verified' }),
      });
    }
    bookOrderAllocation(t, { ...order, id: orderId }, subs);
    t.update(orderRef, {
      financialsAllocated: true, financialsAllocatedAt: ts,
      status: ORDER_STATUS.CONFIRMED, orderStatus: ORDER_STATUS.CONFIRMED, paymentStatus,
      paymentReference: proof.paymentRef || null, paymentMode: proof.paymentGroup || proof.type, paidAt: proof.type === 'cod' ? null : ts,
      updatedAt: ts,
      statusHistory: FieldValue.arrayUnion({ status: ORDER_STATUS.CONFIRMED, at: ts, by: 'system', role: 'system', reason: proof.type === 'cod' ? 'Cash on Delivery order confirmed' : `Payment verified (${proof.source || 'cashfree'})` }),
    });
    t.set(db().collection('notification_events').doc(`${orderId}_order_confirmed`), { orderId, type: 'order_confirmed', status: 'queued', phone: order.shippingAddress?.phone || '', userId: order.userId, createdAt: ts }, { merge: true });
    return { allocated: true };
  });

  if (outcome.refundRequired) {
    await initiateRefund({ orderId, vendorIds: null, reason: 'Payment received after stock hold expired; item sold out', actorUid: 'system', restock: false, allowUnallocated: true })
      .catch((e) => console.error(`[allocate] auto-refund failed for ${orderId}`, e));
  }
  if (outcome.allocated) {
    await notifyVendorsOfNewOrder(orderId).catch((e) => console.warn('notify vendors failed', e));
    const { generateOrderConfirmation } = await import('./invoice');
    await generateOrderConfirmation(orderId).catch((e) => console.warn('confirmation document failed', e));
  }
  return outcome;
}

async function notifyVendorsOfNewOrder(orderId: string) {
  const subs = await db().collection('orders').doc(orderId).collection('vendor_orders').get();
  for (const d of subs.docs) {
    const v = await db().collection('vendors').doc(d.id).get();
    const ownerUid = v.data()?.ownerUid || d.id;
    await db().collection('notifications').doc(`${orderId}_${d.id}_new_order`).set({
      userId: ownerUid, vendorId: d.id, type: 'new_order', title: 'New order received',
      message: `Order ${orderId}: ${d.data().items?.length || 0} item(s), ₹${d.data().subtotal}. Please accept it.`,
      orderId, read: false, createdAt: nowIso(),
    });
  }
}

// ---------------------------------------------------------------------------
// Reservation expiry
// ---------------------------------------------------------------------------
export async function releaseReservation(orderId: string, newStatus: string, reason: string, actor = 'system') {
  const orderRef = db().collection('orders').doc(orderId);
  return db().runTransaction(async (t) => {
    const os = await t.get(orderRef);
    if (!os.exists) return false;
    const order = os.data()!;
    if (order.financialsAllocated || order.reservationReleased || order.status !== ORDER_STATUS.AWAITING_PAYMENT) return false;
    const subSnap = await t.get(orderRef.collection('vendor_orders'));
    const ts = nowIso();
    (order.items || []).forEach((it: any) => {
      t.update(db().collection('inventory').doc(it.productId), {
        availableQuantity: FieldValue.increment(it.quantity), reservedQuantity: FieldValue.increment(-it.quantity), updatedAt: ts,
      });
    });
    subSnap.docs.forEach((d) => t.update(d.ref, { status: newStatus, orderStatus: newStatus, updatedAt: ts }));
    t.update(orderRef, {
      reservationReleased: true, status: newStatus, orderStatus: newStatus, updatedAt: ts,
      statusHistory: FieldValue.arrayUnion({ status: newStatus, at: ts, by: actor, role: actor === 'system' ? 'system' : 'customer', reason }),
    });
    return true;
  });
}

export const releaseExpiredReservations = onSchedule({ schedule: 'every 10 minutes', timeZone: 'Asia/Kolkata', region: REGION, secrets: [...CASHFREE_SECRETS] }, async () => {
  const snap = await db().collection('orders')
    .where('status', '==', ORDER_STATUS.AWAITING_PAYMENT)
    .where('reservationExpiresAt', '<=', nowIso())
    .limit(200).get();
  for (const d of snap.docs) {
    const o = d.data();
    try {
      if (o.paymentMethod === 'cashfree' && o.cashfreeOrderCreated) {
        // Never expire an order the customer has actually paid for.
        const cf = await cashfreeRequest('GET', `/orders/${encodeURIComponent(d.id)}`);
        if (cf?.order_status === 'PAID') {
          await allocateOrderFinancials(d.id, { type: 'cashfree', amountPaise: Math.round(Number(cf.order_amount) * 100), source: 'expiry-check' });
          continue;
        }
        if (cf?.order_status === 'ACTIVE') {
          await cashfreeRequest('PATCH', `/orders/${encodeURIComponent(d.id)}`, { order_status: 'TERMINATED' }).catch((e) => {
            console.warn(`[expiry] could not terminate Cashfree order ${d.id}`, e?.message);
          });
        }
      }
      await releaseReservation(d.id, ORDER_STATUS.PAYMENT_EXPIRED, 'Payment not completed within the time limit');
    } catch (e: any) {
      console.error(`[expiry] ${d.id}:`, e instanceof CashfreeApiError ? e.body : e?.message);
    }
  }
});

// ---------------------------------------------------------------------------
// Parent status aggregation
// ---------------------------------------------------------------------------
export function aggregateStatus(subStatuses: string[]): string {
  const live = subStatuses.filter((s) => !['cancelled', 'rejected'].includes(s));
  if (live.length === 0) return ORDER_STATUS.CANCELLED;
  const delivered = live.filter((s) => s === 'delivered').length;
  const shippedOrDone = live.filter((s) => ['shipped', 'delivered', 'rto'].includes(s)).length;
  if (delivered === live.length) return ORDER_STATUS.DELIVERED;
  if (delivered > 0) return ORDER_STATUS.PARTIALLY_DELIVERED;
  if (shippedOrDone === live.length) return ORDER_STATUS.SHIPPED;
  if (shippedOrDone > 0) return ORDER_STATUS.PARTIALLY_SHIPPED;
  if (live.some((s) => ['accepted', 'processing', 'packed'].includes(s))) return ORDER_STATUS.PROCESSING;
  if (live.every((s) => s === ORDER_STATUS.AWAITING_PAYMENT)) return ORDER_STATUS.AWAITING_PAYMENT;
  return ORDER_STATUS.CONFIRMED;
}

export async function recomputeParentStatus(orderId: string) {
  const orderRef = db().collection('orders').doc(orderId);
  await db().runTransaction(async (t) => {
    const os = await t.get(orderRef);
    if (!os.exists) return;
    const subs = await t.get(orderRef.collection('vendor_orders'));
    const next = aggregateStatus(subs.docs.map((d) => String(d.data().status || '')));
    const cur = os.data()!.status;
    if (next !== cur) {
      const ts = nowIso();
      t.update(orderRef, { status: next, orderStatus: next, updatedAt: ts, statusHistory: FieldValue.arrayUnion({ status: next, at: ts, by: 'system', role: 'system', reason: 'Updated from seller shipments' }) });
    }
  });
}

// ---------------------------------------------------------------------------
// Refunds (full order or specific vendors) — idempotent
// ---------------------------------------------------------------------------
export interface RefundRequest { orderId: string; vendorIds: string[] | null; reason: string; actorUid: string; restock: boolean; allowUnallocated?: boolean; markAs?: 'cancelled' | 'rejected' }

function refundIdFor(orderId: string, vendorIds: string[] | null): string {
  const scope = vendorIds && vendorIds.length ? [...vendorIds].sort().join(',') : 'ALL';
  const h = crypto.createHash('sha256').update(`${orderId}|${scope}`).digest('hex').slice(0, 10).toUpperCase();
  return `RF${orderId.replace(/[^A-Z0-9]/gi, '').slice(-12)}${h}`.slice(0, 40);
}

export async function initiateRefund(req: RefundRequest): Promise<{ refundId: string; status: string; amountPaise: number }> {
  const { orderId } = req;
  const refundId = refundIdFor(orderId, req.vendorIds);
  const orderRef = db().collection('orders').doc(orderId);
  const refundRef = db().collection('refunds').doc(refundId);

  const prepared = await db().runTransaction(async (t) => {
    const rs = await t.get(refundRef);
    if (rs.exists) return { existing: rs.data()! };
    const os = await t.get(orderRef);
    if (!os.exists) throw new HttpsError('not-found', 'Order not found.');
    const order = os.data()!;
    if (!order.financialsAllocated && !req.allowUnallocated) throw new HttpsError('failed-precondition', 'This order has not been paid/confirmed yet.');
    const subSnap = await t.get(orderRef.collection('vendor_orders'));
    const subs = subSnap.docs.map((d) => ({ id: d.id, ref: d.ref, data: d.data() }));
    const closed = (s: any) => ['cancelled', 'rejected'].includes(String(s.data.status)) || s.data.earnings?.state === 'reversed';
    const targets = subs.filter((s) => !closed(s) && (!req.vendorIds || req.vendorIds.includes(s.id)));
    if (targets.length === 0 && !req.allowUnallocated) throw new HttpsError('failed-precondition', 'Nothing left to refund on this order.');
    const remainingAfter = subs.filter((s) => !closed(s) && !targets.includes(s));
    const includeShipping = remainingAfter.length === 0 && !order.shippingRefunded;
    const restockItems: Array<{ productId: string; quantity: number }> = [];
    for (const s of targets) {
      const notShipped = !['shipped', 'delivered', 'rto'].includes(String(s.data.status));
      if (req.restock && notShipped && order.financialsAllocated) (s.data.items || []).forEach((it: any) => restockItems.push({ productId: it.productId, quantity: it.quantity }));
    }
    const productAmount = req.allowUnallocated && !order.financialsAllocated
      ? order.totalAmountPaise - (order.shippingAmountPaise || 0)
      : targets.reduce((sum, s) => sum + (s.data.customerPaidPaise || 0), 0);
    const amountPaise = productAmount + (includeShipping ? order.shippingAmountPaise || 0 : 0);
    const onlinePaid = order.paymentStatus === 'paid' || order.paymentStatus === 'partially_refunded';
    const ts = nowIso();

    // writes
    for (const s of targets) {
      bookSubOrderReversal(t, refundId, orderId, s.id, s.data, (s.data.earnings?.state || 'none') as EarningsState);
      const st = req.markAs || 'cancelled';
      t.update(s.ref, {
        status: st, orderStatus: st, 'earnings.state': 'reversed', refundId, cancellationReason: req.reason, updatedAt: ts,
        statusHistory: FieldValue.arrayUnion({ status: st, at: ts, by: req.actorUid, role: req.actorUid === 'system' ? 'system' : 'staff', reason: req.reason }),
      });
    }
    restockItems.forEach((it) => t.update(db().collection('inventory').doc(it.productId), { availableQuantity: FieldValue.increment(it.quantity), quantity: FieldValue.increment(it.quantity), updatedAt: ts }));
    if (includeShipping && order.financialsAllocated) bookShippingReversal(t, refundId, orderId, order.shippingAmountPaise || 0);
    if (onlinePaid && amountPaise > 0) bookCustomerRefund(t, refundId, orderId, amountPaise);

    const fullyClosed = remainingAfter.length === 0;
    const orderUpdate: Record<string, any> = { updatedAt: ts, refundIds: FieldValue.arrayUnion(refundId) };
    if (includeShipping) orderUpdate.shippingRefunded = true;
    if (onlinePaid) orderUpdate.paymentStatus = fullyClosed ? 'refunded' : 'partially_refunded';
    if (fullyClosed) {
      orderUpdate.status = ORDER_STATUS.CANCELLED; orderUpdate.orderStatus = ORDER_STATUS.CANCELLED;
      orderUpdate.cancelledAt = ts; orderUpdate.cancellationReason = req.reason;
      orderUpdate.statusHistory = FieldValue.arrayUnion({ status: ORDER_STATUS.CANCELLED, at: ts, by: req.actorUid, role: 'staff', reason: req.reason });
    }
    t.update(orderRef, orderUpdate);
    const refundDoc = {
      refundId, orderId, userId: order.userId, vendorIds: targets.map((s) => s.id), amountPaise, amount: rupees(amountPaise),
      includesShipping: includeShipping, reason: req.reason, requestedBy: req.actorUid,
      status: onlinePaid && amountPaise > 0 ? 'pending_initiation' : 'not_required',
      gateway: onlinePaid ? 'cashfree' : (order.paymentMethod === 'cod' ? 'cod' : 'none'),
      createdAt: ts, updatedAt: ts,
    };
    t.set(refundRef, refundDoc);
    return { created: refundDoc };
  });

  const doc: any = prepared.existing || prepared.created;
  if (doc.status === 'pending_initiation' || doc.status === 'initiation_failed') {
    await callCashfreeRefund(refundId);
    const fresh = (await refundRef.get()).data()!;
    await recomputeParentStatus(orderId).catch(() => undefined);
    return { refundId, status: fresh.status, amountPaise: fresh.amountPaise };
  }
  await recomputeParentStatus(orderId).catch(() => undefined);
  return { refundId, status: doc.status, amountPaise: doc.amountPaise };
}

export async function callCashfreeRefund(refundId: string) {
  const ref = db().collection('refunds').doc(refundId);
  const r = (await ref.get()).data();
  if (!r || !['pending_initiation', 'initiation_failed'].includes(r.status)) return;
  try {
    const res = await cashfreeRequest('POST', `/orders/${encodeURIComponent(r.orderId)}/refunds`, {
      refund_amount: rupees(r.amountPaise), refund_id: refundId, refund_note: String(r.reason || 'BioCart refund').slice(0, 100),
    }, refundId);
    await ref.update({ status: mapRefundStatus(res?.refund_status), cfRefundId: res?.cf_refund_id || null, gatewayResponse: { status: res?.refund_status || null, arn: res?.refund_arn || null }, updatedAt: nowIso() });
  } catch (e: any) {
    // Cashfree returns 409 when the refund_id already exists → fetch its real status.
    if (e instanceof CashfreeApiError && e.status === 409) {
      const res = await cashfreeRequest('GET', `/orders/${encodeURIComponent(r.orderId)}/refunds/${encodeURIComponent(refundId)}`).catch(() => null);
      if (res) { await ref.update({ status: mapRefundStatus(res.refund_status), cfRefundId: res.cf_refund_id || null, updatedAt: nowIso() }); return; }
    }
    const msg = e instanceof CashfreeApiError ? JSON.stringify(e.body).slice(0, 300) : String(e?.message || e).slice(0, 300);
    await ref.update({ status: 'initiation_failed', lastError: msg, attempts: FieldValue.increment(1), updatedAt: nowIso() });
    console.error(`[refund] ${refundId} failed:`, msg);
  }
}

export function mapRefundStatus(s: any): string {
  const v = String(s || '').toUpperCase();
  if (v === 'SUCCESS') return 'success';
  if (v === 'CANCELLED' || v === 'FAILED') return 'failed';
  if (v === 'ONHOLD') return 'on_hold';
  return 'processing';
}

// ---------------------------------------------------------------------------
// Callables: customer cancel, admin order actions, vendor lifecycle
// ---------------------------------------------------------------------------
export const cancelOrder = onCall({ region: REGION, secrets: [...CASHFREE_SECRETS] }, async (request) => {
  const caller = await getCaller(request.auth);
  const orderId = String(request.data?.orderId || '');
  const reason = String(request.data?.reason || 'Cancelled by customer').slice(0, 200);
  const os = await db().collection('orders').doc(orderId).get();
  if (!os.exists) throw new HttpsError('not-found', 'Order not found.');
  const order = os.data()!;
  const admin = isAdminCaller(caller);
  if (order.userId !== caller.uid && !admin) throw new HttpsError('permission-denied', 'You cannot cancel this order.');
  if (order.status === ORDER_STATUS.AWAITING_PAYMENT) {
    await releaseReservation(orderId, ORDER_STATUS.CANCELLED, reason, caller.uid);
    return { success: true, orderId, status: ORDER_STATUS.CANCELLED, refund: null };
  }
  const subs = await os.ref.collection('vendor_orders').get();
  const blocked = subs.docs.some((d) => ['packed', 'shipped', 'delivered', 'rto'].includes(String(d.data().status)));
  if (blocked && !admin) throw new HttpsError('failed-precondition', 'This order is already packed or shipped and can no longer be cancelled. Please contact support.');
  if (!order.financialsAllocated) throw new HttpsError('failed-precondition', `This order cannot be cancelled in status "${order.status}".`);
  const refund = await initiateRefund({ orderId, vendorIds: null, reason, actorUid: caller.uid, restock: true });
  if (admin) await audit(caller.uid, 'order_cancelled', 'order', orderId, { reason, refund });
  return { success: true, orderId, status: ORDER_STATUS.CANCELLED, refund };
});

export const processOrderRefund = onCall({ region: REGION, secrets: [...CASHFREE_SECRETS] }, async (request) => {
  const caller = await requireAdmin(request.auth);
  const orderId = String(request.data?.orderId || '');
  const vendorId = request.data?.vendorId ? String(request.data.vendorId) : null;
  const reason = String(request.data?.reason || '').trim().slice(0, 200);
  if (!orderId || reason.length < 3) throw new HttpsError('invalid-argument', 'Order and a refund reason are required.');
  const refund = await initiateRefund({ orderId, vendorIds: vendorId ? [vendorId] : null, reason, actorUid: caller.uid, restock: request.data?.restock !== false });
  await audit(caller.uid, 'refund_initiated', 'order', orderId, { vendorId, reason, refund });
  return { success: true, ...refund };
});

export const retryRefund = onCall({ region: REGION, secrets: [...CASHFREE_SECRETS] }, async (request) => {
  const caller = await requireAdmin(request.auth);
  const refundId = String(request.data?.refundId || '');
  await callCashfreeRefund(refundId);
  const r = (await db().collection('refunds').doc(refundId).get()).data();
  await audit(caller.uid, 'refund_retried', 'refund', refundId, { status: r?.status });
  return { success: true, status: r?.status || 'unknown' };
});

/** Admin: the only manual parent-status action is cancel (+refund). Everything else is derived. */
export const updateOrderStatus = onCall({ region: REGION, secrets: [...CASHFREE_SECRETS] }, async (request) => {
  const caller = await requireAdmin(request.auth);
  const { orderId, newStatus } = request.data || {};
  const reason = String(request.data?.reason || 'Cancelled by BioCart admin').slice(0, 200);
  if (String(newStatus).toLowerCase() !== 'cancelled') {
    throw new HttpsError('failed-precondition', 'Order status follows the sellers\' shipments automatically. Use the seller sub-order actions, or Cancel & Refund.');
  }
  const os = await db().collection('orders').doc(String(orderId)).get();
  if (!os.exists) throw new HttpsError('not-found', 'Order not found.');
  if (os.data()!.status === ORDER_STATUS.AWAITING_PAYMENT) {
    await releaseReservation(os.id, ORDER_STATUS.CANCELLED, reason, caller.uid);
    await audit(caller.uid, 'order_cancelled_unpaid', 'order', os.id, { reason });
    return { success: true, orderId: os.id, status: ORDER_STATUS.CANCELLED };
  }
  const refund = await initiateRefund({ orderId: os.id, vendorIds: null, reason, actorUid: caller.uid, restock: true });
  await audit(caller.uid, 'order_cancelled', 'order', os.id, { reason, refund });
  return { success: true, orderId: os.id, status: ORDER_STATUS.CANCELLED, refund };
});

const VENDOR_TRANSITIONS: Record<string, string[]> = {
  new: ['accepted', 'rejected'],
  accepted: ['processing', 'rejected'],
  processing: ['packed'],
  packed: [],          // → shipped only through createEkartShipment
  shipped: [],         // → delivered only through verified EKART events
};

export const updateVendorOrderStatus = onCall({ region: REGION, secrets: [...CASHFREE_SECRETS] }, async (request) => {
  const caller = await getCaller(request.auth);
  const orderId = String(request.data?.orderId || '');
  const vendorId = String(request.data?.vendorId || '');
  const next = String(request.data?.newStatus || '').toLowerCase();
  const admin = isAdminCaller(caller);
  if (!admin && !(await callerOwnsVendor(caller, vendorId))) throw new HttpsError('permission-denied', 'This order does not belong to your store.');
  const ref = db().collection('orders').doc(orderId).collection('vendor_orders').doc(vendorId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Order not found for this store.');
  const so = snap.data()!;
  const cur = String(so.status || '');
  if (cur === next) return { success: true, orderId, vendorId, status: cur, unchanged: true };
  if (next === 'shipped') {
    if (so.awbNumber) return { success: true, orderId, vendorId, status: cur };
    throw new HttpsError('failed-precondition', 'Book the EKART shipment first — the order is marked shipped automatically when EKART gives a tracking number.');
  }
  if (next === 'delivered') throw new HttpsError('failed-precondition', 'Delivery is confirmed only by EKART tracking.');
  if (!(VENDOR_TRANSITIONS[cur] || []).includes(next)) throw new HttpsError('failed-precondition', `An order in "${cur}" cannot move to "${next}".`);

  if (next === 'rejected') {
    const reason = String(request.data?.rejectionReason || '').trim().slice(0, 200);
    if (reason.length < 3) throw new HttpsError('invalid-argument', 'Please give a reason for rejecting the order.');
    const refund = await initiateRefund({ orderId, vendorIds: [vendorId], reason: `Seller rejected: ${reason}`, actorUid: caller.uid, restock: true, markAs: 'rejected' });
    await ref.update({ rejectionReason: reason });
    return { success: true, orderId, vendorId, status: 'rejected', refund };
  }
  const ts = nowIso();
  await db().runTransaction(async (t) => {
    const fresh = await t.get(ref);
    if (String(fresh.data()?.status) !== cur) throw new HttpsError('aborted', 'This order was just updated. Please refresh.');
    t.update(ref, {
      status: next, orderStatus: next, updatedAt: ts, [`${next}At`]: ts,
      ...(next === 'packed' ? { shipmentStatus: 'packed' } : {}),
      statusHistory: FieldValue.arrayUnion({ status: next, at: ts, by: caller.uid, role: admin ? 'admin' : 'vendor' }),
    });
  });
  await recomputeParentStatus(orderId);
  return { success: true, orderId, vendorId, status: next };
});

// ---------------------------------------------------------------------------
// Delivery → earnings eligibility (called by EKART sync and the admin exception tool)
// ---------------------------------------------------------------------------
export async function markSubOrderDelivered(orderId: string, vendorId: string, deliveredAtIso: string, source: string) {
  const policy = await loadPolicy();
  const orderRef = db().collection('orders').doc(orderId);
  const ref = orderRef.collection('vendor_orders').doc(vendorId);
  const changed = await db().runTransaction(async (t) => {
    const [os, ss] = await Promise.all([t.get(orderRef), t.get(ref)]);
    if (!os.exists || !ss.exists) return false;
    const so = ss.data()!;
    if (so.status === 'delivered' || ['cancelled', 'rejected'].includes(String(so.status))) return false;
    const order = os.data()!;
    const ts = nowIso();
    const eligibleAt = new Date(new Date(deliveredAtIso).getTime() + policy.payoutHoldDaysAfterDelivery * 86400_000).toISOString();
    const waitCod = order.paymentMethod === 'cod' && order.codRemitted !== true;
    const update: Record<string, any> = {
      status: 'delivered', orderStatus: 'delivered', shipmentStatus: 'delivered', deliveredAt: deliveredAtIso, updatedAt: ts,
      statusHistory: FieldValue.arrayUnion({ status: 'delivered', at: ts, by: source, role: 'system' }),
    };
    if (so.earnings?.state === 'pending') {
      if (waitCod) {
        update['earnings.state'] = 'awaiting_cod_remittance';
      } else {
        update['earnings.state'] = 'eligible';
        update['earnings.eligibleAt'] = eligibleAt;
        bookEarningsEligible(t, orderId, vendorId, so.vendorPayablePaise || 0);
      }
    }
    t.update(ref, update);
    return true;
  });
  if (changed) await recomputeParentStatus(orderId);
  return changed;
}

export const adminMarkDelivered = onCall({ region: REGION }, async (request) => {
  const caller = await requireAdmin(request.auth);
  const { orderId, vendorId } = request.data || {};
  const reason = String(request.data?.reason || '').trim();
  if (reason.length < 10) throw new HttpsError('invalid-argument', 'Write the reason and evidence (e.g. courier POD reference) — at least 10 characters.');
  const so = await db().collection('orders').doc(String(orderId)).collection('vendor_orders').doc(String(vendorId)).get();
  if (!so.exists || so.data()!.status !== 'shipped') throw new HttpsError('failed-precondition', 'Only a shipped seller order can be marked delivered.');
  const ok = await markSubOrderDelivered(String(orderId), String(vendorId), nowIso(), `admin:${caller.uid}`);
  await audit(caller.uid, 'manual_delivery_confirmation', 'vendor_order', `${orderId}/${vendorId}`, { reason });
  return { success: ok };
});

export const markCodRemitted = onCall({ region: REGION }, async (request) => {
  const caller = await requireAdmin(request.auth);
  const orderId = String(request.data?.orderId || '');
  const reference = String(request.data?.reference || '').trim();
  if (!reference) throw new HttpsError('invalid-argument', 'Enter the EKART COD remittance reference.');
  const orderRef = db().collection('orders').doc(orderId);
  await db().runTransaction(async (t) => {
    const os = await t.get(orderRef);
    if (!os.exists || os.data()!.paymentMethod !== 'cod') throw new HttpsError('failed-precondition', 'Not a COD order.');
    const subs = await t.get(orderRef.collection('vendor_orders'));
    const ts = nowIso();
    for (const d of subs.docs) {
      const so = d.data();
      if (so.earnings?.state === 'awaiting_cod_remittance') {
        bookEarningsEligible(t, orderId, d.id, so.vendorPayablePaise || 0);
        t.update(d.ref, { 'earnings.state': 'eligible', 'earnings.eligibleAt': ts, updatedAt: ts });
      }
    }
    t.update(orderRef, { codRemitted: true, codRemittanceReference: reference, codRemittedAt: ts, paymentStatus: 'paid', updatedAt: ts });
  });
  await audit(caller.uid, 'cod_remitted', 'order', orderId, { reference });
  return { success: true };
});
