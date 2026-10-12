import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { 
  Leaf, Award, Landmark, Eye, Compass, Users, CheckCircle2, 
  MapPin, Clock, Calendar, ArrowRight, ShieldCheck, HeartPulse, Sparkles,
  TrendingUp, Activity, CheckCircle, Quote, Sprout, Shield, Globe
} from 'lucide-react';
import { SafeImage } from '../components/ui/SafeImage';
import { usePageCMS } from '../hooks/usePageCMS';
import { PageSection } from '../types/cms';

export const About: React.FC = () => {
  const { setTab } = useApp();
  const { cmsData } = usePageCMS('about-us');

  // Extract sections if stored in canonical sections format
  const heroSection = cmsData?.sections?.find((s: PageSection) => s.type === 'hero' && s.enabled);
  const storySection = cmsData?.sections?.find((s: PageSection) => (s.id === 'about-story' || s.type === 'rich_text') && s.enabled);
  const missionSection = cmsData?.sections?.find((s: PageSection) => (s.id === 'about-mission') && s.enabled);
  const visionSection = cmsData?.sections?.find((s: PageSection) => (s.id === 'about-vision') && s.enabled);
  const ctaSection = cmsData?.sections?.find((s: PageSection) => (s.type === 'cta_banner') && s.enabled);
  
  // State for image loading to prevent layout shifts and show beautiful skeletons
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});

  const handleImageLoad = (id: string) => {
    setLoadedImages(prev => ({ ...prev, [id]: true }));
  };

  const brandValues = [
    {
      title: 'Eco-Circular Sustainability',
      description: 'We eliminate single-use plastics and chemical runoff, ensuring every raw element supports healthy, circular soil cycles.',
      icon: ShieldCheck,
      color: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/30'
    },
    {
      title: 'Uncompromised Quality',
      description: 'All growing mediums are triple-washed organically, tested for Low Electrical Conductivity (EC < 0.5), and steam-purified.',
      icon: HeartPulse,
      color: 'text-amber-700 bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/30'
    },
    {
      title: 'Absolute Customer Trust',
      description: 'Transparent fair-trade sourcing from certified agro-networks with 100% plastic-free packaging and honest compositions.',
      icon: Users,
      color: 'text-sky-700 bg-sky-50 dark:bg-sky-950/30 border-sky-100 dark:border-sky-900/30'
    }
  ];

  const milestones = [
    {
      year: '2023',
      title: 'The Inception',
      desc: 'Sindulis Agro Products was registered with the core philosophy of promoting zero-chemical and zero-plastic home gardening in India.'
    },
    {
      year: '2024',
      title: 'Research & Operations',
      desc: 'Established our state-of-the-art coir processing and organic composting operations, testing early BioCart prototypes.'
    },
    {
      year: '2025',
      title: 'Direct-To-Consumer Launch',
      desc: 'Introduced BioCart in major metropolitan areas, providing premium biodegradable alternatives to plastic containers and soil bags.'
    },
    {
      year: '2026',
      title: 'All-India Scale & Global Export',
      desc: 'Scaling to all-India availability while launching global export variants to represent premium sustainable living on the international stage.'
    }
  ];

  const whyChooseBioCart = [
    {
      title: '100% Organic Certified',
      description: 'Rigorous organic verification guarantees absolute safety for household vegetables and flowers.',
      icon: CheckCircle
    },
    {
      title: 'Plastic-Free Guarantee',
      description: 'From coir pots to cellulose packaging tape, we ensure zero plastic waste reaches your garden.',
      icon: Sprout
    },
    {
      title: 'Expert Soil Chemistry',
      description: 'Every substrate block is laboratory tested for optimized hydration retention and optimal aeration.',
      icon: Shield
    },
    {
      title: 'Eco Sourced',
      description: 'Sourced transparently from certified agricultural cooperatives promoting fair-trade practices.',
      icon: Globe
    }
  ];

  return (
    <div className="space-y-64px pb-64px animate-fade-in" id="about-page">
      
      {/* 1. HERO BANNER */}
      <section className="relative min-h-[70vh] flex items-center justify-center pt-36 pb-20 px-6 overflow-hidden text-center" id="about-banner">
        {/* Cinematic Background with dynamic zoom */}
        <div className="absolute inset-0 z-0">
          <div className="w-full h-full relative">
            {!loadedImages['hero'] && (
              <div className="absolute inset-0 bg-slate-200 dark:bg-charcoal-900 animate-pulse" />
            )}
            <motion.img 
              src={cmsData?.image || "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1920&q=80"} 
              alt="Sustainable organic agriculture" 
              referrerPolicy="no-referrer"
              loading="lazy"
              onLoad={() => handleImageLoad('hero')}
              className={`w-full h-full object-cover filter brightness-90 transition-opacity duration-500 ${
                loadedImages['hero'] ? 'opacity-100' : 'opacity-0'
              }`}
            />
          </div>
          {/* Dual-layer high-contrast overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/70 to-black/55 dark:from-charcoal-950/90 dark:via-charcoal-950/80 dark:to-charcoal-950/65 z-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/25 z-10" />
        </div>

        <div className="max-w-4xl mx-auto space-y-6 relative z-20">
          <motion.span 
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 0.85, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-400"
          >
            {heroSection?.data?.badgeText || 'About Sindulis Agro Products'}
          </motion.span>
          <motion.h1 
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="font-serif font-bold text-4xl md:text-6xl text-white leading-[1.15] tracking-tight"
          >
            {heroSection?.data?.titleLine1 ? (
              <span dangerouslySetInnerHTML={{ __html: heroSection.data.titleLine1 }} />
            ) : cmsData?.heroTitle ? (
              <span dangerouslySetInnerHTML={{ __html: cmsData.heroTitle }} />
            ) : (
              <>
                Our Story, Purpose, and <br />
                <span className="gradient-text-green font-sans font-extrabold italic drop-shadow-[0_2px_15px_rgba(34,197,94,0.3)]">Sustainable Foundations</span>
              </>
            )}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 0.9, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-sm md:text-lg text-slate-200 max-w-2xl mx-auto leading-relaxed tracking-wide"
          >
            {heroSection?.data?.subtitle || 'Pioneering organic gardening innovations. We craft bio-circular materials that nourish plants instead of microplastic pollution.'}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="pt-8px"
          >
            <button
              onClick={() => {
                const element = document.getElementById('company-story');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full text-xs font-bold transition-all hover:scale-105 cursor-pointer shadow-lg shadow-emerald-600/20"
            >
              Explore Our Story
            </button>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
          <div className="w-5 h-8 border border-white/30 rounded-full flex justify-center p-1">
            <div className="w-1 h-1.5 bg-emerald-400 rounded-full animate-bounce" />
          </div>
        </div>
      </section>

      {/* 2. COMPANY STORY */}
      <section className="max-w-7xl mx-auto px-24px grid grid-cols-1 lg:grid-cols-2 gap-48px items-center py-16px" id="company-story">
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-lg border border-slate-200 dark:border-white/5"
          id="story-graphic"
        >
          <SafeImage
            src={cmsData?.image2 || "https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1200&q=80"}
            fallbackSrc={cmsData?.image || "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1200&q=80"}
            alt="Organic composting and soil preparation"
            className="w-full h-full object-cover filter brightness-95 hover:scale-105 transition-all duration-700"
          />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="space-y-24px"
        >
          <div className="space-y-8px">
            <span className="text-xs font-bold uppercase tracking-widest text-earth-800 dark:text-earth-500">
              {storySection?.data?.eyebrow || 'The Sindulis Genesis'}
            </span>
            <h2 className="font-serif font-bold text-3xl md:text-4xl text-nature-900 dark:text-nature-400 leading-tight">
              {storySection?.data?.heading || storySection?.data?.title || 'An Enterprise Rooted in Circularity'}
            </h2>
          </div>
          <div className="space-y-16px text-xs md:text-sm text-charcoal-600 dark:text-slate-300 leading-relaxed">
            {storySection?.data?.content ? (
              <div dangerouslySetInnerHTML={{ __html: storySection.data.content }} className="space-y-4" />
            ) : storySection?.data?.body ? (
              <div dangerouslySetInnerHTML={{ __html: storySection.data.body }} className="space-y-4" />
            ) : (
              <>
                <p>
                  Sindulis Agro Products Pvt. Ltd. was founded on a simple realization: human-centric progress should not come at the cost of the ground beneath our feet. Modern household crop growing, while seemingly ecological, relied heavily on chemical soil boosters, synthetic nutrients, and black plastic containers which pollute local landfills.
                </p>
                <p>
                  We established BioCart as our premium retail and direct-to-consumer brand to democratize advanced agricultural science. By utilizing bio-waste and side streams, we produce certified organic composts, biological formulations, and biodegradable coir pots. Our products make home horticulture circular, sustainable, and satisfying.
                </p>
              </>
            )}
          </div>
        </motion.div>
      </section>

      {/* 3. MISSION */}
      <section className="max-w-7xl mx-auto px-24px grid grid-cols-1 lg:grid-cols-2 gap-48px items-center py-16px" id="mission-section">
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="space-y-24px"
        >
          <div className="space-y-8px">
            <span className="text-xs font-bold uppercase tracking-widest text-earth-800 dark:text-earth-500">
              Our Ecological Mission
            </span>
            <h2 className="font-serif font-bold text-3xl md:text-4xl text-nature-900 dark:text-nature-400 leading-tight">
              To Eliminate Non-Biodegradable Plastics from Soil Chains
            </h2>
          </div>
          <div className="space-y-16px text-xs md:text-sm text-charcoal-600 dark:text-slate-300 leading-relaxed">
            {missionSection?.data?.content ? (
              <div dangerouslySetInnerHTML={{ __html: missionSection.data.content }} className="space-y-4" />
            ) : cmsData?.mission ? (
              <div dangerouslySetInnerHTML={{ __html: cmsData.mission }} className="space-y-4" />
            ) : (
              <>
                <p>
                  Traditional household gardening products look green on the surface, but are wrapped in microplastic structures. Millions of black plastic seedling containers and chemical soil mixes containing heavy metal residues are sold each year across India.
                </p>
                <p>
                  To solve this challenge, BioCart is on an ecological mission to empower millions of modern growers with biodegradable raw coir containers, premium chemical-free growing substrates, and zero-plastic packaging envelopes. We ensure that every material that nurtures your plants can return seamlessly to the earth.
                </p>
              </>
            )}
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-lg border border-slate-200 dark:border-white/5"
          id="mission-graphic"
        >
          {/* Prevent layout shifts using loaded state handled internally by SafeImage */}
          <SafeImage
            src={cmsData?.image3 || "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=1200&q=80"}
            fallbackSrc={cmsData?.image2 || "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1200&q=80"}
            alt="Healthy home organic gardening"
            className="w-full h-full object-cover filter brightness-95 hover:scale-105 transition-all duration-700"
          />
        </motion.div>
      </section>

      {/* 4. VISION */}
      <section className="max-w-7xl mx-auto px-24px grid grid-cols-1 lg:grid-cols-2 gap-48px items-center py-16px" id="vision-section">
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-lg border border-slate-200 dark:border-white/5 order-2 lg:order-1"
          id="vision-graphic"
        >
          <SafeImage
            src={cmsData?.image4 || "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=1200&q=80"}
            fallbackSrc={cmsData?.image3 || "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1200&q=80"}
            alt="Premium sustainable botanical nursery"
            className="w-full h-full object-cover filter brightness-95 hover:scale-105 transition-all duration-700"
          />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="space-y-24px order-1 lg:order-2"
        >
          <div className="space-y-8px">
            <span className="text-xs font-bold uppercase tracking-widest text-earth-800 dark:text-earth-500">
              Our Long-Term Vision
            </span>
            <h2 className="font-serif font-bold text-3xl md:text-4xl text-nature-900 dark:text-nature-400 leading-tight">
              Leading the Bio-Circular Agriculture Revolution
            </h2>
          </div>
          <div className="space-y-16px text-xs md:text-sm text-charcoal-600 dark:text-slate-300 leading-relaxed">
            {visionSection?.data?.content ? (
              <div dangerouslySetInnerHTML={{ __html: visionSection.data.content }} className="space-y-4" />
            ) : (
              <>
                <p>
                  By 2030, our goal is to establish fully closed-loop agricultural supply metrics across India, processing agricultural side streams into high-performance growing substrates. We aim to recycle millions of kilograms of coconut farm husks, transforming potential waste into premium-grade soil enhancements.
                </p>
                <p>
                  We envision a future where every urban household balcony, kitchen garden, and corporate green space thrives in harmony with nature, using materials that are 100% compostable, certified organic, and climate-positive.
                </p>
              </>
            )}
          </div>
        </motion.div>
      </section>

      {/* 5. BRAND VALUES */}
      <section className="bg-slate-50 dark:bg-charcoal-950 py-32px" id="brand-values">
        <div className="max-w-7xl mx-auto px-24px space-y-48px">
          <div className="text-center space-y-8px max-w-xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-widest text-earth-800 dark:text-earth-500">
              Our Pillars
            </span>
            <h2 className="font-serif font-bold text-3xl md:text-4xl text-nature-900 dark:text-nature-400">
              Core Operational Philosophy
            </h2>
            <p className="text-xs md:text-sm text-charcoal-500 max-w-md mx-auto">
              The foundation of every product designed and dispatched under the BioCart stamp.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-32px" id="values-grid">
            {brandValues.map((val, idx) => {
              const Icon = val.icon;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.1 * idx }}
                  className="p-32px bg-white dark:bg-charcoal-900 border border-slate-150 dark:border-white/5 rounded-3xl hover:-translate-y-1.5 hover:shadow-xl hover:shadow-nature-900/10 transition-all duration-300 ease-[cubic-bezier(0.215,0.61,0.355,1)] space-y-16px shadow-sm hover:shadow-md transition-shadow"
                  id={`value-card-${idx}`}
                >
                  <div className={`p-16px rounded-2xl w-fit border ${val.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-sans font-bold text-lg text-nature-900 dark:text-nature-400">
                    {val.title}
                  </h3>
                  <p className="text-xs md:text-sm text-charcoal-600 dark:text-slate-300 leading-relaxed">
                    {val.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. MEET OUR FOUNDERS (USING UPLOADED IMAGE PORTRAITS) */}
      <section className="max-w-7xl mx-auto px-24px py-32px" id="founders-section">
        <div className="text-center space-y-8px max-w-xl mx-auto mb-48px">
          <span className="text-xs font-bold uppercase tracking-widest text-earth-800 dark:text-earth-500">
            Leadership & Vision
          </span>
          <h2 className="font-serif font-bold text-3xl md:text-4xl text-nature-900 dark:text-nature-400">
            Meet Our Founders
          </h2>
          <p className="text-xs md:text-sm text-charcoal-500 max-w-md mx-auto">
            Guiding our team toward sustainable innovation, operational excellence, and uncompromised organic standards.
          </p>
        </div>

        {/* Premium Alternating Founder Rows */}
        <div className="space-y-64px max-w-5xl mx-auto" id="founders-grid">
          
          {/* Row 1: Prashanthi Pallapothula (Image on Left, Details on Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-32px lg:gap-48px items-center" id="founder-row-prashanthi">
            {/* Image & Caption Card - Left */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="lg:col-span-5 flex justify-center"
              id="founder-card-prashanthi"
            >
              <div className="bg-white dark:bg-charcoal-900 p-24px rounded-[32px] border border-slate-150 dark:border-white/5 shadow-md max-w-[360px] w-full hover:shadow-lg transition-all duration-300">
                <div className="aspect-[3/4] w-full overflow-hidden rounded-[20px] relative shadow-inner">
                  <SafeImage
                    src="/assets/founder_prashanthi.jpg"
                    fallbackSrc={cmsData?.image4 || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80"}
                    alt="Prashanthi Pallapothula"
                    className="w-full h-full object-cover object-top filter brightness-[98%]"
                    id="founder-img-prashanthi"
                  />
                </div>
                {/* Official Label Requirements */}
                <div className="mt-24px text-center space-y-8px" id="prashanthi-caption">
                  <h3 className="font-serif font-bold text-xl text-nature-900 dark:text-nature-400">Prashanthi Pallapothula</h3>
                  <div className="flex flex-col text-xs text-charcoal-500 dark:text-slate-400 space-y-4px">
                    <span className="text-earth-800 dark:text-earth-500 font-bold uppercase tracking-wider">Founder</span>
                    <span className="font-semibold text-charcoal-800 dark:text-slate-200">Sindulis Agro Products</span>
                    <span className="text-charcoal-500 dark:text-slate-400">BioCart Brand Creator</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Details & Biography - Right */}
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="lg:col-span-7 space-y-24px"
              id="founder-details-prashanthi"
            >
              <div className="space-y-16px">
                <div>
                  <span className="text-xs text-earth-800 dark:text-earth-500 font-bold uppercase tracking-widest">Core Leadership</span>
                  <h3 className="font-serif font-bold text-3xl text-nature-900 dark:text-nature-400 mt-4px">Prashanthi Pallapothula</h3>
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Founder & CEO — Product R&D & Design</p>
                </div>
                
                <div className="text-xs md:text-sm text-charcoal-600 dark:text-slate-300 leading-relaxed space-y-16px">
                  <p>
                    Prashanthi founded BioCart with a persistent objective: to make sustainable, zero-chemical, and plastic-free living both accessible and beautiful for the modern urban household. Drawing on her extensive studies in biotechnology and organic soil physics, she oversees the core product R&D and design teams.
                  </p>
                  <p>
                    <strong>Contribution:</strong> Spearheaded the development of our signature high-aeration coir growing blocks and biodegradable transplanting containers. Under her design leadership, BioCart fuses state-of-the-art agricultural metrics with beautiful, zero-waste premium D2C packaging.
                  </p>
                  <blockquote className="italic text-emerald-700 dark:text-emerald-400 border-l-2 border-emerald-500 pl-4 py-8px bg-emerald-50/40 dark:bg-emerald-950/20 pr-16px rounded-r-xl">
                    "Sustainable living shouldn’t feel like a sacrifice. It is a refinement of how we interact with the biosphere, starting with our soil."
                  </blockquote>
                </div>
              </div>

              <div className="pt-16px border-t border-slate-100 dark:border-white/5 flex justify-between items-center text-xs text-charcoal-400 dark:text-slate-500 font-medium">
                <span>PRODUCT INNOVATION</span>
                <span className="font-serif italic font-bold text-charcoal-700 dark:text-slate-400">Prashanthi P.</span>
              </div>
            </motion.div>
          </div>

          {/* Row 2: Tagore Subhash Maguluri (Details on Left, Image on Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-32px lg:gap-48px items-center pt-32px border-t border-slate-100 dark:border-white/5" id="founder-row-tagore">
            {/* Details & Biography - Left on Desktop, Second on Mobile */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="lg:col-span-7 space-y-24px order-2 lg:order-1"
              id="founder-details-tagore"
            >
              <div className="space-y-16px">
                <div>
                  <span className="text-xs text-earth-800 dark:text-earth-500 font-bold uppercase tracking-widest">Technical Infrastructure</span>
                  <h3 className="font-serif font-bold text-3xl text-nature-900 dark:text-nature-400 mt-4px">Tagore Subhash Maguluri</h3>
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Co-Founder & COO — Platforms & Supply Chains</p>
                </div>
                
                <div className="text-xs md:text-sm text-charcoal-600 dark:text-slate-300 leading-relaxed space-y-16px">
                  <p>
                    Tagore orchestrates strategic growth, technical platform infrastructure, and circular supply chain scaling at BioCart. With an extensive professional background in digital product management and logistics engineering, he has scaled Sindulis from an early concept into an efficient nationwide enterprise.
                  </p>
                  <p>
                    <strong>Contribution:</strong> Structured our zero-emissions logistics channels, launched the regional dealer networks, and deployed the advanced digital portal that connects local nurseries to our warehouses. He is dedicated to achieving 100% carbon-neutral dispatches.
                  </p>
                  <blockquote className="italic text-emerald-700 dark:text-emerald-400 border-l-2 border-emerald-500 pl-4 py-8px bg-emerald-50/40 dark:bg-emerald-950/20 pr-16px rounded-r-xl">
                    "Scaling ecology is a logistics and supply chain challenge. By combining software precision with authentic agricultural products, we solve it."
                  </blockquote>
                </div>
              </div>

              <div className="pt-16px border-t border-slate-100 dark:border-white/5 flex justify-between items-center text-xs text-charcoal-400 dark:text-slate-500 font-medium">
                <span>SCALING LOGISTICS</span>
                <span className="font-serif italic font-bold text-charcoal-700 dark:text-slate-400">Tagore S. Maguluri</span>
              </div>
            </motion.div>

            {/* Image & Caption Card - Right on Desktop, First on Mobile */}
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="lg:col-span-5 flex justify-center order-1 lg:order-2"
              id="founder-card-tagore"
            >
              <div className="bg-white dark:bg-charcoal-900 p-24px rounded-[32px] border border-slate-150 dark:border-white/5 shadow-md max-w-[360px] w-full hover:shadow-lg transition-all duration-300">
                <div className="aspect-[3/4] w-full overflow-hidden rounded-[20px] relative shadow-inner">
                  <SafeImage
                    src="/assets/founder_tagore.jpg"
                    fallbackSrc={cmsData?.image5 || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80"}
                    alt="Tagore Subhash Maguluri"
                    className="w-full h-full object-cover object-top filter brightness-[98%]"
                    id="founder-img-tagore"
                  />
                </div>
                {/* Official Label Requirements */}
                <div className="mt-24px text-center space-y-8px" id="tagore-caption">
                  <h3 className="font-serif font-bold text-xl text-nature-900 dark:text-nature-400">Tagore Subhash Maguluri</h3>
                  <div className="flex flex-col text-xs text-charcoal-500 dark:text-slate-400 space-y-4px">
                    <span className="text-earth-800 dark:text-earth-500 font-bold uppercase tracking-wider">Co-Founder</span>
                    <span className="font-semibold text-charcoal-800 dark:text-slate-200">Technology & Business Strategy</span>
                    <span className="text-charcoal-500 dark:text-slate-400">BioCart</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

        </div>
      </section>

      {/* 7. WHY BIOCART */}
      <section className="bg-[#F4F8F3] dark:bg-charcoal-900 py-32px" id="why-biocart-section">
        <div className="max-w-7xl mx-auto px-24px space-y-48px">
          <div className="text-center space-y-8px max-w-xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-widest text-earth-800 dark:text-earth-500">
              Pure Advantages
            </span>
            <h2 className="font-serif font-bold text-3xl md:text-4xl text-nature-900 dark:text-nature-400">
              Why Choose BioCart?
            </h2>
            <p className="text-xs md:text-sm text-charcoal-500 max-w-md mx-auto">
              How our bio-circular agricultural standards deliver premium performance for healthy organic gardens.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-24px" id="why-grid">
            {whyChooseBioCart.map((item, idx) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="bg-white dark:bg-charcoal-950 p-24px rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm space-y-16px"
                  id={`why-card-${idx}`}
                >
                  <div className="p-12px bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl w-fit">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-sans font-bold text-base text-nature-900 dark:text-nature-400">{item.title}</h3>
                  <p className="text-xs md:text-sm text-charcoal-600 dark:text-slate-400 leading-relaxed">{item.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 8. TIMELINE */}
      <section className="max-w-4xl mx-auto px-6 py-16" id="timeline-section">
        <div className="text-center space-y-2 max-w-md mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-earth-800 dark:text-earth-500">
            Our Journey
          </span>
          <h2 className="font-serif font-bold text-3xl md:text-4xl text-nature-900 dark:text-nature-400">
            Milestone Progress
          </h2>
          <p className="text-xs md:text-sm text-charcoal-500 max-w-sm mx-auto">
            Our growth, achievements, and certifications as we scale bio-circular agricultural products.
          </p>
        </div>

        <div className="relative pl-8 ml-4 space-y-12" id="timeline">
          {/* Progressive scroll-linked drawing line */}
          <motion.div 
            initial={{ height: 0 }}
            whileInView={{ height: '94%' }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
            className="absolute left-0 top-3 bottom-3 w-[2px] bg-gradient-to-b from-emerald-600 via-emerald-400 to-transparent dark:from-emerald-500 origin-top"
          />

          {milestones.map((m, idx) => (
            <motion.div 
              key={idx} 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: "easeOut", delay: idx * 0.15 }}
              className="relative group cursor-pointer" 
              id={`timeline-item-${idx}`}
            >
              {/* Bullet with spring scale and inner core highlight on active/hover */}
              <motion.span 
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ type: 'spring', stiffness: 260, damping: 20, delay: idx * 0.15 }}
                className="absolute -left-[39px] top-1.5 w-5 h-5 rounded-full bg-[#F8FAF6] dark:bg-charcoal-950 border-2 border-emerald-600 dark:border-emerald-500 shadow-md flex items-center justify-center z-10 transition-colors duration-300 group-hover:bg-emerald-600 dark:group-hover:bg-emerald-500" 
              >
                <div className="w-1.5 h-1.5 bg-emerald-600 dark:bg-emerald-500 rounded-full group-hover:bg-white transition-colors duration-300" />
              </motion.span>
              
              <div className="space-y-2 pl-4 transition-all duration-300 group-hover:translate-x-2">
                <span className="inline-block text-xs font-extrabold text-earth-800 dark:text-earth-500 font-mono tracking-wider bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-100/40 dark:border-emerald-500/20 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                  {m.year}
                </span>
                <h4 className="font-serif font-bold text-lg text-charcoal-950 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors duration-200">
                  {m.title}
                </h4>
                <p className="text-xs text-charcoal-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                  {m.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 9. FUTURE VISION */}
      <section className="max-w-7xl mx-auto px-24px grid grid-cols-1 lg:grid-cols-2 gap-48px items-center py-32px" id="future-vision-section">
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="space-y-24px"
        >
          <div className="space-y-8px">
            <span className="text-xs font-bold uppercase tracking-widest text-earth-800 dark:text-earth-500">
              Onward & Upward
            </span>
            <h2 className="font-serif font-bold text-3xl md:text-4xl text-nature-900 dark:text-nature-400 leading-tight">
              Our Future Vision: Absolute Eco Harmony
            </h2>
          </div>
          <div className="space-y-16px text-xs md:text-sm text-charcoal-600 dark:text-slate-300 leading-relaxed">
            <p>
              Looking forward, BioCart aims to establish fully regionalized composting hubs that process regional farm waste into high-grade coir growing bases. This eliminates emissions associated with cross-country shipping and ensures that each organic mix is tailored specifically to local regional water and air conditions.
            </p>
            <p>
              We are also developing integrated home organic composting systems that connect with digital platforms to track carbon sequestration, allowing everyday balcony gardeners to measure and verify their positive contribution to climate metrics.
            </p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-lg border border-slate-200 dark:border-white/5"
          id="future-vision-graphic"
        >
          <SafeImage
            src={cmsData?.image5 || "https://images.unsplash.com/photo-1530836369250-ef71a3f5e481?auto=format&fit=crop&w=1200&q=80"}
            fallbackSrc={cmsData?.image6 || "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1200&q=80"}
            alt="Innovative plant engineering and sustainability"
            className="w-full h-full object-cover filter brightness-95 hover:scale-105 transition-all duration-700"
          />
        </motion.div>
      </section>

      {/* 10. CALL TO ACTION */}
      <section className="bg-gradient-to-br from-emerald-950 via-charcoal-950 to-emerald-900 text-white rounded-[32px] max-w-7xl mx-auto px-24px py-64px md:py-80px relative overflow-hidden shadow-2xl border border-emerald-900/30" id="about-cta-section">
        {/* Abstract background highlights */}
        <div className="absolute inset-0 bg-black/95 z-0 pointer-events-none" />
        <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-emerald-800/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-1/2 -left-1/4 w-96 h-96 bg-nature-800/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-3xl mx-auto text-center relative z-10 drop-shadow-md">
          <div className="p-3 bg-white/10 dark:bg-charcoal-800 text-emerald-300 rounded-full w-fit mx-auto shadow-sm border border-white/10 mb-24px">
            <Award className="w-6 h-6 text-emerald-400" />
          </div>
          <h3 className="font-serif font-bold text-3xl md:text-5xl text-white tracking-tight mb-24px drop-shadow-lg">
            {ctaSection?.data?.title || 'Cultivate Wellness, Embrace Healthy Living'}
          </h3>
          <p className="text-sm md:text-lg text-white/90 max-w-2xl mx-auto leading-relaxed mb-32px drop-shadow-md">
            {ctaSection?.data?.subtitle || 'Begin your sustainable coir gardening journey today. Explore our premium range of organic soil enhancers, compost accelerators, and non-toxic pots designed to support our circular ecosystem.'}
          </p>

          <div className="flex flex-row flex-wrap justify-center items-center gap-24px md:gap-32px">
            <button
              onClick={() => {
                const dest = ctaSection?.data?.primaryButtonUrl || '#shop';
                setTab(dest.replace('#', ''));
              }}
              className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full text-sm font-bold shadow-lg transition-all inline-flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95"
            >
              <span>{ctaSection?.data?.primaryButtonText || 'Explore Organic Shop'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                const secDest = ctaSection?.data?.secondaryButtonUrl || '#contact';
                setTab(secDest.replace('#', ''));
              }}
              className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white border border-white/30 hover:border-white/60 rounded-full text-sm font-bold transition-all inline-flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95"
            >
              <span>{ctaSection?.data?.secondaryButtonText || 'Inquire for bulk export'}</span>
            </button>
          </div>
        </div>
      </section>

    </div>
  );
};
