const fs = require('fs');
const path = require('path');

const shopPath = path.resolve(__dirname, '..', 'src/pages/Shop.tsx');
let shop = fs.readFileSync(shopPath, 'utf8');

// 1. Add import for CategoryCircularNav
if (!shop.includes('CategoryCircularNav')) {
  shop = shop.replace(
    "import { matchesCategoryFilter, MASTER_CATEGORIES } from '../data/categoryCatalog';",
    "import { matchesCategoryFilter, MASTER_CATEGORIES } from '../data/categoryCatalog';\nimport { CategoryCircularNav } from '../components/ui/CategoryCircularNav';"
  );
}

// 2. Replace the circular categories section with the shared component
const oldSectionStart = '{/* Premium Circular Category Cards (inspired by OrganicBazar) */}';
const oldSectionEnd = '{/* Filters and Search - container */}';

const startIndex = shop.indexOf(oldSectionStart);
const endIndex = shop.indexOf(oldSectionEnd);

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `{/* Premium Circular Category Cards (Shared Component) */}
      <section className="max-w-7xl mx-auto px-6 pt-6" id="circular-categories-section">
        <div className="flex flex-col items-center space-y-4">
          <div className="text-center space-y-1">
            <h2 className="font-serif font-bold text-2xl text-nature-900 dark:text-nature-400">
              Explore Our Curated Catalogs
            </h2>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Select a category to filter organic products
            </p>
          </div>
          <div className="w-full flex justify-center py-2" id="circular-categories-scroll">
            <CategoryCircularNav
              categories={realtimeCategories.length > 0 ? realtimeCategories : MASTER_CATEGORIES}
              selectedCategory={selectedCategory}
              onSelectCategory={(catName) => setSelectedCategory(catName)}
              showAllOption={true}
              idPrefix="shop-cat"
              className="justify-start md:justify-center"
            />
          </div>
        </div>
      </section>

      `;

  shop = shop.substring(0, startIndex) + replacement + shop.substring(endIndex);
  fs.writeFileSync(shopPath, shop, 'utf8');
  console.log('Successfully integrated CategoryCircularNav into Shop.tsx');
} else {
  console.error('Could not locate section boundaries in Shop.tsx');
}
