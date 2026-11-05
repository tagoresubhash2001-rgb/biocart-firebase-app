import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { 
  Heart, Star, ShoppingBag, Leaf, 
  Ruler, Sparkles, BookOpen, MessageSquare, 
  HelpCircle, AlertCircle, Truck, Package, ShieldCheck, CheckSquare, Square,
  ChevronDown, ChevronLeft, ChevronRight, X, Maximize2, ZoomIn, ZoomOut, RotateCcw,
  Store, ShieldAlert, ArrowRight
} from 'lucide-react';
import { AdminService } from '../../services/AdminService';
import { Product } from '../../types';
import { ProductCard } from './ProductCard';

export const ProductDetails: React.FC = () => {
  const {
    activeProductDetails,
    setActiveProductDetails,
    addToCart,
    toggleWishlist,
    wishlist,
    setCartOpen,
    addToast,
    setTab
  } = useApp();

  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'usage' | 'specs' | 'shipping' | 'reviews' | 'faqs'>('overview');
  
  // Interactive zoom on hover
  const [isHoverZoomed, setIsHoverZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0 });

  // Lightbox Modal state
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxScale, setLightboxScale] = useState(1);

  // Accordion and Realtime Catalog
  const [expandedFaqIdx, setExpandedFaqIdx] = useState<number | null>(null);
  const [realtimeProducts, setRealtimeProducts] = useState<Product[]>([]);

  // Pincode delivery estimation simulation
  const [pincode, setPincode] = useState('');
  const [deliveryEstimated, setDeliveryEstimated] = useState<string | null>(null);

  React.useEffect(() => {
    const unsub = AdminService.subscribeToProducts((list) => {
      if (list && list.length > 0) {
        setRealtimeProducts(list);
      } else if (import.meta.env.VITE_USE_SEED_FALLBACK === 'true') {
        // Fallback to canonical seed catalog only when explicitly configured
        import('../../data/seedData').then(m => {
          setRealtimeProducts(m.SEED_PRODUCTS || []);
        });
      } else {
        setRealtimeProducts([]);
      }
    });
    return () => unsub();
  }, []);

  // Reset local state when active product changes
  useEffect(() => {
    if (activeProductDetails) {
      setActiveImageIdx(0);
      setQuantity(1);
      setSelectedVariant(activeProductDetails.weightVariants?.[0] || '');
      setActiveTab('overview');
      setIsHoverZoomed(false);
      setIsLightboxOpen(false);
      setLightboxScale(1);
      setExpandedFaqIdx(null);
      setDeliveryEstimated(null);
    }
  }, [activeProductDetails]);

  // Gallery image array normalized
  const product = activeProductDetails;
  const isWishlisted = product ? wishlist.includes(product.id) : false;

  const galleryImages: string[] = React.useMemo(() => {
    if (!product) return [];
    if (Array.isArray(product.images) && product.images.length > 0) {
      return product.images.filter(Boolean);
    }
    return product.image ? [product.image] : ['/assets/products/prod_vermicompost.png'];
  }, [product]);

  // Lightbox keyboard controls: Escape to close, Left/Right arrows to navigate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLightboxOpen) return;
      if (e.key === 'Escape') {
        setIsLightboxOpen(false);
      } else if (e.key === 'ArrowRight') {
        setActiveImageIdx((prev) => (prev + 1) % galleryImages.length);
      } else if (e.key === 'ArrowLeft') {
        setActiveImageIdx((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, galleryImages.length]);

  // Bundle items checkbox state
  const [bundleChecked, setBundleChecked] = useState<boolean[]>([true, true, true]);
  useEffect(() => {
    setBundleChecked([true, true, true]);
  }, [activeProductDetails]);

  if (!activeProductDetails) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <Package className="w-16 h-16 text-slate-300 dark:text-charcoal-700" />
        <h2 className="text-2xl font-display font-bold text-nature-900 dark:text-nature-400">Product Not Found</h2>
        <button onClick={() => setTab('shop')} className="px-8 py-3 bg-nature-700 hover:bg-nature-800 text-white rounded-full font-bold transition-all hover:scale-105 cursor-pointer">
          Return to Shop
        </button>
      </div>
    );
  }

  const safeProduct: Product = activeProductDetails;

  // Related products from canonical catalog with smart fallback
  const relatedProducts = React.useMemo(() => {
    if (!safeProduct) return [];
    
    // 1. Same-category active products (excluding current product)
    const sameCategory = realtimeProducts.filter(
      (p) => p.category === product.category && p.id !== product.id && p.active !== false
    );

    if (sameCategory.length >= 4) {
      return sameCategory.slice(0, 4);
    }

    // 2. If fewer than 4 in same category, supplement with active products from related categories
    const needed = 4 - sameCategory.length;
    const sameCatIds = new Set(sameCategory.map((p) => p.id));
    sameCatIds.add(product.id);

    const relatedFallback = realtimeProducts.filter(
      (p) => !sameCatIds.has(p.id) && p.active !== false
    );

    return [...sameCategory, ...relatedFallback.slice(0, needed)];
  }, [realtimeProducts, product]);

  // Frequently Bought Together bundle recommendations
  const getFrequentlyBoughtTogetherProducts = (current: Product): Product[] => {
    const name = current.name.toLowerCase();
    const cat = current.category.toLowerCase();
    let candidates: Product[] = [];
    
    if (name.includes('seed') || cat.includes('seeds')) {
      candidates = realtimeProducts.filter(p => 
        p.id !== current.id && p.active !== false &&
        (p.category.toLowerCase().includes('potting') || 
         p.category.toLowerCase().includes('fertilizers') || 
         p.category.toLowerCase().includes('accessories'))
      );
    } else if (name.includes('compost') || cat.includes('fertilizers')) {
      candidates = realtimeProducts.filter(p => 
        p.id !== current.id && p.active !== false &&
        (p.category.toLowerCase().includes('accessories') || 
         p.category.toLowerCase().includes('potting') || 
         p.name.toLowerCase().includes('neem'))
      );
    } else if (name.includes('cocopeat') || name.includes('peat') || cat.includes('potting')) {
      candidates = realtimeProducts.filter(p => 
        p.id !== current.id && p.active !== false &&
        (p.category.toLowerCase().includes('fertilizers') || 
         p.category.toLowerCase().includes('seeds') || 
         p.category.toLowerCase().includes('accessories'))
      );
    } else if (name.includes('neem') || cat.includes('care')) {
      candidates = realtimeProducts.filter(p => 
        p.id !== current.id && p.active !== false &&
        (p.category.toLowerCase().includes('fertilizers') || 
         p.category.toLowerCase().includes('accessories'))
      );
    } else {
      candidates = realtimeProducts.filter(p => p.id !== current.id && p.category !== current.category && p.active !== false);
    }
    return candidates.slice(0, 2);
  };

  const fbtProducts = getFrequentlyBoughtTogetherProducts(product);
  const bundleItems = [product, ...fbtProducts];
  const activeBundleProducts = bundleItems.filter((_, idx) => bundleChecked[idx]);
  const bundleTotalPrice = activeBundleProducts.reduce((sum, item) => sum + item.price, 0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomPos({ x, y });
  };

  const handleAddToCart = () => {
    const productWithVariant = {
      ...product,
      name: selectedVariant ? `${product.name} (${selectedVariant})` : product.name
    };
    addToCart(productWithVariant, quantity);
    setQuantity(1);
    addToast(`Added ${quantity} item(s) to your cart`, 'success');
  };

  const handleBuyNow = () => {
    handleAddToCart();
    setCartOpen(true);
  };

  const handleAddBundleToCart = () => {
    if (activeBundleProducts.length === 0) return;
    activeBundleProducts.forEach((item) => {
      addToCart(item, 1);
    });
    addToast(`Successfully added the curated bundle (${activeBundleProducts.length} items) to your cart!`, 'success');
    setCartOpen(true);
  };

  const handleCheckPincode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(pincode.trim())) {
      addToast('Please enter a valid 6-digit Indian PIN code', 'warning');
      return;
    }
    // Realistic estimated standard shipping: 3-4 days based on actual warehouse
    const deliveryDays = 3;
    const date = new Date();
    date.setDate(date.getDate() + deliveryDays);
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
    setDeliveryEstimated(`Standard delivery by ${date.toLocaleDateString('en-IN', options)}`);
  };

  const currentMainImage = galleryImages[activeImageIdx] || product.image || '/assets/products/prod_vermicompost.png';

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-12 sm:pt-32 sm:pb-16 space-y-12" id="product-details-container">
      
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center justify-between text-xs font-semibold text-slate-500 pb-2 border-b border-slate-100 dark:border-white/5">
        <div className="flex items-center gap-2">
          <button onClick={() => setTab('home')} className="hover:text-emerald-600 transition-colors cursor-pointer">Home</button>
          <span>/</span>
          <button onClick={() => setTab('shop')} className="hover:text-emerald-600 transition-colors cursor-pointer">Shop</button>
          <span>/</span>
          <span className="text-nature-700 dark:text-nature-400 font-bold">{product.category}</span>
        </div>
        <button 
          onClick={() => setTab('shop')} 
          className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
        >
          ← Back to Catalog
        </button>
      </nav>

      {/* Main 2-Column Responsive Product Purchase Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start" id="product-main-view">
        
        {/* LEFT COLUMN: Gallery, Thumbnails, Zoom & Lightbox Trigger (5 Cols on Desktop) */}
        <div className="lg:col-span-5 space-y-4" id="gallery-column">
          
          {/* Main Showcase Image Container */}
          <div className="relative">
            <div 
              className="relative aspect-square max-h-[460px] w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-50 dark:bg-charcoal-800/40 border border-slate-200/80 dark:border-white/5 flex items-center justify-center cursor-zoom-in group shadow-inner"
              onMouseMove={handleMouseMove}
              onMouseEnter={() => setIsHoverZoomed(true)}
              onMouseLeave={() => setIsHoverZoomed(false)}
              onClick={() => setIsLightboxOpen(true)}
              title="Click to view fullscreen lightbox"
              id="gallery-zoom-viewport"
            >
              <img
                src={currentMainImage}
                alt={`${product.name} - View ${activeImageIdx + 1}`}
                referrerPolicy="no-referrer"
                className={`w-full h-full object-contain p-4 sm:p-6 transition-transform duration-100 ${
                  isHoverZoomed ? 'scale-[2.0]' : 'scale-100'
                }`}
                style={
                  isHoverZoomed 
                    ? { transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` } 
                    : undefined
                }
                id="active-gallery-image"
              />
              
              {/* Floating Badge */}
              <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex flex-col gap-1.5 pointer-events-none z-10">
                {product.badge && (
                  <span className="bg-amber-500/95 text-white text-[9px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                    {product.badge}
                  </span>
                )}
              </div>

              {/* Counter Pill */}
              <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-mono font-bold px-2.5 py-1 rounded-full pointer-events-none z-10">
                {activeImageIdx + 1} / {galleryImages.length}
              </div>

              {/* Prev / Next controls on hover */}
              {galleryImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImageIdx((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 dark:bg-charcoal-900/90 text-charcoal-800 dark:text-white shadow-md hover:bg-white transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImageIdx((prev) => (prev + 1) % galleryImages.length);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 dark:bg-charcoal-900/90 text-charcoal-800 dark:text-white shadow-md hover:bg-white transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {/* Hover / Click indicator */}
              <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 bg-black/60 backdrop-blur-md text-white text-[10px] font-semibold px-2.5 py-1.5 rounded-xl pointer-events-none tracking-wide flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Click to Expand</span>
              </div>
            </div>
          </div>

          {/* Thumbnails Row below main image */}
          {galleryImages.length > 1 && (
            <div className="flex gap-2.5 sm:gap-3 overflow-x-auto py-1 scrollbar-none snap-x" id="gallery-thumbnails">
              {galleryImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIdx(idx)}
                  className={`relative w-16 sm:w-20 aspect-square rounded-xl sm:rounded-2xl overflow-hidden flex-shrink-0 border-2 transition-all cursor-pointer bg-slate-50 dark:bg-charcoal-800/40 p-1 snap-start ${
                    activeImageIdx === idx 
                      ? 'border-emerald-600 ring-2 ring-emerald-500/20 scale-95 shadow-md' 
                      : 'border-slate-200 dark:border-white/10 opacity-70 hover:opacity-100'
                  }`}
                  aria-label={`View product image ${idx + 1}`}
                >
                  <img src={img} alt="" referrerPolicy="no-referrer" className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          )}

          {/* Organic Verification Guarantee */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/60 dark:border-emerald-900/30 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div className="text-[11px] leading-tight">
              <span className="font-bold text-emerald-900 dark:text-emerald-300 block">100% Eco-Authentic Product</span>
              <span className="text-emerald-700/80 dark:text-emerald-400/80">Dispatched directly from licensed organic facilities.</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Product Information, Vendor, Logistics & Purchase Actions (7 Cols on Desktop) */}
        <div className="lg:col-span-7 flex flex-col space-y-6" id="product-info-column">
          
          {/* Header & Title */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-0.5 rounded-full">
                {product.category}
              </span>
              <span className="text-[11px] font-mono text-slate-400">SKU: {product.sku}</span>
            </div>
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-nature-900 dark:text-nature-400 tracking-tight leading-snug">
              {product.name}
            </h1>
          </div>

          {/* Ratings, Reviews and Stock Status Bar */}
          <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-2 text-xs" id="rating-row">
            <div className="flex items-center text-amber-500 gap-1 bg-amber-50 dark:bg-amber-950/20 px-2.5 py-1 rounded-lg">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span className="font-bold">{product.rating}</span>
            </div>
            <span className="text-slate-300 dark:text-charcoal-800">|</span>
            <span className="text-charcoal-500 dark:text-slate-400 font-medium">
              {product.reviewsCount} Customer Reviews
            </span>
            <span className="text-slate-300 dark:text-charcoal-800">|</span>
            
            {/* Stock Status Indicator */}
            <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full px-2.5 py-1 uppercase text-[10px] tracking-wider ${
              product.stockStatus === 'In Stock'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                : product.stockStatus === 'Low Stock'
                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                product.stockStatus === 'In Stock'
                  ? 'bg-emerald-500 animate-pulse'
                  : product.stockStatus === 'Low Stock'
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-rose-500'
              }`} />
              {product.stockStatus}
            </span>
          </div>

          {/* Pricing Box */}
          <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-charcoal-800/30 border border-slate-100 dark:border-white/5 space-y-1">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl sm:text-4xl font-display font-extrabold text-charcoal-950 dark:text-white">
                ₹{product.price}
              </span>
              {product.mrp && product.mrp > product.price && (
                <span className="text-base sm:text-lg text-slate-400 line-through font-medium">
                  ₹{product.mrp}
                </span>
              )}
              {product.discount ? (
                <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-lg">
                  {product.discount}% OFF
                </span>
              ) : null}
            </div>
            <p className="text-[11px] text-slate-500">
              Inclusive of all taxes. Free shipping on orders of ₹1,499 and above.
            </p>
          </div>

          {/* Pack / Weight Variants */}
          {product.weightVariants && product.weightVariants.length > 0 && (
            <div className="space-y-2 border-t border-slate-150 dark:border-white/5 pt-4" id="variants-container">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold uppercase tracking-wider text-slate-400">Available Pack Size:</span>
                <span className="font-semibold text-nature-700 dark:text-nature-400">{selectedVariant}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {product.weightVariants.map((variant) => (
                  <button
                    key={variant}
                    onClick={() => setSelectedVariant(variant)}
                    className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                      selectedVariant === variant
                        ? 'bg-[#004643] border-[#004643] text-white shadow-sm font-bold scale-95 !text-white'
                        : 'bg-white dark:bg-charcoal-800 border-slate-200 dark:border-white/5 text-charcoal-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <span className={selectedVariant === variant ? '!text-white' : ''}>{variant}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action Purchase Block */}
          <div className="space-y-3 pt-2" id="purchase-actions-box">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Quantity Selector */}
              <div className="flex items-center justify-between border border-slate-200 dark:border-white/10 rounded-xl bg-slate-50 dark:bg-charcoal-900 p-1 w-full sm:w-auto">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 flex items-center justify-center text-charcoal-600 dark:text-white rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer font-bold text-base"
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <span className="w-12 text-center text-sm font-semibold text-charcoal-900 dark:text-white font-mono">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 flex items-center justify-center text-charcoal-600 dark:text-white rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer font-bold text-base"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>

              {/* Add to Cart */}
              <button
                onClick={handleAddToCart}
                className="flex-grow flex items-center justify-center gap-2 py-3.5 px-6 bg-slate-100 hover:bg-slate-200 border border-slate-200 dark:bg-charcoal-800 dark:hover:bg-charcoal-700 text-charcoal-950 dark:text-white rounded-xl font-bold shadow-sm transition-all cursor-pointer hover:shadow-md active:scale-95"
                id="details-add-to-cart-cta"
              >
                <ShoppingBag className="w-4.5 h-4.5" />
                <span>Add to Cart • ₹{product.price * quantity}</span>
              </button>

              {/* Buy Now Direct Button */}
              <button
                onClick={handleBuyNow}
                className="py-3.5 px-6 bg-[#004643] hover:bg-[#003532] text-white rounded-xl font-bold shadow-md transition-all cursor-pointer hover:shadow-lg active:scale-95 !text-white"
                id="details-buy-now-cta"
              >
                <span className="!text-white">Buy Now</span>
              </button>

              {/* Wishlist Button */}
              <button
                onClick={() => toggleWishlist(product.id)}
                className={`p-3.5 rounded-xl border transition-colors cursor-pointer flex items-center justify-center ${
                  isWishlisted
                    ? 'bg-rose-50 border-rose-200 text-rose-500 dark:bg-rose-950/20 dark:border-rose-900/40'
                    : 'bg-white dark:bg-charcoal-900 border-slate-200 dark:border-white/10 text-charcoal-600 dark:text-slate-300 hover:text-rose-500'
                }`}
                aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
              >
                <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>

          {/* Verified Seller / Vendor Card & Pincode Delivery Checker */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-slate-100 dark:border-white/5">
            {/* Vendor Details */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-charcoal-800/30 border border-slate-100 dark:border-white/5 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-1">
                <Store className="w-3.5 h-3.5 text-emerald-600" /> Authorized Seller
              </span>
              <p className="text-xs font-bold text-charcoal-900 dark:text-white">
                {product.vendorName || 'BioCart Direct Partner'}
              </p>
              <p className="text-[10px] text-slate-500">
                100% Certified Direct Supplier • GST Verified
              </p>
            </div>

            {/* Pincode Estimator */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-charcoal-800/30 border border-slate-100 dark:border-white/5 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-emerald-600" /> Delivery Estimate
              </span>
              <form onSubmit={handleCheckPincode} className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Enter 6-digit PIN"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-1.5 bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex-shrink-0 cursor-pointer"
                >
                  Check
                </button>
              </form>
              {deliveryEstimated && (
                <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                  ✓ {deliveryEstimated}
                </p>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Tabs Section: Overview, Usage, Specs, Shipping, Reviews, FAQs */}
      <div className="border-t border-slate-200 dark:border-white/10 pt-8 space-y-6" id="product-tabs-section">
        <div className="flex border-b border-slate-200 dark:border-white/10 overflow-x-auto scrollbar-none gap-2">
          {[
            { id: 'overview', label: 'Overview', icon: Leaf },
            { id: 'usage', label: 'Usage', icon: BookOpen },
            { id: 'specs', label: 'Specs', icon: Ruler },
            { id: 'shipping', label: 'Shipping', icon: Truck },
            { id: 'reviews', label: `Reviews (${product.reviewsCount || 0})`, icon: MessageSquare },
            { id: 'faqs', label: 'FAQs', icon: HelpCircle }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 py-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Panes */}
        <div className="min-h-[180px]">
          {activeTab === 'overview' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <p className="text-sm leading-relaxed text-charcoal-700 dark:text-slate-300 max-w-4xl">
                {product.description}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 bg-emerald-50/40 dark:bg-charcoal-800/20 rounded-2xl border border-emerald-100/40 dark:border-white/5">
                  <h4 className="font-display font-bold text-xs uppercase tracking-wider text-emerald-900 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-700" /> Premium Features
                  </h4>
                  <ul className="space-y-1.5 text-xs text-charcoal-600 dark:text-slate-300 pl-4 list-disc leading-relaxed">
                    {product.features?.map((feat, idx) => (
                      <li key={idx}>{feat}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-emerald-50/40 dark:bg-emerald-950/10 rounded-2xl border border-emerald-100/40 dark:border-white/5">
                  <h4 className="font-display font-bold text-xs uppercase tracking-wider text-emerald-900 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                    <Leaf className="w-3.5 h-3.5 text-emerald-700" /> Enriched Benefits
                  </h4>
                  <ul className="space-y-1.5 text-xs text-charcoal-600 dark:text-slate-300 pl-4 list-disc leading-relaxed">
                    {product.benefits?.map((benefit, idx) => (
                      <li key={idx}>{benefit}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'usage' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="p-3.5 bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-100/40 dark:border-emerald-900/20 rounded-2xl flex gap-3 max-w-2xl">
                <AlertCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h5 className="text-xs font-bold text-emerald-900 dark:text-emerald-400 uppercase tracking-wider">Natural Application Guidelines</h5>
                  <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed">
                    Because BioCart items are 100% organic, regular dosage preserves active soil microbiomes.
                  </p>
                </div>
              </div>

              <div className="space-y-3 pl-1 max-w-3xl">
                {product.usageInstructions?.map((inst, idx) => (
                  <div key={idx} className="flex gap-3 items-start">
                    <span className="w-5 h-5 flex-shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 flex items-center justify-center text-[10px] font-bold">
                      {idx + 1}
                    </span>
                    <p className="text-xs text-charcoal-700 dark:text-slate-300 mt-0.5 leading-relaxed">
                      {inst}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'specs' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl border border-slate-150 dark:border-white/5 rounded-2xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <tbody>
                  <tr className="border-b border-slate-150 dark:border-white/5">
                    <td className="px-4 py-2.5 font-bold text-slate-400 bg-slate-50 dark:bg-charcoal-800/20 w-1/3">SKU</td>
                    <td className="px-4 py-2.5 font-semibold text-charcoal-800 dark:text-white font-mono">{product.sku}</td>
                  </tr>
                  <tr className="border-b border-slate-150 dark:border-white/5">
                    <td className="px-4 py-2.5 font-bold text-slate-400 bg-slate-50 dark:bg-charcoal-800/20">Category</td>
                    <td className="px-4 py-2.5 font-semibold text-charcoal-800 dark:text-white">{product.category}</td>
                  </tr>
                  <tr className="border-b border-slate-150 dark:border-white/5">
                    <td className="px-4 py-2.5 font-bold text-slate-400 bg-slate-50 dark:bg-charcoal-800/20">Organic Formulation</td>
                    <td className="px-4 py-2.5 font-semibold text-emerald-600 dark:text-emerald-400">100% Certified Chemical-Free</td>
                  </tr>
                  <tr className="border-b border-slate-150 dark:border-white/5">
                    <td className="px-4 py-2.5 font-bold text-slate-400 bg-slate-50 dark:bg-charcoal-800/20">Materials</td>
                    <td className="px-4 py-2.5 font-semibold text-charcoal-800 dark:text-white">{product.materials || 'Pure Organic Extract'}</td>
                  </tr>
                  <tr className="border-b border-slate-150 dark:border-white/5">
                    <td className="px-4 py-2.5 font-bold text-slate-400 bg-slate-50 dark:bg-charcoal-800/20">Packaging</td>
                    <td className="px-4 py-2.5 font-semibold text-charcoal-800 dark:text-white">{product.dimensions || 'Biodegradable Craft Bag'}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-bold text-slate-400 bg-slate-50 dark:bg-charcoal-800/20">Country of Origin</td>
                    <td className="px-4 py-2.5 font-semibold text-charcoal-800 dark:text-white">India</td>
                  </tr>
                </tbody>
              </table>
            </motion.div>
          )}

          {activeTab === 'shipping' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-5 bg-slate-50 dark:bg-charcoal-850/40 rounded-3xl border border-slate-150 dark:border-white/5 space-y-4 max-w-2xl">
              <div className="flex gap-4 items-start">
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl text-emerald-600">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-charcoal-900 dark:text-white">Fast Nationwide Delivery</h4>
                  <p className="text-xs text-charcoal-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                    All orders are carefully checked, packed, and dispatched within 24 hours. Transit averages 3 to 5 business days across India.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 items-start border-t border-slate-200/50 dark:border-white/5 pt-4">
                <div className="p-2.5 bg-nature-50 dark:bg-nature-950/20 rounded-xl text-nature-700">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-charcoal-900 dark:text-white">100% Plastic-Free Packaging</h4>
                  <p className="text-xs text-charcoal-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                    Wrapped in cellulose fiber nest pads and sealed with natural water-based potato starch adhesive.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'reviews' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 max-w-3xl">
              {product.reviews && product.reviews.length > 0 ? (
                <div className="space-y-3">
                  {product.reviews.map((rev) => (
                    <div key={rev.id} className="p-4 bg-slate-50 dark:bg-charcoal-800/20 border border-slate-150 dark:border-white/5 rounded-2xl space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">
                            {rev.user.charAt(0)}
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-charcoal-800 dark:text-white">{rev.user}</h5>
                            <span className="text-[10px] text-slate-400">{rev.date}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 text-amber-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`w-3 h-3 ${i < rev.rating ? 'fill-current' : 'text-slate-200'}`} />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-charcoal-600 dark:text-slate-300 leading-relaxed italic">
                        "{rev.comment}"
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No verified customer reviews yet. Be the first to try this product and share your feedback!
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'faqs' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 max-w-3xl">
              {(product.faqs || [
                {
                  question: "Is this product safe for edible kitchen gardens?",
                  answer: "Yes, absolutely. All BioCart supplies are organic-certified and completely free from synthetic chemical residues."
                },
                {
                  question: "How should I store this product?",
                  answer: "Keep the packaging sealed and store in a cool, dry, dark environment to preserve beneficial microbial colonies."
                }
              ]).map((faq, index) => {
                const isExpanded = expandedFaqIdx === index;
                return (
                  <div key={index} className="border border-slate-150 dark:border-white/5 rounded-2xl overflow-hidden bg-slate-50/50">
                    <button
                      onClick={() => setExpandedFaqIdx(isExpanded ? null : index)}
                      className="w-full text-left px-4 py-3.5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-100/50 transition-colors"
                    >
                      <span className="text-xs font-bold text-charcoal-800 dark:text-white flex items-center gap-2">
                        <span className="text-emerald-700 font-mono">Q{index + 1}.</span>
                        {faq.question}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180 text-emerald-700' : ''}`} />
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 text-xs text-charcoal-600 dark:text-slate-300 leading-relaxed border-t border-slate-150/60">
                        <p className="bg-white dark:bg-charcoal-900 p-3 rounded-xl border border-slate-150">
                          {faq.answer}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>

      {/* Frequently Bought Together Bundle Recommendations */}
      {fbtProducts.length > 0 && (
        <div className="space-y-4 pt-8 border-t border-slate-200 dark:border-white/10" id="frequently-bought-together-section">
          <div className="space-y-1">
            <h3 className="font-serif font-bold text-xl text-charcoal-900 dark:text-white">
              Frequently Bought Together
            </h3>
            <p className="text-[10px] uppercase font-bold tracking-widest text-emerald-600 dark:text-emerald-400">
              Curated organic pairings frequently bundled by customers
            </p>
          </div>

          <div className="bg-slate-50/70 dark:bg-charcoal-800/10 border border-slate-200/80 dark:border-white/5 rounded-3xl p-5 space-y-5">
            <div className="flex flex-wrap items-center gap-3.5">
              {bundleItems.map((item, idx) => (
                <React.Fragment key={item.id}>
                  {idx > 0 && <span className="text-xl font-bold text-slate-300">+</span>}
                  <div 
                    className={`relative w-16 h-16 rounded-2xl overflow-hidden border-2 transition-all bg-white p-1 ${
                      bundleChecked[idx] ? 'border-emerald-600 scale-105' : 'border-slate-200 opacity-40'
                    }`}
                  >
                    <img src={item.image} alt="" referrerPolicy="no-referrer" className="w-full h-full object-contain" />
                    {bundleChecked[idx] && (
                      <div className="absolute top-1 right-1 bg-emerald-600 text-white rounded-full p-0.5">
                        <ShieldCheck className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </div>
                </React.Fragment>
              ))}
            </div>

            <div className="space-y-2">
              {bundleItems.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => {
                    const updated = [...bundleChecked];
                    updated[idx] = !updated[idx];
                    setBundleChecked(updated);
                  }}
                  className="flex items-center gap-3 w-full text-left text-xs cursor-pointer group hover:text-emerald-600"
                >
                  {bundleChecked[idx] ? (
                    <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-300 flex-shrink-0" />
                  )}
                  <span className="flex-grow font-medium">
                    <span className={idx === 0 ? 'font-bold text-charcoal-900' : 'text-charcoal-600'}>
                      {idx === 0 ? `This item: ${item.name}` : item.name}
                    </span>
                    <span className="text-emerald-700 font-bold ml-1.5">(₹{item.price})</span>
                  </span>
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-4 pt-3 border-t border-slate-200">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Bundle Price</span>
                <span className="text-xl font-display font-extrabold text-charcoal-950">₹{bundleTotalPrice}</span>
              </div>
              <button
                onClick={handleAddBundleToCart}
                disabled={activeBundleProducts.length === 0}
                className="px-6 py-3 bg-[#004643] hover:bg-[#003532] disabled:opacity-50 text-white text-xs font-bold rounded-2xl shadow-md transition-all cursor-pointer flex items-center gap-2 !text-white"
              >
                <ShoppingBag className="w-4 h-4 text-white" />
                <span className="!text-white">Add Selected {activeBundleProducts.length} Items to Cart</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED RELATED PRODUCTS SECTION */}
      {relatedProducts.length > 0 && (
        <section className="space-y-6 pt-10 border-t border-slate-200 dark:border-white/10" id="related-products-section">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h3 className="font-serif font-bold text-2xl md:text-3xl text-nature-900 dark:text-nature-400">
                You May Also Like
              </h3>
              <p className="text-xs text-charcoal-500 mt-1">
                More high-grade organic solutions in <span className="font-semibold text-emerald-700">{product.category}</span>
              </p>
            </div>

            <button
              onClick={() => setTab('shop')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-100/60"
            >
              <span>View All in Catalog</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {relatedProducts.slice(0, 4).map((rp) => (
              <ProductCard
                key={rp.id}
                product={rp}
                isWishlisted={wishlist.includes(rp.id)}
                onToggleWishlist={toggleWishlist}
                onQuickView={(p) => {
                  setActiveProductDetails(p);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onAddToCart={(p) => addToCart(p, 1)}
                onBuyNow={(p) => {
                  addToCart(p, 1);
                  setCartOpen(true);
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* FULLSCREEN LIGHTBOX MODAL */}
      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6"
            onClick={() => setIsLightboxOpen(false)}
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between text-white z-10" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <span className="font-bold text-sm tracking-tight">{product.name}</span>
                <span className="text-xs font-mono bg-white/20 px-2.5 py-0.5 rounded-full">
                  {activeImageIdx + 1} of {galleryImages.length}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLightboxScale((prev) => Math.min(prev + 0.25, 2.5))}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
                  title="Zoom In"
                  aria-label="Zoom In"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setLightboxScale((prev) => Math.max(prev - 0.25, 0.75))}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
                  title="Zoom Out"
                  aria-label="Zoom Out"
                >
                  <ZoomOut className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setLightboxScale(1)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
                  title="Reset Zoom"
                  aria-label="Reset Zoom"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsLightboxOpen(false)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors ml-2"
                  title="Close (Esc)"
                  aria-label="Close"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Central Lightbox Image Viewport */}
            <div 
              className="relative flex-grow flex items-center justify-center overflow-hidden my-4" 
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={currentMainImage}
                alt={product.name}
                referrerPolicy="no-referrer"
                className="max-h-[75vh] max-w-[85vw] object-contain transition-transform duration-200 select-none"
                style={{ transform: `scale(${lightboxScale})` }}
              />

              {/* Prev and Next Lightbox Arrows */}
              {galleryImages.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveImageIdx((prev) => (prev - 1 + galleryImages.length) % galleryImages.length)}
                    className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white transition-all cursor-pointer"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => setActiveImageIdx((prev) => (prev + 1) % galleryImages.length)}
                    className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white transition-all cursor-pointer"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>

            {/* Bottom Thumbnail Strip */}
            {galleryImages.length > 1 && (
              <div 
                className="flex items-center justify-center gap-2 overflow-x-auto py-2 z-10" 
                onClick={(e) => e.stopPropagation()}
              >
                {galleryImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setActiveImageIdx(idx);
                      setLightboxScale(1);
                    }}
                    className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 transition-all p-1 bg-white/10 ${
                      activeImageIdx === idx ? 'border-emerald-400 scale-105' : 'border-transparent opacity-50 hover:opacity-80'
                    }`}
                  >
                    <img src={img} alt="" referrerPolicy="no-referrer" className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
