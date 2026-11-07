// Browser smoke test of the BUILT storefront (dist/): cart → checkout must render with no
// runtime errors (this is the test that catches crashes like "Loader2 is not defined").
// Backend calls are intercepted, so no real payment or Firebase write happens.
// Usage: npm run build && node tests/ui/checkout-smoke.cjs
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = process.env.BIOCART_ROOT || path.join(__dirname, '..', '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, 'docs', 'evidence');
const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.json': 'application/json', '.ico': 'image/x-icon' };

function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const p = decodeURIComponent((req.url || '/').split('?')[0]);
      let file = path.join(DIST, p);
      if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

(async () => {
  if (!fs.existsSync(path.join(DIST, 'index.html'))) { console.error('Run "npm run build" first.'); process.exit(2); }
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await serve();
  const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch();
  const failures = [];
  for (const viewport of [{ width: 1280, height: 900, name: 'desktop' }, { width: 375, height: 800, name: 'mobile' }]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route(/cloudfunctions\.net\/quoteOrder/, async (route) => {
      await new Promise((r) => setTimeout(r, 1500)); // keep the "loading" state visible for a moment
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result: { subtotal: 149, totalAmount: 248, shippingAmount: 99, discountAmount: 0, taxAmount: 0, freeShippingThreshold: 1499, minOrderValue: 0, codAvailable: false, codMinValue: 0, codMaxValue: 49999 } }) });
    });
    await page.route(/googleapis\.com|firebaseio|gstatic|cashfree|google-analytics|googletagmanager/, (r) => r.abort());
    await page.addInitScript(() => {
      localStorage.setItem('biocart-cart', JSON.stringify([{ id: 'smoke-product', name: 'Smoke Test Vermicompost', price: 149, mrp: 249, vendorId: 'biocart', category: 'Organic Fertilizers', image: '/assets/products/prod_vermicompost.png', quantityInCart: 1 }]));
    });
    await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const cartButton = page.locator('button:visible:has(svg.lucide-shopping-bag)').first();
    if (await cartButton.count()) {
      await cartButton.click();
    } else {
      await page.locator('button:visible:has(svg.lucide-menu)').first().click();
      await page.locator('#mobile-menu-cart').click();
    }
    await page.waitForTimeout(800);
    const proceed = page.locator('button:has-text("Checkout"), button:has-text("Proceed")').first();
    await proceed.click({ timeout: 10000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, `ui-checkout-loading-${viewport.name}.png`) });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUT, `ui-checkout-ready-${viewport.name}.png`) });
    const body = await page.innerText('body');
    const ok = errors.length === 0 && /Authorize & Pay|Pay/i.test(body) && body.includes('248');
    console.log(`${ok ? 'PASS' : 'FAIL'}  checkout renders (${viewport.name}) — runtime errors: ${errors.length ? errors.join(' | ') : 'none'}; total ₹248 shown: ${body.includes('248')}`);
    if (!ok) failures.push(viewport.name);
    await page.close();
  }
  await browser.close();
  srv.close();
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error('UI SMOKE ERROR', e.message); process.exit(2); });
