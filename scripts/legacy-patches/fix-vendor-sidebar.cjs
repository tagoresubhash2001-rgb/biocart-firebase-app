const fs = require('fs');

let vendorLayout = fs.readFileSync('src/components/vendor/VendorLayout.tsx', 'utf8');

// Fix inactive text from dark to light on dark navy sidebar
// Look for something like text-slate-400 or text-slate-800 on hover
vendorLayout = vendorLayout.replace(/text-\[\#777777\] hover:text-slate-900/g, "text-slate-400 hover:text-white");
vendorLayout = vendorLayout.replace(/text-\[\#777777\] hover:bg-slate-100/g, "text-slate-400 hover:bg-slate-800 hover:text-white");
vendorLayout = vendorLayout.replace(/text-slate-600 hover:bg-slate-50/g, "text-slate-400 hover:bg-slate-800 hover:text-white");

fs.writeFileSync('src/components/vendor/VendorLayout.tsx', vendorLayout);
console.log('Fixed vendor sidebar contrast');

