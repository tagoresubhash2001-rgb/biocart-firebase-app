const fs = require('fs');
const path = require('path');

const testPath = path.resolve(__dirname, '..', 'tests/auth-and-rules.test.ts');
let testCode = fs.readFileSync(testPath, 'utf8');

testCode = testCode.replace(/assert\.match\(html, \/support@biocart\\\.co\\\.in\/\);/, 'assert.match(html, /biocart\\.2025@gmail\\.com/);');

fs.writeFileSync(testPath, testCode, 'utf8');
console.log('Updated test assertion for support email');
