const fs = require('fs');

// 1. Add to VendorLayout.tsx
let layout = fs.readFileSync('src/components/vendor/VendorLayout.tsx', 'utf8');
if (!layout.includes("id: 'settings'")) {
  layout = layout.replace(
    "{ id: 'wallet', label: 'Wallet', icon: Wallet },",
    "{ id: 'wallet', label: 'Wallet', icon: Wallet },\n  { id: 'settings', label: 'Settings', icon: Settings },"
  );
  if (!layout.includes('import { Package, ShoppingBag, Wallet, LayoutDashboard, Settings }')) {
    layout = layout.replace(
      'import { Package, ShoppingBag, Wallet, LayoutDashboard } from',
      'import { Package, ShoppingBag, Wallet, LayoutDashboard, Settings } from'
    );
  }
  fs.writeFileSync('src/components/vendor/VendorLayout.tsx', layout);
}

// 2. Add to VendorConsole.tsx
let consoleTsx = fs.readFileSync('src/components/vendor/VendorConsole.tsx', 'utf8');
if (!consoleTsx.includes('import { VendorSettings }')) {
  consoleTsx = consoleTsx.replace(
    "import { VendorWallet } from './VendorWallet';",
    "import { VendorWallet } from './VendorWallet';\nimport { VendorSettings } from './VendorSettings';"
  );
  consoleTsx = consoleTsx.replace(
    "default:",
    "case 'settings': return <VendorSettings />;\n      default:"
  );
  fs.writeFileSync('src/components/vendor/VendorConsole.tsx', consoleTsx);
}

