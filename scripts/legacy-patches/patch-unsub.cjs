const fs = require('fs');
let service = fs.readFileSync('src/services/AdminService.ts', 'utf8');

service = service.replace(
  /return onSnapshot\((.*?), \((.*?)\) => \{([\s\S]*?)\}, \(error\) => \{([\s\S]*?)\}\);/g,
  `let unsubscribe = () => {};
    unsubscribe = onSnapshot($1, ($2) => {$3}, (error) => {
      console.warn('Firebase listener detached due to connection failure. Using local fallback data.');
      if (unsubscribe) unsubscribe();
      $4
    });
    return () => { if (unsubscribe) unsubscribe(); };`
);

fs.writeFileSync('src/services/AdminService.ts', service);
console.log('Patched AdminService unsubscribe');
