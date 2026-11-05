import { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export const defaultHomepageCMS = {
  hero: {
    badgeText: "BioCart Presents",
    titleLine1: "BioCart – The Way of",
    titleLine2: "Healthy, Organic",
    titleLine3: "Life",
    subtitle: "Indulge in premium organic living. Crafted carefully with certified zero-chemical formulations and 100% plastic-free commitments.",
    primaryButtonText: "Explore Premium Collection",
    secondaryButtonText: "Our Green Commitments",
    scrollIndicatorText: "Scroll to discover",
  },
  stats: [
    { value: '100%', label: 'Plastic-Free Packaging', iconName: 'ShieldCheck' },
    { value: '50K+', label: 'Kg Plastic Waste Saved', iconName: 'Leaf' },
    { value: 'India', label: 'Certified Organic Origin', iconName: 'Globe' },
    { value: '4.8★', label: 'Customer Trust Score', iconName: 'Star' },
  ],
  categoryDiscovery: {
    badge: "Explore Curated Collections",
    title: "Discover Pure Sustainability",
    subtitle: "Click on a circular catalog to discover organic-certified, premium, plastic-free solutions for your home."
  },
  productSections: {
    bestSellersTitle: "Best Sellers",
    bestSellersTagline: "Most purchased BioCart products trusted by thousands.",
    newArrivalsTitle: "New Arrivals",
    newArrivalsTagline: "Recently launched elements from our specialized bio-processing facilities.",
    trendingNowTitle: "Trending Now",
    trendingNowTagline: "Popular organic items running fast in stock catalogs.",
    homeGardeningTitle: "Home Gardening Essentials",
    homeGardeningTagline: "Core soils and nutrients every healthy indoor garden needs.",
    recommendedTitle: "Recommended For You",
    recommendedTagline: "Curated organic pairings optimized for your green lifestyle.",
    viewAllButton: "View All",
  },
  philosophy: {
    badge: "Our Ecological Vision",
    title: "Promoting Plastic-Free, Chemical-Free Indian Lifestyles",
    description: "SINDULIS INNOVATIVE SOLUTIONS established BioCart to pioneer the circular economy. Traditional gardening consumables leak toxic PVC microplastics and chemical synthetic compounds directly into home-grown organic vegetables. Our fully biodegradable coir items decompose organically right inside your planters, building richer soil parameters instead of microplastic toxicities.",
    bullet1Title: "100% Clean Sourcing",
    bullet1Desc: "Washed and processed in our Guntur facility under strict low EC guidelines.",
    bullet2Title: "Carbon-Neutral Shipping",
    bullet2Desc: "Every capsule box is packed with organic starches and recycled paper lines.",
    imageUrl: "https://images.unsplash.com/photo-1592150621744-aca64f48394a?auto=format&fit=crop&w=1200&q=80",
    badgeTitle: "Sindulis Guarantee",
    badgeDesc: "Tested thoroughly by Founder Prashanthi Pallapothula for zero chemical trace."
  },
  lifestyle: {
    badge: "Organic Living Spaces",
    title: "Designed for Modern Homes",
    description: "BioCart integrates elegantly with minimal aesthetics, transitioning homes into oxygen-rich eco centers.",
    card1Badge: "Home Gardening Hub",
    card1Title: "Sustainably Grown Vegetables",
    card1Desc: "Unlock high yield yields directly on your apartment balconies. Pair our premium Triple-Washed Coco Peat blocks with Jute breathable grow bags for healthy micro-farming structures.",
    card1Button: "Acquire Garden Starters",
    card1Image: "https://images.unsplash.com/photo-1592150621744-aca64f48394a?auto=format&fit=crop&w=400&q=80",
    card2Badge: "Plastic-Free Promise",
    card2Title: "Zero Plastic Footprints",
    card2Desc: "By purchasing BioCart coir-fiber plant starter pots, you actively eliminate disposable black nursery plastic cups.",
    card2Footer: "Saved over 50,000kg plastic in 2025"
  },
  testimonialsSection: {
    badge: "The BioCart Circle",
    title: "Endorsed by Eco Advocates",
    description: "Discover stories of individuals building oxygen-rich sanctuaries across Indian cities.",
    emptyText: "Community stories will appear here soon."
  },
  faqSection: {
    badge: "Assistance Desk",
    title: "Frequently Queries"
  },
  newsletter: {
    title: "Join the BioCart Circular",
    description: "Receive premium organic home-gardening guidance, special factory-batch pricing catalogs, and sustainable direct-to-consumer notifications. We never dispatch spam.",
    placeholder: "Enter email address",
    buttonText: "Subscribe"
  },
  reviewsSection: {
    title: "Customer Reviews"
  },
  footer: {
    brandDescription: "Leading the transition to zero-plastic, zero-chemical horticulture with authentic organic agricultural outputs.",
    socialTitle: "Follow Our Dispatch Journey",
    socialSubtitle: "Regenerating Indian Horticulture @BioCart",
    copyrightText: "© 2026 BioCart. SINDULIS INNOVATIVE SOLUTIONS Private Limited. All Rights Reserved."
  },
    promotionalRibbon: {
      enabled: true,
      text: "🌱 Spring Bio-Harvest Sale: Get 25% Off Premium Vermicompost & Bio-Fertilizers!",
      ctaText: "Shop Bio-Deals",
      ctaLink: "#shop",
      campaignLabel: "PROMO OFFER",
      ads: [
        {
          id: 'ad-1',
          text: '🌱 Spring Bio-Harvest Sale: Get 25% Off Premium Vermicompost & Bio-Fertilizers!',
          campaignLabel: 'PROMO OFFER',
          ctaText: 'Shop Bio-Deals',
          ctaLink: '#shop',
          active: true,
          order: 1
        },
        {
          id: 'ad-2',
          text: '🌿 Free Express Dispatch on all certified organic input orders over ₹999 across India!',
          campaignLabel: 'EXPRESS SHIPPING',
          ctaText: 'Explore Catalog',
          ctaLink: '#shop',
          active: true,
          order: 2
        },
        {
          id: 'ad-3',
          text: '🌾 Double-Screened 100% Pathogen-Free Vermicompost Back in Stock at Special Bulk Rates!',
          campaignLabel: 'NEW BATCH',
          ctaText: 'Claim Batch',
          ctaLink: '#shop',
          active: true,
          order: 3
        }
      ]
    },
    heroBanners: [
      {
        id: 'banner-hero-1',
        title: 'BioCart – The Way of Living Earth',
        titleLine1: 'BioCart – The Way of',
        titleLine2: 'Healthy, Organic',
        titleLine3: 'Life',
        subtitle: 'Indulge in premium organic living. Crafted carefully with certified zero-chemical formulations and 100% plastic-free commitments.',
        badgeText: 'BioCart Presents',
        imageUrl: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=1920&q=80',
        primaryButtonText: 'Explore Premium Collection',
        primaryButtonUrl: '#shop',
        secondaryButtonText: 'Our Green Commitments',
        secondaryButtonUrl: '#about',
        scrollIndicatorText: 'Scroll to discover',
        active: true,
        order: 1
      },
      {
        id: 'banner-hero-2',
        title: '100% Certified Organic Farm Inputs',
        titleLine1: 'Regenerative Agriculture',
        titleLine2: 'Pure Organic',
        titleLine3: 'Inputs',
        subtitle: 'Direct from BioCart Verified Sustainable Producers & Bio-Labs across India.',
        badgeText: 'DIRECT FARM INPUTS',
        imageUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19657?auto=format&fit=crop&w=1600&q=80',
        primaryButtonText: 'Explore Bio-Catalog',
        primaryButtonUrl: '#shop',
        secondaryButtonText: 'About BioCart',
        secondaryButtonUrl: '#about',
        scrollIndicatorText: 'Scroll to explore',
        active: true,
        order: 2
      },
      {
        id: 'banner-hero-3',
        title: 'Boost Soil Fertility Naturally',
        titleLine1: 'Nurture Living Soil',
        titleLine2: 'Enrich Root',
        titleLine3: 'Microbiomes',
        subtitle: 'Double-screened vermicompost, mycorrhizae & low-EC coco peat for vibrant urban gardens.',
        badgeText: 'MICROBIAL POWER',
        imageUrl: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&w=1600&q=80',
        primaryButtonText: 'Shop Organic Inputs',
        primaryButtonUrl: '#shop',
        secondaryButtonText: 'Soil Consultation',
        secondaryButtonUrl: '#contact-us',
        scrollIndicatorText: 'Scroll to explore',
        active: true,
        order: 3
      }
    ]
  };

export const useHomepageCMS = () => {
  const [cms, setCms] = useState<typeof defaultHomepageCMS>(defaultHomepageCMS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'pages', 'home'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Extract hero section and promotional ribbon section if stored in canonical sections array
        let extractedHeroBanners = data.heroBanners;
        let extractedAds = data.promotionalRibbon?.ads;
        let extractedHero = data.hero;
        let extractedRibbon = data.promotionalRibbon;

        if (Array.isArray(data.sections)) {
          const heroSec = data.sections.find((s: any) => s.type === 'hero');
          if (heroSec?.data) {
            if (Array.isArray(heroSec.data.banners) && heroSec.data.banners.length > 0) {
              extractedHeroBanners = heroSec.data.banners;
            }
            extractedHero = { ...defaultHomepageCMS.hero, ...heroSec.data };
          }
          const ribbonSec = data.sections.find((s: any) => s.type === 'promotional_ribbon');
          if (ribbonSec?.data) {
            if (Array.isArray(ribbonSec.data.ads) && ribbonSec.data.ads.length > 0) {
              extractedAds = ribbonSec.data.ads;
            }
            extractedRibbon = {
              ...defaultHomepageCMS.promotionalRibbon,
              enabled: ribbonSec.enabled !== false,
              ...ribbonSec.data
            };
          }
        }

        setCms({
          ...defaultHomepageCMS,
          ...data,
          hero: { ...defaultHomepageCMS.hero, ...extractedHero },
          heroBanners: extractedHeroBanners && extractedHeroBanners.length > 0 ? extractedHeroBanners : defaultHomepageCMS.heroBanners,
          stats: data.stats || defaultHomepageCMS.stats,
          categoryDiscovery: { ...defaultHomepageCMS.categoryDiscovery, ...data.categoryDiscovery },
          productSections: { ...defaultHomepageCMS.productSections, ...data.productSections },
          philosophy: { ...defaultHomepageCMS.philosophy, ...data.philosophy },
          lifestyle: { ...defaultHomepageCMS.lifestyle, ...data.lifestyle },
          testimonialsSection: { ...defaultHomepageCMS.testimonialsSection, ...data.testimonialsSection },
          faqSection: { ...defaultHomepageCMS.faqSection, ...data.faqSection },
          newsletter: { ...defaultHomepageCMS.newsletter, ...data.newsletter },
          reviewsSection: { ...defaultHomepageCMS.reviewsSection, ...data.reviewsSection },
          footer: { ...defaultHomepageCMS.footer, ...data.footer },
          promotionalRibbon: {
            ...defaultHomepageCMS.promotionalRibbon,
            ...extractedRibbon,
            ads: extractedAds && extractedAds.length > 0 ? extractedAds : defaultHomepageCMS.promotionalRibbon.ads
          },
        });
      } else {
        // Fallback to local storage backup if remote doc unavailable
        try {
          const localBackup = localStorage.getItem('biocart_published_page_home');
          if (localBackup) {
            const parsed = JSON.parse(localBackup);
            if (Array.isArray(parsed.sections)) {
              const heroSec = parsed.sections.find((s: any) => s.type === 'hero');
              const ribbonSec = parsed.sections.find((s: any) => s.type === 'promotional_ribbon');
              setCms({
                ...defaultHomepageCMS,
                hero: heroSec?.data ? { ...defaultHomepageCMS.hero, ...heroSec.data } : defaultHomepageCMS.hero,
                heroBanners: heroSec?.data?.banners || defaultHomepageCMS.heroBanners,
                promotionalRibbon: ribbonSec?.data
                  ? {
                      ...defaultHomepageCMS.promotionalRibbon,
                      enabled: ribbonSec.enabled !== false,
                      ...ribbonSec.data,
                      ads: ribbonSec.data.ads || defaultHomepageCMS.promotionalRibbon.ads
                    }
                  : defaultHomepageCMS.promotionalRibbon
              });
              setLoading(false);
              return;
            }
          }
        } catch {}
        setCms(defaultHomepageCMS);
      }
      setLoading(false);
    }, (err) => {
      console.warn('[useHomepageCMS] Realtime listener error (using fallback content):', err);
      // Attempt local storage fallback on network failure
      try {
        const localBackup = localStorage.getItem('biocart_published_page_home');
        if (localBackup) {
          const parsed = JSON.parse(localBackup);
          const heroSec = parsed.sections?.find((s: any) => s.type === 'hero');
          const ribbonSec = parsed.sections?.find((s: any) => s.type === 'promotional_ribbon');
          setCms({
            ...defaultHomepageCMS,
            hero: heroSec?.data ? { ...defaultHomepageCMS.hero, ...heroSec.data } : defaultHomepageCMS.hero,
            heroBanners: heroSec?.data?.banners || defaultHomepageCMS.heroBanners,
            promotionalRibbon: ribbonSec?.data
              ? {
                  ...defaultHomepageCMS.promotionalRibbon,
                  enabled: ribbonSec.enabled !== false,
                  ...ribbonSec.data,
                  ads: ribbonSec.data.ads || defaultHomepageCMS.promotionalRibbon.ads
                }
              : defaultHomepageCMS.promotionalRibbon
          });
          setLoading(false);
          return;
        }
      } catch {}
      setCms(defaultHomepageCMS);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { cms, loading };
};
