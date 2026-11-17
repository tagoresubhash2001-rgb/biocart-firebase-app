// Browser flow tests (customer → vendor → admin) against the emulator build.
// Nothing here can reach the real project: Firebase is the local emulator suite and Cashfree/EKART
// are replaced by tests/e2e/mock-external.cjs. Usage: node tests/e2e/flows.cjs <baseUrl>
const fs = require('fs');
const os = require('os');
const path = require('path');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { watch, launchBrowser } = require('./lib.cjs');
const { PASSWORD, ACCOUNTS } = require('./seed.cjs');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'qa-report');
const SHOTS = path.join(OUT, 'flows');
const base = process.argv[2];
const CONTROL = process.env.BIOCART_MOCK_CONTROL || path.join(os.tmpdir(), 'biocart-mock-control.json');
const control = (patch) => { let c = {}; try { c = JSON.parse(fs.readFileSync(CONTROL, 'utf8')); } catch { /* first use */ } fs.writeFileSync(CONTROL, JSON.stringify({ ...c, ...patch })); };
const mockCalls = () => { try { return JSON.parse(fs.readFileSync(CONTROL, 'utf8')).calls || []; } catch { return []; } };

if (!process.env.FIRESTORE_EMULATOR_HOST) { console.error('FIRESTORE_EMULATOR_HOST is not set — flows only run against the emulators.'); process.exit(2); }
initializeApp({ projectId: 'bio-cart' });
const db = getFirestore();

const results = [];
let current = null;
async function step(id, title, fn) {
  const t0 = Date.now();
  try {
    const evidence = await fn();
    results.push({ id, title, pass: true, evidence: evidence || '', ms: Date.now() - t0 });
    console.log(`PASS  [${id}] ${title}${evidence ? `\n        -> ${evidence}` : ''}`);
  } catch (e) {
    const msg = String(e.message || e).split('\n')[0].slice(0, 300);
    let shot = '';
    if (current) { shot = `flows/FAIL-${id}.jpg`; await current.screenshot({ path: path.join(OUT, shot), type: 'jpeg', quality: 50 }).catch(() => {}); }
    results.push({ id, title, pass: false, error: msg, screenshot: shot, ms: Date.now() - t0 });
    console.log(`FAIL  [${id}] ${title}\n        -> ${msg}`);
  }
}
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };
const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, `${name}.jpg`), type: 'jpeg', quality: 55 }).catch(() => {});
const settle = async (page, ms = 1200) => { await page.locator('#global-loader').waitFor({ state: 'detached', timeout: 25000 }).catch(() => {}); await page.waitForTimeout(ms); };
const go = async (page, p) => { await page.goto(base + p, { waitUntil: 'domcontentloaded', timeout: 45000 }); await settle(page); };
const bodyText = (page) => page.evaluate(() => document.body.innerText);
const money = (t) => t.replace(/,/g, '');
/** Waits for the newest recorded call of a Cloud Function that satisfies `ok` (responses arrive asynchronously). */
const waitCall = async (list, fn, ok = () => true, timeout = 20000) => {
  const end = Date.now() + timeout;
  for (;;) {
    const hit = list.filter((c) => c.fn === fn && c.body?.result && ok(c.body.result)).pop();
    if (hit) return hit;
    if (Date.now() > end) throw new Error(`no ${fn} response matched (last: ${JSON.stringify(list.filter((c) => c.fn === fn).pop()?.body).slice(0, 160)})`);
    await new Promise((r) => setTimeout(r, 250));
  }
};

