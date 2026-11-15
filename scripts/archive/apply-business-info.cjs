const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

// 1. Update src/services/AdminService.ts
const adminServicePath = path.join(root, 'src', 'services', 'AdminService.ts');
let adminService = fs.readFileSync(adminServicePath, 'utf8');
adminService = adminService.replace(
  /address:\s*'Bio-Innovation Park, Hyderabad, India'/,
  "address: 'Tirupati, Andhra Pradesh – 517507, India'"
);
adminService = adminService.replace(
  /contactEmail:\s*'support@biocart\.com'/,
  "contactEmail: 'care@biocart.co.in'"
);
adminService = adminService.replace(
  /contactPhone:\s*'\+91 \(800\) 246-2278'/,
  "contactPhone: '+91 91542 22539'"
);
fs.writeFileSync(adminServicePath, adminService, 'utf8');
console.log('Updated AdminService.ts');

// 2. Update src/components/layout/Footer.tsx
const footerPath = path.join(root, 'src', 'components', 'layout', 'Footer.tsx');
let footer = fs.readFileSync(footerPath, 'utf8');
footer = footer.replace(/Sindulis Agro Farms, Tanuku, AP - 534211/g, 'Tirupati, Andhra Pradesh – 517507');
footer = footer.replace(
  /<div className="space-y-1\.5 text-\[11px\] footer-copy font-mono" id="col-brand-corporate">[\s\S]*?<\/div>/,
  `<div className="space-y-1.5 text-[11px] footer-copy font-mono" id="col-brand-corporate">
                <p className="font-bold text-nature-800 dark:text-slate-400 font-sans">SINDULIS INNOVATIVE SOLUTIONS</p>
                <p>Proprietorship • Unit: BioCart</p>
                <p>Udyam Reg: UDYAM-AP-23-0104910</p>
              </div>`
);
footer = footer.replace(
  /© 2026 BioCart\. Sindulis Agro Products Private Limited\. All Rights Reserved\./,
  '© 2026 BioCart. SINDULIS INNOVATIVE SOLUTIONS (Udyam: UDYAM-AP-23-0104910). All Rights Reserved.'
);
fs.writeFileSync(footerPath, footer, 'utf8');
console.log('Updated Footer.tsx');

// 3. Update src/pages/About.tsx
const aboutPath = path.join(root, 'src', 'pages', 'About.tsx');
let about = fs.readFileSync(aboutPath, 'utf8');
about = about.replace(/Sindulis Agro Products Pvt\. Ltd\./g, 'SINDULIS INNOVATIVE SOLUTIONS');
about = about.replace(/Sindulis Agro Products Private Limited/g, 'SINDULIS INNOVATIVE SOLUTIONS');
about = about.replace(/Sindulis Agro Products/g, 'SINDULIS INNOVATIVE SOLUTIONS');
about = about.replace(/<div className="text-emerald-300\/80 text-\[11px\]">CIN: U01110AP2023PTC123456<\/div>/g, '<div className="text-emerald-300/80 text-[11px]">Udyam: UDYAM-AP-23-0104910</div>');
fs.writeFileSync(aboutPath, about, 'utf8');
console.log('Updated About.tsx');

// 4. Update src/pages/Contact.tsx
const contactPath = path.join(root, 'src', 'pages', 'Contact.tsx');
let contact = fs.readFileSync(contactPath, 'utf8');
contact = contact.replace(/Sindulis Agro Products Pvt\. Ltd\./g, 'SINDULIS INNOVATIVE SOLUTIONS');
contact = contact.replace(/Sindulis Agro Products Private Limited/g, 'SINDULIS INNOVATIVE SOLUTIONS');
contact = contact.replace(/CIN: U01110AP2023PTC123456/g, 'Udyam: UDYAM-AP-23-0104910');
contact = contact.replace(/Industrial Corridor Area, Guntur District\s*<br\s*\/?>\s*Andhra Pradesh - 522001, India\./g, 'Tirupati, Andhra Pradesh – 517507, India.');
contact = contact.replace(/Industrial Corridor Area, Guntur District/g, 'Tirupati');
contact = contact.replace(/Andhra Pradesh - 522001, India\./g, 'Andhra Pradesh - 517507, India.');
fs.writeFileSync(contactPath, contact, 'utf8');
console.log('Updated Contact.tsx');

// 5. Update src/data/initialCMSPages.ts
const cmsPath = path.join(root, 'src', 'data', 'initialCMSPages.ts');
let cms = fs.readFileSync(cmsPath, 'utf8');
cms = cms.replace(/Sindulis Agro Products Pvt\. Ltd\./g, 'SINDULIS INNOVATIVE SOLUTIONS');
cms = cms.replace(/Sindulis Agro Products Private Limited/g, 'SINDULIS INNOVATIVE SOLUTIONS');
cms = cms.replace(/Sindulis Agro Products/g, 'SINDULIS INNOVATIVE SOLUTIONS');
cms = cms.replace(/CIN: U01110AP2023PTC123456/g, 'Udyam Reg: UDYAM-AP-23-0104910');
cms = cms.replace(/Corporate Identification Number \(CIN\):<\/strong>\s*U01110AP2023PTC123456/g, 'Udyam Registration Number:</strong> UDYAM-AP-23-0104910 (Proprietorship)');
cms = cms.replace(/Tanuku, West Godavari District, Andhra Pradesh - 534211/g, 'Tirupati, Andhra Pradesh - 517507');
fs.writeFileSync(cmsPath, cms, 'utf8');
console.log('Updated initialCMSPages.ts');

// 6. Update src/hooks/useHomepageCMS.ts
const homeCmsPath = path.join(root, 'src', 'hooks', 'useHomepageCMS.ts');
let homeCms = fs.readFileSync(homeCmsPath, 'utf8');
homeCms = homeCms.replace(/Sindulis Agro Products Presents/g, 'BioCart Presents');
homeCms = homeCms.replace(/Sindulis Agro Products/g, 'SINDULIS INNOVATIVE SOLUTIONS');
homeCms = homeCms.replace(/Sindulis Agro Products Private Limited/g, 'SINDULIS INNOVATIVE SOLUTIONS');
fs.writeFileSync(homeCmsPath, homeCms, 'utf8');
console.log('Updated useHomepageCMS.ts');

// 7. Update tests/auth-and-rules.test.ts to match updated legal entity details
const testPath = path.join(root, 'tests', 'auth-and-rules.test.ts');
let testsCode = fs.readFileSync(testPath, 'utf8');
testsCode = testsCode.replace(/assert\.match\(html, \/Sindulis Agro Products Private Limited\/\);/g, 'assert.match(html, /SINDULIS INNOVATIVE SOLUTIONS/);');
testsCode = testsCode.replace(/assert\.match\(html, \/U01110AP2023PTC123456\/\);/g, 'assert.match(html, /UDYAM-AP-23-0104910/);');
testsCode = testsCode.replace(/assert\.match\(html, \/Tanuku, West Godavari District, Andhra Pradesh - 534211\/\);/g, 'assert.match(html, /Tirupati, Andhra Pradesh - 517507/);');
fs.writeFileSync(testPath, testsCode, 'utf8');
console.log('Updated tests/auth-and-rules.test.ts');
