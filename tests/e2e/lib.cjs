// Shared helpers for the browser tests: a tiny static server for the built site and page instrumentation.
const http = require('http');
const fs = require('fs');
const path = require('path');

const TYPES = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.json': 'application/json', '.ico': 'image/x-icon', '.xml': 'application/xml', '.txt': 'text/plain', '.woff2': 'font/woff2' };

/** Serves a built site folder like Firebase Hosting does (unknown paths → index.html). */
function serveDist(dir, port = 0) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const p = decodeURIComponent((req.url || '/').split('?')[0]);
      let file = path.join(dir, p);
      if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dir, 'index.html');
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    srv.listen(port, '127.0.0.1', () => resolve({ srv, base: `http://127.0.0.1:${srv.address().port}` }));
  });
}

/** Collects console errors, page crashes and failed requests for a page. */
function watch(page) {
  const log = { consoleErrors: [], pageErrors: [], failedRequests: [], tag: '' };
  // The Auth emulator does not implement the reCAPTCHA config endpoint (HTTP 501); the real service does.
  const emulatorNoise = (t) => /status of 501/.test(t);
  page.on('console', (m) => { if (m.type() === 'error' && !emulatorNoise(m.text())) log.consoleErrors.push((log.tag ? `[during ${log.tag}] ` : '') + m.text().slice(0, 300)); });
  page.on('pageerror', (e) => log.pageErrors.push(String(e.message).slice(0, 300)));
  page.on('response', (r) => { if (r.status() >= 400 && !/recaptchaConfig/.test(r.url())) log.failedRequests.push(`${r.status()} ${r.request().method()} ${r.url().slice(0, 160)}`); });
  page.on('requestfailed', (r) => { const f = r.failure()?.errorText || ''; if (!/ERR_ABORTED/.test(f)) log.failedRequests.push(`FAILED ${r.method()} ${r.url().slice(0, 160)} ${f}`); });
  return log;
}

/**
 * Starts Chromium. On machines where the Playwright browser download is missing, set
 * PLAYWRIGHT_CHROMIUM_PATH (or have /opt/pw-browsers/chromium) to use an installed Chromium instead.
 */
async function launchBrowser(engine = 'chromium') {
  const pw = require('playwright');
  if (engine !== 'chromium') return pw[engine].launch();
  const custom = process.env.PLAYWRIGHT_CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : null);
  return pw.chromium.launch(custom ? { executablePath: custom } : {});
}

module.exports = { serveDist, watch, launchBrowser };
