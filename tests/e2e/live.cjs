// READ-ONLY checks of the live site. It only loads pages, opens the login windows, puts one product
// in the browser cart and types a PIN code. It never signs in, never submits an order, never pays.
// Usage: node tests/e2e/live.cjs [https://biocart.in]
const fs = require('fs');
const path = require('path');
const { watch } = require('./lib.cjs');

const base = (process.argv[2] || 'https://biocart.in').replace(/\/$/, '');
const OUT = path.join(__dirname, '..', '..', 'qa-report');
const SHOTS = path.join(OUT, 'live');
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const PIXEL_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
const VIEWPORTS = [
  { name: 'iphone13-390x844', width: 390, height: 844, ua: IPHONE_UA, touch: true },
  { name: 'pixel7-412x915', width: 412, height: 915, ua: PIXEL_UA, touch: true },
  { name: 'ipad-768x1024', width: 768, height: 1024, touch: true },
  { name: 'laptop-1366x768', width: 1366, height: 768 },
  { name: 'desktop-1920x1080', width: 1920, height: 1080 },
];
// Third-party noise that is not a fault of the site (analytics / fonts blocked by the test network).
const IGNORE = /google-analytics|googletagmanager|doubleclick|fonts\.g|gstatic|facebook|clarity|hotjar|ERR_TUNNEL|ERR_PROXY|net::ERR_FAILED|status of 40[37]/i;

