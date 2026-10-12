const fs = require('fs');
let service = fs.readFileSync('src/services/AdminService.ts', 'utf8');

service = service.replace(
  /return onSnapshot\(q, \(snap\) => \{\s+callback\(snap\.docs\.map\(doc => \(\{ id: doc\.id, \.\.\.doc\.data\(\) \} as Product\)\)\);\s+\}\);/,
  `return onSnapshot(q, (snap) => {
      callback(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    }, (error) => {
      console.error('Firebase Error (VendorProducts):', error.message);
      if (error.message.includes('not found') || error.message.includes('permission')) {
        console.warn('Falling back to MOCK_PRODUCTS for vendor:', vendorId);
        callback(MOCK_PRODUCTS.filter(p => p.vendorId === vendorId) as Product[]);
      }
    });`
);
fs.writeFileSync('src/services/AdminService.ts', service);
console.log('Patched AdminService subscribeToVendorProducts');