async function openLogin(page) {
  await go(page, '/dashboard');
  const modal = page.locator('#auth-modal-overlay');
  if (!(await modal.isVisible().catch(() => false))) await page.getByRole('button', { name: 'Sign In Now' }).filter({ visible: true }).first().click({ timeout: 8000 });
  await modal.waitFor({ state: 'visible', timeout: 8000 });
  return modal;
}
async function login(page, account) {
  const modal = await openLogin(page);
  await modal.locator('input[type="email"]').fill(account.email);
  await modal.locator('input[type="password"]').fill(PASSWORD);
  await modal.locator('input[type="password"]').press('Enter');
  await modal.waitFor({ state: 'hidden', timeout: 20000 });
  await page.waitForTimeout(1500);
}
/** Calls a callable Cloud Function in the emulator as the given test account (or signed out). */
async function callFn(name, data, account) {
  const headers = { 'Content-Type': 'application/json' };
  if (account) {
    const r = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=test', { method: 'POST', headers, body: JSON.stringify({ email: account.email, password: PASSWORD, returnSecureToken: true }) });
    headers.Authorization = `Bearer ${(await r.json()).idToken}`;
  }
  const res = await fetch(`http://127.0.0.1:5001/bio-cart/asia-southeast1/${name}`, { method: 'POST', headers, body: JSON.stringify({ data }) });
  const j = await res.json();
  return j.error ? { ok: false, error: `${j.error.status}: ${j.error.message}` } : { ok: true, data: j.result };
}
const openSection = async (page, label) => {
  const inMenu = () => page.locator('aside, nav').getByText(label, { exact: true }).filter({ visible: true }).first();
  if (!(await inMenu().isVisible().catch(() => false))) {
    const toggle = page.locator('button:has(svg.lucide-menu)').filter({ visible: true }).first();
    if (await toggle.isVisible().catch(() => false)) { await toggle.click(); await page.waitForTimeout(600); }
  }
  const target = (await inMenu().isVisible().catch(() => false)) ? inMenu() : page.getByRole('button', { name: label, exact: true }).filter({ visible: true }).first();
  await target.click({ timeout: 8000 });
  await page.waitForTimeout(2000);
};
const openCart = async (page) => {
  if (await page.locator('#checkout-drawer').isVisible().catch(() => false)) return;
  await page.locator('#cart-nav-btn, #compact-cart-btn').filter({ visible: true }).first().click({ timeout: 8000 });
  await page.locator('#checkout-drawer').waitFor({ state: 'visible', timeout: 8000 });
};
const addProduct = async (page, id) => {
  await go(page, `/product-details?product=${id}`);
  await page.getByRole('button', { name: /add to (cart|bag|basket)/i }).filter({ visible: true }).first().click({ timeout: 10000 });
  await page.waitForTimeout(800);
  if (await page.locator('#checkout-drawer').isVisible().catch(() => false)) { await page.locator('#checkout-close').click().catch(() => {}); await page.waitForTimeout(400); }
};
/** Waits until the cart summary shows a total (i.e. the backend quote has arrived) and returns the drawer text. */
const cartText = async (page, mustInclude) => {
  const drawer = page.locator('#checkout-drawer');
  await page.waitForFunction((needle) => { const t = (document.querySelector('#checkout-drawer')?.innerText || '').replace(/,/g, ''); return t.includes(needle); }, mustInclude, { timeout: 20000 });
  return money(await drawer.innerText());
};

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  control({ autoPay: false, ekartAllowBooking: false, calls: [] });
  const browser = await launchBrowser();
  const F = ACCOUNTS.farmsVendor.uid;
  let orderId = null;

  // =============================== CUSTOMER ===============================
  const cctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  // Stand-in for the Cashfree payment window: "the customer paid". The real SDK is never loaded.
  await cctx.route(/sdk\.cashfree\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: 'window.Cashfree = function () { return { checkout: async function (o) { window.__cashfreeCheckoutCalledWith = o; return {}; } }; };' }));
  const cp = await cctx.newPage();
  current = cp;
  const clog = watch(cp);
  const fnCalls = [];
  cp.on('response', async (r) => { const m = r.url().match(/asia-southeast1\/(\w+)$/); if (m) { let body = null; try { body = await r.json(); } catch { /* ignore */ } fnCalls.push({ fn: m[1], status: r.status(), body, request: r.request().postDataJSON?.() }); } });

  await step('CUS-01', 'Login screen offers "Continue with Google" and mobile-number OTP', async () => {
    const modal = await openLogin(cp);
    expect(await modal.getByText('Continue with Google').isVisible(), 'Google button missing');
    expect(await modal.getByText('Sign in with Mobile OTP').isVisible(), 'Mobile OTP button missing');
    await shot(cp, 'customer-01-login');
    return 'both buttons visible';
  });

  await step('CUS-02', 'Mobile OTP sign-in works (emulator SMS code, no real SMS sent)', async () => {
    const modal = cp.locator('#auth-modal-overlay');
    await modal.getByText('Sign in with Mobile OTP').click();
    await modal.locator('#phone-input-form input[type="tel"]').fill('9876500001');
    await modal.locator('#phone-input-form button[type="submit"]').click();
    await modal.locator('#otp-verify-form').waitFor({ state: 'visible', timeout: 20000 });
    const codes = await (await fetch('http://127.0.0.1:9099/emulator/v1/projects/bio-cart/verificationCodes')).json();
    const code = (codes.verificationCodes || []).filter((c) => c.phoneNumber === '+919876500001').pop()?.code;
    expect(code, 'emulator did not issue an OTP code');
    await modal.locator('#otp-verify-form input').first().fill(code);
    await modal.locator('#otp-verify-form button[type="submit"]').click();
    await modal.waitFor({ state: 'hidden', timeout: 20000 });
    await cp.waitForTimeout(1500);
    const t = await bodyText(cp);
    expect(!/Sign In Now/.test(t.slice(0, 600)), 'still shows the signed-out screen');
    await shot(cp, 'customer-02-after-otp');
    return `signed in with the emulator OTP code (${String(code).length} digits)`;
  });

  await step('CUS-03', 'Browse → search → product page', async () => {
    await go(cp, '/shop');
    let t = await bodyText(cp);
    expect(/Wild Forest Honey/.test(t) && /Rule Eight Organic Millet/.test(t), 'seeded products are not listed in the shop');
    const box = cp.locator('input[placeholder*="Search" i]').filter({ visible: true }).first();
    await box.fill('Honey'); await box.press('Enter'); await cp.waitForTimeout(1500);
    t = await bodyText(cp);
    expect(/Wild Forest Honey/.test(t), 'search for "Honey" did not show the honey');
    expect(!/Vermicompost Bulk Bag/.test(t), 'search for "Honey" still shows unrelated products');
    await shot(cp, 'customer-03-search');
    await go(cp, '/product-details?product=test-honey');
    t = await bodyText(cp);
    expect(/Wild Forest Honey/.test(t) && /650/.test(t), 'product page does not show name and price');
    return 'shop lists products; search narrows to honey; product page shows ₹650';
  });

  await step('CUS-04', 'Cart: ₹650 from one vendor → backend quote charges ₹99 delivery (below ₹1,499)', async () => {
    await addProduct(cp, 'test-honey');
    await openCart(cp);
    const t = await cartText(cp, '749');
    expect(/99/.test(t) && /749/.test(t), 'cart does not show ₹99 delivery and ₹749 total');
    const q = await waitCall(fnCalls, 'quoteOrder', (r) => r.totalAmount === 749);
    expect(q.body.result.shippingAmount === 99, `quoteOrder delivery fee is ${q.body.result.shippingAmount}`);
    await shot(cp, 'customer-04-cart-99-delivery');
    return `quoteOrder → subtotal ${q.body.result.subtotal}, delivery ${q.body.result.shippingAmount}, total ${q.body.result.totalAmount}; cart shows the same`;
  });

  await step('CUS-05', 'Add a second product from another vendor → ₹1,650 → delivery free; quantity change and remove work', async () => {
    await cp.locator('#checkout-close').click(); await cp.waitForTimeout(400);
    await addProduct(cp, 'test-millet-1450');
    await openCart(cp);
    let t = await cartText(cp, '1650');
    const q = await waitCall(fnCalls, 'quoteOrder', (r) => r.totalAmount === 1650);
    expect(q.body.result.shippingAmount === 0, `quote says delivery ${q.body.result.shippingAmount}`);
    expect(/Wild Forest Honey/.test(t) && /Rule Eight Organic Millet/.test(t), 'both products should be in the cart');
    // quantity + on the first line, then − back
    const plus = cp.locator('#cart-items-container button', { hasText: '+' }).first();
    await plus.click();
    const plusQuote = await waitCall(fnCalls, 'quoteOrder', (r) => r.totalAmount === 2300 || r.totalAmount === 2650);
    const afterPlus = plusQuote.body.result.totalAmount;
    await cartText(cp, String(afterPlus));
    await cp.locator('#cart-items-container button', { hasText: /^[-−]$/ }).first().click();
    fnCalls.length = 0;
    await waitCall(fnCalls, 'quoteOrder', (r) => r.totalAmount === 1650);
    t = await cartText(cp, '1650');
    // remove the second line, then add it back
    const before = await cp.locator('#cart-items-container').innerText();
    await cp.locator('#cart-items-container button:has(svg.lucide-trash-2), #cart-items-container button:has(svg.lucide-trash)').last().click();
    await cp.waitForTimeout(1500);
    const after = await cp.locator('#cart-items-container').innerText();
    expect(after.length < before.length, 'remove button did not remove a line');
    await cp.locator('#checkout-close').click(); await cp.waitForTimeout(300);
    const missing = /Wild Forest Honey/.test(after) ? 'test-millet-1450' : 'test-honey';
    await addProduct(cp, missing);
    await openCart(cp);
    await waitCall(fnCalls, 'quoteOrder', (r) => r.totalAmount === 1650);
    await cartText(cp, '1650');
    await shot(cp, 'customer-05-cart-two-vendors-free-delivery');
    return `two vendors, total ₹1650, delivery free; qty + → ₹${afterPlus}, − → ₹1650; remove and re-add work`;
  });

  await step('CUS-06', 'Checkout: PIN 522001 is serviceable; an invalid PIN shows a clear message', async () => {
    await cp.getByRole('button', { name: /Proceed to Secure Checkout/i }).click();
    await cp.locator('#step-checkout').waitFor({ state: 'visible', timeout: 8000 });
    const pin = cp.locator('#step-checkout input[placeholder="6-digit PIN"]');
    await pin.fill('999999'); await cp.waitForTimeout(3500);
    const bad = await cp.locator('#step-checkout').innerText();
    expect(/not (available|serviceable|deliver)|cannot deliver|unserviceable|not serviceable/i.test(bad), 'no clear message for an unserviceable PIN');
    await shot(cp, 'customer-06a-pin-not-serviceable');
    await pin.fill('522001'); await cp.waitForTimeout(3500);
    const good = await cp.locator('#step-checkout').innerText();
    expect(/serviceable|deliver(y|able)? (is )?available|delivers|Guntur/i.test(good), 'no confirmation for PIN 522001');
    const pc = fnCalls.filter((c) => c.fn === 'checkEkartPincode').pop();
    expect(pc?.body?.result?.serviceable === true, 'checkEkartPincode did not return serviceable for 522001');
    await shot(cp, 'customer-06b-pin-522001');
    return 'checkEkartPincode(522001) → serviceable (mocked EKART); 999999 → shown as not deliverable';
  });

  await step('CUS-07', 'COD option is hidden while the admin COD switch is OFF', async () => {
    const t = await cp.locator('#step-checkout').innerText();
    expect(/Cashfree Payments/.test(t), 'Cashfree option missing');
    expect(!/Cash on Delivery/i.test(t), 'COD option is visible although the admin switch is off');
    return 'only "Cashfree Payments" is offered';
  });

  await step('CUS-08', 'Pay: backend creates the order and the Cashfree order; payment simulated; order confirmed', async () => {
    const form = cp.locator('#step-checkout');
    // fill whatever the saved address did not prefill
    const fill = async (sel, v) => { const el = form.locator(sel).first(); if (await el.isVisible().catch(() => false)) { if (!(await el.inputValue())) await el.fill(v); } };
    const saved = form.getByText('Test Customer').first();
    if (await saved.isVisible().catch(() => false)) await saved.click().catch(() => {});
    await cp.waitForTimeout(800);
    for (const el of await form.locator('input:visible').all()) {
      const ph = ((await el.getAttribute('placeholder')) || '').toLowerCase(); const type = (await el.getAttribute('type')) || 'text';
      if (await el.inputValue()) continue;
      if (/gstin|business|enterprise|coupon/.test(ph) || type === 'checkbox' || type === 'radio') continue;
      if (type === 'tel' || /phone|mobile/.test(ph)) await el.fill('9876500001');
      else if (type === 'email' || /email/.test(ph)) await el.fill('customer@biocart.test');
      else if (/pin/.test(ph)) await el.fill('522001');
      else if (/city/.test(ph)) await el.fill('Guntur');
      else if (/state/.test(ph)) await el.fill('Andhra Pradesh');
      else if (/name/.test(ph)) await el.fill('Test Customer');
      else await el.fill('12 Main Road, Brodipet');
    }
    for (const el of await form.locator('select:visible').all()) { if (!(await el.inputValue())) await el.selectOption({ label: 'Andhra Pradesh' }).catch(() => {}); }
    await fill('textarea', '12 Main Road, Brodipet');
    await cp.waitForTimeout(3000);
    control({ autoPay: true });
    const pay = form.locator('button[type="submit"]');
    await cp.waitForFunction(() => /Authorize & Pay/.test(document.querySelector('#step-checkout button[type="submit"]')?.innerText || ''), null, { timeout: 20000 });
    const label = money(await pay.innerText());
    expect(/1650/.test(label), `pay button should show the backend total ₹1650, shows "${label}"`);
    await shot(cp, 'customer-08a-checkout-before-pay');
    await pay.click();
    await cp.locator('#step-success, #step-pending').first().waitFor({ state: 'visible', timeout: 45000 });
    await shot(cp, 'customer-08b-after-pay');
    const create = fnCalls.find((c) => c.fn === 'createOrder');
    const cf = fnCalls.find((c) => c.fn === 'createCashfreeOrder');
    expect(create?.body?.result?.orderId, `createOrder failed: ${JSON.stringify(create?.body).slice(0, 200)}`);
    orderId = create.body.result.orderId;
    expect(cf?.body?.result?.paymentSessionId === `session_${orderId}`, `createCashfreeOrder did not return a payment session: ${JSON.stringify(cf?.body).slice(0, 200)}`);
    const sent = JSON.stringify(create.request || {});
    const moneyKeys = [...sent.matchAll(/"([A-Za-z]+)":/g)].map((m) => m[1]).filter((k) => /total|amount|price|subtotal|shippingFee|shippingAmount|discount|commission|payable|payout|paise|tax|courier/i.test(k));
    expect(moneyKeys.length === 0, `the browser sent money fields to createOrder: ${moneyKeys.join(', ')}`);
    expect(await cp.locator('#step-success').isVisible(), 'payment was simulated as paid but the success screen did not show');
    const order = (await db.doc(`orders/${orderId}`).get()).data();
    expect(order.status === 'confirmed' && order.paymentStatus === 'paid' && order.totalAmountPaise === 165000, `order is ${order.status}/${order.paymentStatus} total ${order.totalAmountPaise}`);
    expect(mockCalls().some((c) => c.includes('cashfree.com/pg/orders')), 'the Cashfree mock was not called');
    return `${orderId}: createOrder → createCashfreeOrder (session returned) → simulated payment → verifyCashfreePayment → confirmed/paid ₹1650. Browser sent only product ids, quantities and address.`;
  });

  await step('CUS-09', 'Backend split the order per vendor with commission, courier hold and payout (rule 8: ₹1000, 20%, 1.5 kg → ₹693.80)', async () => {
    expect(orderId, 'no order from the previous step');
    const b = (await db.doc(`orders/${orderId}/vendor_orders/biocart`).get()).data();
    const f = (await db.doc(`orders/${orderId}/vendor_orders/${F}`).get()).data();
    expect(b && f, 'expected one vendor order for Biocart and one for Test Farms');
    expect(b.subtotalPaise === 100000 && b.commissionPaise === 20000 && b.vendorPayablePaise === 80000 && b.courier.estimatedGrams === 1500 && b.courierChargePaise === 10620 && b.netPayoutPaise === 69380, `Biocart slice: ${JSON.stringify({ sub: b.subtotalPaise, com: b.commissionPaise, share: b.vendorPayablePaise, g: b.courier?.estimatedGrams, courier: b.courierChargePaise, net: b.netPayoutPaise })}`);
    expect(f.subtotalPaise === 65000 && f.commissionPaise === 9750 && f.vendorPayablePaise === 55250 && f.courier.estimatedGrams === 800 && f.courierChargePaise === 10620 && f.netPayoutPaise === 44630, `Test Farms slice: ${JSON.stringify({ sub: f.subtotalPaise, com: f.commissionPaise, share: f.vendorPayablePaise, g: f.courier?.estimatedGrams, courier: f.courierChargePaise, net: f.netPayoutPaise })}`);
    const wb = (await db.doc('vendor_wallets/biocart').get()).data();
    expect(wb.pending === 69380, `Biocart wallet pending should be 69380 paise, is ${wb.pending}`);
    return 'Biocart: ₹1000 − 20% (₹200) = ₹800 − courier ₹106.20 (1.5 kg) = ₹693.80 · Test Farms: ₹650 − 15% (₹97.50) = ₹552.50 − courier ₹106.20 (0.8 kg) = ₹446.30 · wallets match';
  });

  await step('CUS-10', 'My Orders shows the new order', async () => {
    await go(cp, '/dashboard?tab=orders');
    await cp.waitForTimeout(1500);
    const t = await bodyText(cp);
    expect(t.includes(orderId), `order ${orderId} is not listed in My Orders`);
    await shot(cp, 'customer-10-my-orders');
    return `${orderId} listed`;
  });

  await step('CUS-11', 'Customer cannot open the admin or vendor panels', async () => {
    await go(cp, '/admin'); await cp.waitForTimeout(1500);
    const a = await bodyText(cp);
    expect(!/Financial Control Center|Vendors Marketplace/.test(a), 'customer can see the admin menu');
    await shot(cp, 'customer-11a-admin-denied');
    await go(cp, '/vendor'); await cp.waitForTimeout(1500);
    const v = await bodyText(cp);
    expect(!/My Products/.test(v) || /denied|not authori|restricted|privileges/i.test(v), 'customer can see the vendor menu');
    await shot(cp, 'customer-11b-vendor-denied');
    return 'both panels refuse the customer account';
  });
  const customerErrors = [...new Set([...clog.pageErrors, ...clog.consoleErrors])];
  await step('CUS-12', 'No JavaScript errors during the whole customer journey', async () => { expect(customerErrors.length === 0, `${customerErrors.slice(0, 4).join(' | ')} || requests: ${[...new Set(clog.failedRequests)].slice(0, 4).join(' | ')}`); return '0 console errors, 0 crashes'; });
  await cctx.close();

  // =============================== VENDOR ===============================
  const vctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const vp = await vctx.newPage();
  current = vp;
  const vlog = watch(vp);
  const dialogs = [];
  vp.on('dialog', async (d) => { dialogs.push(d.message()); await d.accept(/weight/i.test(d.message()) ? '1500' : /size/i.test(d.message()) ? '20x15x10' : undefined); });

  await step('VEN-01', 'Vendor (Biocart) sees only their own products', async () => {
    await login(vp, ACCOUNTS.biocartVendor);
    await go(vp, '/vendor');
    await openSection(vp, 'My Products');
    const t = await bodyText(vp);
    expect(/Rule Eight Organic Millet/.test(t) && /Cold Pressed Neem Oil/.test(t), 'own products are not listed');
    expect(!/Wild Forest Honey|Vermicompost Bulk Bag|A2 Cow Ghee/.test(t), "another vendor's products are visible");
    await shot(vp, 'vendor-01-my-products');
    return '3 Biocart products listed, none from Test Farms';
  });

  await step('VEN-02', 'Vendor order shows order value → commission → courier charge → payout (₹693.80)', async () => {
    await openSection(vp, 'My Orders');
    await vp.waitForTimeout(1500);
    const t = money(await bodyText(vp));
    expect(t.includes(orderId), 'the new order is not in My Orders');
    expect(/Payout: ₹693\.80/.test(t), 'payout ₹693.80 not shown');
    expect(/Commission: -₹200\.00/.test(t), 'commission ₹200.00 not shown');
    expect(/Courier \(EKART\): -₹106\.20?/.test(t), 'courier charge ₹106.20 not shown');
    expect(!/Wild Forest Honey/.test(t), "another vendor's item is visible in this vendor's orders");
    await shot(vp, 'vendor-02-order-breakdown');
    return 'Payout ₹693.80 · Commission −₹200.00 · Courier (EKART) −₹106.20; only Biocart items shown';
  });

  await step('VEN-03', 'Vendor moves the order: Accept → Start Processing → Mark Packed', async () => {
    for (const label of ['Accept', 'Start Processing', 'Mark Packed']) {
      await vp.getByRole('button', { name: label, exact: true }).first().click({ timeout: 10000 });
      await vp.waitForTimeout(2500);
    }
    const so = (await db.doc(`orders/${orderId}/vendor_orders/biocart`).get()).data();
    expect(so.status === 'packed', `status is ${so.status}`);
    return 'backend status = packed';
  });

  await step('VEN-04', 'Dispatch while EKART blocks bookings: EKART\'s real message is shown, no crash, no fake AWB', async () => {
    await vp.getByRole('button', { name: /Dispatch EKART/ }).first().click({ timeout: 10000 });
    await vp.waitForFunction(() => /complete the onboarding process/i.test(document.body.innerText), null, { timeout: 30000 });
    await shot(vp, 'vendor-04-dispatch-blocked-message');
    const t = await bodyText(vp);
    expect(/Shipment creation is blocked\. Please complete the onboarding process/i.test(t), 'EKART message not visible');
    const so = (await db.doc(`orders/${orderId}/vendor_orders/biocart`).get()).data();
    const sh = (await db.doc(`shipments/ekart_${orderId}_biocart`).get()).data() || {};
    expect(so.status === 'packed' && !so.awbNumber && !sh.awb, `order ${so.status}, awb ${so.awbNumber || sh.awb}`);
    expect(vlog.pageErrors.length === 0, 'page crashed: ' + vlog.pageErrors[0]);
    return `toast shows: "…Shipment creation is blocked. Please complete the onboarding process…"; order still Packed; no AWB; prompts asked: ${dialogs.length}`;
  });

  await step('VEN-05', 'Dispatch once EKART allows bookings (mock): real charge replaces the estimate', async () => {
    control({ ekartAllowBooking: true });
    await vp.getByRole('button', { name: /Dispatch EKART/ }).first().click({ timeout: 10000 });
    await vp.waitForFunction(() => /TESTAWB\d+/.test(document.body.innerText), null, { timeout: 30000 });
    control({ ekartAllowBooking: false });
    // the tracking id appears first; the courier charge is settled a moment later in the same backend call
    let so;
    for (let i = 0; i < 40; i++) { so = (await db.doc(`orders/${orderId}/vendor_orders/biocart`).get()).data(); if (so.courier?.status === 'held_actual') break; await vp.waitForTimeout(500); }
    expect(so.status === 'shipped' && /^TESTAWB/.test(so.awbNumber) && so.courier.status === 'held_actual' && so.courierChargePaise === 10620, JSON.stringify({ s: so.status, awb: so.awbNumber, c: so.courier?.status, p: so.courierChargePaise }));
    await shot(vp, 'vendor-05-dispatched');
    return `AWB ${so.awbNumber} from the EKART mock; hold now "actual" ₹106.20 (1.5 kg booked)`;
  });

  await step('VEN-06', 'Wallet shows the pending payout', async () => {
    await openSection(vp, 'Wallet');
    await vp.waitForTimeout(1500);
    const t = money(await bodyText(vp));
    expect(/693\.8/.test(t), 'pending ₹693.80 not shown in the wallet');
    await shot(vp, 'vendor-06-wallet');
    return 'wallet shows ₹693.80 pending';
  });

  await step('VEN-07', 'Vendor cannot open the admin panel', async () => {
    await go(vp, '/admin'); await vp.waitForTimeout(1500);
    const t = await bodyText(vp);
    expect(!/Financial Control Center|Vendors Marketplace/.test(t), 'vendor can see the admin menu');
    await shot(vp, 'vendor-07-admin-denied');
    return 'admin panel refuses the vendor account';
  });

  await step('VEN-08', 'New product form asks for weight and box size (L × B × H)', async () => {
    await go(vp, '/vendor');
    await openSection(vp, 'My Products');
    await vp.getByRole('button', { name: /add (new )?product/i }).filter({ visible: true }).first().click({ timeout: 8000 });
    await vp.waitForTimeout(1200);
    await shot(vp, 'vendor-08-add-product-form');
    const t = await bodyText(vp);
    expect(/weight \(g|weight in grams|shipping weight/i.test(t), 'no weight (grams) field in the product form');
    expect(/length/i.test(t) && /width|breadth/i.test(t) && /height/i.test(t), 'no length / width / height fields in the product form');
    return 'weight and L × B × H fields present';
  });
  // The blocked booking in VEN-04 is expected to log EKART's rejection; anything else is a real error.
  const vendorErrors = [...new Set([...vlog.pageErrors, ...vlog.consoleErrors])].filter((e) => !/status of 503|Failed to create shipment: FirebaseError: EKART could not book/.test(e));
  await step('VEN-09', 'No JavaScript errors during the vendor journey', async () => { expect(vendorErrors.length === 0, vendorErrors.slice(0, 4).join(' | ')); return '0 console errors, 0 crashes'; });
  await vctx.close();

  // =============================== ADMIN ===============================
  const actx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const ap = await actx.newPage();
  current = ap;
  const alog = watch(ap);

  await step('ADM-01', 'Admin logs in and sees the admin panel', async () => {
    await login(ap, ACCOUNTS.admin);
    await go(ap, '/admin');
    const t = await bodyText(ap);
    expect(/Financial Control Center/.test(t) && /Vendors Marketplace/.test(t), 'admin menu not shown');
    await shot(ap, 'admin-01-dashboard');
    return 'admin menu visible';
  });

  await step('ADM-02', 'Admin sees both vendors and the order', async () => {
    await openSection(ap, 'Vendors Marketplace');
    let t = await bodyText(ap);
    expect(/Biocart/.test(t) && /Test Farms/.test(t), 'vendors not listed');
    await shot(ap, 'admin-02-vendors');
    await openSection(ap, 'Orders Foundation');
    await ap.waitForTimeout(1500);
    t = await bodyText(ap);
    expect(t.includes(orderId), 'order not listed for admin');
    await shot(ap, 'admin-02-orders');
    return 'vendors and order listed';
  });

  await step('ADM-03', 'Admin lowers the free-delivery threshold to ₹500 → a ₹650 cart ships free; restored → ₹99 again', async () => {
    const before = await callFn('quoteOrder', { items: [{ productId: 'test-honey', quantity: 1 }] });
    const denied = await callFn('updateFinancialPolicy', { freeShippingThreshold: 500 }, ACCOUNTS.customer);
    const set = await callFn('updateFinancialPolicy', { freeShippingThreshold: 500 }, ACCOUNTS.admin);
    const after = await callFn('quoteOrder', { items: [{ productId: 'test-honey', quantity: 1 }] });
    await callFn('updateFinancialPolicy', { freeShippingThreshold: 1499 }, ACCOUNTS.admin);
    const restored = await callFn('quoteOrder', { items: [{ productId: 'test-honey', quantity: 1 }] });
    expect(before.data.shippingAmount === 99 && !denied.ok && set.ok && after.data.shippingAmount === 0 && restored.data.shippingAmount === 99, JSON.stringify({ before: before.data?.shippingAmount, denied: denied.error, after: after.data?.shippingAmount, restored: restored.data?.shippingAmount }));
    return `₹99 → (threshold ₹500) ₹0 → (restored ₹1,499) ₹99; customer account refused: ${denied.error}`;
  });

  await step('ADM-04', 'Admin turns COD ON → checkout offers COD only for COD-enabled products; OFF hides it again', async () => {
    await callFn('updateFinancialPolicy', { codEnabled: true }, ACCOUNTS.admin);
    const ghee = await callFn('quoteOrder', { items: [{ productId: 'test-ghee', quantity: 1 }] });
    const honey = await callFn('quoteOrder', { items: [{ productId: 'test-honey', quantity: 1 }] });
    // browser check with a COD-enabled product
    const gctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const gp = await gctx.newPage();
    await login(gp, ACCOUNTS.customer);
    await addProduct(gp, 'test-ghee'); await openCart(gp); await cartText(gp, '1800');
    await gp.getByRole('button', { name: /Proceed to Secure Checkout/i }).click();
    await gp.locator('#step-checkout').waitFor({ state: 'visible' }); await gp.waitForTimeout(2500);
    const on = /Cash on Delivery/i.test(await gp.locator('#step-checkout').innerText());
    await gp.screenshot({ path: path.join(SHOTS, 'admin-04a-cod-on-checkout.jpg'), type: 'jpeg', quality: 55 });
    await callFn('updateFinancialPolicy', { codEnabled: false }, ACCOUNTS.admin);
    await gp.locator('#checkout-close').click(); await gp.waitForTimeout(300); await openCart(gp); await cartText(gp, '1800');
    await gp.getByRole('button', { name: /Proceed to Secure Checkout/i }).click(); await gp.waitForTimeout(2500);
    const off = /Cash on Delivery/i.test(await gp.locator('#step-checkout').innerText());
    await gp.screenshot({ path: path.join(SHOTS, 'admin-04b-cod-off-checkout.jpg'), type: 'jpeg', quality: 55 });
    await gctx.close();
    expect(ghee.data.codAvailable === true && honey.data.codAvailable === false && on && !off, JSON.stringify({ ghee: ghee.data?.codAvailable, honey: honey.data?.codAvailable, shownWhenOn: on, shownWhenOff: off }));
    return 'COD ON: offered for the COD-enabled ghee, not for honey; COD OFF: option disappears from checkout';
  });

  await step('ADM-05', 'Admin marks the shipped order delivered → payout becomes ready; manual settlement run is recorded', async () => {
    const md = await callFn('adminMarkDelivered', { orderId, vendorId: 'biocart', reason: 'Test: courier proof of delivery 123' }, ACCOUNTS.admin);
    expect(md.ok, md.error);
    const so = (await db.doc(`orders/${orderId}/vendor_orders/biocart`).get()).data();
    const w = (await db.doc('vendor_wallets/biocart').get()).data();
    expect(so.earnings.state === 'eligible' && w.available === 69380 && w.pending === 0, JSON.stringify({ state: so.earnings?.state, available: w.available, pending: w.pending }));
    const run = await callFn('triggerManualSettlement', {}, ACCOUNTS.admin);
    expect(run.ok, run.error);
    const audits = (await db.collection('audit_logs').get()).docs.map((d) => d.data().action);
    expect(audits.includes('manual_delivery_confirmation') && audits.includes('settlement_cycle_run'), `audit actions: ${audits.join(', ')}`);
    return `payout ₹693.80 moved to "ready for Tuesday"; settlement run → ${JSON.stringify(run.data).slice(0, 110)}; audit log has both entries`;
  });

  await step('ADM-06', 'Admin cancels the unshipped Test Farms part → courier hold released, refund created (mock Cashfree)', async () => {
    const r = await callFn('processOrderRefund', { orderId, vendorId: F, reason: 'Test cancel before shipping', restock: true }, ACCOUNTS.admin);
    expect(r.ok, r.error);
    const so = (await db.doc(`orders/${orderId}/vendor_orders/${F}`).get()).data();
    const w = (await db.doc(`vendor_wallets/${F}`).get()).data();
    const led = (await db.collection('financial_ledger').where('orderId', '==', orderId).get()).docs.map((d) => d.data());
    const rel = led.find((e) => e.entryType === 'courier_charge_released');
    expect(so.status === 'cancelled' && so.courier.status === 'released' && rel?.amountPaise === -10620 && (w.pending || 0) === 0 && (w.adjustmentDue || 0) === 0, JSON.stringify({ status: so.status, courier: so.courier?.status, rel: rel?.amountPaise, pending: w.pending, due: w.adjustmentDue }));
    const refund = (await db.collection('refunds').where('orderId', '==', orderId).get()).docs.map((d) => d.data())[0];
    expect(refund && refund.amountPaise === 65000, `refund: ${JSON.stringify(refund).slice(0, 150)}`);
    return `Test Farms part cancelled; hold of ₹106.20 released; wallet back to ₹0; customer refund ₹650 (${refund.status})`;
  });

  await step('ADM-07', 'Suspending a vendor (not deleting) stops sales but keeps their orders', async () => {
    await db.doc(`vendors/${F}`).update({ status: 'suspended' });
    const q = await callFn('quoteOrder', { items: [{ productId: 'test-honey', quantity: 1 }] });
    const kept = (await db.doc(`orders/${orderId}/vendor_orders/${F}`).get()).exists;
    await db.doc(`vendors/${F}`).update({ status: 'active' });
    expect(!q.ok && kept, `quote ok=${q.ok}, order kept=${kept}`);
    return `suspended vendor's product refused ("${String(q.error).slice(0, 70)}"); earlier order still there`;
  });

  await step('ADM-08', 'Admin screens for settings, payouts and logistics open without errors', async () => {
    for (const label of ['Store Settings', 'Payouts & Settlements', 'Logistics & EKART', 'Financial Control Center']) {
      await openSection(ap, label);
      const t = await bodyText(ap);
      expect(t.length > 200, `${label} looks empty`);
      await shot(ap, `admin-08-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`);
    }
    return '4 screens rendered';
  });
  const adminErrors = [...new Set([...alog.pageErrors, ...alog.consoleErrors])];
  await step('ADM-09', 'No JavaScript errors during the admin journey', async () => { expect(adminErrors.length === 0, adminErrors.slice(0, 4).join(' | ')); return '0 console errors, 0 crashes'; });
  await actx.close();

  await browser.close();
  const fails = results.filter((r) => !r.pass).length;
  fs.writeFileSync(path.join(OUT, 'flows.json'), JSON.stringify(results, null, 1));
  console.log(`\nFLOWS: ${results.length - fails} pass / ${fails} fail of ${results.length} steps`);
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('FLOW TEST ERROR', e); process.exit(2); });
