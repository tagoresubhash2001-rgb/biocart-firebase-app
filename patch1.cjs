const fs = require('fs');

// 1. Move seedInitialCatalogIfEmpty to App.tsx
let appTsx = fs.readFileSync('src/App.tsx', 'utf8');
if (!appTsx.includes('AdminService.seedInitialCatalogIfEmpty();')) {
  appTsx = appTsx.replace('import { AdminService } from', 'import { AdminService } from');
  if (!appTsx.includes('import { AdminService }')) {
    appTsx = `import { AdminService } from './services/AdminService';\n` + appTsx;
  }
  
  appTsx = appTsx.replace('export default function App() {', `export default function App() {\n  React.useEffect(() => {\n    AdminService.seedInitialCatalogIfEmpty();\n  }, []);`);
  
  fs.writeFileSync('src/App.tsx', appTsx);
  console.log('Patched App.tsx for seeding.');
}

// 2. Fix useVendor.ts
let useVendor = fs.readFileSync('src/hooks/useVendor.ts', 'utf8');
useVendor = useVendor.replace(`if (!userProfile?.uid) {
      setLoading(false);
      return;
    }`, `if (!userProfile?.uid) {
      if (import.meta.env.DEV) {
        setVendorId((import.meta as any).env.VITE_DEV_VENDOR_ID || 'biocart');
      } else {
        setVendorId(null);
      }
      setLoading(false);
      return;
    }`);
fs.writeFileSync('src/hooks/useVendor.ts', useVendor);
console.log('Patched useVendor.ts for local dev fallback.');

// 3. Fix AdminService error handling
let adminService = fs.readFileSync('src/services/AdminService.ts', 'utf8');
// Replace onSnapshot(q, (snapshot) => ... ) with onSnapshot(q, (snapshot) => ..., (err) => ...)
// I will just use regex to add an error callback where missing
adminService = adminService.replace(/setRealtimeProducts\(list\);\s*setLoadingProducts\(false\);\s*\}\);/g, 'setRealtimeProducts(list); setLoadingProducts(false); });');

// Actually, simpler to just rebuild AdminService carefully. I'll write a better regex or replace string.
// We'll skip complex regex for now and focus on VendorOrders and Vendor Dashboard.

// 4. Fix Vendor Wallet Currency
let vendorWallet = fs.readFileSync('src/components/vendor/VendorWallet.tsx', 'utf8');
vendorWallet = vendorWallet.replace(/\$/g, '₹');
fs.writeFileSync('src/components/vendor/VendorWallet.tsx', vendorWallet);
console.log('Patched VendorWallet.tsx currency.');

// 5. Fix Vendor sidebar branding
let vendorLayout = fs.readFileSync('src/components/vendor/VendorLayout.tsx', 'utf8');
vendorLayout = vendorLayout.replace(/Vendor Panel/g, 'Vendor Console');
vendorLayout = vendorLayout.replace(/Store Icon/g, 'BioCart logo/brand');
vendorLayout = vendorLayout.replace(/<span className="font-display font-bold text-lg text-slate-900 dark:text-white">Vendor Console<\/span>/g, '<span className="font-display font-bold text-lg text-slate-900 dark:text-white">BioCart Vendor Console</span>');
vendorLayout = vendorLayout.replace(/<p className="text-xs text-slate-500">Manage your store<\/p>/g, '<p className="text-xs text-slate-500">BioCart Marketplace Vendor</p>');
fs.writeFileSync('src/components/vendor/VendorLayout.tsx', vendorLayout);
console.log('Patched VendorLayout.tsx branding.');

// 6. Fix Admin branding
let adminLayout = fs.readFileSync('src/components/admin/AdminLayout.tsx', 'utf8');
adminLayout = adminLayout.replace(/Admin Panel/g, 'Admin Console');
adminLayout = adminLayout.replace(/<span className="font-display font-bold text-lg text-slate-900 dark:text-white">Admin Console<\/span>/g, '<span className="font-display font-bold text-lg text-slate-900 dark:text-white">BioCart Admin Console</span>');
adminLayout = adminLayout.replace(/<p className="text-xs text-slate-500">Central Management<\/p>/g, '<p className="text-xs text-slate-500">Real-Time Marketplace Control Center</p>');
adminLayout = adminLayout.replace(/Real-Time Sync Active/g, 'Live Firestore Data');
fs.writeFileSync('src/components/admin/AdminLayout.tsx', adminLayout);
console.log('Patched AdminLayout.tsx branding.');

