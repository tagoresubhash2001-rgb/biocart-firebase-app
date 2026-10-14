const fs = require('fs');

let vendorOrders = fs.readFileSync('src/components/vendor/VendorOrders.tsx', 'utf8');
vendorOrders = vendorOrders.replace(
  `import { collectionGroup, query, where, onSnapshot } from 'firebase/firestore';`,
  `import { collectionGroup, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';`
);
fs.writeFileSync('src/components/vendor/VendorOrders.tsx', vendorOrders);
console.log('Patched VendorOrders.tsx imports');
