const fs = require('fs');
const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

// Ensure all providers are imported
const importsToAdd = [
  "import { LoadingProvider } from './contexts/LoadingContext';",
  "import { NotificationProvider } from './contexts/NotificationContext';"
];

importsToAdd.forEach(imp => {
  if (!content.includes(imp)) {
    content = imp + '\n' + content;
  }
});

// Strip all current wrappers around AppContent to rewrite them cleanly
const appContentRegex = /return\s*\(\s*(<[\w]+>\s*)*<AppContent \/>(\s*<\/[\w]+>)*\s*\);/;
content = content.replace(appContentRegex, `return (
    <LoadingProvider>
      <NotificationProvider>
        <AuthProvider>
          <AppProvider>
            <AppContent />
          </AppProvider>
        </AuthProvider>
      </NotificationProvider>
    </LoadingProvider>
  );`);

fs.writeFileSync(file, content);
console.log('App.tsx wrapped with all providers in correct order.');
