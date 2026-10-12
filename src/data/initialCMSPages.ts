import { CMSPage, PageSection } from '../types/cms';
import { defaultHomepageCMS } from '../hooks/useHomepageCMS';

export const INITIAL_CMS_PAGES: CMSPage[] = [
  // 1. Navigation Pages
  {
    id: 'home',
    slug: 'home',
    title: 'Homepage',
    description: 'Main flagship marketplace landing page',
    category: 'Navigation',
    status: 'published',
    template: 'homepage',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    seo: {
      title: 'BioCart | Pure Organic & Regenerative Agriculture Inputs',
      description: 'Discover certified organic fertilizers, double-screened vermicompost, non-toxic plant care and eco-friendly home gardening essentials.',
    },
    sections: [
      {
        id: 'hero-1',
        type: 'hero',
        title: 'Hero Carousel & Branding',
        enabled: true,
        order: 1,
        data: {
          badgeText: defaultHomepageCMS.hero.badgeText,
          titleLine1: defaultHomepageCMS.hero.titleLine1,
          titleLine2: defaultHomepageCMS.hero.titleLine2,
          titleLine3: defaultHomepageCMS.hero.titleLine3,
          subtitle: defaultHomepageCMS.hero.subtitle,
          primaryButtonText: defaultHomepageCMS.hero.primaryButtonText,
          secondaryButtonText: defaultHomepageCMS.hero.secondaryButtonText,
          scrollIndicatorText: defaultHomepageCMS.hero.scrollIndicatorText,
          imageUrl: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=1920&q=80',
          autoplayInterval: 5000,
          banners: defaultHomepageCMS.heroBanners
        }
      },
      {
        id: 'ribbon-1',
        type: 'promotional_ribbon',
        title: 'Promotional Ad Ribbon',
        enabled: defaultHomepageCMS.promotionalRibbon.enabled,
        order: 2,
        data: {
          text: defaultHomepageCMS.promotionalRibbon.text,
          ctaText: defaultHomepageCMS.promotionalRibbon.ctaText,
          ctaLink: defaultHomepageCMS.promotionalRibbon.ctaLink,
          campaignLabel: 'BioCart Live Campaign',
          ads: defaultHomepageCMS.promotionalRibbon.ads
        }
      },
      {
        id: 'stats-1',
        type: 'stats',
        title: 'Trust Metrics & Ecological Impact',
        enabled: true,
        order: 3,
        data: {
          stats: defaultHomepageCMS.stats
        }
      },
      {
        id: 'cat-grid-1',
        type: 'category_grid',
        title: 'Curated Categories Discovery',
        enabled: true,
        order: 4,
        data: {
          eyebrow: 'Explore Curated Collections',
          heading: 'Discover Pure Sustainability',
          subtitle: defaultHomepageCMS.categoryDiscovery.subtitle,
          limit: 5
        }
      },
      {
        id: 'prod-best-sellers',
        type: 'product_carousel',
        title: 'Best Sellers Showcase',
        enabled: true,
        order: 5,
        data: {
          title: defaultHomepageCMS.productSections.bestSellersTitle,
          tagline: defaultHomepageCMS.productSections.bestSellersTagline,
          filterType: 'best_sellers',
          categoryFilter: 'All'
        }
      },
      {
        id: 'prod-new-arrivals',
        type: 'product_carousel',
        title: 'New Harvest & Seed Arrivals',
        enabled: true,
        order: 6,
        data: {
          title: defaultHomepageCMS.productSections.newArrivalsTitle,
          tagline: defaultHomepageCMS.productSections.newArrivalsTagline,
          filterType: 'new_arrivals',
          categoryFilter: 'Seeds'
        }
      },
      {
        id: 'prod-trending',
        type: 'product_carousel',
        title: 'Trending Sustainable Picks',
        enabled: true,
        order: 7,
        data: {
          title: defaultHomepageCMS.productSections.trendingNowTitle,
          tagline: defaultHomepageCMS.productSections.trendingNowTagline,
          filterType: 'trending',
          categoryFilter: 'All'
        }
      },
      {
        id: 'philosophy-1',
        type: 'brand_philosophy',
        title: 'Ecological Vision & Philosophy',
        enabled: true,
        order: 8,
        data: {
          eyebrow: 'Our Ecological Vision',
          title: defaultHomepageCMS.philosophy.title,
          description: defaultHomepageCMS.philosophy.description,
          imageUrl: defaultHomepageCMS.philosophy.imageUrl,
          bullet1Title: defaultHomepageCMS.philosophy.bullet1Title,
          bullet1Desc: defaultHomepageCMS.philosophy.bullet1Desc,
          bullet2Title: defaultHomepageCMS.philosophy.bullet2Title,
          bullet2Desc: defaultHomepageCMS.philosophy.bullet2Desc,
          badgeTitle: defaultHomepageCMS.philosophy.badgeTitle,
          badgeDesc: defaultHomepageCMS.philosophy.badgeDesc
        }
      },
      {
        id: 'lifestyle-1',
        type: 'lifestyle_bento',
        title: 'Modern Homes & Lifestyle Bento Grid',
        enabled: true,
        order: 9,
        data: {
          eyebrow: 'Organic Living Spaces',
          title: 'Designed for Modern Homes',
          description: defaultHomepageCMS.lifestyle.description,
          card1Title: 'Sustainably Grown Vegetables',
          card1Desc: defaultHomepageCMS.lifestyle.card1Desc,
          card1Image: defaultHomepageCMS.lifestyle.card1Image,
          card1Button: defaultHomepageCMS.lifestyle.card1Button,
          card2Title: 'Zero Plastic Footprints',
          card2Desc: defaultHomepageCMS.lifestyle.card2Desc,
          card2Footer: defaultHomepageCMS.lifestyle.card2Footer
        }
      },
      {
        id: 'testimonials-1',
        type: 'testimonials',
        title: 'Eco Advocates Testimonials',
        enabled: true,
        order: 10,
        data: {
          eyebrow: 'The BioCart Circle',
          title: 'Endorsed by Eco Advocates',
          description: defaultHomepageCMS.testimonialsSection.description,
          limit: 3
        }
      },
      {
        id: 'faq-1',
        type: 'faq',
        title: 'Frequently Asked Questions',
        enabled: true,
        order: 11,
        data: {
          eyebrow: 'Assistance Desk',
          title: 'Frequently Queries',
          limit: 6
        }
      },
      {
        id: 'newsletter-1',
        type: 'newsletter',
        title: 'Join the BioCart Circular',
        enabled: true,
        order: 12,
        data: {
          title: 'Join the BioCart Circular',
          description: defaultHomepageCMS.newsletter.description,
          placeholder: defaultHomepageCMS.newsletter.placeholder,
          buttonText: defaultHomepageCMS.newsletter.buttonText
        }
      }
    ]
  },
  {
    id: 'shop-catalog',
    slug: 'shop',
    title: 'Shop Catalog',
    description: 'Live multi-vendor organic product marketplace',
    category: 'Navigation',
    status: 'published',
    template: 'standard',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    seo: {
      title: 'Shop All Organic Inputs | BioCart Marketplace',
      description: 'Explore full catalog of organic fertilizers, pest management, potting soils and seeds.'
    },
    sections: [
      {
        id: 'shop-hero',
        type: 'hero',
        title: 'Shop Hero Header',
        enabled: true,
        order: 1,
        data: {
          titleLine1: 'The Regenerative Earth Store',
          subtitle: 'Certified zero-chemical fertilizers, bioactive vermicompost, and heirloom seeds.'
        }
      }
    ]
  },
  {
    id: 'about-us',
    slug: 'about-us',
    title: 'About Us',
    description: 'Founders journey, carbon-neutral mission and circular ethics',
    category: 'Navigation',
    status: 'published',
    template: 'custom',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    seo: {
      title: 'About BioCart | Leading the Clean Soil Revolution',
      description: 'Learn about BioCart founders Prashanthi Pallapothula and Tagore Subhash Maguluri and our mission.'
    },
    sections: [
      {
        id: 'about-hero',
        type: 'hero',
        title: 'About BioCart Hero',
        enabled: true,
        order: 1,
        data: {
          badgeText: 'About Sindulis Agro Products',
          titleLine1: 'Rooted in Purity, Driven by Science',
          subtitle: 'From local Andhra farms to nationwide ecological horticulture, discover why BioCart is the trusted standard for living soil.'
        }
      },
      {
        id: 'about-story',
        type: 'rich_text',
        title: 'Our Origin Story',
        enabled: true,
        order: 2,
        data: {
          title: 'The Clean Soil Revolution',
          content: '<p>BioCart was founded in Tanuku, Andhra Pradesh, with a singular mission: to eliminate synthetic chemicals from home gardens and commercial farms alike.</p><p>We partner directly with verified bio-labs and sustainable farmers to double-screen vermicompost, culture beneficial mycorrhizae, and package everything in 100% plastic-free compostable containers.</p>'
        }
      },
      {
        id: 'about-mission',
        type: 'rich_text',
        title: 'Our Ecological Mission',
        enabled: true,
        order: 3,
        data: {
          title: 'To Eliminate Non-Biodegradable Plastics from Soil Chains',
          content: '<p>Traditional household gardening products look green on the surface, but are wrapped in microplastic structures. Millions of black plastic seedling containers and chemical soil mixes containing heavy metal residues are sold each year across India.</p><p>BioCart is on an ecological mission to empower modern growers with biodegradable raw coir containers, premium chemical-free growing substrates, and zero-plastic packaging envelopes.</p>'
        }
      },
      {
        id: 'about-vision',
        type: 'rich_text',
        title: 'Our Long-Term Vision',
        enabled: true,
        order: 4,
        data: {
          title: 'Leading the Bio-Circular Agriculture Revolution',
          content: '<p>By 2030, our goal is to establish fully closed-loop agricultural supply metrics across India, processing agricultural side streams into high-performance growing substrates.</p><p>We envision a future where every urban household balcony, kitchen garden, and corporate green space thrives in harmony with nature, using materials that are 100% compostable, certified organic, and climate-positive.</p>'
        }
      },
      {
        id: 'about-founders',
        type: 'team_members',
        title: 'Leadership & Founders',
        enabled: true,
        order: 5,
        data: {
          subtitle: 'Guiding BioCart toward sustainable innovation, operational excellence, and uncompromised organic standards.',
          members: [
            {
              name: 'Prashanthi Pallapothula',
              role: 'Founder & CEO — Product R&D & Design',
              company: 'Sindulis Agro Products Pvt. Ltd.',
              bio: 'Drawing on her studies in biotechnology and organic soil physics, Prashanthi leads product formulation, coir aeration research, and biodegradable packaging aesthetics.',
              quote: 'Sustainable living is a refinement of how we interact with the biosphere, starting with our living soil.',
              imageUrl: '/assets/founder_prashanthi.jpg'
            },
            {
              name: 'Tagore Subhash Maguluri',
              role: 'Co-Founder & COO — Platforms & Supply Chains',
              company: 'Sindulis Agro Products Pvt. Ltd.',
              bio: 'With a background in logistics engineering and digital platform scalability, Tagore scaled Sindulis from regional production into an all-India zero-emissions distribution network.',
              quote: 'Scaling ecology is a logistics and supply chain challenge. By combining software precision with authentic agricultural inputs, we solve it.',
              imageUrl: '/assets/founder_tagore.jpg'
            }
          ]
        }
      },
      {
        id: 'about-milestones',
        type: 'timeline_milestones',
        title: 'Milestone Progress',
        enabled: true,
        order: 6,
        data: {
          milestones: [
            { year: '2023', title: 'The Inception', desc: 'Sindulis Agro Products was registered with the core philosophy of promoting zero-chemical and zero-plastic home gardening.' },
            { year: '2024', title: 'Research & Operations', desc: 'Established state-of-the-art coir processing and organic composting operations in Andhra Pradesh.' },
            { year: '2025', title: 'Direct-To-Consumer Launch', desc: 'Introduced BioCart in major metropolitan areas, providing premium biodegradable alternatives to plastic containers.' },
            { year: '2026', title: 'All-India Scale & Global Export', desc: 'Scaling to all-India availability while launching global export variants representing premium Indian organic agriculture.' }
          ]
        }
      },
      {
        id: 'about-cta',
        type: 'cta_banner',
        title: 'Join the Living Soil Movement',
        enabled: true,
        order: 7,
        data: {
          title: 'Cultivate Wellness, Embrace Healthy Living',
          subtitle: 'Begin your sustainable coir gardening journey today with certified organic soil food, vermicompost, and non-toxic pots.',
          buttonText: 'Explore Organic Shop',
          buttonUrl: '#shop'
        }
      }
    ]
  },
  {
    id: 'contact-us',
    slug: 'contact-us',
    title: 'Contact Us',
    description: 'Direct customer support, agronomy advice & farm headquarters',
    category: 'Navigation',
    status: 'published',
    template: 'standard',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    seo: {
      title: 'Contact BioCart | Agri-Experts & Customer Support',
      description: 'Get in touch with our soil scientists, customer support, or dispatch office.'
    },
    sections: [
      {
        id: 'contact-hero',
        type: 'hero',
        title: 'Contact Header',
        enabled: true,
        order: 1,
        data: {
          badgeText: 'Customer Support & Farm Headquarters',
          titleLine1: 'We Are Here to Help Your Garden Thrive',
          subtitle: 'Speak with our certified agronomists, regional logistics managers, or institutional bulk export desk.'
        }
      },
      {
        id: 'contact-form-sec',
        type: 'contact_form',
        title: 'Interactive Inquiries Form',
        enabled: true,
        order: 2,
        data: {
          title: 'Direct Sourcing & Inquiry Form',
          subtitle: 'Choose between General Customer Support, Dealer Application, or Bulk Export trade inquiry.'
        }
      },
      {
        id: 'contact-details',
        type: 'rich_text',
        title: 'Headquarters & Manufacturing Plant',
        enabled: true,
        order: 3,
        data: {
          title: 'Corporate Office & Primary Processing Plant',
          content: '<p><strong>Headquarters:</strong> Sindulis Agro Products Pvt. Ltd., Industrial Corridor Area, Guntur District, Andhra Pradesh - 522001, India.</p><p><strong>Telephone Helpdesk:</strong> +91 863 2244 556 (Mon - Sat | 9:00 AM - 6:00 PM IST)</p><p><strong>Email Correspondence:</strong> General: care@biocart.co.in | Founders: contact@sindulis.com</p><p><strong>WhatsApp Support:</strong> +91 863 2244 556 (Rapid Response Team)</p>'
        }
      },
      {
        id: 'contact-support-highlights',
        type: 'features_list',
        title: 'Our Service Commitments',
        enabled: true,
        order: 4,
        data: {
          features: [
            { title: 'Free Agronomy Consultation', desc: 'Complimentary advice from certified soil chemists on NPK balance and pest management.' },
            { title: '24-Hour Dispatch Guarantee', desc: 'All verified consumer and nursery orders leave our central warehouse within 24 business hours.' },
            { title: '100% Plastic-Free Transit', desc: 'Packed in corrugated cardboard and sealed with water-activated starch paper tape.' }
          ]
        }
      }
    ]
  },
  {
    id: 'dealer-portal',
    slug: 'dealer-portal',
    title: 'Dealer Portal',
    description: 'Wholesale merchant & bulk distributor onboarding',
    category: 'Navigation',
    status: 'published',
    template: 'standard',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    sections: [
      {
        id: 'dealer-intro',
        type: 'rich_text',
        title: 'Wholesale Merchant Onboarding',
        enabled: true,
        order: 1,
        data: {
          title: 'Partner with India’s Premier Ecological Brand',
          content: '<p>Enjoy direct factory prices, bulk pallet dispatches, and exclusive district territorial rights for BioCart certified inputs.</p>'
        }
      }
    ]
  },

  // 2. Category Pages
  {
    id: 'cat-organic-fertilizers',
    slug: 'organic-fertilizers',
    title: 'Organic Fertilizers',
    description: 'Vermicompost, neem cakes and nitrogen bio-stimulants',
    category: 'Shop',
    status: 'published',
    template: 'category',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    sections: [
      {
        id: 'cat-fert-hero',
        type: 'hero',
        title: 'Category Overview',
        enabled: true,
        order: 1,
        data: {
          titleLine1: 'Pure Organic Fertilizers',
          subtitle: 'Nutrient-rich, micro-screened soil food designed for robust vegetative and fruit growth.'
        }
      }
    ]
  },
  {
    id: 'cat-coir-potting-mix',
    slug: 'coir-potting-mix',
    title: 'Coir & Potting Mix',
    description: 'Triple-washed low-EC coco peat, perlite and breathable coir pots',
    category: 'Shop',
    status: 'published',
    template: 'category',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    sections: [
      {
        id: 'cat-coir-hero',
        type: 'hero',
        title: 'Coir & Potting Mix Overview',
        enabled: true,
        order: 1,
        data: {
          titleLine1: 'Washed Low-EC Coir & Living Soils',
          subtitle: 'Aerated substrates, buffered coco peat blocks, and eco-friendly seed starter cups with optimal aeration.'
        }
      },
      {
        id: 'cat-coir-features',
        type: 'features_list',
        title: 'Substrate Quality Guarantees',
        enabled: true,
        order: 2,
        data: {
          features: [
            { title: 'Triple-Washed & Desalinated', desc: 'Guaranteed EC < 0.5 mS/cm to prevent root burn in delicate seedlings.' },
            { title: 'Buffered with Calcium & Magnesium', desc: 'Pre-treated to ensure consistent cation exchange and zero nutrient lockup.' },
            { title: '100% Biodegradable Coir Pots', desc: 'Direct-to-ground transplanting without transplant shock or plastic waste.' }
          ]
        }
      }
    ]
  },
  {
    id: 'cat-plant-care-solutions',
    slug: 'plant-care-solutions',
    title: 'Plant Care Solutions',
    description: 'Cold-pressed neem oil, botanical pest repellents & bio-fungicides',
    category: 'Shop',
    status: 'published',
    template: 'category',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    sections: [
      {
        id: 'cat-care-hero',
        type: 'hero',
        title: 'Plant Care Solutions Overview',
        enabled: true,
        order: 1,
        data: {
          titleLine1: 'Botanical Plant Defense & Care',
          subtitle: 'Cold-pressed pure neem formulations, bio-fungicides, and organic micronutrient foliar sprays.'
        }
      },
      {
        id: 'cat-care-features',
        type: 'features_list',
        title: 'Protection Highlights',
        enabled: true,
        order: 2,
        data: {
          features: [
            { title: 'Pollinator & Bee Safe', desc: 'Targeted insect repellency without harming honeybees, earthworms, or beneficial predators.' },
            { title: 'High Azadirachtin Potency', desc: 'Cold-processed to preserve pure botanical active compounds.' },
            { title: 'Zero Chemical Residue', desc: 'Harvest fruits, herbs, and vegetables safely within 24 hours of application.' }
          ]
        }
      }
    ]
  },
  {
    id: 'cat-organic-seeds',
    slug: 'organic-seeds',
    title: 'Organic Seeds',
    description: 'Open-pollinated heirloom vegetable and medicinal herb seeds',
    category: 'Shop',
    status: 'published',
    template: 'category',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    sections: [
      {
        id: 'cat-seeds-hero',
        type: 'hero',
        title: 'Organic Seeds Overview',
        enabled: true,
        order: 1,
        data: {
          titleLine1: 'Non-GMO Open-Pollinated Seeds',
          subtitle: 'Heirloom native vegetable, fragrant herb, and companion flower seeds with superior germination rates.'
        }
      },
      {
        id: 'cat-seeds-features',
        type: 'features_list',
        title: 'Seed Purity Promises',
        enabled: true,
        order: 2,
        data: {
          features: [
            { title: '85%+ Tested Germination', desc: 'Every seed batch laboratory-tested for high vigor and germination viability.' },
            { title: 'Open-Pollinated & True-to-Seed', desc: 'Save seed pods for future seasons without loss of genetic purity or taste.' },
            { title: 'Native & Pest Resilient', desc: 'Naturally adapted to tropical heat, monsoon humidity, and Indian soil conditions.' }
          ]
        }
      }
    ]
  },
  {
    id: 'cat-gardening-gear',
    slug: 'gardening-gear',
    title: 'Gardening Gear',
    description: 'Ergonomic stainless tools, jute grow bags and eco sprayers',
    category: 'Shop',
    status: 'published',
    template: 'category',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    sections: [
      {
        id: 'cat-gear-hero',
        type: 'hero',
        title: 'Gardening Gear Overview',
        enabled: true,
        order: 1,
        data: {
          titleLine1: 'Ergonomic & Sustainable Garden Gear',
          subtitle: 'Rust-resistant heavy-duty hand tools, breathable jute grow containers, and precision water sprayers.'
        }
      },
      {
        id: 'cat-gear-features',
        type: 'features_list',
        title: 'Tool & Equipment Standards',
        enabled: true,
        order: 2,
        data: {
          features: [
            { title: 'Heavy Gauge Stainless Steel', desc: 'Rust-proof forged blades with FSC-certified natural teak and ashwood handles.' },
            { title: 'Breathable Root Pruning Bags', desc: 'Jute and geo-textile grow bags that stimulate fibrous root ball development.' },
            { title: 'Durable Lifetime Hardware', desc: 'Built for rigorous horticultural use and extreme balcony outdoor exposure.' }
          ]
        }
      }
    ]
  },
  {
    id: 'cat-healthy-living',
    slug: 'healthy-living',
    title: 'Healthy Living',
    description: 'Microgreen kits, herbal wellness and terrace farming guides',
    category: 'Shop',
    status: 'published',
    template: 'category',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    sections: [
      {
        id: 'cat-living-hero',
        type: 'hero',
        title: 'Healthy Living Overview',
        enabled: true,
        order: 1,
        data: {
          titleLine1: 'Urban Harvests & Healthy Living',
          subtitle: 'Self-watering windowsill microgreen kits, organic superfood planters, and clean wellness growing setups.'
        }
      },
      {
        id: 'cat-living-features',
        type: 'features_list',
        title: 'Wellness Living Highlights',
        enabled: true,
        order: 2,
        data: {
          features: [
            { title: 'Fast 7-Day Microgreens', desc: 'Fresh nutritious greens packed with 40x the micronutrients of mature vegetables.' },
            { title: 'Complete Starter Kits', desc: 'Includes coco coir discs, food-grade trays, and organic heirloom seeds ready to harvest.' },
            { title: 'Clean Kitchen Farming', desc: 'Soil-less, odorless, clean growing setups designed for modern urban apartments.' }
          ]
        }
      }
    ]
  },

  // 3. Support & Service Pages
  {
    id: 'help-faqs',
    slug: 'help-faqs',
    title: 'Help & FAQs',
    description: 'Customer help center, order guidelines and support articles',
    category: 'Support',
    status: 'published',
    template: 'standard',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    sections: [
      {
        id: 'faq-section-main',
        type: 'faq',
        title: 'Master FAQ Directory',
        enabled: true,
        order: 1,
        data: {
          title: 'Frequently Answered Questions',
          limit: 12
        }
      }
    ]
  },
  {
    id: 'track-active-order',
    slug: 'track-active-order',
    title: 'Track Active Order',
    description: 'Real-time AWB tracking, courier lookup and delivery updates',
    category: 'Support',
    status: 'published',
    template: 'standard',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    sections: [
      {
        id: 'track-info',
        type: 'rich_text',
        title: 'Order Tracking Instructions',
        enabled: true,
        order: 1,
        data: {
          title: 'Live Shipment Tracking',
          content: '<p>Enter your 10-digit BioCart Order Number or Courier Tracking AWB below to see real-time dispatch milestones from our warehouse to your doorstep.</p>'
        }
      }
    ]
  },
  {
    id: 'soil-consultation',
    slug: 'soil-consultation',
    title: 'Soil Consultation',
    description: 'Professional farm and garden soil microbiome analysis',
    category: 'Support',
    status: 'published',
    template: 'standard',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    sections: [
      {
        id: 'soil-info',
        type: 'rich_text',
        title: 'Soil Consultation Overview',
        enabled: true,
        order: 1,
        data: {
          title: 'Professional Soil Health Diagnostics',
          content: '<p>Book an interactive 1-on-1 session with BioCart agronomists to test NPK balance, EC salinity, microbial count, and obtain customized organic enrichment plans.</p>'
        }
      }
    ]
  },
  {
    id: 'contact-agri-expert',
    slug: 'contact-agri-expert',
    title: 'Contact Agri-Expert',
    description: 'Consultation with BioCart certified agronomists and botanists',
    category: 'Support',
    status: 'published',
    template: 'standard',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    sections: [
      {
        id: 'expert-hero',
        type: 'hero',
        title: 'Agri-Expert Consultation',
        enabled: true,
        order: 1,
        data: {
          badgeText: 'Live Agronomy Consultation',
          titleLine1: 'Talk to Certified BioCart Soil Scientists',
          subtitle: 'Receive tailored agronomic advice on organic pest defense, EC salinity balance, and optimal substrate preparation for your garden or farm.'
        }
      },
      {
        id: 'expert-form',
        type: 'contact_form',
        title: 'Consultation Booking Form',
        enabled: true,
        order: 2,
        data: {
          title: 'Schedule Soil or Crop Consultation',
          subtitle: 'Our field scientists respond within 12 hours with actionable biological growing plans.'
        }
      },
      {
        id: 'expert-highlights',
        type: 'features_list',
        title: 'Why Consult BioCart Agronomists?',
        enabled: true,
        order: 3,
        data: {
          features: [
            { title: 'Zero Synthetic Chemicals', desc: 'Prescriptions rely entirely on beneficial microbes, mycorrhizae, and botanical bio-extracts.' },
            { title: 'Tailored to Indian Climates', desc: 'Customized recommendations taking into account local tap water alkalinity and regional ambient humidity.' },
            { title: 'Crop & Balcony Specific', desc: 'Whether growing microgreens on a 5th-floor balcony or managing acres of mango orchards.' }
          ]
        }
      }
    ]
  },
  {
    id: 'partner-with-us',
    slug: 'partner-with-us',
    title: 'Partner with Us',
    description: 'Institutional farming, CSR sponsorships and producer tie-ups',
    category: 'Support',
    status: 'published',
    template: 'standard',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    sections: [
      {
        id: 'partner-hero',
        type: 'hero',
        title: 'Partner with BioCart',
        enabled: true,
        order: 1,
        data: {
          badgeText: 'Institutional & Business Alliances',
          titleLine1: 'Scale Sustainable Agriculture Together',
          subtitle: 'We collaborate with commercial growers, universities, state agriculture departments, and nursery chains across India.'
        }
      },
      {
        id: 'partner-pillars',
        type: 'partner_inquiry',
        title: 'Partnership Channels',
        enabled: true,
        order: 2,
        data: {
          eyebrow: 'Institutional Alliance Models',
          heading: 'Building India’s Organic Soil Backbone',
          description: 'BioCart partners with verified agro-producers, commercial nurseries, CSR foundations, and academic institutions to scale regenerative inputs nationwide.',
          pillars: [
            { title: 'Commercial Nurseries', desc: 'Wholesale supplies of washed low-EC coir pots, plugs, and seedling starters at factory rates.' },
            { title: 'CSR & Environmental Projects', desc: 'Verified soil carbon remediation and farmer training programs subsidized through corporate foundations.' },
            { title: 'Bio-Input Producers', desc: 'List your certified organic formulations on BioCart’s pan-India verified marketplace platform.' }
          ],
          ctaText: 'Submit Partnership Proposal'
        }
      },
      {
        id: 'partner-form',
        type: 'contact_form',
        title: 'Partnership Application Form',
        enabled: true,
        order: 3,
        data: {
          title: 'Direct Partnership & Alliance Inquiry',
          subtitle: 'Submit your organization details to connect directly with BioCart leadership.'
        }
      }
    ]
  },
  {
    id: 'dealer-locator',
    slug: 'dealer-locator',
    title: 'Dealer Locator',
    description: 'Locate authorized offline distributors and partner nurseries',
    category: 'Support',
    status: 'published',
    template: 'standard',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    sections: [
      {
        id: 'locator-hero',
        type: 'hero',
        title: 'Authorized Dealers Network',
        enabled: true,
        order: 1,
        data: {
          badgeText: 'Offline Retail Stores & Nurseries',
          titleLine1: 'Find BioCart Products Near You',
          subtitle: 'Locate certified stockists, partner organic nurseries, and regional distributors carrying authentic BioCart growing mediums.'
        }
      },
      {
        id: 'locator-info',
        type: 'rich_text',
        title: 'Distributor Directory Guidelines',
        enabled: true,
        order: 2,
        data: {
          title: 'Authorized Offline Retailers & Warehouses',
          content: '<p>BioCart verified products are stocked across 40+ premier nurseries and agricultural supply depots across Andhra Pradesh, Telangana, Karnataka, and Tamil Nadu.</p><p>Interested in becoming an authorized regional stockist or exclusive district dealer? Use the contact form below to apply for dealership rights.</p>'
        }
      },
      {
        id: 'locator-dealer-cta',
        type: 'cta_banner',
        title: 'Apply for Dealership Rights',
        enabled: true,
        order: 3,
        data: {
          title: 'Become an Authorized BioCart District Dealer',
          subtitle: 'Exclusive territorial distribution rights, factory pricing, and promotional nursery displays provided.',
          buttonText: 'Submit Dealer Registration',
          buttonUrl: '#contact'
        }
      }
    ]
  },

  // 4. Legal & Regulatory Policy Pages
  {
    id: 'privacy-policy',
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    description: 'Data protection, cookie compliance and security policies',
    category: 'Legal',
    status: 'published',
    template: 'legal',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    sections: [
      {
        id: 'privacy-sec-1',
        type: 'rich_text',
        title: '1. Information We Collect',
        enabled: true,
        order: 1,
        data: {
          title: '1. Information We Collect',
          content: '<p>BioCart collects basic account details such as your name, delivery address, phone number, and email strictly for processing fulfillment orders and communication.</p>'
        }
      },
      {
        id: 'privacy-sec-2',
        type: 'rich_text',
        title: '2. Payment Security',
        enabled: true,
        order: 2,
        data: {
          title: '2. Payment Security & Encryption',
          content: '<p>We never store credit card or banking credentials on our servers. All transactions are securely routed through PCI-DSS Level 1 certified gateways.</p>'
        }
      }
    ]
  },
  {
    id: 'terms-of-service',
    slug: 'terms-of-service',
    title: 'Terms of Service',
    description: 'Marketplace conditions, customer commitments & user agreement',
    category: 'Legal',
    status: 'published',
    template: 'legal',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    sections: [
      {
        id: 'terms-sec-1',
        type: 'rich_text',
        title: 'Platform Terms & Use',
        enabled: true,
        order: 1,
        data: {
          title: 'Terms of Use',
          content: '<p>By placing an order on BioCart, you agree to our marketplace distribution guidelines and certified organic product specifications.</p>'
        }
      }
    ]
  },
  {
    id: 'shipping-customs',
    slug: 'shipping-customs',
    title: 'Shipping Policy',
    description: 'Pan-India delivery schedules, plastic-free packaging & rates',
    category: 'Legal',
    status: 'published',
    template: 'legal',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    sections: [
      {
        id: 'shipping-sec-1',
        type: 'rich_text',
        title: 'Dispatch & Delivery Standards',
        enabled: true,
        order: 1,
        data: {
          title: '100% Plastic-Free Fast Shipping',
          content: '<p>Orders are dispatched within 24 hours of confirmation. We deliver across India within 3–5 business days using biodegradable corrugated containers and paper water-activated tape.</p>'
        }
      }
    ]
  },
  {
    id: 'returns-refunds',
    slug: 'returns-refunds',
    title: 'Returns & Refund Policy',
    description: 'Damaged shipment claims, returns window and refund processing',
    category: 'Legal',
    status: 'published',
    template: 'legal',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    sections: [
      {
        id: 'return-sec-1',
        type: 'rich_text',
        title: 'Return Policy Guidelines',
        enabled: true,
        order: 1,
        data: {
          title: '7-Day Return Guarantee',
          content: '<p>If any product arrives damaged or tampered, initiate a return request with photos within 7 days for a 100% replacement or instant refund to your source payment method.</p>'
        }
      }
    ]
  },
  {
    id: 'csr-initiatives',
    slug: 'csr-initiatives',
    title: 'CSR Initiatives',
    description: 'Tree planting drives, circular soil training and farmer subsidies',
    category: 'Legal',
    status: 'published',
    template: 'legal',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    sections: [
      {
        id: 'csr-sec-1',
        type: 'rich_text',
        title: 'Farmer Soil Health Workshops',
        enabled: true,
        order: 1,
        data: {
          title: 'Regenerating Indian Farmlands',
          content: '<p>A portion of every BioCart purchase subsidizes double-screened vermicompost seed treatments for smallholder farmers across rural Andhra Pradesh and Telangana.</p>'
        }
      }
    ]
  },
  {
    id: 'compliance-audits',
    slug: 'compliance-audits',
    title: 'Compliance Audits',
    description: 'Laboratory testing reports, organic certifications & ISO standards',
    category: 'Legal',
    status: 'published',
    template: 'legal',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    sections: [
      {
        id: 'compliance-sec-1',
        type: 'rich_text',
        title: 'Certified Organic Standards',
        enabled: true,
        order: 1,
        data: {
          title: 'Independent Laboratory Testing',
          content: '<p>Every batch of vermicompost, neem cake, and bio-stimulant undergoes independent chromatography tests to certify zero synthetic pesticide traces and low EC salinity.</p>'
        }
      }
    ]
  }
];
