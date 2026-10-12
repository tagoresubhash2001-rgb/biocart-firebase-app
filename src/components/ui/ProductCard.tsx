import React from 'react';
import { motion } from 'motion/react';
import { Star, Heart, ShoppingBag, Eye, ShieldCheck, Leaf } from 'lucide-react';
import { Product } from '../../types';
import { SafeImage } from './SafeImage';

interface ProductCardProps {
  product: Product;
  onQuickView: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onBuyNow: (product: Product) => void;
  isWishlisted: boolean;
  onToggleWishlist: (productId: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onQuickView,
  onAddToCart,
  onBuyNow,
  isWishlisted,
  onToggleWishlist,
}) => {
  // Calculate discount if it doesn't exist
  const discountPercent = product.discount || (product.mrp > product.price 
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100) 
    : 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10px' }}
      transition={{ type: 'spring', stiffness: 140, damping: 18 }}
      whileHover={{ y: -6, boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.12)' }}
      onClick={() => onQuickView(product)}
      className="group relative flex flex-col bg-white dark:bg-charcoal-900 border border-slate-150 dark:border-white/5 rounded-3xl hover:-translate-y-1.5 hover:shadow-xl hover:shadow-nature-900/10 transition-all duration-300 ease-[cubic-bezier(0.215,0.61,0.355,1)] overflow-hidden p-3.5 space-y-3.5 transition-all duration-300 h-full cursor-pointer"
      id={`product-card-${product.id}`}
    >
      {/* Image Container with Badges */}
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-50 dark:bg-charcoal-800/40" id={`img-container-${product.id}`}>
        <SafeImage
          src={product.image}
          fallbackSrc="https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1200&q=80"
          alt={product.name}
          className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500"
        />
        
        {/* Quality and Eco Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10" id={`badges-left-${product.id}`}>
          {product.badge && (
            <span className="bg-amber-500/90 backdrop-blur-sm text-white text-[8px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider w-fit shadow-sm">
              {product.badge}
            </span>
          )}
        </div>

        {/* Wishlist and Quick View Floating buttons (Desktop slide-in, visible on mobile) */}
        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 z-10" id={`actions-right-${product.id}`}>
          {/* Wishlist Button */}
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onToggleWishlist(product.id);
            }}
            whileTap={{ scale: 0.85 }}
            animate={{ scale: isWishlisted ? [1, 1.35, 1.1, 1] : 1 }}
            transition={{ duration: 0.4 }}
            className={`p-2 rounded-full border shadow-sm cursor-pointer ${
              isWishlisted
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200/50 dark:border-rose-900/30 text-rose-500'
                : 'bg-white/90 hover:bg-white dark:bg-charcoal-900/90 dark:hover:bg-charcoal-900 border-slate-100 dark:border-white/10 text-charcoal-600 dark:text-slate-300 hover:text-rose-500'
            }`}
            title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            id={`wishlist-btn-${product.id}`}
          >
            <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-current' : ''}`} />
          </motion.button>

          {/* Quick View Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuickView(product);
            }}
            className="p-2 rounded-full border shadow-sm bg-white/90 hover:bg-white dark:bg-charcoal-900/90 dark:hover:bg-charcoal-900 border-slate-100 dark:border-white/10 text-charcoal-600 dark:text-slate-300 hover:text-emerald-600 md:opacity-0 md:group-hover:opacity-100 md:translate-x-2 md:group-hover:translate-x-0 transition-all duration-300 cursor-pointer"
            title="Quick View Product"
            id={`quickview-btn-${product.id}`}
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Out of Stock overlay if applicable */}
        {!product.inStock && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
            <span className="bg-charcoal-900/95 text-white text-[10px] font-extrabold px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-lg">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Product Information */}
      <div className="flex-grow flex flex-col justify-between" id={`info-${product.id}`}>
        <div className="space-y-1.5">
          {/* Category */}
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-widest text-earth-800 dark:text-earth-500">
              {product.category}
            </span>
            <span className="text-[9px] font-mono text-slate-400">
              SKU: {product.sku.split('-').slice(-2).join('-')}
            </span>
          </div>

          {/* Title */}
          <h4 
            onClick={() => onQuickView(product)}
            className="font-display font-bold text-sm sm:text-base text-charcoal-900 dark:text-white line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors cursor-pointer"
            title={product.name}
          >
            {product.name}
          </h4>

          {/* Short Description */}
          <p className="text-[11px] text-charcoal-500 dark:text-slate-400 line-clamp-2 leading-relaxed min-h-[32px]">
            {product.shortDescription}
          </p>

          {/* Rating */}
          <div className="flex items-center gap-1 text-xs text-amber-500 font-semibold" id={`rating-${product.id}`}>
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  className={`w-3 h-3 ${i < Math.floor(product.rating) ? 'fill-current' : 'text-slate-100 dark:text-charcoal-800'}`} 
                />
              ))}
            </div>
            <span className="text-charcoal-800 dark:text-white font-bold ml-0.5">{product.rating}</span>
            <span className="text-charcoal-400 text-[10px] font-normal">({product.reviewsCount})</span>
          </div>
        </div>

        {/* Pricing & Call-to-Actions */}
        <div className="pt-3.5 border-t border-slate-100 dark:border-white/5 space-y-3 mt-3">
          {/* Prices */}
          <div className="flex items-baseline gap-2">
            <span className="text-base font-display font-bold text-charcoal-950 dark:text-white">
              ₹{product.price}
            </span>
            {product.mrp > product.price && (
              <>
                <span className="text-xs text-slate-400 line-through font-medium">
                  ₹{product.mrp}
                </span>
                <span className="text-[10px] font-extrabold text-earth-800 dark:text-earth-500 bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded-md">
                  {discountPercent}% OFF
                </span>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2" id={`btn-grid-${product.id}`}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddToCart(product);
              }}
              disabled={!product.inStock}
              className="flex items-center justify-center gap-1 px-2.5 py-2.5 bg-slate-100 hover:bg-slate-200/85 dark:bg-charcoal-800 dark:hover:bg-charcoal-700 disabled:opacity-50 text-charcoal-900 dark:text-white text-xs font-bold rounded-xl transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              id={`addtocart-btn-${product.id}`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onBuyNow(product);
              }}
              disabled={!product.inStock}
              className="px-2.5 py-2.5 bg-[#004643] hover:bg-[#003532] disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] text-center shadow-md hover:shadow-[#004643]/30 !text-white"
              id={`buynow-btn-${product.id}`}
            >
              <span className="!text-white">Buy Now</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
