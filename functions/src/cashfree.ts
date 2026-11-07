/**
 * Cashfree Payments — customer payment lifecycle.
 *   createCashfreeOrder   – creates (or reuses) the Cashfree order for a BioCart order and
 *                           returns the real payment_session_id. Amount always comes from
 *                           the saved server-side order.
 *   verifyCashfreePayment – asks Cashfree for the order status; books money only if PAID.
 *   cashfreePaymentWebhook– signed webhook (payments + refunds); idempotent.
 *   syncPendingRefunds    – hourly refund status poll.
 *   reconcileGatewayFees  – daily: books the ACTUAL Cashfree fee against BioCart's share.
 */
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { db, REGION, CASHFREE_SECRETS, getCaller, nowIso, rupees, ORDER_STATUS } from './core';
import { cashfreeConfig, cashfreeRequest, CashfreeApiError, verifyCashfreeSignature } from './cashfreeApi';
import { allocateOrderFinancials, mapRefundStatus } from './orders';
import { bookGatewayFee } from './ledger';

const SITE_URL = process.env.PUBLIC_SITE_URL || 'https://biocart.in';
const WEBHOOK_URL = process.env.CASHFREE_WEBHOOK_URL || 'https://asia-southeast1-bio-cart.cloudfunctions.net/cashfreePaymentWebhook';

async function loadOwnOrder(orderId: string, uid: string) {
  if (!/^[A-Za-z0-9_-]{3,64}$/.test(orderId)) throw new HttpsError('invalid-argument', 'Invalid order.');
  const snap = await db().collection('orders').doc(orderId).get();
  if (!snap.exists) throw new HttpsError('not-found', 'Order not found.');
  const o = snap.data()!;
  if (o.userId !== uid) throw new HttpsError('permission-denied', 'This order belongs to another account.');
  return { ref: snap.ref, order: o };
}

function sessionFromCashfreeOrder(cf: any) {
  return { paymentSessionId: cf?.payment_session_id || null, cfOrderStatus: cf?.order_status || null, orderAmount: cf?.order_amount };
}

export const createCashfreeOrder = onCall({ region: REGION, secrets: CASHFREE_SECRETS }, async (request) => {
  const caller = await getCaller(request.auth);
  const { ref, order } = await loadOwnOrder(String(request.data?.orderId || ''), caller.uid);
  const cfg = cashfreeConfig();
  const env = cfg.env;

  if (order.paymentMethod !== 'cashfree') throw new HttpsError('failed-precondition', 'This order is not an online-payment order.');
  if (order.financialsAllocated || order.paymentStatus === 'paid') return { success: true, alreadyPaid: true, orderId: ref.id, environment: env };
  if (order.status !== ORDER_STATUS.AWAITING_PAYMENT) throw new HttpsError('failed-precondition', 'This order can no longer be paid. Please place a new order.');
  if (order.reservationExpiresAt && order.reservationExpiresAt < nowIso()) throw new HttpsError('deadline-exceeded', 'The payment time for this order has expired. Please place the order again.');

  const amount = rupees(order.totalAmountPaise);
  if (!(amount >= 1)) throw new HttpsError('failed-precondition', 'Invalid order amount.');

  // Re-use an existing Cashfree order (retry / second tab) instead of creating a second charge.
  if (order.cashfreeOrderCreated) {
    const cf = await cashfreeRequest('GET', `/orders/${encodeURIComponent(ref.id)}`);
    if (cf?.order_status === 'PAID') {
      await allocateOrderFinancials(ref.id, { type: 'cashfree', amountPaise: Math.round(Number(cf.order_amount) * 100), source: 'create-recheck' });
      return { success: true, alreadyPaid: true, orderId: ref.id, environment: env };
    }
    if (cf?.order_status === 'ACTIVE' && cf?.payment_session_id) {
      return { success: true, orderId: ref.id, orderAmount: amount, currency: 'INR', paymentSessionId: cf.payment_session_id, environment: env };
    }
    throw new HttpsError('failed-precondition', 'This payment session has expired. Please place the order again.');
  }

  const phone = order.shippingAddress?.phone;
  const email = order.customerEmail || caller.email || '';
  if (!phone) throw new HttpsError('failed-precondition', 'A valid mobile number is required for payment.');
  const expiry = new Date(Math.max(Date.parse(order.reservationExpiresAt || '') || 0, Date.now() + 16 * 60_000));
  const payload: any = {
    order_id: ref.id,
    order_amount: amount,
    order_currency: 'INR',
    customer_details: {
      customer_id: caller.uid.slice(0, 50),
      customer_phone: phone,
      customer_name: String(order.shippingAddress?.name || '').slice(0, 100) || undefined,
      ...(email ? { customer_email: email } : {}),
    },
    order_meta: {
      return_url: `${SITE_URL}/dashboard?subView=orders&orderId={order_id}`,
      notify_url: WEBHOOK_URL,
    },
    order_expiry_time: expiry.toISOString(),
    order_note: `BioCart order ${ref.id}`,
  };
  let cf: any;
  try {
    cf = await cashfreeRequest('POST', '/orders', payload);
  } catch (e: any) {
    if (e instanceof CashfreeApiError && e.status === 409) {
      cf = await cashfreeRequest('GET', `/orders/${encodeURIComponent(ref.id)}`); // already exists → reuse
    } else {
      console.error('[Cashfree] create order failed', e instanceof CashfreeApiError ? e.body : e?.message);
      throw new HttpsError('unavailable', 'Could not start the payment. Please try again in a moment.');
    }
  }
  const s = sessionFromCashfreeOrder(cf);
  if (!s.paymentSessionId) throw new HttpsError('unavailable', 'Payment gateway did not return a session. Please try again.');
  await ref.update({ cashfreeOrderCreated: true, cfOrderId: cf?.cf_order_id || null, paymentGateway: 'cashfree', cashfreeEnvironment: env, updatedAt: nowIso() });
  return { success: true, orderId: ref.id, orderAmount: amount, currency: 'INR', paymentSessionId: s.paymentSessionId, environment: env };
});

