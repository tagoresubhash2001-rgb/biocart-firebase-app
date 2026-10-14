const fs = require('fs');

let appContent = fs.readFileSync('src/App.tsx', 'utf8');

appContent = appContent.replace(
  /\/\/>\s*<VendorConsole \/>\s*<\/Suspense>\s*\);\s*\}/,
  ''
);
fs.writeFileSync('src/App.tsx', appContent);
console.log('App.tsx repaired');
