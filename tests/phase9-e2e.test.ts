import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

describe('Phase 9 Browser & Build Verification Tests', () => {
  it('1. verifies dist/index.html correctly includes stylesheet and entry bundle', () => {
    const html = fs.readFileSync('dist/index.html', 'utf8');
    assert.match(html, /<script type="module" crossorigin src="\/assets\/index-[A-Za-z0-9_-]+\.js">/);
    assert.match(html, /<link rel="stylesheet" crossorigin href="\/assets\/index-[A-Za-z0-9_-]+\.css">/);
    assert.match(html, /<div id="root"><\/div>/);
  });

  it('2. verifies production Home chunk imports CategoryCircularNav symbol', () => {
    const files = fs.readdirSync('dist/assets');
    const homeFile = files.find(f => f.startsWith('Home-') && f.endsWith('.js'));
    assert.ok(homeFile, 'Home chunk must exist in dist/assets');
    const homeContent = fs.readFileSync(`dist/assets/${homeFile}`, 'utf8');
    assert.match(homeContent, /import\{C as [A-Za-z0-9_]+\}from"\.\/CategoryCircularNav-[A-Za-z0-9_-]+\.js"/);
  });

  it('3. verifies firestore.rules prevents unauthenticated/public reads to shipping, logistics_api, and payments', () => {
    const rules = fs.readFileSync('firestore.rules', 'utf8');
    assert.match(rules, /match\s+\/settings\/shipping\s*\{\s*allow\s+read,\s*write:\s*if\s+isAdmin\(\);/);
    assert.match(rules, /match\s+\/settings\/logistics_api\s*\{\s*allow\s+read,\s*write:\s*if\s+isAdmin\(\);/);
    assert.match(rules, /match\s+\/settings\/payments\s*\{\s*allow\s+read,\s*write:\s*if\s+isAdmin\(\);/);
    assert.match(rules, /allow\s+read:\s*if\s+settingId\s+in\s+\[\'general\',\s*\'main\',\s*\'appearance\'\];/);
  });

  it('4. verifies legacy carrier file is deleted and ekart.ts does not allow client token override', () => {
    assert.strictEqual(fs.existsSync('functions/src/delhivery.ts'), false, 'functions/src/delhivery.ts must be completely deleted');
    const ekartCode = fs.readFileSync('functions/src/ekart.ts', 'utf8');
    assert.ok(!ekartCode.includes('token = d.delhiveryToken'), 'Client token override must not exist');
  });

  it('5. verifies functions/src/settlementEngine.ts does not allow settings/payments secret override', () => {
    const code = fs.readFileSync('functions/src/settlementEngine.ts', 'utf8');
    assert.ok(!code.includes('keySecret = d.razorpayKeySecret'), 'razorpayKeySecret from settings/payments must not override Secret Manager');
  });

  it('6. verifies AdminShipments does not load token input into frontend state', () => {
    const code = fs.readFileSync('src/components/admin/AdminShipments.tsx', 'utf8');
    assert.ok(!code.includes('placeholder="Enter Delhivery Authorization Token'), 'Frontend input for carrier token must be removed');
  });

  it('7. verifies AdminApiConfiguration clearly discloses pending carrier activation without dummy success', () => {
    const code = fs.readFileSync('src/components/admin/AdminApiConfiguration.tsx', 'utf8');
    assert.match(code, /pending formal carrier activation/);
    assert.ok(!code.includes('Handshake handshake authenticated successfully'), 'Misleading dummy success state must be removed');
  });

  it('8. verifies .github/workflows/deploy.yml requires validation before deployment and protected environment', () => {
    const yml = fs.readFileSync('.github/workflows/deploy.yml', 'utf8');
    assert.match(yml, /needs:\s*validate_and_test/);
    assert.match(yml, /environment:\s*production/);
    assert.ok(!yml.includes('continue-on-error: true'), 'Deployment failure suppression must be removed');
  });
});
