const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'admin', 'AdminSettings.tsx');
let code = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to LF
let norm = code.replace(/\r\n/g, '\n');

// 1. Add import
if (!norm.includes('AdminApiConfiguration')) {
  norm = norm.replace(
    "import { AdminProfileSecurity } from './AdminProfileSecurity';",
    "import { AdminProfileSecurity } from './AdminProfileSecurity';\nimport { AdminApiConfiguration } from './AdminApiConfiguration';\nimport { Key } from 'lucide-react';"
  );
}

// 2. State type
norm = norm.replace(
  "const [activeTab, setActiveTab] = useState<'store' | 'security'>('store');",
  "const [activeTab, setActiveTab] = useState<'store' | 'financial' | 'security' | 'api'>('store');"
);

// 3. Add Tab Button before Security
const securityTabBtn = `<button
            type="button"
            onClick={() => setActiveTab('security')}`;

const apiTabBtn = `<button
            type="button"
            onClick={() => setActiveTab('api')}
            className={\`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 \${
              activeTab === 'api'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }\`}
          >
            <Key className="w-3.5 h-3.5" />
            Logistics & API Integration
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}`;

if (norm.includes(securityTabBtn) && !norm.includes("onClick={() => setActiveTab('api')")) {
  norm = norm.replace(securityTabBtn, apiTabBtn);
}

// 4. Render tab content
const renderSecurityCondition = `{activeTab === 'security' ? (
        <AdminProfileSecurity />
      ) : activeTab === ('financial' as any) ? (`;

const renderUpdatedCondition = `{activeTab === 'security' ? (
        <AdminProfileSecurity />
      ) : activeTab === 'api' ? (
        <AdminApiConfiguration />
      ) : activeTab === 'financial' ? (`;

if (norm.includes(renderSecurityCondition)) {
  norm = norm.replace(renderSecurityCondition, renderUpdatedCondition);
}

fs.writeFileSync(filePath, norm, 'utf8');
console.log('Successfully integrated AdminApiConfiguration into AdminSettings.tsx!');
