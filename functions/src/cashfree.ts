import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import crypto from 'crypto';

const db = getFirestore();

export const cashfreeAppId = defineSecret('CASHFREE_APP_ID');
export const cashfreeSecretKey = defineSecret('CASHFREE_SECRET_KEY');
export const cashfreeEnvironment = defineSecret('CASHFREE_ENVIRONMENT');

export interface CashfreeCredentials {
  appId: string;
  secretKey: string;
  env: 'SANDBOX' | 'PRODUCTION';
  apiVersion: string;
}

export function getCashfreeCredentials(): CashfreeCredentials {
  let appId = '';
  try {
    appId = cashfreeAppId.value() || '';
  } catch {
    appId = process.env.CASHFREE_APP_ID || '';
  }

  let secretKey = '';
  try {
    secretKey = cashfreeSecretKey.value() || '';
  } catch {
    secretKey = process.env.CASHFREE_SECRET_KEY || '';
  }

  let envStr = 'SANDBOX';
  try {
    envStr = cashfreeEnvironment.value() || process.env.CASHFREE_ENVIRONMENT || 'SANDBOX';
  } catch {
    envStr = process.env.CASHFREE_ENVIRONMENT || 'SANDBOX';
  }

  const env = envStr.toUpperCase() === 'PRODUCTION' ? 'PRODUCTION' : 'SANDBOX';
  return {
    appId: appId.trim(),
    secretKey: secretKey.trim(),
    env,
    apiVersion: '2023-08-01'
  };
}

/**
 * 1. createCashfreeOrder — Secure server-side payment order & session creation
 * Strict Rules:
 * - Fetches authoritative order from Firestore to derive amount (never trusts client amount)
 * - Verifies authenticated user matches order.userId
 * - Prevents duplicate session creation if order already paid
 */
export const createCashfreeOrder = onCall(
  {
    region: 'asia-southeast1',
    secrets: [cashfreeAppId, cashfreeSecretKey, cashfreeEnvironment]
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be signed in to initiate checkout.');
    }

    const { orderId, customerPhone, customerEmail, customerName } = request.data || {};
    if (!orderId || typeof orderId !== 'string') {
      throw new HttpsError('invalid-argument', 'Valid orderId is required.');
    }

    // Read authoritative order document from database
    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      throw new HttpsError('not-found', `Order ${orderId} does not exist.`);
    }

    const orderData = orderDoc.data()!;
    if (orderData.userId !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'You are not authorized to pay for this order.');
    }

    if (orderData.paymentStatus === 'paid') {
      throw new HttpsError('failed-precondition', 'This order has already been paid.');
    }

    // Authoritative amount in Rupees from server calculation
    const authoritativeAmount = typeof orderData.totalAmount === 'number'
      ? Number(orderData.totalAmount.toFixed(2))
      : Number((Number(orderData.totalAmountPaise || 0) / 100).toFixed(2));

    if (!authoritativeAmount || authoritativeAmount <= 0) {
      throw new HttpsError('failed-precondition', 'Invalid order total amount.');
    }

    const creds = getCashfreeCredentials();
    if (!creds.appId || !creds.secretKey) {
      console.error('[Cashfree] Gateway credentials missing.');
      throw new HttpsError('failed-precondition', 'Cashfree payment gateway credentials are not configured.');
    }

    // Dynamic base URL based on environment (SANDBOX vs PRODUCTION)
    const baseUrl = creds.env === 'PRODUCTION' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';
    const url = `${baseUrl}/orders`;
    const payload = {
      order_id: orderId,
      order_amount: authoritativeAmount,
      order_currency: 'INR',
      customer_details: {
        customer_id: request.auth.uid,
        customer_phone: customerPhone || orderData.shippingAddress?.phone || '9999999999',
        customer_email: customerEmail || orderData.customerEmail || 'customer@biocart.in',
        customer_name: customerName || orderData.shippingAddress?.name || 'BioCart Customer'
      },
      order_meta: {
        return_url: 'https://biocart.in/dashboard?subView=orders&orderId={order_id}',
        notify_url: 'https://asia-southeast1-bio-cart.cloudfunctions.net/cashfreePaymentWebhook'
      }
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': creds.appId,
          'x-client-secret': creds.secretKey,
          'x-api-version': creds.apiVersion
        },
        body: JSON.stringify(payload)
      });

      const resData: any = await response.json();
      if (!response.ok) {
        console.error('[Cashfree] Order creation error:', resData);
        throw new HttpsError('internal', resData.message || 'Cashfree order creation failed.');
      }

      await orderDoc.ref.set({
        paymentSessionId: resData.payment_session_id,
        paymentGateway: 'cashfree',
        cashfreeEnvironment: creds.env,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });

      return {
        success: true,
        orderId: resData.order_id,
        orderAmount: resData.order_amount,
        currency: resData.order_currency,
        paymentSessionId: resData.payment_session_id,
        environment: creds.env
      };
    } catch (err: any) {
      console.error('[Cashfree] Network exception:', err);
      throw new HttpsError('internal', err.message || 'Could not contact Cashfree payment gateway.');
    }
  }
);

