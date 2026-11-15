const fs = require('fs');
const file = 'src/components/Dashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Fix nested useEffect
content = content.replace(
  /React\.useEffect\(\(\) => \{\s*const unsub = AdminService\.subscribeToProducts\(\(list\) => \{\s*setRealtimeProducts\(list\);\s*\}\);\s*useEffect\(\(\) => \{/gs,
  `useEffect(() => {
    const unsub = AdminService.subscribeToProducts((list) => {
      setRealtimeProducts(list);
    });
    return () => unsub();
  }, []);

  useEffect(() => {`
);

// 2. Remove fake order injection
content = content.replace(
  /if \(activeOrderTrackId && !orders\.find[^{]*\{.*?\}\);?\s*\}/gs,
  ''
);

// 3. Fix tracking pattern logic:
// Currently: currentTrackId.startsWith('BC-') && currentTrackId.endsWith('-IN')
// We should check if currentTrackId matches an order id from `orders` array, or just show loading state. Since we have `orders` fetched, we can do `orders.find(o => o.id === currentTrackId)`
content = content.replace(
  /currentTrackId\.startsWith\('BC-'\)\s*&&\s*currentTrackId\.endsWith\('-IN'\)/g,
  "orders.some(o => o.id === currentTrackId)"
);
content = content.replace(
  /currentTrackId === 'BC-548123-IN'/g,
  "false"
);
content = content.replace(
  /currentTrackId === 'BC-938210-IN'/g,
  "orders.some(o => o.id === currentTrackId && o.status === 'delivered')"
);
content = content.replace(
  /\['BC-548123-IN', 'BC-938210-IN'\]\.includes\(currentTrackId\)/g,
  "orders.some(o => o.id === currentTrackId && ['shipped', 'delivered'].includes(o.status))"
);


fs.writeFileSync(file, content);
console.log("Dashboard.tsx patched");
