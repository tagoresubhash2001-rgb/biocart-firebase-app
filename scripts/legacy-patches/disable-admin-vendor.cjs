const fs = require('fs');

// App.tsx
let appContent = fs.readFileSync('src/App.tsx', 'utf8');
appContent = appContent.replace(
  /if \(subView === 'admin' \|\| \(currentTab as string\) === 'admin'\) \{[\s\S]*?\}\s*if \(subView === 'vendor' \|\| \(currentTab as string\) === 'vendor'\) \{[\s\S]*?\}/,
  `// if (subView === 'admin' || (currentTab as string) === 'admin') {
    //   return (
    //     <Suspense fallback={<div className="flex-grow flex items-center justify-center min-h-[50vh]"><div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" /></div>}>
    //       <AdminConsole />
    //     </Suspense>
    //   );
    // }
    
    // if (subView === 'vendor' || (currentTab as string) === 'vendor') {
    //   return (
    //     <Suspense fallback={<div className="flex-grow flex items-center justify-center min-h-[50vh]"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>}>
    //       <VendorConsole />
    //     </Suspense>
    //   );
    // }`
);
fs.writeFileSync('src/App.tsx', appContent);

// Dashboard.tsx
let dashboardContent = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');
dashboardContent = dashboardContent.replace(
  /\{\(user\.role === 'admin' \|\| user\.role === 'super_admin'\) && \([\s\S]*?\)\}/,
  `{/* {(user.role === 'admin' || user.role === 'super_admin') && (
                <a
                  href="#admin"
                  className="w-full text-left py-3 px-4 rounded-2xl text-sm font-semibold flex items-center gap-2.5 bg-emerald-600 text-white shadow-md hover:bg-emerald-500 transition-colors"
                >
                  <Search className="w-4.5 h-4.5" />
                  <span>Admin Console</span>
                </a>
              )} */}`
);

fs.writeFileSync('src/components/Dashboard.tsx', dashboardContent);
console.log('Disabled admin/vendor features');
