const fs = require('fs');

const file = 'biocart/src/components/Shop.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('usePageCMS')) {
    content = content.replace("import { Product, CategoryItem } from '../types';", "import { Product, CategoryItem } from '../types';\nimport { usePageCMS } from '../hooks/usePageCMS';");
    content = content.replace("const [isLoading, setIsLoading] = useState(false);", "const [isLoading, setIsLoading] = useState(false);\n  const { cmsData } = usePageCMS('shop-catalog');");

    content = content.replace(
        "Sustainable <br />\n            <span className=\"gradient-text-green font-sans font-extrabold italic drop-shadow-[0_2px_15px_rgba(34,197,94,0.3)]\">Biodegradable Materials</span>", 
        "{cmsData?.heroTitle ? <span dangerouslySetInnerHTML={{ __html: cmsData.heroTitle }} /> : <>Sustainable <br />\n            <span className=\"gradient-text-green font-sans font-extrabold italic drop-shadow-[0_2px_15px_rgba(34,197,94,0.3)]\">Biodegradable Materials</span></>}"
    );

    content = content.replace(
        "Browse our professionally curated collection of organic-certified gardening materials and plastic-free plant supplies.", 
        "{cmsData?.heroSubtitle ? cmsData.heroSubtitle : 'Browse our professionally curated collection of organic-certified gardening materials and plastic-free plant supplies.'}"
    );

    fs.writeFileSync(file, content);
}
