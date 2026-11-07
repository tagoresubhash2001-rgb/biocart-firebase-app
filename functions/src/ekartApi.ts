/**
 * Ekart Elite API client, written against the official OpenAPI spec
 * (https://app.elite.ekartlogistics.in, spec v3.8.9 — copy saved in docs/integrations/ekart/).
 * No simulation: every function either returns Ekart's real answer or throws.
 */
import { HttpsError } from 'firebase-functions/v2/https';
import * as crypto from 'node:crypto';
import { EKART_CLIENT_ID, EKART_PASSWORD, EKART_USERNAME, EKART_WEBHOOK_SECRET } from './core';

export const EKART_BASE_URL = 'https://app.elite.ekartlogistics.in';

function secret(s: { value(): string }, envName: string): string {
  let v = '';
  try { v = (s.value() || '').trim(); } catch { v = ''; }
  return v || (process.env[envName] || '').trim();
}

export function ekartCreds() {
  const clientId = secret(EKART_CLIENT_ID, 'EKART_CLIENT_ID');
  const username = secret(EKART_USERNAME, 'EKART_USERNAME');
  const password = secret(EKART_PASSWORD, 'EKART_PASSWORD');
  if (!clientId || !username || !password) {
    throw new HttpsError('failed-precondition', 'Courier (EKART) is not configured. Please contact BioCart support.');
  }
  return { clientId, username, password };
}

export function ekartWebhookSecret(): string {
  // Ekart accepts webhook secrets of 6–30 characters; we always use the first 30.
  return secret(EKART_WEBHOOK_SECRET, 'EKART_WEBHOOK_SECRET').slice(0, 30);
}

export class EkartApiError extends Error {
  constructor(public status: number, public body: any) {
    super(`EKART API ${status}: ${body?.message || body?.description || body?.remark || 'error'}`);
  }
}

let cachedToken: { token: string; type: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return `${cachedToken.type} ${cachedToken.token}`;
  const { clientId, username, password } = ekartCreds();
  const res = await fetch(`${EKART_BASE_URL}/integrations/v2/auth/token/${encodeURIComponent(clientId)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || !data?.access_token) throw new EkartApiError(res.status, data);
  cachedToken = { token: data.access_token, type: data.token_type || 'Bearer', expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000 };
  return `${cachedToken.type} ${cachedToken.token}`;
}

async function ekartFetch(method: string, path: string, body?: any, opts: { auth?: boolean; raw?: boolean } = {}): Promise<any> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (opts.auth !== false) headers.Authorization = await getToken();
  const res = await fetch(`${EKART_BASE_URL}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  if (opts.raw && res.ok) return Buffer.from(await res.arrayBuffer());
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { message: text.slice(0, 300) }; }
  if (!res.ok) throw new EkartApiError(res.status, data);
  return data;
}

export interface Serviceability { serviceable: boolean; cod: boolean; maxCodAmount: number; city?: string; state?: string; remark?: string }

export async function checkServiceability(pincode: string): Promise<Serviceability> {
  const data = await ekartFetch('GET', `/api/v2/serviceability/${encodeURIComponent(pincode)}`);
  const d = data?.details || {};
  return {
    serviceable: data?.status === true && d.forward_drop !== false,
    cod: d.cod === true,
    maxCodAmount: Number(d.max_cod_amount) || 0,
    city: d.city, state: d.state, remark: data?.remark,
  };
}

export interface EkartLocation { name: string; phone: string; address: string; city?: string; state?: string; pin: string }

export async function createShipment(payload: Record<string, any>): Promise<{ trackingId: string; wbn?: string; vendor?: string; remark?: string }> {
  const data = await ekartFetch('PUT', '/api/v1/package/create', payload);
  if (data?.status !== true || !data?.tracking_id) throw new EkartApiError(200, data);
  return { trackingId: data.tracking_id, wbn: data?.barcodes?.wbn, vendor: data?.vendor, remark: data?.remark };
}

export async function cancelShipment(trackingId: string): Promise<any> {
  return ekartFetch('DELETE', `/api/v1/package/cancel?tracking_id=${encodeURIComponent(trackingId)}`);
}

export async function downloadLabelPdf(trackingIds: string[]): Promise<Buffer> {
  return ekartFetch('POST', '/api/v1/package/label?json_only=false', { ids: trackingIds }, { raw: true });
}

export async function trackShipment(trackingId: string): Promise<any> {
  return ekartFetch('GET', `/api/v1/track/${encodeURIComponent(trackingId)}`, undefined, { auth: false });
}

export async function addAddress(loc: { alias: string; phone: number; address_line1: string; address_line2?: string; pincode: number; city?: string; state?: string; country: string }): Promise<any> {
  return ekartFetch('POST', '/api/v2/address', loc);
}

export async function listWebhooks(): Promise<any[]> {
  const d = await ekartFetch('GET', '/api/v2/webhook');
  return Array.isArray(d) ? d : [];
}

export async function addWebhook(url: string, webhookSecret: string): Promise<any> {
  return ekartFetch('POST', '/api/v2/webhook', { url, secret: webhookSecret, topics: ['track_updated'], active: true });
}

/** Ekart signs webhook bodies with HMAC using the registered secret (header name is not documented). */
export function verifyEkartHmac(rawBody: string, headers: Record<string, any>, webhookSecret: string): boolean {
  if (!webhookSecret) return false;
  const candidates = Object.entries(headers)
    .filter(([k]) => /hmac|signature/i.test(k))
    .map(([, v]) => String(v || '').trim())
    .filter(Boolean);
  if (!candidates.length) return false;
  const hex = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  const b64 = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('base64');
  return candidates.some((c) => {
    const clean = c.replace(/^sha256=/i, '');
    return [hex, b64].some((exp) => exp.length === clean.length && crypto.timingSafeEqual(Buffer.from(exp), Buffer.from(clean)));
  });
}

/** Normalise an Ekart status into BioCart's shipment states. */
export function normaliseEkartStatus(status: string): { shipment: string; delivered: boolean; terminalFailure: boolean } {
  const s = String(status || '').toLowerCase();
  if (s === 'delivered') return { shipment: 'delivered', delivered: true, terminalFailure: false };
  if (s.startsWith('rto delivered')) return { shipment: 'rto_delivered', delivered: false, terminalFailure: true };
  if (s.startsWith('rto') || s.startsWith('seller rto')) return { shipment: 'rto_in_progress', delivered: false, terminalFailure: false };
  if (s === 'lost' || s === 'damaged') return { shipment: s, delivered: false, terminalFailure: true };
  if (s === 'cancelled' || s === 'seller cancelled' || s === 'pickup cancelled') return { shipment: 'cancelled', delivered: false, terminalFailure: true };
  if (s === 'undelivered') return { shipment: 'ndr', delivered: false, terminalFailure: false };
  if (s === 'out for delivery') return { shipment: 'out_for_delivery', delivered: false, terminalFailure: false };
  if (s === 'picked up' || s === 'in transit' || s === 'shipment delayed') return { shipment: 'in_transit', delivered: false, terminalFailure: false };
  return { shipment: 'pickup_pending', delivered: false, terminalFailure: false };
}
