#!/usr/bin/env node
/**
 * Makes BioCart's callable Cloud Functions publicly invokable (Cloud Run "allUsers" → roles/run.invoker).
 *
 * Why: firebase-tools grants public access to a callable only when it is first CREATED. If a create
 * fails half-way (e.g. CPU quota), later deploys are "updates" and never fix it, so the browser gets a
 * CORS / "internal" error. This does exactly what firebase-tools does on create, using the account you
 * are already logged into with `firebase login`. Login/role checks inside each function still apply.
 *
 * Usage:  node scripts/make-callables-public.cjs            (all callables)
 *         node scripts/make-callables-public.cjs nameA nameB
 */
const path = require('path');
const { execSync } = require('child_process');

const PROJECT = 'bio-cart';
const REGION = 'asia-southeast1';
const CALLABLES = [
  'adminMarkDelivered', 'allocateCustomerId', 'cancelEkartShipment', 'cancelOrder', 'checkEkartPincode',
  'clearMustChangePassword', 'createCashfreeOrder', 'createEkartShipment', 'createOrder', 'createVendorAccount',
  'getEkartLabel', 'markCodRemitted', 'markSettlementPaid', 'processOrderRefund', 'provisionBioCartOwner',
  'quoteOrder', 'reconcileVendorAccount', 'registerEkartPickupAddress', 'registerEkartWebhook', 'retryRefund',
  'retryVendorPayout', 'setCourierCharge', 'setProductStock', 'submitProductChange', 'trackEkartShipment',
  'triggerManualSettlement', 'updateFinancialPolicy', 'updateOrderStatus', 'updateVendorCommercials',
  'updateVendorEmail', 'updateVendorOrderStatus', 'uploadMediaAsset', 'verifyCashfreePayment',
];

function loadFirebaseTools() {
  const roots = [];
  try { roots.push(path.join(execSync('npm root -g', { encoding: 'utf8' }).trim(), 'firebase-tools')); } catch { /* ignore */ }
  roots.push(path.join(__dirname, '..', 'node_modules', 'firebase-tools'));
  for (const r of roots) {
    try {
      return {
        auth: require(path.join(r, 'lib', 'auth.js')),
        requireAuth: require(path.join(r, 'lib', 'requireAuth.js')).requireAuth,
        run: require(path.join(r, 'lib', 'gcp', 'run.js')),
      };
    } catch { /* try next */ }
  }
  throw new Error('firebase-tools not found. Install it with: npm install -g firebase-tools');
}

(async () => {
  const { auth, requireAuth, run } = loadFirebaseTools();
  const account = auth.getGlobalDefaultAccount();
  if (!account) throw new Error('Not logged in. Run: firebase login');
  await requireAuth({ project: PROJECT, user: account.user, tokens: account.tokens });

  const names = process.argv.slice(2).length ? process.argv.slice(2) : CALLABLES;
  let failed = 0;
  for (const n of names) {
    const service = `projects/${PROJECT}/locations/${REGION}/services/${n.toLowerCase()}`;
    try {
      await run.setInvokerUpdate(PROJECT, service, ['public']);
      console.log(`PUBLIC  ${n}`);
    } catch (e) {
      failed++;
      console.log(`FAILED  ${n}  ${e.message}`);
    }
  }
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('ERROR', e.message); process.exit(1); });
