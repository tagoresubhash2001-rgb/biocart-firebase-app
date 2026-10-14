const fs = require('fs');

function patchVendorEffect(file) {
  let content = fs.readFileSync(file, 'utf8');
  // Change dependency from [user] to [vendorId]
  content = content.replace(/}, \[user\]\);/g, '}, [vendorId]);');
  
  // If there's an error callback in onSnapshot, add it
  // Actually, I'll just rely on what I did earlier for early return if vendorLoading.
  
  fs.writeFileSync(file, content);
  console.log('Patched effect in', file);
}

['src/components/vendor/VendorDashboardHome.tsx', 'src/components/vendor/VendorProducts.tsx', 'src/components/vendor/VendorOrders.tsx', 'src/components/vendor/VendorWallet.tsx'].forEach(patchVendorEffect);

