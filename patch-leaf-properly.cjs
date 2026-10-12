const fs = require('fs');
let adminLayout = fs.readFileSync('src/components/admin/AdminLayout.tsx', 'utf8');
if (!adminLayout.includes('Leaf,')) {
  adminLayout = adminLayout.replace('X,', 'X,\n  Leaf,');
}
fs.writeFileSync('src/components/admin/AdminLayout.tsx', adminLayout);
console.log('Fixed AdminLayout');

let vendorLayout = fs.readFileSync('src/components/vendor/VendorLayout.tsx', 'utf8');
if (!vendorLayout.includes('Leaf')) {
  vendorLayout = vendorLayout.replace('X, Store , Settings }', 'X, Store , Settings, Leaf }');
}
fs.writeFileSync('src/components/vendor/VendorLayout.tsx', vendorLayout);
console.log('Fixed VendorLayout');
