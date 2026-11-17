// `npm run test:e2e` — builds a test copy of the site, starts the Firebase emulators, seeds test
// data and runs: security-rules tests, browser flow tests and (optionally) the page × viewport crawl.
// Everything runs locally against the emulators with Cashfree and EKART mocked: no real payment,
// shipment, SMS or email is possible, and the live database is never touched.
//
//   npm run test:e2e                 rules + flows                     (a few minutes)
//   npm run test:e2e -- --pages      also crawl every page in all 6 viewports (about 40 minutes)
//   npm run test:e2e -- --pages=iphone13   crawl one viewport only
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const FN = path.join(ROOT, 'functions');
const run = (cmd, args, opts = {}) => {
  console.log(`\n$ ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32', ...opts });
  if (r.status !== 0) { console.error(`\n"${cmd} ${args[0]}" failed (exit ${r.status}).`); cleanup(); process.exit(r.status || 1); }
};

// Dummy secrets and the outbound-call mock for the Functions emulator. These two files are only
// read by the emulator, are git-ignored, and are removed again when the run ends.
const secretFile = path.join(FN, '.secret.local');
const envFile = path.join(FN, '.env.local');
const created = [];
const writeIfMissing = (file, text) => { if (!fs.existsSync(file)) { fs.writeFileSync(file, text); created.push(file); } };
function cleanup() { for (const f of created) { try { fs.unlinkSync(f); } catch { /* already gone */ } } }
process.on('SIGINT', () => { cleanup(); process.exit(130); });

writeIfMissing(secretFile, ['EKART_CLIENT_ID=EKART_TEST', 'EKART_USERNAME=test@biocart.test', 'EKART_PASSWORD=test-not-real', 'EKART_WEBHOOK_SECRET=whsec_test_1234567890', 'CASHFREE_APP_ID=TESTAPP', 'CASHFREE_SECRET_KEY=cfsk_test_secret', 'CASHFREE_ENVIRONMENT=SANDBOX', ''].join('\n'));
const mock = path.join(__dirname, 'mock-external.cjs').replace(/\\/g, '/');
fs.writeFileSync(envFile, `NODE_OPTIONS=--require ${mock}\n`); if (!created.includes(envFile)) created.push(envFile);
const control = path.join(os.tmpdir(), 'biocart-mock-control.json');
try { fs.unlinkSync(control); } catch { /* none */ }

run('npm', ['--prefix', 'functions', 'run', 'build']);
run('npx', ['vite', 'build', '--outDir', 'dist-e2e'], { env: { ...process.env, VITE_USE_EMULATORS: 'true' } });

const extra = process.argv.slice(2).join(' ');
// Use the installed Firebase CLI when there is one, otherwise fetch it with npx.
const hasFirebase = spawnSync('firebase', ['--version'], { shell: process.platform === 'win32' }).status === 0;
run(hasFirebase ? 'firebase' : 'npx', [...(hasFirebase ? [] : ['firebase-tools']), 'emulators:exec', '--only', 'auth,firestore,functions,storage', '--project', 'bio-cart', `node tests/e2e/suite.cjs ${extra}`], { env: { ...process.env, BIOCART_MOCK_CONTROL: control } });
cleanup();
console.log('\nAll end-to-end tests passed.');
