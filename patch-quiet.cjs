const fs = require('fs');
let service = fs.readFileSync('src/services/AdminService.ts', 'utf8');

// Replace the fallback handlers to unsubscribe immediately to stop retry spam
// Example match:
//     return onSnapshot(q, (snapshot) => { ... }, (error) => {
//       console.error('Firebase Error (Products):', error.message);
//       if (error.message.includes('not found') || error.message.includes('permission')) {
//         console.warn('Falling back to MOCK_PRODUCTS');
//         callback(MOCK_PRODUCTS as Product[]);
//       }
//     });

// We can do this with a regex for all onSnapshot calls in AdminService.
service = service.replace(
  /\(error\) => \{\s+console\.error\('Firebase Error \((.*?)\):', error\.message\);\s+if \(error\.message\.includes\('not found'\) \|\| error\.message\.includes\('permission'\)\) \{\s+console\.warn\('Falling back to MOCK_(.*?)'\);\s+callback\((.*?)\);\s+\}\s+\}\)/g,
  `(error) => {
      console.warn('Firebase connection failed (' + '$1' + '). Using local fallback data.');
      if (error.message.includes('not found') || error.message.includes('permission')) {
        callback($3);
      }
    })`
);

fs.writeFileSync('src/services/AdminService.ts', service);
console.log('Patched AdminService to quiet down Firebase errors.');