/** Checks Cashfree for the real status and books money if (and only if) the order is PAID. */
export async function syncOrderPaymentFromCashfree(orderId: string, source: string) {
  const cf = await cashfreeRequest('GET', `/orders/${encodeURIComponent(orderId)}`);
  const status = String(cf?.order_status || '');
  if (status === 'PAID') {
    let paymentRef: string | null = null; let group: string | null = null;
    try {
      const pays = await cashfreeRequest('GET', `/orders/${encodeURIComponent(orderId)}/payments`);
      const ok = Array.isArray(pays) ? pays.find((p: any) => p.payment_status === 'SUCCESS') : null;
      paymentRef = ok?.cf_payment_id ? String(ok.cf_payment_id) : null; group = ok?.payment_group || null;
    } catch { /* payment detail is optional */ }
    const r = await allocateOrderFinancials(orderId, { type: 'cashfree', amountPaise: Math.round(Number(cf.order_amount) * 100), paymentRef, paymentGroup: group, source });
    return { status: 'PAID', ...r };
  }
  return { status: status || 'UNKNOWN' };
}

export const verifyCashfreePayment = onCall({ region: REGION, secrets: CASHFREE_SECRETS }, async (request) => {
  const caller = await getCaller(request.auth);
  const { ref, order } = await loadOwnOrder(String(request.data?.orderId || ''), caller.uid);
  if (order.financialsAllocated) return { success: true, orderId: ref.id, orderStatus: 'PAID', paymentStatus: 'SUCCESS' };
  if (!order.cashfreeOrderCreated) return { success: false, orderId: ref.id, orderStatus: 'NOT_STARTED', paymentStatus: 'PENDING' };
  try {
    const r = await syncOrderPaymentFromCashfree(ref.id, 'verify');
    const fresh = (await ref.get()).data()!;
    const paid = fresh.financialsAllocated === true;
    return {
      success: paid, orderId: ref.id, orderStatus: r.status,
      paymentStatus: paid ? 'SUCCESS' : (r.status === 'PAID' ? 'REVIEW' : 'PENDING'),
      message: !paid && r.status === 'PAID' ? 'Payment received — we are confirming your order. You will see it in My Orders shortly.' : undefined,
    };
  } catch (e: any) {
    console.error('[Cashfree] verify failed', e instanceof CashfreeApiError ? e.body : e?.message);
    throw new HttpsError('unavailable', 'Could not confirm the payment status right now. If money was debited, your order will update automatically within a few minutes.');
  }
});

