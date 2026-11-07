// End-to-end walkthrough of the REWRITTEN BioCart backend (compiled functions/lib),
// Firestore/Auth/Storage in memory, Cashfree + EKART HTTP APIs mocked at fetch() level.
const Module = require('module');
const path = require('path');
const crypto = require('crypto');
const fake = require('./fakeAdmin.cjs');
const FN_DIR = process.argv[2] || path.join(__dirname, '..', '..', 'functions');
const orig = Module._load;
Module._load = function (req) {
  if (req === 'firebase-admin/firestore') return fake.firestoreMod;
  if (req === 'firebase-admin/auth') return fake.authMod;
  if (req === 'firebase-admin/storage') return fake.storageMod;
  if (req === 'firebase-admin/app') return fake.appMod;
  if (req === 'firebase-admin') return fake.adminRoot;
  return orig.apply(this, arguments);
};
Object.assign(process.env, {
  GCLOUD_PROJECT: 'demo-biocart', CASHFREE_APP_ID: 'TESTAPP', CASHFREE_SECRET_KEY: 'cfsk_test_secret', CASHFREE_ENVIRONMENT: 'SANDBOX',
  EKART_CLIENT_ID: 'EKART_TEST', EKART_USERNAME: 'u', EKART_PASSWORD: 'p', EKART_WEBHOOK_SECRET: 'whsec_1234567890',
});

// ---------------- mocked external APIs ----------------
const cf = { orders: {}, refunds: {}, calls: [] };
const ek = { shipments: {}, calls: [], track: {}, estimates: [] };
global.fetch = async (url, opts = {}) => {
  const u = new URL(url); const body = opts.body ? JSON.parse(opts.body) : null; const m = opts.method || 'GET';
  const json = (status, data) => ({ ok: status < 300, status, text: async () => JSON.stringify(data), json: async () => data, arrayBuffer: async () => Buffer.from('%PDF-1.4 label') });
  if (u.host.includes('cashfree.com')) {
    cf.calls.push(`${m} ${u.pathname}`);
    if (opts.headers['x-client-secret'] !== 'cfsk_test_secret') return json(401, { message: 'auth' });
    let mm;
    if (m === 'POST' && u.pathname === '/pg/orders') {
      if (cf.orders[body.order_id]) return json(409, { message: 'order_already_exists' });
      cf.orders[body.order_id] = { order_id: body.order_id, order_amount: body.order_amount, order_status: 'ACTIVE', payment_session_id: 'session_' + body.order_id, cf_order_id: 1 };
      return json(200, cf.orders[body.order_id]);
    }
    if ((mm = u.pathname.match(/^\/pg\/orders\/([^/]+)$/))) {
      const o = cf.orders[mm[1]]; if (!o) return json(404, { message: 'not found' });
      if (m === 'PATCH') { o.order_status = body.order_status; return json(200, o); }
      return json(200, o);
    }
    if ((mm = u.pathname.match(/^\/pg\/orders\/([^/]+)\/payments$/))) return json(200, [{ payment_status: 'SUCCESS', cf_payment_id: 'PAY' + mm[1], payment_group: 'upi' }]);
    if ((mm = u.pathname.match(/^\/pg\/orders\/([^/]+)\/refunds$/))) {
      if (cf.refunds[body.refund_id]) return json(409, { message: 'refund exists' });
      cf.refunds[body.refund_id] = { ...body, refund_status: 'PENDING', cf_refund_id: 'CFR' + Object.keys(cf.refunds).length };
      return json(200, cf.refunds[body.refund_id]);
    }
    if ((mm = u.pathname.match(/^\/pg\/orders\/([^/]+)\/refunds\/([^/]+)$/))) return json(200, cf.refunds[mm[2]] || {});
    return json(404, { message: 'unmocked ' + u.pathname });
  }
  if (u.host.includes('ekartlogistics')) {
    ek.calls.push(`${m} ${u.pathname}`);
    if (u.pathname.startsWith('/integrations/v2/auth/token/')) return json(200, { access_token: 'tok', token_type: 'Bearer', expires_in: 86400, scope: 'core:all' });
    if (u.pathname.startsWith('/api/v2/serviceability/')) {
      const pin = u.pathname.split('/').pop();
      return json(200, { status: pin !== '999999', pincode: Number(pin), remark: '', details: { cod: true, max_cod_amount: 25000, forward_pickup: true, forward_drop: pin !== '999999', city: 'Guntur', state: 'AP' } });
    }
    if (u.pathname === '/api/v2/address') return json(200, { status: true, alias: body.alias, remark: 'ok' });
    if (u.pathname === '/data/v3/serviceability') { ek.estimates.push(body); return json(200, [
      { courierGroup: 'EKART_SURFACE', forwardDeliveredCharges: { totalForwardDeliveredEstimate: '60.00' }, rtoDeliveredCharges: { totalRTODeliveredEstimate: '110.00' } },
      { courierGroup: 'EKART_EXPRESS', forwardDeliveredCharges: { totalForwardDeliveredEstimate: '95.00' }, rtoDeliveredCharges: { totalRTODeliveredEstimate: '180.00' } },
    ]); }
    if (u.pathname === '/api/v1/package/create') {
      const id = '500999A' + (Object.keys(ek.shipments).length + 1000);
      ek.shipments[id] = body; return json(200, { status: true, remark: 'Successfully created shipment', tracking_id: id, vendor: 'EKART', barcodes: { wbn: 'W' + id, order: body.order_number } });
    }
    if (u.pathname.startsWith('/api/v1/track/')) { const id = u.pathname.split('/').pop(); return json(200, ek.track[id] || { _id: id, track: { status: 'Pickup Pending', ctime: Date.now(), desc: 'Booked' } }); }
    if (u.pathname === '/api/v1/package/label') return json(200, {});
    return json(404, { message: 'unmocked ' + u.pathname });
  }
  return json(404, { message: 'unexpected host ' + u.host });
};

