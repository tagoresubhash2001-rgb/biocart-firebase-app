const fs = require('fs');
const path = require('path');

function replaceFallback(relPath, targetVar) {
  const fullPath = path.resolve(__dirname, '..', relPath);
  let content = fs.readFileSync(fullPath, 'utf8');
  
  const searchPattern = new RegExp(
    `const ${targetVar} = \\(\\s*realtimeProducts\\.length > 0\\s*\\?\\s*realtimeProducts\\s*:\\s*\\(import\\.meta\\.env\\.VITE_USE_SEED_FALLBACK === 'true' \\? SEED_PRODUCTS : \\[\\]\\)\\s*\\)`,
    'g'
  );

  const replacement = `const ${targetVar} = (realtimeProducts.length > 0 ? realtimeProducts : SEED_PRODUCTS)`;

  if (searchPattern.test(content)) {
    content = content.replace(searchPattern, replacement);
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Updated product fallback in ${relPath}`);
  } else {
    console.warn(`Pattern not found in ${relPath}`);
  }
}

replaceFallback('src/pages/Shop.tsx', 'allProducts');
replaceFallback('src/pages/Home.tsx', 'activeProducts');
