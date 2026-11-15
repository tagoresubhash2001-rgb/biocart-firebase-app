const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, searchVal, replaceVal) {
  const fullPath = path.resolve(__dirname, '..', filePath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`File not found: ${fullPath}`);
    return;
  }
  let content = fs.readFileSync(fullPath, 'utf8');
  if (content.includes(searchVal)) {
    content = content.split(searchVal).join(replaceVal);
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Replaced in ${filePath}`);
  } else {
    console.log(`Pattern not found in ${filePath}: ${searchVal}`);
  }
}

// 1. AdminService.ts
replaceInFile('src/services/AdminService.ts', "contactEmail: 'care@biocart.co.in'", "contactEmail: 'biocart.2025@gmail.com'");
replaceInFile('src/services/AdminService.ts', "contactPhone: '+91 91542 22539'", "contactPhone: '+91 949080479'");
replaceInFile('src/services/AdminService.ts', "instagram: 'https://instagram.com/biocart'", "instagram: 'https://www.instagram.com/bio_cart/?hl=en'");

// 2. Footer.tsx
replaceInFile('src/components/layout/Footer.tsx', "'care@biocart.co.in'", "'biocart.2025@gmail.com'");
replaceInFile('src/components/layout/Footer.tsx', "'+91 91542 22539'", "'+91 949080479'");
replaceInFile('src/components/layout/Footer.tsx', "'https://instagram.com/biocart'", "'https://www.instagram.com/bio_cart/?hl=en'");

// 3. Contact.tsx
replaceInFile('src/pages/Contact.tsx', 'care@biocart.co.in', 'biocart.2025@gmail.com');
replaceInFile('src/pages/Contact.tsx', '+91 91542 22539', '+91 949080479');
replaceInFile('src/pages/Contact.tsx', '+919154222539', '+91949080479');
replaceInFile('src/pages/Contact.tsx', '919154222539', '91949080479');

// 4. initialCMSPages.ts
replaceInFile('src/data/initialCMSPages.ts', 'care@biocart.co.in', 'biocart.2025@gmail.com');
replaceInFile('src/data/initialCMSPages.ts', 'contact@sindulis.com', 'biocart.2025@gmail.com');
replaceInFile('src/data/initialCMSPages.ts', 'privacy@biocart.co.in', 'biocart.2025@gmail.com');
replaceInFile('src/data/initialCMSPages.ts', 'support@biocart.co.in', 'biocart.2025@gmail.com');
replaceInFile('src/data/initialCMSPages.ts', '+91 91542 22539', '+91 949080479');
replaceInFile('src/data/initialCMSPages.ts', '+91 863 2244 556', '+91 949080479');
replaceInFile('src/data/initialCMSPages.ts', 'Industrial Corridor Area, Guntur District, Andhra Pradesh - 522001', 'Tirupati, Andhra Pradesh – 517507');

// 5. VendorPackingSlipModal.tsx
replaceInFile('src/components/vendor/VendorPackingSlipModal.tsx', 'care@biocart.co.in', 'biocart.2025@gmail.com');
replaceInFile('src/components/vendor/VendorPackingSlipModal.tsx', 'HQ: Industrial Corridor Area, Guntur, AP - 522001', 'HQ: Tirupati, Andhra Pradesh – 517507');
replaceInFile('src/components/vendor/VendorPackingSlipModal.tsx', '+91 863 2244 556', '+91 949080479');

// 6. GenericCMSPage.tsx
replaceInFile('src/pages/GenericCMSPage.tsx', 'care@biocart.co.in', 'biocart.2025@gmail.com');
replaceInFile('src/pages/GenericCMSPage.tsx', '+91 91542 22539', '+91 949080479');
replaceInFile('src/pages/GenericCMSPage.tsx', "pin: '522001'", "pin: '517507'");

console.log('All contact details updated successfully.');
