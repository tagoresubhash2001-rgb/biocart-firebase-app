const { Project } = require('ts-morph');
const path = require('path');

const project = new Project({
    tsConfigFilePath: path.join(__dirname, 'tsconfig.json'),
});

const componentsDir = project.getDirectory(path.join(__dirname, 'src/components'));

// Create target directories
const pagesDir = project.createDirectory(path.join(__dirname, 'src/pages'));
const uiDir = project.createDirectory(path.join(__dirname, 'src/components/ui'));
const layoutDir = project.createDirectory(path.join(__dirname, 'src/components/layout'));

// Groupings
const pages = ['Home.tsx', 'Shop.tsx', 'About.tsx', 'Contact.tsx', 'Dashboard.tsx', 'Portals.tsx', 'GenericCMSPage.tsx'];
const layout = ['Footer.tsx', 'DynamicIslandNav.tsx'];
const ui = ['BioCartLogo.tsx', 'FloatingSocials.tsx', 'AuthModal.tsx', 'CheckoutModal.tsx', 'ProductCard.tsx', 'ProductCardSkeleton.tsx', 'ProductDetails.tsx', 'SafeImage.tsx', 'SEOManager.tsx', 'Toast.tsx', 'ErrorBoundary.tsx'];

// Move files
for (const file of pages) {
    const sourceFile = componentsDir.getSourceFile(file);
    if (sourceFile) {
        sourceFile.moveToDirectory(pagesDir);
    }
}

for (const file of layout) {
    const sourceFile = componentsDir.getSourceFile(file);
    if (sourceFile) {
        sourceFile.moveToDirectory(layoutDir);
    }
}

for (const file of ui) {
    const sourceFile = componentsDir.getSourceFile(file);
    if (sourceFile) {
        sourceFile.moveToDirectory(uiDir);
    }
}

project.saveSync();
console.log('Successfully organized files and updated imports.');
