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
    seo: {
      title: 'Help & FAQs | BioCart Customer Support',
      description: 'Frequently asked questions regarding ordering, payment methods, pan-India shipping, live tracking, and biological soil care products.'
    },
    sections: [
      {
        id: 'faq-hero',
        type: 'hero',
        title: 'Customer Help Center',
        enabled: true,
        order: 1,
        data: {
          badgeText: 'BioCart Customer Helpdesk',
          titleLine1: 'Frequently Asked Questions & Support',
          subtitle: 'Find comprehensive answers on ordering, payments, plastic-free shipping, living soil amendments, and account assistance.'
        }
      },
      {
        id: 'faq-features',
        type: 'features_list',
        title: 'Support Channels & Guarantees',
        enabled: true,
        order: 2,
        data: {
          features: [
            { title: '24-Hour Dispatch', desc: 'Standard consumer orders leave our Andhra and Karnataka facilities within 24 business hours.' },
            { title: 'Certified Agronomists', desc: 'Complimentary technical guidance on application dosages, EC levels, and organic pest remedies.' },
            { title: 'Direct Care Desk', desc: 'Reach our team directly at care@biocart.co.in or call +91 91542 22539 (Mon–Sat 9AM–6PM IST).' }
          ]
        }
      },
      {
        id: 'faq-section-main',
        type: 'faq',
        title: 'Comprehensive Knowledge Base',
        enabled: true,
        order: 3,
        data: {
          title: 'Frequently Asked Questions',
          items: [
            {
              q: 'How do I place an order on BioCart?',
              a: 'Browse our catalog under the Shop tab, select your preferred product volume or weight variant, and click "Add to Cart". When you are ready, click the Cart icon at the top right to review your items, enter your delivery address, select a payment method, and complete checkout.'
            },
            {
              q: 'What payment methods do you accept?',
              a: 'We accept all major Indian payment methods through our PCI-DSS compliant Razorpay gateway: UPI (Google Pay, PhonePe, Paytm, BHIM), Net Banking across 50+ Indian banks, Credit and Debit Cards (Visa, MasterCard, RuPay), and Cash on Delivery (COD) for eligible domestic pincodes.'
            },
            {
              q: 'How long does delivery take and what are the shipping charges?',
              a: 'Orders are dispatched within 24 to 48 hours of confirmation. Delivery across South India takes 2–3 business days, while Western, Northern, and Eastern destinations take 3–5 business days. Shipping is completely FREE on all orders of ₹1,999 and above. A nominal standard delivery fee of ₹99 applies to smaller orders.'
            },
            {
              q: 'How can I track my active shipment?',
              a: 'Once your order is handed over to our express courier partner (BlueDart / Express Logistics), an automated SMS and email containing your tracking AWB number is sent. You can also visit our "Track Active Order" page and enter your 10-digit BioCart Order Number.'
            },
            {
              q: 'What is your return and refund policy for damaged parcels?',
              a: 'We offer a 7-day transit damage replacement or refund guarantee. If your package arrives damaged or leaking, take photos of the outer carton with the shipping label and the damaged items, and submit a ticket to care@biocart.co.in within 7 days of delivery. Verified claims receive a 100% free replacement or direct bank refund within 5–7 business days.'
            },
            {
              q: 'How should I store organic vermicompost and liquid bio-fertilizers?',
              a: 'Store all biological soil inputs in a cool, shaded area away from direct sunlight and heat (optimal temperature 15°C–30°C). Keep bags slightly aerated and maintain moderate moisture. Do not expose live microbial inoculants or mycorrhizae to chemical pesticides or chlorine-treated tap water.'
            },
            {
              q: 'Can I purchase bulk container quantities or apply for regional dealership?',
              a: 'Yes. Commercial nurseries, organic farm collectives, and distributors can access factory contract pricing through our "Dealer Portal" or submit institutional inquiries on the "Partner with Us" page.'
            },
            {
              q: 'How do I change my account password or update my delivery address?',
              a: 'Click your profile avatar in the header to open your Customer Dashboard. Under the "Profile" tab you can update your contact details, and under the "Addresses" tab you can add, edit, or set default delivery addresses.'
            }
          ]
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
    seo: {
      title: 'Track Active Order | BioCart Express Logistics',
      description: 'Enter your BioCart Order ID to view real-time packing, transit, and door-delivery status.'
    },
    sections: [
      {
        id: 'track-hero',
        type: 'hero',
        title: 'Shipment Tracking',
        enabled: true,
        order: 1,
        data: {
          badgeText: 'Express Domestic Logistics',
          titleLine1: 'Track Your Active Consignment',
          subtitle: 'Verify live transit milestones from our central Andhra and Karnataka facilities to your doorstep.'
        }
      },
      {
        id: 'track-lookup-block',
        type: 'order_tracking',
        title: 'Live Order Tracker',
        enabled: true,
        order: 2,
        data: {
          title: 'Live Order Tracking',
          subtitle: 'Enter your 10-digit BioCart Order Number or Firebase ID to monitor live dispatch status.'
        }
      },
      {
        id: 'track-instructions',
        type: 'features_list',
        title: 'Dispatch Standards',
        enabled: true,
        order: 3,
        data: {
          features: [
            { title: 'Automated SMS Alerts', desc: 'Receive real-time courier AWB links as soon as your parcel is scanned at the dispatch terminal.' },
            { title: '100% Plastic-Free Packaging', desc: 'Heavy-duty corrugated boxes sealed with natural starch water-activated tape for zero plastic transit.' },
            { title: 'Priority Dispatch Support', desc: 'Need urgent delivery acceleration? Contact our logistics desk at care@biocart.co.in or +91 91542 22539.' }
          ]
        }
      }
    ]
  },
  {
    id: 'shipping-customs',
    slug: 'shipping-customs',
    title: 'Shipping Policy',
    description: 'Pan-India delivery schedules, plastic-free packaging & rates',
    category: 'Support',
    status: 'published',
    template: 'legal',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    seo: {
      title: 'Shipping & Delivery Policy | BioCart India',
      description: 'Comprehensive shipping policy detailing order processing times, pan-India delivery estimates, plastic-free packaging, and carrier partners.'
    },
    sections: [
      {
        id: 'shipping-hero',
        type: 'hero',
        title: 'Shipping & Delivery Policy',
        enabled: true,
        order: 1,
        data: {
          badgeText: 'Transparent Logistics Standards',
          titleLine1: 'Pan-India Eco-Delivery Standards',
          subtitle: 'Learn about our 24-hour dispatch commitment, certified zero-plastic packing, regional transit timelines, and delivery fees.'
        }
      },
      {
        id: 'shipping-features',
        type: 'features_list',
        title: 'Key Delivery Highlights',
        enabled: true,
        order: 2,
        data: {
          features: [
            { title: '24-48 Hour Dispatch', desc: 'All confirmed orders are packed fresh and dispatched from our facilities within 1–2 business days.' },
            { title: 'Free Pan-India Delivery', desc: 'Free express shipping on all domestic orders of ₹1,999 and above; ₹99 standard fee on smaller orders.' },
            { title: '100% Recyclable Packaging', desc: 'Zero bubble wrap or single-use plastics — packed in biodegradable corrugated paper and organic jute ties.' }
          ]
        }
      },
      {
        id: 'shipping-full-policy',
        type: 'rich_text',
        title: 'Official Shipping & Dispatch Policy',
        enabled: true,
        order: 3,
        data: {
          heading: 'BioCart Domestic Shipping Guidelines (Updated 2026)',
          content: `
            <h3>1. Order Processing & Dispatch Timelines</h3>
            <p>All orders placed on BioCart are processed and dispatched within <strong>24 to 48 business hours</strong> (excluding Sundays and national holidays). Live microbial amendments and organic potting mixes are inspected and batch-verified prior to dispatch to preserve biological viability.</p>
            
            <h3>2. Regional Delivery Estimates Across India</h3>
            <ul>
              <li><strong>Southern States (Andhra Pradesh, Telangana, Karnataka, Tamil Nadu, Kerala):</strong> 2 to 3 business days.</li>
              <li><strong>Western & Central States (Maharashtra, Gujarat, Madhya Pradesh):</strong> 3 to 4 business days.</li>
              <li><strong>Northern & Eastern States (Delhi-NCR, UP, Punjab, West Bengal, Odisha):</strong> 4 to 6 business days.</li>
              <li><strong>North-Eastern States & Remote Locations:</strong> 6 to 8 business days.</li>
            </ul>

            <h3>3. Shipping Rates & Free Shipping Threshold</h3>
            <p>We believe in transparent pricing without hidden checkout surcharges. Orders with a cart subtotal of <strong>₹1,999 or greater</strong> qualify for complimentary FREE express shipping nationwide. For orders below this threshold, a flat delivery fee of <strong>₹99</strong> is added at checkout.</p>

            <h3>4. 100% Plastic-Free Packaging Commitment</h3>
            <p>In accordance with our ecological charter, BioCart uses zero non-biodegradable single-use plastic films. All parcels are packaged in FSC-certified corrugated boxes, cushioned with recycled paper shreds or natural coir fiber, and sealed using water-activated starch paper tape.</p>

            <h3>5. Handling In-Transit Delays & Damaged Parcels</h3>
            <p>While our logistics partners maintain a 98.7% on-time delivery record, adverse weather or regional restrictions can occasionally cause delays. If a parcel arrives with severe external crushing or product leakage, please sign the delivery receipt as "Damaged upon receipt" and notify us within 7 days at <strong>care@biocart.co.in</strong> with photos for an immediate replacement.</p>

            <h3>6. Export Consignments & Commercial Freight</h3>
            <p>International and containerized export freight (FCL coir peat blocks, high-density grow bags) originates from Port of Chennai or Krishnapatnam Port. All export consignments include mandatory Phytosanitary Inspection Certificates and Certificates of Origin issued by government agricultural authorities.</p>
          `
        }
      }
    ]
  },
  {
    id: 'returns-refunds',
    slug: 'returns-refunds',
    title: 'Returns & Refunds',
    description: 'Damaged shipment claims, returns window and refund processing',
    category: 'Support',
    status: 'published',
    template: 'legal',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    seo: {
      title: 'Returns & Refund Policy | BioCart Guarantee',
      description: 'Review our 7-day transit damage replacement guarantee, refund processing timelines, and customer satisfaction guidelines.'
    },
    sections: [
      {
        id: 'returns-hero',
        type: 'hero',
        title: 'Returns & Refunds',
        enabled: true,
        order: 1,
        data: {
          badgeText: 'Customer Satisfaction Guarantee',
          titleLine1: 'Returns, Replacements & Refund Policy',
          subtitle: 'We stand behind the purity and physical integrity of every BioCart agricultural input. Review our fair return protocols below.'
        }
      },
      {
        id: 'returns-features',
        type: 'features_list',
        title: 'Our Return Commitments',
        enabled: true,
        order: 2,
        data: {
          features: [
            { title: '7-Day Damage Window', desc: 'Report any damaged containers, tampering, or missing items within 7 days of delivery.' },
            { title: '100% Free Replacements', desc: 'Verified transit defects receive immediate expedited replacement dispatch at zero additional cost.' },
            { title: 'Fast 5–7 Day Refunds', desc: 'Approved refunds are credited directly to your original payment method (bank account or UPI).' }
          ]
        }
      },
      {
        id: 'returns-full-policy',
        type: 'rich_text',
        title: 'Complete Returns & Refund Terms',
        enabled: true,
        order: 3,
        data: {
          heading: 'BioCart Customer Refund Charter',
          content: `
            <h3>1. Eligibility for Returns & Replacements</h3>
            <p>Due to the biological nature of organic horticulture inputs (such as live mycorrhizae, liquid microbial inoculants, and open-pollinated seeds), products cannot be returned once opened or used. However, you are 100% covered for:</p>
            <ul>
              <li>Physical transit damage or container puncture during shipping.</li>
              <li>Incorrect product or variant received versus what was ordered.</li>
              <li>Missing items from a multi-item package.</li>
              <li>Defective physical hardware or gardening accessories.</li>
            </ul>

            <h3>2. How to Submit a Claim</h3>
            <p>To report an issue, please email <strong>care@biocart.co.in</strong> or WhatsApp <strong>+91 91542 22539</strong> within <strong>7 calendar days</strong> of receiving your parcel. Please include:</p>
            <ul>
              <li>Your BioCart 10-digit Order Number (e.g. ORD-2026-XXXXX).</li>
              <li>Clear photographs of the outer carton showing the shipping label and barcode.</li>
              <li>Clear photographs of the damaged product and factory seal.</li>
            </ul>

            <h3>3. Review and Resolution Process</h3>
            <p>Our quality control team reviews all claims within 24 business hours. Once verified, you may choose between an <strong>immediate expedited replacement</strong> dispatched at our expense, or a <strong>full refund</strong>.</p>

            <h3>4. Refund Timelines & Payment Methods</h3>
            <p>Approved refunds are processed immediately by our accounts desk. For online payments (UPI, Debit/Credit Card, Net Banking), funds reflect in your source account within <strong>5 to 7 banking business days</strong> depending on your bank. For Cash on Delivery (COD) orders, refunds are issued via instant UPI transfer or BioCart store credit vouchers according to customer preference.</p>

            <h3>5. Order Cancellation Policy</h3>
            <p>Orders may be cancelled free of charge prior to physical warehouse dispatch. Once a parcel has been scanned into the courier carrier network, cancellation is no longer possible and the standard 7-day return procedure applies upon delivery.</p>
          `
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
    seo: {
      title: 'Soil & Plant-Care Consultation | BioCart Agri-Desk',
      description: 'Book customized organic soil diagnostics and crop health advice with certified BioCart agronomists.'
    },
    sections: [
      {
        id: 'soil-hero',
        type: 'hero',
        title: 'Soil & Plant-Care Diagnostics',
        enabled: true,
        order: 1,
        data: {
          badgeText: 'Agronomy Consultation Desk',
          titleLine1: 'Scientific Soil Diagnostics & Crop Advice',
          subtitle: 'Empower your balcony garden or farm with customized biological nutrition plans and zero-chemical pest solutions.'
        }
      },
      {
        id: 'soil-form-block',
        type: 'soil_consultation',
        title: 'Diagnostic Intake Form',
        enabled: true,
        order: 2,
        data: {
          title: 'Book Soil & Plant-Care Diagnostics',
          subtitle: 'Submit detailed growing symptoms to receive personalized, zero-chemical botanical treatment protocols from BioCart agronomists.'
        }
      },
      {
        id: 'soil-pillars',
        type: 'features_list',
        title: 'How Our Consultation Works',
        enabled: true,
        order: 3,
        data: {
          features: [
            { title: 'Nutrient Balance Diagnosis', desc: 'Identify nitrogen, phosphorus, potassium, and micronutrient chlorosis patterns in leaves.' },
            { title: 'Substrate & Salinity Guidance', desc: 'Optimize electrical conductivity (low EC) and aeration for root zone vitality.' },
            { title: 'Botanical Pest Prescriptions', desc: 'Targeted biological pest controls utilizing cold-pressed neem and beneficial microflora.' }
          ]
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
    seo: {
      title: 'Contact Agri-Expert | BioCart Agronomy Desk',
      description: 'Speak directly with verified BioCart soil scientists and agricultural consultants for professional crop solutions.'
    },
    sections: [
      {
        id: 'expert-hero',
        type: 'hero',
        title: 'Agri-Expert Consultation',
        enabled: true,
        order: 1,
        data: {
          badgeText: 'Direct Agronomist Helpdesk',
          titleLine1: 'Talk to Certified BioCart Soil Scientists',
          subtitle: 'Receive tailored agronomic advice on organic pest defense, EC salinity balance, and optimal substrate preparation for your garden or farm.'
        }
      },
      {
        id: 'expert-contact-form',
        type: 'contact_form',
        title: 'Expert Consultation Booking',
        enabled: true,
        order: 2,
        data: {
          title: 'Schedule Agronomy Advisory Session',
          subtitle: 'Our field scientists respond within 12–24 business hours with actionable biological growing plans.'
        }
      },
      {
        id: 'expert-features',
        type: 'features_list',
        title: 'Why Consult BioCart Agronomists?',
        enabled: true,
        order: 3,
        data: {
          features: [
            { title: 'Zero Synthetic Chemicals', desc: 'All recommendations rely strictly on beneficial microbes, mycorrhizae, and botanical bio-extracts.' },
            { title: 'Adapted to Indian Climates', desc: 'Customized advice accounting for tropical summer heat, monsoon humidity, and municipal water hardness.' },
            { title: 'Balcony to Commercial Scale', desc: 'Whether managing urban balcony pots or multi-acre orchard developments.' }
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
    seo: {
      title: 'Partner with BioCart | Institutional & Commercial Alliances',
      description: 'Collaborate with India’s leading ecological horticulture brand for commercial nursery inputs, CSR soil health, and bulk distribution.'
    },
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
          subtitle: 'We collaborate with commercial nurseries, organic producer clusters, university agronomy departments, and corporate CSR foundations across India.'
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
            { title: 'CSR & Environmental Foundations', desc: 'Verified soil carbon remediation and farmer training programs subsidized through corporate foundations.' },
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
          subtitle: 'Submit your organization details to connect directly with BioCart leadership and supply chain directors.'
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
    seo: {
      title: 'Dealer Locator | BioCart Offline Distribution Centers',
      description: 'Find authorized BioCart distribution centers, certified stockists, and partner nurseries across Andhra Pradesh, Telangana, Karnataka, and Tamil Nadu.'
    },
    sections: [
      {
        id: 'locator-hero',
        type: 'hero',
        title: 'Authorized Dealers Network',
        enabled: true,
        order: 1,
        data: {
          badgeText: 'Verified Regional Facilities',
          titleLine1: 'Find BioCart Products Near You',
          subtitle: 'Locate certified stockists, partner organic nurseries, and regional logistics facilities carrying authentic BioCart growing mediums.'
        }
      },
      {
        id: 'locator-interactive-block',
        type: 'dealer_locator',
        title: 'Verified Distribution Points',
        enabled: true,
        order: 2,
        data: {
          title: 'Verified Regional Distribution Centers',
          subtitle: 'Browse central processing depots and partner facilities across South and Central India.'
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
          buttonText: 'Open Dealer Portal & Rate Simulator',
          buttonUrl: '#dealer-portal'
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
    seo: {
      title: 'Privacy Policy | BioCart (Sindulis Agro Products)',
      description: 'Review how BioCart collects, uses, and safeguards customer data in compliance with Indian Information Technology regulations.'
    },
    sections: [
      {
        id: 'privacy-hero',
        type: 'hero',
        title: 'Privacy Policy',
        enabled: true,
        order: 1,
        data: {
          badgeText: 'Legal & Data Governance',
          titleLine1: 'Privacy & Data Protection Policy',
          subtitle: 'Sindulis Agro Products Pvt. Ltd. is committed to ethical data handling and zero-compromise customer security.'
        }
      },
      {
        id: 'privacy-content-main',
        type: 'rich_text',
        title: 'Official Privacy Statement',
        enabled: true,
        order: 2,
        data: {
          heading: 'BioCart Digital Privacy Charter (Effective 2026)',
          content: `
            <h3>1. Data Controller Identification</h3>
            <p>This Privacy Policy applies to the website, digital marketplace, and services operated by <strong>Sindulis Agro Products Private Limited</strong> ("BioCart", "we", "us", or "our"), with registered corporate operations located at Industrial Corridor Area, Tanuku, West Godavari District, Andhra Pradesh - 534211, India.</p>

            <h3>2. Categories of Information We Collect</h3>
            <p>We collect only information essential to fulfill your orders and deliver exceptional customer support:</p>
            <ul>
              <li><strong>Contact & Identity Data:</strong> Name, email address, mobile phone number, and physical delivery address.</li>
              <li><strong>Order & Fulfillment Data:</strong> Items purchased, order value, payment status, delivery preferences, and courier tracking identifiers.</li>
              <li><strong>Technical & Session Data:</strong> IP address, device type, browser information, and session cookies necessary to maintain shopping cart items.</li>
            </ul>

            <h3>3. Payment Information Security & Zero Card Storage</h3>
            <p>BioCart prioritizes financial confidentiality. <strong>We never store, log, or process credit card numbers, CVV codes, net banking passwords, or UPI PINs on our servers.</strong> All digital payments are handled through PCI-DSS Level 1 certified payment gateways (Razorpay). Communications are protected by end-to-end 256-bit TLS encryption.</p>

            <h3>4. Purpose and Legal Grounds for Data Processing</h3>
            <p>We process personal data strictly for:</p>
            <ul>
              <li>Processing, invoicing, packing, and dispatching orders.</li>
              <li>Transmitting transactional SMS/email delivery notifications and tracking numbers.</li>
              <li>Providing agronomic advice and responding to customer service tickets.</li>
              <li>Complying with statutory GST and Indian commercial taxation mandates.</li>
            </ul>

            <h3>5. Third-Party Service Providers</h3>
            <p>We partner only with verified service providers under strict confidentiality agreements: Google Firebase (secure cloud hosting, database authentication), Razorpay (encrypted payment gateway), and authorized logistics couriers (BlueDart / Express Logistics) solely for package delivery.</p>

            <h3>6. Data Retention and Security Protocols</h3>
            <p>We retain order and invoicing records as required by Indian accounting laws. We implement technical and organizational controls including Firebase role-based security rules, multi-factor authentication, and encrypted data storage to prevent unauthorized access or disclosure.</p>

            <h3>7. Customer Rights & Privacy Officer Contact</h3>
            <p>You have the right to inspect, update, or request the deletion of your account and address information. To exercise your data rights or contact our designated Grievance Officer, email <strong>privacy@biocart.co.in</strong> or write to: Grievance Officer, Sindulis Agro Products Pvt. Ltd., Tanuku, Andhra Pradesh - 534211.</p>
          `
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
    seo: {
      title: 'Terms of Service | BioCart Commercial Agreement',
      description: 'Official terms and conditions governing the purchase and distribution of BioCart certified organic horticulture inputs.'
    },
    sections: [
      {
        id: 'terms-hero',
        type: 'hero',
        title: 'Terms of Service',
        enabled: true,
        order: 1,
        data: {
          badgeText: 'Legal Agreement',
          titleLine1: 'Terms of Service & Marketplace Agreement',
          subtitle: 'Please review the terms and conditions governing purchases, accounts, and biological product use on BioCart.'
        }
      },
      {
        id: 'terms-content-main',
        type: 'rich_text',
        title: 'Master Terms of Use',
        enabled: true,
        order: 2,
        data: {
          heading: 'Terms and Conditions of Use (Updated 2026)',
          content: `
            <h3>1. Acceptance of Terms & Eligibility</h3>
            <p>By browsing, creating an account, or placing an order on BioCart (biocart.in), you enter into a binding agreement with <strong>Sindulis Agro Products Private Limited</strong>. You certify that you are at least 18 years of age and competent to enter into a legally enforceable contract under the Indian Contract Act, 1872.</p>

            <h3>2. Account Registration and Security</h3>
            <p>When creating an account, you must provide truthful, current, and complete details. You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account.</p>

            <h3>3. Product Specifications & Organic Agricultural Use</h3>
            <p>BioCart products are formulated for horticultural, agricultural, and urban gardening applications. While our formulations are tested for electrical conductivity (low EC), moisture content, and organic purity, agricultural yields vary depending on local weather, ambient temperature, water quality, and user handling. Product descriptions and application guidelines are educational and do not constitute a warranty of specific crop harvest quantities.</p>

            <h3>4. Pricing, Taxes & GST Invoicing</h3>
            <p>All prices displayed on the website are in Indian Rupees (INR) and are inclusive of applicable Goods and Services Tax (GST). A formal GST tax invoice is issued for every completed transaction. We reserve the right to correct typographical pricing errors prior to order dispatch.</p>

            <h3>5. Order Acceptance & Right of Cancellation</h3>
            <p>Receipt of an electronic order confirmation does not signify our final acceptance of your order. We reserve the right to decline or limit order quantities in the event of stock unavailability, pricing errors, or suspected unauthorized or fraudulent transactions.</p>

            <h3>6. Pan-India Shipping & Risk of Loss</h3>
            <p>Title and risk of loss for all purchased goods pass to you upon delivery by the carrier to your designated shipping address. Delivery estimates are indicative and subject to regional courier transit conditions.</p>

            <h3>7. Intellectual Property & Trademarks</h3>
            <p>The trademarks "BioCart", "Sindulis Agro Products", logos, graphics, and proprietary product names are the exclusive intellectual property of Sindulis Agro Products Private Limited. Unauthorized duplication, reverse engineering, or commercial exploitation is strictly prohibited.</p>

            <h3>8. Limitation of Liability</h3>
            <p>To the maximum extent permitted by applicable Indian law, BioCart shall not be liable for any indirect, incidental, special, or consequential damages arising from the use or inability to use our products or services. In any event, our aggregate liability shall not exceed the total amount paid by you for the specific product giving rise to the claim.</p>

            <h3>9. Governing Law, Jurisdiction & Dispute Resolution</h3>
            <p>These Terms of Service are governed by and construed in accordance with the laws of India. Any legal dispute, controversy, or claim arising out of or in connection with these terms shall be subject to the exclusive jurisdiction of the competent courts in <strong>West Godavari District, Andhra Pradesh, India</strong>.</p>
          `
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
    seo: {
      title: 'CSR & Environmental Initiatives | BioCart Sustainability',
      description: 'Discover BioCart’s community programs supporting rural smallholder farmer soil health, plastic-free packaging, and regenerative agriculture.'
    },
    sections: [
      {
        id: 'csr-hero',
        type: 'hero',
        title: 'Community & CSR Initiatives',
        enabled: true,
        order: 1,
        data: {
          badgeText: 'Social & Ecological Responsibility',
          titleLine1: 'Regenerating Indian Soil & Supporting Farmers',
          subtitle: 'BioCart is dedicated to environmental stewardship, zero-plastic supply chains, and smallholder farmer training.'
        }
      },
      {
        id: 'csr-features',
        type: 'features_list',
        title: 'Core Impact Pillars',
        enabled: true,
        order: 2,
        data: {
          features: [
            { title: 'Smallholder Soil Workshops', desc: 'Free practical training sessions on organic compost culturing and microbial pest management for local farming clusters.' },
            { title: '100% Plastic-Free Mission', desc: 'Eliminating synthetic nursery seed trays by replacing them with biodegradable coir pots and compostable packaging.' },
            { title: 'Agricultural Waste Upcycling', desc: 'Transforming discarded coconut husks and biomass into high-value aerated growing mediums.' }
          ]
        }
      },
      {
        id: 'csr-main-story',
        type: 'rich_text',
        title: 'Our Sustainability Commitments',
        enabled: true,
        order: 3,
        data: {
          heading: 'Fostering Regenerative Agriculture Across Rural Communities',
          content: `
            <h3>Community Soil Health Clinics</h3>
            <p>Across rural Andhra Pradesh and Telangana, synthetic fertilizer overuse has depleted organic carbon levels in agricultural soil. BioCart conducts regular community soil health workshops educating farmers on restoring soil organic matter through double-screened vermicompost, beneficial mycorrhizae, and green manuring.</p>

            <h3>Zero-Plastic Packaging Transformation</h3>
            <p>Traditional consumer gardening generates tons of black non-recyclable plastic pots and film bags each year. BioCart has engineered 100% biodegradable coir fiber pots and replaces plastic transit wrap with water-activated starch paper tape and recycled corrugated packaging.</p>

            <h3>Empowering Rural Agro-Artisans</h3>
            <p>Our coir fiber and pot manufacturing centers source raw coconut husks directly from local farmers and provide skilled employment opportunities for women in rural cooperative societies across the Godavari delta region.</p>
          `
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
    seo: {
      title: 'Compliance & Quality Certifications | BioCart Laboratory Standards',
      description: 'Review our certified organic quality control protocols, low-EC batch testing parameters, and compliance with Indian agricultural regulations.'
    },
    sections: [
      {
        id: 'compliance-hero',
        type: 'hero',
        title: 'Compliance & Quality Standards',
        enabled: true,
        order: 1,
        data: {
          badgeText: 'Laboratory Tested & Verified',
          titleLine1: 'Certified Quality & Compliance Audits',
          subtitle: 'BioCart maintains rigorous laboratory quality assurance protocols to guarantee chemical-free organic integrity.'
        }
      },
      {
        id: 'compliance-features',
        type: 'features_list',
        title: 'Laboratory Testing Benchmarks',
        enabled: true,
        order: 2,
        data: {
          features: [
            { title: 'Low Electrical Conductivity (EC)', desc: 'Triple-washed coir substrates guaranteed at EC < 0.5 mS/cm to eliminate root burning.' },
            { title: 'Zero Heavy Metal Contamination', desc: 'Independently tested via atomic absorption spectroscopy for lead, cadmium, and arsenic purity.' },
            { title: 'Beneficial Microbe Counts', desc: 'Viable bacterial and fungal colony verification ensuring active biological soil enrichment.' }
          ]
        }
      },
      {
        id: 'compliance-main-story',
        type: 'rich_text',
        title: 'Quality Assurance Charter',
        enabled: true,
        order: 3,
        data: {
          heading: 'Rigorous Scientific Quality Control Protocols',
          content: `
            <h3>1. Raw Material Quality Auditing</h3>
            <p>All raw agricultural inputs undergo strict screening upon arrival at our processing centers. We perform moisture analysis, electrical conductivity (EC) checks, and pH measurements to ensure baseline compatibility with delicate seedling roots.</p>

            <h3>2. Organic Standards Adherence</h3>
            <p>BioCart processes and formulations are designed to comply with National Programme for Organic Production (NPOP) guidelines and Fertilizer Control Order (FCO) quality parameters. Our products are free of synthetic chemical additives, sewage sludge, or toxic industrial fillers.</p>

            <h3>3. Batch Certificate of Analysis (COA)</h3>
            <p>Every commercial production batch is assigned a unique batch tracking number. Commercial nurseries, export partners, and institutional buyers can request technical Certificates of Analysis (COA) covering EC salinity, pH balance, and microbial counts by contacting <strong>compliance@biocart.co.in</strong>.</p>
          `
        }
      }
    ]
  }
];
