// Builds qa-report/REPORT.md from the JSON results written by the other test scripts.
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, '..', '..', 'qa-report');
const read = (f) => { try { return JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8')); } catch { return null; } };
const pages = fs.readdirSync(OUT).filter((f) => /^pages.*\.json$/.test(f)).flatMap((f) => read(f) || []);
// one row per viewport+page (the newest file wins)
const byKey = new Map(); for (const r of pages) byKey.set(`${r.viewport}|${r.page}`, r);
const rows = [...byKey.values()];
const flows = read('flows.json') || [], rules = read('rules.json') || [], live = read('live.json') || [], lh = read('lighthouse.json');
const L = [];
L.push('# BioCart QA report', '', `Generated ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC by \`npm run test:e2e\`. All write tests ran on the local Firebase emulators with Cashfree and EKART mocked.`, '');
L.push('## Summary', '', '| Check | Result |', '|---|---|');
L.push(`| Security rules (emulator) | ${rules.filter((r) => r.pass).length} of ${rules.length} pass |`);
L.push(`| Browser flows (emulator) | ${flows.filter((r) => r.pass).length} of ${flows.length} pass |`);
if (rows.length) {
  const bad = (r) => r.error || r.pageErrors?.length || r.consoleErrors?.length || r.whiteScreen;
  L.push(`| Pages × viewports (emulator build) | ${rows.length} checked, ${rows.filter((r) => !bad(r)).length} without errors |`);
  L.push(`| Horizontal overflow | ${rows.filter((r) => r.overflowPx > 1).length} pages |`);
  L.push(`| Broken images | ${rows.filter((r) => r.brokenImages?.length).length} pages |`);
  L.push(`| Failed requests (4xx/5xx) | ${rows.filter((r) => r.failedRequests?.length).length} pages |`);
  L.push(`| Tap targets under 40 px (phones) | ${rows.reduce((s, r) => s + (r.small?.length || 0), 0)} across ${rows.filter((r) => r.small?.length).length} pages |`);
  L.push(`| GSTIN-like number shown | ${rows.filter((r) => r.fakeGstin).length} pages |`);
}
if (live.length) L.push(`| Live site, read-only | ${live.length} checked, ${live.filter((r) => !(r.error || r.pageErrors.length || r.consoleErrors.length)).length} clean |`);
L.push('');
if (lh) { L.push('## Lighthouse', '', '| Page | Device | Run | Performance | Accessibility | Best practices | SEO |', '|---|---|---|---|---|---|---|'); for (const r of lh) L.push(`| ${r.page} | ${r.device} | ${r.run} | ${r.performance} | ${r.accessibility} | ${r.bestPractices} | ${r.seo} |`); L.push(''); }
L.push('## Browser flows', '', '| Step | Result | Evidence |', '|---|---|---|');
for (const r of flows) L.push(`| ${r.id} ${r.title.replace(/\|/g, '/')} | ${r.pass ? 'PASS' : 'FAIL'} | ${(r.pass ? r.evidence : r.error || '').replace(/\|/g, '/').slice(0, 260)} |`);
L.push('');
if (rows.length) {
  const vps = [...new Set(rows.map((r) => r.viewport))];
  const names = [...new Set(rows.map((r) => r.page))];
  const cell = (r) => { if (!r) return '–'; const b = [r.error && 'ERROR', r.pageErrors?.length && 'crash', r.consoleErrors?.length && 'console', r.failedRequests?.length && 'net', r.overflowPx > 1 && `overflow ${r.overflowPx}px`, r.brokenImages?.length && 'img', r.whiteScreen && 'white'].filter(Boolean); return b.length ? b.join(', ') : 'ok'; };
  L.push('## Pages × viewports', '', `| Page | ${vps.join(' | ')} |`, `|---|${vps.map(() => '---').join('|')}|`);
  for (const n of names) L.push(`| ${n} | ${vps.map((v) => cell(byKey.get(`${v}|${n}`))).join(' | ')} |`);
  L.push('', 'Screenshots: `qa-report/screens/<viewport>__<page>.jpg`.', '');
  const errs = rows.filter((r) => r.error || r.pageErrors?.length || r.consoleErrors?.length || r.failedRequests?.length);
  if (errs.length) { L.push('### Details of pages with errors', ''); for (const r of errs) L.push(`- **${r.viewport} / ${r.page}**: ${[r.error, ...(r.pageErrors || []), ...(r.consoleErrors || []), ...(r.failedRequests || [])].filter(Boolean).slice(0, 3).join(' · ').slice(0, 400)}`); L.push(''); }
  const small = {}; rows.forEach((r) => (r.small || []).forEach((e) => { small[e] = (small[e] || 0) + 1; }));
  const top = Object.entries(small).sort((a, b) => b[1] - a[1]).slice(0, 25);
  if (top.length) { L.push('### Most common small tap targets on phones (under 40 px)', ''); for (const [k, v] of top) L.push(`- ${v}× ${k}`); L.push(''); }
}
if (live.length) { L.push('## Live site (read-only)', '', '| Viewport | Page | Result | Note |', '|---|---|---|---|'); for (const r of live) L.push(`| ${r.viewport} | ${r.page} | ${r.error ? 'ERROR: ' + r.error : [...r.pageErrors, ...r.consoleErrors].length ? 'errors: ' + [...r.pageErrors, ...r.consoleErrors][0].slice(0, 120) : r.notFound ? 'page not found' : 'ok'} | ${r.note || ''} |`); L.push(''); }
fs.writeFileSync(path.join(OUT, 'REPORT.md'), L.join('\n'));
console.log(`Report written: qa-report/REPORT.md (${rows.length} page checks, ${flows.length} flow steps, ${rules.length} rule checks)`);
