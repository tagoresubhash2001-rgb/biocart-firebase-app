const fs = require('fs');

// Patch AdminLayout.tsx
let adminLayout = fs.readFileSync('src/components/admin/AdminLayout.tsx', 'utf8');
if (!adminLayout.includes('Leaf')) {
  adminLayout = adminLayout.replace(
    "import { \n  LayoutDashboard,",
    "import { \n  LayoutDashboard,\n  Leaf,"
  );
  // fallback if it's different
  if (!adminLayout.includes('Leaf,')) {
    adminLayout = adminLayout.replace(
      "import {",
      "import { Leaf,"
    );
  }
}
fs.writeFileSync('src/components/admin/AdminLayout.tsx', adminLayout);

// Patch VendorLayout.tsx just in case
let vendorLayout = fs.readFileSync('src/components/vendor/VendorLayout.tsx', 'utf8');
if (!vendorLayout.includes('Leaf')) {
  vendorLayout = vendorLayout.replace(
    "import {",
    "import { Leaf,"
  );
}
fs.writeFileSync('src/components/vendor/VendorLayout.tsx', vendorLayout);

