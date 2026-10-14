const fs = require('fs');

const replaceDollar = (file) => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\$/g, '₹');
  fs.writeFileSync(file, content);
  console.log('Fixed currency in', file);
};

replaceDollar('src/components/vendor/VendorDashboardHome.tsx');
replaceDollar('src/components/vendor/VendorWallet.tsx');
replaceDollar('src/components/vendor/VendorProducts.tsx');
replaceDollar('src/components/vendor/VendorOrders.tsx');

