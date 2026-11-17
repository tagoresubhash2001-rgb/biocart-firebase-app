// Page × viewport compatibility crawl against the emulator build.
// For every page it records console errors, failed requests, horizontal overflow, clipped text,
// small tap targets (mobile), broken images, dead links and white screens, and saves a screenshot.
// Usage (normally through `npm run test:e2e`): node tests/e2e/pages.cjs <baseUrl> [viewportName]
const fs = require('fs');
const path = require('path');
const { watch, launchBrowser } = require('./lib.cjs');
const { PASSWORD, ACCOUNTS } = require('./seed.cjs');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'qa-report');
const SHOTS = path.join(OUT, 'screens');
const base = process.argv[2];
const only = process.argv[3] || null;

const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const PIXEL_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
const VIEWPORTS = [
  { key: 'iphone13', name: 'iphone13-390x844-webkit', engine: 'webkit', width: 390, height: 844, mobile: true, ua: IPHONE_UA },
  { key: 'pixel7', name: 'pixel7-412x915-chromium', engine: 'chromium', width: 412, height: 915, mobile: true, ua: PIXEL_UA },
  { key: 'ipad-portrait', name: 'ipad-portrait-768x1024', engine: 'webkit', width: 768, height: 1024, mobile: true },
  { key: 'ipad-landscape', name: 'ipad-landscape-1024x768', engine: 'webkit', width: 1024, height: 768, mobile: true },
  { key: 'laptop', name: 'laptop-1366x768', engine: 'chromium', width: 1366, height: 768 },
  { key: 'desktop-chromium', name: 'desktop-1920x1080-chromium', engine: 'chromium', width: 1920, height: 1080 },
  { key: 'desktop-firefox', name: 'desktop-1920x1080-firefox', engine: 'firefox', width: 1920, height: 1080 },
].filter((v) => !only || v.key === only);

