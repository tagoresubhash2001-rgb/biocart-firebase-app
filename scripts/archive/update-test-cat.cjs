const fs = require('fs');
const path = require('path');

const testPath = path.resolve(__dirname, '..', 'tests/auth-and-rules.test.ts');
let testCode = fs.readFileSync(testPath, 'utf8');

const targetSection = `    it('7. verifies storefront homepage displays circular category image design with category name underneath', async () => {`;
const targetEnd = `    it('8. verifies Admin Dashboard includes RealTimeAnalyticsCharts with all 10 visual indicators', async () => {`;

const startIndex = testCode.indexOf(targetSection);
const endIndex = testCode.indexOf(targetEnd);

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `    it('7. verifies storefront homepage displays circular category image design with category name underneath', async () => {
      const fs = await import('node:fs');
      const homeCode = fs.readFileSync('src/pages/Home.tsx', 'utf-8');
      assert.match(homeCode, /home-categories-track/);
      assert.match(homeCode, /CategoryCircularNav/);

      // Verify shared circular category component implementation
      const navCode = fs.readFileSync('src/components/ui/CategoryCircularNav.tsx', 'utf-8');
      assert.match(navCode, /rounded-full/);
      assert.match(navCode, /cat\\.name/);
      assert.match(navCode, /cat\\.image/);
      assert.match(navCode, /rounded-full overflow-hidden/);
    });

`;

  testCode = testCode.substring(0, startIndex) + replacement + testCode.substring(endIndex);
  fs.writeFileSync(testPath, testCode, 'utf8');
  console.log('Test section 7 updated');
} else {
  console.error('Could not locate test section 7 boundaries');
}
