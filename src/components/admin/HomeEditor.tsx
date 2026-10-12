import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { AdminService } from '../../services/AdminService';
import { useHomepageCMS, defaultHomepageCMS } from '../../hooks/useHomepageCMS';
import { Save, AlertCircle, ChevronDown, ChevronRight, Layout, Image as ImageIcon, Type, LayoutTemplate, MessageSquare, Plus, Trash2, ShieldCheck, Leaf, Globe, Star, Megaphone
 } from 'lucide-react';
import { ImageUploader } from './ImageUploader';

export const HomeEditor: React.FC = () => {
  const { addToast } = useApp();
  const { cms, loading } = useHomepageCMS();
  const [formData, setFormData] = useState<any>(defaultHomepageCMS);
  const [isSaving, setIsSaving] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState<string | null>('hero');

  useEffect(() => {
    if (!loading) {
      setFormData(cms);
    }
  }, [cms, loading]);

  const handleChange = (section: string, field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleStatChange = (index: number, field: string, value: string) => {
    const newStats = [...formData.stats];
    newStats[index] = { ...newStats[index], [field]: value };
    setFormData({ ...formData, stats: newStats });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await AdminService.saveHomepageCMS(formData);
      addToast('Homepage CMS updated successfully', 'success');
    } catch (error) {
      console.error(error);
      addToast('Failed to update CMS', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleAccordion = (id: string) => {
    setActiveAccordion(activeAccordion === id ? null : id);
  };

  const AccordionItem = ({ id, title, icon: Icon, children }: any) => {
    const isOpen = activeAccordion === id;
    return (
      <div className="border border-slate-200 dark:border-white/10 rounded-xl mb-4 bg-white dark:bg-charcoal-900 overflow-hidden">
        <button 
          onClick={() => toggleAccordion(id)}
          className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 dark:bg-charcoal-800 dark:hover:bg-charcoal-700/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-bold text-slate-900 dark:text-white">{title}</span>
          </div>
          {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
        {isOpen && (
          <div className="p-6 space-y-4 border-t border-slate-200 dark:border-white/10">
            {children}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading CMS Data...</div>;
  }

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layout className="w-6 h-6 text-emerald-600" />
            Homepage Management
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage global content, text, and imagery for the main landing page.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-semibold transition-all shadow-sm cursor-pointer"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="max-w-4xl">
        <AccordionItem id="hero" title="Hero Section" icon={LayoutTemplate}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Badge Text</label>
              <input type="text" value={formData.hero.badgeText} onChange={(e) => handleChange('hero', 'badgeText', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Scroll Indicator Text</label>
              <input type="text" value={formData.hero.scrollIndicatorText} onChange={(e) => handleChange('hero', 'scrollIndicatorText', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Title Line 1</label>
              <input type="text" value={formData.hero.titleLine1} onChange={(e) => handleChange('hero', 'titleLine1', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Title Line 2 (Highlighted)</label>
              <input type="text" value={formData.hero.titleLine2} onChange={(e) => handleChange('hero', 'titleLine2', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black" />
            </div>
             <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Title Line 3</label>
              <input type="text" value={formData.hero.titleLine3} onChange={(e) => handleChange('hero', 'titleLine3', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Subtitle</label>
              <textarea value={formData.hero.subtitle} onChange={(e) => handleChange('hero', 'subtitle', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black h-24" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Primary Button Text</label>
              <input type="text" value={formData.hero.primaryButtonText} onChange={(e) => handleChange('hero', 'primaryButtonText', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Secondary Button Text</label>
              <input type="text" value={formData.hero.secondaryButtonText} onChange={(e) => handleChange('hero', 'secondaryButtonText', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black" />
            </div>
          </div>
        </AccordionItem>

        <AccordionItem id="promotionalRibbon" title="Promotional Ribbon" icon={Megaphone}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 flex items-center gap-2">
              <input type="checkbox" checked={formData.promotionalRibbon?.enabled ?? true} onChange={(e) => handleChange('promotionalRibbon', 'enabled', e.target.checked)} id="ribbon-enabled" />
              <label htmlFor="ribbon-enabled" className="text-xs font-bold text-slate-700 dark:text-slate-300">Enable Promotional Ribbon</label>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Ribbon Text</label>
              <input type="text" value={formData.promotionalRibbon?.text || ''} onChange={(e) => handleChange('promotionalRibbon', 'text', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">CTA Text</label>
              <input type="text" value={formData.promotionalRibbon?.ctaText || ''} onChange={(e) => handleChange('promotionalRibbon', 'ctaText', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">CTA Link</label>
              <input type="text" value={formData.promotionalRibbon?.ctaLink || ''} onChange={(e) => handleChange('promotionalRibbon', 'ctaLink', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black" />
            </div>
          </div>
        </AccordionItem>

        <AccordionItem id="stats" title="Trust Stats" icon={ShieldCheck}>
          <div className="space-y-4">
            {formData.stats.map((stat: any, idx: number) => (
              <div key={idx} className="flex gap-4 items-end border p-4 rounded bg-slate-50 dark:bg-charcoal-800">
                <div className="flex-1">
                  <label className="block text-xs font-bold mb-1">Value</label>
                  <input type="text" value={stat.value} onChange={(e) => handleStatChange(idx, 'value', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold mb-1">Label</label>
                  <input type="text" value={stat.label} onChange={(e) => handleStatChange(idx, 'label', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black" />
                </div>
                 <div className="w-40">
                  <label className="block text-xs font-bold mb-1">Icon Name</label>
                  <select value={stat.iconName} onChange={(e) => handleStatChange(idx, 'iconName', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black">
                    <option value="ShieldCheck">ShieldCheck</option>
                    <option value="Leaf">Leaf</option>
                    <option value="Globe">Globe</option>
                    <option value="Star">Star</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </AccordionItem>

        <AccordionItem id="categoryDiscovery" title="Category Discovery" icon={Leaf}>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1">Badge</label>
              <input type="text" value={formData.categoryDiscovery.badge} onChange={(e) => handleChange('categoryDiscovery', 'badge', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Title</label>
              <input type="text" value={formData.categoryDiscovery.title} onChange={(e) => handleChange('categoryDiscovery', 'title', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Subtitle</label>
              <textarea value={formData.categoryDiscovery.subtitle} onChange={(e) => handleChange('categoryDiscovery', 'subtitle', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black h-20" />
            </div>
          </div>
        </AccordionItem>
        
        <AccordionItem id="productSections" title="Product Sections" icon={LayoutTemplate}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {['bestSellers', 'newArrivals', 'trendingNow', 'homeGardening', 'recommended'].map(prefix => (
               <React.Fragment key={prefix}>
                 <div className="border p-3 rounded bg-slate-50 dark:bg-charcoal-800">
                    <label className="block text-xs font-bold mb-1 capitalize">{prefix.replace(/([A-Z])/g, ' ₹1').trim()} Title</label>
                    <input type="text" value={formData.productSections[`${prefix}Title`]} onChange={(e) => handleChange('productSections', `${prefix}Title`, e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black mb-2" />
                    
                    <label className="block text-xs font-bold mb-1">Tagline</label>
                    <textarea value={formData.productSections[`${prefix}Tagline`]} onChange={(e) => handleChange('productSections', `${prefix}Tagline`, e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black h-16" />
                 </div>
               </React.Fragment>
             ))}
              <div className="border p-3 rounded bg-slate-50 dark:bg-charcoal-800">
                  <label className="block text-xs font-bold mb-1">View All Button Text</label>
                  <input type="text" value={formData.productSections.viewAllButton} onChange={(e) => handleChange('productSections', 'viewAllButton', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black" />
              </div>
          </div>
        </AccordionItem>

        <AccordionItem id="philosophy" title="Brand Philosophy" icon={Globe}>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold mb-1">Badge</label>
              <input type="text" value={formData.philosophy.badge} onChange={(e) => handleChange('philosophy', 'badge', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black" />
            </div>
             <div className="md:col-span-2">
              <label className="block text-xs font-bold mb-1">Title (HTML supported)</label>
              <input type="text" value={formData.philosophy.title} onChange={(e) => handleChange('philosophy', 'title', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold mb-1">Description</label>
              <textarea value={formData.philosophy.description} onChange={(e) => handleChange('philosophy', 'description', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black h-24" />
            </div>
             <div>
              <label className="block text-xs font-bold mb-1">Bullet 1 Title</label>
              <input type="text" value={formData.philosophy.bullet1Title} onChange={(e) => handleChange('philosophy', 'bullet1Title', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Bullet 1 Desc</label>
              <textarea value={formData.philosophy.bullet1Desc} onChange={(e) => handleChange('philosophy', 'bullet1Desc', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black h-16" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Bullet 2 Title</label>
              <input type="text" value={formData.philosophy.bullet2Title} onChange={(e) => handleChange('philosophy', 'bullet2Title', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Bullet 2 Desc</label>
              <textarea value={formData.philosophy.bullet2Desc} onChange={(e) => handleChange('philosophy', 'bullet2Desc', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black h-16" />
            </div>
             <div className="md:col-span-2 border-t pt-4">
              <label className="block text-xs font-bold mb-1">Image URL</label>
              <ImageUploader 
                currentUrl={formData.philosophy.imageUrl} 
                onUploadSuccess={(url) => handleChange('philosophy', 'imageUrl', url)} 
                onRemove={() => handleChange('philosophy', 'imageUrl', '')} 
              />
            </div>
             <div>
              <label className="block text-xs font-bold mb-1">Overlay Badge Title</label>
              <input type="text" value={formData.philosophy.badgeTitle} onChange={(e) => handleChange('philosophy', 'badgeTitle', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black" />
            </div>
             <div>
              <label className="block text-xs font-bold mb-1">Overlay Badge Desc</label>
              <textarea value={formData.philosophy.badgeDesc} onChange={(e) => handleChange('philosophy', 'badgeDesc', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black h-16" />
            </div>
           </div>
        </AccordionItem>

        <AccordionItem id="lifestyle" title="Lifestyle (Modern Homes)" icon={ImageIcon}>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold mb-1">Badge</label>
              <input type="text" value={formData.lifestyle.badge} onChange={(e) => handleChange('lifestyle', 'badge', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black" />
            </div>
             <div className="md:col-span-2">
              <label className="block text-xs font-bold mb-1">Title</label>
              <input type="text" value={formData.lifestyle.title} onChange={(e) => handleChange('lifestyle', 'title', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold mb-1">Description</label>
              <textarea value={formData.lifestyle.description} onChange={(e) => handleChange('lifestyle', 'description', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black h-24" />
            </div>
            
            <div className="col-span-1 md:col-span-2 text-sm font-bold mt-2">Card 1: Home Gardening Hub</div>
            <div>
              <label className="block text-xs font-bold mb-1">Card 1 Badge</label>
              <input type="text" value={formData.lifestyle.card1Badge} onChange={(e) => handleChange('lifestyle', 'card1Badge', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black" />
            </div>
             <div>
              <label className="block text-xs font-bold mb-1">Card 1 Title</label>
              <input type="text" value={formData.lifestyle.card1Title} onChange={(e) => handleChange('lifestyle', 'card1Title', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold mb-1">Card 1 Desc</label>
              <textarea value={formData.lifestyle.card1Desc} onChange={(e) => handleChange('lifestyle', 'card1Desc', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black h-20" />
            </div>
             <div>
              <label className="block text-xs font-bold mb-1">Card 1 Button Text</label>
              <input type="text" value={formData.lifestyle.card1Button} onChange={(e) => handleChange('lifestyle', 'card1Button', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black" />
            </div>
             <div>
              <label className="block text-xs font-bold mb-1">Card 1 Image URL</label>
              <ImageUploader 
                currentUrl={formData.lifestyle.card1Image} 
                onUploadSuccess={(url) => handleChange('lifestyle', 'card1Image', url)} 
                onRemove={() => handleChange('lifestyle', 'card1Image', '')} 
              />
            </div>

             <div className="col-span-1 md:col-span-2 text-sm font-bold mt-2">Card 2: Plastic-Free Promise</div>
            <div>
              <label className="block text-xs font-bold mb-1">Card 2 Badge</label>
              <input type="text" value={formData.lifestyle.card2Badge} onChange={(e) => handleChange('lifestyle', 'card2Badge', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black" />
            </div>
             <div>
              <label className="block text-xs font-bold mb-1">Card 2 Title</label>
              <input type="text" value={formData.lifestyle.card2Title} onChange={(e) => handleChange('lifestyle', 'card2Title', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold mb-1">Card 2 Desc</label>
              <textarea value={formData.lifestyle.card2Desc} onChange={(e) => handleChange('lifestyle', 'card2Desc', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black h-20" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold mb-1">Card 2 Footer Stat</label>
              <input type="text" value={formData.lifestyle.card2Footer} onChange={(e) => handleChange('lifestyle', 'card2Footer', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black" />
            </div>

           </div>
        </AccordionItem>

        <AccordionItem id="testimonialsSection" title="Testimonials (Eco Advocates)" icon={Star}>
          <div className="grid grid-cols-1 gap-4">
             <div>
              <label className="block text-xs font-bold mb-1">Badge</label>
              <input type="text" value={formData.testimonialsSection.badge} onChange={(e) => handleChange('testimonialsSection', 'badge', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black" />
            </div>
             <div>
              <label className="block text-xs font-bold mb-1">Title</label>
              <input type="text" value={formData.testimonialsSection.title} onChange={(e) => handleChange('testimonialsSection', 'title', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Description</label>
              <textarea value={formData.testimonialsSection.description} onChange={(e) => handleChange('testimonialsSection', 'description', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black h-20" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Empty State Text</label>
              <input type="text" value={formData.testimonialsSection.emptyText} onChange={(e) => handleChange('testimonialsSection', 'emptyText', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black" />
            </div>
          </div>
        </AccordionItem>

         <AccordionItem id="faqSection" title="FAQ Section Title" icon={MessageSquare}>
          <div className="grid grid-cols-1 gap-4">
             <div>
              <label className="block text-xs font-bold mb-1">Badge</label>
              <input type="text" value={formData.faqSection.badge} onChange={(e) => handleChange('faqSection', 'badge', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black" />
            </div>
             <div>
              <label className="block text-xs font-bold mb-1">Title</label>
              <input type="text" value={formData.faqSection.title} onChange={(e) => handleChange('faqSection', 'title', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black" />
            </div>
          </div>
        </AccordionItem>

        <AccordionItem id="newsletter" title="Newsletter CTA" icon={MessageSquare}>
          <div className="grid grid-cols-1 gap-4">
             <div>
              <label className="block text-xs font-bold mb-1">Title</label>
              <input type="text" value={formData.newsletter.title} onChange={(e) => handleChange('newsletter', 'title', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Description</label>
              <textarea value={formData.newsletter.description} onChange={(e) => handleChange('newsletter', 'description', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black h-20" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Input Placeholder</label>
              <input type="text" value={formData.newsletter.placeholder} onChange={(e) => handleChange('newsletter', 'placeholder', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Button Text</label>
              <input type="text" value={formData.newsletter.buttonText} onChange={(e) => handleChange('newsletter', 'buttonText', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black" />
            </div>
          </div>
        </AccordionItem>
        
        <AccordionItem id="footer" title="Footer Text" icon={Type}>
          <div className="grid grid-cols-1 gap-4">
             <div>
              <label className="block text-xs font-bold mb-1">Brand Description</label>
              <textarea value={formData.footer.brandDescription} onChange={(e) => handleChange('footer', 'brandDescription', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black h-20" />
            </div>
             <div>
              <label className="block text-xs font-bold mb-1">Social Title</label>
              <input type="text" value={formData.footer.socialTitle} onChange={(e) => handleChange('footer', 'socialTitle', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Social Subtitle</label>
              <input type="text" value={formData.footer.socialSubtitle} onChange={(e) => handleChange('footer', 'socialSubtitle', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Copyright Text</label>
              <input type="text" value={formData.footer.copyrightText} onChange={(e) => handleChange('footer', 'copyrightText', e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-black" />
            </div>
          </div>
        </AccordionItem>

      </div>
    </div>
  );
};