const settle = async (page, ms = 1200) => {
  await page.locator('#global-loader').waitFor({ state: 'detached', timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(ms);
};
const go = async (page, p) => { await page.goto(base + p, { waitUntil: 'domcontentloaded', timeout: 45000 }); await settle(page); };
const clickText = async (page, text, opts = {}) => {
  const loc = page.getByText(text, { exact: opts.exact !== false }).filter({ visible: true }).first();
  await loc.click({ timeout: 8000 });
  await page.waitForTimeout(opts.wait || 1500);
};
/** Opens a panel section from the side menu (on small screens the menu is behind a ☰ button). */
const openSection = async (page, label) => {
  const inMenu = () => page.locator('aside, nav').getByText(label, { exact: true }).filter({ visible: true }).first();
  // On phones the side menu is slid off-screen (still "visible" to the browser) until the menu button is pressed.
  const inView = await inMenu().evaluate((el) => { const r = el.getBoundingClientRect(); return r.right > 0 && r.left < innerWidth; }).catch(() => false);
  if (!inView) {
    const toggle = page.locator('button[aria-label="Open navigation menu"], button:has(svg.lucide-menu)').filter({ visible: true }).first();
    if (await toggle.isVisible().catch(() => false)) { await toggle.click(); await page.waitForTimeout(600); }
  }
  const target = (await inMenu().isVisible().catch(() => false)) ? inMenu() : page.getByRole('button', { name: label, exact: true }).filter({ visible: true }).first();
  await target.click({ timeout: 8000 });
  await page.waitForTimeout(1800);
};

async function login(page, account) {
  await go(page, '/dashboard');
  const modal = page.locator('#auth-modal-overlay');
  if (!(await modal.isVisible().catch(() => false))) { await page.getByRole('button', { name: 'Sign In Now' }).filter({ visible: true }).first().click({ timeout: 8000 }); }
  await modal.locator('input[type="email"]').fill(account.email, { timeout: 10000 });
  await modal.locator('input[type="password"]').fill(PASSWORD);
  await modal.locator('input[type="password"]').press('Enter');
  await modal.waitFor({ state: 'hidden', timeout: 20000 });
  await page.waitForTimeout(1500);
}

const addToCart = async (page) => {
  await go(page, '/product-details?product=test-honey');
  await page.getByRole('button', { name: /add to (cart|bag|basket)/i }).filter({ visible: true }).first().click({ timeout: 10000 });
  await page.waitForTimeout(1200);
};

// ---- page lists -------------------------------------------------------------------------------
const PUBLIC = [
  ['home', async (p) => go(p, '/')],
  ['shop', async (p) => go(p, '/shop')],
  ['search', async (p) => { await go(p, '/shop'); const box = p.locator('input[placeholder*="Search" i]').filter({ visible: true }).first(); await box.fill('Honey', { timeout: 8000 }); await box.press('Enter'); await p.waitForTimeout(1500); }],
  ['product-detail', async (p) => go(p, '/product-details?product=test-honey')],
  ['cart', async (p) => { await addToCart(p); await p.locator('#cart-nav-btn, #compact-cart-btn, #mobile-menu-cart').filter({ visible: true }).first().click({ timeout: 8000 }).catch(async () => { await p.locator('#mobile-menu-toggle-btn').click(); await p.locator('#mobile-menu-cart').click(); }); await p.waitForTimeout(1500); }],
  ['login', async (p) => { await go(p, '/dashboard'); await p.getByRole('button', { name: 'Sign In Now' }).filter({ visible: true }).first().click({ timeout: 8000 }); await p.waitForTimeout(800); }],
  ['login-mobile-otp', async (p) => { await p.getByText('Sign in with Mobile OTP').filter({ visible: true }).first().click({ timeout: 8000 }); await p.waitForTimeout(800); }],
  ['signup', async (p) => { await go(p, '/dashboard'); await p.getByRole('button', { name: 'Sign In Now' }).filter({ visible: true }).first().click({ timeout: 8000 }); await p.getByText('Register', { exact: true }).filter({ visible: true }).first().click({ timeout: 8000 }); await p.waitForTimeout(800); }],
  ['about', async (p) => go(p, '/about')],
  ['contact', async (p) => go(p, '/contact')],
  ['policy-privacy', async (p) => go(p, '/privacy-policy')],
  ['policy-terms', async (p) => go(p, '/terms-of-service')],
  ['policy-refund', async (p) => go(p, '/returns-refunds')],
  ['policy-shipping', async (p) => go(p, '/shipping-customs')],
  ['404', async (p) => go(p, '/this-page-does-not-exist')],
];
const CUSTOMER = [
  ['checkout', async (p) => { await addToCart(p); await p.locator('#cart-nav-btn, #compact-cart-btn').filter({ visible: true }).first().click({ timeout: 8000 }).catch(async () => { await p.locator('#mobile-menu-toggle-btn').click(); await p.locator('#mobile-menu-cart').click(); }); await p.waitForTimeout(1500); await p.getByRole('button', { name: /checkout|proceed|continue/i }).filter({ visible: true }).first().click({ timeout: 8000 }).catch(() => {}); await p.waitForTimeout(2500); }],
  ...['overview', 'profile', 'orders', 'track', 'wishlist', 'addresses', 'security'].map((t) => [`account-${t}`, async (p) => go(p, `/dashboard?tab=${t}`)]),
];
const VENDOR = [
  ['vendor-dashboard', async (p) => go(p, '/vendor')],
  ...[['products', 'My Products'], ['orders', 'My Orders'], ['coupons', 'Coupons'], ['wallet', 'Wallet'], ['settings', 'Settings']].map(([id, label]) => [`vendor-${id}`, async (p) => { await go(p, '/vendor'); await openSection(p, label); }]),
  ['vendor-product-add', async (p) => { await go(p, '/vendor'); await openSection(p, 'My Products'); await p.getByRole('button', { name: /add (new )?product/i }).filter({ visible: true }).first().click({ timeout: 8000 }); await p.waitForTimeout(1500); }],
];
const ADMIN_TABS = [['dashboard', 'Dashboard'], ['financials', 'Financial Control Center'], ['products', 'Products Catalog'], ['inventory', 'Inventory'], ['categories', 'Categories'], ['coupons', 'Coupons'], ['promotions', 'Product Promotions'], ['ribbons', 'Promotional Ribbons'], ['pages', 'Page Management'], ['blogs', 'Blog CMS & SEO'], ['reviews', 'Reviews Moderation'], ['faqs', 'FAQs'], ['vendors', 'Vendors Marketplace'], ['payouts', 'Payouts & Settlements'], ['agents', 'Agent Management'], ['customers', 'Customers'], ['users', 'Admin Users'], ['orders', 'Orders Foundation'], ['shipments', 'Logistics & EKART'], ['contact-messages', 'Contact Messages'], ['settings', 'Store Settings'], ['audit-logs', 'Audit Logs']];
const ADMIN = ADMIN_TABS.map(([id, label]) => [`admin-${id}`, async (p) => { await go(p, '/admin'); if (id !== 'dashboard') await openSection(p, label); }]);

// ---- in-page checks ---------------------------------------------------------------------------
const inspect = (mobile) => {
  const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.05 && r.bottom > 0 && r.top < innerHeight * 6; };
  const label = (el) => (el.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || el.id || el.className || el.tagName).toString().trim().replace(/\s+/g, ' ').slice(0, 40);
  const doc = document.documentElement;
  const overflowPx = Math.max(doc.scrollWidth, document.body.scrollWidth) - innerWidth;
  const wide = overflowPx > 1 ? [...document.querySelectorAll('body *')].filter((el) => vis(el) && el.getBoundingClientRect().right > innerWidth + 1 && !el.closest('[class*="overflow-x-auto"],[class*="overflow-auto"],[class*="overflow-hidden"],[class*="overflow-x-hidden"]')).slice(0, 4).map(label) : [];
  const brokenImages = [...document.images].filter((i) => vis(i) && i.complete && i.naturalWidth === 0).map((i) => (i.currentSrc || i.src).slice(0, 100));
  const small = !mobile ? [] : [...document.querySelectorAll('button, a[href], [role="button"], input[type="checkbox"], input[type="radio"], select')].filter((el) => { if (!vis(el) || el.disabled) return false; const r = el.getBoundingClientRect(); return r.top < innerHeight * 3 && (r.height < 40 || r.width < 40) && !(el.tagName === 'A' && getComputedStyle(el).display === 'inline'); }).map((el) => { const r = el.getBoundingClientRect(); return `${label(el)} (${Math.round(r.width)}×${Math.round(r.height)})`; });
  const clipped = [...document.querySelectorAll('h1,h2,h3,h4,p,span,button,a,td,th,label')].filter((el) => { if (!vis(el) || el.children.length > 0 || !el.innerText.trim()) return false; const s = getComputedStyle(el); return el.scrollWidth > el.clientWidth + 2 && s.overflow.includes('hidden') && s.textOverflow !== 'ellipsis' && s.whiteSpace === 'nowrap'; }).map(label).slice(0, 6);
  const deadLinks = [...document.querySelectorAll('a')].filter((a) => vis(a) && (!a.getAttribute('href') || a.getAttribute('href') === '#' || /^javascript:/i.test(a.getAttribute('href') || ''))).map(label).slice(0, 6);
  const text = document.body.innerText.trim();
  return { overflowPx: Math.max(0, overflowPx), wide, brokenImages, small, clipped, deadLinks, textLength: text.length, notFound: /page not found|404/i.test(text.slice(0, 600)), fakeGstin: /\b\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z\d]Z[A-Z\d]\b/.test(text) };
};

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browsers = {};
  const results = [];
  for (const vp of VIEWPORTS) {
    for (const [role, account, pages] of [['guest', null, PUBLIC], ['customer', ACCOUNTS.customer, CUSTOMER], ['vendor', ACCOUNTS.biocartVendor, VENDOR], ['admin', ACCOUNTS.admin, ADMIN]]) {
      browsers[vp.engine] = browsers[vp.engine] || await launchBrowser(vp.engine);
      const ctx = await browsers[vp.engine].newContext({ viewport: { width: vp.width, height: vp.height }, userAgent: vp.ua, hasTouch: !!vp.mobile, ...(vp.engine !== 'firefox' ? { isMobile: !!vp.ua } : {}), deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      let log = watch(page);
      let loginError = null;
      if (account) await login(page, account).catch((e) => { loginError = e.message.split('\n')[0]; });
      for (const [name, open] of pages) {
        log.consoleErrors.length = 0; log.pageErrors.length = 0; log.failedRequests.length = 0;
        const row = { viewport: vp.name, role, page: name };
        try {
          if (loginError) throw new Error('login failed: ' + loginError);
          await open(page);
          Object.assign(row, await page.evaluate(inspect, !!vp.mobile && vp.width < 768));
        } catch (e) { row.error = e.message.split('\n')[0].slice(0, 200); }
        row.consoleErrors = [...new Set(log.consoleErrors)];
        row.pageErrors = [...new Set(log.pageErrors)];
        row.failedRequests = [...new Set(log.failedRequests)];
        row.whiteScreen = !row.error && row.textLength < 30;
        const file = `${vp.name}__${name}.jpg`;
        await page.screenshot({ path: path.join(SHOTS, file), type: 'jpeg', quality: 45 }).catch(() => {});
        row.screenshot = `screens/${file}`;
        results.push(row);
        const bad = [row.error && 'ERROR', row.pageErrors.length && 'crash', row.consoleErrors.length && `console×${row.consoleErrors.length}`, row.failedRequests.length && `net×${row.failedRequests.length}`, row.overflowPx > 1 && `overflow ${row.overflowPx}px`, row.brokenImages?.length && `img×${row.brokenImages.length}`, row.whiteScreen && 'WHITE', row.fakeGstin && 'GSTIN'].filter(Boolean);
        console.log(`${vp.name.padEnd(24)} ${role.padEnd(8)} ${name.padEnd(24)} ${bad.length ? bad.join(', ') : 'ok'}${row.error ? ' — ' + row.error : ''}`);
      }
      await ctx.close();
    }
  }
  for (const b of Object.values(browsers)) await b.close();
  const file = path.join(OUT, only ? `pages-${only}.json` : 'pages.json');
  fs.writeFileSync(file, JSON.stringify(results, null, 1));
  console.log(`\n${results.length} page checks written to ${path.relative(ROOT, file)}`);
})().catch((e) => { console.error('CRAWL ERROR', e); process.exit(2); });
