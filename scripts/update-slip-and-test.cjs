const fs = require('fs');
const path = require('path');

// Update VendorPackingSlipModal.tsx
const slipPath = path.resolve(__dirname, '..', 'src/components/vendor/VendorPackingSlipModal.tsx');
let slip = fs.readFileSync(slipPath, 'utf8');
slip = slip.replace('Operating Entity: Sindulis Agro Products Pvt. Ltd.', 'Operating Entity: SINDULIS INNOVATIVE SOLUTIONS');
slip = slip.replace('CIN: U01110AP2023PTC123456 • GSTIN: 36AABCS1429B1Z8', 'Udyam Reg: UDYAM-AP-23-0104910 • Constitution: Proprietorship');
fs.writeFileSync(slipPath, slip, 'utf8');
console.log('VendorPackingSlipModal updated with authoritative Udyam entity');

// Update tests/auth-and-rules.test.ts Section 26
const testPath = path.resolve(__dirname, '..', 'tests/auth-and-rules.test.ts');
let testCode = fs.readFileSync(testPath, 'utf8');
testCode = testCode.replace(/assert\.match\(slipCode, \/Sindulis Agro Products Pvt\\\. Ltd\\\.\/\);/, 'assert.match(slipCode, /SINDULIS INNOVATIVE SOLUTIONS/);');
testCode = testCode.replace(/assert\.match\(slipCode, \/U01110AP2023PTC123456\/\);/, 'assert.match(slipCode, /UDYAM-AP-23-0104910/);');
testCode = testCode.replace(/assert\.match\(slipCode, \/Industrial Corridor Area, Guntur, AP - 522001\/\);/, 'assert.match(slipCode, /Tirupati, Andhra Pradesh – 517507/);');
testCode = testCode.replace(/assert\.match\(slipCode, \/care@biocart\\\.co\\\.in\/\);/, 'assert.match(slipCode, /biocart\\.2025@gmail\\.com/);');
fs.writeFileSync(testPath, testCode, 'utf8');
console.log('Test assertions updated for Section 26');
