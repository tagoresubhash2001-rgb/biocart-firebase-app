/**
 * Shared backend foundation: Firebase Admin init, secrets, marketplace policy,
 * role checks, rate limiting and small helpers. Every other module imports this
 * first so the Admin SDK is initialised exactly once.
 */
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue, Firestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { setGlobalOptions } from 'firebase-functions/v2';

if (getApps().length === 0) {
  initializeApp();
  try { getFirestore().settings({ ignoreUndefinedProperties: true }); } catch { /* already configured */ }
}

export function db(): Firestore {
  return getFirestore();
}

export { FieldValue };

export const REGION = 'asia-southeast1';

// Cap every function at 5 instances. Gen-2 defaults to 100 instances x 1 vCPU per
// function, and with ~40 functions that exceeds the Cloud Run regional CPU quota
// ("Quota exceeded for total allowable CPU per project per region"). 5 instances
// x 80 concurrent requests each is far above BioCart's traffic and also caps cost.
setGlobalOptions({ region: REGION, maxInstances: 5 });

// ---------------------------------------------------------------------------
// Secrets (Google Secret Manager). Values are only available inside handlers
// of functions that list them in `secrets: [...]`.
// ---------------------------------------------------------------------------
export const CASHFREE_APP_ID = defineSecret('CASHFREE_APP_ID');
export const CASHFREE_SECRET_KEY = defineSecret('CASHFREE_SECRET_KEY');
export const CASHFREE_ENVIRONMENT = defineSecret('CASHFREE_ENVIRONMENT');
export const EKART_CLIENT_ID = defineSecret('EKART_CLIENT_ID');
export const EKART_USERNAME = defineSecret('EKART_USERNAME');
export const EKART_PASSWORD = defineSecret('EKART_PASSWORD');
export const EKART_WEBHOOK_SECRET = defineSecret('EKART_WEBHOOK_SECRET');

export const CASHFREE_SECRETS = [CASHFREE_APP_ID, CASHFREE_SECRET_KEY, CASHFREE_ENVIRONMENT];
export const EKART_SECRETS = [EKART_CLIENT_ID, EKART_USERNAME, EKART_PASSWORD, EKART_WEBHOOK_SECRET];

// ---------------------------------------------------------------------------
// Marketplace policy (owner-approved business rules). Stored in
// settings/financialPolicy, admin-editable; these are the defaults.
// ---------------------------------------------------------------------------
export interface MarketplacePolicy {
  policyVersion: string;
  shippingFeePaise: number;            // R3: ₹99
  freeShippingThresholdPaise: number;  // R3: free at ₹1,499 and above
  codEnabled: boolean;                 // R4: admin master switch, OFF by default
  payoutHoldDaysAfterDelivery: number; // R5: default 0
  reservationMinutes: number;          // unpaid order stock hold
}

export const DEFAULT_POLICY: MarketplacePolicy = {
  policyVersion: '2026-11-r1',
  shippingFeePaise: 9900,
  freeShippingThresholdPaise: 149900,
  codEnabled: false,
  payoutHoldDaysAfterDelivery: 0,
  reservationMinutes: 20,
};

