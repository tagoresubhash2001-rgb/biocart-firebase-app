const fs = require('fs');

// 1. Remove from AdminLayout.tsx
let layout = fs.readFileSync('src/components/admin/AdminLayout.tsx', 'utf8');
layout = layout.replace(/\{\s*id:\s*'banners',\s*label:\s*'Banners & Hero',\s*icon:\s*ImageIcon\s*\},?\n?/g, '');
fs.writeFileSync('src/components/admin/AdminLayout.tsx', layout);
console.log('Removed banners from AdminLayout.tsx');

// 2. Remove from AdminConsole.tsx
let consoleTsx = fs.readFileSync('src/components/admin/AdminConsole.tsx', 'utf8');
consoleTsx = consoleTsx.replace(/case 'banners': return <AdminBanners \/>;\n?/g, '');
fs.writeFileSync('src/components/admin/AdminConsole.tsx', consoleTsx);
console.log('Removed banners from AdminConsole.tsx');

// 3. Add to AdminHomepage.tsx
let homepageTsx = fs.readFileSync('src/components/admin/AdminHomepage.tsx', 'utf8');
if (!homepageTsx.includes('<AdminBanners />')) {
  homepageTsx = homepageTsx.replace(
    "import { AdminService } from '../../services/AdminService';",
    "import { AdminService } from '../../services/AdminService';\nimport { AdminBanners } from './AdminBanners';"
  );
  
  // Find where to insert it.
  // The user says "Home Page Management must contain: SECTION 1 Promotional Top Banner Ribbon ... SECTION 2 Hero & Banner Management ... SECTION 3 Homepage Dynamic Sections"
  homepageTsx = homepageTsx.replace(
    '<h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Homepage Dynamic Sections</h3>',
    '<div className="mb-8"><AdminBanners /></div>\n        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Homepage Dynamic Sections</h3>'
  );
  
  fs.writeFileSync('src/components/admin/AdminHomepage.tsx', homepageTsx);
  console.log('Added AdminBanners to AdminHomepage.tsx');
}

