const fs = require('fs');

const file = 'biocart/src/components/Contact.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('usePageCMS')) {
    content = content.replace("import { useApp } from '../context/AppContext';", "import { useApp } from '../context/AppContext';\nimport { usePageCMS } from '../hooks/usePageCMS';");
    content = content.replace("const { addToast } = useApp();", "const { addToast } = useApp();\n  const { cmsData } = usePageCMS('contact-us');");

    content = content.replace(
        "Let’s Build a <br />\n            <span className=\"gradient-text-green font-sans font-extrabold italic drop-shadow-[0_2px_15px_rgba(34,197,94,0.3)]\">Plastic-Free Tomorrow</span>", 
        "{cmsData?.heroTitle ? <span dangerouslySetInnerHTML={{ __html: cmsData.heroTitle }} /> : <>Let’s Build a <br />\n            <span className=\"gradient-text-green font-sans font-extrabold italic drop-shadow-[0_2px_15px_rgba(34,197,94,0.3)]\">Plastic-Free Tomorrow</span></>}"
    );

    content = content.replace(
        "Reach out for retail support, local dealer partnerships, or bulk distributor supply chains.", 
        "{cmsData?.heroSubtitle ? cmsData.heroSubtitle : 'Reach out for retail support, local dealer partnerships, or bulk distributor supply chains.'}"
    );

    content = content.replace(
        "Sindulis Agro Products operates a state-of-the-art carbon-neutral processing facility. Visitors are welcome by scheduled appointments only.",
        "{cmsData?.content ? <span dangerouslySetInnerHTML={{ __html: cmsData.content }} /> : 'Sindulis Agro Products operates a state-of-the-art carbon-neutral processing facility. Visitors are welcome by scheduled appointments only.'}"
    );

    fs.writeFileSync(file, content);
}
