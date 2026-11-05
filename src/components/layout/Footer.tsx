import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useHomepageCMS } from '../../hooks/useHomepageCMS';
import { useStoreSettings } from '../../hooks/useStoreSettings';
import { AdminService } from '../../services/AdminService';
import { MASTER_CATEGORIES } from '../../data/categoryCatalog';
import { CategoryItem } from '../../types';

import { 
  Leaf, Shield, Globe, Award, Mail, Phone, MapPin, Sparkles, 
  ArrowRight, Truck, Lock, CheckCircle2, Send, Instagram, 
  Facebook, Twitter, Linkedin, Youtube, Sprout 
} from 'lucide-react';
import { BioCartLogo } from '../ui/BioCartLogo';

export const Footer: React.FC = () => {
  const { cms } = useHomepageCMS();
  const { settings } = useStoreSettings();
  const { setTab, setSubView, setSelectedCategory } = useApp();
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  useEffect(() => {
    const unsub = AdminService.subscribeToCategories((list) => {
      setCategories(list);
    });
    return () => unsub();
  }, []);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail.trim()) {
      setIsSubscribed(true);
      setNewsletterEmail('');
    }
  };

  const handleCategoryClick = (categoryName: string) => {
    setSelectedCategory(categoryName);
    setTab('shop');
    setSubView(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSupportClick = (supportSlug: string) => {
    setTab(supportSlug as any);
    setSubView(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCompanyClick = () => {
    setTab('about-us' as any);
    setSubView(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div 
      className="w-full bg-gradient-to-b from-[#FAFCFA] to-[#F3F8F2] dark:from-charcoal-900 dark:to-charcoal-950 pt-[80px] pb-[40px] px-6 md:px-16 rounded-t-[40px] border-t border-emerald-100/40 dark:border-white/5 shadow-[inset_0_4px_30px_rgba(15,61,46,0.03),0_-10px_40px_rgba(0,0,0,0.02)] relative overflow-hidden" 
      id="biocart-footer-outer-wrapper"
    >
      {/* Soft Decorative Ambient Background Glows */}
      <div className="absolute top-0 left-1/4 w-[300px] h-[300px] bg-emerald-500/5 dark:bg-emerald-500/2 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-emerald-500/5 dark:bg-emerald-500/2 rounded-full blur-[120px] pointer-events-none animate-pulse" />

      {/* Premium Master Footer Container */}
      <div className="max-w-[1440px] mx-auto relative z-10" id="biocart-footer-inner-shell">
        
        {/* 1. TRUST FEATURES SECTION (4 Columns, elevated premium cards) */}
        <section id="footer-trust-features">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[32px]" id="trust-grid">
            
            {/* Card 1: 100% Organic */}
            <div 
              className="bg-white/80 dark:bg-charcoal-800/40 backdrop-blur-md h-[140px] p-[28px] rounded-[24px] border border-emerald-500/5 dark:border-white/5 shadow-[0_4px_20px_rgba(15,61,46,0.02)] hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(15,61,46,0.06)] hover:border-emerald-500/25 dark:hover:border-emerald-500/25 transition-all duration-300 flex items-start gap-5 group" 
              id="trust-card-organic"
            >
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-[16px] text-emerald-600 dark:text-emerald-400 group-hover:scale-110 group-hover:rotate-6 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50 transition-all duration-300">
                <Sprout className="w-6 h-6" />
              </div>
              <div className="space-y-1 overflow-hidden">
                <h4 className="font-sans font-bold text-sm text-nature-800 dark:text-white uppercase tracking-wider truncate">
                  100% Organic
                </h4>
                <p className="text-xs text-charcoal-500 dark:text-slate-400 leading-relaxed font-sans font-medium line-clamp-2">
                  Certified, naturally sourced ecological plant food.
                </p>
              </div>
            </div>

            {/* Card 2: Pan India Delivery */}
            <div 
              className="bg-white/80 dark:bg-charcoal-800/40 backdrop-blur-md h-[140px] p-[28px] rounded-[24px] border border-emerald-500/5 dark:border-white/5 shadow-[0_4px_20px_rgba(15,61,46,0.02)] hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(15,61,46,0.06)] hover:border-emerald-500/25 dark:hover:border-emerald-500/25 transition-all duration-300 flex items-start gap-5 group" 
              id="trust-card-delivery"
            >
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-[16px] text-emerald-600 dark:text-emerald-400 group-hover:scale-110 group-hover:rotate-6 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50 transition-all duration-300">
                <Truck className="w-6 h-6" />
              </div>
              <div className="space-y-1 overflow-hidden">
                <h4 className="font-sans font-bold text-sm text-nature-800 dark:text-white uppercase tracking-wider truncate">
                  Pan India Shipping
                </h4>
                <p className="text-xs text-charcoal-500 dark:text-slate-400 leading-relaxed font-sans font-medium line-clamp-2">
                  Fast and secure dispatch across all states.
                </p>
              </div>
            </div>

            {/* Card 3: Secure Payments */}
            <div 
              className="bg-white/80 dark:bg-charcoal-800/40 backdrop-blur-md h-[140px] p-[28px] rounded-[24px] border border-emerald-500/5 dark:border-white/5 shadow-[0_4px_20px_rgba(15,61,46,0.02)] hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(15,61,46,0.06)] hover:border-emerald-500/25 dark:hover:border-emerald-500/25 transition-all duration-300 flex items-start gap-5 group" 
              id="trust-card-payments"
            >
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-[16px] text-emerald-600 dark:text-emerald-400 group-hover:scale-110 group-hover:rotate-6 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50 transition-all duration-300">
                <Lock className="w-6 h-6" />
              </div>
              <div className="space-y-1 overflow-hidden">
                <h4 className="font-sans font-bold text-sm text-nature-800 dark:text-white uppercase tracking-wider truncate">
                  Secure Checkout
                </h4>
                <p className="text-xs text-charcoal-500 dark:text-slate-400 leading-relaxed font-sans font-medium line-clamp-2">
                  Safe payments protected by standard encryption.
                </p>
              </div>
            </div>

            {/* Card 4: Quality Tested */}
            <div 
              className="bg-white/80 dark:bg-charcoal-800/40 backdrop-blur-md h-[140px] p-[28px] rounded-[24px] border border-emerald-500/5 dark:border-white/5 shadow-[0_4px_20px_rgba(15,61,46,0.02)] hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(15,61,46,0.06)] hover:border-emerald-500/25 dark:hover:border-emerald-500/25 transition-all duration-300 flex items-start gap-5 group" 
              id="trust-card-quality"
            >
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-[16px] text-emerald-600 dark:text-emerald-400 group-hover:scale-110 group-hover:rotate-6 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50 transition-all duration-300">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1 overflow-hidden">
                <h4 className="font-sans font-bold text-sm text-nature-800 dark:text-white uppercase tracking-wider truncate">
                  Agri-Tested
                </h4>
                <p className="text-xs text-charcoal-500 dark:text-slate-400 leading-relaxed font-sans font-medium line-clamp-2">
                  Inspected and certified for optimal soil health.
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* 2. NEWSLETTER SECTION (Separated by exactly 32px spacing, visually continuous block) */}
        <section className="mt-[32px]" id="footer-newsletter">
          <div 
            className="bg-emerald-950/[0.03] dark:bg-charcoal-800/20 rounded-[24px] border border-emerald-500/10 dark:border-white/5 p-8 md:p-12 flex flex-col lg:flex-row items-center justify-between gap-8 shadow-inner" 
            id="newsletter-card"
          >
            <div className="space-y-2 text-center lg:text-left max-w-xl">
              <h3 className="font-serif font-bold text-2xl md:text-3xl text-nature-800 dark:text-white tracking-tight">
                Join Our Green Community
              </h3>
              <p className="text-sm text-[#2E2E2E] dark:text-slate-300 font-sans leading-relaxed font-medium">
                Receive curated farm dispatches, seasonal crop calendars, and priority access to premium coir batches.
              </p>
            </div>

            <div className="w-full max-w-md" id="newsletter-form-container">
              {isSubscribed ? (
                <div 
                  className="p-4 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-500/20 text-emerald-800 dark:text-emerald-400 rounded-[16px] text-center font-sans font-bold text-sm animate-fadeIn" 
                  id="newsletter-success"
                >
                  🌱 Welcome to the family! Check your inbox for your first guide.
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3" id="newsletter-form">
                  <input
                    type="email"
                    required
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="flex-grow px-5 py-3.5 rounded-[16px] bg-white dark:bg-charcoal-950 border border-slate-200 dark:border-white/10 text-sm text-charcoal-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all font-medium shadow-sm"
                    id="newsletter-email-input"
                  />
                  <button
                    type="submit"
                    className="px-6 py-3.5 bg-[#004643] hover:bg-[#003532] text-white font-bold text-sm rounded-[16px] transition-all flex items-center justify-center gap-2 shadow-md hover:scale-[1.02] active:scale-95 cursor-pointer !text-white"
                    id="newsletter-submit-btn"
                  >
                    <span className="!text-white font-semibold">Subscribe</span>
                    <Send className="w-4 h-4 text-white" />
                  </button>
                </form>
              )}
              <p className="text-[11px] text-charcoal-400 dark:text-slate-500 mt-3 text-center lg:text-left font-sans font-medium">
                No spam. Unsubscribe anytime. We respect your digital privacy.
              </p>
            </div>
          </div>
        </section>

        {/* 3. PREMIUM SITEMAP LAYOUT (Separated by exactly 40px spacing, unequal weights: 30%, 15%, 20%, 18%, 17%) */}
        <section className="mt-[40px]" id="main-premium-footer">
          {/* Elegant separator line */}
          <div className="w-full h-[1px] bg-emerald-500/10 dark:bg-white/5 mb-12" />

          <div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[30%_15%_20%_18%_17%] gap-y-12 gap-x-6 lg:gap-x-0" 
            id="footer-column-grid"
          >
            
            {/* Column 1: Logo & Corporate bio - Visual weight: 30% */}
            <div className="space-y-6 lg:pr-8" id="col-brand">
              <div 
                className="flex items-center text-nature-800 dark:text-white cursor-pointer origin-left" 
                onClick={() => { setTab('home'); setSubView(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
                id="col-brand-logo"
              >
                <BioCartLogo size="md" className="transition-transform duration-300 hover:scale-[1.02]" />
              </div>
              <p className="text-[14px] footer-description font-sans font-medium">
                BioCart is India's premier certified ecological horticulture brand. Dedicated to circular agriculture, carbon-neutral processing, and non-toxic urban farming solutions.
              </p>

              {/* Corporate Contact Info */}
              <div className="space-y-3.5 text-[13px] footer-meta font-sans font-medium">
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <a href={`tel:${(settings.contactPhone || '+91 949080479').replace(/\s+/g, '')}`} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors" aria-label="Call BioCart Customer Support">
                    {settings.contactPhone || '+91 949080479'}
                  </a>
                </div>
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <a href={`mailto:${settings.contactEmail || 'biocart.2025@gmail.com'}`} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors" aria-label="Email BioCart Support Desk">
                    {settings.contactEmail || 'biocart.2025@gmail.com'}
                  </a>
                </div>
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>{settings.address || 'Tirupati, Andhra Pradesh – 517507'}</span>
                </div>
              </div>
              
              {/* Certification Badges Grid */}
              <div className="flex flex-wrap gap-2 pt-2" id="certification-badges">
                <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 text-[10px] font-sans font-bold uppercase tracking-wider rounded-full border border-emerald-500/10">
                  🌱 100% Organic
                </span>
                <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 text-[10px] font-sans font-bold uppercase tracking-wider rounded-full border border-emerald-500/10">
                  🇮🇳 Made in India
                </span>
                <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 text-[10px] font-sans font-bold uppercase tracking-wider rounded-full border border-emerald-500/10">
                  🔒 Secure Pay
                </span>
                <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 text-[10px] font-sans font-bold uppercase tracking-wider rounded-full border border-emerald-500/10">
                  🚢 Worldwide Ship
                </span>
              </div>

              <div className="space-y-1.5 text-[11px] footer-copy font-mono" id="col-brand-corporate">
                <p className="font-bold text-nature-800 dark:text-slate-400 font-sans">SINDULIS INNOVATIVE SOLUTIONS</p>
                <p>Proprietorship • Unit: BioCart</p>
                <p>Udyam Reg: UDYAM-AP-23-0104910</p>
              </div>
            </div>

            {/* Column 2: Navigation Links - Visual weight: 15% */}
            <div className="space-y-6 lg:pl-4" id="col-company">
              <h4 className="footer-heading">
                Navigation
              </h4>
              <ul className="space-y-[14px]" id="col-company-links">
                {[
                  { label: 'Home', tab: 'home' },
                  { label: 'Shop', tab: 'shop' },
                  { label: 'About Us', tab: 'about-us' },
                  { label: 'Contact Us', tab: 'contact-us' },
                  { label: 'Blogs', tab: 'blogs' },
                ].map((item, idx) => (
                  <li key={idx}>
                    <button 
                      onClick={() => {
                        setTab(item.tab as any);
                        setSubView(null);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }} 
                      className="footer-link group/link"
                    >
                      <span className="footer-link-text font-semibold text-slate-800 dark:text-slate-200">{item.label}</span>
                      <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-emerald-600 dark:bg-emerald-400 group-hover/link:w-full transition-all duration-300" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>


            {/* Column 3: Shop Categories - Visual weight: 20% */}
            <div className="space-y-6 lg:pl-6" id="col-categories">
              <h4 className="footer-heading">
                Shop
              </h4>
              <ul className="space-y-[14px]" id="col-categories-links">
                {(categories.length > 0 ? categories : MASTER_CATEGORIES)
                  .filter((cat) => cat.active !== false && !cat.parentId)
                  .map((item) => (
                    <li key={item.id}>
                      <button 
                        onClick={() => handleCategoryClick(item.name)} 
                        className="footer-link group/link"
                      >
                        <span className="footer-link-text">{item.name}</span>
                        <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-emerald-600 dark:bg-emerald-400 group-hover/link:w-full transition-all duration-300" />
                      </button>
                    </li>
                  ))}
              </ul>
            </div>

            {/* Column 4: Customer Support - Visual weight: 18% */}
            <div className="space-y-6 lg:pl-4" id="col-support">
              <h4 className="footer-heading">
                Support
              </h4>
              <ul className="space-y-[14px]" id="col-support-links">
                {[
                  { label: 'Help & FAQs', topic: 'help-faqs' },
                  { label: 'Track Active Order', topic: 'track-active-order' },
                  { label: 'Shipping & Customs', topic: 'shipping-customs' },
                  { label: 'Returns & Refunds', topic: 'returns-refunds' },
                  { label: 'Soil Consultation ✦', topic: 'soil-consultation' },
                  { label: 'Contact Agri-Expert', topic: 'contact-agri-expert' }
                ].map((item, idx) => (
                  <li key={idx}>
                    <button 
                      onClick={() => handleSupportClick(item.topic)} 
                      className={`footer-link group/link text-left font-medium relative pb-1 ${
                        item.topic === 'soil-consultation' 
                          ? 'text-emerald-700 dark:text-emerald-400 font-bold' 
                          : ''
                      }`}
                    >
                      <span className="footer-link-text">{item.label}</span>
                      <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-emerald-600 dark:bg-emerald-400 group-hover/link:w-full transition-all duration-300" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 5: Business & Legal - Visual weight: 17% */}
            <div className="space-y-6 lg:pl-4" id="col-business">
              <h4 className="footer-heading">
                Legal
              </h4>
              <ul className="space-y-[14px]" id="col-business-links">
                {[
                  { label: 'Partner with Us', tab: 'partner-with-us' },
                  { label: 'Dealer Locator', tab: 'dealer-locator' },
                  { label: 'CSR Initiatives', tab: 'csr-initiatives' },
                  { label: 'Compliance Audits', tab: 'compliance-audits' },
                  { label: 'Terms of Service', tab: 'terms-of-service' },
                  { label: 'Privacy Policy', tab: 'privacy-policy' }
                ].map((item, idx) => (
                  <li key={idx}>
                    <button 
                      onClick={() => { setTab(item.tab as any); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
                      className="footer-link group/link"
                    >
                      <span className="footer-link-text">{item.label}</span>
                      <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-emerald-600 dark:bg-emerald-400 group-hover/link:w-full transition-all duration-300" />
                    </button>
                  </li>
                ))}
              </ul>

              {/* Account Portals */}
              <div className="pt-4 border-t border-emerald-500/10 dark:border-white/5 space-y-3" id="col-account-portals">
                <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 font-sans">
                  Account Portals
                </h5>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setSubView('vendor');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-[#004643] dark:hover:text-emerald-400 flex items-center gap-1.5 transition-colors cursor-pointer group"
                    id="footer-vendor-portal-link"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#004643] group-hover:scale-125 transition-transform" />
                    <span>Vendor Login</span>
                  </button>
                  <button
                    onClick={() => {
                      setSubView('admin');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-[#004643] dark:hover:text-emerald-400 flex items-center gap-1.5 transition-colors cursor-pointer group"
                    id="footer-admin-portal-link"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#004643] group-hover:scale-125 transition-transform" />
                    <span>Admin Login</span>
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* 4. SOCIAL MEDIA BUTTONS BAR (Premium circular buttons & scale/glow animations) */}
          <div className="mt-14 pt-8 border-t border-emerald-500/10 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-6" id="footer-social-bar">
            <div className="space-y-1 text-center md:text-left">
              <p className="text-xs text-emerald-700 dark:text-emerald-400 uppercase tracking-widest font-extrabold font-sans">
                Follow Our Dispatch Journey
              </p>
              <p className="text-base font-serif font-bold text-nature-800 dark:text-[#cbd5e1]">
                Regenerating Indian Horticulture @BioCart
              </p>
            </div>

            <div className="flex gap-4" id="social-circular-buttons">
              {[
                { name: 'Instagram', icon: Instagram, href: settings.socialLinks?.instagram || 'https://www.instagram.com/bio_cart/?hl=en' },
                { name: 'Facebook', icon: Facebook, href: settings.socialLinks?.facebook || 'https://facebook.com/biocart' },
                { name: 'Twitter', icon: Twitter, href: settings.socialLinks?.twitter || 'https://twitter.com/biocart' },
                { name: 'LinkedIn', icon: Linkedin, href: settings.socialLinks?.linkedin || 'https://linkedin.com/company/biocart' },
                { name: 'YouTube', icon: Youtube, href: settings.socialLinks?.youtube || 'https://youtube.com/biocart' }
              ].map((social, idx) => {
                const IconComponent = social.icon;
                return (
                  <a 
                    key={idx}
                    href={social.href} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    aria-label={`Follow BioCart on ${social.name}`}
                    className="w-12 h-12 rounded-full bg-white dark:bg-charcoal-800 flex items-center justify-center text-nature-800 dark:text-slate-300 border border-emerald-500/10 dark:border-white/5 shadow-sm hover:shadow-[0_0_20px_rgba(16,185,129,0.35)] hover:-translate-y-1 hover:scale-110 hover:text-nature-700 dark:hover:text-nature-400 transition-all duration-300"
                    id={`social-btn-${idx}`}
                  >
                    <IconComponent className="w-5 h-5" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* 5. COPYRIGHT BAR */}
          <div className="mt-8 pt-6 border-t border-emerald-500/10 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs footer-copy" id="footer-copyright-bar">
            <p className="text-center md:text-left font-sans font-medium">
              © 2026 BioCart. SINDULIS INNOVATIVE SOLUTIONS (Udyam: UDYAM-AP-23-0104910). All Rights Reserved.
            </p>
            <div className="flex flex-wrap justify-center gap-4 md:gap-6 text-charcoal-500 dark:text-slate-400 font-medium" id="copyright-bar-links">
              <span onClick={() => { setTab('privacy-policy'); setSubView(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-emerald-700 dark:hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
              <span onClick={() => { setTab('terms-of-service'); setSubView(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-emerald-700 dark:hover:text-white cursor-pointer transition-colors">Terms of Service</span>
              <span onClick={() => { setTab('contact-us'); setSubView(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-emerald-700 dark:hover:text-white cursor-pointer transition-colors text-emerald-600 dark:text-emerald-400 font-bold">GST Invoice Request</span>
            </div>
          </div>

        </section>

      </div>
    </div>
  );
};
