import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';

import { ProductCard } from '../components/ui/ProductCard';
import { ProductCardSkeleton } from '../components/ui/ProductCardSkeleton';
import { Product, CategoryItem } from '../types';
import { usePageCMS } from '../hooks/usePageCMS';
import { AdminService } from '../services/AdminService';
import { SEED_PRODUCTS } from '../data/seedData';
import { matchesCategoryFilter, MASTER_CATEGORIES } from '../data/categoryCatalog';
import { CategoryCircularNav } from '../components/ui/CategoryCircularNav';
import { 
  Search, SlidersHorizontal, Grid3X3, Grid2X2, ArrowUpDown, 
  AlertCircle
} from 'lucide-react';
import { isProductSellable } from '../utils/productAvailability';


export const Shop: React.FC = () => {
  const [realtimeReviews, setRealtimeReviews] = React.useState<any[]>([]);
  React.useEffect(() => {
    const unsub = AdminService.subscribeToReviews((list) => setRealtimeReviews(list));
    return () => unsub();
  }, []);

  const { 
    addToCart, 
    setActiveProductDetails, 
    wishlist, 
    toggleWishlist, 
    addToast,
    setCartOpen,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    setTab
  } = useApp();

  const [sortBy, setSortBy] = useState<string>('default');
  const [colsLayout, setColsLayout] = useState<2 | 3 | 4>(4);
  
  const { cmsData } = usePageCMS('shop-catalog');

  // Firestore Real-Time State
  const [realtimeProducts, setRealtimeProducts] = useState<Product[]>([]);
  
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [realtimeCategories, setRealtimeCategories] = useState<CategoryItem[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const isLoading = loadingProducts || loadingCategories;

  useEffect(() => {
    
    const unsubProd = AdminService.subscribeToProducts(
      (list) => {
        setRealtimeProducts(list);
        setLoadingProducts(false);
      },
      (err) => {
        console.error('Shop products subscription error:', err);
        setLoadingProducts(false);
      }
    );
    const unsubCat = AdminService.subscribeToCategories(
      (list) => {
        setRealtimeCategories(list);
        setLoadingCategories(false);
      },
      (err) => {
        console.error('Shop categories subscription error:', err);
        setLoadingCategories(false);
      }
    );
    return () => {
      unsubProd();
      unsubCat();
    };
  }, []);

  // Trigger loading state for smooth skeleton layout shift prevention
  useEffect(() => {
    
    const timer = setTimeout(() => {
      
    }, 450);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory, sortBy]);

  const categoriesList = useMemo(() => {
    const defaultList = [
      {
        name: 'All',
        image: 'https://images.unsplash.com/photo-1592150621744-aca64f48394a?auto=format&fit=crop&w=300&h=300&q=80'
      }
    ];
    const sourceCats = realtimeCategories.length > 0 ? realtimeCategories : MASTER_CATEGORIES;
    const activeCats = sourceCats.filter(c => c.active !== false).map(c => ({
      name: c.name,
      image: c.image || '/assets/products/prod_coco_peat.png'
    }));
    return [...defaultList, ...activeCats];
  }, [realtimeCategories]);

  const allProducts = realtimeProducts.filter(p => isProductSellable(p) && p.shopVisible !== false);


  const filteredProducts = useMemo(() => {
    let result = [...allProducts];

    // Filter by category
    if (selectedCategory !== 'All') {
      result = result.filter(p => matchesCategoryFilter(p.category, selectedCategory, realtimeCategories));
    }

    // Filter by search query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortBy === 'price-low') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      result.sort((a, b) => b.rating - a.rating);
    }

    return result;
  }, [allProducts, selectedCategory, searchQuery, sortBy]);


  return (
    <div className="space-y-16 pb-24 animate-fade-in" id="shop-page">
      {/* Cinematic Shop Hero Section */}
      <section className="relative min-h-[50vh] flex items-center justify-center pt-36 pb-20 px-6 overflow-hidden text-center" id="shop-hero-banner">
        {/* Cinematic background image */}
        <div className="absolute inset-0 z-0">
          <motion.div
            initial={{ scale: 1.15, opacity: 0 }}
            animate={{ scale: 1.05, opacity: 1 }}
            transition={{ duration: 2.5, ease: 'easeOut' }}
            className="w-full h-full"
          >
            <img 
              src="https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=1920&q=80" 
              alt="Premium BioCart product showcase" 
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </motion.div>
          {/* High-end gradient overlays */}
          <div className="absolute inset-0 bg-black/60 dark:bg-charcoal-950/90 z-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 z-10" />
        </div>

        <div className="max-w-4xl mx-auto space-y-4 relative z-20">
          <motion.span 
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 0.85, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-400"
          >
            The BioCart Registry
          </motion.span>
          <motion.h1 
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="font-serif font-bold text-4xl md:text-6xl text-white leading-[1.15] tracking-tight"
          >
            Sustainable <br />
            <span className="gradient-text-green font-sans font-extrabold italic drop-shadow-[0_2px_15px_rgba(34,197,94,0.3)]">Biodegradable Materials</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 0.9, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-sm md:text-lg text-slate-200 max-w-xl mx-auto leading-relaxed tracking-wide"
          >
            {cmsData?.heroSubtitle ? cmsData.heroSubtitle : 'Browse our professionally curated collection of organic-certified gardening materials and plastic-free plant supplies.'}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="pt-4"
          >
            <button
              onClick={() => {
                const element = document.getElementById('circular-categories-section');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full text-xs font-bold transition-all hover:scale-105 cursor-pointer shadow-lg shadow-emerald-600/20"
            >
              Start Exploring Products
            </button>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
          <div className="w-5 h-8 border border-white/30 rounded-full flex justify-center p-1">
            <div className="w-1 h-1.5 bg-emerald-400 rounded-full animate-bounce" />
          </div>
        </div>
      </section>

      {/* Premium Circular Category Cards (Shared Component) */}
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

      {/* Filters and Search - container */}
      <section className="max-w-7xl mx-auto px-6" id="filters-section">
        <div className="bg-[#FDFBD4] dark:bg-charcoal-900/45 border border-slate-150 dark:border-white/5 rounded-3xl p-4 md:p-6 grid grid-cols-1 md:grid-cols-12 gap-16px items-center" id="filters-container">
            {/* Search Input */}
            <div className="relative md:col-span-8 lg:col-span-9" id="search-bar">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-charcoal-400" />
              <input
                type="text"
                placeholder="Search premium coir products, compost, seeds, etc..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-charcoal-950 border border-slate-200 dark:border-white/10 rounded-2xl hover:-translate-y-1.5 hover:shadow-xl hover:shadow-nature-900/10 transition-all duration-300 ease-[cubic-bezier(0.215,0.61,0.355,1)] focus:border-nature-600 focus:outline-none text-xs text-charcoal-950 dark:text-white"
              />
            </div>

            {/* Sorting Dropdown */}
            <div className="relative md:col-span-4 lg:col-span-3" id="sort-selector">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-3.5 bg-white dark:bg-charcoal-950 border border-slate-200 dark:border-white/10 rounded-2xl hover:-translate-y-1.5 hover:shadow-xl hover:shadow-nature-900/10 transition-all duration-300 ease-[cubic-bezier(0.215,0.61,0.355,1)] focus:border-nature-600 focus:outline-none text-xs text-charcoal-600 dark:text-slate-300 appearance-none font-bold cursor-pointer"
              >
                <option value="default">Sort: Default</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Rating: Highest First</option>
              </select>
              <ArrowUpDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400 pointer-events-none" />
            </div>
        </div>
      </section>

      {/* Product Grid Area */}
      <section className="max-w-7xl mx-auto px-6 space-y-8" id="product-grid-section">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
          <span className="text-xs font-bold text-charcoal-500">
            Showing {filteredProducts.length} premium results
          </span>

          {/* Grid Layout Toggles */}
          <div className="hidden sm:flex items-center gap-2" id="grid-toggle">
            <button
              onClick={() => setColsLayout(2)}
              className={`p-2 rounded-lg border cursor-pointer ${colsLayout === 2 ? 'border-nature-600 text-nature-700 bg-nature-50' : 'border-slate-100 text-charcoal-400'}`}
              title="2 Columns Layout"
            >
              <Grid2X2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setColsLayout(4)}
              className={`p-2 rounded-lg border cursor-pointer ${colsLayout === 4 ? 'border-nature-600 text-nature-700 bg-nature-50' : 'border-slate-100 text-charcoal-400'}`}
              title="4 Columns Layout"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Empty State / Loading Skeletons */}
        {isLoading ? (
          <div 
            className={`grid gap-24px ${
              colsLayout === 2 
                ? 'grid-cols-1 sm:grid-cols-2' 
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
            }`} 
            id="products-skeleton-container"
          >
            {[...Array(colsLayout === 2 ? 6 : 8)].map((_, idx) => (
              <ProductCardSkeleton key={idx} />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-[#FDFBD4]/50 dark:bg-charcoal-800/10 border border-dashed border-slate-200 dark:border-white/5 rounded-3xl space-y-4 max-w-lg mx-auto" id="empty-results">
            <AlertCircle className="w-12 h-12 text-charcoal-400 mx-auto" />
            <div className="space-y-1">
              <h3 className="font-display font-bold text-base text-nature-900 dark:text-nature-400">
                No Sustainable Elements Found
              </h3>
              <p className="text-xs text-charcoal-500 leading-relaxed max-w-sm mx-auto">
                No coir materials match "{searchQuery}" under the category "{selectedCategory}". Refine your parameters and search once more.
              </p>
            </div>
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
              className="px-4 py-2 bg-nature-700 hover:bg-nature-800 text-white rounded-full text-xs font-semibold shadow-sm cursor-pointer hover:scale-105 active:scale-95 transition-all duration-300 ease-out shadow-md hover:shadow-nature-700/30"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          /* Actual Grid */
          <div 
            className={`grid gap-24px ${
              colsLayout === 2 
                ? 'grid-cols-1 sm:grid-cols-2' 
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
            }`} 
            id="products-grid-container"
          >
            {filteredProducts.map((p, idx) => (
              <ProductCard
                key={p.id}
                product={p}
                isWishlisted={wishlist.includes(p.id)}
                onToggleWishlist={toggleWishlist}
                onQuickView={(prod) => {
                  setActiveProductDetails(prod);
                  setTab('product-details');
                }}
                onAddToCart={(prod) => addToCart(prod, 1)}
                onBuyNow={(prod) => {
                  addToCart(prod, 1);
                  setCartOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </section>
﻿      {/* Dynamic Approved Reviews Section */}
      

    
      {/* Dynamic Approved Reviews Section */}
      {realtimeReviews.filter(r => r.status === 'published' || r.active !== false).length > 0 && (
        <section className="py-20 px-6 bg-white border-t border-slate-200">
          <div className="max-w-7xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <h2 className="font-serif text-3xl md:text-5xl font-bold text-slate-900">Customer Reviews</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {realtimeReviews.filter(r => r.status === 'published' || r.active !== false).slice(0, 3).map(review => (
                <div key={review.id} className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-1 mb-4">
                    {Array.from({ length: review.rating || 5 }).map((_, i) => (
                      <span key={i} className="text-amber-400">★</span>
                    ))}
                  </div>
                  <p className="text-slate-700 italic mb-6">"{review.comment}"</p>
                  <p className="text-sm font-bold text-slate-900">- {review.reviewerName}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

    </div>
  );
};

