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
const ek = { shipments: {}, calls: [], track: {} };
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
    if (u.pathname === '/api/v1/package/create') {
      // EKART's real reply while the account is not onboarded (captured from production on 15 Nov 2026)
      if (ek.blocked) return json(400, { statusCode: 400, code: 'x', message: 'SWIFT_VALIDATION_EXCEPTION', description: 'Shipment creation is blocked. Please complete the onboarding process to start shipping or contact your account manager.', severity: 'ERROR' });
      const id = '500999A' + (Object.keys(ek.shipments).length + 1000);
      ek.shipments[id] = body; return json(200, { status: true, remark: 'Successfully created shipment', tracking_id: id, vendor: 'EKART', barcodes: { wbn: 'W' + id, order: body.order_number } });
    }
    if (u.pathname.startsWith('/api/v1/track/')) { const id = u.pathname.split('/').pop(); return json(200, ek.track[id] || { _id: id, track: { status: 'Pickup Pending', ctime: Date.now(), desc: 'Booked' } }); }
    if (u.pathname === '/api/v1/package/label') return json(200, {});
    if (u.pathname === '/data/pricing/estimate') {
      // same contract rate card as EKART's real estimator: ₹90 up to 2 kg, ₹35 per extra kg, 18% GST
      if (ek.estimateDown) return json(500, { message: 'estimate service down' });
      const billable = Math.max(Number(body.weight), Math.ceil(Number(body.length) * Number(body.width) * Number(body.height) / 5));
      const base = billable <= 2000 ? 90 : 90 + 35 * Math.ceil((billable - 2000) / 1000);
      return json(200, { type: 'WEIGHT_BASED', zone: 'B', billingWeight: billable.toFixed(2), shippingCharge: base.toFixed(2), taxes: (base * 0.18).toFixed(2), total: (base * 1.18).toFixed(2) });
    }
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
  check('R2', 'Gateway fee not estimated; marked pending reconciliation; vendor share untouched', paid.financialSummary.gatewayFeeStatus === 'pending_reconciliation' && vo.vendorPayablePaise === 76500, `vendor share=${vo.vendorPayablePaise}`);
  // Rule 8: the estimated EKART charge is held from the vendor's share the moment the order is paid.
  // "Organic Honey" has no weight on record → 1000 g assumed + 50 g packing = 1050 g → ₹90 + 18% = ₹106.20.
  const holdEntry = ledger().find((e) => e.entryType === 'courier_charge_held' && e.vendorId === vamsi);
  check('COURIER-HOLD', 'Paid order: ₹106.20 courier estimate held from vendor share (₹765 − ₹106.20 = ₹658.80 pending); flagged as incomplete (no weight)',
    vo.courier?.status === 'held_estimate' && vo.courier?.estimatedChargePaise === 10620 && vo.courierChargePaise === 10620 && vo.courierEstimateIncomplete === true && holdEntry?.amountPaise === 10620 && wallet(vamsi).pending === 65880,
    `status=${vo.courier?.status} est=${vo.courier?.estimatedChargePaise} pending=${wallet(vamsi).pending} ledger=${holdEntry?.entryType}:${holdEntry?.amountPaise}`);
  check('COURIER-SNAPSHOT', 'Rates used are copied onto the vendor order', vo.courier?.ratesSnapshot?.upTo2kg === 90 && vo.courier?.ratesSnapshot?.additionalPerKg === 35 && vo.courier?.ratesSnapshot?.gstPercent === 18, JSON.stringify(vo.courier?.ratesSnapshot));
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
  const voShipped = vendorOrder(oid, vamsi);
  check('COURIER-ACTUAL', 'Booking replaces the estimate with the real charge (1 kg, 20×15×10 → ₹106.20 from EKART price service); EKART never sees a fake GSTIN',
    voShipped.courier?.status === 'held_actual' && voShipped.courier?.actualChargePaise === 10620 && voShipped.courier?.actualSource === 'ekart_pricing_estimate' && voShipped.courierChargePaise === 10620 && sentPayload.seller_gst_tin === '' && sentPayload.consignee_gst_amount === 0,
    `status=${voShipped.courier?.status} actual=${voShipped.courier?.actualChargePaise} source=${voShipped.courier?.actualSource} gst_tin="${sentPayload.seller_gst_tin}"`);
  check('Status', 'Sub-order shipped; parent partially shipped', vendorOrder(oid, vamsi).status === 'shipped' && get(`orders/${oid}`).status === 'partially_shipped', `${vendorOrder(oid, vamsi).status} / ${get(`orders/${oid}`).status}`);

  // EKART says Delivered → webhook (unsigned is fine: we re-read from EKART API)
  ek.track[awb] = { _id: awb, track: { status: 'Delivered', ctime: Date.now(), desc: 'Delivered Successfully', details: [{ status: 'Picked Up', ctime: Date.now() - 86400000, desc: 'Picked' }, { status: 'Delivered', ctime: Date.now(), desc: 'Delivered Successfully' }] } };
  const fakeHook = await http('ekartWebhook', { id: 'NOT_A_REAL_AWB', status: 'Delivered' });
  await http('ekartWebhook', { id: awb, status: 'Delivered' });
  check('LOGIC-13/17', 'Delivery comes from EKART tracking API; vendor earnings → available', vendorOrder(oid, vamsi).status === 'delivered' && vendorOrder(oid, vamsi).earnings.state === 'eligible' && wallet(vamsi).available === 65880 && wallet(vamsi).pending === 0,
    `forged hook=${fakeHook.code}; vamsi status=${vendorOrder(oid, vamsi).status} earnings=${vendorOrder(oid, vamsi).earnings.state} wallet=${JSON.stringify({ p: wallet(vamsi).pending, a: wallet(vamsi).available })}`);

  // Ravi rejects → partial refund via Cashfree, idempotent
  await call('updateVendorOrderStatus', RAVI, { orderId: oid, vendorId: ravi, newStatus: 'accepted' });
  const rej = await call('updateVendorOrderStatus', RAVI, { orderId: oid, vendorId: ravi, newStatus: 'rejected', rejectionReason: 'Out of stock at farm' });
  const rej2 = await call('processOrderRefund', ADMIN, { orderId: oid, vendorId: ravi, reason: 'duplicate click' });
  const refundCalls = Object.values(cf.refunds);
  const releaseEntry = ledger().find((e) => e.entryType === 'courier_charge_released' && e.vendorId === ravi);
  check('COURIER-RELEASE', 'Cancelled before shipping → courier hold fully released, seller owes nothing',
    releaseEntry?.amountPaise === -10620 && vendorOrder(oid, ravi).courier?.status === 'released' && (wallet(ravi).pending || 0) === 0 && (wallet(ravi).adjustmentDue || 0) === 0,
    `release=${releaseEntry?.amountPaise} status=${vendorOrder(oid, ravi).courier?.status} pending=${wallet(ravi).pending} adjustmentDue=${wallet(ravi).adjustmentDue || 0}`);
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
  check('LOGIC-06/07/08', 'Delivered order settles in the next Tue–Mon cycle, once, for share − courier charge (₹765 − ₹106.20 = ₹658.80)', st?.status === 'ready_for_payment' && st.amountPaise === 65880 && again.skipped === 'already_completed' && wallet(vamsi).settling === 65880 && wallet(vamsi).available === 0,
    `current cycle created=${thisWeek.created}; next ${r.cycleId}: ${st?.status} ₹${st?.amount}; rerun=${again.skipped}`);
  check('LOGIC-06', 'Scheduler is Tuesday 18:00 Asia/Kolkata', fn.tuesdayVendorSettlement.__endpoint?.scheduleTrigger?.schedule === '0 18 * * 2' && fn.tuesdayVendorSettlement.__endpoint?.scheduleTrigger?.timeZone === 'Asia/Kolkata', JSON.stringify(fn.tuesdayVendorSettlement.__endpoint?.scheduleTrigger));
  const wrongAmt = await call('markSettlementPaid', ADMIN, { settlementId: sid, utr: 'AXIS1234567', paidOn: '2026-11-17', amountPaise: 70000 });
  const vendorPays = await call('markSettlementPaid', VAMSI, { settlementId: sid, utr: 'AXIS1234567', paidOn: '2026-11-17', amountPaise: 65880 });
  const payOk = await call('markSettlementPaid', ADMIN, { settlementId: sid, utr: 'AXIS1234567', paidOn: '2026-11-17', amountPaise: 65880 });
  const payTwice = await call('markSettlementPaid', ADMIN, { settlementId: sid, utr: 'AXIS1234567', paidOn: '2026-11-17', amountPaise: 65880 });
  check('R7 / BC-FIN-026/029', 'Manual payout: exact amount + UTR, admin only, once', !wrongAmt.ok && !vendorPays.ok && payOk.ok && !payTwice.ok && wallet(vamsi).paidOut === 65880 && wallet(vamsi).settling === 0 && vendorOrder(oid, vamsi).earnings.state === 'settled',
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
  const cxShipped = await call('cancelOrder', CUST, { orderId: oid, reason: 'late' });
  check('BC-RET-004', 'Customer cannot cancel after shipping', !cxShipped.ok, cxShipped.err);

  // ---------- owner's business rules (Nov 2026) ----------
  const payFor = async (id) => { await call('createCashfreeOrder', CUST, { orderId: id }); cf.orders[id].order_status = 'PAID'; return call('verifyCashfreePayment', CUST, { orderId: id }); };
  const audits = () => [...store.entries()].filter(([k]) => k.startsWith('audit_logs/')).map(([, v]) => v);

  // Rule 4: commission is per vendor, fixed when the vendor is created; the vendor login is linked.
  check('RULE-4', 'Vendor created with 15% → vendor doc linked to its login (ownerUid) and commission stored; BioCart\'s own vendor pays commission too',
    get(`vendors/${vamsi}`).ownerUid === vamsi && get(`users/${vamsi}`).role === 'vendor' && get(`vendors/${vamsi}`).commission?.baseRateBps === 1500 && get('vendors/biocart').commission?.baseRateBps === 1000,
    `ownerUid ok=${get(`vendors/${vamsi}`).ownerUid === vamsi} role=${get(`users/${vamsi}`).role} bps=${get(`vendors/${vamsi}`).commission?.baseRateBps} biocart bps=${get('vendors/biocart').commission?.baseRateBps}`);

  // Rule 8 example: ₹1000 product, 20% commission, 1.5 kg parcel → vendor payout ₹693.80. Delivery fee ₹99 stays with BioCart.
  P('r8', 'Rule Eight Millet 1.45 kg', 1000, ravi, { weightGrams: 1450, lengthCm: 20, widthCm: 15, heightCm: 10 });
  const raviPendingBefore = wallet(ravi).pending || 0;
  const shipIncomeBefore = (get('company_wallet/main') || {}).shippingIncomePaise || 0;
  const o8 = await call('createOrder', CUST, { items: [{ productId: 'r8', quantity: 1 }], shippingAddress: ADDR, paymentMethod: 'cashfree', checkoutId: 'chk_0000020' });
  await payFor(o8.data.orderId);
  const v8 = vendorOrder(o8.data.orderId, ravi);
  check('RULE-8', '₹1000, 20% commission, 1.5 kg → commission ₹200, share ₹800, courier held ₹106.20, payout ₹693.80',
    v8.commissionPaise === 20000 && v8.vendorPayablePaise === 80000 && v8.courier.estimatedGrams === 1500 && v8.courier.billableGrams === 1500 && v8.courierChargePaise === 10620 && v8.netPayoutPaise === 69380 && (wallet(ravi).pending || 0) - raviPendingBefore === 69380 && v8.courierEstimateIncomplete === false,
    `commission=${v8.commissionPaise} share=${v8.vendorPayablePaise} grams=${v8.courier.estimatedGrams} courier=${v8.courierChargePaise} payout=${v8.netPayoutPaise} walletDelta=${(wallet(ravi).pending || 0) - raviPendingBefore}`);
  check('RULE-5', '₹99 delivery fee (order below ₹1,499) is paid by the customer and kept by BioCart, not the vendor',
    get(`orders/${o8.data.orderId}`).shippingAmountPaise === 9900 && get(`orders/${o8.data.orderId}`).totalAmountPaise === 109900 && (get('company_wallet/main').shippingIncomePaise || 0) - shipIncomeBefore === 9900,
    `shipping=${get(`orders/${o8.data.orderId}`).shippingAmountPaise} total=${get(`orders/${o8.data.orderId}`).totalAmountPaise} companyShippingDelta=${(get('company_wallet/main').shippingIncomePaise || 0) - shipIncomeBefore}`);

  // Booking adjusts the hold to the real charge: packed heavier (2.1 kg) → ₹147.50, ₹41.30 more held.
  for (const st2 of ['accepted', 'processing', 'packed']) await call('updateVendorOrderStatus', RAVI, { orderId: o8.data.orderId, vendorId: ravi, newStatus: st2 });
  store.set(`vendors/${ravi}`, { ...get(`vendors/${ravi}`), addresses: { pickupAddress: { addressLine1: 'Mill Road 4', city: 'Tenali', state: 'AP', pinCode: '522201' } } });
  await call('registerEkartPickupAddress', ADMIN, { vendorId: ravi });
  const ship8 = await call('createEkartShipment', RAVI, { orderNumber: o8.data.orderId, vendorId: ravi, weightGrams: 2100, lengthCm: 20, widthCm: 15, heightCm: 10 });
  const v8b = vendorOrder(o8.data.orderId, ravi);
  const adj = ledger().find((e) => e.entryType === 'courier_charge_adjusted' && e.orderId === o8.data.orderId);
  check('RULE-8 adjust', 'Booked at 2.1 kg → real charge ₹147.50 replaces the ₹106.20 estimate (+₹41.30 held); payout ₹652.50',
    ship8.ok && v8b.courier.status === 'held_actual' && v8b.courierChargePaise === 14750 && adj?.amountPaise === 4130 && v8b.netPayoutPaise === 65250 && (wallet(ravi).pending || 0) - raviPendingBefore === 65250,
    `ok=${ship8.ok} ${ship8.err || ''} courier=${v8b.courierChargePaise} adj=${adj?.amountPaise} payout=${v8b.netPayoutPaise} walletDelta=${(wallet(ravi).pending || 0) - raviPendingBefore}`);

  // Admin marks delivered (courier proof) → payout becomes eligible for Tuesday; manual settlement run is admin-only and audited.
  const mdVendor = await call('adminMarkDelivered', RAVI, { orderId: o8.data.orderId, vendorId: ravi, reason: 'POD reference 12345 from EKART' });
  const md = await call('adminMarkDelivered', ADMIN, { orderId: o8.data.orderId, vendorId: ravi, reason: 'POD reference 12345 from EKART' });
  check('RULE-9 delivered', 'Only admin can mark delivered; payout (share − courier) then becomes ready for the Tuesday settlement',
    !mdVendor.ok && md.ok && vendorOrder(o8.data.orderId, ravi).earnings.state === 'eligible' && wallet(ravi).available === 65250,
    `vendor: ${mdVendor.err?.slice(0, 45)} | admin ok=${md.ok} state=${vendorOrder(o8.data.orderId, ravi).earnings.state} available=${wallet(ravi).available}`);
  const tmsVendor = await call('triggerManualSettlement', RAVI, {});
  const tms = await call('triggerManualSettlement', ADMIN, {});
  check('RULE-9 settlement', 'triggerManualSettlement: admin only, and written to the audit log',
    !tmsVendor.ok && tms.ok && audits().some((a) => a.action === 'settlement_cycle_run') && audits().some((a) => a.action === 'manual_delivery_confirmation'),
    `vendor: ${tmsVendor.err?.slice(0, 45)} | admin: ${JSON.stringify(tms.data || tms.err).slice(0, 120)} | audit entries=${audits().length}`);

  // Courier rates: admin-only; a change applies to NEW orders only.
  const ratesByVendor = await call('updateFinancialPolicy', RAVI, { courierRates: { upTo2kg: 100 } });
  const ratesByAdmin = await call('updateFinancialPolicy', ADMIN, { courierRates: { upTo2kg: 100 } });
  const o9 = await call('createOrder', CUST, { items: [{ productId: 'r8', quantity: 1 }], shippingAddress: ADDR, paymentMethod: 'cashfree', checkoutId: 'chk_0000021' });
  await payFor(o9.data.orderId);
  const v9 = vendorOrder(o9.data.orderId, ravi);
  check('RULE-8 rates', 'Rate card change (₹90 → ₹100): admin only; new order held at ₹118.00, the earlier order keeps its own rates',
    !ratesByVendor.ok && ratesByAdmin.ok && v9.courierChargePaise === 11800 && v9.courier.ratesSnapshot.upTo2kg === 100 && vendorOrder(o8.data.orderId, ravi).courier.ratesSnapshot.upTo2kg === 90 && vendorOrder(o8.data.orderId, ravi).courierChargePaise === 14750,
    `vendor: ${ratesByVendor.err?.slice(0, 40)} | new=${v9.courierChargePaise} (card ${v9.courier.ratesSnapshot.upTo2kg}) old=${vendorOrder(o8.data.orderId, ravi).courierChargePaise} (card ${vendorOrder(o8.data.orderId, ravi).courier.ratesSnapshot.upTo2kg})`);
  await call('updateFinancialPolicy', ADMIN, { courierRates: { upTo2kg: 90 } });

  // Rule 5: admin can change the free-delivery threshold or switch free delivery off.
  await call('updateFinancialPolicy', ADMIN, { freeShippingThreshold: 500 });
  const qT = await call('quoteOrder', null, { items: [{ productId: 'r8', quantity: 1 }] });
  await call('updateFinancialPolicy', ADMIN, { freeShippingThreshold: 1499, freeShippingEnabled: false });
  const qOff = await call('quoteOrder', null, { items: cart });
  await call('updateFinancialPolicy', ADMIN, { freeShippingEnabled: true });
  const qBack = await call('quoteOrder', null, { items: cart });
  check('RULE-5 admin', 'Threshold lowered to ₹500 → ₹1000 cart ships free; free delivery switched off → ₹1,600 cart pays ₹99; switched back on → free',
    qT.data?.shippingAmount === 0 && qOff.data?.shippingAmount === 99 && qBack.data?.shippingAmount === 0, `threshold500=${qT.data?.shippingAmount} off=${qOff.data?.shippingAmount} on=${qBack.data?.shippingAmount}`);

  // Rule 6: COD. Admin switch OFF always wins; when ON, each product must allow COD.
  P('codyes', 'COD Allowed Item', 300, ravi, { codAllowed: true, weightGrams: 500 });
  const qCodOff = await call('quoteOrder', null, { items: [{ productId: 'codyes', quantity: 1 }] });
  await call('updateFinancialPolicy', ADMIN, { codEnabled: true });
  const qCodOn = await call('quoteOrder', null, { items: [{ productId: 'codyes', quantity: 1 }] });
  const qCodMixed = await call('quoteOrder', null, { items: [{ productId: 'codyes', quantity: 1 }, { productId: 'r8', quantity: 1 }] });
  const codMixed = await call('createOrder', CUST, { items: [{ productId: 'codyes', quantity: 1 }, { productId: 'r8', quantity: 1 }], shippingAddress: ADDR, paymentMethod: 'cod', checkoutId: 'chk_0000030' });
  const codOk = await call('createOrder', CUST, { items: [{ productId: 'codyes', quantity: 1 }], shippingAddress: ADDR, paymentMethod: 'cod', checkoutId: 'chk_0000031' });
  await call('updateFinancialPolicy', ADMIN, { codEnabled: false });
  // a second customer, so the per-customer order rate limit cannot be what refuses this
  const codAfterOff = await call('createOrder', tok('cust2'), { items: [{ productId: 'codyes', quantity: 1 }], shippingAddress: ADDR, paymentMethod: 'cod', checkoutId: 'chk_0000032' });
  check('RULE-6', 'COD: OFF → not offered; ON → only when every product allows COD; switched OFF again → refused even for a COD product',
    qCodOff.data?.codAvailable === false && qCodOn.data?.codAvailable === true && qCodMixed.data?.codAvailable === false && !codMixed.ok && codOk.ok && get(`orders/${codOk.data.orderId}`).paymentStatus === 'cod_pending' && !codAfterOff.ok && /Cash on Delivery/.test(codAfterOff.err),
    `off=${qCodOff.data?.codAvailable} on=${qCodOn.data?.codAvailable} mixed=${qCodMixed.data?.codAvailable} mixedOrder=${codMixed.err?.slice(0, 40)} codOrder=${codOk.ok ? get(`orders/${codOk.data.orderId}`).paymentStatus : codOk.err} afterOff=${codAfterOff.err?.slice(0, 70)}`);

  // Rule 7: the Cashfree fee is never taken from the vendor.
  check('RULE-7', 'No gateway-fee entry is ever booked against a vendor', ledger().filter((e) => /gateway/.test(e.entryType) && String(e.account || '').startsWith('vendor:')).length === 0, `vendor gateway entries=${ledger().filter((e) => /gateway/.test(e.entryType) && String(e.account || '').startsWith('vendor:')).length}`);

  // Rule 10: suspend instead of delete — the vendor stops selling, old orders stay.
  store.set(`vendors/${ravi}`, { ...get(`vendors/${ravi}`), status: 'suspended' });
  const qSusp = await call('quoteOrder', null, { items: [{ productId: 'r8', quantity: 1 }] });
  check('RULE-10', 'Suspended vendor cannot sell; their earlier orders and ledger stay intact',
    !qSusp.ok && !!vendorOrder(o8.data.orderId, ravi) && !!vendorOrder(oid, ravi) && ledger().some((e) => e.vendorId === ravi), `quote: ${qSusp.err?.slice(0, 60)} | old orders kept=${!!vendorOrder(o8.data.orderId, ravi) && !!vendorOrder(oid, ravi)}`);
  store.set(`vendors/${ravi}`, { ...get(`vendors/${ravi}`), status: 'active' });

  // Rule 1: admin-only functions refuse customers and vendors.
  const adminFns = [['updateFinancialPolicy', { codEnabled: true }], ['setCourierCharge', { orderId: oid, vendorId: vamsi, amount: 1, reason: 'testing access' }], ['markSettlementPaid', { settlementId: 'x', utr: 'U', paidOn: '2026-11-17', amountPaise: 1 }], ['createVendorAccount', { businessName: 'X', ownerName: 'X', email: 'x@x.in', phone: '9000000009', commissionRate: 10 }], ['processOrderRefund', { orderId: oid, reason: 'testing access' }], ['updateVendorCommercials', { vendorId: vamsi, commissionRate: 1 }]];
  const denied = [];
  for (const [name, data] of adminFns) for (const who of [CUST, VAMSI]) { const r2 = await call(name, who, data); denied.push(`${name}:${r2.ok ? 'ALLOWED' : 'denied'}`); }
  check('RULE-1 admin-only', 'Admin functions refuse customer and vendor accounts', denied.every((d) => d.endsWith('denied')) && get(`vendors/${vamsi}`).commission.baseRateBps === 1500, [...new Set(denied)].join(' '));

  // Rule 13: EKART blocks bookings (onboarding) → the vendor gets EKART's full message, no fake AWB, order stays Packed.
  for (const st3 of ['accepted', 'processing', 'packed']) await call('updateVendorOrderStatus', RAVI, { orderId: o9.data.orderId, vendorId: ravi, newStatus: st3 });
  ek.blocked = true;
  const blockedShip = await call('createEkartShipment', RAVI, { orderNumber: o9.data.orderId, vendorId: ravi, weightGrams: 1500, lengthCm: 20, widthCm: 15, heightCm: 10 });
  ek.blocked = false;
  const sBlocked = get(`shipments/ekart_${o9.data.orderId}_${ravi}`) || {};
  check('RULE-13', 'EKART "complete onboarding" block → vendor sees EKART\'s full message; no AWB invented; order stays Packed; hold unchanged',
    !blockedShip.ok && /Shipment creation is blocked\. Please complete the onboarding process/.test(blockedShip.err) && !sBlocked.awb && sBlocked.status === 'booking_failed' && /onboarding/.test(sBlocked.lastError || '') && vendorOrder(o9.data.orderId, ravi).status === 'packed' && !vendorOrder(o9.data.orderId, ravi).awbNumber && vendorOrder(o9.data.orderId, ravi).courierChargePaise === 11800,
    `err="${blockedShip.err}" | shipment=${sBlocked.status} awb=${sBlocked.awb || 'none'} | order=${vendorOrder(o9.data.orderId, ravi).status}`);

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
