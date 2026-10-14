const fs = require('fs');

// 1. Fix AdminSettings
let adminSettings = fs.readFileSync('src/components/admin/AdminSettings.tsx', 'utf8');
adminSettings = adminSettings.replace(`if (!settings) return null;`, `if (!settings) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
        <h3 className="text-xl font-bold mb-2">Loading Settings...</h3>
      </div>
    );
  }`);
fs.writeFileSync('src/components/admin/AdminSettings.tsx', adminSettings);
console.log('Patched AdminSettings.tsx');

// 2. Fix AdminService settings listener to return default if empty
let adminService = fs.readFileSync('src/services/AdminService.ts', 'utf8');
// Find `subscribeToSettings`
const subSettingsMatch = adminService.match(/static subscribeToSettings[\s\S]*?\}\);[\s\S]*?\}/);
if (subSettingsMatch) {
  let newSub = subSettingsMatch[0].replace(
    /if \(docSnap\.exists\(\)\) \{\s*callback\(docSnap\.data\(\)\);\s*\}/,
    `if (docSnap.exists()) { callback(docSnap.data()); } else { callback(DEFAULT_STORE_SETTINGS); }`
  );
  adminService = adminService.replace(subSettingsMatch[0], newSub);
  fs.writeFileSync('src/services/AdminService.ts', adminService);
  console.log('Patched AdminService subscribeToSettings');
}

