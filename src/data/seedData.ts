import { Product, FAQ, Testimonial, Founder, TimelineItem } from '../types';

export const SEED_PRODUCTS: Product[] = [
  {
    id: 'prod-fert-1',
    name: 'BioCart Premium Organic Vermicompost',
    category: 'Organic Fertilizers',
    vendorId: 'biocart',
    price: 149,
    mrp: 249,
    discount: 40,
    sku: 'BC-FERT-VMC-01',
    rating: 4.8,
    reviewsCount: 312,
    image: '/assets/products/prod_vermicompost.png',
    images: [
      '/assets/products/prod_vermicompost.png'
    ],
    shortDescription: 'Premium double-screened earthworm castings, enriched with active nitrogen-fixing microbes.',
    description: 'BioCart Organic Vermicompost is premium organic black gold, created through precise earthworm digestion of organic farm biomass under low-heat parameters. It is double-screened at our processing facilities to ensure a uniform, crumbly, odorless texture. Enriched with natural humic acids, nitrogen-fixing bacteria, and essential organic trace elements, it serves as the ultimate nutrient superfood for indoor, balcony, and terrace gardens.',
    features: [
      '100% natural and organic earthworm castings',
      'Double-screened for uniform, ultra-fine particle size',
      'Enriched with nitrogen-fixing soil bacteria and humic acid',
      'Odorless, clean, and perfectly safe for indoor potting mixes'
    ],
    benefits: [
      'Boosts overall plant growth and increases flower/fruit yields by up to 45%',
      'Improves soil structure, moisture-retention, and root aeration',
      'Fosters rich microbial activity in the root zone'
    ],
    usageInstructions: [
      'For existing potted plants: Sprinkle 50g to 100g on topsoil once a month, mix gently, and water.',
      'For preparing new potting soil: Mix vermicompost with cocopeat and garden soil in a 1:1:2 ratio.',
      'For heavy feeders (flowering plants, tomatoes): Apply 150g every 15 days.'
    ],
    ingredients: [
      '100% Pure Organic Compost',
      'Aged Plant Biomass',
      'Active Earthworm Castings',
      'Beneficial Soil Inoculants'
    ],
    weightVariants: ['1kg', '5kg', '10kg'],
    selectedVariant: '5kg',
    stockStatus: 'In Stock',
    inStock: true,
    badge: 'Best Seller',
    materials: 'Aged Organic Biomass & Earthworm Castings',
    dimensions: 'Sealed Multi-Layer Kraft Pouch',
    faqs: [
      {
        question: 'Does this vermicompost have a bad odor?',
        answer: 'Not at all. Our vermicompost is fully digested and double-screened, resulting in a rich, odorless, soil-like earthy aroma.'
      },
      {
        question: 'Can I use this for indoor houseplants?',
        answer: 'Yes, it is perfectly suited for indoor plants. It is sterilized to prevent weed growth and insect attraction.'
      }
    ],
    reviews: [
      {
        id: 'rev-v-1',
        user: 'Aravind Swamy',
        rating: 5,
        date: '2026-06-15',
        comment: 'Exceptional vermicompost! No sand or pebbles, fully decomposed. My roses have exploded with huge buds.',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80'
      },
      {
        id: 'rev-v-2',
        user: 'Priyanka Sen',
        rating: 4,
        date: '2026-06-28',
        comment: 'Very premium packaging. Earthy smell, clean to handle. Definitely a high-grade product.',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&h=120&q=80'
      }
    ]
  },
  {
    id: 'prod-fert-2',
    name: 'BioCart Pure Cold-Pressed Neem Cake Powder',
    category: 'Organic Fertilizers',
    vendorId: 'biocart',
    price: 199,
    mrp: 299,
    discount: 33,
    sku: 'BC-FERT-NMC-02',
    rating: 4.7,
    reviewsCount: 145,
    image: '/assets/products/prod_neem_cake.png',
    images: [
      '/assets/products/prod_neem_cake.png'
    ],
    shortDescription: 'Organic dual-action soil conditioner and root-defense pest suppressor milled from neem kernels.',
    description: 'BioCart Neem Cake is a natural organic fertilizer and root-protectant. Milled by cold-pressing premium neem seed kernels, it preserves therapeutic Azadirachtin and neem limonoids. Incorporated into potting mixtures, it provides slow-release Nitrogen, Potassium, and trace elements, while shielding root systems from underground pests like nematodes, grubs, and rot fungus.',
    features: [
      'Milled from 100% pure cold-pressed neem seed kernels',
      'Rich in slow-release organic nitrogen, phosphate, and potassium',
      'High bioactive Azadirachtin content (>1500 ppm)',
      'Free from chemical additives and toxic solvent residues'
    ],
    benefits: [
      'Combats soil-borne nematodes, white grubs, and harmful root fungi',
      'Enhances root development and strengthens overall plant immunity',
      'Prevents loss of nitrogen from organic potting mixes'
    ],
    usageInstructions: [
      'For pots (8-12 inches): Mix 2 to 3 tablespoons (approx. 30g-50g) thoroughly into the topsoil.',
      'For bed preparation: Add 150g per square meter during soil tilling.',
      'Water the plants well immediately after applying.'
    ],
    ingredients: ['100% Pure Cold-Pressed Neem Seed Kernels'],
    weightVariants: ['900g', '2.5kg', '5kg'],
    selectedVariant: '900g',
    stockStatus: 'In Stock',
    inStock: true,
    badge: 'Pest Control',
    materials: 'Pressed Organic Neem Seeds',
    dimensions: 'Heavy-Duty Sealed Kraft Bag',
    faqs: [
      {
        question: 'Does this prevent mealybugs?',
        answer: 'When absorbed by roots, neem cake provides systemic immunity. For active foliage mealybugs, we recommend combining this with our cold-pressed Neem Oil Spray.'
      }
    ],
    reviews: [
      {
        id: 'rev-n-1',
        user: 'Rohit Sharma',
        rating: 5,
        date: '2026-05-20',
        comment: 'Cured the root-knot nematode infestation on my chili plants! Essential for any organic home garden.',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&h=120&q=80'
      }
    ]
  },
  {
    id: 'prod-fert-3',
    name: 'BioCart Liquid Seaweed Growth Elixir',
    category: 'Organic Fertilizers',
    vendorId: 'biocart',
    price: 279,
    mrp: 399,
    discount: 30,
    sku: 'BC-FERT-SWE-03',
    rating: 4.9,
    reviewsCount: 192,
    image: '/assets/products/prod_seaweed.png',
    images: [
      '/assets/products/prod_seaweed.png'
    ],
    shortDescription: 'Concentrated growth stimulant and bio-nutrition cold-extracted from pristine Ascophyllum kelp.',
    description: 'Feed your garden professional botanical nutrition. BioCart Seaweed Elixir is a highly concentrated growth booster produced via enzymatic cold-extraction of fresh Ascophyllum nodosum marine kelp. Packed with over 60 chelated micro-nutrients, natural plant hormones (auxins, cytokinins, gibberellins), and essential amino acids, it stimulates robust photosynthesis, vigorous lateral branching, and heavy chlorophyll accumulation.',
    features: [
      'Formulated via low-temperature extraction to protect delicate hormones',
      'Provides instant cellular nourishment via foliage or soil root drenching',
      'Highly concentrated: 1 Liter yields 200 Liters of nutrient feed',
      '100% vegan, eco-friendly, and safe for organic food crops'
    ],
    benefits: [
      'Boosts resistance against heat stress, frost, and transplant shock',
      'Promotes dense, shiny green foliage and increases flower-to-fruit ratio',
      'Nourishes beneficial soil fungi and microbes around roots'
    ],
    usageInstructions: [
      'Foliar Mist: Dilute 2ml to 3ml in 1 Liter of water. Spray fine mist on leaves early morning.',
      'Soil Drench: Dilute 5ml in 1 Liter of water. Pour directly around the root zone once a fortnight.',
      'Seed Treatment: Soak seeds in 1ml/L solution for 2 hours to speed germination.'
    ],
    ingredients: [
      '100% Pure Cold-Processed Ascophyllum Nodosum Kelp',
      'Natural Alginates & Plant Amino Chelates'
    ],
    weightVariants: ['250ml', '500ml', '1L'],
    selectedVariant: '250ml',
    stockStatus: 'In Stock',
    inStock: true,
    badge: 'Organic Booster',
    materials: 'Concentrated Liquid Kelp Extract',
    dimensions: 'UV-Protected Leakproof Recyclable Bottle',
    reviews: [
      {
        id: 'rev-s-1',
        user: 'Anjali Menon',
        rating: 5,
        date: '2026-06-11',
        comment: 'Amazing growth promoter! My money plant grew massive leaves in just three weeks of misting this solution.',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&h=120&q=80'
      }
    ]
  },
  {
    id: 'prod-fert-4',
    name: 'BioCart Steam-Sterilized Bone Meal Powder',
    category: 'Organic Fertilizers',
    vendorId: 'biocart',
    price: 179,
    mrp: 279,
    discount: 35,
    sku: 'BC-FERT-BMP-04',
    rating: 4.6,
    reviewsCount: 89,
    image: '/assets/products/prod_bone_meal.png',
    images: [
      '/assets/products/prod_bone_meal.png'
    ],
    shortDescription: 'Slow-release phosphate-rich organic bone meal, ideal for bulb development and heavy flowering.',
    description: 'Give your flowering plants and root vegetables a heavy dose of natural Phosphorus. BioCart Steamed Bone Meal is processed under high-pressure steam sterilization and finely ground to ensure swift nutrient release. With high organic Phosphorus and Calcium content, it fuels robust root branching, structural plant strength, and giant flower blooms like Hibiscus and Jasmine.',
    features: [
      'Steam-sterilized for complete hygiene and safety',
      'Rich in organic slow-release Phosphorus (P) and Calcium (Ca)',
      'Finely ground powder for optimized microbial breakdown',
      'Ideal for heavy flowering bulbs, tuber vegetables, and fruit plants'
    ],
    benefits: [
      'Triggers explosive, deep root elongation in young plants',
      'Fosters spectacular blooms and prevents blossom end rot',
      'Slowly releases nutrients, avoiding nitrogen leaf burns'
    ],
    usageInstructions: [
      'At planting time: Mix 2 tablespoons (approx. 30g) into the soil at the bottom of the planting hole.',
      'For established container plants: Apply 1-2 tablespoons around soil margins once every 6 weeks.',
      'Always dig it into the soil surface and water thoroughly.'
    ],
    ingredients: ['100% Steam-Sterilized Bovine Bone Meal'],
    weightVariants: ['900g', '2.5kg'],
    selectedVariant: '900g',
    stockStatus: 'In Stock',
    inStock: true,
    badge: 'Flower Power',
    materials: 'High-Pressure Steamed Organic Bone Powder',
    dimensions: 'Resealable Craft Zipper Pouch',
    reviews: [
      {
        id: 'rev-b-1',
        user: 'Vikram Joshi',
        rating: 5,
        date: '2026-04-18',
        comment: 'My Adenium and Hibiscus are blooming like crazy! Very fine powder, releases slowly and safely.',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80'
      }
    ]
  },
  {
    id: 'prod-pot-1',
    name: 'BioCart Triple-Washed Coco Peat Block (5kg)',
    category: 'Potting Mix',
    vendorId: 'biocart',
    price: 349,
    mrp: 499,
    discount: 30,
    sku: 'BC-POT-CPB-05',
    rating: 4.8,
    reviewsCount: 456,
    image: '/assets/products/prod_coco_peat.png',
    images: [
      '/assets/products/prod_coco_peat.png',
      'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=800&q=80'
    ],
    shortDescription: 'Triple-washed organic coco peat block, expandable to 75 liters of premium soil-less growing medium.',
    description: 'Our BioCart Premium Coco Peat Block is processed at our manufacturing facilities under low electrical conductivity (EC < 0.5 mS/cm) guidelines. Meticulously triple-washed with fresh water and steam-sterilized, it provides excellent root aeration, neutral pH, and high water-holding capacity (up to 8 times its dry weight). Excellent alternative to heavy garden soils or imported peat moss.',
    features: [
      'Extremely low electrical conductivity (EC < 0.5 mS/cm) prevents root stress',
      'Optimal pH balanced (5.8 - 6.5) for superior nutrient absorption',
      'Expands up to 75 Liters of fluffy, light growing medium',
      '100% biodegradable, sterile, and free from weeds and pathogens'
    ],
    benefits: [
      'Dramatically cuts watering requirements by retaining uniform moisture',
      'Prevents root compaction, promoting rapid, branched root systems',
      'Lightweight medium, perfect for high-rise balconies and terrace structures'
    ],
    usageInstructions: [
      'Place the compressed 5kg block inside a large tub or container.',
      'Pour 20 to 25 Liters of lukewarm water slowly over the block.',
      'Allow expansion for 15-20 minutes, then fluff with hands to loosen.'
    ],
    ingredients: ['100% Organic Aged Coconut Coir Pith'],
    weightVariants: ['5kg Block', '10kg (Pack of 2)'],
    selectedVariant: '5kg Block',
    stockStatus: 'In Stock',
    inStock: true,
    badge: 'Lighter Pots',
    materials: 'Triple-Washed Coconut Coir Pith',
    dimensions: '30cm x 30cm x 12cm Compressed Block',
    reviews: [
      {
        id: 'rev-cp-1',
        user: 'Hema Chandra',
        rating: 5,
        date: '2026-06-20',
        comment: 'This is exceptionally clean. Zero sand content and expanded exactly as advertised. Best coco peat in India.',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=120&h=120&q=80'
      }
    ]
  },
  {
    id: 'prod-pot-2',
    name: 'BioCart Super-Aeration Horticultural Perlite',
    category: 'Potting Mix',
    vendorId: 'biocart',
    price: 189,
    mrp: 299,
    discount: 36,
    sku: 'BC-POT-PRL-06',
    rating: 4.6,
    reviewsCount: 118,
    image: '/assets/products/prod_perlite.png',
    images: [
      '/assets/products/prod_perlite.png'
    ],
    shortDescription: 'Expanded volcanic perlite, crucial for permanent root aeration and instant container drainage.',
    description: 'Prevent root rot and soil logging. BioCart Horticultural Perlite consists of sterile, lightweight expanded volcanic glass heated to over 1600°F. The rapid heating causes water molecules to flash into steam, expanding the granules up to 20 times their size. This creates countless microscopic cavities that catch oxygen and moisture, keeping heavy soil loose, well-aerated, and free-draining.',
    features: [
      'Fully sterile, odorless, and neutral pH (7.0)',
      'Permanent cellular structure that does not rot or decay',
      'Provides capillary action for uniform water and food distribution',
      'Free from chemical toxins, heavy metals, or weeds'
    ],
    benefits: [
      'Maintains soil aeration, preventing roots from suffocation',
      'Facilitates lightning-fast drainage, avoiding root compaction',
      'Essential additive for seed germination and indoor propagation'
    ],
    usageInstructions: [
      'Standard Soil Mix: Mix 15% to 20% Perlite by volume with soil and coco peat.',
      'Cacti & Succulents: Use up to 40% Perlite to guarantee rapid drainage.',
      'Slightly moisten Perlite before mixing to prevent fine dust from rising.'
    ],
    ingredients: ['100% Natural Expanded Volcanic Perlite'],
    weightVariants: ['5 Liters', '10 Liters'],
    selectedVariant: '5 Liters',
    stockStatus: 'In Stock',
    inStock: true,
    badge: 'Rot Shield',
    materials: 'Expanded Volcanic Glass Perlite',
    dimensions: 'Ultra-Lightweight Recycled Plastic Pouch',
    reviews: [
      {
        id: 'rev-pr-1',
        user: 'Devansh Roy',
        rating: 4,
        date: '2026-05-15',
        comment: 'Large white perlite pieces, very dusty though. Moisten before opening. Works wonders for my custom monstera mix!',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80'
      }
    ]
  },
  {
    id: 'prod-pot-3',
    name: 'BioCart Ready-To-Pot Premium Soil Mix',
    category: 'Potting Mix',
    vendorId: 'biocart',
    price: 299,
    mrp: 449,
    discount: 33,
    sku: 'BC-POT-RTP-07',
    rating: 4.9,
    reviewsCount: 284,
    image: '/assets/products/prod_soil_mix.png',
    images: [
      '/assets/products/prod_soil_mix.png'
    ],
    shortDescription: '100% soil-less organic growing medium pre-mixed with coco peat, vermicompost, perlite, and neem cake.',
    description: 'Save yourself the labor of measuring and mixing ingredients. BioCart Ready-To-Pot Premium Soil Mix is a professional soil-less growing substrate engineered for indoor and outdoor container plants. Combining triple-washed low-EC coco peat, double-screened rich vermicompost, volcanic perlite, and cold-pressed neem cake powder, it is naturally fertilized and pest-resistant. Excellent for leafy vegetables, herbs, and flowers.',
    features: [
      '100% soil-less and lightweight organic composition',
      'Pre-fertilized to nourish seedlings continuously for 60 days',
      'Infused with neem cake powder for proactive root-pest shield',
      'Provides perfect water retention and instant capillary drainage'
    ],
    benefits: [
      'Ready to use immediately—no mixing or mess',
      'Ensures superb aeration, preventing compact, choked root zones',
      'Reduces balcony weight load by over 60% compared to heavy soil'
    ],
    usageInstructions: [
      'Fill clean pots or BioCart grow bags with the soil-less mix.',
      'Sow seeds directly or plant your nursery transplant.',
      'Press soil gently around the stem, water heavily, and place in suitable light.'
    ],
    ingredients: [
      'Triple-Washed Low-EC Coco Peat',
      'Rich Organic Earthworm Vermicompost',
      'Volcanic Capillary Perlite',
      'Pure Neem Cake Powder',
      'Beneficial Mycorrhizae Fungi'
    ],
    weightVariants: ['5kg Bag', '10kg Bag', '20kg (Pack of 2)'],
    selectedVariant: '5kg Bag',
    stockStatus: 'In Stock',
    inStock: true,
    badge: '100% Organic',
    materials: 'Complete Soil-less Potting Compound',
    dimensions: 'Sealed Heavy-Duty Bio-Degradable Bag',
    reviews: [
      {
        id: 'rev-rt-1',
        user: 'Sweta Patel',
        rating: 5,
        date: '2026-07-01',
        comment: 'So fluffy and clean! Used it to plant chilies and basil. They sprouted healthy leaves within days.',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&h=120&q=80'
      }
    ]
  },
  {
    id: 'prod-seeds-1',
    name: 'BioCart Heirloom Vegetable Seeds Box',
    category: 'Seeds',
    vendorId: 'biocart',
    price: 249,
    mrp: 399,
    discount: 37,
    sku: 'BC-SEED-HVC-08',
    rating: 4.7,
    reviewsCount: 310,
    image: '/assets/products/prod_veg_seeds.png',
    images: [
      '/assets/products/prod_veg_seeds.png'
    ],
    shortDescription: 'Collection of 10 easy-germination Indian heirloom seed packs, open-pollinated and non-hybrid.',
    description: 'Grow your own delicious organic veggies at home. The BioCart Heirloom Vegetable Collection comprises 10 individually packed easy-grow vegetable seed packets. Includes Cherry Tomato, Guntur Hot Pepper, Lady Finger, Red Spinach, Green Coriander, White Radish, Long Cucumber, Purple Brinjal, French Beans, and Summer Squash. Open-pollinated and open-source, these seeds are naturally hardier.',
    features: [
      'Contains 10 individual, distinct vegetable packets',
      '100% non-hybrid, heirloom, open-pollinated seed stock',
      'Tested for over 85% germination rate in Guntur test labs',
      'Hermetically packed with silica gel to protect seed viability'
    ],
    benefits: [
      'Grow crisp, pesticide-free fresh food for your household',
      'Highly adaptive varieties suited for tropical Indian weather',
      'Vastly cheaper and healthier than market-sourced vegetables'
    ],
    usageInstructions: [
      'Sow smaller seeds (tomato, chilli) 0.5cm deep in starter trays.',
      'Sow larger seeds (okra, beans) directly in 12-inch grow bags.',
      'Maintain potting medium moisture and shelter from direct noon sun.'
    ],
    ingredients: [
      'Heirloom Vegetable Seeds',
      'Natural Herbal Anti-Fungal Protective Coating'
    ],
    weightVariants: ['Standard Pack (10 Varieties)'],
    selectedVariant: 'Standard Pack (10 Varieties)',
    stockStatus: 'In Stock',
    inStock: true,
    badge: 'Non-Hybrid',
    materials: 'Heirloom Non-GMO Vegetable Seeds',
    dimensions: 'Premium Kraft Paper Box Packaging',
    reviews: [
      {
        id: 'rev-se-1',
        user: 'Madhavan Nair',
        rating: 5,
        date: '2026-06-05',
        comment: 'Almost every single seed germinated! The cherry tomatoes are already flowering. Incredible quality.',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80'
      }
    ]
  },
  {
    id: 'prod-seeds-2',
    name: 'BioCart Organic Culinary Herb Seeds Set',
    category: 'Seeds',
    vendorId: 'biocart',
    price: 199,
    mrp: 299,
    discount: 33,
    sku: 'BC-SEED-CHS-09',
    rating: 4.8,
    reviewsCount: 167,
    image: '/assets/products/prod_herb_seeds.png',
    images: [
      '/assets/products/prod_herb_seeds.png'
    ],
    shortDescription: 'Exquisite set of 6 aromatic culinary herb seed packets, optimized for sunny windowsill pots.',
    description: 'Grow your own fragrant, organic culinary herbs at home. This premium set features 6 hermetically sealed seed packets: Sweet Italian Basil, Spearmint, Greek Oregano, French Rosemary, English Thyme, and Flat-Leaf Parsley. Selected for high essential-oil concentration and high-germination in pots, they bring rich gourmet flavors straight to your indoor culinary kitchen.',
    features: [
      '6 selected high-grade gourmet herb varieties',
      'Optimized for container gardening and indoor window ledges',
      'Packaged in moisture-locked aluminum barrier packets',
      'Includes colored wooden markers and sowing calendar'
    ],
    benefits: [
      'Drip fresh, poison-free herbs directly onto your culinary plates',
      'Fills kitchens with natural, oxygenating herbal aromas',
      'Fosters easy gardening habit for complete beginners'
    ],
    usageInstructions: [
      'Fill a 6-inch pot with moist BioCart potting soil.',
      'Scatter seeds lightly over soil, covering with 2mm layer of coco peat.',
      'Mist gently with water and cover with a transparent sheet till sprouts emerge.'
    ],
    ingredients: ['6 Herb Seed Varieties (Basil, Mint, Oregano, Rosemary, Thyme, Parsley)'],
    weightVariants: ['Standard Pack (6 Herbs)'],
    selectedVariant: 'Standard Pack (6 Herbs)',
    stockStatus: 'In Stock',
    inStock: true,
    badge: 'Gourmet Selection',
    materials: 'Hermetic Culinary Herb Seeds',
    dimensions: 'Minimalist Recycled Paper Sleeve',
    reviews: [
      {
        id: 'rev-hb-1',
        user: 'Kriti Verma',
        rating: 5,
        date: '2026-05-30',
        comment: 'Beautiful presentation. Sowed basil and parsley, both sprouted in 4 days. The kitchen smells amazing!',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&h=120&q=80'
      }
    ]
  },
  {
    id: 'prod-care-1',
    name: 'BioCart Cold-Pressed Pure Neem Oil Spray',
    category: 'Plant Care',
    vendorId: 'biocart',
    price: 299,
    mrp: 449,
    discount: 33,
    sku: 'BC-CARE-NOS-10',
    rating: 4.8,
    reviewsCount: 542,
    image: '/assets/products/prod_neem_oil.png',
    images: [
      '/assets/products/prod_neem_oil.png'
    ],
    shortDescription: 'Organic pre-emulsified foliage spray, shields plants from mealybugs, mites, and leaf mildew.',
    description: 'Keep your garden toxic-free with BioCart Cold-Pressed Neem Oil Foliage Spray. Sourced from cold-pressing oil-rich neem kernels, this ready-to-use solution is pre-emulsified with biodegradable plant-based saponins. It provides multi-action systemic defense against mealybugs, aphids, spider mites, thrips, and black spot fungus, while leaving a beautiful waxy leaf shine. Non-toxic to dogs, cats, and birds.',
    features: [
      'Pre-emulsified ready-to-use formula—no messy water mixing required',
      'Naturally derived from organic cold-pressed cold-lake neem kernels',
      'Acts as a broad-spectrum pest repeller and anti-fungal shield',
      'Fitted with a heavy-duty, reusable high-output spray nozzle'
    ],
    benefits: [
      'Disrupts larval breeding cycles without chemicals',
      'Polishes foliage to a beautiful dust-resistant glossy shine',
      'Safe for organic food gardens right up to the day of harvesting'
    ],
    usageInstructions: [
      'Shake the container vigorously before each spraying session.',
      'Mist both upper and lower leaf surfaces, stems, and soil base.',
      'Apply every 7-10 days under late afternoon shade to prevent leaf scorch.'
    ],
    ingredients: [
      '98.5% Emulsified Hydrophobic Extract of Neem',
      '1.5% Biodegradable Plant Saponins'
    ],
    weightVariants: ['500ml Spray', '1L Refill Pouch'],
    selectedVariant: '500ml Spray',
    stockStatus: 'In Stock',
    inStock: true,
    badge: 'Best Seller',
    materials: 'Cold-Pressed Botanical Neem Formula',
    dimensions: 'UV-Protected High-Density Trigger Bottle',
    reviews: [
      {
        id: 'rev-ne-1',
        user: 'Anoop Nair',
        rating: 5,
        date: '2026-06-18',
        comment: 'Cleared mealybugs from my Hibiscus in two applications. Smells organic but works instantly! Pet-safe is a massive plus.',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80'
      }
    ]
  },
  {
    id: 'prod-care-2',
    name: 'BioCart Botanical Pesticide & Fungicide Spray',
    category: 'Plant Care',
    vendorId: 'biocart',
    price: 329,
    mrp: 499,
    discount: 34,
    sku: 'BC-CARE-OBF-11',
    rating: 4.7,
    reviewsCount: 134,
    image: '/assets/products/prod_pesticide.png',
    images: [
      '/assets/products/prod_pesticide.png'
    ],
    shortDescription: 'Dual-action copper-complexed anti-fungal mist and natural insect repeller extracted from herbs.',
    description: 'Shield plant tissues from leaf spot, powdery mildew, downy mildew, blight, and leaf curl. BioCart Botanical Pesticide & Fungicide is derived by cold-fermenting premium botanical extracts (including wild garlic and ginger concentrates) infused with copper chelate. It naturally boosts the plant’s internal cellular defense mechanism, protecting foliage safely and effectively.',
    features: [
      'Broad-spectrum botanical fungicide and systemic insect repeller',
      'Non-chemical, derived from fermented therapeutic crop leaves',
      'Triggers systemic acquired resistance (SAR) in vegetable roots',
      'Fully biodegradable, safe for honeybees and useful ladybugs'
    ],
    benefits: [
      'Quickly cures white rust, black spots, and leaf blight diseases',
      'Forms a protective herbal layer on young growing leaves',
      'Prevents spore germination on damp plant tissue'
    ],
    usageInstructions: [
      'Shake bottle well.',
      'Spray mist generously over infected stems and leaves at first sign of disease.',
      'Repeat spray treatment every 5-7 days until foliage returns to healthy green.'
    ],
    ingredients: [
      'Fermented Garlic & Ginger Oils',
      'Systemic Copper-Chelate Compound',
      'Pure Purified Water'
    ],
    weightVariants: ['500ml Spray'],
    selectedVariant: '500ml Spray',
    stockStatus: 'In Stock',
    inStock: true,
    badge: 'Chemical-Free',
    materials: 'Fermented Herbal Antifungal Spray',
    dimensions: 'UV-Protected Ergonomic Spray Bottle',
    reviews: [
      {
        id: 'rev-fg-1',
        user: 'Mona Sengupta',
        rating: 5,
        date: '2026-05-12',
        comment: 'Cured powdery mildew on my cucumber plants perfectly. Highly recommend this over toxic chemical copper sprays.',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&h=120&q=80'
      }
    ]
  },
  {
    id: 'prod-care-3',
    name: 'BioCart Amber-Glass Fine-Mist Spray Bottle',
    category: 'Plant Care',
    vendorId: 'biocart',
    price: 399,
    mrp: 599,
    discount: 33,
    sku: 'BC-ACC-AGS-12',
    rating: 4.9,
    reviewsCount: 98,
    image: '/assets/products/prod_spray_bottle.png',
    images: [
      '/assets/products/prod_spray_bottle.png'
    ],
    shortDescription: 'Ergonomic 500ml heavy-duty glass spray bottle with an adjustable solid-brass nozzle.',
    description: 'Ditch single-use plastic misting triggers for BioCart’s elegant amber glass bottle. This reusable bottle is crafted from heavy-gauge, chemical-resistant amber glass that protects sensitive organic oils and neem solutions from damaging UV light. Fitted with an adjustable solid-brass nozzle, it transitions from a micro-fine water cloud to a high-pressure jet stream.',
    features: [
      'Thick, heavy-duty lead-free amber glass casing',
      'Protects organic liquid nutrients from light degradation',
      'Adjustable solid-brass spray nozzle tip',
      'Minimalist design that fits elegantly inside modern home lounges'
    ],
    benefits: [
      'Reduces household plastic waste significantly',
      'Provides a consistent, leak-proof, high-output stream',
      'Durable construction, built to withstand chemical oils'
    ],
    usageInstructions: [
      'Fill with water, diluted seaweed feed, or custom neem solutions.',
      'Turn brass nozzle to adjust spray from fine mist to stream.',
      'Rinse trigger with warm water occasionally to keep nozzle clear.'
    ],
    ingredients: [
      'Thick Amber Glass Bottle',
      'Solid Brass Spray Tip',
      'Polypropylene Trigger'
    ],
    weightVariants: ['Single 500ml Bottle'],
    selectedVariant: 'Single 500ml Bottle',
    stockStatus: 'In Stock',
    inStock: true,
    badge: 'Eco Living',
    materials: 'Durable Amber Glass & Brass Hardware',
    dimensions: 'Height: 22cm, Diameter: 7.5cm, Weight: 350g',
    reviews: [
      {
        id: 'rev-gl-1',
        user: 'Tanya Sen',
        rating: 5,
        date: '2026-06-25',
        comment: 'Incredibly premium! The brass nozzle is heavy and sprays a beautiful, misty cloud. Looks amazing on my plant shelf.',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80'
      }
    ]
  },
  {
    id: 'prod-acc-1',
    name: 'BioCart Heavy-Duty Jute Grow Bags (Set of 5)',
    category: 'Gardening Accessories',
    vendorId: 'biocart',
    price: 499,
    mrp: 799,
    discount: 37,
    sku: 'BC-ACC-JGB-13',
    rating: 4.8,
    reviewsCount: 224,
    image: '/assets/products/prod_jute_bags.png',
    images: [
      '/assets/products/prod_jute_bags.png'
    ],
    shortDescription: 'Thick, breathable golden jute fabric pots with sturdy cotton handles, perfect for root aeration.',
    description: 'Transition from ugly plastic grow bags to BioCart Jute Grow Bags. Hand-woven from thick, heavy-duty 100% natural golden jute fibers, these grow bags offer exceptional root-zone respiration. The porous fabric naturally "air-prunes" roots when they reach the bag margins, triggering rich lateral root branching instead of circling. Thick handles allow you to reposition your balcony garden.',
    features: [
      'Spun from 100% organic, biodegradable golden jute fibers',
      'Highly porous structure guarantees root-system aeration',
      'Durable cotton webbing handles for comfortable carrying',
      'Natural water filtration prevents overwatering and root decay'
    ],
    benefits: [
      'Produces cool root temperatures in heavy summer heat',
      'Prevents root compaction, maximizing organic vegetable yield',
      'Adds a warm, natural texture to high-end home patios'
    ],
    usageInstructions: [
      'Fill Jute Grow Bags with BioCart Ready-To-Pot soil mix.',
      'Sow seeds or insert plant transplants directly.',
      'Ensure grow bags sit on drainage trays if placed indoors.'
    ],
    ingredients: [
      '100% Natural Golden Jute Fiber',
      'Cotton Webbing Stitching'
    ],
    weightVariants: ['5 Gallons (Set of 5)', '7 Gallons (Set of 5)'],
    selectedVariant: '5 Gallons (Set of 5)',
    stockStatus: 'In Stock',
    inStock: true,
    badge: 'Zero Plastic',
    materials: 'High-Density Golden Jute Fiber',
    dimensions: 'Diameter: 12 inches, Height: 12 inches (5 Gallons each)',
    reviews: [
      {
        id: 'rev-gb-1',
        user: 'Anoop Reddy',
        rating: 5,
        date: '2026-06-22',
        comment: 'Excellent thick grow bags. The handles are very sturdy even when filled with wet soil. Tomatoes are loving it.',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80'
      }
    ]
  },
  {
    id: 'prod-acc-2',
    name: 'BioCart Hand-Pressed Biodegradable Coir Pots',
    category: 'Gardening Accessories',
    vendorId: 'biocart',
    price: 249,
    mrp: 349,
    discount: 28,
    sku: 'BC-ACC-CSP-14',
    rating: 4.9,
    reviewsCount: 185,
    image: '/assets/products/prod_coir_pots.png',
    images: [
      '/assets/products/prod_coir_pots.png'
    ],
    shortDescription: 'Plant-starter pots pressed from coir, allows plants to be transplanted directly into soil.',
    description: 'Avoid transplant shock entirely with BioCart’s biodegradable coco coir plant starter cups. Hand-pressed at our Guntur processing facility using organic coconut coir fibers and food-grade natural plant starches, these pots are fully permeable to air, water, and roots. Root systems penetrate the coir walls naturally. When ready to transplant, simply bury the entire pot directly into soil—no root damage, no plastic waste.',
    features: [
      'Formed from 100% natural, pesticide-free coconut coir',
      'Roots breathe and exit coir walls freely (air-pruning)',
      'Banish transplant root shock—plant pot and all directly in ground',
      'Decomposes organically inside soil over 12-16 weeks, enriching humus'
    ],
    benefits: [
      'Keeps seedlings exceptionally hydrated and aerated during early sprout',
      'Saves gardeners the struggle of dislodging roots from plastic cups',
      '100% compostable and climate-neutral manufacturing'
    ],
    usageInstructions: [
      'Fill coir starter pots with moist coco peat starter mix.',
      'Sow 2-3 seeds per pot and keep moist under warm shade.',
      'Once seedlings grow 3-4 true leaves, dig a hole and place the entire pot inside.'
    ],
    ingredients: [
      'Triple-Washed Coir Fiber Pith',
      'Food-Grade Organic Tapioca Starch Binder'
    ],
    weightVariants: ['3-inch Round (Set of 24)', '4-inch Round (Set of 12)'],
    selectedVariant: '3-inch Round (Set of 24)',
    stockStatus: 'In Stock',
    inStock: true,
    badge: 'Anti-Shock',
    materials: 'Natural Coconut Coir Fiber',
    dimensions: 'Set of 24 round pots, Diameter: 3 inches each',
    reviews: [
      {
        id: 'rev-cp-pot-1',
        user: 'Siddharth M.',
        rating: 5,
        date: '2026-04-12',
        comment: 'A total game changer for seedlings. Buried the whole pot, and the plants did not drop a single leaf. Brilliant.',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&h=120&q=80'
      }
    ]
  },
  {
    id: 'prod-acc-3',
    name: 'BioCart Handcrafted Solid Brass Watering Can',
    category: 'Gardening Accessories',
    vendorId: 'biocart',
    price: 1899,
    mrp: 2499,
    discount: 24,
    sku: 'BC-ACC-BWC-15',
    rating: 4.9,
    reviewsCount: 76,
    image: '/assets/products/prod_watering_can.png',
    images: [
      '/assets/products/prod_watering_can.png',
      'https://images.unsplash.com/photo-1520412099551-62b6bafeb5bb?auto=format&fit=crop&w=800&q=80'
    ],
    shortDescription: 'Exquisite 1.5L solid raw brass watering vessel with an extra-long drip-free spout for precise spot pouring.',
    description: 'Merge artisanal beauty with home utility. Handcrafted by master metal smiths in Southern India, this watering vessel is made of 100% solid raw brass. Its extra-long thin spout offers ultimate gravity-pour control, depositing water directly onto the soil base of high-end houseplants, bonsai, or terrariums, preventing leaf-rot. A beautiful heirloom piece that develops a rich vintage patina.',
    features: [
      'Forged from heavy-duty 100% solid raw brass sheets',
      'Ultra-thin long pouring spout for spot-on watering precision',
      'Ergonomically balanced handle provides comfortable hand grip',
      'Completely leak-proof double-brazed joints'
    ],
    benefits: [
      'Avoids water spills on wood surfaces and delicate foliage',
      'Corrosion-resistant and rust-proof raw brass lasts generations',
      'Brings an aesthetic, premium sculptural touch to your conservatory'
    ],
    usageInstructions: [
      'Fill up to 1.5 Liters of lukewarm water or dissolved seaweed plant food.',
      'Tilt gracefully to pour, holding the spout near the soil surface.',
      'Polish with metal polish to maintain gold luster or let a dark vintage patina form naturally.'
    ],
    ingredients: ['100% Solid Brass Metal'],
    weightVariants: ['1.5 Liters Can'],
    selectedVariant: '1.5 Liters Can',
    stockStatus: 'In Stock',
    inStock: true,
    badge: 'Artisanal Luxury',
    materials: 'Solid Raw Heavy-Gauge Brass',
    dimensions: 'Spout Length: 25cm, Base Diameter: 12cm, Capacity: 1.5L',
    reviews: [
      {
        id: 'rev-br-1',
        user: 'Vikram Aditya',
        rating: 5,
        date: '2026-07-03',
        comment: 'Pure luxury! The pouring action is slow, smooth, and incredibly precise. Worth every rupee.',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80'
      }
    ]
  },
  {
    id: 'prod-acc-4',
    name: 'BioCart FSC Ash-Wood Professional Hand Tools Set',
    category: 'Gardening Accessories',
    vendorId: 'biocart',
    price: 849,
    mrp: 1299,
    discount: 34,
    sku: 'BC-ACC-AWT-16',
    rating: 4.8,
    reviewsCount: 102,
    image: '/assets/products/prod_hand_tools.png',
    images: [
      '/assets/products/prod_hand_tools.png'
    ],
    shortDescription: 'Premium 3-piece hand tools set, made with hand-polished carbon steel and FSC ash-wood handles.',
    description: 'Work with professional precision. This premium 3-piece gardening set includes a narrow transplanting trowel, a wide soil scoop trowel, and a heavy-duty hand cultivator rake. Hand-forged from rust-resistant black powder-coated high-carbon steel, these tools are double-riveted into premium solid English Ash-Wood handles. Carved to fit comfortably, they minimize strain during soil prep.',
    features: [
      'Forged from heavy-duty high-carbon steel, stays sharp and sturdy',
      'Handles turned from sustainable FSC English Ash-Wood',
      'Solid brass collars prevent handle wobble and blade splitting',
      'Integrated thick natural leather wrist loops for rustic wall hanging'
    ],
    benefits: [
      'Easily cuts through hard root clumps and dense clay soil layers',
      'Ergonomic ash handles isolate vibrations, preventing blistered hands',
      'Engineered to last a lifetime with proper metal cleaning'
    ],
    usageInstructions: [
      'Use the transplant trowel to dig clean holes for seedlings.',
      'Use the cultivator rake to turn, aerate, and weed container soils.',
      'Wipe metal blades clean and dry with an oily rag before storing.'
    ],
    ingredients: [
      'Powder-Coated High-Carbon Steel Blades',
      'Sustainable FSC Ash-Wood Handles',
      'Solid Brass Safety Collars'
    ],
    weightVariants: ['3-Piece Hand Set'],
    selectedVariant: '3-Piece Hand Set',
    stockStatus: 'In Stock',
    inStock: true,
    badge: 'Premium Handcraft',
    materials: 'Ash-Wood Handles & High-Carbon Steel',
    dimensions: 'Trowel Length: 31cm, cultivator Length: 29cm',
    reviews: [
      {
        id: 'rev-tl-1',
        user: 'Sandhya Rao',
        rating: 5,
        date: '2026-06-21',
        comment: 'These feel so balanced and solid in hand. Zero bending when digging hard garden soil. Very nice leather straps too.',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&h=120&q=80'
      }
    ]
  },
  {
    id: 'prod-life-1',
    name: 'BioCart Smart Window-Sill Organic Herb Kit',
    category: 'Healthy Living',
    vendorId: 'biocart',
    price: 599,
    mrp: 899,
    discount: 33,
    sku: 'BC-LIFE-KGK-17',
    rating: 4.9,
    reviewsCount: 142,
    image: '/assets/products/prod_herb_kit.png',
    images: [
      '/assets/products/prod_herb_kit.png'
    ],
    shortDescription: 'All-inclusive kitchen gardening box with coir pots, coco peat, labels, and 3 easy-germinate organic herb seeds.',
    description: 'Grow fresh culinary garnishes right inside your kitchen window. The BioCart Smart Window-Sill Organic Herb Kit is an all-in-one starter box designed to introduce beginners to sustainable food growing. It contains 3 premium coir pots, compressed organic coco peat soil discs, 3 bamboo plant markers, and 3 high-viability heirloom seed packets: Sweet Italian Basil, Curly Parsley, and Cherry Tomatoes.',
    features: [
      'Complete seed starter kit—no extra accessories needed',
      'Includes premium high-essential-oil culinary seed varieties',
      'Fully biodegradable coir cups and sustainable bamboo soil markers',
      'Packed in a gorgeous, clean, minimalist wooden display container'
    ],
    benefits: [
      'Constant access to fresh, pesticide-free culinary garnishes',
      'Fosters a soothing, oxygen-rich environment on windowsills',
      'Perfect, high-end sustainable green gift pack for loved ones'
    ],
    usageInstructions: [
      'Place the compressed coco discs inside the coir pots and pour in warm water.',
      'Let discs expand completely into moist, fluffy potting soil.',
      'Sow seeds lightly, cover with a thin layer of soil, and label with the bamboo markers.'
    ],
    ingredients: [
      '3 Biodegradable Coir Pots',
      '3 Expandable Coco Peat Discs',
      '3 Heirloom Seed Packs (Basil, Parsley, Tomato)',
      '3 Reusable Bamboo Markers',
      '1 Pinewood Display Tray'
    ],
    weightVariants: ['Complete Organic Kit'],
    selectedVariant: 'Complete Organic Kit',
    stockStatus: 'In Stock',
    inStock: true,
    badge: 'Window Garden',
    materials: 'Sustainably Harvested Pine & Organic Fibers',
    dimensions: 'Tray Length: 35cm, Width: 12cm, Weight: 850g',
    reviews: [
      {
        id: 'rev-kt-1',
        user: 'Preeti Sharma',
        rating: 5,
        date: '2026-06-29',
        comment: 'Gifted this to my mother, she absolutely loved it. The basil sprouted so quickly, and the wooden tray looks very chic.',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80'
      }
    ]
  },
  {
    id: 'prod-life-2',
    name: 'BioCart Balcony Organic Terrace Farm Bundle',
    category: 'Healthy Living',
    vendorId: 'biocart',
    price: 1499,
    mrp: 2299,
    discount: 34,
    sku: 'BC-LIFE-TGB-18',
    rating: 4.9,
    reviewsCount: 84,
    image: '/assets/products/prod_farm_bundle.png',
    images: [
      '/assets/products/prod_farm_bundle.png'
    ],
    shortDescription: 'Complete professional terrace farming bundle with bags, coco soil, vermicompost, neem spray, and heirloom seeds.',
    description: 'Convert your empty terrace or high-rise balcony into an organic vegetable farm with this professional, all-inclusive starter bundle. Carefully curated by Co-Founder Tagore Subhash, this deluxe kit contains 5 heavy-duty jute grow bags, 2 large compressed 5kg coco peat blocks, 5kg of nutrient-dense organic vermicompost, 1 bottle of ready-to-use cold-pressed neem pesticide spray, 10 packets of heirloom Indian vegetable seeds, and a professional ash-wood trowel.',
    features: [
      'The ultimate all-inclusive setup for 5 balcony planters',
      'Combines premium soil-less growing mediums and organic pest shields',
      'Provides a diverse seed range for salads, greens, and vegetables',
      'Saves you up to 35% compared to purchasing components separately'
    ],
    benefits: [
      'Instantly establishes a fully organic, productive home food zone',
      'Guarantees zero chemical fertilizers or plastic leaching in your vegetables',
      'A wonderful, soothing recreational hobby for urban apartments'
    ],
    usageInstructions: [
      'Hydrate the compressed coco peat blocks in a large bucket.',
      'Mix expanded coco peat with the 5kg organic vermicompost.',
      'Fill Jute Grow Bags, sow your heirloom seed packets, and use neem spray to shield sprouts.'
    ],
    ingredients: [
      '5 Heavy-Duty Jute Grow Bags',
      '2 Expandable 5kg Coco Peat Blocks',
      '1 Multi-Layer Bag of Vermicompost (5kg)',
      '1 Trigger Bottle of Neem Spray (500ml)',
      '10 Packs of Heirloom Veg Seeds',
      '1 FSC Ash-Wood Trowel'
    ],
    weightVariants: ['Deluxe Balcony Bundle'],
    selectedVariant: 'Deluxe Balcony Bundle',
    stockStatus: 'Low Stock',
    inStock: true,
    badge: 'Deluxe Bundle',
    materials: 'Complete Balcony Farm Supplies',
    dimensions: 'Massive Box Delivery, Total Weight: Approx 18kg',
    reviews: [
      {
        id: 'rev-bd-1',
        user: 'Ananya S.',
        rating: 5,
        date: '2026-07-04',
        comment: 'This bundle is perfect. The coco peat was easy to expand, and the vermicompost is premium. The jute bags look very clean. Sowed chili, spinach, ladyfinger, okra—everything germinated.',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&h=120&q=80'
      }
    ]
  }
];

