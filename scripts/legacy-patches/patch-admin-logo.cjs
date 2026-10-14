const fs = require('fs');
const file = 'biocart/src/components/admin/AdminLayout.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace header
content = content.replace(
  /<div className="w-9 h-9.*?<\/div>\s*<div>\s*<div className="flex items-center gap-2">\s*<div className="flex items-center justify-center w-8 h-8.*?<\/div>\s*<span className="font-bold text-lg text-slate-900 tracking-tight">BioCart<\/span>/s,
  '<BioCartLogo size="sm" showTagline={false} />\n            <div>\n              <div className="flex items-center gap-2">'
);

// Add import
if (!content.includes("import { BioCartLogo } from '../BioCartLogo';")) {
  content = content.replace("import { useApp } from '../../context/AppContext';", "import { useApp } from '../../context/AppContext';\nimport { BioCartLogo } from '../BioCartLogo';");
}

fs.writeFileSync(file, content);
