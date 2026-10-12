import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { usePageCMS } from '../hooks/usePageCMS';
import { 
  Mail, MapPin, Phone, Clock, Send, MessageSquare, 
  HelpCircle, ChevronRight, Sparkles, Building, Landmark
} from 'lucide-react';

import { AdminService } from '../services/AdminService';

export const Contact: React.FC = () => {
  const { addToast } = useApp();
  const { cmsData } = usePageCMS('contact-us');
  const [formType, setFormType] = useState<'general' | 'dealer' | 'distributor'>('general');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // General State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  
  // Dealer/Distributor Specific State
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

      let successMsg = 'Thank you! General enquiry dispatched successfully to Sindulis Agro Products.';
      if (formType === 'dealer') {
        successMsg = 'Thank you! Dealer registration request logged. Director Prashanthi Pallapothula will contact you.';
      } else if (formType === 'distributor') {
        successMsg = 'Thank you! Bulk Export / Distributor inquiry logged. Director Tagore Subhash Maguluri will contact you.';
      }

      addToast(successMsg, 'success');
      
      // Reset fields
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
      setCompanyName('');
      setCity('');
      setVolumeEstimate('');
    } catch (err: any) {
      console.error('Contact submission error:', err);
      addToast('Failed to submit message. Please check connection and retry.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-20 pb-24 animate-fade-in" id="contact-page">
      {/* Contact Banner */}
      <section className="relative min-h-[85vh] flex items-center justify-center pt-36 pb-20 px-6 overflow-hidden text-center animate-fade-in" id="contact-hero">
        {/* Cinematic Background with dynamic zoom */}
        <div className="absolute inset-0 z-0">
          <motion.div
            initial={{ scale: 1.15, opacity: 0 }}
            animate={{ scale: 1.05, opacity: 1 }}
            transition={{ duration: 2.5, ease: 'easeOut' }}
            className="w-full h-full"
          >
            <img 
              src={cmsData?.image || "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=1920&q=80"} 
              alt="Eco-friendly serene garden pathway" 
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </motion.div>
          {/* Dual-layer high-contrast overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/70 to-black/55 dark:from-charcoal-950/90 dark:via-charcoal-950/75 dark:to-charcoal-950/60 z-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 z-10" />
        </div>

        <div className="max-w-4xl mx-auto space-y-6 relative z-20">
          <motion.span 
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 0.85, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-400"
          >
            Contact & Enquiries
          </motion.span>
          <motion.h1 
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="font-serif font-bold text-4xl md:text-6xl text-white leading-[1.15] tracking-tight"
          >
            {cmsData?.heroTitle ? <span dangerouslySetInnerHTML={{ __html: cmsData.heroTitle }} /> : <>Let’s Build a <br />
            <span className="gradient-text-green font-sans font-extrabold italic drop-shadow-[0_2px_15px_rgba(34,197,94,0.3)]">Plastic-Free Tomorrow</span></>}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 0.9, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-sm md:text-lg text-slate-200 max-w-xl mx-auto leading-relaxed tracking-wide"
          >
            {cmsData?.heroSubtitle ? cmsData.heroSubtitle : 'Reach out for retail support, local dealer partnerships, or bulk distributor supply chains.'}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="pt-4"
          >
            <button
              onClick={() => {
                const element = document.getElementById('contact-content-grid');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full text-xs font-bold transition-all hover:scale-105 cursor-pointer shadow-lg shadow-emerald-600/20"
            >
              Get in Touch
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

      {/* Main Grid: Form & Info */}
      <section className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-64px items-start" id="contact-content-grid">
        {/* Info Column */}
        <div className="lg:col-span-5 space-y-10" id="info-column">
          <div className="space-y-4">
            <h2 className="font-serif font-bold text-3xl text-nature-900 dark:text-nature-400">
              Headquarters & Manufacturing
            </h2>
            <p className="text-xs md:text-sm text-charcoal-500 leading-relaxed">
              {cmsData?.content ? <span dangerouslySetInnerHTML={{ __html: cmsData.content }} /> : 'Sindulis Agro Products operates a state-of-the-art carbon-neutral processing facility. Visitors are welcome by scheduled appointments only.'}
            </p>
          </div>

          <div className="space-y-6" id="contact-methods">
            {/* MapPin */}
            <div className="flex items-start gap-4">
              <div className="p-3 bg-nature-50 dark:bg-nature-950/40 text-nature-700 rounded-2xl border border-nature-100/30">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h5 className="font-display font-bold text-sm text-charcoal-950 dark:text-white">Primary Processing Plant</h5>
                <p className="text-xs text-charcoal-500 leading-relaxed">
                  Sindulis Agro Products, Industrial Corridor Area,<br />
                  Guntur District, Andhra Pradesh - 522001, India.
                </p>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start gap-4">
              <div className="p-3 bg-nature-50 dark:bg-nature-950/40 text-nature-700 rounded-2xl border border-nature-100/30">
                <Mail className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h5 className="font-display font-bold text-sm text-charcoal-950 dark:text-white">Direct Correspondence</h5>
                <p className="text-xs text-charcoal-500">
                  General: contact@sindulis.com<br />
                  Founders Desk: tagore@sindulis.com
                </p>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-start gap-4">
              <div className="p-3 bg-nature-50 dark:bg-nature-950/40 text-nature-700 rounded-2xl border border-nature-100/30">
                <Phone className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h5 className="font-display font-bold text-sm text-charcoal-950 dark:text-white">Telecommunications</h5>
                <p className="text-xs text-charcoal-500">
                  Support Line: +91 863 2244 556<br />
                  Business Hours: Mon - Sat | 9:00 AM - 6:00 PM IST
                </p>
              </div>
            </div>

            {/* WhatsApp CTA */}
            <a 
              href="https://wa.me/918632244556" 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-2 p-4 bg-emerald-50 hover:bg-emerald-100/80 dark:bg-emerald-950/30 rounded-2xl text-emerald-800 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 transition-colors w-full cursor-pointer"
            >
              <MessageSquare className="w-5 h-5 fill-current text-emerald-600" />
              <div className="text-left">
                <span className="font-bold text-xs">Direct WhatsApp Helpdesk</span>
                <p className="text-[10px] text-emerald-700 dark:text-emerald-300 opacity-90">Usually responds in under 10 minutes</p>
              </div>
            </a>
          </div>

          {/* Embedded Google Maps placeholder */}
          <div className="relative aspect-video bg-slate-100 dark:bg-charcoal-800 rounded-3xl overflow-hidden shadow-sm border border-slate-200 dark:border-white/5" id="maps-placeholder">
            {/* Static Premium Map Graphic representation */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.1),transparent_80%)] flex flex-col items-center justify-center text-center p-6 space-y-3">
              <MapPin className="w-8 h-8 text-nature-700 animate-bounce" />
              <div className="space-y-1">
                <h6 className="font-display font-bold text-xs text-charcoal-950 dark:text-white">Interactive Production Plant Map</h6>
                <p className="text-[10px] text-charcoal-500 leading-normal max-w-xs mx-auto">
                  Coordinates: 16.3067° N, 80.4365° E. Sourcing sustainable organic raw materials from local farmer cooperatives.
                </p>
              </div>
              <a 
                href="https://maps.google.com/?q=Guntur,Andhra+Pradesh" 
                target="_blank" 
                rel="noreferrer"
                className="px-4 py-2 bg-white dark:bg-charcoal-900 border border-slate-250 dark:border-white/10 rounded-xl text-[10px] font-bold text-charcoal-800 dark:text-white shadow-sm hover:bg-slate-50 cursor-pointer"
              >
                Open Google Maps External Tab
              </a>
            </div>
          </div>
        </div>

        {/* Form Column */}
        <div className="lg:col-span-7 bg-white dark:bg-charcoal-900 p-8 md:p-12 rounded-3xl border border-slate-150 dark:border-white/5 shadow-md space-y-8" id="form-column">
          <div className="space-y-4">
            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-charcoal-950 rounded-2xl w-fit" id="form-type-selector">
              <button
                type="button"
                onClick={() => setFormType('general')}
                className={`px-4 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-colors cursor-pointer ${
                  formType === 'general' ? 'bg-white dark:bg-charcoal-900 text-nature-700 shadow-sm' : 'text-charcoal-500 hover:text-charcoal-800'
                }`}
              >
                General Inquiry
              </button>
              <button
                type="button"
                onClick={() => setFormType('dealer')}
                className={`px-4 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-colors cursor-pointer ${
                  formType === 'dealer' ? 'bg-white dark:bg-charcoal-900 text-nature-700 shadow-sm' : 'text-charcoal-500 hover:text-charcoal-800'
                }`}
              >
                Dealer Portal Registration
              </button>
              <button
                type="button"
                onClick={() => setFormType('distributor')}
                className={`px-4 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-colors cursor-pointer ${
                  formType === 'distributor' ? 'bg-white dark:bg-charcoal-900 text-nature-700 shadow-sm' : 'text-charcoal-500 hover:text-charcoal-800'
                }`}
              >
                Distributor / Bulk Export
              </button>
            </div>

            <h3 className="font-serif font-bold text-2xl text-nature-900 dark:text-nature-400 mt-2">
              {formType === 'general' && 'Submit a Message'}
              {formType === 'dealer' && 'Register as Local Dealer'}
              {formType === 'distributor' && 'Initiate Distributor / Bulk Export Trade'}
            </h3>
            <p className="text-xs text-charcoal-500 leading-relaxed">
              {formType === 'general' && 'Use this form for retail purchases assistance, shipping issues, or feedback.'}
              {formType === 'dealer' && 'Apply to list BioCart coir materials inside your regional nurseries or seed stores.'}
              {formType === 'distributor' && 'Request container-level custom husk configurations, OEM specifications, and bulk port quotes.'}
            </p>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-6" id="contact-interactive-form">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16px">
              {/* Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-charcoal-500">Your Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Subhash Maguluri"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-white/10 rounded-xl focus:border-nature-600 focus:outline-none text-xs text-charcoal-950 dark:text-white"
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-charcoal-500">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-white/10 rounded-xl focus:border-nature-600 focus:outline-none text-xs text-charcoal-950 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-16px">
              {/* Phone */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-charcoal-500">Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 99887 76655"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-white/10 rounded-xl focus:border-nature-600 focus:outline-none text-xs text-charcoal-950 dark:text-white"
                />
              </div>

              {/* Conditional parameters depending on selection */}
              {formType !== 'general' ? (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-charcoal-500">Company / Nursery Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Andhra Green Nursery"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-white/10 rounded-xl focus:border-nature-600 focus:outline-none text-xs text-charcoal-950 dark:text-white"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-charcoal-500">Primary Location City</label>
                  <input
                    type="text"
                    placeholder="e.g. Hyderabad"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-white/10 rounded-xl focus:border-nature-600 focus:outline-none text-xs text-charcoal-950 dark:text-white"
                  />
                </div>
              )}
            </div>

            {formType !== 'general' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-16px">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-charcoal-500">Operation City / Region *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Guntur"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-white/10 rounded-xl focus:border-nature-600 focus:outline-none text-xs text-charcoal-950 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-charcoal-500">Expected Purchase Volume *</label>
                  <select
                    required
                    value={volumeEstimate}
                    onChange={(e) => setVolumeEstimate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-white/10 rounded-xl focus:border-nature-600 focus:outline-none text-xs text-charcoal-600 dark:text-slate-300 appearance-none font-medium cursor-pointer"
                  >
                    <option value="">Select expected scale</option>
                    <option value="small">Small (500 - 2,000 units / month)</option>
                    <option value="medium">Medium (2,000 - 10,000 units / month)</option>
                    <option value="large">Large / Container Export (10,000+ units)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Message Area */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-charcoal-500">Message / Sourcing Requirements *</label>
              <textarea
                required
                rows={4}
                placeholder={formType === 'general' ? 'Type your message here...' : 'Outline your product distribution layout, shipping port, or custom sizing requirement details...'}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-white/10 rounded-xl focus:border-nature-600 focus:outline-none text-xs text-charcoal-950 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-4 bg-nature-700 hover:bg-nature-800 text-white rounded-xl text-xs font-bold shadow-md transition-all hover:scale-[1.01] cursor-pointer flex items-center justify-center gap-2 w-full hover:scale-105 active:scale-95 transition-all duration-300 ease-out shadow-md hover:shadow-nature-700/30 disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Transmitting Request...' : 'Transmit Sourcing Request'}</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};
