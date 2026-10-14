const fs = require('fs');
const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

// Uncomment AdminConsole and VendorConsole
content = content.replace(/\/\/ const AdminConsole = lazy/g, "const AdminConsole = lazy");
content = content.replace(/\/\/ const VendorConsole = lazy/g, "const VendorConsole = lazy");

// Insert the routing logic back in
const missingRoutes = `
                if (subView === 'admin' || currentTab === 'admin' as any) return <AdminConsole />;
                if (subView === 'vendor' || currentTab === 'vendor' as any) return <VendorConsole />;
`;

if (!content.includes('return <AdminConsole />')) {
  content = content.replace(
    /if \(subView === 'dashboard'\) return <Dashboard \/>;/,
    missingRoutes + "                if (subView === 'dashboard') return <Dashboard />;"
  );
}

fs.writeFileSync(file, content);
console.log('App.tsx routing restored.');
