const fs = require('fs');

let content = fs.readFileSync('src/components/vendor/VendorLayout.tsx', 'utf8');
content = content.replace(/'text-\[\#777777\] hover:bg-slate-800 hover:text-slate-200'/g, "'text-slate-300 hover:bg-slate-800 hover:text-white'");
content = content.replace(/'text-\[\#777777\] hover:bg-slate-100'/g, "'text-slate-300 hover:bg-slate-800 hover:text-white'");
content = content.replace(/text-\[\#777777\] hover:text-slate-900/g, "text-slate-300 hover:text-white");
fs.writeFileSync('src/components/vendor/VendorLayout.tsx', content);

