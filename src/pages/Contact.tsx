import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { usePageCMS } from '../hooks/usePageCMS';
import { 
  Mail, MapPin, Phone, Clock, Send, MessageSquare, 
  HelpCircle, ChevronRight, Sparkles, Building, Landmark,
  ShieldCheck, CheckCircle2, Truck, Sprout, ArrowRight, Check
} from 'lucide-react';
import { AdminService } from '../services/AdminService';

export const Contact: React.FC = () => {
  const { addToast } = useApp();
  const { cmsData } = usePageCMS('contact-us');
  
  const [formType, setFormType] = useState<'general' | 'dealer' | 'distributor'>('general');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  
  // Specific Dealer / Bulk Export Fields
  const [companyName, setCompanyName] = useState('');
  const [city, setCity] = useState('');
  const [volumeEstimate, setVolumeEstimate] = useState('');

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !email.trim() || !phone.trim() || !message.trim()) {
      addToast('Please complete all mandatory required fields.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      await AdminService.submitContactMessage({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        message: message.trim(),
        type: formType,
        companyName: companyName.trim(),
        city: city.trim(),
        volumeEstimate
      });

      let successMsg = 'Thank you! Your general enquiry has been dispatched directly to the BioCart support desk.';
      if (formType === 'dealer') {
        successMsg = 'Thank you! Dealer application received. Our operations team will contact you within 24 hours.';
      } else if (formType === 'distributor') {
        successMsg = 'Thank you! Bulk export / trade inquiry received. Director Tagore Subhash Maguluri will reach out.';
      }

      addToast(successMsg, 'success');
      setSubmitSuccess(true);
      
      // Reset form fields
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
      setCompanyName('');
      setCity('');
      setVolumeEstimate('');
    } catch (err: any) {
      console.error('Contact submission error:', err);
      addToast('Failed to submit message. Please verify network and try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#FAFDF9] text-stone-900 pb-20 selection:bg-emerald-200 selection:text-emerald-950 font-sans">
      
      {/* 1. HERO SECTION — Customer Support & Direct Communication */}
      <section className="relative pt-36 pb-20 md:pt-44 md:pb-28 px-6 md:px-12 lg:px-20 overflow-hidden bg-gradient-to-b from-[#062419] via-[#0A2E21] to-[#0D3828] text-white text-center">
        {/* Subtle Organic Pattern Texture */}
        <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay">
          <img 
            src="https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=2000&q=80" 
            alt="Organic pattern"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Ambient Lights */}
        <div className="absolute -top-32 right-12 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 left-12 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto relative z-10 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 text-xs font-semibold tracking-widest uppercase shadow-inner"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Customer Care & Commercial Inquiries</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-tight"
          >
            We Are Here to Assist Your <br className="hidden sm:inline" />
            <span className="italic font-normal font-serif text-emerald-300 bg-gradient-to-r from-emerald-200 via-emerald-300 to-amber-200 bg-clip-text text-transparent">
              Organic Growing Journey.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-base sm:text-lg text-stone-300 max-w-2xl mx-auto leading-relaxed font-light"
          >
            Whether you need horticultural soil guidance, support with an active order, regional nursery dealership, or container-load international export inquiries, our team responds directly.
          </motion.p>
        </div>
      </section>

      {/* 2. MAIN TWO-COLUMN SECTION (Desktop 2-Col / Mobile 1-Col) */}
      <section className="py-16 md:py-24 px-6 md:px-12 lg:px-20 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          
          {/* Left Column: Interactive Form with 3 Specific Inquiries */}
          <div className="lg:col-span-7 bg-white p-8 sm:p-10 md:p-12 rounded-3xl border border-stone-200 shadow-xl space-y-8">
            
            {/* Inquiry Selector Tabs */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Step 1: Select Inquiry Purpose
              </span>
              <div className="grid grid-cols-3 gap-2 p-1.5 bg-stone-100 rounded-2xl border border-stone-200/80">
                <button
                  type="button"
                  onClick={() => { setFormType('general'); setSubmitSuccess(false); }}
                  className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                    formType === 'general'
                      ? 'bg-white text-emerald-950 shadow-md border border-stone-200/50'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  General Inquiry
                </button>
                <button
                  type="button"
                  onClick={() => { setFormType('dealer'); setSubmitSuccess(false); }}
                  className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                    formType === 'dealer'
                      ? 'bg-white text-emerald-950 shadow-md border border-stone-200/50'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Dealer Application
                </button>
                <button
                  type="button"
                  onClick={() => { setFormType('distributor'); setSubmitSuccess(false); }}
                  className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                    formType === 'distributor'
                      ? 'bg-white text-emerald-950 shadow-md border border-stone-200/50'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Bulk Trade / Export
                </button>
              </div>
            </div>

            {/* Form Header Context */}
            <div className="space-y-1 border-b border-stone-150 pb-4">
              <h3 className="font-serif text-2xl font-bold text-stone-900">
                {formType === 'general' && 'Send a Direct Message'}
                {formType === 'dealer' && 'Apply for Regional Dealer Franchise'}
                {formType === 'distributor' && 'Initiate Bulk Export & Trade Procurement'}
              </h3>
              <p className="text-xs sm:text-sm text-stone-500">
                {formType === 'general' && 'Direct inquiry to our customer success agronomists and logistics desk.'}
                {formType === 'dealer' && 'Partner with BioCart to stock certified coir and organic soil products in your regional nursery.'}
                {formType === 'distributor' && 'FOB port quotes, container-level husk specifications, and customized OEM coir blocks.'}
              </p>
            </div>

            {submitSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-900 text-xs sm:text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Your submission has been safely recorded in our database. We will respond promptly.</span>
              </div>
            )}

            {/* Interactive Form */}
            <form onSubmit={handleFormSubmit} className="space-y-5">
              
              {/* Row 1: Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-700">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Subhash Maguluri"
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-700">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. name@company.com"
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* Row 2: Phone & City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-700">Phone / WhatsApp Number *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 949080479"
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-700">City & State *</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Guntur, Andhra Pradesh"
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* Conditional Row: Company & Volume for Dealer/Distributor */}
              {formType !== 'general' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-stone-50 border border-stone-200/80">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-stone-700">Company / Nursery Name *</label>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Sindulis Green Nursery"
                      className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-emerald-600 transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-stone-700">Estimated Monthly Volume *</label>
                    <select
                      required
                      value={volumeEstimate}
                      onChange={(e) => setVolumeEstimate(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-emerald-600 transition-colors cursor-pointer"
                    >
                      <option value="">Select expected quantity</option>
                      <option value="500-2000">Small (500 – 2,000 units / month)</option>
                      <option value="2000-10000">Medium (2,000 – 10,000 units / month)</option>
                      <option value="10000+">Commercial (10,000+ units / FCL Export)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Message Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700">
                  {formType === 'general' ? 'Your Message or Question *' : 'Specific Requirements, Substrate Specs or Delivery Timeline *'}
                </label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    formType === 'general'
                      ? 'Please describe how our team can help you...'
                      : 'Outline your target products, required EC parameters, packaging specifications or questions...'
                  }
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-700/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Transmitting Inquiries...' : 'Submit Inquiry'}</span>
                <Send className="w-4 h-4" />
              </button>

              <div className="text-center">
                <span className="text-[11px] text-stone-400">
                  🔒 Zero-Spam Guarantee • Data is protected under BioCart privacy guidelines.
                </span>
              </div>

            </form>
          </div>

          {/* Right Column: Distinct Contact Information Cards */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Card 1: Registered HQ & Facility */}
            <div className="bg-white p-7 rounded-3xl border border-stone-200 shadow-md space-y-4 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-100">
                  <Building className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-lg text-stone-900">Registered HQ & Processing Facility</h4>
                  <span className="text-[11px] font-mono text-emerald-700 font-semibold uppercase">SINDULIS INNOVATIVE SOLUTIONS</span>
                </div>
              </div>
              <div className="text-xs sm:text-sm text-stone-600 leading-relaxed pl-1">
                <p className="font-medium text-stone-800">Tirupati</p>
                <p>Andhra Pradesh - 517507, India.</p>
                <p className="text-[11px] text-stone-400 mt-2">
                  Udyam: UDYAM-AP-23-0104910 • Operating Mon–Sat: 9:00 AM – 6:00 PM IST
                </p>
              </div>
            </div>

            {/* Card 2: Phone & WhatsApp Rapid Response */}
            <div className="bg-white p-7 rounded-3xl border border-stone-200 shadow-md space-y-4 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-100">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-lg text-stone-900">Phone & WhatsApp Support</h4>
                  <span className="text-[11px] font-mono text-emerald-700 font-semibold uppercase">Rapid Response Agronomy Desk</span>
                </div>
              </div>
              
              <div className="space-y-3 pt-1">
                <a 
                  href="tel:+91949080479"
                  className="flex items-center justify-between p-3 rounded-xl bg-stone-50 hover:bg-stone-100 text-stone-800 text-xs sm:text-sm font-semibold transition-colors border border-stone-200/60"
                >
                  <span className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-emerald-700" />
                    +91 949080479
                  </span>
                  <span className="text-[10px] uppercase font-bold text-emerald-700">Call Now</span>
                </a>

                <a 
                  href="https://wa.me/91949080479"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100/70 text-emerald-950 text-xs sm:text-sm font-semibold transition-colors border border-emerald-200"
                >
                  <span className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-700" />
                    WhatsApp Agri-Helpdesk
                  </span>
                  <span className="text-[10px] uppercase font-bold text-emerald-700">Under 10 Min SLA</span>
                </a>
              </div>
            </div>

            {/* Card 3: Email Communications */}
            <div className="bg-white p-7 rounded-3xl border border-stone-200 shadow-md space-y-4 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-100">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-lg text-stone-900">Direct Email Channels</h4>
                  <span className="text-[11px] font-mono text-emerald-700 font-semibold uppercase">Support & Executive Inquiries</span>
                </div>
              </div>
              
              <div className="space-y-2 text-xs sm:text-sm text-stone-600 pl-1">
                <div className="flex items-center justify-between py-1.5 border-b border-stone-100">
                  <span>Customer Support:</span>
                  <a href="mailto:biocart.2025@gmail.com" className="font-semibold text-emerald-800 hover:underline">
                    biocart.2025@gmail.com
                  </a>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-stone-100">
                  <span>Corporate & Legal:</span>
                  <a href="mailto:contact@sindulis.com" className="font-semibold text-emerald-800 hover:underline">
                    contact@sindulis.com
                  </a>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span>Founders Desk:</span>
                  <a href="mailto:tagore@sindulis.com" className="font-semibold text-emerald-800 hover:underline">
                    tagore@sindulis.com
                  </a>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 3. SERVICE COMMITMENTS — BioCart Operational Standards */}
      <section className="py-16 md:py-20 bg-stone-100/70 border-t border-stone-200/80 px-6 md:px-12 lg:px-20">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-800">
              Reliable Fulfillment
            </span>
            <h3 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-stone-900">
              Our Service Commitments to Every Grower
            </h3>
            <p className="text-stone-600 text-xs sm:text-sm">
              We hold our logistics, agronomic support, and packaging integrity to uncompromising standards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="p-6 bg-white rounded-2xl border border-stone-200 shadow-sm space-y-3">
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl w-fit">
                <Truck className="w-5 h-5" />
              </div>
              <h4 className="font-serif font-bold text-lg text-stone-900">24-Hour Dispatch SLA</h4>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                All confirmed orders are processed, quality-inspected, and dispatched from our AP fulfillment center within 24 business hours.
              </p>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-stone-200 shadow-sm space-y-3">
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl w-fit">
                <Sprout className="w-5 h-5" />
              </div>
              <h4 className="font-serif font-bold text-lg text-stone-900">Certified Agronomy Guidance</h4>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                Free soil test interpretation, custom potting mix recommendations, and pest advice provided directly by certified horticulturists.
              </p>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-stone-200 shadow-sm space-y-3">
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl w-fit">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="font-serif font-bold text-lg text-stone-900">100% Plastic-Free Guarantee</h4>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                Shipped in heavy-duty corrugated cartons sealed with water-activated starch tape and organic paper padding. Zero plastic bubble wraps.
              </p>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
};
