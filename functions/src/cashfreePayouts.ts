import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import * as crypto from 'node:crypto';
import { DEFAULT_FINANCIAL_POLICY, FinancialPolicy } from './financialEngine';

const db = getFirestore();

/**
 * Payout provider response contract
 */
export interface PayoutTransferResult {
  success: boolean;
  providerReferenceId: string;
  utr?: string;
  status: 'paid' | 'processing' | 'failed' | 'needs_review';
  failureReason?: string;
  simulated?: boolean;
}

/**
 * Helper: Retrieve configured Cashfree Payouts credentials from environment
 */
export async function getCashfreePayoutCredentials(): Promise<{
  clientId: string;
  clientSecret: string;
  env: 'PRODUCTION' | 'TEST';
  isLive: boolean;
}> {
  const clientId = (process.env.CASHFREE_PAYOUT_CLIENT_ID || process.env.CASHFREE_APP_ID || '').trim();
  const clientSecret = (process.env.CASHFREE_PAYOUT_CLIENT_SECRET || process.env.CASHFREE_SECRET_KEY || '').trim();
  const env = (process.env.CASHFREE_PAYOUT_ENVIRONMENT || 'TEST').toUpperCase() === 'PRODUCTION' ? 'PRODUCTION' : 'TEST';
  let isLive = false;

  try {
    const snap = await db.collection('settings').doc('payments').get();
    if (snap.exists) {
      const d = snap.data() || {};
      if (d.livePayoutsEnabled === true) isLive = true;
    }
  } catch (err) {
    console.warn('Could not read non-secret settings/payments:', err);
  }

  return { clientId, clientSecret, env, isLive };
}

/**
 * Server-side Bank Payout Client (Cashfree Payouts API)
 * Strictly verifies beneficiary details, enforces idempotency, and never marks failed transfers as success.
 */
export async function executeBankPayoutTransfer(params: {
  vendorId: string;
  vendorName: string;
  amountPaise: number;
  bankAccount: {
    accountNumber: string;
    ifscCode: string;
    beneficiaryName: string;
    bankName?: string;
  };
  idempotencyKey: string;
  purpose?: string;
}): Promise<PayoutTransferResult> {
  const { vendorId, vendorName, amountPaise, bankAccount, idempotencyKey, purpose } = params;

  // Strict bank detail sanity validation
  const cleanAccount = (bankAccount.accountNumber || '').replace(/\s+/g, '');
  const cleanIfsc = (bankAccount.ifscCode || '').replace(/\s+/g, '').toUpperCase();
  const beneficiary = (bankAccount.beneficiaryName || vendorName || '').trim();

  if (!cleanAccount || cleanAccount.length < 8 || !/^\d+$/.test(cleanAccount)) {
    return {
      success: false,
      providerReferenceId: `FAIL-ACC-${Date.now()}`,
      status: 'needs_review',
      failureReason: 'Invalid or missing bank account number format'
    };
  }

  if (!cleanIfsc || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
    return {
      success: false,
      providerReferenceId: `FAIL-IFSC-${Date.now()}`,
      status: 'needs_review',
      failureReason: `Invalid IFSC Code format: ${cleanIfsc}`
    };
  }

  const creds = await getCashfreePayoutCredentials();

  // If live credentials configured and livePayoutsEnabled is true, call Cashfree Payouts API
  if (creds.isLive && creds.clientId && creds.clientSecret) {
    try {
      const baseUrl = creds.env === 'PRODUCTION'
        ? 'https://payout-api.cashfree.com/payout/v1'
        : 'https://payout-gamma.cashfree.com/payout/v1';

      // 1. Authorize token
      const authRes = await fetch(`${baseUrl}/authorize`, {
        method: 'POST',
        headers: {
          'X-Client-Id': creds.clientId,
          'X-Client-Secret': creds.clientSecret
        }
      });
      const authData: any = await authRes.json();
      const token = authData?.data?.token;

      if (!token) {
        throw new Error(authData.message || 'Cashfree Payout authorization token rejected');
      }

      // 2. Direct Bank Transfer request
      const transferAmount = Number((amountPaise / 100).toFixed(2));
      const transferPayload = {
        beneId: `BENE_${vendorId}`,
        amount: transferAmount,
        transferId: idempotencyKey,
        remarks: 'BioCart Weekly Vendor Settlement',
        beneDetails: {
          beneId: `BENE_${vendorId}`,
          name: beneficiary,
          email: `${vendorId}@vendor.biocart.in`,
          phone: '9999999999',
          bankAccount: cleanAccount,
          ifsc: cleanIfsc,
          address1: 'India'
        }
      };

      const transferRes = await fetch(`${baseUrl}/requestTransfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(transferPayload)
      });

      const transferData: any = await transferRes.json();

      if (transferData.status === 'SUCCESS' && transferData.data?.utr) {
        return {
          success: true,
          providerReferenceId: transferData.data.referenceId || idempotencyKey,
          utr: transferData.data.utr,
          status: 'paid'
        };
      } else if (transferData.status === 'PENDING' || transferData.subCode === '201') {
        return {
          success: true,
          providerReferenceId: transferData.data?.referenceId || idempotencyKey,
          status: 'processing'
        };
      } else {
        return {
          success: false,
          providerReferenceId: transferData.data?.referenceId || `FAIL-${Date.now()}`,
          status: 'failed',
          failureReason: transferData.message || 'Cashfree transfer rejected'
        };
      }
    } catch (apiErr: any) {
      console.error('Cashfree Payout API exception:', apiErr);
      return {
        success: false,
        providerReferenceId: `ERR-${Date.now()}`,
        status: 'failed',
        failureReason: apiErr.message || 'Network timeout connecting to Cashfree payout gateway'
      };
    }
  }

  // Safe Sandbox / Deterministic Test Mode Simulation
  console.log(`[Cashfree Payout Sandbox] Simulating payout of ₹${amountPaise / 100} to ${beneficiary} (${cleanIfsc} - ${cleanAccount.slice(-4)})`);
  const simulatedRef = `cf_py_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const simulatedUtr = `CMS${Date.now().toString().slice(-8)}${Math.floor(1000 + Math.random() * 9000)}`;

  return {
    success: true,
    providerReferenceId: simulatedRef,
    utr: simulatedUtr,
    status: 'paid',
    simulated: true
  };
}

/**
 * Webhook handler for Cashfree Payout status updates
 */
export const cashfreePayoutWebhook = onRequest({
  region: 'asia-southeast1',
  cors: ['https://biocart.in']
}, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const { transferId, referenceId, status, utr, reason } = req.body || {};
  console.log(`Received Cashfree Payout webhook event for transfer: ${transferId}, status: ${status}`);

  try {
    if (transferId) {
      const q = await db.collection('vendor_settlements').where('transferId', '==', transferId).limit(1).get();
      if (!q.empty) {
        const settlementDoc = q.docs[0];
        const currentData = settlementDoc.data();

        if (status === 'SUCCESS') {
          await settlementDoc.ref.update({
            status: 'paid',
            providerReferenceId: referenceId || currentData.providerReferenceId,
            utr: utr || currentData.utr,
            settledAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        } else if (status === 'FAILED' || status === 'REVERSED') {
          await settlementDoc.ref.update({
            status: 'failed',
            failureReason: reason || `Cashfree payout ${status}`,
            updatedAt: new Date().toISOString()
          });
        }
      }
    }
    res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('Error handling Cashfree payout webhook:', err);
    res.status(500).json({ error: 'Webhook processing error' });
  }
});
