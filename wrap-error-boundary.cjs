const fs = require('fs');

const wrapWithErrorBoundary = (file) => {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('ErrorBoundary')) {
    content = content.replace("import React, {", "import React, {"); // NOOP
    content = "import { ErrorBoundary } from '../ErrorBoundary';\n" + content;
    
    // find the <main> block
    const mainRegex = /(<main[^>]*>)([\s\S]*?)(<\/main>)/;
    content = content.replace(mainRegex, (match, open, inner, close) => {
      return `${open}\n<ErrorBoundary>\n${inner}\n</ErrorBoundary>\n${close}`;
    });
    fs.writeFileSync(file, content);
    console.log('Wrapped with ErrorBoundary:', file);
  }
};

wrapWithErrorBoundary('src/components/admin/AdminLayout.tsx');
wrapWithErrorBoundary('src/components/vendor/VendorLayout.tsx');

