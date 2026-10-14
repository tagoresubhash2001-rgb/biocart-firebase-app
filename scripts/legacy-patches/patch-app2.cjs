const fs = require('fs');
const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

// Remove VendorProvider
content = content.replace(/import \{ VendorProvider \} from '.\/contexts\/VendorContext';\n/, '');
content = content.replace(/<VendorProvider>\s*/, '');
content = content.replace(/<\/VendorProvider>\s*/, '');

fs.writeFileSync(file, content);
console.log('App.tsx VendorProvider removed.');