/** A real, approved, in-stock product id from the public catalogue (anonymous read, read-only). */
async function pickLiveProduct() {
  const r = await fetch('https://firestore.googleapis.com/v1/projects/bio-cart/databases/(default)/documents/products?pageSize=60');
  const j = await r.json();
  const val = (f) => f && (f.stringValue ?? f.doubleValue ?? f.integerValue ?? f.booleanValue);
  const ok = (j.documents || []).map((d) => ({ id: d.name.split('/').pop(), f: d.fields || {} })).filter(({ f }) =>
    val(f.active) !== false && String(val(f.approvalStatus) || 'approved').toLowerCase() === 'approved' && Number(val(f.price)) > 0 && val(f.inStock) !== false && !val(f.isTest));
  if (!ok.length) throw new Error('no public product found');
  return `/product-details?product=${encodeURIComponent(ok[0].id)}`;
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const { chromium } = require('playwright');
  const custom = process.env.PLAYWRIGHT_CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : null);
  const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined;
  const browser = await chromium.launch({ ...(custom ? { executablePath: custom } : {}), ...(proxy ? { proxy } : {}) });
  const rows = [];
  let productPath = null;
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, userAgent: vp.ua, hasTouch: !!vp.touch, isMobile: !!vp.ua });
    const page = await ctx.newPage();
    const log = watch(page);
    const settle = async (ms = 2500) => { await page.locator('#global-loader').waitFor({ state: 'detached', timeout: 30000 }).catch(() => {}); await page.waitForTimeout(ms); };
    const visit = async (name, fn) => {
      log.consoleErrors.length = 0; log.pageErrors.length = 0; log.failedRequests.length = 0;
      const row = { viewport: vp.name, page: name };
      try {
        row.note = (await fn()) || '';
        const info = await page.evaluate(() => ({ text: document.body.innerText.trim().length, overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth, notFound: /page not found/i.test(document.body.innerText.slice(0, 800)), gstin: /\b\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z\d]Z[A-Z\d]\b/.test(document.body.innerText) }));
        Object.assign(row, info);
      } catch (e) { row.error = String(e.message).split('\n')[0].slice(0, 200); }
      row.consoleErrors = [...new Set(log.consoleErrors)].filter((e) => !IGNORE.test(e));
      row.pageErrors = [...new Set(log.pageErrors)];
      row.failedRequests = [...new Set(log.failedRequests)].filter((e) => !IGNORE.test(e));
      await page.screenshot({ path: path.join(SHOTS, `${vp.name}__${name}.jpg`), type: 'jpeg', quality: 45 }).catch(() => {});
      rows.push(row);
      const bad = [row.error && 'ERROR', row.pageErrors.length && 'crash', row.consoleErrors.length && `console×${row.consoleErrors.length}`, row.failedRequests.length && `net×${row.failedRequests.length}`, row.overflow > 1 && `overflow ${row.overflow}px`, row.text < 30 && !row.error && 'WHITE', row.notFound && 'not-found', row.gstin && 'GSTIN'].filter(Boolean);
      console.log(`${vp.name.padEnd(20)} ${name.padEnd(22)} ${bad.length ? bad.join(', ') : 'ok'}${row.error ? ' — ' + row.error : ''}${row.note ? '  (' + row.note + ')' : ''}`);
    };
    const go = async (p) => { await page.goto(base + p, { waitUntil: 'domcontentloaded', timeout: 60000 }); await settle(); };

    await visit('home', () => go('/'));
    await visit('shop', async () => {
      await go('/shop');
      if (!productPath) {
        // find a real product id from the catalogue the page loaded (read-only)
        const href = await page.evaluate(() => [...document.querySelectorAll('a[href*="product-details"]')].map((a) => a.getAttribute('href'))[0] || null);
        productPath = href;
      }
    });
    await visit('product', async () => {
      if (!productPath) productPath = await pickLiveProduct();
      await go(productPath);
      const name = await page.locator('h1').filter({ visible: true }).first().innerText({ timeout: 8000 }).catch(() => '');
      return `${productPath} → "${name.slice(0, 40)}"`;
    });
    await visit('cart', async () => {
      const add = page.getByRole('button', { name: /add to (cart|bag|basket)/i }).filter({ visible: true }).first();
      await add.click({ timeout: 10000 });
      await page.waitForTimeout(1200);
      if (!(await page.locator('#checkout-drawer').isVisible().catch(() => false))) {
        const btn = page.locator('#cart-nav-btn, #compact-cart-btn').filter({ visible: true }).first();
        if (await btn.isVisible().catch(() => false)) await btn.click(); else { await page.locator('#mobile-menu-toggle-btn').click(); await page.locator('#mobile-menu-cart').click(); }
      }
      await page.locator('#checkout-drawer').waitFor({ state: 'visible', timeout: 10000 });
      await page.waitForTimeout(3500);
      return 'cart opened (browser only, nothing saved)';
    });
    await visit('checkout-pin-522001', async () => {
      await page.getByRole('button', { name: /Proceed to Secure Checkout/i }).click({ timeout: 10000 });
      await page.waitForTimeout(1500);
      const pin = page.locator('#step-checkout input[placeholder="6-digit PIN"]');
      if (!(await pin.isVisible().catch(() => false))) return 'checkout asks the visitor to sign in first (not signing in on live)';
      await pin.fill('522001');
      await page.waitForTimeout(5000);
      const t = await page.locator('#step-checkout').innerText();
      return /EKART Express Delivery Available/i.test(t) ? 'PIN 522001: delivery available' : /cannot deliver|Limited Logistics/i.test(t) ? 'PIN 522001: NOT serviceable' : 'PIN typed; no badge shown';
    });
    await visit('customer-login', async () => { await go('/dashboard'); await page.getByRole('button', { name: 'Sign In Now' }).filter({ visible: true }).first().click({ timeout: 10000 }); await page.locator('#auth-modal-overlay').waitFor({ state: 'visible', timeout: 8000 }); const t = await page.locator('#auth-modal-overlay').innerText(); return `Google: ${/Continue with Google/.test(t) ? 'yes' : 'NO'}, Mobile OTP: ${/Mobile OTP/.test(t) ? 'yes' : 'NO'}`; });
    await visit('vendor-login', async () => { await go('/vendor'); await page.waitForTimeout(1500); return (await page.locator('#auth-modal-overlay').isVisible().catch(() => false)) ? 'login window shown' : 'login prompt page shown'; });
    await visit('admin-login', async () => { await go('/admin'); await page.waitForTimeout(1500); return (await page.locator('#auth-modal-overlay').isVisible().catch(() => false)) ? 'login window shown' : 'login prompt page shown'; });
    for (const slug of ['about', 'contact', 'privacy-policy', 'terms-of-service']) await visit(slug, () => go('/' + slug));
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'live.json'), JSON.stringify(rows, null, 1));
  const errors = rows.filter((r) => r.error || r.pageErrors.length || r.consoleErrors.length || (r.text < 30 && !r.error));
  console.log(`\nLIVE ${base}: ${rows.length} page checks, ${rows.length - errors.length} clean, ${errors.length} with errors`);
  for (const r of errors) console.log(`  ${r.viewport} ${r.page}: ${r.error || [...r.pageErrors, ...r.consoleErrors].slice(0, 2).join(' | ') || 'white screen'}`);
  process.exit(errors.length ? 1 : 0);
})().catch((e) => { console.error('LIVE CHECK ERROR', e); process.exit(2); });