/**
 * 2. verifyCashfreePayment — Authoritative server-side payment verification
 */
export const verifyCashfreePayment = onCall(
  {
    region: 'asia-southeast1',
    secrets: [cashfreeAppId, cashfreeSecretKey, cashfreeEnvironment]
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be signed in.');
    }

    const { orderId } = request.data || {};
    if (!orderId) {
      throw new HttpsError('invalid-argument', 'orderId is required.');
    }

    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      throw new HttpsError('not-found', 'Order not found.');
    }

    const orderData = orderDoc.data()!;
    if (orderData.userId !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'Unauthorized.');
    }

    const creds = getCashfreeCredentials();
    if (!creds.appId || !creds.secretKey) {
      console.error('[Cashfree] Gateway credentials missing.');
      throw new HttpsError('failed-precondition', 'Cashfree payment gateway credentials are not configured.');
    }

    const baseUrl = creds.env === 'PRODUCTION' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';
    const url = `${baseUrl}/orders/${orderId}`;
    try {
      const res = await fetch(url, {
        headers: {
          'x-client-id': creds.appId,
          'x-client-secret': creds.secretKey,
          'x-api-version': creds.apiVersion
        }
      });

      const data: any = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to verify Cashfree payment.');
      }

      const isPaid = data.order_status === 'PAID';
      if (isPaid && orderData.paymentStatus !== 'paid') {
        await orderDoc.ref.set({
          paymentStatus: 'paid',
          status: 'Processing',
          orderStatus: 'processing',
          paymentVerifiedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
      }

      return {
        success: isPaid,
        orderId: data.order_id,
        orderStatus: data.order_status,
        orderAmount: data.order_amount,
        paymentStatus: isPaid ? 'SUCCESS' : data.order_status
      };
    } catch (err: any) {
      throw new HttpsError('internal', err.message || 'Error verifying payment with Cashfree.');
    }
  }
);

/**
 * 3. cashfreePaymentWebhook — Webhook listener with HMAC-SHA256 signature verification,
 * idempotency, amount checking, and state-downgrade prevention.
 */
