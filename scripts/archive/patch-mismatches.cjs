const fs = require('fs');

function replaceInFile(file, replacements) {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    for (let r of replacements) {
        content = content.replace(r.search, r.replace);
    }
    fs.writeFileSync(file, content);
}

// 1. AdminVendors
replaceInFile('src/components/admin/AdminVendors.tsx', [
    { search: /storeName/g, replace: 'businessName' },
    { search: /commissionRate/g, replace: 'commissionPercent' }
]);

// 2. AdminDashboard
replaceInFile('src/components/admin/AdminDashboard.tsx', [
    { search: /approvalStatus === 'pending'/g, replace: "status === 'pending'" }
]);

// 3. AdminProducts
replaceInFile('src/components/admin/AdminProducts.tsx', [
    { search: /vendorId:\s*vendors\[0\]\?.id\s*\|\|\s*'vendor-biocart-official'/g, replace: "vendorId: vendors[0]?.id || 'biocart'" },
    { search: /vendorName:\s*vendors\[0\]\?.storeName\s*\|\|\s*'BioCart Direct'/g, replace: "vendorName: vendors[0]?.businessName || 'BioCart Direct'" },
    { search: /v\?.storeName\s*\|\|\s*'BioCart Direct'/g, replace: "v?.businessName || 'BioCart Direct'" },
    { search: /v\.storeName/g, replace: "v.businessName" }
]);

// 4. AdminService & AdminProducts (stockQuantity || 100)
replaceInFile('src/services/AdminService.ts', [
    { search: /stockQuantity:\s*Number\(data\.stockQuantity\)\s*\|\|\s*100/g, replace: "stockQuantity: Number(data.stockQuantity) || 0" },
    { search: /stockQuantity:\s*Number\(product\.stockQuantity\)\s*\|\|\s*100/g, replace: "stockQuantity: Number(product.stockQuantity) || 0" }
]);

// 5. Dashboard (fake orders and nested useEffect)
// Will handle Dashboard.tsx separately below

// 6. VendorOrders (useEffect dependency)
replaceInFile('src/components/vendor/VendorOrders.tsx', [
    { search: /}, \[user\]\);/g, replace: "}, [vendorId]);" }
]);

// 7. VendorWallet
replaceInFile('src/components/vendor/VendorWallet.tsx', [
    { search: /balance/g, replace: 'availableBalance' },
    { search: /totalEarned/g, replace: 'lifetimeGross' }
]);

console.log("Replacements done");
