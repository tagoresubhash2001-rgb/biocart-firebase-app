const fs = require('fs');
const path = require('path');

const homePath = path.resolve(__dirname, '..', 'src/pages/Home.tsx');
let home = fs.readFileSync(homePath, 'utf8');

// 1. Add import for CategoryCircularNav
if (!home.includes('CategoryCircularNav')) {
  home = home.replace(
    "import { matchesCategoryFilter, MASTER_CATEGORIES } from '../data/categoryCatalog';",
    "import { matchesCategoryFilter, MASTER_CATEGORIES } from '../data/categoryCatalog';\nimport { CategoryCircularNav } from '../components/ui/CategoryCircularNav';"
  );
}

// 2. Replace the categories track with CategoryCircularNav
const oldTrackStart = '{/* Horizontal non-wrapping scroller track with Circular Category Images & Underneath Text */}';
const oldTrackEnd = '{/* Multiple Premium Carousels - Product Showcases */}';

const startIndex = home.indexOf(oldTrackStart);
const endIndex = home.indexOf(oldTrackEnd);

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `{/* Horizontal non-wrapping scroller track with Shared CategoryCircularNav */}
        <div className="relative group/categoryTrack">
          <div ref={categoryScrollRef}>
            <CategoryCircularNav
              categories={(realtimeCategories.length > 0 ? realtimeCategories : MASTER_CATEGORIES).filter(c => c.active !== false && c.isFeatured !== false)}
              selectedCategory=""
              onSelectCategory={(catName) => {
                setSelectedCategory(catName);
                setTab('shop');
              }}
              showAllOption={false}
              idPrefix="home-cat"
              className="gap-6 sm:gap-8"
            />
          </div>
        </div>
      </section>

      `;

  home = home.substring(0, startIndex) + replacement + home.substring(endIndex);
  fs.writeFileSync(homePath, home, 'utf8');
  console.log('Successfully integrated CategoryCircularNav into Home.tsx');
} else {
  console.error('Could not locate section boundaries in Home.tsx');
}
