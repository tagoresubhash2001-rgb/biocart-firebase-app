/**
 * One-off EKART smoke test. NOT deployed (lives outside src/).
 *
 * Signs in to EKART and checks serviceability for two PIN codes.
 * It does NOT create a shipment (shipments cost money and trigger a real pickup).
 * It never prints the token, the password or the client id.
 *
 * Run (credentials come only from environment variables):
 *   EKART_CLIENT_ID=... EKART_USERNAME=... EKART_PASSWORD=... node functions/scripts/ekart-smoke.ts
 */
const BASE = 'https://app.elite.ekartlogistics.in';
const PINCODES = ['522001', '517501'];

async function main(): Promise<void> {
  const clientId = (process.env.EKART_CLIENT_ID || '').trim();
  const username = (process.env.EKART_USERNAME || '').trim();
  const password = process.env.EKART_PASSWORD || '';
  const missing = [['EKART_CLIENT_ID', clientId], ['EKART_USERNAME', username], ['EKART_PASSWORD', password]]
    .filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) {
    console.error(`Missing environment variable(s): ${missing.join(', ')}. Nothing was sent to EKART.`);
    process.exit(2);
  }

  const authRes = await fetch(`${BASE}/integrations/v2/auth/token/${encodeURIComponent(clientId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const authJson: any = await authRes.json().catch(() => ({}));
  if (!authRes.ok || !authJson.access_token) {
    console.error(`AUTH FAILED  http=${authRes.status}  message=${authJson.message ?? ''}  description=${authJson.description ?? ''}`);
    process.exit(1);
  }
  console.log(`AUTH OK  http=${authRes.status}  token_type=${authJson.token_type}  expires_in=${authJson.expires_in}s  (token not shown)`);

  let failed = false;
  for (const pin of PINCODES) {
    const res = await fetch(`${BASE}/api/v2/serviceability/${pin}`, {
      headers: { Authorization: `${authJson.token_type || 'Bearer'} ${authJson.access_token}`, Accept: 'application/json' }
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) failed = true;
    console.log(`PIN ${pin}  http=${res.status}  status=${json.status}  remark=${json.remark ?? json.description ?? json.message ?? ''}`);
  }
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error('SMOKE TEST ERROR:', e?.message || e);
  process.exit(1);
});
