const fs = require('fs');
const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('AppProvider')) {
  // We need to import AuthProvider and AppProvider and wrap AppContent.
  let imports = `import { AppProvider } from './context/AppContext';\nimport { AuthProvider } from './contexts/AuthContext';\nimport { VendorProvider } from './contexts/VendorContext';\n`;
  
  content = imports + content;
  
  content = content.replace(
    /export default function App\(\) \{\s*return <AppContent \/>;\s*\}/,
    `export default function App() {
  return (
    <AuthProvider>
      <VendorProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </VendorProvider>
    </AuthProvider>
  );
}`
  );
  
  fs.writeFileSync(file, content);
  console.log('App.tsx patched successfully.');
} else {
  console.log('App.tsx already has providers?!');
}
