import React from 'react';
import { motion } from 'motion/react';
import { CategoryItem } from '../../types';

export interface CategoryCircularNavProps {
  categories: CategoryItem[];
  selectedCategory?: string;
  onSelectCategory: (categoryName: string) => void;
  showAllOption?: boolean;
  className?: string;
  idPrefix?: string;
}

/**
 * BioCart Standard Shared Circular Category Navigation Component.
 * Ensures 100% visual and functional consistency across Homepage and Shop Catalog.
 * 
 * Features:
 * - Circular image container with smooth elevation and theme-conscious borders.
 * - Category name placed directly underneath in readable typography.
 * - Active category indicator ring (emerald-600) with gentle scale.
 * - Non-wrapping horizontal scroller with smooth touch/mouse support.
 */
export const CategoryCircularNav: React.FC<CategoryCircularNavProps> = ({
  categories,
  selectedCategory = 'All',
  onSelectCategory,
  showAllOption = true,
  className = '',
  idPrefix = 'cat-nav'
}) => {
  const displayCategories = React.useMemo(() => {
    const list: Array<{ name: string; image: string; id?: string }> = [];
    
    if (showAllOption) {
      list.push({
        id: 'all',
        name: 'All',
        image: 'https://images.unsplash.com/photo-1592150621744-aca64f48394a?auto=format&fit=crop&w=300&h=300&q=80'
      });
    }

    categories
      .filter(c => c.active !== false)
      .forEach(c => {
        list.push({
          id: c.id,
          name: c.name,
          image: c.image || '/assets/products/prod_coco_peat.png'
        });
      });

    return list;
  }, [categories, showAllOption]);

  return (
    <div 
      className={`flex flex-row flex-nowrap overflow-x-auto scroll-smooth gap-5 sm:gap-7 pb-4 pt-2 px-1 touch-pan-x [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden items-start snap-x snap-mandatory ${className}`}
      id={`${idPrefix}-track`}
      role="region"
      aria-label="Product categories navigation"
    >
      {displayCategories.map((cat, idx) => {
        const isActive = (selectedCategory || '').trim().toLowerCase() === cat.name.trim().toLowerCase();
        const safeSlug = cat.name.replace(/\s+/g, '-').toLowerCase();

        return (
          <motion.button
            key={cat.id || cat.name}
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: idx * 0.02 }}
            onClick={() => onSelectCategory(cat.name)}
            className="flex flex-col items-center gap-2.5 shrink-0 group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-2xl p-1 bg-transparent border-0"
            id={`${idPrefix}-item-${safeSlug}`}
            aria-label={`Select ${cat.name} category`}
            aria-pressed={isActive}
          >
            {/* Circular Image Container */}
            <div 
              className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-emerald-50/80 dark:bg-charcoal-800 border-2 transition-all duration-300 shadow-sm flex items-center justify-center relative ${
                isActive 
                  ? 'border-emerald-600 ring-4 ring-emerald-100 dark:ring-emerald-950/40 scale-105 shadow-md shadow-emerald-600/10' 
                  : 'border-slate-200 dark:border-white/10 group-hover:border-emerald-500 group-hover:scale-105'
              }`}
            >
              <img 
                src={cat.image} 
                alt={cat.name}
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/assets/products/prod_soil_mix.png';
                }}
                className={`w-full h-full object-cover object-center transition-all duration-500 group-hover:scale-110 ${
                  isActive ? 'brightness-100' : 'brightness-95 group-hover:brightness-100'
                }`} 
              />
              {isActive && (
                <div className="absolute inset-0 bg-emerald-900/10 dark:bg-[#FDFBD4]/15 pointer-events-none" />
              )}
            </div>

            {/* Category Name directly underneath image */}
            <span 
              className={`text-xs sm:text-sm font-semibold tracking-tight text-center max-w-[90px] sm:max-w-[110px] line-clamp-2 leading-tight transition-colors ${
                isActive 
                  ? 'text-emerald-700 dark:text-emerald-400 font-bold scale-105' 
                  : 'text-charcoal-700 dark:text-slate-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
              }`}
            >
              {cat.name}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
};
