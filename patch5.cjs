const fs = require('fs');

let homeTsx = fs.readFileSync('src/components/Home.tsx', 'utf8');
homeTsx = homeTsx.replace(/r\.status === 'published' \|\| r\.active !== false/g, "r.status === 'approved'");
fs.writeFileSync('src/components/Home.tsx', homeTsx);
console.log('Patched Home.tsx review filtering');

let mockData = fs.readFileSync('src/data/mockData.ts', 'utf8');
mockData = mockData.replace(/status: 'published'/g, "status: 'approved'");
fs.writeFileSync('src/data/mockData.ts', mockData);
console.log('Patched mockData.ts review status');

let adminReviews = fs.readFileSync('src/components/admin/AdminReviews.tsx', 'utf8');
adminReviews = adminReviews.replace(/status: 'published'/g, "status: 'approved'");
fs.writeFileSync('src/components/admin/AdminReviews.tsx', adminReviews);
console.log('Patched AdminReviews.tsx status');

