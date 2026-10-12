const fs = require('fs');
let file = 'src/services/AdminService.ts';
let content = fs.readFileSync(file, 'utf8');

// Find addProduct and updateProduct
// It probably sets a doc. We need to add a batch or just set the inventory document alongside.

// Add batch logic to addProduct and updateProduct if not there
console.log(content.match(/addProduct\(.*?\)/g));
console.log(content.match(/updateProduct\(.*?\)/g));

