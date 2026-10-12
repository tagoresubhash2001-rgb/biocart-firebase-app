const fs = require('fs');
const file = 'biocart/src/components/admin/AdminDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /\/\/ Seed initial data idempotently if empty\s+const unsubProducts/,
  '// Seed initial data idempotently if empty\n    AdminService.seedInitialCatalogIfEmpty().catch(console.error);\n    const unsubProducts'
);

fs.writeFileSync(file, content);
