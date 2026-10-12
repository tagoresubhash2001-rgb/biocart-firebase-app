import React from 'react';

export const ProductCardSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col bg-white dark:bg-charcoal-900 border border-slate-150 dark:border-white/5 rounded-3xl hover:-translate-y-1.5 hover:shadow-xl hover:shadow-nature-900/10 transition-all duration-300 ease-[cubic-bezier(0.215,0.61,0.355,1)] overflow-hidden h-full shadow-sm animate-pulse">
      {/* Product Image Skeleton */}
      <div className="relative aspect-square w-full bg-slate-200 dark:bg-charcoal-800">
        <div className="absolute top-2.5 left-2.5 w-16 h-5 rounded-full bg-slate-300 dark:bg-charcoal-700" />
        <div className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-slate-300 dark:bg-charcoal-700" />
      </div>

      {/* Product Details Skeleton */}
      <div className="p-4 flex flex-col flex-grow justify-between space-y-4">
        <div className="space-y-2">
          {/* Category */}
          <div className="h-3 w-1/3 bg-slate-200 dark:bg-charcoal-800 rounded-md" />
          {/* Title */}
          <div className="h-4.5 w-3/4 bg-slate-300 dark:bg-charcoal-750 rounded-md" />
          {/* Rating */}
          <div className="flex gap-1 pt-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-3.5 h-3.5 rounded-full bg-slate-200 dark:bg-charcoal-800" />
            ))}
          </div>
        </div>

        {/* Price & Action button */}
        <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-4">
          <div className="space-y-1.5 w-1/3">
            <div className="h-3.5 w-full bg-slate-300 dark:bg-charcoal-750 rounded-md" />
            <div className="h-3 w-2/3 bg-slate-200 dark:bg-charcoal-800 rounded-md" />
          </div>
          <div className="h-9 w-20 bg-slate-300 dark:bg-charcoal-700 rounded-xl" />
        </div>
      </div>
    </div>
  );
};
