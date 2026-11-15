/**
 * Shared EKART Elite API client.
 *
 * - Credentials come only from Firebase secrets (never from code or env fallbacks).
 * - The access token is cached in Firestore at system_private/ekart_token.
 * - Every call is logged (sanitised) to Cloud Logging and to ekart_api_logs.
 */
import { HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as logger from 'firebase-functions/logger';
import { getFirestore } from 'firebase-admin/firestore';

export const EKART_CLIENT_ID = defineSecret('EKART_CLIENT_ID');
export const EKART_USERNAME = defineSecret('EKART_USERNAME');
export const EKART_PASSWORD = defineSecret('EKART_PASSWORD');
export const EKART_WEBHOOK_SECRET = defineSecret('EKART_WEBHOOK_SECRET');

/** Secrets needed by any function that calls the EKART API. */
export const EKART_API_SECRETS = [EKART_CLIENT_ID, EKART_USERNAME, EKART_PASSWORD];

export const EKART_BASE_URL = 'https://app.elite.ekartlogistics.in';
const TOKEN_DOC = 'system_private/ekart_token';
const TOKEN_REFRESH_MARGIN_MS = 30 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 25_000;

export interface EkartLogContext {
  /** Name of the Cloud Function making the call. */
  fn: string;
  orderNumber?: string;
  vendorId?: string;
}

export interface EkartRequestOptions {
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  expect?: 'json' | 'pdf';
  ctx: EkartLogContext;
  /** Open endpoints (tracking) do not need a token. Default true. */
  auth?: boolean;
  /** Return a JSON body with `status: false` instead of throwing (serviceability). */
  allowStatusFalse?: boolean;
}

// ---------------------------------------------------------------------------
// Sanitising helpers
// ---------------------------------------------------------------------------

const SECRET_KEY_RE = /pass(word)?|secret|token|authorization|api[-_]?key/i;
const PHONE_KEY_RE = /phone|mobile|contact_?number/i;

/** Keeps the leading digits and masks the last 6, e.g. 9876543210 -> 9876XXXXXX. */
export function maskPhone(value: unknown): string {
  const s = String(value ?? '');
  if (s.length <= 6) return 'X'.repeat(s.length);
  return s.slice(0, s.length - 6) + 'XXXXXX';
}

/** Deep copy with secrets removed and phone numbers masked. Safe to log/store. */
export function sanitize(value: any, depth = 0): any {
  if (value === null || value === undefined) return value ?? null;
  if (depth > 8) return '[truncated]';
  if (Array.isArray(value)) return value.map((v) => sanitize(v, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      if (SECRET_KEY_RE.test(k)) out[k] = '[REDACTED]';
      else if (PHONE_KEY_RE.test(k) && (typeof v === 'string' || typeof v === 'number')) out[k] = maskPhone(v);
      else out[k] = sanitize(v, depth + 1);
    }
    return out;
  }
  return value;
}

function sanitizeResponseText(text: string): string {
  let safe = text;
  try {
    safe = JSON.stringify(sanitize(JSON.parse(text)));
  } catch {
    /* not JSON — keep the text */
  }
  return safe.slice(0, 5000);
}

/** Never put the client id (part of the auth URL) into logs. */
function safePath(path: string): string {
  return path.replace(/(\/auth\/token\/)[^/?]+/, '$1[CLIENT_ID]');
}

/** Pulls EKART's own explanation out of an error payload. */
export function extractEkartMessage(payload: any, fallback: string): string {
  if (!payload) return fallback;
  if (typeof payload === 'string') return payload.slice(0, 500) || fallback;
  const parts: string[] = [];
  const push = (v: any) => {
    if (!v) return;
    const s = typeof v === 'string' ? v : JSON.stringify(v);
    if (s && !parts.includes(s)) parts.push(s);
  };
  push(payload.message);
  push(payload.description);
  push(payload.remark);
  push(payload.error);
  push(payload.errors);
  push(payload.detail);
  return parts.length ? parts.join(' — ').slice(0, 800) : fallback;
}

async function writeApiLog(record: Record<string, any>, isError: boolean): Promise<void> {
  if (isError) logger.error('EKART API call failed', record);
  else logger.info('EKART API call', record);
  try {
    await getFirestore().collection('ekart_api_logs').add(record);
  } catch (e: any) {
    logger.error('Could not write ekart_api_logs record', { message: e?.message });
  }
}

/** Writes an arbitrary (already sanitised here) record to ekart_api_logs, e.g. webhook deliveries. */
export async function logEkartEvent(record: Record<string, any>, isError = false): Promise<void> {
  await writeApiLog({ at: new Date().toISOString(), ...sanitize(record) }, isError);
}

// ---------------------------------------------------------------------------
// Token handling
// ---------------------------------------------------------------------------

interface CachedToken {
  accessToken: string;
  tokenType: string;
  expiresAt: number;
}

let memoryToken: CachedToken | null = null;

function isFresh(t: CachedToken | null): t is CachedToken {
  return !!t && !!t.accessToken && t.expiresAt - TOKEN_REFRESH_MARGIN_MS > Date.now();
}

async function fetchNewToken(ctx: EkartLogContext): Promise<CachedToken> {
  const clientId = EKART_CLIENT_ID.value().trim();
  const username = EKART_USERNAME.value().trim();
  const password = EKART_PASSWORD.value();
  if (!clientId || !username || !password) {
    throw new HttpsError('failed-precondition', 'EKART credentials are not configured (Firebase secrets EKART_CLIENT_ID / EKART_USERNAME / EKART_PASSWORD).');
  }

  const path = `/integrations/v2/auth/token/${encodeURIComponent(clientId)}`;
  const started = Date.now();
  let status = 0;
  let text = '';
  try {
    const res = await fetch(EKART_BASE_URL + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ username, password }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
    status = res.status;
    text = await res.text();
  } catch (e: any) {
    await writeApiLog({
      at: new Date().toISOString(), function: ctx.fn, method: 'POST', path: safePath(path),
      requestBody: { username: '[REDACTED]', password: '[REDACTED]' }, status: 0,
      responseBody: `Network error: ${e?.message || e}`, durationMs: Date.now() - started
    }, true);
    throw new HttpsError('unavailable', `Could not reach EKART to sign in: ${e?.message || e}`);
  }

  let json: any = null;
  try { json = JSON.parse(text); } catch { /* handled below */ }
  const ok = status >= 200 && status < 300 && json && typeof json.access_token === 'string' && json.access_token;

  await writeApiLog({
    at: new Date().toISOString(), function: ctx.fn, method: 'POST', path: safePath(path),
    requestBody: { username: '[REDACTED]', password: '[REDACTED]' }, status,
    // The token itself is never logged: sanitize() redacts access_token.
    responseBody: sanitizeResponseText(text), durationMs: Date.now() - started
  }, !ok);

  if (!ok) {
    throw new HttpsError('failed-precondition', `EKART sign-in failed (HTTP ${status}): ${extractEkartMessage(json ?? text, 'no reason given')}`);
  }

  const expiresInSec = Number(json.expires_in) > 0 ? Number(json.expires_in) : 24 * 60 * 60;
  const token: CachedToken = {
    accessToken: json.access_token,
    tokenType: json.token_type || 'Bearer',
    expiresAt: Date.now() + expiresInSec * 1000
  };
  memoryToken = token;
  try {
    await getFirestore().doc(TOKEN_DOC).set({ ...token, updatedAt: new Date().toISOString() });
  } catch (e: any) {
    logger.error('Could not cache EKART token in Firestore', { message: e?.message });
  }
  return token;
}

async function getToken(ctx: EkartLogContext, forceRefresh = false): Promise<CachedToken> {
  if (!forceRefresh) {
    if (isFresh(memoryToken)) return memoryToken;
    try {
      const snap = await getFirestore().doc(TOKEN_DOC).get();
      const d = snap.data() as CachedToken | undefined;
      if (d && isFresh(d)) {
        memoryToken = { accessToken: d.accessToken, tokenType: d.tokenType || 'Bearer', expiresAt: Number(d.expiresAt) };
        return memoryToken;
      }
    } catch (e: any) {
      logger.warn('Could not read cached EKART token', { message: e?.message });
    }
  }
  return fetchNewToken(ctx);
}

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

export type EkartMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

/**
 * Calls the EKART API. Returns parsed JSON, or a Buffer when expect === 'pdf'.
 * Throws HttpsError('failed-precondition') carrying EKART's own message on any
 * non-2xx response or a JSON body with `status: false`.
 */
export async function ekartRequest<T = any>(method: EkartMethod, path: string, opts: EkartRequestOptions): Promise<T> {
  const expect = opts.expect || 'json';
  const useAuth = opts.auth !== false;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(opts.query || {})) {
    if (v !== undefined) qs.set(k, String(v));
  }
  const fullPath = qs.toString() ? `${path}?${qs.toString()}` : path;
  const requestBodyForLog = opts.body === undefined ? null : sanitize(opts.body);

  let token = useAuth ? await getToken(opts.ctx) : null;

  for (let attempt = 1; ; attempt++) {
    const started = Date.now();
    const headers: Record<string, string> = { Accept: expect === 'pdf' ? 'application/pdf, application/json' : 'application/json' };
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `${token.tokenType} ${token.accessToken}`;

    const baseRecord = {
      at: new Date().toISOString(),
      function: opts.ctx.fn,
      method,
      path: fullPath,
      requestBody: requestBodyForLog,
      ...(opts.ctx.orderNumber ? { orderNumber: opts.ctx.orderNumber } : {}),
      ...(opts.ctx.vendorId ? { vendorId: opts.ctx.vendorId } : {})
    };

    let res: Response;
    try {
      res = await fetch(EKART_BASE_URL + fullPath, {
        method,
        headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      });
    } catch (e: any) {
      await writeApiLog({ ...baseRecord, status: 0, responseBody: `Network error: ${e?.message || e}`, durationMs: Date.now() - started }, true);
      throw new HttpsError('unavailable', `Could not reach EKART: ${e?.message || e}`);
    }

    const status = res.status;
    const contentType = res.headers.get('content-type') || '';
    const buf = Buffer.from(await res.arrayBuffer());
    const durationMs = Date.now() - started;
    const isPdf = buf.subarray(0, 5).toString('latin1') === '%PDF-';

    if (status === 401 && useAuth && attempt === 1) {
      await writeApiLog({ ...baseRecord, status, responseBody: sanitizeResponseText(buf.toString('utf8')), durationMs, note: 'token rejected; refreshing once' }, true);
      token = await getToken(opts.ctx, true);
      continue;
    }

    if (expect === 'pdf' && status >= 200 && status < 300 && isPdf) {
      await writeApiLog({ ...baseRecord, status, responseBody: `[PDF ${buf.length} bytes]`, durationMs }, false);
      return buf as unknown as T;
    }

    const text = buf.toString('utf8');
    let json: any = null;
    try { json = JSON.parse(text); } catch { /* non-JSON body */ }

    const httpOk = status >= 200 && status < 300;
    const statusFalse = !!json && typeof json === 'object' && json.status === false;
    const failed = !httpOk || (statusFalse && !opts.allowStatusFalse) || (expect === 'pdf') || (httpOk && json === null);

    await writeApiLog({ ...baseRecord, status, contentType, responseBody: sanitizeResponseText(text), durationMs }, failed);

    if (failed) {
      const reason = extractEkartMessage(json ?? text, expect === 'pdf' && httpOk ? 'EKART did not return a PDF' : `HTTP ${status} with no reason given`);
      throw new HttpsError('failed-precondition', `EKART: ${reason}`, { ekartStatus: status, ekartBody: sanitize(json ?? text.slice(0, 1000)) });
    }
    return json as T;
  }
}
