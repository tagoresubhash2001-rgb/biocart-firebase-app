const fs = require('fs');

const fixTemplateStr = (file) => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/₹\{/g, '${');
  fs.writeFileSync(file, content);
  console.log('Fixed template str in', file);
};

fixTemplateStr('src/components/vendor/VendorDashboardHome.tsx');
fixTemplateStr('src/components/vendor/VendorWallet.tsx');
fixTemplateStr('src/components/vendor/VendorProducts.tsx');
fixTemplateStr('src/components/vendor/VendorOrders.tsx');

