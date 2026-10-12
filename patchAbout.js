const fs = require('fs');

const aboutFile = 'biocart/src/components/About.tsx';
let content = fs.readFileSync(aboutFile, 'utf8');

if (!content.includes('usePageCMS')) {
    content = content.replace("import { SafeImage } from './SafeImage';", "import { SafeImage } from './SafeImage';\nimport { usePageCMS } from '../hooks/usePageCMS';");
    content = content.replace("const { setTab } = useApp();", "const { setTab } = useApp();\n  const { cmsData } = usePageCMS('about-us');");

    content = content.replace(
        "Our Story, Purpose, and <br />\n            <span className=\"gradient-text-green font-sans font-extrabold italic drop-shadow-[0_2px_15px_rgba(34,197,94,0.3)]\">Sustainable Foundations</span>", 
        "{cmsData?.heroTitle ? <span dangerouslySetInnerHTML={{ __html: cmsData.heroTitle }} /> : <>Our Story, Purpose, and <br />\n            <span className=\"gradient-text-green font-sans font-extrabold italic drop-shadow-[0_2px_15px_rgba(34,197,94,0.3)]\">Sustainable Foundations</span></>}"
    );

    content = content.replace(
        "<p>\n              Traditional household gardening products look green on the surface, but are wrapped in microplastic structures. Millions of black plastic seedling containers and chemical soil mixes containing heavy metal residues are sold each year across India.\n            </p>\n            <p>\n              To solve this challenge, BioCart is on an ecological mission to empower millions of modern growers with biodegradable raw coir containers, premium chemical-free growing substrates, and zero-plastic packaging envelopes. We ensure that every material that nurtures your plants can return seamlessly to the earth.\n            </p>", 
        "{cmsData?.mission ? <div dangerouslySetInnerHTML={{ __html: cmsData.mission }} className=\"space-y-4\" /> : <><p>\n              Traditional household gardening products look green on the surface, but are wrapped in microplastic structures. Millions of black plastic seedling containers and chemical soil mixes containing heavy metal residues are sold each year across India.\n            </p>\n            <p>\n              To solve this challenge, BioCart is on an ecological mission to empower millions of modern growers with biodegradable raw coir containers, premium chemical-free growing substrates, and zero-plastic packaging envelopes. We ensure that every material that nurtures your plants can return seamlessly to the earth.\n            </p></>}"
    );

    content = content.replace(
        "<p>\n              By 2030, our goal is to establish fully closed-loop agricultural supply metrics across India, processing agricultural side streams into high-performance growing substrates. This eliminates emissions associated with cross-country shipping and ensures that each organic mix is tailored specifically to local regional water and air conditions.\n            </p>\n            <p>\n              We are also developing integrated home organic composting systems that connect with digital platforms to track carbon sequestration, allowing everyday balcony gardeners to measure and verify their positive contribution to climate metrics.\n            </p>",
        "{cmsData?.vision ? <div dangerouslySetInnerHTML={{ __html: cmsData.vision }} className=\"space-y-4\" /> : <><p>\n              By 2030, our goal is to establish fully closed-loop agricultural supply metrics across India, processing agricultural side streams into high-performance growing substrates. This eliminates emissions associated with cross-country shipping and ensures that each organic mix is tailored specifically to local regional water and air conditions.\n            </p>\n            <p>\n              We are also developing integrated home organic composting systems that connect with digital platforms to track carbon sequestration, allowing everyday balcony gardeners to measure and verify their positive contribution to climate metrics.\n            </p></>}"
    );

    fs.writeFileSync(aboutFile, content);
}
