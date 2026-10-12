const fs = require('fs');

function fixVendorComponent(file, componentName) {
  let content = fs.readFileSync(file, 'utf8');

  // Replace `loading` from useState with `metricsLoading` (or similar depending on file)
  if (content.includes('const [loading, setLoading] = useState(true);')) {
    content = content.replace('const [loading, setLoading] = useState(true);', 'const [dataLoading, setDataLoading] = useState(true);');
    content = content.replace(/setLoading\(/g, 'setDataLoading(');
    content = content.replace(/if \(loading\)/g, 'if (vendorLoading || dataLoading)');
  }

  // Update useVendor destructuring
  if (content.includes('const { user, vendorId } = useVendor();')) {
    content = content.replace('const { user, vendorId } = useVendor();', 'const { user, vendorId, loading: vendorLoading } = useVendor();');
  } else if (content.includes('const { vendorId } = useVendor();')) {
    content = content.replace('const { vendorId } = useVendor();', 'const { vendorId, loading: vendorLoading } = useVendor();');
  } else if (content.includes('const { vendorId, loading: vendorLoading } = useVendor();')) {
    // Already patched
  }

  // Update useEffect early return
  const earlyReturnStr = `    if (!vendorId) return;`;
  const fixedEarlyReturn = `    if (vendorLoading) return;
    if (!vendorId) {
      setDataLoading(false);
      return;
    }`;
  content = content.replace(earlyReturnStr, fixedEarlyReturn);

  // Add "Vendor profile not found"
  if (content.includes('if (vendorLoading || dataLoading) return <div')) {
    const notFoundBlock = `
  if (!vendorId) {
    return (
      <div className="p-8 text-center bg-white dark:bg-charcoal-800 rounded-2xl border border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 mt-6 shadow-sm">
        <h3 className="text-xl font-bold mb-2">Vendor profile not found</h3>
        <p className="text-sm">You must be logged in as an authorized vendor to view this data.</p>
      </div>
    );
  }
`;
    content = content.replace('if (vendorLoading || dataLoading) return <div', notFoundBlock + '\n  if (vendorLoading || dataLoading) return <div');
  }

  fs.writeFileSync(file, content);
  console.log('Fixed ' + file);
}

fixVendorComponent('src/components/vendor/VendorDashboardHome.tsx', 'VendorDashboardHome');
fixVendorComponent('src/components/vendor/VendorProducts.tsx', 'VendorProducts');
fixVendorComponent('src/components/vendor/VendorOrders.tsx', 'VendorOrders');
fixVendorComponent('src/components/vendor/VendorWallet.tsx', 'VendorWallet');

