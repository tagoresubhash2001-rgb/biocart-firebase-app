import { CategoryItem } from '../types';

export interface MasterCategoryDef extends CategoryItem {
  aliases: string[];
  parentId: string | null;
}

export const MASTER_CATEGORIES: MasterCategoryDef[] = [
  // 1. Organic Fertilizers (Canonical Root)
  {
    id: 'cat-fert',
    name: 'Organic Fertilizers',
    slug: 'organic-fertilizers',
    aliases: ['Organic Fertilizers', 'organic-fertilizers', 'Fertilizers', 'cat-fert', 'cat-organic-fertilizers'],
    parentId: null,
    description: 'Vermicompost, neem cakes and nitrogen bio-stimulants for soil fertility and root strength.',
    image: '/assets/products/prod_vermicompost.png',
    displayOrder: 1,
    isFeatured: true,
    active: true
  },
  // 2. Coir & Potting Mix (Canonical Root)
  {
    id: 'cat-coir',
    name: 'Potting Mix',
    slug: 'potting-mix',
    aliases: ['Potting Mix', 'Coir & Potting Mix', 'coir-potting-mix', 'potting-mix', 'cat-coir', 'cat-coir-potting-mix', 'cat-pot'],
    parentId: null,
    description: 'Triple-washed low-EC coco peat, perlite and breathable coir pots for optimal root aeration.',
    image: '/assets/products/prod_coco_peat.png',
    displayOrder: 2,
    isFeatured: true,
    active: true
  },
  // 3. Plant Care (Canonical Root)
  {
    id: 'cat-care',
    name: 'Plant Care',
    slug: 'plant-care',
    aliases: ['Plant Care', 'Plant Care Solutions', 'plant-care-solutions', 'plant-care', 'cat-care', 'cat-plant-care-solutions'],
    parentId: null,
    description: 'Cold-pressed neem oil, botanical pest repellents & organic disease protection.',
    image: '/assets/products/prod_neem_oil.png',
    displayOrder: 3,
    isFeatured: true,
    active: true
  },
  // 4. Seeds (Canonical Root)
  {
    id: 'cat-seeds',
    name: 'Seeds',
    slug: 'seeds',
    aliases: ['Seeds', 'Organic Seeds', 'organic-seeds', 'seeds', 'cat-seeds', 'cat-organic-seeds'],
    parentId: null,
    description: 'Open-pollinated heirloom vegetable, herb, and flowering plant seeds.',
    image: '/assets/products/prod_veg_seeds.png',
    displayOrder: 4,
    isFeatured: true,
    active: true
  },
  // 5. Gardening Accessories (Canonical Root)
  {
    id: 'cat-acc',
    name: 'Gardening Accessories',
    slug: 'gardening-accessories',
    aliases: ['Gardening Accessories', 'Gardening Gear', 'gardening-gear', 'gardening-accessories', 'cat-acc', 'cat-gear', 'cat-gardening-gear'],
    parentId: null,
    description: 'Ergonomic stainless steel tools, jute grow bags, and precision garden sprayers.',
    image: '/assets/products/prod_hand_tools.png',
    displayOrder: 5,
    isFeatured: true,
    active: true
  },
  // 6. Healthy Living (Canonical Root)
  {
    id: 'cat-living',
    name: 'Healthy Living',
    slug: 'healthy-living',
    aliases: ['Healthy Living', 'healthy-living', 'cat-living', 'cat-life', 'cat-healthy-living'],
    parentId: null,
    description: 'Microgreen kits, herbal wellness products and urban sustainable living solutions.',
    image: '/assets/products/prod_herb_kit.png',
    displayOrder: 6,
    isFeatured: true,
    active: true
  },
  // 7. Microbial Inoculants & Bio-fertilizers (Specialized Subcategory)
  {
    id: 'cat-micro',
    name: 'Microbial Inoculants & Bio-fertilizers',
    slug: 'microbial-inoculants',
    aliases: ['Microbial Inoculants', 'Microbial Inoculants & Bio-fertilizers', 'Bio-fertilizers', 'microbial-inoculants', 'cat-micro'],
    parentId: 'cat-fert',
    description: 'Beneficial mycorrhizae, azotobacter and rhizobium inoculants that stimulate root symbiosis.',
    image: '/assets/products/prod_soil_mix.png',
    displayOrder: 7,
    isFeatured: true,
    active: true
  },
  // 8. Soil Conditioners & Amendments (Specialized Subcategory)
  {
    id: 'cat-soil',
    name: 'Soil Conditioners & Amendments',
    slug: 'soil-conditioners',
    aliases: ['Soil Conditioners', 'Soil Conditioners & Amendments', 'Soil Amendments', 'soil-conditioners', 'cat-soil'],
    parentId: 'cat-coir',
    description: 'Biochar, humic acid, gypsum and natural mineral powders to revitalize depleted garden soils.',
    image: '/assets/products/prod_bone_meal.png',
    displayOrder: 8,
    isFeatured: false,
    active: true
  },
  // 9. Pest & Disease Control (Specialized Subcategory)
  {
    id: 'cat-pest',
    name: 'Pest & Disease Control',
    slug: 'pest-disease-control',
    aliases: ['Pest & Disease Control', 'Pest Control', 'Bio-pesticides', 'pest-disease-control', 'cat-pest'],
    parentId: 'cat-care',
    description: 'Biological insecticides, fungal disease treatments and non-toxic sticky barrier traps.',
    image: '/assets/products/prod_pesticide.png',
    displayOrder: 9,
    isFeatured: false,
    active: true
  },
  // 10. Seed Treatment & Plant Boosters (Specialized Subcategory)
  {
    id: 'cat-boosters',
    name: 'Seed Treatment & Plant Boosters',
    slug: 'seed-treatment',
    aliases: ['Seed Treatment', 'Seed Treatment & Plant Boosters', 'Plant Boosters', 'seed-treatment', 'cat-boosters'],
    parentId: 'cat-seeds',
    description: 'Seed priming bio-solutions, seaweed kelp extract tonics and vegetative growth activators.',
    image: '/assets/products/prod_seaweed.png',
    displayOrder: 10,
    isFeatured: false,
    active: true
  }
];

