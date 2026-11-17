// Firestore and Storage security-rules tests, run against the LOCAL emulators with the rules files
// from this repository (firestore.rules, storage.rules). Usage: node tests/e2e/rules.cjs
const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, collection, getDocs, query, where } = require('firebase/firestore');
const { ref, getBytes, uploadBytes } = require('firebase/storage');
const { ACCOUNTS } = require('./seed.cjs');

const ROOT = path.join(__dirname, '..', '..');
const results = [];
const check = async (id, title, promise) => {
  try { await promise; results.push({ id, title, pass: true }); console.log(`PASS  [${id}] ${title}`); }
  catch (e) { results.push({ id, title, pass: false, error: String(e.message || e).slice(0, 200) }); console.log(`FAIL  [${id}] ${title}\n        -> ${String(e.message || e).slice(0, 200)}`); }
};

(async () => {
  const env = await initializeTestEnvironment({
    projectId: 'bio-cart',
    firestore: { host: '127.0.0.1', port: 8080, rules: fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8') },
    storage: { host: '127.0.0.1', port: 9199, rules: fs.readFileSync(path.join(ROOT, 'storage.rules'), 'utf8') },
  });
  const BUCKET = 'gs://bio-cart.firebasestorage.app';
  const F = ACCOUNTS.farmsVendor.uid;
  const as = (a) => env.authenticatedContext(a.uid, { email: a.email, email_verified: true });
  const anon = env.unauthenticatedContext();
  const customer = as(ACCOUNTS.customer), vendorB = as(ACCOUNTS.biocartVendor), vendorF = as(ACCOUNTS.farmsVendor), admin = as(ACCOUNTS.admin);
  const other = env.authenticatedContext('test-other-customer', { email: 'other@biocart.test', email_verified: true });

  // Fixture data written with rules switched off (emulator only).
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'orders/TEST-RULES-1'), { id: 'TEST-RULES-1', userId: ACCOUNTS.customer.uid, status: 'confirmed', totalAmountPaise: 100000, isTest: true });
    await setDoc(doc(db, 'orders/TEST-RULES-1/vendor_orders/biocart'), { vendorId: 'biocart', userId: ACCOUNTS.customer.uid, orderNumber: 'TEST-RULES-1', vendorPayablePaise: 80000, isTest: true });
    await setDoc(doc(db, 'shipments/ekart_TEST-RULES-1_biocart'), { vendorId: 'biocart', userId: ACCOUNTS.customer.uid, status: 'pickup_pending', isTest: true });
    await setDoc(doc(db, 'system_private/ekart_token'), { accessToken: 'x' });
    await setDoc(doc(db, 'ekart_api_logs/log1'), { path: '/api/v1/package/create', status: 400 });
    await setDoc(doc(db, 'financial_ledger/l1'), { vendorId: 'biocart', amountPaise: 1 });
    await setDoc(doc(db, 'vendor_settlements/s1'), { vendorId: 'biocart', amountPaise: 1 });
    await setDoc(doc(db, 'vendors/biocart/private/settlement'), { accountNumber: '000111222333' });
    await setDoc(doc(db, 'users/test-other-customer'), { uid: 'test-other-customer', role: 'customer', status: 'active' });
    const st = ctx.storage(BUCKET);
    const pdf = new Uint8Array([37, 80, 68, 70]);
    await uploadBytes(ref(st, 'labels/biocart/TESTAWB1.pdf'), pdf, { contentType: 'application/pdf' });
    await uploadBytes(ref(st, 'shipping-labels/TESTAWB1.pdf'), pdf, { contentType: 'application/pdf' });
    await uploadBytes(ref(st, `invoices/${ACCOUNTS.customer.uid}/TEST-RULES-1.pdf`), pdf, { contentType: 'application/pdf' });
  });

  // --- no unauthenticated writes ---
  for (const p of ['products/x', 'orders/x', 'users/x', 'vendors/x', 'settings/financialPolicy', 'settings/courierRates', 'vendor_wallets/biocart', 'financial_ledger/x', 'inventory/test-honey', 'coupons/x', 'shipments/x', 'audit_logs/x']) {
    await check('SEC-ANON-WRITE', `Signed-out visitor cannot write ${p}`, assertFails(setDoc(doc(anon.firestore(), p), { hacked: true })));
  }
  await check('SEC-ANON-READ', 'Signed-out visitor can still read the public catalogue', assertSucceeds(getDoc(doc(anon.firestore(), 'products/test-honey'))));
  await check('SEC-ANON-ORDERS', 'Signed-out visitor cannot read an order', assertFails(getDoc(doc(anon.firestore(), 'orders/TEST-RULES-1'))));

  // --- server-only collections ---
  for (const [who, ctx] of [['signed-out visitor', anon], ['customer', customer], ['vendor', vendorB], ['admin (browser)', admin]]) {
    await check('SEC-PRIVATE', `system_private is not readable by ${who}`, assertFails(getDoc(doc(ctx.firestore(), 'system_private/ekart_token'))));
    await check('SEC-PRIVATE', `system_private is not writable by ${who}`, assertFails(setDoc(doc(ctx.firestore(), 'system_private/ekart_token'), { accessToken: 'y' })));
  }
  for (const [who, ctx] of [['signed-out visitor', anon], ['customer', customer], ['vendor', vendorB]]) {
    await check('SEC-EKART-LOGS', `ekart_api_logs is not readable by ${who}`, assertFails(getDoc(doc(ctx.firestore(), 'ekart_api_logs/log1'))));
    await check('SEC-EKART-LOGS', `ekart_api_logs is not writable by ${who}`, assertFails(addDoc(collection(ctx.firestore(), 'ekart_api_logs'), { fake: true })));
  }

  // --- customers: only their own data, never money fields ---
  await check('SEC-CUST', 'Customer can read their own order', assertSucceeds(getDoc(doc(customer.firestore(), 'orders/TEST-RULES-1'))));
  await check('SEC-CUST', "Another customer cannot read someone else's order", assertFails(getDoc(doc(other.firestore(), 'orders/TEST-RULES-1'))));
  await check('SEC-CUST', 'Customer cannot create an order directly (must go through the backend)', assertFails(setDoc(doc(customer.firestore(), 'orders/FAKE-1'), { userId: ACCOUNTS.customer.uid, totalAmountPaise: 1, status: 'confirmed' })));
  await check('SEC-CUST', 'Customer cannot change their own order (status / amounts)', assertFails(updateDoc(doc(customer.firestore(), 'orders/TEST-RULES-1'), { status: 'delivered', totalAmountPaise: 1 })));
  await check('SEC-CUST', 'Customer cannot make themselves an admin', assertFails(updateDoc(doc(customer.firestore(), `users/${ACCOUNTS.customer.uid}`), { role: 'super_admin' })));
  await check('SEC-CUST', 'Customer cannot read a vendor wallet', assertFails(getDoc(doc(customer.firestore(), 'vendor_wallets/biocart'))));
  await check('SEC-CUST', 'Customer cannot read the money ledger', assertFails(getDoc(doc(customer.firestore(), 'financial_ledger/l1'))));
  await check('SEC-CUST', 'Customer cannot change shop settings (COD switch, delivery fee, courier rates)', assertFails(setDoc(doc(customer.firestore(), 'settings/financialPolicy'), { codEnabled: true }, { merge: true })));
  await check('SEC-CUST', 'Customer cannot change stock', assertFails(updateDoc(doc(customer.firestore(), 'inventory/test-honey'), { availableQuantity: 999 })));

  // --- vendors: only their own shop ---
  await check('SEC-VENDOR', 'Vendor can read their own wallet', assertSucceeds(getDoc(doc(vendorB.firestore(), 'vendor_wallets/biocart'))));
  await check('SEC-VENDOR', "Vendor cannot read another vendor's wallet", assertFails(getDoc(doc(vendorF.firestore(), 'vendor_wallets/biocart'))));
  await check('SEC-VENDOR', 'Vendor cannot write their own wallet', assertFails(updateDoc(doc(vendorB.firestore(), 'vendor_wallets/biocart'), { available: 99999999 })));
  await check('SEC-VENDOR', 'Vendor can read their own order slice', assertSucceeds(getDoc(doc(vendorB.firestore(), 'orders/TEST-RULES-1/vendor_orders/biocart'))));
  await check('SEC-VENDOR', "Vendor cannot read another vendor's order slice", assertFails(getDoc(doc(vendorF.firestore(), 'orders/TEST-RULES-1/vendor_orders/biocart'))));
  await check('SEC-VENDOR', 'Vendor cannot edit an order slice (status, payout, courier charge)', assertFails(updateDoc(doc(vendorB.firestore(), 'orders/TEST-RULES-1/vendor_orders/biocart'), { vendorPayablePaise: 99999999, status: 'delivered' })));
  await check('SEC-VENDOR', "Vendor cannot read another vendor's bank details", assertFails(getDoc(doc(vendorF.firestore(), 'vendors/biocart/private/settlement'))));
  await check('SEC-VENDOR', "Vendor cannot read another vendor's shipment", assertFails(getDoc(doc(vendorF.firestore(), 'shipments/ekart_TEST-RULES-1_biocart'))));
  await check('SEC-VENDOR', 'Vendor cannot write a shipment (no invented AWB)', assertFails(setDoc(doc(vendorB.firestore(), 'shipments/ekart_FAKE_biocart'), { vendorId: 'biocart', awb: 'FAKE123' })));
  await check('SEC-VENDOR', 'Vendor cannot change their own commission', assertFails(updateDoc(doc(vendorB.firestore(), 'vendors/biocart'), { commissionRate: 1, commission: { baseRateBps: 100 } })));
  await check('SEC-VENDOR', "Vendor cannot edit another vendor's product", assertFails(updateDoc(doc(vendorF.firestore(), 'products/test-neem-oil'), { price: 1 })));
  await check('SEC-VENDOR', 'Vendor cannot delete a product (no hard deletes)', assertFails(deleteDoc(doc(vendorB.firestore(), 'products/test-neem-oil'))));
  await check('SEC-VENDOR', 'Vendor cannot change shop settings', assertFails(setDoc(doc(vendorB.firestore(), 'settings/courierRates'), { upTo2kg: 1 }, { merge: true })));
  await check('SEC-VENDOR', 'Vendor cannot read the audit log', assertFails(getDocs(collection(vendorB.firestore(), 'audit_logs'))));
  // The Biocart vendor's id ('biocart') is not its owner's login id: ownership comes from vendors/biocart.ownerUid.
  await check('SEC-VENDOR', 'Vendor whose id differs from the login id can read its own ledger entries', assertSucceeds(getDoc(doc(vendorB.firestore(), 'financial_ledger/l1'))));
  await check('SEC-VENDOR', 'Vendor whose id differs from the login id can read its own settlements', assertSucceeds(getDoc(doc(vendorB.firestore(), 'vendor_settlements/s1'))));
  await check('SEC-VENDOR', "Vendor cannot read another vendor's ledger entries", assertFails(getDoc(doc(vendorF.firestore(), 'financial_ledger/l1'))));
  await check('SEC-VENDOR', "Vendor cannot read another vendor's settlements", assertFails(getDoc(doc(vendorF.firestore(), 'vendor_settlements/s1'))));
  await check('SEC-CUST', 'Customer cannot read settlements', assertFails(getDoc(doc(customer.firestore(), 'vendor_settlements/s1'))));
  await check('SEC-VENDOR', "Vendor cannot list other vendors' orders", assertFails(getDocs(query(collection(vendorF.firestore(), 'orders/TEST-RULES-1/vendor_orders'), where('vendorId', '==', 'biocart')))));

  // --- admin sanity ---
  await check('SEC-ADMIN', 'Admin can read any order', assertSucceeds(getDoc(doc(admin.firestore(), 'orders/TEST-RULES-1'))));
  await check('SEC-ADMIN', 'Even an admin browser cannot write the money ledger or wallets directly', Promise.all([assertFails(setDoc(doc(admin.firestore(), 'financial_ledger/x'), { amountPaise: 1 })), assertFails(updateDoc(doc(admin.firestore(), 'vendor_wallets/biocart'), { available: 1 }))]));

  // --- storage ---
  const S = (ctx) => ctx.storage(BUCKET);
  for (const [who, ctx] of [['signed-out visitor', anon], ['customer', customer], ['another vendor', vendorF]]) {
    await check('SEC-LABELS', `Shipping label (labels/…) is not readable by ${who}`, assertFails(getBytes(ref(S(ctx), 'labels/biocart/TESTAWB1.pdf'))));
    await check('SEC-LABELS', `Shipping label (shipping-labels/…) is not readable by ${who}`, assertFails(getBytes(ref(S(ctx), 'shipping-labels/TESTAWB1.pdf'))));
  }
  await check('SEC-STORAGE', 'Signed-out visitor cannot upload a product image', assertFails(uploadBytes(ref(S(anon), 'products/hack.png'), new Uint8Array([1, 2, 3]), { contentType: 'image/png' })));
  await check('SEC-STORAGE', 'Customer cannot upload a product image', assertFails(uploadBytes(ref(S(customer), 'products/hack.png'), new Uint8Array([1, 2, 3]), { contentType: 'image/png' })));
  await check('SEC-STORAGE', "Customer can read their own invoice", assertSucceeds(getBytes(ref(S(customer), `invoices/${ACCOUNTS.customer.uid}/TEST-RULES-1.pdf`))));
  await check('SEC-STORAGE', "Another customer cannot read someone else's invoice", assertFails(getBytes(ref(S(other), `invoices/${ACCOUNTS.customer.uid}/TEST-RULES-1.pdf`))));
  await check('SEC-STORAGE', 'Signed-out visitor cannot read an invoice', assertFails(getBytes(ref(S(anon), `invoices/${ACCOUNTS.customer.uid}/TEST-RULES-1.pdf`))));
  await check('SEC-STORAGE', 'Nobody can upload a file outside the allowed folders', assertFails(uploadBytes(ref(S(vendorB), 'anything/else.txt'), new Uint8Array([1]), { contentType: 'text/plain' })));

  await env.cleanup();
  const fails = results.filter((r) => !r.pass).length;
  fs.mkdirSync(path.join(ROOT, 'qa-report'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'qa-report', 'rules.json'), JSON.stringify(results, null, 1));
  console.log(`\nSECURITY RULES: ${results.length - fails} pass / ${fails} fail of ${results.length} checks`);
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('RULES TEST ERROR', e); process.exit(2); });
