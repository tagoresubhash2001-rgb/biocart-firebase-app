const fs = require('fs');
let data = fs.readFileSync('src/data/mockData.ts', 'utf8');

// We need to inject vendorId: 'biocart' into every object in MOCK_PRODUCTS array.
// Finding the objects might be tricky with regex, but we can look for `category:` or `price:` inside MOCK_PRODUCTS and add `vendorId: 'biocart',`
data = data.replace(/category: '(.*?)',/g, "category: '$1',\n    vendorId: 'biocart',");

fs.writeFileSync('src/data/mockData.ts', data);
console.log('Added vendorId to MOCK_PRODUCTS');
