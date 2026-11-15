const fs = require('fs');
const path = require('path');

const testPath = path.resolve(__dirname, '..', 'tests/auth-and-rules.test.ts');
let testCode = fs.readFileSync(testPath, 'utf8');

testCode = testCode.replace(/assert\.match\(html, \/privacy@biocart\\\.co\\\.in\/\);/, 'assert.match(html, /biocart\\.2025@gmail\\.com/);');

fs.writeFileSync(testPath, testCode, 'utf8');
console.log('Updated privacy-policy test assertion to biocart.2025@gmail.com');
