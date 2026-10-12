import React, { useState } from 'react';
import { usePageCMS } from '../hooks/usePageCMS';
import { INITIAL_CMS_PAGES } from '../data/initialCMSPages';
import { PageSection, CMSPage } from '../types/cms';
import { 
  ChevronDown, ChevronUp, CheckCircle, ArrowRight, 
  Sparkles, ShieldCheck, Leaf, Star, HelpCircle, Mail, AlertCircle,
  Phone, MapPin, Send, Building, Clock, MessageSquare, Award, CheckCircle2,
  Users, UserCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AdminService } from '../services/AdminService';

interface GenericCMSPageProps {
  pageId: string;
}

// Interactive Contact Form Component for CMS-rendered Contact Pages
const ContactFormBlock: React.FC<{ sectionData?: any }> = ({ sectionData }) => {
  const { addToast } = useApp();
  const [formType, setFormType] = useState<'general' | 'dealer' | 'distributor'>('general');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [city, setCity] = useState('');
  const [volumeEstimate, setVolumeEstimate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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
      addToast('Thank you! Your message has been recorded. Our team will reach out promptly.', 'success');
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
      setCompanyName('');
      setCity('');
      setVolumeEstimate('');
    } catch (err: any) {
      console.error(err);
      addToast('Submission failed. Please check connection and try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto my-12 bg-white rounded-3xl border border-slate-200 p-8 md:p-12 shadow-sm">
      <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit mb-6">
        <button
          type="button"
          onClick={() => setFormType('general')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            formType === 'general' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          General Inquiry
        </button>
        <button
          type="button"
          onClick={() => setFormType('dealer')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            formType === 'dealer' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Dealer Application
        </button>
        <button
          type="button"
          onClick={() => setFormType('distributor')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            formType === 'distributor' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Bulk Trade / Export
        </button>
      </div>

      <h3 className="text-2xl font-bold text-slate-900 mb-2">
        {formType === 'general' && (sectionData?.title || 'Send us a Message')}
        {formType === 'dealer' && 'Apply for Regional Dealer Rights'}
        {formType === 'distributor' && 'Initiate Bulk Distributor Sourcing'}
      </h3>
      <p className="text-xs text-slate-500 mb-8">
        {sectionData?.subtitle || 'All communications are processed directly by BioCart agronomists and logistics directors.'}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Subhash Maguluri"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. name@domain.com"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 99887 76655"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Location / City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Hyderabad / Guntur"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        {formType !== 'general' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Nursery Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Business entity name"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Estimated Scale / Volume</label>
              <select
                value={volumeEstimate}
                onChange={(e) => setVolumeEstimate(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600"
              >
                <option value="">Select Scale</option>
                <option value="retail">Local Nursery (500 - 2,000 units/mo)</option>
                <option value="state">Regional Distributor (2,000 - 10,000 units/mo)</option>
                <option value="export">Commercial / Bulk Container Trade</option>
              </select>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Message / Requirements *</label>
          <textarea
            required
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your inquiry, logistics requirements or questions..."
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <span>{isSubmitting ? 'Transmitting Inquiries...' : 'Submit Message'}</span>
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

export const GenericCMSPage: React.FC<GenericCMSPageProps> = ({ pageId }) => {
  const { cmsData: remoteCms, loading } = usePageCMS(pageId);
  const { setTab, setSelectedCategory } = useApp();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Fallback to initial canonical seed page if Firestore document doesn't exist
  const initialFallback = INITIAL_CMS_PAGES.find(
    (p) => p.id === pageId || p.slug === pageId
  );

  const activePage: CMSPage | any = remoteCms || initialFallback;

  if (loading && !activePage) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!activePage) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <HelpCircle className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Page Not Found</h2>
        <p className="text-sm text-slate-500 max-w-md">
          The requested content for "{pageId}" has not been published or configured yet.
        </p>
        <button
          onClick={() => { setTab('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          className="mt-6 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all"
        >
          Return to Marketplace Home
        </button>
      </div>
    );
  }

  // Ensure unpublished drafts are NOT visible on the storefront
  if (activePage.status === 'draft') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
        <div className="w-16 h-16 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-amber-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">{activePage.title || 'Page Draft'}</h2>
        <p className="text-sm text-slate-500 max-w-md">
          This page is currently unpublished or in draft review. Only live published pages are accessible on the public customer storefront.
        </p>
        <button
          onClick={() => { setTab('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          className="mt-6 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-all"
        >
          Explore Catalog Home
        </button>
      </div>
    );
  }

  // Render Modern WordPress-Style Section Blocks
  if (activePage.sections && Array.isArray(activePage.sections)) {
    const enabledSections = activePage.sections
      .filter((s: PageSection) => s.enabled)
      .sort((a: PageSection, b: PageSection) => (a.order || 0) - (b.order || 0));

    return (
      <div className="min-h-screen bg-slate-50/50 pb-20">
        {enabledSections.map((sec: PageSection) => {
          switch (sec.type) {
            case 'hero':
              return (
                <section
                  key={sec.id}
                  className="relative bg-emerald-950 text-white overflow-hidden py-20 px-6 md:px-16"
                  style={{
                    backgroundImage: sec.data.imageUrl ? `linear-gradient(rgba(6, 44, 32, 0.85), rgba(6, 44, 32, 0.95)), url(${sec.data.imageUrl})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  <div className="max-w-5xl mx-auto text-center space-y-6">
                    {sec.data.badgeText && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <Sparkles className="w-3.5 h-3.5" />
                        {sec.data.badgeText}
                      </span>
                    )}
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
                      {sec.data.titleLine1 || sec.title || activePage.title}
                    </h1>
                    {sec.data.subtitle && (
                      <p className="text-base md:text-lg text-emerald-100/90 max-w-2xl mx-auto font-light">
                        {sec.data.subtitle}
                      </p>
                    )}
                    {sec.data.primaryButtonText && (
                      <div className="pt-4">
                        <button
                          onClick={() => { setTab('shop'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                          className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold text-sm rounded-xl shadow-lg transition-all inline-flex items-center gap-2"
                        >
                          {sec.data.primaryButtonText}
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </section>
              );

            case 'promotional_ribbon':
              return (
                <div key={sec.id} className="bg-emerald-600 text-white py-3 px-6 text-center text-xs md:text-sm font-medium shadow-sm">
                  <div className="max-w-4xl mx-auto flex items-center justify-center gap-3 flex-wrap">
                    {sec.data.campaignLabel && (
                      <span className="font-bold uppercase tracking-wider text-[10px] bg-emerald-800/80 px-2 py-0.5 rounded">
                        {sec.data.campaignLabel}
                      </span>
                    )}
                    <span>{sec.data.text}</span>
                    {sec.data.ctaText && (
                      <a
                        href={sec.data.ctaLink || '#shop'}
                        className="underline font-bold hover:text-emerald-100 transition-colors inline-flex items-center gap-1"
                      >
                        {sec.data.ctaText}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );

            case 'stats':
              return (
                <section key={sec.id} className="max-w-6xl mx-auto px-6 py-12">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {(sec.data.stats || []).map((st: any, i: number) => (
                      <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
                        <div className="text-2xl md:text-3xl font-extrabold text-emerald-700">{st.value || st.number}</div>
                        <div className="text-xs font-semibold text-slate-800 mt-1">{st.label}</div>
                        {st.subtext && <div className="text-[11px] text-slate-400 mt-0.5">{st.subtext}</div>}
                      </div>
                    ))}
                  </div>
                </section>
              );

            case 'faq':
              return (
                <section key={sec.id} className="max-w-4xl mx-auto px-6 py-12 space-y-6">
                  {sec.title && <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">{sec.title}</h2>}
                  <div className="space-y-3">
                    {(sec.data.items || []).map((faq: any, i: number) => {
                      const isOpen = openFaqIndex === i;
                      return (
                        <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                          <button
                            onClick={() => setOpenFaqIndex(isOpen ? null : i)}
                            className="w-full p-5 text-left flex items-center justify-between gap-4 font-semibold text-slate-800 hover:text-emerald-700 transition-colors"
                          >
                            <span>{faq.q || faq.question}</span>
                            {isOpen ? <ChevronUp className="w-5 h-5 text-emerald-600 shrink-0" /> : <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />}
                          </button>
                          {isOpen && (
                            <div className="px-5 pb-5 text-xs md:text-sm text-slate-600 border-t border-slate-100 pt-3 leading-relaxed">
                              {faq.a || faq.answer}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );

            case 'rich_text':
              return (
                <section key={sec.id} className="max-w-4xl mx-auto px-6 py-12">
                  <div className="bg-white p-8 md:p-12 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                    {sec.data.heading && (
                      <h2 className="text-2xl md:text-3xl font-bold text-slate-900 border-b border-slate-100 pb-4">
                        {sec.data.heading}
                      </h2>
                    )}
                    <div 
                      className="prose prose-emerald max-w-none text-slate-600 text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: sec.data.body || sec.data.content || '' }}
                    />
                  </div>
                </section>
              );

            case 'brand_philosophy':
              return (
                <section key={sec.id} className="max-w-5xl mx-auto px-6 py-12">
                  <div className="bg-gradient-to-br from-emerald-900 to-emerald-950 text-white rounded-3xl p-8 md:p-12 shadow-md space-y-6">
                    <span className="text-xs uppercase tracking-widest text-emerald-300 font-bold">
                      {sec.data.eyebrow || 'Regenerative Agriculture Standard'}
                    </span>
                    <h2 className="text-2xl md:text-3xl font-bold">{sec.data.heading || sec.title}</h2>
                    <p className="text-sm md:text-base text-emerald-100/90 leading-relaxed max-w-2xl">
                      {sec.data.paragraph1 || sec.data.description || sec.data.paragraph2}
                    </p>
                  </div>
                </section>
              );

            case 'contact_form':
              return (
                <section key={sec.id} className="px-6">
                  <ContactFormBlock sectionData={sec.data} />
                </section>
              );

            case 'team_members':
              return (
                <section key={sec.id} className="max-w-6xl mx-auto px-6 py-16">
                  {sec.title && (
                    <div className="text-center mb-12">
                      <h2 className="text-3xl font-bold text-slate-900">{sec.title}</h2>
                      {sec.data.subtitle && <p className="text-sm text-slate-500 mt-2">{sec.data.subtitle}</p>}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {(sec.data.members || []).map((mem: any, mIdx: number) => (
                      <div key={mIdx} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm p-6 text-center space-y-4">
                        {mem.imageUrl && (
                          <img src={mem.imageUrl} alt={mem.name} className="w-32 h-32 rounded-full mx-auto object-cover border-4 border-emerald-50" />
                        )}
                        <div>
                          <h4 className="text-lg font-bold text-slate-900">{mem.name}</h4>
                          <p className="text-xs font-semibold text-emerald-700">{mem.role || mem.title}</p>
                          {mem.company && <p className="text-[11px] text-slate-400 mt-0.5">{mem.company}</p>}
                        </div>
                        {mem.bio && <p className="text-xs text-slate-600 leading-relaxed text-left">{mem.bio}</p>}
                        {mem.quote && (
                          <blockquote className="text-[11px] italic text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-100/60">
                            "{mem.quote}"
                          </blockquote>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              );

            case 'timeline_milestones':
              return (
                <section key={sec.id} className="max-w-4xl mx-auto px-6 py-16">
                  {sec.title && <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">{sec.title}</h2>}
                  <div className="relative pl-8 border-l-2 border-emerald-500 space-y-10">
                    {(sec.data.milestones || []).map((m: any, mIdx: number) => (
                      <div key={mIdx} className="relative group">
                        <span className="absolute -left-[41px] top-1.5 w-4 h-4 rounded-full bg-white border-4 border-emerald-600" />
                        <span className="inline-block text-xs font-mono font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                          {m.year}
                        </span>
                        <h4 className="text-base font-bold text-slate-900 mt-1">{m.title}</h4>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{m.desc || m.description}</p>
                      </div>
                    ))}
                  </div>
                </section>
              );

            case 'partner_inquiry':
              return (
                <section key={sec.id} className="max-w-6xl mx-auto px-6 py-16">
                  <div className="bg-gradient-to-br from-emerald-900 via-emerald-950 to-slate-950 text-white rounded-3xl p-8 md:p-14 shadow-xl">
                    <div className="max-w-3xl space-y-6">
                      <span className="text-xs uppercase tracking-widest text-emerald-400 font-bold">
                        {sec.data.eyebrow || 'Enterprise & Institutional Partnerships'}
                      </span>
                      <h2 className="text-3xl md:text-4xl font-bold leading-tight">
                        {sec.data.heading || sec.title || 'Partner with BioCart India'}
                      </h2>
                      <p className="text-sm md:text-base text-emerald-100/90 leading-relaxed font-light">
                        {sec.data.description || 'We collaborate with state agricultural universities, organic grower clusters, CSR foundations, and nursery distributor chains across India.'}
                      </p>
                      {sec.data.pillars && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                          {sec.data.pillars.map((pil: any, pIdx: number) => (
                            <div key={pIdx} className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                              <h5 className="font-bold text-xs text-emerald-300">{pil.title}</h5>
                              <p className="text-[11px] text-white/80 mt-1 leading-relaxed">{pil.desc}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="pt-6 flex flex-wrap gap-4">
                        <button
                          onClick={() => { setTab('contact'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                          className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold text-xs rounded-xl shadow-lg transition-all"
                        >
                          {sec.data.ctaText || 'Submit Partnership Proposal'}
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              );

            case 'features_list':
              return (
                <section key={sec.id} className="max-w-6xl mx-auto px-6 py-16">
                  {sec.title && <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">{sec.title}</h2>}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {(sec.data.features || []).map((feat: any, fIdx: number) => (
                      <div key={fIdx} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        </div>
                        <h4 className="font-bold text-base text-slate-900">{feat.title}</h4>
                        <p className="text-xs text-slate-600 leading-relaxed">{feat.desc || feat.description}</p>
                      </div>
                    ))}
                  </div>
                </section>
              );

            case 'cta_banner':
              return (
                <section key={sec.id} className="max-w-5xl mx-auto px-6 py-12">
                  <div className="bg-gradient-to-r from-emerald-800 to-emerald-950 rounded-3xl p-8 md:p-12 text-white text-center space-y-4 shadow-lg">
                    <h3 className="text-2xl md:text-3xl font-bold">{sec.data.title || sec.title}</h3>
                    {sec.data.subtitle && <p className="text-sm text-emerald-100 max-w-xl mx-auto">{sec.data.subtitle}</p>}
                    {sec.data.buttonText && (
                      <div className="pt-4">
                        <button
                          onClick={() => {
                            const dest = sec.data.buttonUrl || '#shop';
                            if (dest.startsWith('#')) {
                              setTab(dest.replace('#', ''));
                            } else {
                              window.location.href = dest;
                            }
                          }}
                          className="px-6 py-3 bg-white text-emerald-900 font-bold text-xs rounded-xl shadow transition-all hover:bg-emerald-50 cursor-pointer"
                        >
                          {sec.data.buttonText}
                        </button>
                      </div>
                    )}
                  </div>
                </section>
              );

            default:
              // Fallback block renderer
              return (
                <section key={sec.id} className="max-w-4xl mx-auto px-6 py-8">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    {sec.title && <h3 className="text-lg font-bold text-slate-900 mb-2">{sec.title}</h3>}
                    {sec.data.content && (
                      <div 
                        className="text-sm text-slate-600 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: sec.data.content }}
                      />
                    )}
                  </div>
                </section>
              );
          }
        })}
      </div>
    );
  }

  // Fallback for standard or category legacy format
  return (
    <div className="max-w-4xl mx-auto px-6 py-16 space-y-8">
      {activePage.image && (
        <img src={activePage.image} alt={activePage.title} className="w-full h-80 object-cover rounded-2xl shadow-md" />
      )}
      <h1 className="text-3xl md:text-4xl font-bold text-slate-900">{activePage.title || activePage.heroTitle}</h1>
      <div 
        className="prose max-w-none text-slate-600 text-sm leading-relaxed"
        dangerouslySetInnerHTML={{ __html: activePage.content || activePage.description || '' }}
      />
    </div>
  );
};

export default GenericCMSPage;
