const fs = require('fs');
const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('LoadingProvider')) {
  content = "import { LoadingProvider } from './contexts/LoadingContext';\n" + content;
  content = content.replace(
    /<AuthProvider>/,
    `<LoadingProvider>\n      <AuthProvider>`
  );
  content = content.replace(
    /<\/AuthProvider>/,
    `<\/AuthProvider>\n    </LoadingProvider>`
  );
  fs.writeFileSync(file, content);
  console.log('App.tsx patched with LoadingProvider.');
} else {
  console.log('App.tsx already has LoadingProvider.');
}
