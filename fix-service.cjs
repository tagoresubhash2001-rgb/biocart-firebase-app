const fs = require('fs');
let code = fs.readFileSync('src/services/AdminService.ts', 'utf8');

const fixListener = (code, methodName, collectionName) => {
  const regex = new RegExp(`static ${methodName}\\(callback: \\(.*?\\) => void\\): \\(\\) => void \\{\\s+const (\\w+)Ref = collection\\(db, '${collectionName}'\\);\\s+let unsubscribe = \\(\\) => \\{\\};\\s+unsubscribe = onSnapshot\\(\\1Ref, \\(snapshot\\) => \\{([\\s\\S]*?)\\}, \\((.*?)\\) => ([\\s\\S]*?)\\);\\s+\\}`, 'g');
  
  return code.replace(regex, (match, ref, successBody, errArg, errBody) => {
    return `static ${methodName}(callback: (data: any[]) => void, onError?: (error: any) => void): () => void {
    const ${ref}Ref = collection(db, '${collectionName}');
    let unsubscribe = () => {};
    unsubscribe = onSnapshot(${ref}Ref, (snapshot) => {${successBody}}, (${errArg}) => {
      console.warn('Firebase listener error for ${collectionName}:', ${errArg});
      if (unsubscribe) unsubscribe();
      if (onError) onError(${errArg});
      else callback([]); // fallback to empty array or we could fallback to mock data here
    });
    return () => { if (unsubscribe) unsubscribe(); };
  }`;
  });
};

// Actually, regex might be too brittle if the bodies are different. Let's just fix the missing returns for all subscribe methods.
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
  // If a method ends with `}, (err) => ...); \n }`, we need to insert `return unsubscribe;` before the last brace.
  const regex = new RegExp(`(static ${method}[\\s\\S]*?\\}\\);\\s*)\\}`, 'g');
  code = code.replace(regex, (match, body) => {
    if (!body.includes('return () =>')) {
      return body + `  return () => { if (unsubscribe) unsubscribe(); };\n  }`;
    }
    return match;
  });
}

// Ensure the MOCK data fallbacks are preserved for the ones that had it.
// The user explicitly requested we fix ALL listener lifecycle mismatches and add error callbacks.
// Let's rewrite the subscription methods properly with Babel or just string replacements.

fs.writeFileSync('src/services/AdminService.ts.tmp', code);
console.log('Fixed missing returns in AdminService.ts');
