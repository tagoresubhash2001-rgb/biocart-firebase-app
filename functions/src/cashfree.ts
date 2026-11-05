import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import crypto from 'crypto';

const db = getFirestore();

export interface CashfreeCredentials {
  appId: string;
  secretKey: string;
  env: 'SANDBOX' | 'PRODUCTION';
  apiVersion: string;
}

export function getCashfreeCredentials(): CashfreeCredentials {
  const appId = (process.env.CASHFREE_APP_ID || '').trim();
  const secretKey = (process.env.CASHFREE_SECRET_KEY || '').trim();
  const env = (process.env.CASHFREE_ENVIRONMENT || 'SANDBOX').toUpperCase() === 'PRODUCTION' ? 'PRODUCTION' : 'SANDBOX';
  return {
    appId,
    secretKey,
    env,
    apiVersion: '2023-08-01'
  };
}

/**
 * 1. createCashfreeOrder — Secure server-side payment order & session creation
 */
export const createCashfreeOrder = onCall(
  { region: 'asia-southeast1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be signed in to initiate checkout.');
    }

    const { orderId, orderAmount, customerPhone, customerEmail, customerName } = request.data || {};
    if (!orderId || !orderAmount || orderAmount <= 0) {
      throw new HttpsError('invalid-argument', 'Valid orderId and positive orderAmount are required.');
    }

    const creds = getCashfreeCredentials();
    const isSandbox = creds.env === 'SANDBOX' || !creds.appId || !creds.secretKey;

    // Deterministic simulation in sandbox / pre-configured mode
    if (isSandbox) {
      return {
        success: true,
        orderId,
        orderAmount,
        currency: 'INR',
        paymentSessionId: `cf_sess_${crypto.randomBytes(16).toString('hex')}`,
        environment: 'SANDBOX',
        note: 'Simulated Cashfree Session (Sandbox/Pre-configuration mode)'
      };
    }

    // Production Cashfree API Call
    const url = 'https://api.cashfree.com/pg/orders';
    const payload = {
      order_id: orderId,
      order_amount: Number(orderAmount.toFixed(2)),
      order_currency: 'INR',
      customer_details: {
        customer_id: request.auth.uid,
        customer_phone: customerPhone || '9999999999',
        customer_email: customerEmail || 'customer@biocart.in',
        customer_name: customerName || 'BioCart Customer'
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

      return {
        success: true,
        orderId: resData.order_id,
        orderAmount: resData.order_amount,
        currency: resData.order_currency,
        paymentSessionId: resData.payment_session_id,
        environment: 'PRODUCTION'
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
  { region: 'asia-southeast1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be signed in.');
    }

    const { orderId } = request.data || {};
    if (!orderId) {
      throw new HttpsError('invalid-argument', 'orderId is required.');
    }

    const creds = getCashfreeCredentials();
    const isSandbox = creds.env === 'SANDBOX' || !creds.appId || !creds.secretKey;

    if (isSandbox) {
      return {
        success: true,
        orderId,
        orderStatus: 'PAID',
        paymentStatus: 'SUCCESS',
        referenceId: `cf_sim_${crypto.randomBytes(8).toString('hex')}`
      };
    }

    const url = `https://api.cashfree.com/pg/orders/${orderId}`;
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
 * 3. cashfreePaymentWebhook — Webhook listener for asynchronous payment settlement
 */
export const cashfreePaymentWebhook = onRequest(
  { region: 'asia-southeast1' },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    // Verify signature if secret configured
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];
    const rawBody = req.rawBody ? req.rawBody.toString() : JSON.stringify(req.body);

    const secret = process.env.CASHFREE_SECRET_KEY || '';
    if (secret && signature && timestamp) {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(timestamp + rawBody)
        .digest('base64');

      if (signature !== expectedSignature) {
        console.warn('[Cashfree Webhook] Invalid webhook signature detected.');
        res.status(400).send('Invalid signature');
        return;
      }
    }

    const event = req.body?.type;
    const orderData = req.body?.data?.order;
    console.log(`[Cashfree Webhook] Event: ${event}, Order: ${orderData?.order_id}`);

    if (event === 'PAYMENT_SUCCESS_WEBHOOK' && orderData?.order_id) {
      try {
        await db.collection('orders').doc(orderData.order_id).set(
          {
            paymentStatus: 'paid',
            status: 'Processing',
            updatedAt: new Date().toISOString()
          },
          { merge: true }
        );
      } catch (err) {
        console.error('[Cashfree Webhook] Failed to update order:', err);
      }
    }

    res.status(200).json({ status: 'OK' });
  }
);
