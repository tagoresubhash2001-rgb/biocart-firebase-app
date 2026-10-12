const fs = require('fs');

// Patch AdminLayout.tsx
let adminLayout = fs.readFileSync('src/components/admin/AdminLayout.tsx', 'utf8');
if (!adminLayout.includes('import { Leaf }')) {
  adminLayout = adminLayout.replace(
    "import { LayoutDashboard, Package",
    "import { LayoutDashboard, Package, Leaf"
  );
}
adminLayout = adminLayout.replace(
  /<span className="font-bold text-lg text-slate-900 tracking-tight">BioCart<\/span>/g,
  `<div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 font-bold"><Leaf className="w-5 h-5" /></div>\n                  <span className="font-bold text-lg text-slate-900 tracking-tight">BioCart</span>`
);
// Also for mobile view in AdminLayout:
adminLayout = adminLayout.replace(
  /<span className="font-bold text-slate-900">BioCart Admin Menu<\/span>/g,
  `<div className="flex items-center gap-2"><div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 font-bold"><Leaf className="w-4 h-4" /></div><span className="font-bold text-slate-900">BioCart Admin Menu</span></div>`
);
fs.writeFileSync('src/components/admin/AdminLayout.tsx', adminLayout);

// Patch VendorLayout.tsx
let vendorLayout = fs.readFileSync('src/components/vendor/VendorLayout.tsx', 'utf8');
if (!vendorLayout.includes('import { Leaf }')) {
  vendorLayout = vendorLayout.replace(
    "import { LayoutDashboard, Package",
    "import { LayoutDashboard, Package, Leaf"
  );
}
vendorLayout = vendorLayout.replace(
  /<Store className="w-6 h-6 text-emerald-400" \/> Vendor Console/g,
  `{profile?.logoUrl ? (
                <img src={profile.logoUrl} alt="Vendor Logo" className="w-8 h-8 rounded bg-white object-cover" />
              ) : (
                <div className="flex items-center justify-center w-8 h-8 rounded bg-emerald-100 text-emerald-600">
                  <Leaf className="w-5 h-5" />
                </div>
              )}
              <span className="truncate">{profile?.businessName || 'BioCart Vendor'}</span>`
);
fs.writeFileSync('src/components/vendor/VendorLayout.tsx', vendorLayout);
console.log('Added branding logos');

