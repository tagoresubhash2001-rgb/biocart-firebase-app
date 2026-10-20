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
          heading: 'BioCart Digital Privacy Charter & Data Protection Policy (Effective 2026)',
          content: `
            <div class="legal-document-header mb-6 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <p class="text-xs text-emerald-900 mb-1"><strong>Document Reference:</strong> BC-LEG-POL-001 • <strong>Effective Date:</strong> January 1, 2026 • <strong>Last Updated:</strong> October 20, 2026</p>
              <p class="text-xs text-emerald-800"><strong>Data Controller:</strong> Sindulis Agro Products Private Limited • <strong>Platform:</strong> BioCart (biocart.in)</p>
            </div>

            <h3>1. Document Identification, Effective Date & Updates</h3>
            <p>This comprehensive Privacy Policy governs your access to and use of <strong>biocart.in</strong>, associated mobile applications, and ecological commerce services. This document was last substantively reviewed and updated on <strong>October 20, 2026</strong>. Revisions are communicated through banner notices on our storefront and updated timestamp notations.</p>

            <h3>2. Data Controller & Business Identification</h3>
            <p>The primary data controller responsible for personal information collected under this Privacy Policy is <strong>Sindulis Agro Products Private Limited</strong> (trading as "BioCart"), a company incorporated under the laws of India, with corporate operations located at <strong>Industrial Corridor Area, Tanuku, West Godavari District, Andhra Pradesh - 534211, India</strong> (CIN: U01110AP2023PTC123456).</p>

            <h3>3. Scope of Policy & Services Covered</h3>
            <p>This Policy applies to all registered customers, guest shoppers, marketplace vendor partners, wholesale applicants, and visitors browsing our biological plant care, double-screened vermicompost, and potting mix catalog across India.</p>

            <h3>4. Categories of Personal Information Collected</h3>
            <p>We collect only information reasonably necessary to operate our marketplace, fulfill agricultural orders, verify multi-vendor partners, and provide agronomic advice:</p>
            <ul>
              <li><strong>Direct Identifiers:</strong> Name, mobile telephone number, email address, and permanent delivery addresses.</li>
              <li><strong>Customer Account Credentials:</strong> Password hashes, Google Firebase Authentication UIDs, and permanent Customer IDs (format: MMMNNNNYY).</li>
              <li><strong>Order & Transaction Records:</strong> Purchased SKU lines, weight categories, payment methods, delivery preferences, invoice amounts, and fulfillment timestamps.</li>
            </ul>

            <h3>5. Account, Profile, Address & Order Information</h3>
            <p>Customers can save multiple delivery addresses with pin code classifications for logistics routing. Order histories are maintained to enable re-ordering, active order tracking, and statutory tax compliance under Indian GST regulations.</p>

            <h3>6. Vendor & Marketplace Operational Information</h3>
            <p>For verified vendor partners, we collect and securely maintain registered business names, GSTIN, PAN numbers, physical warehouse/pickup addresses, authorized manager details, and bank account beneficiary particulars (account number, IFSC code, bank branch) required strictly for automated Tuesday settlements.</p>

            <h3>7. Information Collected Automatically</h3>
            <p>When interacting with the platform, our infrastructure logs standard diagnostic metadata: browser type, operating system version, internet protocol (IP) address, referral URLs, session timestamps, and performance metrics necessary to prevent distributed denial-of-service (DDoS) incidents and enforce rate-limiting.</p>

            <h3>8. Purposes & Lawful Basis of Data Processing</h3>
            <p>We process personal data under legitimate business grounds and contractual necessity:</p>
            <ul>
              <li><strong>Contract Performance:</strong> Processing checkout requests, dispatching biological nursery supplies, and coordinating with regional couriers.</li>
              <li><strong>Logistics Coordination:</strong> Calculating pin code serviceability and generating airway bills (AWB) via Delhivery logistics APIs.</li>
              <li><strong>Customer Assistance:</strong> Providing horticultural diagnostics, tracking status inquiries, and resolving return tickets.</li>
              <li><strong>Legal Mandates:</strong> Maintaining statutory accounting ledgers, issuing GST tax invoices, and preventing commercial fraud.</li>
            </ul>

            <h3>9. Payment Gateway Security & Zero Card Storage Guarantee</h3>
            <p>BioCart enforces zero financial card data retention. <strong>We never capture, store, log, or process credit/debit card numbers, CVV codes, net banking credentials, or UPI PINs on our servers.</strong> All digital transactions are processed directly through PCI-DSS Level 1 compliant payment gateways (Razorpay). Communications are encrypted using end-to-end 256-bit TLS protocols.</p>

            <h3>10. Cookies, Session Storage & Analytics Technologies</h3>
            <p>We use essential functional cookies and browser local storage strictly to remember cart items, preserve your wishlist, maintain active login sessions, and optimize storefront load times. We do not deploy intrusive third-party cross-site advertising trackers or sell browsing data.</p>

            <h3>11. Authorized Processors & Data Sharing</h3>
            <p>We share operational information strictly on a need-to-know basis under binding confidentiality and data-protection terms with:</p>
            <ul>
              <li><strong>Logistics Partners (Delhivery):</strong> Name, delivery destination address, pin code, and contact phone number to execute parcel delivery.</li>
              <li><strong>Payment Processors (Razorpay & RazorpayX):</strong> Order totals, transaction tokens, and verified vendor bank details for disbursements.</li>
              <li><strong>Infrastructure Hosting:</strong> Google Cloud Platform and Firebase (Singapore/Asia-Southeast1 region) for encrypted database storage and serverless computation.</li>
            </ul>

            <h3>12. Data Retention & Secure Deletion Protocols</h3>
            <p>Customer accounts remain active until closed. Transactional and invoicing records are retained for seven (7) financial years in accordance with the Companies Act, 2013 and Indian GST statutes. Unlinked temporary session data and transient caches are automatically purged.</p>

            <h3>13. Security Architecture & Technical Safeguards</h3>
            <p>We implement multi-layered defenses: Cloud Firestore role-based security rules (version 2), encrypted communications (HTTPS/TLS 1.3), hashed authentication identities, masked bank displays (•••• 1234), and administrative audit logging for sensitive modifications.</p>

            <h3>14. Customer Rights & Access Procedures</h3>
            <p>Under Indian information technology standards and applicable data privacy principles, you have the right to access, inspect, rectify, or request an export of your saved personal information by visiting your Customer Dashboard or emailing our privacy desk.</p>

            <h3>15. Account Closure & Data Erasure Requests</h3>
            <p>You may submit an account deletion request through the Security tab of your Customer Dashboard or by contacting <strong>privacy@biocart.co.in</strong>. Upon verification, non-statutory personal data is permanently scrubbed from active databases within thirty (30) days.</p>

            <h3>16. Marketing Communication Preferences</h3>
            <p>We communicate essential order updates via transactional SMS and email. You can opt out of promotional newsletters and agricultural crop tips at any time by clicking "Unsubscribe" in any email dispatch.</p>

            <h3>17. Children's Privacy</h3>
            <p>BioCart is an agricultural and horticulture input marketplace designed for adults and commercial farm operators. We do not knowingly solicit or collect personal information from individuals under eighteen (18) years of age.</p>

            <h3>18. Third-Party Links & External Resources</h3>
            <p>Our educational blog articles may contain informational hyperlinks to government agricultural boards, ICAR research portals, or certification registries. We are not responsible for the privacy practices of external third-party domains.</p>

            <h3>19. Cross-Border Data Processing</h3>
            <p>Customer personal information is stored and processed on secure Google Cloud Infrastructure located in Asia-Southeast1 (Singapore) and Asia-South1 (India). BioCart does not transfer consumer personal data outside trusted cloud environments.</p>

            <h3>20. Incident Notification & Complaint Handling</h3>
            <p>In the event of an identified security vulnerability or unauthorized access affecting user information, BioCart will take immediate containment measures and inform affected users and CERT-In in compliance with applicable Indian cybersecurity regulations.</p>

            <h3>21. Policy Modifications</h3>
            <p>We reserve the right to refine this Charter to reflect regulatory amendments or operational changes. Continued use of the platform following the posting of modifications constitutes acceptance of the revised terms.</p>

            <h3>22. Contact & Grievance Redressal Officer</h3>
            <p>In accordance with the Information Technology Act, 2000 and rules made thereunder, the designated Grievance Officer for BioCart is:</p>
            <div class="grievance-officer-block p-4 bg-slate-50 rounded-xl border border-slate-200 mt-2 text-xs">
              <p><strong>Grievance & Privacy Officer:</strong> Legal Compliance Cell</p>
              <p><strong>Company:</strong> Sindulis Agro Products Private Limited</p>
              <p><strong>Address:</strong> Industrial Corridor Area, Tanuku, West Godavari District, Andhra Pradesh - 534211, India</p>
              <p><strong>Email:</strong> <a href="mailto:privacy@biocart.co.in" class="text-emerald-700 underline font-semibold">privacy@biocart.co.in</a> • <strong>Phone:</strong> +91 91542 22539</p>
              <p class="text-slate-500 mt-1">Response Timeline: All legitimate privacy grievances are acknowledged within 24 hours and addressed within 15 working days.</p>
            </div>
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
          heading: 'Master Terms and Conditions of Service (Updated 2026)',
          content: `
            <h3>1. Corporate Identity, Marketplace Scope & Legal Entity</h3>
            <p>Welcome to <strong>BioCart</strong> (the "Marketplace", "Platform", "Website" or "Service"), an organic agricultural and horticulture marketplace operated by <strong>Sindulis Agro Products Private Limited</strong> (CIN: U01110AP2023PTC123456), having its registered office and primary fulfillment facility at Industrial Corridor Area, Tanuku, West Godavari District, Andhra Pradesh - 534211, India ("Company", "We", "Us", or "Our"). These Terms of Service ("Terms") constitute a legally binding agreement between you ("Customer", "User", "You", or "Buyer") and Sindulis Agro Products Private Limited governing your access to and commercial purchase of goods on biocart.in.</p>

            <h3>2. Definitions & Customer Eligibility</h3>
            <p>By registering an account, accessing the Platform, or placing an order, you warrant and represent that you are at least eighteen (18) years of age, mentally sound, and possess the full legal capacity to enter into a binding contract under the Indian Contract Act, 1872. If you are accessing this Platform on behalf of an agricultural cooperative, farming firm, company, or institution, you affirm that you have the requisite corporate authority to bind that entity to these Terms.</p>

            <h3>3. Account Registration, Verification & Security</h3>
            <p>To purchase products or access order records, customers may register an account providing truthful, accurate, and complete information, including a valid mobile number and email address. You are solely responsible for preserving the confidentiality of your account credentials. You agree to notify BioCart immediately at support@biocart.co.in upon discovering any unauthorized access or breach of account security. The Company shall not be liable for losses incurred as a result of compromised user passwords.</p>

            <h3>4. Customer Responsibilities & Agricultural Usage</h3>
            <p>You agree to utilize BioCart solely for lawful purposes. You agree not to misuse, tamper with, or introduce malicious scripts into the Platform. You acknowledge that biological inputs, soil enhancers, and organic pest repellents require appropriate handling, dosing, and adherence to safety guidelines tailored to specific crop cycles and local soil compositions.</p>

            <h3>5. Vendor Responsibilities & Marketplace Listing Obligations</h3>
            <p>Third-party approved vendors and authorized manufacturers who list products on BioCart represent and warrant that their merchandise complies with all relevant Indian statutory standards, including the Fertilizer (Inorganic, Organic or Mixed) (Control) Order (FCO), Seed Act, and applicable certification bodies. Vendors bear primary liability for accurate catalog descriptions, product freshness, and dispatch readiness.</p>

            <h3>6. Product Specifications, Descriptions & Organic Purity Disclaimers</h3>
            <p>BioCart products are formulated for horticultural, agricultural, and urban gardening applications. While our formulations and verified vendor offerings are tested for electrical conductivity (low EC), moisture content, and organic purity, agricultural yields naturally depend on external variables, including ambient temperature, irrigation quality, photoperiod, and individual agronomic practices. Product descriptions and application guidelines are educational and do not constitute a warranty of specific crop harvest quantities or financial returns.</p>

            <h3>7. Order Placement, Acceptance & Right of Cancellation</h3>
            <p>The display of items on the Platform constitutes an invitation to offer. Receipt of an electronic order receipt or SMS confirmation does not constitute our final legal acceptance. BioCart and its merchants reserve the unconditional right to limit, decline, or cancel orders in cases of stock depletion, logistics constraints, typographical pricing errors, or suspected unauthorized fraudulent activities. If an order is canceled post-payment, a full refund is immediately credited to the original payment source.</p>

            <h3>8. Payment Methods, Digital Authorization & Zero Card Storage</h3>
            <p>All prices listed on BioCart are denominated in Indian Rupees (INR) and are inclusive of Goods and Services Tax (GST). BioCart accepts major domestic and international credit/debit cards, net banking, UPI, and authorized digital wallets via PCI-DSS Level 1 certified payment gateways (Razorpay). <strong>Zero Card Storage Guarantee:</strong> BioCart does not capture, store, or view your sensitive payment card numbers, CVVs, or banking credentials.</p>

            <h3>9. Cash on Delivery (COD) Terms & Anti-Abuse Verification</h3>
            <p>Cash on Delivery may be offered on select product categories and pin codes. BioCart reserves the right to verify COD orders via automated IVR, SMS, or phone confirmation prior to parcel release. Refusal to accept verified COD shipments without valid defect justification may lead to restriction of COD privileges or account suspension.</p>

            <h3>10. Pan-India Shipping, Delivery Timelines & Logistics Limitations</h3>
            <p>We fulfill orders across India via trusted logistics networks (including Delhivery). Estimated shipping timelines (typically 3–7 business days depending on geography) are indicative. BioCart is not liable for parcel delays resulting from extreme weather, natural disasters, state-wide transport strikes, or incomplete customer addresses.</p>

            <h3>11. Returns, Replacements, Refunds & Botanical Exceptions</h3>
            <p>Customers may request replacements or refunds for items received in damaged, leaking, expired, or incorrect condition within seven (7) days of confirmed delivery, supported by photographic evidence. Due to biological sensitivity, live plant saplings and opened liquid bio-stimulant containers cannot be returned once opened, except in confirmed cases of manufacturing contamination.</p>

            <h3>12. Marketplace Platform Role vs. Vendor Merchant Obligations</h3>
            <p>BioCart acts as a managed marketplace and technology facilitator connecting growers, farmers, and urban gardeners with certified organic producers. While BioCart rigorously vets merchants and enforces product testing criteria, direct statutory warranty liabilities for third-party merchant products reside with the respective manufacturer or vendor as declared on the packaging label.</p>

            <h3>13. Biological Product Handling, Storage & Safety Instructions</h3>
            <p>All biological products, vermicompost, beneficial microbial inoculants, and cold-pressed neem formulations should be stored in a cool, dry, shaded environment away from direct sunlight, children, and pet access. Products are formulated solely for horticultural soil and plant application and are strictly not for human or animal consumption.</p>

            <h3>14. Intellectual Property, Trademarks & Brand Protection</h3>
            <p>The trademarks "BioCart", "Sindulis Agro Products", brand logos, UI designs, graphics, and proprietary product names are the exclusive intellectual property of Sindulis Agro Products Private Limited. Unauthorized duplication, reverse engineering, software scraping, or commercial exploitation is strictly prohibited under the Trade Marks Act, 1999 and the Copyright Act, 1957.</p>

            <h3>15. Prohibited Activities, Malicious Scraping & System Abuse</h3>
            <p>Users may not: (a) deploy automated web crawlers, spiders, or scrapers to extract pricing, inventory, or user records; (b) execute denial-of-service attacks or tamper with server infrastructure; (c) post defamatory, abusive, or false reviews; or (d) circumvent authentication gateways.</p>

            <h3>16. Suspension and Termination of Accounts</h3>
            <p>BioCart reserves the right to suspend, terminate, or restrict user access to the Platform with or without prior notice if fraudulent conduct, coupon abuse, repeated payment defaults, or violations of these Terms occur.</p>

            <h3>17. Limitation of Liability & Statutory Disclaimers</h3>
            <p>To the maximum extent permitted by applicable Indian law, Sindulis Agro Products Private Limited and its directors, officers, and employees shall not be liable for any indirect, incidental, punitive, or consequential damages resulting from the use or inability to use our products or services. In all events, our aggregate liability shall not exceed the amount actually paid by you for the specific item in dispute.</p>

            <h3>18. Dispute Resolution, Governing Law & Jurisdiction</h3>
            <p>These Terms shall be interpreted and governed in accordance with the substantive laws of India. Any dispute, controversy, or claim arising out of or relating to these Terms shall be referred to arbitration in accordance with the Arbitration and Conciliation Act, 1996, or subject to the exclusive jurisdiction of the competent civil courts situated in <strong>West Godavari District, Andhra Pradesh, India</strong>.</p>

            <h3>19. Changes & Amendments to Terms</h3>
            <p>We reserve the right to amend, update, or revise these Terms at any time to reflect statutory developments, operational improvements, or technological modifications. Any revisions will take effect immediately upon publication on biocart.in. Your continued interaction with the Platform following changes constitutes binding acceptance.</p>

            <h3>20. Customer Support & Grievance Redressal Contact Block</h3>
            <p>In accordance with the Information Technology Act, 2000 and the Consumer Protection (E-Commerce) Rules, 2020, our contact information and designated Grievance Officer details are set forth below:</p>
            <div class="legal-contact-block p-4 bg-slate-50 rounded-xl border border-slate-200 mt-2 text-xs">
              <p><strong>Operating Entity:</strong> Sindulis Agro Products Private Limited</p>
              <p><strong>Corporate Identification Number (CIN):</strong> U01110AP2023PTC123456</p>
              <p><strong>Registered & Operational Address:</strong> Industrial Corridor Area, Tanuku, West Godavari District, Andhra Pradesh - 534211, India</p>
              <p><strong>Customer Care Email:</strong> <a href="mailto:support@biocart.co.in" class="text-emerald-700 underline font-semibold">support@biocart.co.in</a> • <strong>Phone:</strong> +91 91542 22539</p>
              <p><strong>Grievance Officer:</strong> Legal Compliance Cell (Email: <a href="mailto:privacy@biocart.co.in" class="text-emerald-700 underline font-semibold">privacy@biocart.co.in</a>)</p>
              <p class="text-slate-500 mt-1">Grievances are acknowledged within 48 hours and resolved within one month of receipt in accordance with consumer protection guidelines.</p>
            </div>
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
