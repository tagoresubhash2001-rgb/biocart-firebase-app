const fs = require('fs');

let layout = fs.readFileSync('src/components/vendor/VendorLayout.tsx', 'utf8');
if (!layout.includes(', Settings } from \'lucide-react\'')) {
  layout = layout.replace(
    "} from 'lucide-react';",
    ", Settings } from 'lucide-react';"
  );
  fs.writeFileSync('src/components/vendor/VendorLayout.tsx', layout);
}

// Ensure type VendorSection includes settings
if (!layout.includes("'settings'")) {
  layout = layout.replace(
    "| 'wallet';",
    "| 'wallet' | 'settings';"
  );
  fs.writeFileSync('src/components/vendor/VendorLayout.tsx', layout);
}
