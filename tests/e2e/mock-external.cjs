// Loaded into the Functions emulator (NODE_OPTIONS=--require) by tests/e2e/run.cjs.
// It replaces every outbound HTTP call the backend makes, so a test run can NEVER reach the real
// Cashfree or EKART: no real payment, no real shipment, no real SMS/WhatsApp.
//   - Cashfree: orders are created in memory; an order is "paid" when the test marks it paid
//     through the control file (see markPaid in helpers).
//   - EKART: sign-in, PIN check, price estimate work; booking answers with EKART's real
//     "complete onboarding" rejection unless the control file says bookings are allowed.
//   - Anything else that is not local is refused.
const fs = require('fs');
const path = require('path');
const CONTROL = process.env.BIOCART_MOCK_CONTROL || path.join(require('os').tmpdir(), 'biocart-mock-control.json');
const readControl = () => { try { return JSON.parse(fs.readFileSync(CONTROL, 'utf8')); } catch { return {}; } };
const writeControl = (c) => fs.writeFileSync(CONTROL, JSON.stringify(c));
const realFetch = global.fetch;

const json = (status, data) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

global.fetch = async (input, opts = {}) => {
  const url = new URL(typeof input === 'string' ? input : input.url);
  const local = ['127.0.0.1', 'localhost', '::1', '[::1]'].includes(url.hostname) || url.hostname.endsWith('.internal') || url.hostname === 'metadata.google.internal';
  if (local) return realFetch(input, opts);
  const method = (opts.method || 'GET').toUpperCase();
  let body = null;
  try { body = opts.body ? JSON.parse(opts.body) : null; } catch { body = null; }
  const c = readControl();
  c.calls = [...(c.calls || []), `${method} ${url.hostname}${url.pathname}`].slice(-200);

  if (url.hostname.includes('cashfree.com')) {
    c.cfOrders = c.cfOrders || {}; c.cfRefunds = c.cfRefunds || {};
    let m;
    try {
      if (method === 'POST' && url.pathname === '/pg/orders') {
        c.cfOrders[body.order_id] = c.cfOrders[body.order_id] || { order_id: body.order_id, order_amount: body.order_amount, order_currency: 'INR', order_status: 'ACTIVE', payment_session_id: 'session_' + body.order_id, cf_order_id: 1 };
        return json(200, c.cfOrders[body.order_id]);
      }
      if ((m = url.pathname.match(/^\/pg\/orders\/([^/]+)$/))) {
        const o = c.cfOrders[m[1]]; if (!o) return json(404, { message: 'order not found' });
        if (method === 'PATCH') o.order_status = body.order_status;
        if ((c.autoPay || (c.paid || []).includes(m[1])) && o.order_status === 'ACTIVE') o.order_status = 'PAID';
        return json(200, o);
      }
      if ((m = url.pathname.match(/^\/pg\/orders\/([^/]+)\/payments$/))) return json(200, [{ payment_status: 'SUCCESS', cf_payment_id: 'TESTPAY' + m[1], payment_group: 'upi' }]);
      if ((m = url.pathname.match(/^\/pg\/orders\/([^/]+)\/refunds$/))) {
        c.cfRefunds[body.refund_id] = c.cfRefunds[body.refund_id] || { ...body, refund_status: 'PENDING', cf_refund_id: 'CFR' + Object.keys(c.cfRefunds).length };
        return json(200, c.cfRefunds[body.refund_id]);
      }
      if ((m = url.pathname.match(/^\/pg\/orders\/([^/]+)\/refunds\/([^/]+)$/))) return json(200, c.cfRefunds[m[2]] || {});
      return json(404, { message: 'unmocked Cashfree path ' + url.pathname });
    } finally { writeControl(c); }
  }

  if (url.hostname.includes('ekartlogistics')) {
    try {
      if (url.pathname.startsWith('/integrations/v2/auth/token/')) return json(200, { access_token: 'test-token', token_type: 'Bearer', expires_in: 86400, scope: 'core:all' });
      if (url.pathname.startsWith('/api/v2/serviceability/')) {
        const pin = url.pathname.split('/').pop();
        const ok = pin !== '999999';
        return json(200, { status: ok, pincode: Number(pin), remark: ok ? 'Pincode is serviceable' : 'Pincode is not serviceable', details: { cod: ok, max_cod_amount: 25000, forward_pickup: ok, forward_drop: ok, reverse_pickup: ok, reverse_drop: ok, city: pin === '522001' ? 'Guntur' : 'Tirupati', state: 'Andhra Pradesh' } });
      }
      if (url.pathname === '/api/v2/addresses') return json(200, c.ekAddresses || []);
      if (url.pathname === '/api/v2/address') { c.ekAddresses = [...(c.ekAddresses || []), body]; return json(200, { status: true, alias: body.alias, remark: 'Address added' }); }
      if (url.pathname === '/api/v2/webhook') return json(200, method === 'GET' ? [] : { id: 'testhook', ...body, secret: undefined });
      if (url.pathname === '/data/pricing/estimate') {
        const billable = Math.max(Number(body.weight), Math.ceil(Number(body.length) * Number(body.width) * Number(body.height) / 5));
        const base = billable <= 2000 ? 90 : 90 + 35 * Math.ceil((billable - 2000) / 1000);
        return json(200, { type: 'WEIGHT_BASED', zone: 'B', volumetricWeight: '0', billingWeight: billable.toFixed(2), shippingCharge: base.toFixed(2), taxes: (base * 0.18).toFixed(2), total: (base * 1.18).toFixed(2) });
      }
      if (url.pathname === '/api/v1/package/create') {
        if (!c.ekartAllowBooking) return json(400, { statusCode: 400, code: 'test', message: 'SWIFT_VALIDATION_EXCEPTION', description: 'Shipment creation is blocked. Please complete the onboarding process to start shipping or contact your account manager.', severity: 'ERROR' });
        const id = 'TESTAWB' + (1000 + Object.keys(c.ekShipments || {}).length);
        c.ekShipments = { ...(c.ekShipments || {}), [id]: body };
        return json(200, { status: true, remark: 'Successfully created shipment', tracking_id: id, vendor: 'EKART', barcodes: { wbn: 'W' + id, order: body.order_number } });
      }
      if (url.pathname.startsWith('/api/v1/track/')) { const id = url.pathname.split('/').pop(); return json(200, (c.ekTrack || {})[id] || { _id: id, track: { status: 'Pickup Pending', ctime: Date.now(), desc: 'Booked' } }); }
      return json(404, { message: 'unmocked EKART path ' + url.pathname });
    } finally { writeControl(c); }
  }

  writeControl(c);
  // Google APIs that the emulator itself needs are not called through fetch; anything else is refused.
  return json(503, { message: `Blocked by the BioCart test harness: outbound call to ${url.hostname} is not allowed in tests` });
};