const fn = require(path.join(FN_DIR, 'lib/index.js'));
const settlement = require(path.join(FN_DIR, 'lib/settlement.js'));
const { store } = fake;
const get = (p) => store.get(p);
const results = [];
const check = (id, title, pass, evidence) => { results.push({ id, title, pass: !!pass, evidence }); console.log(`${pass ? 'PASS' : 'FAIL'}  [${id}] ${title}\n        -> ${evidence}`); };
const call = async (name, auth, data) => { try { return { ok: true, data: await fn[name].run({ auth, data, rawRequest: { ip: '1.1.1.1' } }) }; } catch (e) { return { ok: false, err: `${e.code || ''} ${e.message}` }; } };
const http = (name, body, headers = {}) => new Promise((resolve) => {
  const raw = JSON.stringify(body);
  const res = { statusCode: 200, status(c) { this.statusCode = c; return this; }, send(b) { resolve({ code: this.statusCode, body: b }); }, json(b) { resolve({ code: this.statusCode, body: b }); }, set() { return this; }, setHeader() {}, getHeader() {}, end() { resolve({ code: this.statusCode }); }, on() {} };
  const h = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  const req = { method: 'POST', headers: h, body, rawBody: Buffer.from(raw), get: (k) => h[k.toLowerCase()], header: (k) => h[k.toLowerCase()], url: '/', path: '/' };
  fn[name](req, res);
});
const signCf = (body) => { const ts = String(Date.now()); const sig = crypto.createHmac('sha256', 'cfsk_test_secret').update(ts + JSON.stringify(body)).digest('base64'); return { 'x-webhook-signature': sig, 'x-webhook-timestamp': ts }; };
const tok = (uid, extra = {}) => ({ uid, token: { email_verified: true, email: `${uid}@test.in`, ...extra } });
const ADDR = { name: 'Ramesh', phone: '9876543210', address: '12 Main Road', city: 'Guntur', state: 'Andhra Pradesh', zip: '522001' };
const vendorOrder = (o, v) => get(`orders/${o}/vendor_orders/${v}`);
const wallet = (v) => get(`vendor_wallets/${v}`) || {};
const ledger = () => [...store.entries()].filter(([k]) => k.startsWith('financial_ledger/')).map(([, v]) => v);

