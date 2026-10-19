import { BlogPost } from '../types/blog';

export const INITIAL_BLOG_POSTS: BlogPost[] = [
  {
    id: 'vermicompost-complete-guide-india',
    title: 'The Ultimate Guide to Vermicompost for Indian Gardens & Terraces',
    slug: 'vermicompost-complete-guide-india',
    excerpt: 'Discover why double-screened vermicompost is the black gold of regenerative gardening in India, how to apply it, and mistakes to avoid.',
    coverImage: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=1200&q=80',
    coverImageAlt: 'Double screened pure organic vermicompost in a terrace garden',
    coverImageCaption: 'Double-screened vermicompost provides balanced macro and micronutrients with beneficial microorganisms.',
    category: 'Biofertilizers & Composting',
    tags: ['Vermicompost', 'Organic Fertilizer', 'Terrace Gardening', 'Soil Health', 'Microbes'],
    status: 'published',
    readTimeMinutes: 7,
    featured: true,
    publishedAt: '2026-03-15T09:00:00.000Z',
    createdAt: '2026-03-15T09:00:00.000Z',
    updatedAt: '2026-03-15T09:00:00.000Z',
    author: {
      id: 'dr-ramesh-kumar',
      name: 'Dr. Ramesh Kumar',
      role: 'Chief Agronomist, BioCart Research Farms',
      bio: 'Ph.D. in Soil Microbiology with over 18 years experience advising Indian organic farmers and urban horticulturists on restorative agriculture.',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
    },
    seo: {
      title: 'Ultimate Vermicompost Guide for Indian Gardens | BioCart',
      metaDescription: 'Learn how to use 100% pure organic vermicompost to rejuvenate garden soil, boost plant immunity, and grow nutrient-dense vegetables.',
      targetKeyword: 'vermicompost for gardening',
      secondaryKeywords: ['organic compost india', 'earthworm manure', 'terrace garden soil mix']
    },
    blocks: [
      {
        id: 'b-1',
        type: 'heading',
        order: 1,
        data: {
          level: 2,
          text: 'Why Vermicompost is Essential for Indian Soils'
        }
      },
      {
        id: 'b-2',
        type: 'paragraph',
        order: 2,
        data: {
          text: 'Indian topsoils, especially in tropical urban regions, frequently face organic carbon depletion due to intense summer heat and mineral nutrient exhaustion. Vermicompost—often referred to as “black gold”—is more than just decomposed cow dung. It is a biologically active living humus packed with beneficial bacteria, actinomycetes, fungal spores, and plant-available enzymes (amylase, protease, urease).'
        }
      },
      {
        id: 'b-3',
        type: 'callout',
        order: 3,
        data: {
          variant: 'tip',
          title: 'Agronomist Tip: The Smell Test',
          text: 'Genuine, cured vermicompost must smell like fresh forest rain (geosmin) and never foul or ammoniacal. If it smells sour, it has not completed aerobic curing.'
        }
      },
      {
        id: 'b-4',
        type: 'heading',
        order: 4,
        data: {
          level: 3,
          text: 'Key Benefits Over Synthetic Chemical Fertilizers'
        }
      },
      {
        id: 'b-5',
        type: 'list',
        order: 5,
        data: {
          style: 'unordered',
          items: [
            'Gradual, slow-release Nitrogen (N), Phosphorus (P), and Potassium (K) without risk of root burn.',
            'Increases water retention capacity by up to 30%, cutting terrace watering needs during scorching Indian summers.',
            'Rich in humic acid and fulvic acid which chelate micronutrients (Zinc, Iron, Manganese) for immediate plant uptake.',
            'Zero chemical residues, making it 100% safe for home kitchen gardens, curry leaf plants, and fruiting vegetables.'
          ]
        }
      },
      {
        id: 'b-6',
        type: 'product_card',
        order: 6,
        data: {
          productId: 'prod_vermicompost_premium',
          productName: 'BioCart Double-Screened Pure Vermicompost',
          price: '₹299',
          url: '/product-details?product=prod_vermicompost_premium',
          buttonText: 'View BioCart Vermicompost',
          description: '100% pure, odor-free, moisture-controlled earthworm castings lab-tested for Indian vegetable gardens and flowering plants.'
        }
      },
      {
        id: 'b-7',
        type: 'heading',
        order: 7,
        data: {
          level: 2,
          text: 'Application Dosage Chart for Home Gardens'
        }
      },
      {
        id: 'b-8',
        type: 'table',
        order: 8,
        data: {
          headers: ['Plant Category', 'Pot Size', 'Recommended Dosage', 'Application Frequency'],
          rows: [
            ['Flowering Plants (Rose, Hibiscus)', '10 - 12 inch', '150 - 200 grams', 'Every 21 days'],
            ['Leafy Greens (Spinach, Coriander)', 'Trough / Shallow bed', '100 grams / sq. ft', 'Every 15 days'],
            ['Fruiting Veggies (Tomato, Chilli)', '12 - 14 inch', '250 grams', 'Every 20 days'],
            ['Indoor Foliage (Monstera, Fiddle)', '8 - 10 inch', '100 grams top-dressed', 'Once every 45 days']
          ]
        }
      },
      {
        id: 'b-9',
        type: 'faq',
        order: 9,
        data: {
          items: [
            {
              question: 'Can I use vermicompost directly without mixing soil?',
              answer: 'While pure vermicompost does not burn roots, it is dense. For optimal root aeration and drainage, mix 30% vermicompost with 40% garden soil and 30% cocopeat.'
            },
            {
              question: 'Does BioCart vermicompost contain weed seeds?',
              answer: 'No. Our vermicompost undergoes controlled aerobic thermal stabilization prior to earthworm inoculation, destroying pathogenic organisms and weed seeds.'
            }
          ]
        }
      },
      {
        id: 'b-10',
        type: 'cta',
        order: 10,
        data: {
          heading: 'Ready to Revitalize Your Garden Soil?',
          subheading: 'Get fresh, double-screened biofertilizers and potting mixes delivered directly to your doorstep across India.',
          buttonText: 'Explore BioCart Store',
          buttonLink: '/shop'
        }
      }
    ]
  },
  {
    id: 'cocopeat-vs-soil-potting-mix-guide',
    title: 'Cocopeat vs Regular Garden Soil: Crafting the Ideal Potting Mix',
    slug: 'cocopeat-vs-soil-potting-mix-guide',
    excerpt: 'Understand low-EC cocopeat, why drainage matters for potted containers, and how to create the perfect soil blend for Indian climate zones.',
    coverImage: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1200&q=80',
    coverImageAlt: 'Cocopeat brick expansion and organic soil potting mix preparation',
    coverImageCaption: 'Cocopeat expands up to 5 times in volume and provides root aeration in containers.',
    category: 'Potting Mix & Soil Conditioners',
    tags: ['Cocopeat', 'Potting Mix', 'Container Gardening', 'Soil Drainage'],
    status: 'published',
    readTimeMinutes: 5,
    featured: false,
    publishedAt: '2026-03-20T11:00:00.000Z',
    createdAt: '2026-03-20T11:00:00.000Z',
    updatedAt: '2026-03-20T11:00:00.000Z',
    author: {
      id: 'ananya-sen',
      name: 'Ananya Sen',
      role: 'Urban Horticulture Lead',
      bio: 'Terrace garden architect and author specializing in rooftop permaculture and balcony vegetable cultivation across Indian metropolitan cities.',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80'
    },
    seo: {
      title: 'Cocopeat vs Garden Soil: Best Potting Mix Formula | BioCart',
      metaDescription: 'Discover why washed low-EC cocopeat protects potted plant roots from waterlogging, and how to blend it with organic compost for healthy growth.',
      targetKeyword: 'cocopeat potting mix india',
      secondaryKeywords: ['low EC cocopeat', 'potting soil mix ratio', 'balcony garden soil']
    },
    blocks: [
      {
        id: 'c-1',
        type: 'heading',
        order: 1,
        data: {
          level: 2,
          text: 'The Container Soil Problem in Indian Apartments'
        }
      },
      {
        id: 'c-2',
        type: 'paragraph',
        order: 2,
        data: {
          text: 'Heavy garden soil in container pots compacts quickly under repeated watering. In Indian terrace and balcony gardens, compacted clay soil suffocates roots, leading to root rot (pythium) and stunting flower yields. Cocopeat acts as an airy cellular sponge that holds both water and dissolved plant nutrients without suffocating root hairs.'
        }
      },
      {
        id: 'c-3',
        type: 'callout',
        order: 3,
        data: {
          variant: 'warning',
          title: 'Always Check the EC (Electrical Conductivity)',
          text: 'Unwashed raw coconut coir contains high sodium and potassium salts (EC > 2.0 mS/cm) which can stunt plant seedlings. Always insist on triple-washed, low-EC cocopeat (EC < 0.5 mS/cm) like BioCart certified blocks.'
        }
      },
      {
        id: 'c-4',
        type: 'heading',
        order: 4,
        data: {
          level: 2,
          text: 'The Golden 40:30:30 Potting Formula'
        }
      },
      {
        id: 'c-5',
        type: 'list',
        order: 5,
        data: {
          style: 'unordered',
          items: [
            '40% Low-EC Rehydrated Cocopeat (for moisture retention & root aeration).',
            '30% BioCart Cured Vermicompost (for steady microbial biology & micro-macro nutrients).',
            '30% Red Garden Soil or Perlite/Pumice (for mineral anchoring and structural heft).'
          ]
        }
      },
      {
        id: 'c-6',
        type: 'product_card',
        order: 6,
        data: {
          productId: 'prod_coco_peat_block',
          productName: 'BioCart Washed Low-EC 5kg Cocopeat Block',
          price: '₹249',
          url: '/product-details?product=prod_coco_peat_block',
          buttonText: 'Order Low-EC Cocopeat',
          description: 'Triple-washed with fresh mountain spring water, guaranteed EC < 0.5 mS/cm. Expands to 75 Litres of fluffy potting media.'
        }
      }
    ]
  },
  {
    id: 'organic-pest-control-neem-oil-sprays',
    title: 'Natural Pest Protection: How Cold-Pressed Neem Oil Shields Terrace Crops',
    slug: 'organic-pest-control-neem-oil-sprays',
    excerpt: 'Say goodbye to toxic chemical sprays. Learn how water-soluble cold-pressed neem oil combats aphids, mealybugs and spider mites safely.',
    coverImage: 'https://images.unsplash.com/photo-1592150621744-aca64f48394a?auto=format&fit=crop&w=1200&q=80',
    coverImageAlt: 'Healthy vegetable leaves protected with organic neem oil spray',
    coverImageCaption: 'Pure cold-pressed neem oil disrupts insect life cycles naturally without harming pollinators like bees.',
    category: 'Plant Care & Natural Pest Control',
    tags: ['Neem Oil', 'Organic Pest Control', 'Mealybug Treatment', 'Aphids', 'Safe Food'],
    status: 'published',
    readTimeMinutes: 6,
    featured: false,
    publishedAt: '2026-03-25T14:30:00.000Z',
    createdAt: '2026-03-25T14:30:00.000Z',
    updatedAt: '2026-03-25T14:30:00.000Z',
    author: {
      id: 'dr-ramesh-kumar',
      name: 'Dr. Ramesh Kumar',
      role: 'Chief Agronomist, BioCart Research Farms',
      bio: 'Ph.D. in Soil Microbiology with over 18 years experience advising Indian organic farmers.',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
    },
    seo: {
      title: 'Organic Pest Control with Pure Cold-Pressed Neem Oil | BioCart',
      metaDescription: 'Eliminate mealybugs, aphids and fungal powdery mildew naturally. A comprehensive guide on neem oil dilution ratios and spraying schedules.',
      targetKeyword: 'neem oil for plants india',
      secondaryKeywords: ['organic pest spray', 'mealybug treatment organic', 'plant care bio spray']
    },
    blocks: [
      {
        id: 'n-1',
        type: 'heading',
        order: 1,
        data: {
          level: 2,
          text: 'How Azadirachtin Protects Without Harming Bees'
        }
      },
      {
        id: 'n-2',
        type: 'paragraph',
        order: 2,
        data: {
          text: 'Cold-pressed neem oil extracted from kernels of Azadirachta indica contains azadirachtin, a naturally occurring limonoid. Unlike synthetic nerve poisons that kill pollinators, neem oil acts as an anti-feedant and insect growth regulator. When sucking pests (mealybugs, aphids, thrips, spider mites) ingest it, they lose the ability to feed and molt, breaking their generational reproduction cycle.'
        }
      },
      {
        id: 'n-3',
        type: 'callout',
        order: 3,
        data: {
          variant: 'info',
          title: 'Best Time to Spray in India',
          text: 'Always spray early morning before 8:00 AM or late evening after sunset (post 5:30 PM). Direct mid-day Indian sunlight combined with oil droplets will cause foliar leaf scorch.'
        }
      },
      {
        id: 'n-4',
        type: 'heading',
        order: 4,
        data: {
          level: 2,
          text: 'Standard Dilution Ratio'
        }
      },
      {
        id: 'n-5',
        type: 'paragraph',
        order: 5,
        data: {
          text: 'Mix 5 ml of cold-pressed neem oil with 1 Litre of lukewarm water. Add 2-3 drops of natural organic liquid soap as an emulsifier to blend the oil cleanly into the water before spraying thoroughly under the leaves.'
        }
      }
    ]
  }
];
