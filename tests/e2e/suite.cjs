// Runs inside `firebase emulators:exec` (see run.cjs): seed → rules tests → flow tests → optional page crawl.
const { spawnSync } = require('child_process');
const path = require('path');
const { serveDist } = require('./lib.cjs');
const { seed } = require('./seed.cjs');

const ROOT = path.join(__dirname, '..', '..');
const args = process.argv.slice(2);
const pagesArg = args.find((a) => a.startsWith('--pages'));

(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) { console.error('Not running inside the Firebase emulators — refusing to continue.'); process.exit(2); }
  await seed();
  console.log('Emulators seeded with test data.');
  const { srv, base } = await serveDist(path.join(ROOT, 'dist-e2e'));
  const node = (file, extra = []) => spawnSync(process.execPath, [path.join(__dirname, file), ...extra], { cwd: ROOT, stdio: 'inherit', env: process.env }).status;
  const summary = [];
  console.log('\n===== Security rules =====');
  summary.push(['Security rules', node('rules.cjs')]);
  console.log('\n===== Browser flows (customer → vendor → admin) =====');
  summary.push(['Browser flows', node('flows.cjs', [base])]);
  if (pagesArg) {
    console.log('\n===== Page × viewport crawl =====');
    const only = pagesArg.includes('=') ? [pagesArg.split('=')[1]] : [];
    summary.push(['Page crawl', node('pages.cjs', [base, ...only])]);
    summary.push(['Report', node('report.cjs')]);
  }
  srv.close();
  console.log('\n===== Summary =====');
  for (const [name, code] of summary) console.log(`${code === 0 ? 'PASS' : 'FAIL'}  ${name}`);
  process.exit(summary.some(([, c]) => c !== 0) ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
