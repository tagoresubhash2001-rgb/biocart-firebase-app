// Lighthouse scores (mobile + desktop) for home, shop and a product page. Read-only page loads.
// Usage: node tests/e2e/lighthouse.cjs <label: before|after> [baseUrl]
// Needs the `lighthouse` CLI (LIGHTHOUSE_BIN or `npx lighthouse`) and a Chrome/Chromium (CHROME_PATH).
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const run = process.argv[2] || 'now';
const base = (process.argv[3] || 'https://biocart.in').replace(/\/$/, '');
const OUT = path.join(__dirname, '..', '..', 'qa-report');
const bin = process.env.LIGHTHOUSE_BIN || 'npx';
const flags = ['--headless=new', '--no-sandbox', ...(process.env.HTTPS_PROXY ? [`--proxy-server=${process.env.HTTPS_PROXY}`] : [])].join(' ');

(async () => {
  const r = await fetch('https://firestore.googleapis.com/v1/projects/bio-cart/databases/(default)/documents/products?pageSize=60');
  const docs = (await r.json()).documents || [];
  const val = (f) => f && (f.stringValue ?? f.booleanValue ?? f.doubleValue ?? f.integerValue);
  const prod = docs.map((d) => ({ id: d.name.split('/').pop(), f: d.fields || {} })).find(({ f }) => val(f.active) !== false && String(val(f.approvalStatus) || 'approved') === 'approved' && !val(f.isTest));
  const pages = [['home', '/'], ['shop', '/shop'], ['product', `/product-details?product=${prod ? encodeURIComponent(prod.id) : ''}`]];
  const file = path.join(OUT, 'lighthouse.json');
  let all = []; try { all = JSON.parse(fs.readFileSync(file, 'utf8')).filter((x) => x.run !== run); } catch { /* first run */ }
  for (const [name, p] of pages) {
    for (const device of ['mobile', 'desktop']) {
      const tmp = path.join(os.tmpdir(), `lh-${name}-${device}.json`);
      const args = [...(bin === 'npx' ? ['lighthouse'] : []), base + p, '--quiet', `--chrome-flags=${flags}`, '--only-categories=performance,accessibility,best-practices,seo', '--output=json', `--output-path=${tmp}`, ...(device === 'desktop' ? ['--preset=desktop'] : [])];
      try {
        execFileSync(bin, args, { stdio: 'ignore', timeout: 240000 });
        const j = JSON.parse(fs.readFileSync(tmp, 'utf8'));
        const sc = (k) => (j.categories[k]?.score == null ? null : Math.round(j.categories[k].score * 100));
        const fails = (cat) => (j.categories[cat]?.auditRefs || []).filter((a) => a.weight > 0 && j.audits[a.id]?.score !== null && j.audits[a.id]?.score < 0.9).map((a) => j.audits[a.id].title).slice(0, 8);
        const row = { run, page: name, device, url: base + p, performance: sc('performance'), accessibility: sc('accessibility'), bestPractices: sc('best-practices'), seo: sc('seo'), lcpMs: Math.round(j.audits['largest-contentful-paint']?.numericValue || 0), runtimeError: j.runtimeError?.message || null, topIssues: { performance: fails('performance'), accessibility: fails('accessibility'), seo: fails('seo') } };
        all.push(row);
        console.log(`${run.padEnd(7)} ${name.padEnd(8)} ${device.padEnd(8)} perf ${row.performance}  a11y ${row.accessibility}  best ${row.bestPractices}  seo ${row.seo}  LCP ${(row.lcpMs / 1000).toFixed(1)}s${row.runtimeError ? '  ERROR ' + row.runtimeError : ''}`);
      } catch (e) { console.log(`${run} ${name} ${device} FAILED: ${String(e.message).slice(0, 150)}`); }
    }
  }
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(all, null, 1));
})();