export const SEED_TESTIMONIALS: Testimonial[] = [
  {
    id: 'test-1',
    name: 'Anjali Sharma',
    role: 'Home Gardener & Balcony Farmer, Bangalore',
    quote: 'Switching to BioCart was the best decision for my terrace garden. The Premium Coco Peat and Jute Grow Bags are exceptional. My tomatoes are thriving without any plastic waste. The brand truly represents premium luxury and sustainability.',
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&h=120&q=80'
  },
  {
    id: 'test-2',
    name: 'Dr. Vikram Reddy',
    role: 'Environmental Scientist & Hobbyist, Hyderabad',
    quote: 'As a scientist, I am extremely particular about chemical leaching. BioCart\'s commitment to zero plastic and fully chemical-free plant nutrition is highly commendable. Their solid brass watering can and bamboo planters are stunning works of art.',
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80'
  },
  {
    id: 'test-3',
    name: 'Pritha Sen',
    role: 'Interior Landscape Designer, Mumbai',
    quote: 'BioCart products do not look like your usual agricultural supplies. They have an Apple-like minimalistic elegance that blends perfectly with modern, luxury interiors. My clients are absolutely obsessed with the hand-turned bamboo pots.',
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&h=120&q=80'
  }
];

export const FOUNDERS: Founder[] = [
  {
    name: 'Prashanthi Pallapothula',
    role: 'Founder & CEO',
    bio: 'Prashanthi envisioned BioCart with a single-minded goal: to make sustainable and plastic-free lifestyle accessible and luxurious. Driven by a deep passion for chemical-free farming and environmental conservation, she leads the product R&D and design teams. Under her leadership, BioCart is setting new benchmarks in quality, organic standards, and ecological integrity across India.',
    image: '/assets/founder_prashanthi.jpg',
    signature: 'Prashanthi P.'
  },
  {
    name: 'Tagore Subhash Maguluri',
    role: 'Co-Founder & COO',
    bio: 'Tagore heads global supply chain, logistics, and operational scaling at BioCart. With years of experience in agricultural operations and sustainable logistics, he is instrumental in building the brand\'s direct-to-consumer infrastructure and launching dealer-distributor networks. Tagore is dedicated to ensuring that BioCart’s operations meet carbon-neutral and circular-economy standards.',
    image: '/assets/founder_tagore.jpg',
    signature: 'Tagore S. Maguluri'
  }
];

