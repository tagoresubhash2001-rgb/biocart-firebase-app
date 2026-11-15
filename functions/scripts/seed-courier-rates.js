/**
 * Seeds Firestore settings/courierRates with the EKART "Elite – Flat Rate Card" (FORWARD / SURFACE).
 * Safe to run again: if the document already exists it is left untouched (admin edits are never overwritten).
 * It is not deployed. Run it from the functions folder, signed in with a Google account that owns the project:
 *
 *   npm run build
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json GCLOUD_PROJECT=bio-cart node scripts/seed-courier-rates.js
 */
const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { DEFAULT_COURIER_RATES } = require('../lib/courierRates.js');

(async () => {
  if (getApps().length === 0) initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'bio-cart' });
  const ref = getFirestore().doc('settings/courierRates');
  const existing = await ref.get();
  if (existing.exists) {
    console.log('settings/courierRates already exists; left unchanged:', JSON.stringify(existing.data()));
    return;
  }
  await ref.set({ ...DEFAULT_COURIER_RATES, source: 'EKART Elite Flat Rate Card (FORWARD/SURFACE)', createdAt: new Date().toISOString() });
  console.log('settings/courierRates seeded:', JSON.stringify((await ref.get()).data()));
})().catch((e) => { console.error('Seeding failed:', e.message || e); process.exit(1); });
