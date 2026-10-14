const fs = require('fs');

let content = fs.readFileSync('src/components/vendor/VendorDashboardHome.tsx', 'utf8');

// replace setDataLoading(false) from inside the callback to outside
content = content.replace(
  /setDataLoading\(false\);\n\s*\}\);\n\n\s*return \(\) => \{/g,
  "});\n\n    setDataLoading(false);\n\n    return () => {"
);

fs.writeFileSync('src/components/vendor/VendorDashboardHome.tsx', content);