export const TIMELINE: TimelineItem[] = [
  {
    year: '2023',
    title: 'The Inception',
    description: 'Sindulis Agro Products was registered with the core philosophy of promoting zero-chemical and zero-plastic home gardening in India.'
  },
  {
    year: '2024',
    title: 'Research & Operations',
    description: 'Established our state-of-the-art coir processing and organic composting operations, testing early BioCart prototypes.'
  },
  {
    year: '2025',
    title: 'Direct-To-Consumer Launch',
    description: 'Introduced BioCart in major metropolitan areas, providing premium biodegradable alternatives to plastic containers and soil bags.'
  },
  {
    year: '2026',
    title: 'The Future of Living',
    description: 'Scaling to all-India availability while launching global export variants to represent premium sustainable living on the international stage.'
  }
];

export const SEED_FAQS: FAQ[] = [
  {
    id: 'faq-1',
    question: 'What makes BioCart coco peat different from others in the market?',
    answer: 'Most commercially available coco peat has high salinity and sand content which stunt plant growth. BioCart coco peat undergoes rigorous triple washing, resulting in a low electrical conductivity (EC < 0.5 mS/cm) and a perfectly balanced pH. We process our husk in Guntur under strict quality protocols, ensuring zero weeds or disease spores.',
    category: 'products'
  },
  {
    id: 'faq-2',
    question: 'How do the biodegradable coir pots work?',
    answer: 'Our coir pots are entirely made of raw coconut coir fibers held together with natural, organic binders. Roots can breathe and easily grow right through the porous walls of the pot. When transplanting, you don’t pull the plant out. Instead, bury the entire pot in the ground. The coir pot decomposes within 12-16 weeks, enriching the soil with organic matter.',
    category: 'gardening'
  },
  {
    id: 'faq-3',
    question: 'Does BioCart deliver across India? How is the shipping packaged?',
    answer: 'Yes! We ship all across India. True to our vision, 100% of our shipping containers, tapes, and box stuffing are plastic-free. We use recycled paper tubes, certified compostable starch mailers, and cardboard boxes sealed with water-activated starch paper tape.',
    category: 'shipping'
  },
  {
    id: 'faq-4',
    question: 'How can I register as a wholesale dealer or regional distributor?',
    answer: 'We welcome regional partners who share our green vision. You can fill out our dealer/distributor enquiry form on the Contact page. Our executive team, led by Co-Founder Tagore Subhash, reviews submissions within 24 hours to set up inventory allocations, exclusive territories, and bulk shipping schedules.',
    category: 'partnership'
  },
  {
    id: 'faq-5',
    question: 'Is your Neem Spray completely safe for indoor pets?',
    answer: 'Absolutely. BioCart Neem Spray is cold-pressed and diluted using organic emulsifiers without a single drop of synthetic pesticide, chemical solvents, or toxic additives. It has a natural, mild herbal aroma and is 100% safe to spray around dogs, cats, and birds.',
    category: 'products'
  }
];
