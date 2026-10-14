const fs = require('fs');

const file = 'biocart/src/components/Portals.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('usePageCMS')) {
    content = content.replace("import { useApp } from '../context/AppContext';", "import { useApp } from '../context/AppContext';\nimport { usePageCMS } from '../hooks/usePageCMS';");
    content = content.replace("const { user, addToast } = useApp();", "const { user, addToast } = useApp();\n  const { cmsData } = usePageCMS('dealer-portal');");

    content = content.replace(
        "Regional Dealer Desk", 
        "{cmsData?.heroTitle ? <span dangerouslySetInnerHTML={{ __html: cmsData.heroTitle }} /> : 'Regional Dealer Desk'}"
    );

    content = content.replace(
        "Access factory direct bulk catalogs, configure regional nursery allocations, and log custom sizing orders for Sindulis coir products.", 
        "{cmsData?.heroSubtitle ? cmsData.heroSubtitle : 'Access factory direct bulk catalogs, configure regional nursery allocations, and log custom sizing orders for Sindulis coir products.'}"
    );

    fs.writeFileSync(file, content);
}
