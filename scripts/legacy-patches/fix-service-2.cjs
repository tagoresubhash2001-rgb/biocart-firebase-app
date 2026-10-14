const fs = require('fs');
let code = fs.readFileSync('src/services/AdminService.ts', 'utf8');

const methods = [
  'subscribeToProducts',
  'subscribeToVendorProducts',
  'subscribeToCategories',
  'subscribeToBanners',
  'subscribeToReviews',
  'subscribeToUsers',
  'subscribeToOrders',
  'subscribeToAuditLogs',
  'subscribeToVendors'
];

for (const method of methods) {
  // Find the exact line `, (err) => console.error(..., err));` and add `return () => { if (unsubscribe) unsubscribe(); };` after it
  const regex = new RegExp(`(static ${method}[\\s\\S]*?\\(err\\) => console.error\\(.*?, err\\)\\);\\s*)\\}`, 'g');
  code = code.replace(regex, (match, body) => {
    return body + `  return () => { if (unsubscribe) unsubscribe(); };\n  }`;
  });
  
  // Also fix the ones that have fallback
  const regexFallback = new RegExp(`(static ${method}[\\s\\S]*?\\)\\s*\\}\\);\\s*return \\(\\) => \\{ if \\(unsubscribe\\) unsubscribe\\(\\); \\};\\s*)\\}`, 'g');
  code = code.replace(regexFallback, (match, body) => {
    // If it already has it, leave it
    return match;
  });
  
  // If it's one of those without err log (because we patched it to have console.warn), find the end of the method
  const regexWarn = new RegExp(`(static ${method}[\\s\\S]*?if \\(unsubscribe\\) unsubscribe\\(\\);\\s*callback\\(MOCK_.*?\\);\\s*\\}\\);\\s*)\\}`, 'g');
  code = code.replace(regexWarn, (match, body) => {
    return body + `  return () => { if (unsubscribe) unsubscribe(); };\n  }`;
  });
}

// Ensure the MOCK data fallbacks are preserved and the return statement is correctly added exactly once.
// Let's do it much simpler:
// 1. replace `return () => { if (unsubscribe) unsubscribe(); };\n  return () => { if (unsubscribe) unsubscribe(); };` with a single one.
code = code.replace(/return \(\) => \{ if \(unsubscribe\) unsubscribe\(\); \};\s*return \(\) => \{ if \(unsubscribe\) unsubscribe\(\); \};/g, 'return () => { if (unsubscribe) unsubscribe(); };');

fs.writeFileSync('src/services/AdminService.ts', code);
console.log('Fixed missing returns in AdminService.ts');
