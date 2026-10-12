const fs = require('fs');
const file = 'src/components/Home.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add loading states
if (!content.includes('const [loadingProducts, setLoadingProducts] = useState(true);')) {
  content = content.replace(
    'const [realtimeProducts, setRealtimeProducts] = useState<Product[]>([]);',
    'const [realtimeProducts, setRealtimeProducts] = useState<Product[]>([]);\n    const [loadingProducts, setLoadingProducts] = useState(true);'
  );
  content = content.replace(
    'const [realtimeCategories, setRealtimeCategories] = useState<CategoryItem[]>([]);',
    'const [realtimeCategories, setRealtimeCategories] = useState<CategoryItem[]>([]);\n    const [loadingCategories, setLoadingCategories] = useState(true);'
  );
}

// 2. Set loading false in listeners
content = content.replace(
  /setRealtimeProducts\(list\);\n\s*}\);/g,
  'setRealtimeProducts(list);\n        setLoadingProducts(false);\n      });'
);
content = content.replace(
  /setRealtimeCategories\(list\);\n\s*}\);/g,
  'setRealtimeCategories(list);\n        setLoadingCategories(false);\n      });'
);

// 3. Render skeleton for sections
const sectionRenderRegex = /\{section\.products\.length > 0 && \(/g;
const newSectionRender = `{loadingProducts ? (
            <div className="w-full relative px-6 md:px-12 py-4">
              <div className="flex items-end justify-between mb-8"><div className="space-y-2"><div className="h-4 w-24 bg-slate-200 dark:bg-charcoal-800 rounded animate-pulse"></div><div className="h-8 w-64 bg-slate-200 dark:bg-charcoal-800 rounded animate-pulse"></div></div></div>
              <div className="flex gap-4 overflow-hidden">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="min-w-[280px] md:min-w-[320px] max-w-[280px] md:max-w-[320px] h-[400px] bg-slate-100 dark:bg-charcoal-800 rounded-3xl animate-pulse flex-shrink-0" />
                ))}
              </div>
            </div>
          ) : section.products.length > 0 && (`;
          
content = content.replace(sectionRenderRegex, newSectionRender);

// 4. Render skeleton for categories
const categoryRenderRegex = /\{realtimeCategories\.filter.*?\.map\(\(category\) => \(/;
const newCategoryRender = `{loadingCategories ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-4 animate-pulse">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-slate-200 dark:bg-charcoal-800" />
                  <div className="h-4 w-20 bg-slate-200 dark:bg-charcoal-800 rounded" />
                </div>
              ))
            ) : realtimeCategories.filter(c => c.active !== false).sort((a,b) => (a.displayOrder||0) - (b.displayOrder||0)).map((category) => (`;
            
if (content.includes('realtimeCategories.filter(c => c.active !== false).sort((a,b) => (a.displayOrder||0) - (b.displayOrder||0)).map((category) => (')) {
  content = content.replace(
    'realtimeCategories.filter(c => c.active !== false).sort((a,b) => (a.displayOrder||0) - (b.displayOrder||0)).map((category) => (',
    newCategoryRender
  );
}

fs.writeFileSync(file, content);
console.log('Home.tsx patched with skeleton loaders.');
