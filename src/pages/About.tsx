import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { 
  Leaf, Award, ShieldCheck, HeartPulse, Users, 
  ArrowRight, Sprout, Shield, Globe, Sparkles, CheckCircle2,
  Layers, Recycle, Compass, Building, Calendar, Quote, ChevronRight
} from 'lucide-react';
import { SafeImage } from '../components/ui/SafeImage';
import { usePageCMS } from '../hooks/usePageCMS';

export const About: React.FC = () => {
  const { setTab } = useApp();
  const { cmsData } = usePageCMS('about-us');

  const [activeTab, setActiveTab] = useState<'soil' | 'circular' | 'purity'>('soil');

  const milestones = [
    {
      year: '2023',
      title: 'Inception & Corporate Registration',
      subtitle: 'Sindulis Agro Products Pvt. Ltd.',
      desc: 'Founded with a definitive mandate: to pioneer pure bio-circular agriculture and engineer completely non-toxic, zero-plastic growing mediums for Indian horticulture.',
      tag: 'Foundation'
    },
    {
      year: '2024',
      title: 'Research & Operations Setup',
      subtitle: 'Advanced Coir & Microbiology Facility',
      desc: 'Commissioned our dedicated processing units in Andhra Pradesh. Perfected proprietary low-EC (< 0.5 mS/cm) triple-washing, steam sterilization, and microbial substrate formulation.',
      tag: 'R&D Benchmark'
    },
    {
      year: '2025',
      title: 'D2C Brand Launch & Urban Expansion',
      subtitle: 'BioCart Consumer Platform',
      desc: 'Introduced BioCart directly to Indian homes, urban balconies, and terrace gardeners, replacing millions of single-use black nursery pots with 100% biodegradable coir containers.',
      tag: 'Commercial Scale'
    },
    {
      year: '2026',
      title: 'All-India Scale & Global Export',
      subtitle: 'Circular Supply Network',
      desc: 'Expanding our certified farmer cooperative network across India while establishing export pipelines for low-EC coir substrates and regenerative agri-inputs globally.',
      tag: 'Global Vision'
    }
  ];

  const pillars = [
    {
      id: 'soil',
      title: 'Soil Microbiome Protection',
      subtitle: 'Zero Synthetic Salts & Chemical Runoff',
      description: 'Conventional potting soils frequently mask inert filler with synthetic chemical salts that burn root mycorrhizae over time. BioCart mediums are enriched with native beneficial microbes, balanced humic substances, and optimal porosity to cultivate a living ecosystem.',
      stats: '100% Organic Sourced',
      icon: Sprout
    },
    {
      id: 'circular',
      title: 'Closed-Loop Bio-Circularity',
      subtitle: 'Upcycling Agricultural Byproducts',
      description: 'Every coir fiber and coconut husk processed in our units is ethically recovered from verified South Indian farming communities. We transform discarded agro-residues into high-yield growing assets, preventing field burning and environmental waste.',
      stats: '0% Single-Use Plastic',
      icon: Recycle
    },
    {
      id: 'purity',
      title: 'Lab-Certified Agronomy',
      subtitle: 'Triple-Washed & Desalinated',
      description: 'Unprocessed coir retains harmful sodium and potassium chloride salts. BioCart subjects every batch to extensive freshwater wash cascades and laboratory electrical conductivity checks (EC < 0.5) to guarantee tender roots never suffer salt stress.',
      stats: 'EC < 0.5 mS/cm Certified',
      icon: ShieldCheck
    }
  ];

  return (
    <div className="bg-[#FAFDF9] text-stone-900 pb-20 selection:bg-emerald-200 selection:text-emerald-950 font-sans">
      
      {/* 1. HERO SECTION — Editorial Luxury Indian Botanical Aesthetic */}
      <section className="relative pt-36 pb-24 md:pt-44 md:pb-32 px-6 md:px-12 lg:px-20 overflow-hidden bg-gradient-to-b from-[#062419] via-[#0A2E21] to-[#0D3828] text-white">
        {/* Subtle Botanical Texture Background */}
        <div className="absolute inset-0 opacity-15 pointer-events-none mix-blend-overlay">
          <img 
            src="https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=2000&q=80" 
            alt="Botanical background texture"
            className="w-full h-full object-cover filter contrast-125"
          />
        </div>

        {/* Ambient Gradient Glows */}
        <div className="absolute -top-40 right-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 left-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex flex-col items-center text-center space-y-6">
            
            {/* Editorial Badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 text-xs font-semibold tracking-widest uppercase shadow-inner"
            >
              <Leaf className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sindulis Agro Products • BioCart Brand Journey</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white max-w-4xl leading-[1.12]"
            >
              Rooted in Circularity. <br className="hidden sm:inline" />
              <span className="italic font-normal font-serif text-emerald-300 bg-gradient-to-r from-emerald-200 via-emerald-300 to-amber-200 bg-clip-text text-transparent">
                Engineered for Living Soil.
              </span>
            </motion.h1>

            {/* Sub-headline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-base sm:text-lg md:text-xl text-stone-300 max-w-3xl leading-relaxed font-light"
            >
              We are reimagining Indian home horticulture and commercial agriculture by replacing synthetic toxins and single-use nursery plastics with scientifically refined, lab-tested bio-circular inputs.
            </motion.p>

            {/* Key Trust Metrics Ribbon */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 pt-8 w-full max-w-4xl border-t border-emerald-800/40 text-stone-200"
            >
              <div className="flex flex-col items-center p-3 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/5">
                <span className="font-serif text-2xl md:text-3xl font-bold text-emerald-400">100%</span>
                <span className="text-xs uppercase tracking-wider text-stone-300 mt-1">Biodegradable Coir</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/5">
                <span className="font-serif text-2xl md:text-3xl font-bold text-amber-300">&lt; 0.5 EC</span>
                <span className="text-xs uppercase tracking-wider text-stone-300 mt-1">Desalinated Pure Substrates</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/5">
                <span className="font-serif text-2xl md:text-3xl font-bold text-emerald-400">Zero</span>
                <span className="text-xs uppercase tracking-wider text-stone-300 mt-1">Synthetic Chemical Runoff</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/5">
                <span className="font-serif text-2xl md:text-3xl font-bold text-amber-300">Pan-India</span>
                <span className="text-xs uppercase tracking-wider text-stone-300 mt-1">Doorstep Cold-Chain Network</span>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* 2. BRAND STORY — Editorial Two-Column Spread */}
      <section className="py-20 md:py-28 px-6 md:px-12 lg:px-20 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Visual Storytelling Canvas */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border-8 border-white bg-stone-100 aspect-[4/5]">
              <SafeImage
                src="https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1200&q=80"
                fallbackSrc="https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1200&q=80"
                alt="BioCart sustainable organic farm operations"
                className="w-full h-full object-cover filter brightness-[0.97]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <span className="text-[11px] font-mono tracking-widest uppercase text-emerald-300 block mb-1">
                  Registered Operations • Guntur & West Godavari, AP
                </span>
                <p className="font-serif text-lg font-bold">
                  Sourcing raw coconut husks directly from local farming collectives.
                </p>
              </div>
            </div>

            {/* Floating Quality Seal Stamp */}
            <div className="hidden sm:flex absolute -bottom-6 -right-6 bg-[#0B3526] text-white p-5 rounded-2xl shadow-xl border border-emerald-600/40 items-center gap-3 max-w-xs">
              <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
                <Award className="w-6 h-6" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-stone-100">Verified Agro-Enterprise</div>
                <div className="text-emerald-300/80 text-[11px]">CIN: U01110AP2023PTC123456</div>
              </div>
            </div>
          </div>

          {/* Right Column: Editorial Narrative */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-800">
              <span className="w-8 h-[2px] bg-emerald-700" />
              <span>The Sindulis Story</span>
            </div>

            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-stone-900 leading-[1.18]">
              Where Ancient Soil Wisdom Meets Modern Bio-Circularity.
            </h2>

            <div className="text-stone-700 text-sm sm:text-base leading-relaxed space-y-4">
              <p>
                <strong>Sindulis Agro Products Private Limited</strong> was founded on a simple yet profound realization: the modern urban movement toward gardening was quietly creating an ecological contradiction. Behind every thriving balcony vegetable patch sat heaps of single-use black plastic nursery trays, chemical fertilizer bags, and synthetic soil enhancers saturated with heavy salts.
              </p>
              <p>
                We established <strong>BioCart</strong> as our flagship consumer brand to provide Indian plant lovers, urban growers, and conscious agriculturalists with an uncompromising alternative: certified organic growing mediums, zero-plastic coir nursery pots, and cold-pressed bio-inputs that nurture roots naturally.
              </p>
              <p>
                From our processing infrastructure in Andhra Pradesh, every substrate block is desalted, triple-washed, and pH-balanced to ensure plants absorb clean micro-nutrients without suffering root burn or chemical leaching.
              </p>
            </div>

            {/* Editorial Quote Box */}
            <div className="p-6 rounded-2xl bg-emerald-50/80 border-l-4 border-emerald-700 text-emerald-950 space-y-2 mt-4">
              <Quote className="w-6 h-6 text-emerald-700 opacity-60" />
              <p className="font-serif italic text-base sm:text-lg leading-snug">
                "We do not inherit the earth from our ancestors; we borrow it from our children. Our duty is to ensure every handful of soil we touch returns richer, cleaner, and full of life."
              </p>
              <span className="block text-xs font-bold uppercase tracking-wider text-emerald-800">
                — BioCart Founding Charter
              </span>
            </div>

          </div>

        </div>
      </section>

      {/* 3. PROBLEM & MISSION — The Clean Soil Crisis */}
      <section className="py-20 md:py-24 bg-stone-100/70 border-y border-stone-200/80 px-6 md:px-12 lg:px-20">
        <div className="max-w-7xl mx-auto space-y-16">
          
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-800">
              Ecological Responsibility
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-stone-900">
              The Clean Soil Crisis & Our Mission
            </h2>
            <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
              India produces millions of tons of agricultural side-streams every year while urban horticulture consumes mountains of non-recyclable petroleum plastics. We bridge this divide.
            </p>
          </div>

          {/* Interactive 3-Pillar Tabbed Exploration */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Tab Selector Left */}
            <div className="lg:col-span-5 space-y-3">
              {pillars.map((pillar) => {
                const Icon = pillar.icon;
                const isSelected = activeTab === pillar.id;
                return (
                  <button
                    key={pillar.id}
                    onClick={() => setActiveTab(pillar.id as any)}
                    className={`w-full text-left p-6 rounded-2xl transition-all duration-300 flex items-start gap-4 border ${
                      isSelected
                        ? 'bg-white shadow-xl border-emerald-600/40 ring-2 ring-emerald-600/10'
                        : 'bg-stone-50/80 hover:bg-white border-stone-200 text-stone-600'
                    }`}
                  >
                    <div className={`p-3 rounded-xl transition-colors ${
                      isSelected ? 'bg-[#062419] text-emerald-400' : 'bg-stone-200 text-stone-700'
                    }`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <div className={`font-serif text-lg font-bold ${
                        isSelected ? 'text-stone-900' : 'text-stone-700'
                      }`}>
                        {pillar.title}
                      </div>
                      <div className="text-xs text-stone-500 font-medium">
                        {pillar.subtitle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Display Area Right */}
            <div className="lg:col-span-7 bg-white p-8 md:p-12 rounded-3xl border border-stone-200 shadow-xl space-y-6">
              {(() => {
                const current = pillars.find(p => p.id === activeTab) || pillars[0];
                return (
                  <>
                    <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                        {current.stats}
                      </span>
                      <span className="text-xs text-stone-400">Strict BioCart Standard</span>
                    </div>

                    <h3 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
                      {current.title}
                    </h3>

                    <p className="text-stone-700 text-sm sm:text-base leading-relaxed">
                      {current.description}
                    </p>

                    <div className="p-4 rounded-xl bg-stone-50 border border-stone-150 flex items-center justify-between text-xs text-stone-600">
                      <span className="font-semibold text-emerald-900">Lab Batch Certification:</span>
                      <span className="font-mono text-stone-500">ISO 9001:2015 & NPOP Audited Protocols</span>
                    </div>
                  </>
                );
              })()}
            </div>

          </div>

        </div>
      </section>

      {/* 4. LEADERSHIP & FOUNDERS — High Editorial Integrity */}
      <section className="py-20 md:py-28 px-6 md:px-12 lg:px-20 max-w-7xl mx-auto" id="founders-section">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-800">
            Executive Leadership
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-stone-900">
            Meet the Founders Behind BioCart
          </h2>
          <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
            Combining scientific agronomy, technical platform engineering, and sustainable manufacturing to serve green households across India.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-14 max-w-5xl mx-auto">
          
          {/* Founder 1: Prashanthi Pallapothula */}
          <div className="bg-white rounded-3xl overflow-hidden border border-stone-200/80 shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col group">
            {/* Portrait Frame */}
            <div className="relative aspect-[3/4] bg-stone-100 overflow-hidden">
              <SafeImage
                src="/assets/founder_prashanthi.jpg"
                fallbackSrc="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80"
                alt="Prashanthi Pallapothula - Founder & CEO"
                className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <span className="text-xs font-mono tracking-widest uppercase text-emerald-300 block mb-1">
                  Founder & CEO
                </span>
                <h3 className="font-serif text-2xl sm:text-3xl font-bold">
                  Prashanthi Pallapothula
                </h3>
                <p className="text-xs text-stone-300 font-light mt-0.5">
                  Sindulis Agro Products Pvt. Ltd. • Product R&D & Design
                </p>
              </div>
            </div>

            {/* Profile Content */}
            <div className="p-8 flex-1 flex flex-col justify-between space-y-6">
              <div className="space-y-4 text-xs sm:text-sm text-stone-700 leading-relaxed">
                <p>
                  Prashanthi oversees BioCart's research, organic substrate formulations, and biodegradable product designs. She holds academic foundations in biotechnology and plant physiology, applying scientific discipline to urban soil health.
                </p>
                <p>
                  Her dedicated focus is eliminating microplastics and petroleum byproducts from home gardening, ensuring all potting mixes, coir pellets, and coco chips meet strict low-salinity and optimal aeration standards.
                </p>
              </div>

              {/* Founder Quote */}
              <div className="pt-4 border-t border-stone-150">
                <blockquote className="italic font-serif text-sm text-emerald-900 bg-emerald-50/60 p-4 rounded-xl border-l-2 border-emerald-600">
                  "Sustainable living shouldn’t feel like a sacrifice. It is a refinement of how we nurture our immediate biosphere, starting right from the soil."
                </blockquote>
              </div>
            </div>
          </div>

          {/* Founder 2: Tagore Subhash Maguluri */}
          <div className="bg-white rounded-3xl overflow-hidden border border-stone-200/80 shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col group">
            {/* Portrait Frame */}
            <div className="relative aspect-[3/4] bg-stone-100 overflow-hidden">
              <SafeImage
                src="/assets/founder_tagore.jpg"
                fallbackSrc="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80"
                alt="Tagore Subhash Maguluri - Co-Founder & COO"
                className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <span className="text-xs font-mono tracking-widest uppercase text-emerald-300 block mb-1">
                  Co-Founder & COO
                </span>
                <h3 className="font-serif text-2xl sm:text-3xl font-bold">
                  Tagore Subhash Maguluri
                </h3>
                <p className="text-xs text-stone-300 font-light mt-0.5">
                  Sindulis Agro Products Pvt. Ltd. • Platforms & Supply Chains
                </p>
              </div>
            </div>

            {/* Profile Content */}
            <div className="p-8 flex-1 flex flex-col justify-between space-y-6">
              <div className="space-y-4 text-xs sm:text-sm text-stone-700 leading-relaxed">
                <p>
                  Tagore spearheads technology, multi-vendor marketplace architecture, and sustainable logistics networks at BioCart. With a deep background in distributed digital systems and operations engineering, he translated Sindulis from an agro-concept into a dependable pan-India platform.
                </p>
                <p>
                  He architected the regional dealer portal, automated vendor settlement systems, and zero-waste fulfillment hubs that enable local nurseries and commercial farms to procure directly from verified producers.
                </p>
              </div>

              {/* Founder Quote */}
              <div className="pt-4 border-t border-stone-150">
                <blockquote className="italic font-serif text-sm text-emerald-900 bg-emerald-50/60 p-4 rounded-xl border-l-2 border-emerald-600">
                  "Scaling ecological impact requires software precision. When authentic agricultural integrity meets dependable digital infrastructure, circular commerce thrives."
                </blockquote>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 5. MILESTONE TIMELINE — Verified Corporate Journey */}
      <section className="py-20 md:py-28 bg-[#F4F8F3] border-y border-emerald-900/10 px-6 md:px-12 lg:px-20">
        <div className="max-w-5xl mx-auto space-y-16">
          
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-800">
              Verified Milestones
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-stone-900">
              Our Journey of Sustainable Progress
            </h2>
            <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
              Every milestone reflects a tangible commitment to cleaner soil, reduced plastic waste, and sustainable Indian agriculture.
            </p>
          </div>

          <div className="relative pl-6 sm:pl-10 space-y-12 before:absolute before:left-[11px] sm:before:left-[19px] before:top-3 before:bottom-3 before:w-[2px] before:bg-emerald-300">
            {milestones.map((m, idx) => (
              <div key={idx} className="relative group">
                {/* Node Dot */}
                <div className="absolute -left-[30px] sm:-left-[42px] top-1.5 w-6 h-6 rounded-full bg-white border-4 border-emerald-700 shadow-md flex items-center justify-center group-hover:scale-125 transition-transform" />

                <div className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200/90 shadow-md hover:shadow-xl transition-shadow space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-serif text-2xl font-bold text-emerald-800">
                      {m.year}
                    </span>
                    <span className="text-[11px] font-mono uppercase tracking-wider px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                      {m.tag}
                    </span>
                  </div>

                  <h3 className="font-serif text-xl font-bold text-stone-900">
                    {m.title}
                  </h3>
                  <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                    {m.subtitle}
                  </div>

                  <p className="text-stone-700 text-xs sm:text-sm leading-relaxed pt-1">
                    {m.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 6. CLOSING CTA BANNER — Natural Progression to Catalog */}
      <section className="py-20 px-6 md:px-12 lg:px-20 max-w-7xl mx-auto">
        <div className="relative rounded-[36px] overflow-hidden bg-gradient-to-br from-[#062419] via-[#0B3526] to-[#041D14] text-white p-8 sm:p-12 md:p-16 lg:p-20 shadow-2xl border border-emerald-800/40 text-center">
          
          {/* Subtle Glows */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-3xl mx-auto space-y-6 relative z-10">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-300 text-xs uppercase tracking-widest font-semibold border border-white/10">
              <Sparkles className="w-3.5 h-3.5" />
              Cultivate With Living Soil
            </span>

            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight">
              Ready to Experience the Purity of Pure Organic Cultivation?
            </h2>

            <p className="text-stone-300 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto font-light">
              Explore our full catalogue of desalinated coco peat substrates, vermicompost boosters, organic heirloom seeds, and zero-plastic coir pots.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <button
                onClick={() => {
                  setTab('shop');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold text-sm rounded-full shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <span>Explore Organic Catalog</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  setTab('contact-us');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-full border border-white/20 hover:border-white/40 transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <span>Connect With Agri-Experts</span>
              </button>
            </div>

          </div>

        </div>
      </section>

    </div>
  );
};
