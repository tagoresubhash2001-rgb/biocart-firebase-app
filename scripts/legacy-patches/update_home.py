import re

with open('src/components/Home.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
import_hook = "import { useHomepageCMS } from '../hooks/useHomepageCMS';\n"
if "useHomepageCMS" not in content:
    content = content.replace("import { useApp } from '../context/AppContext';", "import { useApp } from '../context/AppContext';\n" + import_hook)

# Add hook call
if "const { cms } = useHomepageCMS();" not in content:
    content = content.replace("export const Home: React.FC = () => {", "export const Home: React.FC = () => {\n  const { cms } = useHomepageCMS();")

# Replace strings in Hero
content = content.replace(">Sindulis Agro Products Presents<", ">{cms.hero.badgeText}<")
content = content.replace("BioCart – The Way of <br />", "{cms.hero.titleLine1}")
content = content.replace(">Healthy, Organic<", " dangerouslySetInnerHTML={{ __html: cms.hero.titleLine2 }}><")
content = content.replace("> Life\n                </>", "> {cms.hero.titleLine3}\n                </>")
content = content.replace('Indulge in premium organic living. Crafted carefully with certified zero-chemical formulations and 100% plastic-free commitments.', '{cms.hero.subtitle}')
content = content.replace(">Explore Premium Collection<", ">{cms.hero.primaryButtonText}<")
content = content.replace("Our Green Commitments", "{cms.hero.secondaryButtonText}")
content = content.replace(">Scroll to discover<", ">{cms.hero.scrollIndicatorText}<")

# Stats mapping
stats_repl = """  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'ShieldCheck': return ShieldCheck;
      case 'Leaf': return Leaf;
      case 'Globe': return Globe;
      case 'Star': return Star;
      default: return Leaf;
    }
  };

  const stats = cms.stats.map((s: any) => ({ ...s, icon: getIcon(s.iconName) }));"""

content = re.sub(r"const stats = \[\s*\{[^\}]+\},\s*\{[^\}]+\},\s*\{[^\}]+\},\s*\{[^\}]+\},\s*\];", stats_repl, content)

# Category Discovery
content = content.replace(">Explore Curated Collections<", ">{cms.categoryDiscovery.badge}<")
content = content.replace(">Discover Pure Sustainability<", ">{cms.categoryDiscovery.title}<")
content = content.replace("Click on a circular catalog to discover organic-certified, premium, plastic-free solutions for your home.", "{cms.categoryDiscovery.subtitle}")

# Product sections
content = content.replace("title: 'Best Sellers'", "title: cms.productSections.bestSellersTitle")
content = content.replace("tagline: 'Most purchased BioCart products trusted by thousands.'", "tagline: cms.productSections.bestSellersTagline")
content = content.replace("title: 'New Arrivals'", "title: cms.productSections.newArrivalsTitle")
content = content.replace("tagline: 'Recently launched elements from our specialized bio-processing facilities.'", "tagline: cms.productSections.newArrivalsTagline")
content = content.replace("title: 'Trending Now'", "title: cms.productSections.trendingNowTitle")
content = content.replace("tagline: 'Popular organic items running fast in stock catalogs.'", "tagline: cms.productSections.trendingNowTagline")
content = content.replace("title: 'Home Gardening Essentials'", "title: cms.productSections.homeGardeningTitle")
content = content.replace("tagline: 'Core soils and nutrients every healthy indoor garden needs.'", "tagline: cms.productSections.homeGardeningTagline")
content = content.replace("title: 'Recommended For You'", "title: cms.productSections.recommendedTitle")
content = content.replace("tagline: 'Curated organic pairings optimized for your green lifestyle.'", "tagline: cms.productSections.recommendedTagline")
content = content.replace(">View All<", ">{cms.productSections.viewAllButton}<")

# Philosophy
content = content.replace(">Our Ecological Vision<", ">{cms.philosophy.badge}<")
content = content.replace("Promoting Plastic-Free, <br />\n              Chemical-Free Indian Lifestyles", "{cms.philosophy.title}")
content = content.replace("""<h2 className="font-serif font-bold text-4xl md:text-5xl text-nature-800 dark:text-white leading-tight">
              Promoting Plastic-Free, <br />
              Chemical-Free Indian Lifestyles
            </h2>""", """<h2 className="font-serif font-bold text-4xl md:text-5xl text-nature-800 dark:text-white leading-tight" dangerouslySetInnerHTML={{ __html: cms.philosophy.title }} />""")

content = content.replace("Sindulis Agro Products established BioCart to pioneer the circular economy. Traditional gardening consumables leak toxic PVC microplastics and chemical synthetic compounds directly into home-grown organic vegetables. Our fully biodegradable coir items decompose organically right inside your planters, building richer soil parameters instead of microplastic toxicities.", "{cms.philosophy.description}")
content = content.replace(">100% Clean Sourcing<", ">{cms.philosophy.bullet1Title}<")
content = content.replace(">Washed and processed in our Guntur facility under strict low EC guidelines.<", ">{cms.philosophy.bullet1Desc}<")
content = content.replace(">Carbon-Neutral Shipping<", ">{cms.philosophy.bullet2Title}<")
content = content.replace(">Every capsule box is packed with organic starches and recycled paper lines.<", ">{cms.philosophy.bullet2Desc}<")
content = content.replace('"https://images.unsplash.com/photo-1592150621744-aca64f48394a?auto=format&fit=crop&w=1200&q=80"', "{cms.philosophy.imageUrl}")
content = content.replace(">Sindulis Guarantee<", ">{cms.philosophy.badgeTitle}<")
content = content.replace("Tested thoroughly by Founder Prashanthi Pallapothula for zero chemical trace.", "{cms.philosophy.badgeDesc}")

# Lifestyle
content = content.replace(">Organic Living Spaces<", ">{cms.lifestyle.badge}<")
content = content.replace(">Designed for Modern Homes<", ">{cms.lifestyle.title}<")
content = content.replace("BioCart integrates elegantly with minimal aesthetics, transitioning homes into oxygen-rich eco centers.", "{cms.lifestyle.description}")
content = content.replace(">Home Gardening Hub<", ">{cms.lifestyle.card1Badge}<")
content = content.replace(">Sustainably Grown Vegetables<", ">{cms.lifestyle.card1Title}<")
content = content.replace("Unlock high yield yields directly on your apartment balconies. Pair our premium Triple-Washed Coco Peat blocks with Jute breathable grow bags for healthy micro-farming structures.", "{cms.lifestyle.card1Desc}")
content = content.replace(">Acquire Garden Starters<", ">{cms.lifestyle.card1Button}<")
content = content.replace('"https://images.unsplash.com/photo-1592150621744-aca64f48394a?auto=format&fit=crop&w=400&q=80"', "{cms.lifestyle.card1Image}")
content = content.replace(">Plastic-Free Promise<", ">{cms.lifestyle.card2Badge}<")
content = content.replace(">Zero Plastic Footprints<", ">{cms.lifestyle.card2Title}<")
content = content.replace("By purchasing BioCart coir-fiber plant starter pots, you actively eliminate disposable black nursery plastic cups.", "{cms.lifestyle.card2Desc}")
content = content.replace("Saved over 50,000kg plastic in 2025", "{cms.lifestyle.card2Footer}")

# Testimonials
content = content.replace(">The BioCart Circle<", ">{cms.testimonialsSection.badge}<")
content = content.replace(">Endorsed by Eco Advocates<", ">{cms.testimonialsSection.title}<")
content = content.replace("Discover stories of individuals building oxygen-rich sanctuaries across Indian cities.", "{cms.testimonialsSection.description}")
content = content.replace(">Community stories will appear here soon.<", ">{cms.testimonialsSection.emptyText}<")

# FAQ
content = content.replace(">Assistance Desk<", ">{cms.faqSection.badge}<")
content = content.replace(">Frequently Queries<", ">{cms.faqSection.title}<")

# Newsletter
content = content.replace(">Join the BioCart Circular<", ">{cms.newsletter.title}<")
content = content.replace("Receive premium organic home-gardening guidance, special factory-batch pricing catalogs, and sustainable direct-to-consumer notifications. We never dispatch spam.", "{cms.newsletter.description}")
content = content.replace('placeholder="Enter email address"', 'placeholder={cms.newsletter.placeholder}')
content = content.replace(">Subscribe<", ">{cms.newsletter.buttonText}<")

# Reviews
content = content.replace(">Customer Reviews<", ">{cms.reviewsSection.title}<")

with open('src/components/Home.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Home.tsx updated.")