export const cashfreePaymentWebhook = onRequest(
  {
    region: 'asia-southeast1',
    secrets: [cashfreeSecretKey]
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const signature = req.headers['x-webhook-signature'] as string;
    const timestamp = req.headers['x-webhook-timestamp'] as string;
    const rawBody = (req as any).rawBody ? (req as any).rawBody.toString() : JSON.stringify(req.body);

    if (!signature || !timestamp) {
      console.warn('[Cashfree Webhook] Missing x-webhook-signature or x-webhook-timestamp header.');
      res.status(401).send('Unauthorized: Missing signature headers');
      return;
    }

    // Reject timestamps older than 5 minutes (300,000 ms)
    const tsNumber = Number(timestamp);
    if (!Number.isNaN(tsNumber) && Math.abs(Date.now() - tsNumber) > 300000) {
      console.warn(`[Cashfree Webhook] Webhook timestamp stale: ${timestamp}`);
      res.status(401).send('Unauthorized: Stale webhook timestamp');
      return;
    }

    let secret = '';
    try {
      secret = cashfreeSecretKey.value() || '';
    } catch {
      secret = process.env.CASHFREE_SECRET_KEY || '';
    }

    if (!secret) {
      console.error('[Cashfree Webhook] CASHFREE_SECRET_KEY not configured.');
      res.status(500).send('Server configuration error');
      return;
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(timestamp + rawBody)
      .digest('base64');

    const sigBuf = Buffer.from(signature, 'utf8');
    const expBuf = Buffer.from(expectedSignature, 'utf8');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      console.warn('[Cashfree Webhook] Invalid webhook signature detected.');
      res.status(401).send('Unauthorized: Invalid signature');
      return;
    }

    const event = req.body?.type;
    const orderData = req.body?.data?.order;
    const paymentData = req.body?.data?.payment;
    const orderId = orderData?.order_id;

    if (!orderId) {
      res.status(400).json({ status: 'missing_order_id' });
      return;
    }

    const eventId = req.body?.event_id || `${orderId}_${event}_${paymentData?.cf_payment_id || Date.now()}`;
    const eventRef = db.collection('payment_webhook_events').doc(eventId);
    const eventDoc = await eventRef.get();

    if (eventDoc.exists) {
      // Idempotency: Event already recorded and processed
      res.status(200).json({ status: 'already_processed' });
      return;
    }

    await eventRef.set({
      eventId,
      orderId,
      eventType: event,
      paymentId: paymentData?.cf_payment_id || null,
      amount: orderData?.order_amount || null,
      currency: orderData?.order_currency || 'INR',
      receivedAt: FieldValue.serverTimestamp()
    });

    if (event === 'PAYMENT_SUCCESS_WEBHOOK') {
      const orderRef = db.collection('orders').doc(orderId);
      const orderDoc = await orderRef.get();

      if (orderDoc.exists) {
        const existingData = orderDoc.data()!;
        
        // Never downgrade an order already in paid state
        if (existingData.paymentStatus !== 'paid') {
          // Amount validation check
          const expectedPaise = existingData.totalAmountPaise || Math.round((existingData.totalAmount || 0) * 100);
          const receivedPaise = Math.round(Number(orderData.order_amount || 0) * 100);

          if (Math.abs(expectedPaise - receivedPaise) > 100) { // allow max 1 rupee rounding
            console.error(`[Cashfree Webhook] Amount mismatch for order ${orderId}: expected ${expectedPaise}, received ${receivedPaise}`);
            await orderRef.update({
              paymentDiscrepancy: true,
              paymentDiscrepancyReason: `Amount mismatch: expected ${expectedPaise} paise, received ${receivedPaise} paise`,
              updatedAt: FieldValue.serverTimestamp()
            });
            res.status(200).json({ status: 'amount_mismatch_flagged' });
            return;
          }

          await orderRef.update({
            paymentStatus: 'paid',
            status: 'Processing',
            orderStatus: 'processing',
            paymentReference: paymentData?.cf_payment_id || null,
            paymentMode: paymentData?.payment_group || 'cashfree',
            paidAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
          });

          // Also update vendor sub-orders
          const subOrdersSnap = await db.collection('orders').doc(orderId).collection('vendor_orders').get();
          const batch = db.batch();
          subOrdersSnap.docs.forEach(docSnap => {
            batch.update(docSnap.ref, {
              paymentStatus: 'paid',
              updatedAt: FieldValue.serverTimestamp()
            });
          });
          await batch.commit();
        }
      }
    }

    res.status(200).json({ status: 'OK' });
  }
);