export async function loadPolicy(): Promise<MarketplacePolicy> {
  const snap = await db().collection('settings').doc('financialPolicy').get();
  const d = snap.exists ? snap.data() || {} : {};
  const int = (v: any, fallback: number) => (Number.isInteger(v) && v >= 0 ? v : fallback);
  return {
    policyVersion: typeof d.policyVersion === 'string' ? d.policyVersion : DEFAULT_POLICY.policyVersion,
    shippingFeePaise: int(d.shippingFeePaise, DEFAULT_POLICY.shippingFeePaise),
    freeShippingThresholdPaise: int(d.freeShippingThresholdPaise, DEFAULT_POLICY.freeShippingThresholdPaise),
    codEnabled: d.codEnabled === true,
    payoutHoldDaysAfterDelivery: int(d.payoutHoldDaysAfterDelivery, DEFAULT_POLICY.payoutHoldDaysAfterDelivery),
    reservationMinutes: int(d.reservationMinutes, DEFAULT_POLICY.reservationMinutes) || DEFAULT_POLICY.reservationMinutes,
  };
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------
export interface Caller { uid: string; role: string | null; status: string | null; email?: string; data: any }

export async function getCaller(auth: { uid: string; token: any } | undefined): Promise<Caller> {
  if (!auth) throw new HttpsError('unauthenticated', 'Please sign in first.');
  const snap = await db().collection('users').doc(auth.uid).get();
  const data = snap.exists ? snap.data() || {} : {};
  return { uid: auth.uid, role: data.role || null, status: data.status || null, email: auth.token?.email, data };
}

export function isAdminCaller(c: Caller): boolean {
  return (c.role === 'admin' || c.role === 'super_admin') && c.status === 'active';
}

export async function requireAdmin(auth: any): Promise<Caller> {
  const c = await getCaller(auth);
  if (!isAdminCaller(c)) throw new HttpsError('permission-denied', 'Only BioCart administrators can do this.');
  return c;
}

export async function requireSuperAdmin(auth: any): Promise<Caller> {
  const c = await getCaller(auth);
  if (c.role !== 'super_admin' || c.status !== 'active') {
    throw new HttpsError('permission-denied', 'Only the BioCart super admin can do this.');
  }
  return c;
}

/** Returns true when the caller owns the vendor (vendor doc id == uid, or ownerUid == uid). */
export async function callerOwnsVendor(c: Caller, vendorId: string): Promise<boolean> {
  if (!vendorId) return false;
  if (c.role !== 'vendor' || c.status !== 'active') return false;
  if (c.uid === vendorId || c.data?.vendorId === vendorId) {
    const v = await db().collection('vendors').doc(vendorId).get();
    return v.exists && (v.id === c.uid || v.data()?.ownerUid === c.uid || c.data?.vendorId === vendorId);
  }
  const v = await db().collection('vendors').doc(vendorId).get();
  return v.exists && v.data()?.ownerUid === c.uid;
}

// ---------------------------------------------------------------------------
// Simple fixed-window rate limiter backed by Firestore.
// ---------------------------------------------------------------------------
export async function rateLimit(key: string, max: number, windowSeconds: number): Promise<void> {
  const ref = db().collection('rate_limits').doc(key.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 300));
  const now = Date.now();
  await db().runTransaction(async (t) => {
    const snap = await t.get(ref);
    const d = snap.exists ? snap.data()! : null;
    if (!d || now - (d.windowStart || 0) > windowSeconds * 1000) {
      t.set(ref, { windowStart: now, count: 1, expiresAt: new Date(now + windowSeconds * 2000) });
      return;
    }
    if ((d.count || 0) >= max) {
      throw new HttpsError('resource-exhausted', 'Too many requests. Please wait a minute and try again.');
    }
    t.update(ref, { count: FieldValue.increment(1) });
  });
}

// ---------------------------------------------------------------------------
// Misc helpers
// ---------------------------------------------------------------------------
export const rupees = (paise: number) => Math.round(paise) / 100;
export const nowIso = () => new Date().toISOString();

export function cleanPhone(v: any): string {
  const digits = String(v || '').replace(/\D/g, '');
  const last10 = digits.slice(-10);
  return /^[6-9]\d{9}$/.test(last10) ? last10 : '';
}

export function cleanPincode(v: any): string {
  const s = String(v || '').trim();
  return /^[1-9][0-9]{5}$/.test(s) ? s : '';
}

export async function audit(actorUid: string, action: string, resourceType: string, resourceId: string, details: Record<string, any> = {}) {
  const ref = db().collection('audit_logs').doc();
  await ref.set({ id: ref.id, userId: actorUid, action, resourceType, resourceId, details, createdAt: nowIso() });
}

/** Lower-case canonical statuses used everywhere. */
export const ORDER_STATUS = {
  AWAITING_PAYMENT: 'awaiting_payment',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  PARTIALLY_SHIPPED: 'partially_shipped',
  SHIPPED: 'shipped',
  PARTIALLY_DELIVERED: 'partially_delivered',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  PAYMENT_EXPIRED: 'payment_expired',
} as const;