(async () => {
  // ---------- seed ----------
  store.set('users/admin1', { uid: 'admin1', email: 'tagoresubhash2001@gmail.com', name: 'Admin', role: 'super_admin', status: 'active' });
  fake.users.set('admin1', { uid: 'admin1', email: 'tagoresubhash2001@gmail.com', metadata: {} });
  const ADMIN = tok('admin1', { email: 'tagoresubhash2001@gmail.com' });
  await call('provisionBioCartOwner', ADMIN, {});
  const vamsi = (await call('createVendorAccount', ADMIN, { businessName: 'Vamsi Farms', ownerName: 'Vamsi', email: 'vamsi@farms.in', phone: '9000000001', commissionRate: 15 })).data.uid;
  const ravi = (await call('createVendorAccount', ADMIN, { businessName: 'Ravi Organics', ownerName: 'Ravi', email: 'ravi@org.in', phone: '9000000002', commissionRate: 20 })).data.uid;
  store.set('vendors/suspended1', { id: 'suspended1', storeName: 'Old Seller', status: 'suspended', commission: { baseRateBps: 1000 } });
  const P = (id, name, price, vendorId, extra = {}) => { store.set(`products/${id}`, { id, name, price, mrp: price, vendorId, active: true, approvalStatus: 'approved', category: 'Food', ...extra }); store.set(`inventory/${id}`, { productId: id, vendorId, availableQuantity: 5, quantity: 5, reservedQuantity: 0 }); };
  P('rice', 'Organic Rice', 100, 'biocart'); P('honey', 'Organic Honey', 900, vamsi); P('oil', 'Cold Pressed Oil', 700, ravi);
  P('ghee', 'Pending Ghee', 400, vamsi, { approvalStatus: 'pending', source: 'vendor_created' }); P('old', 'Old Item', 300, 'suspended1');

  const noCommission = await call('quoteOrder', null, { items: [{ productId: 'rice', quantity: 1 }] });
  check('R1', 'Product of a vendor with no commission set cannot be sold', !noCommission.ok, noCommission.err || 'quoted');
  await call('updateVendorCommercials', ADMIN, { vendorId: 'biocart', commissionRate: 10 });

  // ---------- quotes ----------
  const q1 = await call('quoteOrder', null, { items: [{ productId: 'rice', quantity: 1 }] });
  check('R3', '₹100 cart → ₹99 shipping, customer pays ₹199, no GST added', q1.ok && q1.data.shippingAmount === 99 && q1.data.totalAmount === 199 && q1.data.taxAmount === 0, JSON.stringify(q1.data && { sub: q1.data.subtotal, ship: q1.data.shippingAmount, total: q1.data.totalAmount }));
  const cart = [{ productId: 'honey', quantity: 1 }, { productId: 'oil', quantity: 1 }];
  const q2 = await call('quoteOrder', null, { items: cart });
  check('R3', '₹1,600 cart → free shipping, total ₹1,600', q2.ok && q2.data.shippingAmount === 0 && q2.data.totalAmount === 1600, JSON.stringify(q2.data && { ship: q2.data.shippingAmount, total: q2.data.totalAmount }));
  P('edge', 'Edge Item', 1498, vamsi);
  const q3 = await call('quoteOrder', null, { items: [{ productId: 'edge', quantity: 1 }] });
  store.set('products/edge', { ...get('products/edge'), price: 1499 });
  const q4 = await call('quoteOrder', null, { items: [{ productId: 'edge', quantity: 1 }] });
  check('R3', '₹1,498 → ₹99 shipping; ₹1,499 → free', q3.data?.shippingAmount === 99 && q4.data?.shippingAmount === 0, `1498→${q3.data?.shippingAmount}, 1499→${q4.data?.shippingAmount}`);
  // Admin delivery/COD options (Marketplace Money Rules)
  const setRules = await call('updateFinancialPolicy', ADMIN, { freeShippingThreshold: 999, codEnabled: true, codMinOrder: 200, codMaxOrder: 1000 });
  store.set('products/edge', { ...get('products/edge'), price: 999, codAllowed: true });
  const q999 = await call('quoteOrder', null, { items: [{ productId: 'edge', quantity: 1 }] });
  store.set('products/edge', { ...get('products/edge'), price: 50 });
  const qCodLow = await call('quoteOrder', null, { items: [{ productId: 'edge', quantity: 1 }] });
  await call('updateFinancialPolicy', ADMIN, { freeShippingEnabled: false });
  const qOff = await call('quoteOrder', null, { items: cart });
  const badRange = await call('updateFinancialPolicy', ADMIN, { codMinOrder: 2000 });
  const vendorTry = await call('updateFinancialPolicy', tok('uid_1'), { shippingFee: 0 });
  check('FIX-RULES', 'Admin can move free delivery to ₹999, switch free delivery off, and set a COD order range (vendors cannot)',
    setRules.ok && q999.data?.shippingAmount === 0 && q999.data?.codAvailable === true && qCodLow.data?.codAvailable === false
    && qOff.data?.shippingAmount === 99 && qOff.data?.freeShippingEnabled === false && !badRange.ok && !vendorTry.ok,
    `999→ship ${q999.data?.shippingAmount} cod ${q999.data?.codAvailable}; ₹149 cod ${qCodLow.data?.codAvailable}; off→₹1600 ship ${qOff.data?.shippingAmount}; badRange=${badRange.ok}; vendor=${vendorTry.ok}`);
  // restore the default rules for the rest of the suite
  await call('updateFinancialPolicy', ADMIN, { freeShippingEnabled: true, freeShippingThreshold: 1499, codEnabled: false, codMinOrder: 0, codMaxOrder: 5000 });
  store.set('products/edge', { ...get('products/edge'), price: 1499, codAllowed: false });
  const qs = await call('quoteOrder', null, { items: [{ productId: 'old', quantity: 1 }] });
  const qp = await call('quoteOrder', null, { items: [{ productId: 'ghee', quantity: 1 }] });
  check('BC-ADM-021/032', 'Suspended-vendor and unapproved products are rejected', !qs.ok && !qp.ok, `suspended: ${qs.err} | pending: ${qp.err}`);

  // ---------- create order ----------
  const CUST = tok('cust1');
  const o1 = await call('createOrder', CUST, { items: cart, shippingAddress: ADDR, paymentMethod: 'cashfree', checkoutId: 'chk_0000001' });
  const oid = o1.data?.orderId;
  const order = get(`orders/${oid}`);
  check('BC-BIZ-008/009', 'Order created as awaiting_payment with 2 vendor sub-orders', o1.ok && order?.status === 'awaiting_payment' && vendorOrder(oid, vamsi) && vendorOrder(oid, ravi), `${oid} status=${order?.status} err=${o1.err || ''}`);
  check('LOGIC-01 timing', 'No wallet/ledger money before payment', !(wallet(vamsi).pending > 0) && ledger().length === 0, `vamsi pending=${wallet(vamsi).pending || 0}, ledger entries=${ledger().length}`);
  check('BC-VEN-048', 'Stock reserved (not sold) while waiting for payment', get('inventory/honey').availableQuantity === 4 && get('inventory/honey').reservedQuantity === 1 && get('inventory/honey').quantity === 5, JSON.stringify(get('inventory/honey')));
  check('BC-VEN-071', 'Vendor sub-order has the delivery address snapshot + userId', vendorOrder(oid, vamsi)?.fulfilment?.zip === '522001' && vendorOrder(oid, vamsi)?.userId === 'cust1', JSON.stringify(vendorOrder(oid, vamsi)?.fulfilment));
  const o1b = await call('createOrder', CUST, { items: cart, shippingAddress: ADDR, paymentMethod: 'cashfree', checkoutId: 'chk_0000001' });
  check('BC-CUS-059', 'Same checkout submitted twice → same order, stock unchanged', o1b.data?.orderId === oid && get('inventory/honey').availableQuantity === 4, `second=${o1b.data?.orderId} reused=${o1b.data?.reused}`);
  const bad = await call('createOrder', CUST, { items: cart, shippingAddress: { ...ADDR, zip: '999999' }, paymentMethod: 'cashfree', checkoutId: 'chk_0000002' });
  check('BC-SHP-003', 'Unserviceable PIN (EKART says no) is rejected', !bad.ok, bad.err);
  const cod = await call('createOrder', CUST, { items: cart, shippingAddress: ADDR, paymentMethod: 'cod', checkoutId: 'chk_0000003' });
  check('R4', 'COD rejected while admin COD switch is OFF', !cod.ok, cod.err);

  // ---------- payment ----------
  const s1 = await call('createCashfreeOrder', CUST, { orderId: oid });
  check('BC-PAY-002/003', 'Real Cashfree order created with server amount ₹1600, session returned', s1.ok && s1.data.paymentSessionId === 'session_' + oid && cf.orders[oid].order_amount === 1600, `amount sent=${cf.orders[oid]?.order_amount} session=${s1.data?.paymentSessionId} err=${s1.err || ''}`);
  const s1b = await call('createCashfreeOrder', CUST, { orderId: oid });
  check('BC-CUS-060', 'Retrying payment reuses the same Cashfree order (no second charge)', s1b.data?.paymentSessionId === s1.data?.paymentSessionId && cf.calls.filter((c) => c === 'POST /pg/orders').length === 1, `POST /orders calls=${cf.calls.filter((c) => c === 'POST /pg/orders').length}`);
  const other = await call('createCashfreeOrder', tok('intruder'), { orderId: oid });
  check('BC-SEC', "Another customer cannot start payment for someone's order", !other.ok, other.err);
  const v0 = await call('verifyCashfreePayment', CUST, { orderId: oid });
  check('BC-PAY-009', 'Before paying, verify says PENDING and books nothing', v0.data?.success === false && !get(`orders/${oid}`).financialsAllocated, JSON.stringify(v0.data));
  const evt = { type: 'PAYMENT_SUCCESS_WEBHOOK', event_time: '2026-11-06T10:00:00', data: { order: { order_id: oid, order_amount: 1600, order_currency: 'INR' }, payment: { cf_payment_id: 'P1', payment_status: 'SUCCESS' } } };
  const forged = await http('cashfreePaymentWebhook', evt, {});
  const forged2 = await http('cashfreePaymentWebhook', evt, { 'x-webhook-signature': 'abc', 'x-webhook-timestamp': String(Date.now()) });
  check('BC-PAY-005', 'Unsigned / wrongly signed webhook rejected (401), order untouched', forged.code === 401 && forged2.code === 401 && !get(`orders/${oid}`).financialsAllocated, `unsigned=${forged.code} badSig=${forged2.code}`);
  // customer pays → Cashfree marks PAID → signed webhook
  cf.orders[oid].order_status = 'PAID';
  const w1 = await http('cashfreePaymentWebhook', evt, signCf(evt));
  const w2 = await http('cashfreePaymentWebhook', evt, signCf(evt));
  const paid = get(`orders/${oid}`);
  check('BC-PAY-006/007', 'Signed webhook confirms order once; duplicate webhook ignored', w1.code === 200 && paid.financialsAllocated && paid.status === 'confirmed' && paid.paymentStatus === 'paid' && ledger().filter((e) => e.entryType === 'vendor_sale_credit').length === 2, `w1=${w1.code} w2=${JSON.stringify(w2.body)} status=${paid.status}`);
  check('Stock', 'After payment stock is sold (reserved→sold), not double-deducted', get('inventory/honey').availableQuantity === 4 && get('inventory/honey').reservedQuantity === 0 && get('inventory/honey').quantity === 4, JSON.stringify(get('inventory/honey')));
  const vo = vendorOrder(oid, vamsi), ro = vendorOrder(oid, ravi);
  check('R1', 'Vamsi 15% on ₹900 → ₹765 vendor / ₹135 BioCart; Ravi 20% on ₹700 → ₹560 / ₹140', vo.vendorPayablePaise === 76500 && vo.commissionPaise === 13500 && ro.vendorPayablePaise === 56000 && ro.commissionPaise === 14000, `vamsi ${vo.vendorPayablePaise}/${vo.commissionPaise}, ravi ${ro.vendorPayablePaise}/${ro.commissionPaise}`);
  check('R2', 'Gateway fee not estimated; marked pending reconciliation; vendor share untouched', paid.financialSummary.gatewayFeeStatus === 'pending_reconciliation' && wallet(vamsi).pending === 76500, `wallet pending=${wallet(vamsi).pending}`);
  const company = get('company_wallet/main') || {};
  check('LOGIC-02', 'Company wallet: commission ₹275 booked', company.commissionEarnedPaise === 27500, JSON.stringify(company));
  const pdfFile = [...fake.files.keys()].find((k) => k.endsWith(`invoices/cust1/${oid}.pdf`));
  const pdfText = pdfFile ? fake.files.get(pdfFile).toString('latin1') : '';
  check('LOGIC-11 / R8 / R9', 'Order-confirmation PDF created after payment (Bill of Supply, no fake GSTIN); WhatsApp skipped while disabled',
    !!get(`orders/${oid}`).pdfUrl && pdfText.startsWith('%PDF') && !pdfText.includes('36AABCS1429B1Z8') && get(`notification_events/${oid}_order_confirmed`)?.status === 'skipped_disabled',
    `pdfUrl=${!!get(`orders/${oid}`).pdfUrl} pdfBytes=${pdfText.length} whatsapp=${get(`notification_events/${oid}_order_confirmed`)?.status}`);

  // ---------- vendor fulfilment ----------
  const VAMSI = tok(vamsi), RAVI = tok(ravi);
  const hijack = await call('updateVendorOrderStatus', RAVI, { orderId: oid, vendorId: vamsi, newStatus: 'accepted' });
  check('BC-VEN-017', "Vendor cannot act on another vendor's sub-order", !hijack.ok, hijack.err);
  const skip = await call('updateVendorOrderStatus', VAMSI, { orderId: oid, vendorId: vamsi, newStatus: 'packed' });
  const fakeDeliver = await call('updateVendorOrderStatus', VAMSI, { orderId: oid, vendorId: vamsi, newStatus: 'delivered' });
  check('BC-VEN-070/069', 'Lifecycle enforced: no skipping, vendor cannot mark delivered', !skip.ok && !fakeDeliver.ok, `skip: ${skip.err} | delivered: ${fakeDeliver.err}`);
  for (const st of ['accepted', 'processing', 'packed']) await call('updateVendorOrderStatus', VAMSI, { orderId: oid, vendorId: vamsi, newStatus: st });
  const noAlias = await call('createEkartShipment', VAMSI, { orderNumber: oid, vendorId: vamsi, weightGrams: 1000, lengthCm: 20, widthCm: 15, heightCm: 10 });
  store.set(`vendors/${vamsi}`, { ...get(`vendors/${vamsi}`), addresses: { pickupAddress: { line1: 'Farm Road 1', city: 'Tenali', state: 'AP', pincode: '522201' } } });
  const reg = await call('registerEkartPickupAddress', ADMIN, { vendorId: vamsi });
  const cust2 = await call('createEkartShipment', CUST, { orderNumber: oid, vendorId: vamsi, weightGrams: 1000, lengthCm: 20, widthCm: 15, heightCm: 10 });
  const ship = await call('createEkartShipment', VAMSI, { orderNumber: oid, vendorId: vamsi, weightGrams: 1000, lengthCm: 20, widthCm: 15, heightCm: 10 });
  const ship2 = await call('createEkartShipment', VAMSI, { orderNumber: oid, vendorId: vamsi, weightGrams: 1000, lengthCm: 20, widthCm: 15, heightCm: 10 });
  const awb = ship.data?.waybill;
  const sentPayload = ek.shipments[awb] || {};
  check('BC-SHP-001/004/006', 'Real EKART booking: pickup alias required, only owner vendor, AWB from EKART, no double booking', !noAlias.ok && reg.ok && !cust2.ok && ship.ok && awb?.startsWith('500999A') && ship2.data?.waybill === awb && Object.keys(ek.shipments).length === 1,
    `noAlias=${noAlias.err?.slice(0, 60)} | customer=${cust2.err?.slice(0, 40)} | awb=${awb} | bookings=${Object.keys(ek.shipments).length}`);
  check('BC-SHP-005', 'EKART payload uses order address + prepaid + COD 0', sentPayload.drop_location?.pin === 522001 && sentPayload.payment_mode === 'Prepaid' && sentPayload.cod_amount === 0 && sentPayload.pickup_location?.name === get(`vendors/${vamsi}`).ekartPickupAlias, JSON.stringify({ drop: sentPayload.drop_location, mode: sentPayload.payment_mode, pickup: sentPayload.pickup_location }));
  const vso = vendorOrder(oid, vamsi);
  check('FIX-COURIER', 'EKART rate-card charge (cheapest, ₹60) is taken from the seller: ₹765 share → ₹705 pending; BioCart share untouched',
    ship.data?.courierCharge === 60 && vso.courierChargePaise === 6000 && wallet(vamsi).pending === 70500 && ek.estimates[0]?.pickupPincode === '522201' && ek.estimates[0]?.dropPincode === '522001' && get('company_wallet/main').commissionEarnedPaise === 27500,
    `charge=${ship.data?.courierCharge} so=${vso.courierChargePaise} pending=${wallet(vamsi).pending} est=${JSON.stringify(ek.estimates[0] || {}).slice(0, 80)}`);
  check('Status', 'Sub-order shipped; parent partially shipped', vendorOrder(oid, vamsi).status === 'shipped' && get(`orders/${oid}`).status === 'partially_shipped', `${vendorOrder(oid, vamsi).status} / ${get(`orders/${oid}`).status}`);

  // EKART says Delivered → webhook (unsigned is fine: we re-read from EKART API)
  ek.track[awb] = { _id: awb, track: { status: 'Delivered', ctime: Date.now(), desc: 'Delivered Successfully', details: [{ status: 'Picked Up', ctime: Date.now() - 86400000, desc: 'Picked' }, { status: 'Delivered', ctime: Date.now(), desc: 'Delivered Successfully' }] } };
  const fakeHook = await http('ekartWebhook', { id: 'NOT_A_REAL_AWB', status: 'Delivered' });
  await http('ekartWebhook', { id: awb, status: 'Delivered' });
  check('LOGIC-13/17', 'Delivery comes from EKART tracking API; vendor earnings → available', vendorOrder(oid, vamsi).status === 'delivered' && vendorOrder(oid, vamsi).earnings.state === 'eligible' && wallet(vamsi).available === 70500 && wallet(vamsi).pending === 0,
    `forged hook=${fakeHook.code}; vamsi status=${vendorOrder(oid, vamsi).status} earnings=${vendorOrder(oid, vamsi).earnings.state} wallet=${JSON.stringify({ p: wallet(vamsi).pending, a: wallet(vamsi).available })}`);

  // Ravi rejects → partial refund via Cashfree, idempotent
  await call('updateVendorOrderStatus', RAVI, { orderId: oid, vendorId: ravi, newStatus: 'accepted' });
  const rej = await call('updateVendorOrderStatus', RAVI, { orderId: oid, vendorId: ravi, newStatus: 'rejected', rejectionReason: 'Out of stock at farm' });
  const rej2 = await call('processOrderRefund', ADMIN, { orderId: oid, vendorId: ravi, reason: 'duplicate click' });
  const refundCalls = Object.values(cf.refunds);
  check('BC-RET-002/007, BC-PAY-012', 'Vendor reject → Cashfree refund ₹700 once, stock back, Ravi share reversed', rej.ok && refundCalls.length === 1 && refundCalls[0].refund_amount === 700 && get('inventory/oil').availableQuantity === 5 && (wallet(ravi).pending || 0) === 0 && rej2.data?.refundId === rej.data?.refund?.refundId,
    `refunds=${JSON.stringify(refundCalls.map((r) => r.refund_amount))} oilStock=${get('inventory/oil').availableQuantity} raviPending=${wallet(ravi).pending} order=${get(`orders/${oid}`).status}/${get(`orders/${oid}`).paymentStatus}`);
  check('Status', 'Parent becomes delivered once remaining seller delivered', get(`orders/${oid}`).status === 'delivered', get(`orders/${oid}`).status);
  const refundEvt = { type: 'REFUND_STATUS_WEBHOOK', event_time: 't2', data: { refund: { refund_id: refundCalls[0].refund_id, order_id: oid, refund_status: 'SUCCESS', cf_refund_id: 'CFR1' } } };
  await http('cashfreePaymentWebhook', refundEvt, signCf(refundEvt));
  check('BC-RET-014', 'Refund marked success only from signed Cashfree refund event', get(`refunds/${refundCalls[0].refund_id}`)?.status === 'success', get(`refunds/${refundCalls[0].refund_id}`)?.status);

  // ---------- settlement ----------
  const thisWeek = await settlement.runSettlementCycle(new Date(), 'test');
  const nextTue = new Date(Date.now() + 8 * 86400000);
  const r = await settlement.runSettlementCycle(nextTue, 'test');
  const sid = `${r.cycleId}_${vamsi}`;
  const st = get(`vendor_settlements/${sid}`);
  const again = await settlement.runSettlementCycle(nextTue, 'test');
  check('LOGIC-06/07/08', 'Delivered order settles in the next Tue–Mon cycle, once', st?.status === 'ready_for_payment' && st.amountPaise === 70500 && again.skipped === 'already_completed' && wallet(vamsi).settling === 70500 && wallet(vamsi).available === 0,
    `current cycle created=${thisWeek.created}; next ${r.cycleId}: ${st?.status} ₹${st?.amount}; rerun=${again.skipped}`);
  check('LOGIC-06', 'Scheduler is Tuesday 18:00 Asia/Kolkata', fn.tuesdayVendorSettlement.__endpoint?.scheduleTrigger?.schedule === '0 18 * * 2' && fn.tuesdayVendorSettlement.__endpoint?.scheduleTrigger?.timeZone === 'Asia/Kolkata', JSON.stringify(fn.tuesdayVendorSettlement.__endpoint?.scheduleTrigger));
  const wrongAmt = await call('markSettlementPaid', ADMIN, { settlementId: sid, utr: 'AXIS1234567', paidOn: '2026-11-17', amountPaise: 70000 });
  const vendorPays = await call('markSettlementPaid', VAMSI, { settlementId: sid, utr: 'AXIS1234567', paidOn: '2026-11-17', amountPaise: 70500 });
  const payOk = await call('markSettlementPaid', ADMIN, { settlementId: sid, utr: 'AXIS1234567', paidOn: '2026-11-17', amountPaise: 70500 });
  const payTwice = await call('markSettlementPaid', ADMIN, { settlementId: sid, utr: 'AXIS1234567', paidOn: '2026-11-17', amountPaise: 70500 });
  check('R7 / BC-FIN-026/029', 'Manual payout: exact amount + UTR, admin only, once', !wrongAmt.ok && !vendorPays.ok && payOk.ok && !payTwice.ok && wallet(vamsi).paidOut === 70500 && wallet(vamsi).settling === 0 && vendorOrder(oid, vamsi).earnings.state === 'settled',
    `wrongAmt=${wrongAmt.err?.slice(0, 50)} | vendor=${vendorPays.err?.slice(0, 40)} | twice=${payTwice.err?.slice(0, 50)} | paidOut=${wallet(vamsi).paidOut}`);
  const retry = await call('retryVendorPayout', ADMIN, { settlementId: sid });
  check('No fake payouts', 'Automatic payout path refuses (no fabricated UTR)', !retry.ok, retry.err);

  // refund after settlement → deducted next cycle
  const late = await call('processOrderRefund', ADMIN, { orderId: oid, vendorId: vamsi, reason: 'Damaged on arrival', restock: false });
  check('BC-FIN-018 / R5', 'Refund after payout → vendor adjustment due (deducted next cycle)', late.ok && wallet(vamsi).adjustmentDue === 76500, `adjustmentDue=${wallet(vamsi).adjustmentDue} err=${late.err || ''}`);

  // ---------- cancellation / expiry ----------
  const o2 = await call('createOrder', CUST, { items: [{ productId: 'rice', quantity: 2 }], shippingAddress: ADDR, paymentMethod: 'cashfree', checkoutId: 'chk_0000010' });
  await call('createCashfreeOrder', CUST, { orderId: o2.data.orderId });
  store.set(`orders/${o2.data.orderId}`, { ...get(`orders/${o2.data.orderId}`), reservationExpiresAt: '2020-01-01T00:00:00.000Z' });
  await fn.releaseExpiredReservations.run({});
  check('BC-VEN-048/049', 'Unpaid order expires, Cashfree order terminated, stock returned', get(`orders/${o2.data.orderId}`).status === 'payment_expired' && get('inventory/rice').availableQuantity === 5 && cf.orders[o2.data.orderId].order_status === 'TERMINATED', `status=${get(`orders/${o2.data.orderId}`).status} rice=${get('inventory/rice').availableQuantity}`);
  const o3 = await call('createOrder', CUST, { items: [{ productId: 'rice', quantity: 1 }], shippingAddress: ADDR, paymentMethod: 'cashfree', checkoutId: 'chk_0000011' });
  await call('createCashfreeOrder', CUST, { orderId: o3.data.orderId });
  cf.orders[o3.data.orderId].order_status = 'PAID';
  await call('verifyCashfreePayment', CUST, { orderId: o3.data.orderId });
  const cx = await call('cancelOrder', CUST, { orderId: o3.data.orderId, reason: 'Changed mind' });
  const refund3 = Object.values(cf.refunds).find((x) => String(x.refund_id) === cx.data?.refund?.refundId);
  check('BC-RET-001/006/007', 'Customer cancel before packing → full refund ₹199 incl. shipping, stock restored', cx.ok && refund3?.refund_amount === 199 && get('inventory/rice').availableQuantity === 5 && get(`orders/${o3.data.orderId}`).status === 'cancelled', `refund=${refund3?.refund_amount} rice=${get('inventory/rice').availableQuantity} status=${get(`orders/${o3.data.orderId}`).status}`);
  // Sold-out badge follows real inventory (vendor stock 5 → customer reserves all 5 → product shows Out of Stock; expiry restores it)
  const o4 = await call('createOrder', CUST, { items: [{ productId: 'rice', quantity: 5 }], shippingAddress: ADDR, paymentMethod: 'cashfree', checkoutId: 'chk_0000012' });
  const soldOut = get('products/rice');
  store.set(`orders/${o4.data?.orderId}`, { ...get(`orders/${o4.data?.orderId}`), reservationExpiresAt: '2020-01-01T00:00:00.000Z' });
  await fn.releaseExpiredReservations.run({});
  const restored = get('products/rice');
  check('FIX-STOCK', 'Product shows Out of Stock when all units are taken, and comes back when the hold expires', o4.ok && soldOut.inStock === false && soldOut.stockStatus === 'Out of Stock' && restored.inStock === true && get('inventory/rice').availableQuantity === 5, `soldOut=${soldOut.stockStatus} restored=${restored.stockStatus} avail=${get('inventory/rice').availableQuantity} err=${o4.err || ''}`);
  const cxShipped = await call('cancelOrder', CUST, { orderId: oid, reason: 'late' });
  check('BC-RET-004', 'Customer cannot cancel after shipping', !cxShipped.ok, cxShipped.err);

  // ---------- security odds ----------
  store.set(`users/${vamsi}`, { ...get(`users/${vamsi}`) });
  const sp = await call('submitProductChange', VAMSI, { productId: 'honey', updates: { approvalStatus: 'approved', active: true, vendorId: ravi, description: 'x' } });
  check('BC-ADM-032', 'Vendor edit cannot self-approve or change owner', get('products/honey').approvalStatus === 'pending' && get('products/honey').vendorId === vamsi, `status=${get('products/honey').approvalStatus} owner=${get('products/honey').vendorId === vamsi ? 'unchanged' : 'CHANGED'}`);
  const adminOnly = await call('updateOrderStatus', CUST, { orderId: oid, newStatus: 'delivered' });
  const derived = await call('updateOrderStatus', ADMIN, { orderId: oid, newStatus: 'delivered' });
  check('BC-ROLE-008', 'Order status cannot be forced by customer or admin (derived from shipments)', !adminOnly.ok && !derived.ok, `${adminOnly.err?.slice(0, 40)} | ${derived.err?.slice(0, 60)}`);

  const fails = results.filter((x) => !x.pass).length;
  console.log(`\nSUMMARY: ${results.length - fails} pass / ${fails} fail of ${results.length} checks`);
  require('fs').writeFileSync(path.join(__dirname, '..', '..', 'docs', 'evidence', 'money-flow-results.json'), JSON.stringify(results, null, 2));
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(2); });
