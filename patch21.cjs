const fs = require('fs');
let file = 'src/services/AdminService.ts';
let content = fs.readFileSync(file, 'utf8');

// Inside saveProduct, we need to create/update inventory doc
content = content.replace(
  /await setDoc\(productRef, productData, \{ merge: true \}\);/g,
  "await setDoc(productRef, productData, { merge: true });\n\n    const invRef = doc(db, 'inventory', productId);\n    await setDoc(invRef, {\n      productId: productId,\n      vendorId: productData.vendorId,\n      availableQuantity: productData.stockQuantity || 0,\n      updatedAt: new Date()\n    }, { merge: true });"
);

fs.writeFileSync(file, content);
