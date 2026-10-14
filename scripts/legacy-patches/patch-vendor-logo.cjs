const fs = require('fs');
const file = 'biocart/src/components/vendor/VendorLayout.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace header
content = content.replace(
  /<h1 className="text-xl font-bold flex items-center gap-2">[\s\S]*?<\/h1>/,
  `<div className="mb-4">
            <BioCartLogo size="sm" showTagline={false} className="brightness-200" />
          </div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-white">
            {profile?.logoUrl ? (
                <img src={profile.logoUrl} alt="Vendor Logo" className="w-8 h-8 rounded bg-white object-cover" />
              ) : null}
              <div className="flex flex-col">
                <span className="truncate leading-tight">{profile?.businessName || 'BioCart Vendor'}</span>
                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider mt-1">Vendor Console</span>
              </div>
          </h1>`
);

// Add import
if (!content.includes("import { BioCartLogo } from '../BioCartLogo';")) {
  content = content.replace("import { useAuth }", "import { BioCartLogo } from '../BioCartLogo';\nimport { useAuth }");
}

fs.writeFileSync(file, content);