/**
 * Checks whether a product matches a category filter, resolving aliases,
 * parent/child relationships, and exact slug/name matches.
 */
export function matchesCategoryFilter(
  productCategory: string,
  filterNameOrSlug: string,
  allCategories: CategoryItem[] = MASTER_CATEGORIES
): boolean {
  if (!filterNameOrSlug || filterNameOrSlug === 'All' || filterNameOrSlug.toLowerCase() === 'all') {
    return true;
  }

  const normFilter = filterNameOrSlug.trim().toLowerCase();
  const normProd = productCategory.trim().toLowerCase();

  // 1. Direct equality
  if (normProd === normFilter) {
    return true;
  }

  // 2. Find target category in catalog/categories
  const targetCat = allCategories.find(c => 
    c.name.toLowerCase() === normFilter || 
    c.slug.toLowerCase() === normFilter ||
    c.id.toLowerCase() === normFilter ||
    (c.aliases && c.aliases.some(a => a.toLowerCase() === normFilter))
  );

  if (!targetCat) {
    return false;
  }

  // 3. Match against target's direct names/slugs/aliases
  if (targetCat.name.toLowerCase() === normProd || targetCat.slug.toLowerCase() === normProd) {
    return true;
  }

  if (targetCat.aliases && targetCat.aliases.some(a => a.toLowerCase() === normProd)) {
    return true;
  }

  // 4. If product category matches a child/sub-category whose parent is targetCat
  const childCategories = allCategories.filter(c => c.parentId === targetCat.id);
  for (const child of childCategories) {
    if (child.name.toLowerCase() === normProd || child.slug.toLowerCase() === normProd) {
      return true;
    }
    if (child.aliases && child.aliases.some(a => a.toLowerCase() === normProd)) {
      return true;
    }
  }

  // 5. If filter is a child and product is in parent or vice versa
  if (targetCat.parentId) {
    const parent = allCategories.find(c => c.id === targetCat.parentId);
    if (parent && (parent.name.toLowerCase() === normProd || (parent.aliases && parent.aliases.some(a => a.toLowerCase() === normProd)))) {
      return true;
    }
  }

  return false;
}
