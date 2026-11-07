/**
 * Thin, typed client for the Cashfree Payment Gateway REST API (PG v2023-08-01).
 * Credentials come only from Secret Manager (see core.ts). No simulation path:
 * if credentials are missing the call fails loudly.
 */
import * as crypto from 'node:crypto';
import { HttpsError } from 'firebase-functions/v2/https';
import { CASHFREE_APP_ID, CASHFREE_ENVIRONMENT, CASHFREE_SECRET_KEY } from './core';

export const CASHFREE_API_VERSION = '2023-08-01';

export interface CashfreeConfig { appId: string; secretKey: string; env: 'PRODUCTION' | 'SANDBOX'; baseUrl: string }

function readSecret(s: { value(): string }): string {
  try { return (s.value() || '').trim(); } catch { return ''; }
}

export function cashfreeConfig(): CashfreeConfig {
  const appId = readSecret(CASHFREE_APP_ID) || (process.env.CASHFREE_APP_ID || '').trim();
  const secretKey = readSecret(CASHFREE_SECRET_KEY) || (process.env.CASHFREE_SECRET_KEY || '').trim();
  const envRaw = (readSecret(CASHFREE_ENVIRONMENT) || process.env.CASHFREE_ENVIRONMENT || '').trim().toUpperCase();
  if (!appId || !secretKey || (envRaw !== 'PRODUCTION' && envRaw !== 'SANDBOX')) {
    throw new HttpsError('failed-precondition', 'Payment gateway is not configured. Please contact BioCart support.');
  }
  const env = envRaw as 'PRODUCTION' | 'SANDBOX';
  return { appId, secretKey, env, baseUrl: env === 'PRODUCTION' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg' };
}

export class CashfreeApiError extends Error {
  constructor(public status: number, public body: any) {
    super(`Cashfree API ${status}: ${body?.message || body?.code || 'error'}`);
  }
}

export async function cashfreeRequest(method: 'GET' | 'POST' | 'PATCH', path: string, body?: any, idempotencyKey?: string): Promise<any> {
  const cfg = cashfreeConfig();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'x-client-id': cfg.appId,
    'x-client-secret': cfg.secretKey,
    'x-api-version': CASHFREE_API_VERSION,
  };
  if (idempotencyKey) headers['x-idempotency-key'] = idempotencyKey;
  const res = await fetch(`${cfg.baseUrl}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { message: text.slice(0, 300) }; }
  if (!res.ok) throw new CashfreeApiError(res.status, data);
  return data;
}

/**
 * Cashfree webhook signature: base64(HMAC_SHA256(timestamp + rawBody, secretKey)).
 * Accepts timestamps in seconds or milliseconds; rejects anything older than 10 minutes.
 */
export function verifyCashfreeSignature(rawBody: string, signature: string | undefined, timestamp: string | undefined, secretKey: string): { ok: boolean; reason?: string } {
  if (!signature || !timestamp) return { ok: false, reason: 'missing signature headers' };
  const tsNum = Number(timestamp);
  if (Number.isFinite(tsNum) && tsNum > 0) {
    const tsMs = tsNum < 1e12 ? tsNum * 1000 : tsNum;
    if (Math.abs(Date.now() - tsMs) > 10 * 60 * 1000) return { ok: false, reason: 'stale timestamp' };
  }
  const expected = crypto.createHmac('sha256', secretKey).update(timestamp + rawBody).digest('base64');
  const a = Buffer.from(signature, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { ok: false, reason: 'invalid signature' };
  return { ok: true };
}