export const cashfreePaymentWebhook = onRequest({ region: REGION, secrets: CASHFREE_SECRETS }, async (req, res) => {
  if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }
  const rawBody = (req as any).rawBody ? (req as any).rawBody.toString('utf8') : '';
  let secretKey = '';
  try { secretKey = cashfreeConfig().secretKey; } catch { res.status(500).send('not configured'); return; }
  const check = verifyCashfreeSignature(rawBody, req.get('x-webhook-signature') || undefined, req.get('x-webhook-timestamp') || undefined, secretKey);
  if (!check.ok) { console.warn('[Cashfree webhook] rejected:', check.reason); res.status(401).send('Unauthorized'); return; }

  const body = req.body || {};
  const type = String(body.type || '');
  const orderId = String(body?.data?.order?.order_id || body?.data?.refund?.order_id || '');
  const eventId = `${type}_${orderId}_${body?.data?.payment?.cf_payment_id || body?.data?.refund?.cf_refund_id || body?.data?.refund?.refund_id || ''}_${body?.event_time || ''}`.replace(/[\/\s]/g, '_').slice(0, 400);
  const eventRef = db().collection('payment_webhook_events').doc(eventId);
  try {
    await eventRef.create({ eventId, type, orderId, receivedAt: nowIso(), status: 'processing', payload: { payment: body?.data?.payment || null, refund: body?.data?.refund || null } });
  } catch {
    const prev = await eventRef.get();
    if (prev.data()?.status === 'processed') { res.status(200).json({ status: 'duplicate' }); return; }
  }
  try {
    if (!orderId) throw new Error('missing order id');
    if (type.startsWith('PAYMENT_SUCCESS')) {
      // Never trust the webhook body for money: re-read the order from Cashfree.
      await syncOrderPaymentFromCashfree(orderId, 'webhook');
    } else if (type.startsWith('PAYMENT_FAILED') || type.startsWith('PAYMENT_USER_DROPPED')) {
      await db().collection('orders').doc(orderId).set({
        lastPaymentAttempt: { status: type.startsWith('PAYMENT_FAILED') ? 'failed' : 'dropped', at: nowIso(), message: body?.data?.payment?.payment_message || null },
        updatedAt: nowIso(),
      }, { merge: true });
    } else if (type.startsWith('REFUND')) {
      const refundId = String(body?.data?.refund?.refund_id || '');
      if (refundId) {
        await db().collection('refunds').doc(refundId).set({ status: mapRefundStatus(body?.data?.refund?.refund_status), cfRefundId: body?.data?.refund?.cf_refund_id || null, updatedAt: nowIso() }, { merge: true });
      }
    }
    await eventRef.set({ status: 'processed', processedAt: nowIso() }, { merge: true });
    res.status(200).json({ status: 'ok' });
  } catch (e: any) {
    await eventRef.set({ status: 'failed', error: String(e?.message || e).slice(0, 300) }, { merge: true });
    console.error('[Cashfree webhook] processing failed', e?.message);
    res.status(500).json({ status: 'retry' }); // Cashfree retries; the event is processed idempotently
  }
});

export const syncPendingRefunds = onSchedule({ schedule: 'every 60 minutes', region: REGION, secrets: CASHFREE_SECRETS }, async () => {
  const snap = await db().collection('refunds').where('status', 'in', ['processing', 'on_hold', 'initiation_failed']).limit(100).get();
  for (const d of snap.docs) {
    const r = d.data();
    try {
      if (r.status === 'initiation_failed') {
        if ((r.attempts || 0) < 5) { const { callCashfreeRefund } = await import('./orders'); await callCashfreeRefund(d.id); }
        continue;
      }
      const res = await cashfreeRequest('GET', `/orders/${encodeURIComponent(r.orderId)}/refunds/${encodeURIComponent(d.id)}`);
      await d.ref.update({ status: mapRefundStatus(res?.refund_status), updatedAt: nowIso() });
    } catch (e: any) {
      console.warn(`[refund sync] ${d.id}`, e instanceof CashfreeApiError ? e.body : e?.message);
    }
  }
});

/**
 * R2: book the ACTUAL gateway fee. Uses Cashfree's PG settlement reconciliation API.
 * Orders that are not yet in a settlement stay "pending_reconciliation".
 */
export const reconcileGatewayFees = onSchedule({ schedule: '30 6 * * *', timeZone: 'Asia/Kolkata', region: REGION, secrets: CASHFREE_SECRETS }, async () => {
  const end = new Date();
  const start = new Date(end.getTime() - 7 * 86400_000);
  let cursor: string | null = null;
  for (let page = 0; page < 20; page++) {
    let res: any;
    try {
      res = await cashfreeRequest('POST', '/settlement/recon', {
        pagination: { limit: 200, ...(cursor ? { cursor } : {}) },
        filters: { start_date: start.toISOString(), end_date: end.toISOString() },
      });
    } catch (e: any) {
      console.error('[fee recon] Cashfree recon API failed', e instanceof CashfreeApiError ? e.body : e?.message);
      return;
    }
    const rows: any[] = Array.isArray(res?.data) ? res.data : [];
    for (const row of rows) {
      const orderId = String(row.order_id || '');
      const type = String(row.event_type || '').toUpperCase();
      if (!orderId || (type && type !== 'PAYMENT')) continue;
      const fee = Math.round(Number(row.service_charge || 0) * 100);
      const tax = Math.round(Number(row.service_tax || 0) * 100);
      const orderRef = db().collection('orders').doc(orderId);
      await db().runTransaction(async (t) => {
        const os = await t.get(orderRef);
        if (!os.exists || os.data()!.financialSummary?.gatewayFeeStatus === 'reconciled') return;
        bookGatewayFee(t, orderId, fee, tax, { settlementId: row.cf_settlement_id || null, utr: row.settlement_utr || null });
        t.update(orderRef, {
          'financialSummary.gatewayFeePaise': fee + tax, 'financialSummary.gatewayFeeStatus': 'reconciled',
          'financialSummary.biocartNetPaise': (os.data()!.financialSummary?.totalPlatformCommissionPaise || 0) + (os.data()!.shippingAmountPaise || 0) - (os.data()!.financialSummary?.platformCouponSubsidyPaise || 0) - fee - tax,
          updatedAt: nowIso(),
        });
      }).catch((e) => console.warn(`[fee recon] ${orderId}`, e?.message));
    }
    cursor = res?.cursor || null;
    if (!cursor || rows.length === 0) break;
  }
});


