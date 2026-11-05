import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { useHomepageCMS } from '../hooks/useHomepageCMS';


import { ProductCard } from '../components/ui/ProductCard';
import { CategoryCircularNav } from '../components/ui/CategoryCircularNav';
import { Product, CategoryItem, BannerItem, StoreSettings, Review } from '../types';
import { AdminService } from '../services/AdminService';
import { SEED_PRODUCTS } from '../data/seedData';
import { MASTER_CATEGORIES } from '../data/categoryCatalog';
import { 
  ArrowRight, Leaf, ShieldCheck, Globe, Star, Sparkles, 
  ChevronRight, Calendar, ArrowUpRight, CheckCircle2, 
  HelpCircle, MessageSquare, Send, ChevronLeft, ChevronRight as ChevronRightIcon,
  Megaphone, ExternalLink
} from 'lucide-react';
import { renderSafeLineBreaks } from '../utils/textUtils';

export const Home: React.FC = () => {
  const { cms } = useHomepageCMS();
  const { 
    setTab, 
    addToCart, 
    setActiveProductDetails, 
    addToast, 
    wishlist, 
    toggleWishlist, 
    setCartOpen, 
    setSelectedCategory 
  } = useApp();

  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const scrollAmount = 320;
      categoryScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };
  const [activeFaq, setActiveFaq] = useState<string | null>(null);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  useEffect(() => {
    const unsub = AdminService.subscribeToFAQs((data) => {
      setFaqs(data);
    });
    return () => unsub();
  }, []);


  // Firestore Real-Time State
  const [realtimeProducts, setRealtimeProducts] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
  const [realtimeCategories, setRealtimeCategories] = useState<CategoryItem[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(true);
  const [realtimeBanners, setRealtimeBanners] = useState<BannerItem[]>([]);
  const [storeSettings, setStoreSettings] = useState<any>(null);
  const [realtimeReviews, setRealtimeReviews] = useState<Review[]>([]);
  const [realtimeTestimonials, setRealtimeTestimonials] = useState<any[]>([]);

  useEffect(() => {
    // Seed initial catalog idempotently if Firestore is uninitialized
    
    const unsubProducts = AdminService.subscribeToProducts(
      (list) => {
        setRealtimeProducts(list);
        setLoadingProducts(false);
      },
      (err) => {
        console.error('Home products subscription error:', err);
        setLoadingProducts(false);
      }
    );
    const unsubCategories = AdminService.subscribeToCategories(
      (list) => {
        setRealtimeCategories(list);
        setLoadingCategories(false);
      },
      (err) => {
        console.error('Home categories subscription error:', err);
        setLoadingCategories(false);
      }
    );
    const unsubBanners = AdminService.subscribeToBanners((list) => {
      setRealtimeBanners(list.filter(b => b.active !== false));
    });
    const unsubSettings = AdminService.subscribeToSettings((data) => setStoreSettings(data));
    const unsubReviews = AdminService.subscribeToReviews((list) => setRealtimeReviews(list));
    const unsubTestimonials = AdminService.subscribeToTestimonials((list) => setRealtimeTestimonials(list.filter(t => t.active !== false)));

    return () => {
      unsubProducts();
      unsubCategories();
      unsubBanners();
      unsubSettings();
      unsubReviews();
      unsubTestimonials();
    };
  }, []);

  const activeProducts = (realtimeProducts.length > 0 ? realtimeProducts : SEED_PRODUCTS).filter(p => p.active !== false && p.homepageVisible !== false);


  const getExactlyNine = (filterFn?: (p: Product) => boolean, seedOffset: number = 0): Product[] => {
    let filtered = activeProducts;
    if (filterFn) {
      filtered = activeProducts.filter(filterFn);
    }
    if (filtered.length === 0) {
      filtered = activeProducts;
    }
    
    if (filtered.length === 0) {
      return [];
    }

    const result: Product[] = [];
    for (let i = 0; i < 9; i++) {
      const idx = (i + seedOffset) % filtered.length;
      result.push(filtered[idx]);
    }
    return result;
  };

  const bestSellers = getExactlyNine((p) => p.isBestSeller || p.badge === 'Best Seller' || p.rating >= 4.8, 0);
  const newArrivals = getExactlyNine((p) => p.isNewArrival || p.id.includes('seed') || p.id.includes('care'), 2);
  const trendingNow = getExactlyNine((p) => p.isSponsored || (p.discount !== undefined && p.discount > 30), 4);
  const homeGardeningEssentials = getExactlyNine((p) => p.isFeatured || p.category === 'Potting Mix' || p.category === 'Organic Fertilizers', 1);
  const recommendedForYou = getExactlyNine(undefined, 6);

  const scrollCarousel = (id: string, direction: 'left' | 'right') => {
    const el = document.getElementById(id);
    if (el) {
      const scrollAmount = direction === 'left' ? -380 : 380;
      el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

    const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'ShieldCheck': return ShieldCheck;
      case 'Leaf': return Leaf;
      case 'Globe': return Globe;
      case 'Star': return Star;
      default: return Leaf;
    }
  };

  const stats = cms.stats.map((s: any) => ({ ...s, icon: getIcon(s.iconName) }));

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    addToast('Thank you! Welcome to the BioCart organic newsletter circular.', 'success');
    setNewsletterEmail('');
  };

  // Active Hero Banners: prioritize canonical CMS banners from pages/home, then fallback to realtimeBanners or defaults
  const activeBanners = (cms.heroBanners && cms.heroBanners.length > 0
    ? cms.heroBanners
    : realtimeBanners.length > 0
      ? realtimeBanners
      : [
          {
            id: 'default-hero-1',
            title: cms.hero.titleLine1 || 'BioCart – The Way of Living Earth',
            titleLine1: cms.hero.titleLine1,
            titleLine2: cms.hero.titleLine2,
            titleLine3: cms.hero.titleLine3,
            subtitle: cms.hero.subtitle,
            badgeText: cms.hero.badgeText,
            imageUrl: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=1920&q=80',
            primaryButtonText: cms.hero.primaryButtonText,
            primaryButtonUrl: '#shop',
            secondaryButtonText: cms.hero.secondaryButtonText,
            secondaryButtonUrl: '#about',
            scrollIndicatorText: cms.hero.scrollIndicatorText,
            active: true,
            order: 1
          }
        ]
  ).filter((b: any) => b.active !== false);

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-rotate hero banners
  useEffect(() => {
    if (activeBanners.length <= 1 || isPaused) return;
    const intervalTime = (cms as any).hero?.autoplayInterval || 5000;
    const timer = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % activeBanners.length);
    }, intervalTime);
    return () => clearInterval(timer);
  }, [activeBanners.length, isPaused, (cms as any).hero?.autoplayInterval]);

  const activeBanner = activeBanners[currentSlideIndex % Math.max(1, activeBanners.length)] || activeBanners[0];

  // Active Promotional Ads
  const activeAds = (cms.promotionalRibbon?.ads && cms.promotionalRibbon.ads.length > 0
    ? cms.promotionalRibbon.ads
    : [
        {
          id: 'ad-default',
          text: cms.promotionalRibbon?.text || '🌱 Spring Bio-Harvest Sale: Get 25% Off Premium Vermicompost & Bio-Fertilizers!',
          campaignLabel: cms.promotionalRibbon?.campaignLabel || 'PROMO OFFER',
          ctaText: cms.promotionalRibbon?.ctaText || 'Shop Bio-Deals',
          ctaLink: cms.promotionalRibbon?.ctaLink || '#shop',
          active: true,
          order: 1
        }
      ]
  ).filter((a: any) => a.active !== false);

  const nextBanner = () => {
    setCurrentSlideIndex((prev) => (prev + 1) % activeBanners.length);
  };

  const prevBanner = () => {
    setCurrentSlideIndex((prev) => (prev - 1 + activeBanners.length) % activeBanners.length);
  };

  return (
    <div className="space-y-24 pb-20 animate-fade-in" id="home-page">
      {/* Cinematic Hero Carousel with Auto-Rotation & Multi-Banners */}
      <section 
        className="cinematic-hero relative flex items-center justify-center pt-24 md:pt-28 pb-16 md:pb-20 px-4 sm:px-8 overflow-hidden group select-none h-[540px] sm:h-[580px] lg:h-[640px] w-full" 
        id="hero-section"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <img 
          key={activeBanner?.id || currentSlideIndex}
          src={activeBanner?.imageUrl || "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=1920&q=80"}
          alt={activeBanner?.title || "BioCart Premium Organic Farming"}
          fetchPriority="high"
          loading="eager"
          decoding="sync"
          className="absolute inset-0 w-full h-full object-cover object-center z-0 transition-opacity duration-1000 ease-in-out"
        />
        {/* Semi-transparent high-contrast dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/40 z-10 pointer-events-none" />

        {/* Decorative background grid pattern for depth */}
        <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.03] z-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        
        <div className="max-w-7xl mx-auto w-full relative z-20 flex flex-col items-start text-left" id="hero-content">
          <motion.div
            key={activeBanner?.id || currentSlideIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="max-w-2xl text-left"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 px-5 py-2 rounded-full border border-emerald-500/35 text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] mb-6">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>{activeBanner?.badgeText || cms.hero.badgeText}</span>
            </div>

            {/* Title */}
            <h1 className="font-serif font-bold text-4xl sm:text-5xl md:text-6xl text-white leading-[1.15] tracking-tight mb-8">
              {activeBanner?.titleLine1 ? (
                <>
                  <span dangerouslySetInnerHTML={{ __html: activeBanner.titleLine1.replace(/<br\s*\/?>/gi, ' ').trim() }} />
                  {activeBanner.titleLine2 && (
                    <span 
                      className="text-emerald-400 font-sans font-extrabold italic drop-shadow-[0_2px_15px_rgba(52,211,153,0.3)] ml-2" 
                      dangerouslySetInnerHTML={{ __html: activeBanner.titleLine2.replace(/<br\s*\/?>/gi, ' ').trim() }}
                    />
                  )}
                  {activeBanner.titleLine3 && ` ${activeBanner.titleLine3.replace(/<br\s*\/?>/gi, ' ').trim()}`}
                </>
              ) : activeBanner?.title ? (
                <span dangerouslySetInnerHTML={{ __html: activeBanner.title.replace(/<br\s*\/?>/gi, ' ').trim() }} />
              ) : (
                <>
                  {cms.hero.titleLine1?.replace(/<br\s*\/?>/gi, ' ')}
                  <span className="text-emerald-400 font-sans font-extrabold italic drop-shadow-[0_2px_15px_rgba(52,211,153,0.3)]" dangerouslySetInnerHTML={{ __html: (cms.hero.titleLine2 || '').replace(/<br\s*\/?>/gi, ' ') }}></span> {cms.hero.titleLine3?.replace(/<br\s*\/?>/gi, ' ')}
                </>
              )}
            </h1>

            {/* Description */}
            <p className="text-sm sm:text-base md:text-lg text-slate-200 max-w-xl font-sans leading-relaxed tracking-wide mb-12">
              {activeBanner?.subtitle || cms.hero.subtitle}
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4 sm:gap-6" id="hero-ctas">
              <button
                onClick={() => {
                  const banner = activeBanner as any;
                  const targetUrl = banner?.primaryButtonUrl || banner?.linkUrl || '#shop';
                  if (targetUrl === '#shop') setTab('shop');
                  else if (targetUrl.startsWith('http')) window.open(targetUrl, '_blank');
                  else window.location.hash = targetUrl;
                }}
                className="px-7 py-3.5 bg-[#004643] hover:bg-[#003532] text-white rounded-full font-bold shadow-lg shadow-[#004643]/30 transition-all hover:scale-[1.03] active:scale-[0.98] cursor-pointer flex items-center gap-2.5 !text-white"
              >
                <span className="!text-white font-semibold">{activeBanner?.primaryButtonText || 'Explore Premium Collection'}</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={() => {
                  const secUrl = activeBanner?.secondaryButtonUrl || '#about';
                  if (secUrl === '#about') setTab('about');
                  else window.location.hash = secUrl;
                }}
                className="px-7 py-3.5 bg-white/10 text-white hover:bg-white/20 border border-white/25 backdrop-blur-sm rounded-full font-bold transition-all hover:scale-[1.03] active:scale-[0.98] cursor-pointer !text-white"
              >
                <span className="!text-white font-semibold">{activeBanner?.secondaryButtonText || cms.hero.secondaryButtonText}</span>
              </button>
            </div>
          </motion.div>
        </div>

        {/* Carousel Navigation Arrows */}
        {activeBanners.length > 1 && (
          <div className="absolute inset-y-0 inset-x-4 md:inset-x-8 flex items-center justify-between pointer-events-none z-20">
            <button
              onClick={prevBanner}
              className="p-3 rounded-full bg-black/40 hover:bg-black/70 text-white/90 border border-white/20 transition-all pointer-events-auto backdrop-blur-sm hover:scale-110 active:scale-95"
              aria-label="Previous Slide"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={nextBanner}
              className="p-3 rounded-full bg-black/40 hover:bg-black/70 text-white/90 border border-white/20 transition-all pointer-events-auto backdrop-blur-sm hover:scale-110 active:scale-95"
              aria-label="Next Slide"
            >
              <ChevronRightIcon className="w-6 h-6" />
            </button>
          </div>
        )}

        {/* Pagination Dots Indicators */}
        {activeBanners.length > 1 && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5 bg-black/30 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">
            {activeBanners.map((_, dotIdx) => (
              <button
                key={dotIdx}
                onClick={() => setCurrentSlideIndex(dotIdx)}
                className={`transition-all rounded-full ${
                  dotIdx === (currentSlideIndex % activeBanners.length)
                    ? 'w-7 h-2 bg-emerald-400'
                    : 'w-2 h-2 bg-white/50 hover:bg-white/80'
                }`}
                aria-label={`Go to slide ${dotIdx + 1}`}
              />
            ))}
          </div>
        )}

        {/* Scroll indicator with high contrast light colors */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.85, y: [0, 8, 0] }}
          transition={{ duration: 2.0, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
          className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 hidden md:flex flex-col items-center gap-1 cursor-pointer"
          onClick={() => {
            const nextSec = document.getElementById('stats-section');
            if (nextSec) {
              nextSec.scrollIntoView({ behavior: 'smooth' });
            } else {
              window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
            }
          }}
          id="hero-scroll-indicator"
        >
          <span className="text-[9px] uppercase tracking-[0.25em] text-white/70 font-semibold">{activeBanner?.scrollIndicatorText || cms.hero.scrollIndicatorText}</span>
          <div className="w-5 h-8 border-2 border-white/35 rounded-full flex justify-center p-1">
            <div className="w-1 h-1.5 bg-emerald-400 rounded-full animate-bounce" />
          </div>
        </motion.div>
      </section>

      {/* 2. MULTIPLE CONTINUOUSLY SCROLLING PROMOTIONAL ADS RIBBON */}
      {cms.promotionalRibbon?.enabled !== false && activeAds.length > 0 && (
        <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 -mt-12 z-20 relative pause-on-hover" id="promotional-ad-ribbon">
          <div className="bg-white dark:bg-emerald-900 text-black dark:text-white rounded-2xl shadow-2xl border border-slate-200 dark:border-emerald-500/30 overflow-hidden relative transition-all">
            {/* Seamless Double-List Marquee Stream */}
            <div className="overflow-hidden py-3 sm:py-4">
              <div className="animate-marquee flex items-center gap-8">
                {/* First set of ads */}
                {activeAds.map((ad: any, idx: number) => (
                  <div key={`ad-1-${ad.id || idx}`} className="flex items-center gap-3 shrink-0 px-4 border-r border-slate-200 dark:border-white/10 last:border-r-0">
                    <span className="px-2 py-0.5 bg-emerald-600 text-white font-extrabold font-mono text-[9px] uppercase rounded shrink-0">
                      {ad.campaignLabel || 'PROMO OFFER'}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {ad.text}
                    </span>
                    {ad.ctaText && (
                      <a
                        href={ad.ctaLink || '#shop'}
                        onClick={(e) => {
                          if (ad.ctaLink === '#shop' || !ad.ctaLink) {
                            e.preventDefault();
                            setTab('shop');
                          }
                        }}
                        className="underline text-emerald-700 dark:text-emerald-300 font-extrabold text-xs inline-flex items-center gap-1 hover:text-emerald-900 shrink-0"
                      >
                        <span>{ad.ctaText}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}

                {/* Duplicated set for infinite, continuous seamless looping without gaps */}
                {activeAds.map((ad: any, idx: number) => (
                  <div key={`ad-2-${ad.id || idx}`} className="flex items-center gap-3 shrink-0 px-4 border-r border-slate-200 dark:border-white/10 last:border-r-0" aria-hidden="true">
                    <span className="px-2 py-0.5 bg-emerald-600 text-white font-extrabold font-mono text-[9px] uppercase rounded shrink-0">
                      {ad.campaignLabel || 'PROMO OFFER'}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {ad.text}
                    </span>
                    {ad.ctaText && (
                      <a
                        href={ad.ctaLink || '#shop'}
                        onClick={(e) => {
                          if (ad.ctaLink === '#shop' || !ad.ctaLink) {
                            e.preventDefault();
                            setTab('shop');
                          }
                        }}
                        className="underline text-emerald-700 dark:text-emerald-300 font-extrabold text-xs inline-flex items-center gap-1 hover:text-emerald-900 shrink-0"
                      >
                        <span>{ad.ctaText}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Trust & Metric Stats Section */}
      <section className="max-w-7xl mx-auto px-6" id="stats-section">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-24px" id="stats-grid">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <motion.div 
                key={idx} 
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: '-20px' }}
                transition={{
                  type: 'spring',
                  stiffness: 160,
                  damping: 18,
                  delay: idx * 0.08,
                }}
                whileHover={{ y: -4, scale: 1.02 }}
                className="p-6 bg-[#FDFBD4]/50 dark:bg-charcoal-800/20 border border-slate-150 dark:border-white/5 rounded-3xl flex flex-col items-center text-center space-y-2 transition-shadow duration-300 hover:shadow-lg dark:hover:shadow-black/20"
                id={`stat-card-${idx}`}
              >
                <div className="p-3 bg-nature-50 dark:bg-nature-950/40 rounded-2xl text-nature-700 mb-2 border border-nature-100/30 dark:border-nature-900/30">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="font-display font-extrabold text-3xl md:text-4xl text-charcoal-900 dark:text-white">
                  {stat.value}
                </span>
                <span className="text-xs md:text-sm font-semibold text-charcoal-500 tracking-tight">
                  {stat.label}
                </span>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Premium Product Categories Horizontal Track */}
      <section className="max-w-7xl mx-auto px-6 space-y-6" id="home-category-discovery">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-earth-800 dark:text-earth-500">
              Explore Curated Collections
            </span>
            <h2 className="font-serif font-bold text-3xl md:text-4xl text-nature-900 dark:text-nature-400">
              Discover Pure Sustainability
            </h2>
            <p className="text-xs md:text-sm text-charcoal-500 dark:text-slate-400">
              {cms.categoryDiscovery.subtitle}
            </p>
          </div>

          {/* Accessible Category Scroll Navigation Arrows (Desktop / Tablet) */}
          <div className="hidden sm:flex items-center gap-2 self-center md:self-end">
            <button
              onClick={() => scrollCategories('left')}
              aria-label="Scroll categories left"
              className="w-10 h-10 rounded-full bg-white dark:bg-charcoal-800 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:hover:bg-emerald-950/40 transition-colors shadow-sm cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => scrollCategories('right')}
              aria-label="Scroll categories right"
              className="w-10 h-10 rounded-full bg-white dark:bg-charcoal-800 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:hover:bg-emerald-950/40 transition-colors shadow-sm cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Horizontal non-wrapping scroller track with Shared CategoryCircularNav */}
        <div className="relative group/categoryTrack">
          <div 
            ref={categoryScrollRef}
            id="home-categories-track"
            className="flex-row flex-nowrap overflow-x-auto snap-x snap-mandatory"
          >
            <CategoryCircularNav
              categories={(realtimeCategories.length > 0 ? realtimeCategories : MASTER_CATEGORIES).filter(c => c.active !== false && c.isFeatured !== false)}
              selectedCategory=""
              onSelectCategory={(catName) => {
                setSelectedCategory(catName);
                setTab('shop');
              }}
              showAllOption={false}
              idPrefix="home-categories"
              className="gap-6 sm:gap-8"
            />
          </div>
        </div>
      </section>

      {/* Multiple Premium Carousels - Product Showcases */}
      {[
        {
          id: 'best-sellers',
          title: cms.productSections.bestSellersTitle,
          tagline: cms.productSections.bestSellersTagline,
          products: bestSellers,
          categoryFilter: 'All'
        },
        {
          id: 'new-arrivals',
          title: cms.productSections.newArrivalsTitle,
          tagline: cms.productSections.newArrivalsTagline,
          products: newArrivals,
          categoryFilter: 'Seeds'
        },
        {
          id: 'trending-now',
          title: cms.productSections.trendingNowTitle,
          tagline: cms.productSections.trendingNowTagline,
          products: trendingNow,
          categoryFilter: 'All'
        },
        {
          id: 'home-gardening-essentials',
          title: cms.productSections.homeGardeningTitle,
          tagline: cms.productSections.homeGardeningTagline,
          products: homeGardeningEssentials,
          categoryFilter: 'Potting Mix'
        },
        {
          id: 'recommended-for-you',
          title: cms.productSections.recommendedTitle,
          tagline: cms.productSections.recommendedTagline,
          products: recommendedForYou,
          categoryFilter: 'All'
        }
      ].map((section) => (
        <section 
          key={section.id} 
          className="max-w-7xl mx-auto px-6 space-y-6 relative group/carousel" 
          id={`section-${section.id}`}
        >
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-4">
            <div>
              <h2 className="font-serif font-bold text-2xl md:text-3xl text-nature-900 dark:text-nature-400 flex items-center gap-2">
                {section.title}
              </h2>
              <p className="text-xs text-charcoal-500 mt-1">
                {section.tagline}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Carousel Scroll Buttons - visible on desktop */}
              <div className="hidden md:flex items-center gap-1.5">
                <button
                  onClick={() => scrollCarousel(`carousel-${section.id}`, 'left')}
                  className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-charcoal-800 dark:hover:bg-charcoal-700 text-charcoal-700 dark:text-white rounded-full transition-colors cursor-pointer"
                  title="Previous"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => scrollCarousel(`carousel-${section.id}`, 'right')}
                  className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-charcoal-800 dark:hover:bg-charcoal-700 text-charcoal-700 dark:text-white rounded-full transition-colors cursor-pointer"
                  title="Next"
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>

              {/* View All Button */}
              <button
                onClick={() => {
                  setSelectedCategory(section.categoryFilter);
                  setTab('shop');
                }}
                className="text-xs font-bold text-nature-700 dark:text-nature-400 hover:underline flex items-center gap-0.5 cursor-pointer bg-[#FDFBD4] dark:bg-charcoal-800/20 px-3.5 py-2 rounded-xl border border-slate-100 dark:border-white/5"
              >
                <span>{cms.productSections.viewAllButton}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Premium Swipeable Horizontal Carousel */}
          <div 
            id={`carousel-${section.id}`}
            className="flex gap-6 overflow-x-auto py-2.5 px-1 pb-6 w-full scrollbar-none snap-x snap-mandatory touch-pan-x items-stretch"
          >
            {section.products.map((p, idx) => (
              <div 
                key={`${section.id}-${p.id}-${idx}`}
                className="w-[280px] sm:w-[310px] md:w-[320px] flex-shrink-0 snap-center flex flex-col"
              >
                <ProductCard
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
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Brand Philosophy - Generous white space layout */}
      <section className="bg-[#F8FAF6] dark:bg-charcoal-900 text-[#2E2E2E] dark:text-[#cbd5e1] py-24 overflow-hidden" id="philosophy-section">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-64px items-center">
          <div className="space-y-8" id="philosophy-text-col">
            <span className="text-xs font-bold uppercase tracking-widest text-[#15803D] dark:text-emerald-400">
              Our Ecological Vision
            </span>
            <h2 className="font-serif font-bold text-4xl md:text-5xl text-nature-800 dark:text-white leading-tight">
              {renderSafeLineBreaks(cms.philosophy.title)}
            </h2>
            <p className="text-sm md:text-base text-[#2E2E2E] dark:text-slate-300 leading-relaxed max-w-xl">
              {cms.philosophy.description}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4" id="philosophy-bullets">
              <div className="flex items-start gap-4 p-5 bg-white/60 dark:bg-charcoal-800/40 backdrop-blur-sm rounded-[24px] border border-black/5 dark:border-white/5 shadow-sm transition-all hover:shadow-md">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h5 className="font-bold text-sm text-nature-800 dark:text-white mb-1">{cms.philosophy.bullet1Title}</h5>
                  <p className="text-xs text-[#2E2E2E] dark:text-slate-400 leading-relaxed">{cms.philosophy.bullet1Desc}</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-5 bg-white/60 dark:bg-charcoal-800/40 backdrop-blur-sm rounded-[24px] border border-black/5 dark:border-white/5 shadow-sm transition-all hover:shadow-md">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h5 className="font-bold text-sm text-nature-800 dark:text-white mb-1">{cms.philosophy.bullet2Title}</h5>
                  <p className="text-xs text-[#2E2E2E] dark:text-slate-400 leading-relaxed">{cms.philosophy.bullet2Desc}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative aspect-video lg:aspect-square rounded-3xl overflow-hidden shadow-2xl border border-white/10" id="philosophy-img-col">
            <img
              src={cms.philosophy.imageUrl}
              alt="Organic Home Gardening"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover filter brightness-90 saturate-75"
            />
            {/* Embedded Luxury Badge Overlay */}
            <div className="absolute bottom-6 left-6 p-4 glass rounded-2xl border border-white/20 text-slate-900 max-w-xs space-y-1">
              <h6 className="font-bold text-xs uppercase tracking-wide text-nature-800">{cms.philosophy.badgeTitle}</h6>
              <p className="text-[10px] text-charcoal-700 leading-relaxed font-medium">
                {cms.philosophy.badgeDesc}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Home Gardening & Sustainability - Elegant Bento Grids */}
      <section className="max-w-7xl mx-auto px-6 space-y-12" id="bento-lifestyle">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-earth-800 dark:text-earth-500">
            Organic Living Spaces
          </span>
          <h2 className="font-serif font-bold text-3xl md:text-4xl text-nature-900 dark:text-nature-400">
            {renderSafeLineBreaks(cms.lifestyle.title || 'Designed for Modern Homes')}
          </h2>
          <p className="text-sm text-charcoal-500 leading-relaxed">
            {cms.lifestyle.description}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-24px" id="bento-grid">
          {/* Card 1 */}
          <div className="md:col-span-2 p-8 bg-[#FDFBD4] dark:bg-charcoal-800/40 border border-slate-150 dark:border-white/5 rounded-3xl flex flex-col md:flex-row gap-8 items-center justify-between">
            <div className="space-y-4 max-w-md">
              <span className="bg-nature-100 dark:bg-nature-950 text-nature-800 dark:text-nature-300 text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                Home Gardening Hub
              </span>
              <h3 className="font-serif font-bold text-2xl text-nature-900 dark:text-nature-400">
                Sustainably Grown Vegetables
              </h3>
              <p className="text-xs text-charcoal-500 leading-relaxed">
                {cms.lifestyle.card1Desc}
              </p>
              <button
                onClick={() => setTab('shop')}
                className="text-xs font-bold text-nature-700 dark:text-nature-450 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>{cms.lifestyle.card1Button}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <img
              src={cms.lifestyle.card1Image}
              alt=""
              referrerPolicy="no-referrer"
              className="w-full md:w-48 aspect-square object-cover rounded-2xl border border-slate-100 shadow-sm"
            />
          </div>

          {/* Card 2 */}
          <div className="p-8 bg-earth-50/40 dark:bg-charcoal-800/20 border border-earth-100/30 dark:border-white/5 rounded-3xl flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <span className="bg-earth-100 dark:bg-nature-950 text-earth-800 dark:text-earth-300 text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                Plastic-Free Promise
              </span>
              <h3 className="font-serif font-bold text-xl text-nature-900 dark:text-nature-400">
                Zero Plastic Footprints
              </h3>
              <p className="text-xs text-charcoal-500 leading-relaxed">
                {cms.lifestyle.card2Desc}
              </p>
            </div>
            <div className="text-xs font-bold text-earth-800 dark:text-earth-300 border-t border-earth-100 dark:border-white/5 pt-4">
              {cms.lifestyle.card2Footer}
            </div>
          </div>
        </div>
      </section>

      {/* Customer Testimonials - D2C Aesthetics */}
      <section className="bg-[#FDFBD4] dark:bg-charcoal-950 py-24" id="testimonials">
        <div className="max-w-7xl mx-auto px-6 space-y-16">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-widest text-earth-800 dark:text-earth-500">
              The BioCart Circle
            </span>
            <h2 className="font-serif font-bold text-3xl md:text-4xl text-nature-900 dark:text-nature-400">
              Endorsed by Eco Advocates
            </h2>
            <p className="text-sm text-charcoal-500 leading-relaxed">
              {cms.testimonialsSection.description}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-32px" id="testimonials-grid">
            {realtimeTestimonials.length > 0 ? (
              realtimeTestimonials.slice(0, 3).map((t) => (
                <div
                  key={t.id}
                  className="bg-white dark:bg-charcoal-900 p-8 rounded-3xl border border-slate-150 dark:border-white/5 flex flex-col justify-between space-y-6 shadow-sm hover:shadow-lg transition-shadow"
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-1 text-amber-500">
                      {[...Array(t.rating || 5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-current" />
                      ))}
                    </div>
                    <p className="text-xs md:text-sm text-charcoal-600 dark:text-slate-300 leading-relaxed italic">
                      "{t.quote}"
                    </p>
                  </div>

                  <div className="flex items-center gap-3 border-t border-slate-50 dark:border-white/5 pt-4">
                    <img
                      src={t.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                      alt={t.name}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover border border-slate-200"
                    />
                    <div>
                      <h5 className="font-display font-bold text-xs text-charcoal-950 dark:text-white">
                        {t.name}
                      </h5>
                      <p className="text-[10px] text-charcoal-400 font-semibold mt-0.5">
                        {t.role}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="md:col-span-3 p-12 text-center text-charcoal-500 bg-white/50 dark:bg-charcoal-800/30 rounded-3xl border border-slate-100 dark:border-white/5">
                <Sparkles className="w-8 h-8 mx-auto text-emerald-400 mb-4 opacity-50" />
                <p className="text-sm font-medium">{cms.testimonialsSection.emptyText}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FAQs section */}
      <section className="max-w-4xl mx-auto px-6 space-y-12" id="home-faqs">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-earth-800 dark:text-earth-500">
            Assistance Desk
          </span>
          <h2 className="font-serif font-bold text-3xl text-nature-900 dark:text-nature-400">
            Frequently Queries
          </h2>
        </div>

        <div className="space-y-4" id="faq-accordions">
          {faqs.map((faq) => {
            const isOpen = activeFaq === faq.id;
            return (
              <div
                key={faq.id}
                className="border border-slate-150 dark:border-white/5 rounded-2xl overflow-hidden transition-all bg-white dark:bg-charcoal-900 shadow-sm"
              >
                <button
                  onClick={() => setActiveFaq(isOpen ? null : faq.id)}
                  className="w-full flex items-center justify-between p-5 text-left font-display font-bold text-sm text-charcoal-950 dark:text-white hover:bg-[#FDFBD4]/50 dark:hover:bg-white/5 cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <HelpCircle className="w-4 h-4 text-nature-700 flex-shrink-0" />
                    <span>{faq.question}</span>
                  </span>
                  <ChevronRight className={`w-4 h-4 text-charcoal-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs md:text-sm text-charcoal-600 dark:text-slate-300 leading-relaxed bg-[#FDFBD4]/30 dark:bg-charcoal-850/10 border-t border-slate-100 dark:border-white/5">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Sustainable Circular Newsletter */}
      <section className="max-w-5xl mx-auto px-6" id="newsletter">
        <div className="bg-nature-50 dark:bg-charcoal-800/40 border border-nature-100 dark:border-white/5 rounded-3xl p-8 md:p-12 text-center space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 translate-x-1/3 -translate-y-1/3 w-64 h-64 bg-nature-700/10 rounded-full blur-2xl" />
          
          <div className="bg-nature-700 text-white p-3.5 rounded-full w-fit mx-auto mb-2 shadow-md">
            <MessageSquare className="w-5 h-5" />
          </div>

          <div className="space-y-2 max-w-xl mx-auto">
            <h3 className="font-serif font-bold text-2xl md:text-3xl text-nature-900 dark:text-nature-400">
              Join the BioCart Circular
            </h3>
            <p className="text-xs md:text-sm text-charcoal-500 dark:text-slate-400 leading-relaxed">
              {cms.newsletter.description}
            </p>
          </div>

          <form onSubmit={handleNewsletterSubmit} className="max-w-md mx-auto flex gap-2" id="newsletter-form">
            <input
              type="email"
              required
              placeholder={cms.newsletter.placeholder}
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              className="flex-grow px-4 py-3.5 bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-white/10 rounded-xl focus:border-nature-600 focus:outline-none text-xs text-charcoal-950 dark:text-white"
            />
            <button
              type="submit"
              className="px-6 bg-nature-700 hover:bg-nature-800 text-white rounded-xl text-xs font-semibold shadow-md transition-colors cursor-pointer flex items-center gap-1.5 flex-shrink-0 hover:scale-105 active:scale-95 transition-all duration-300 ease-out shadow-md hover:shadow-nature-700/30"
            >
              <span>{cms.newsletter.buttonText}</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </section>
﻿      {/* Dynamic Approved Reviews Section */}
      {realtimeReviews.filter(r => r.status === 'approved').length > 0 && (
        <section className="py-20 px-6 bg-[#FDFBD4] dark:bg-black border-t border-slate-200 dark:border-white/10">
          <div className="max-w-7xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <h2 className="font-serif text-3xl md:text-5xl font-bold text-slate-900 dark:text-white">{cms.reviewsSection.title}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {realtimeReviews.filter(r => r.status === 'approved').slice(0, 3).map(review => (
                <div key={review.id} className="p-6 bg-white dark:bg-[#1C1C1E] border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-1 mb-4">
                    {Array.from({ length: review.rating || 5 }).map((_, i) => (
                      <span key={i} className="text-amber-400">★</span>
                    ))}
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 italic mb-6">"{review.comment}"</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">- {review.reviewerName}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

    </div>
  );
};
