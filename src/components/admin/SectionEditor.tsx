import React, { useState } from 'react';
import { PageSection, HeroBannerItem, PromoAdItem } from '../../types/cms';
import { 
  Megaphone, Sparkles, LayoutGrid, ShoppingBag, Leaf, 
  HelpCircle, Mail, MessageSquare, FileText, Video, 
  Image as ImageIcon, CheckCircle2, Plus, Trash2, ArrowUp, 
  ArrowDown, Copy, Edit3, Eye, EyeOff, ExternalLink, Calendar,
  Layers, Check
} from 'lucide-react';
import { ImageUploader } from './ImageUploader';

interface SectionEditorProps {
  section: PageSection;
  onChange: (updated: PageSection) => void;
}

export const SectionEditor: React.FC<SectionEditorProps> = ({ section, onChange }) => {
  const [activeBannerId, setActiveBannerId] = useState<string | null>(null);
  const [activeAdId, setActiveAdId] = useState<string | null>(null);

  const updateData = (field: string, value: any) => {
    onChange({
      ...section,
      data: {
        ...section.data,
        [field]: value
      }
    });
  };

  const updateSetting = (field: string, value: any) => {
    onChange({
      ...section,
      settings: {
        ...section.settings,
        [field]: value
      }
    });
  };

  switch (section.type) {
    case 'hero': {
      // Ensure banners array exists; if legacy single hero, migrate it idempotently
      const banners: HeroBannerItem[] = Array.isArray(section.data.banners) && section.data.banners.length > 0
        ? section.data.banners
        : [
            {
              id: 'banner-hero-1',
              title: section.data.titleLine1 || 'BioCart – The Way of Living Earth',
              titleLine1: (section.data.titleLine1 || 'BioCart – The Way of').replace(/<br\s*\/?>/gi, '').trim(),
              titleLine2: section.data.titleLine2 || 'Healthy, Organic',
              titleLine3: section.data.titleLine3 || 'Life',
              subtitle: section.data.subtitle || 'Indulge in premium organic living with certified zero-chemical formulations.',
              badgeText: section.data.badgeText || 'Sindulis Agro Products Presents',
              imageUrl: section.data.imageUrl || 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=1920&q=80',
              mobileImageUrl: section.data.mobileImageUrl || '',
              primaryButtonText: section.data.primaryButtonText || 'Explore Premium Collection',
              primaryButtonUrl: section.data.primaryButtonUrl || '#shop',
              secondaryButtonText: section.data.secondaryButtonText || 'Our Green Commitments',
              secondaryButtonUrl: section.data.secondaryButtonUrl || '#about',
              scrollIndicatorText: section.data.scrollIndicatorText || 'Scroll to discover',
              active: true,
              order: 1
            }
          ];

      const currentBanner = banners.find(b => b.id === (activeBannerId || banners[0]?.id)) || banners[0];

      const handleUpdateBanner = (bannerId: string, updates: Partial<HeroBannerItem>) => {
        const updated = banners.map(b => (b.id === bannerId ? { ...b, ...updates } : b));
        updateData('banners', updated);
      };

      const handleAddBanner = () => {
        const newBanner: HeroBannerItem = {
          id: `banner-${Date.now()}`,
          title: `New Hero Banner ${banners.length + 1}`,
          titleLine1: 'Regenerative Agriculture',
          titleLine2: 'Pure Organic',
          titleLine3: 'Inputs',
          subtitle: 'Certified chemical-free bio-inputs directly from organic producers.',
          badgeText: 'CERTIFIED ORGANIC EXCELLENCE',
          imageUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19657?auto=format&fit=crop&w=1600&q=80',
          primaryButtonText: 'Shop Now',
          primaryButtonUrl: '#shop',
          secondaryButtonText: 'Learn More',
          secondaryButtonUrl: '#about',
          scrollIndicatorText: 'Scroll to explore',
          active: true,
          order: banners.length + 1
        };
        const next = [...banners, newBanner];
        updateData('banners', next);
        setActiveBannerId(newBanner.id);
      };

      const handleDeleteBanner = (bannerId: string) => {
        if (banners.length <= 1) {
          alert('You must have at least one hero banner.');
          return;
        }
        if (!confirm('Are you sure you want to delete this hero banner?')) return;
        const next = banners.filter(b => b.id !== bannerId).map((b, i) => ({ ...b, order: i + 1 }));
        updateData('banners', next);
        if (activeBannerId === bannerId) {
          setActiveBannerId(next[0]?.id || null);
        }
      };

      const handleDuplicateBanner = (banner: HeroBannerItem) => {
        const duplicated: HeroBannerItem = {
          ...banner,
          id: `banner-${Date.now()}`,
          title: `${banner.title} (Copy)`,
          order: banner.order + 1
        };
        const next = [...banners, duplicated].map((b, i) => ({ ...b, order: i + 1 }));
        updateData('banners', next);
        setActiveBannerId(duplicated.id);
      };

      const handleMoveBanner = (index: number, direction: 'up' | 'down') => {
        if ((direction === 'up' && index === 0) || (direction === 'down' && index === banners.length - 1)) return;
        const target = direction === 'up' ? index - 1 : index + 1;
        const next = [...banners];
        const [moved] = next.splice(index, 1);
        next.splice(target, 0, moved);
        const reindexed = next.map((b, i) => ({ ...b, order: i + 1 }));
        updateData('banners', reindexed);
      };

      return (
        <div className="space-y-6">
          {/* Header & Global Rotation Controls */}
          <div className="bg-slate-50 dark:bg-charcoal-800 p-4 rounded-xl border border-slate-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                Hero Banner Carousel Manager ({banners.length} Banners)
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Manage multiple full-bleed hero slides that rotate automatically on the customer storefront.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Autoplay:</label>
                <select
                  value={section.data.autoplayInterval || 5000}
                  onChange={(e) => updateData('autoplayInterval', Number(e.target.value))}
                  className="px-2.5 py-1 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-900"
                >
                  <option value={3000}>3s interval</option>
                  <option value={5000}>5s interval (Default)</option>
                  <option value={7000}>7s interval</option>
                  <option value={10000}>10s interval</option>
                </select>
              </div>
              <button
                type="button"
                onClick={handleAddBanner}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Banner
              </button>
            </div>
          </div>

          {/* Banner Tabs List */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-white/10">
            {banners.map((b, idx) => (
              <div
                key={b.id}
                onClick={() => setActiveBannerId(b.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer border transition-all shrink-0 ${
                  currentBanner?.id === b.id
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-300 shadow-sm'
                    : 'bg-white dark:bg-charcoal-900 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                <div className="w-6 h-4 rounded overflow-hidden bg-slate-200 shrink-0">
                  <img src={b.imageUrl} alt="" className="w-full h-full object-cover" />
                </div>
                <span className="truncate max-w-[120px]">{b.title || `Slide ${idx + 1}`}</span>
                {!b.active && (
                  <span className="w-2 h-2 rounded-full bg-slate-400" title="Inactive" />
                )}
                <div className="flex items-center gap-0.5 ml-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => handleMoveBanner(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1 hover:text-emerald-600 disabled:opacity-30"
                    title="Move Earlier"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveBanner(idx, 'down')}
                    disabled={idx === banners.length - 1}
                    className="p-1 hover:text-emerald-600 disabled:opacity-30"
                    title="Move Later"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Active Banner Form Editor */}
          {currentBanner && (
            <div className="p-5 border border-slate-200 dark:border-white/10 rounded-2xl bg-white dark:bg-charcoal-900 space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Editing Slide #{currentBanner.order}: {currentBanner.title}
                  </span>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentBanner.active}
                      onChange={(e) => handleUpdateBanner(currentBanner.id, { active: e.target.checked })}
                      className="rounded text-emerald-600"
                    />
                    Active on Storefront
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDuplicateBanner(currentBanner)}
                    className="px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-charcoal-800 rounded-lg flex items-center gap-1 border border-slate-200 dark:border-white/10"
                    title="Duplicate Slide"
                  >
                    <Copy className="w-3 h-3" />
                    Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteBanner(currentBanner.id)}
                    className="px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg flex items-center gap-1 border border-rose-200 dark:border-rose-900/30"
                    title="Delete Slide"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              </div>

              {/* Title & Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Internal Slide Label / Name *
                  </label>
                  <input
                    type="text"
                    value={currentBanner.title || ''}
                    onChange={(e) => handleUpdateBanner(currentBanner.id, { title: e.target.value })}
                    placeholder="e.g. Living Soil Harvest Special"
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-800 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Top Badge Text
                  </label>
                  <input
                    type="text"
                    value={currentBanner.badgeText || ''}
                    onChange={(e) => handleUpdateBanner(currentBanner.id, { badgeText: e.target.value })}
                    placeholder="e.g. 100% CERTIFIED ORGANIC"
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-800"
                  />
                </div>
              </div>

              {/* Headlines */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Headline Part 1
                  </label>
                  <input
                    type="text"
                    value={currentBanner.titleLine1 || ''}
                    onChange={(e) => handleUpdateBanner(currentBanner.id, { titleLine1: e.target.value })}
                    placeholder="BioCart – The Way of"
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Headline Accent (Part 2)
                  </label>
                  <input
                    type="text"
                    value={currentBanner.titleLine2 || ''}
                    onChange={(e) => handleUpdateBanner(currentBanner.id, { titleLine2: e.target.value })}
                    placeholder="Healthy, Organic"
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-800 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Headline Part 3
                  </label>
                  <input
                    type="text"
                    value={currentBanner.titleLine3 || ''}
                    onChange={(e) => handleUpdateBanner(currentBanner.id, { titleLine3: e.target.value })}
                    placeholder="Life"
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-800"
                  />
                </div>
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subtitle / Description
                </label>
                <textarea
                  rows={2}
                  value={currentBanner.subtitle || ''}
                  onChange={(e) => handleUpdateBanner(currentBanner.id, { subtitle: e.target.value })}
                  placeholder="Enter slide paragraph description..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-800"
                />
              </div>

              {/* CTAs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 dark:bg-charcoal-800 rounded-xl space-y-2 border border-slate-200 dark:border-white/5">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">Primary CTA</span>
                  <input
                    type="text"
                    value={currentBanner.primaryButtonText || ''}
                    onChange={(e) => handleUpdateBanner(currentBanner.id, { primaryButtonText: e.target.value })}
                    placeholder="Button Text (e.g. Shop Collection)"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white dark:bg-charcoal-900"
                  />
                  <input
                    type="text"
                    value={currentBanner.primaryButtonUrl || '#shop'}
                    onChange={(e) => handleUpdateBanner(currentBanner.id, { primaryButtonUrl: e.target.value })}
                    placeholder="Destination Link (#shop or https://)"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white dark:bg-charcoal-900 font-mono"
                  />
                </div>
                <div className="p-3 bg-slate-50 dark:bg-charcoal-800 rounded-xl space-y-2 border border-slate-200 dark:border-white/5">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">Secondary CTA</span>
                  <input
                    type="text"
                    value={currentBanner.secondaryButtonText || ''}
                    onChange={(e) => handleUpdateBanner(currentBanner.id, { secondaryButtonText: e.target.value })}
                    placeholder="Secondary Button Text"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white dark:bg-charcoal-900"
                  />
                  <input
                    type="text"
                    value={currentBanner.secondaryButtonUrl || '#about'}
                    onChange={(e) => handleUpdateBanner(currentBanner.id, { secondaryButtonUrl: e.target.value })}
                    placeholder="Destination Link (#about)"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white dark:bg-charcoal-900 font-mono"
                  />
                </div>
              </div>

              {/* Images */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ImageUploader
                  currentUrl={currentBanner.imageUrl}
                  onUploadSuccess={(url) => handleUpdateBanner(currentBanner.id, { imageUrl: url })}
                  onRemove={() => handleUpdateBanner(currentBanner.id, { imageUrl: '' })}
                  label="Desktop High-Res Background Image *"
                />
                <ImageUploader
                  currentUrl={currentBanner.mobileImageUrl}
                  onUploadSuccess={(url) => handleUpdateBanner(currentBanner.id, { mobileImageUrl: url })}
                  onRemove={() => handleUpdateBanner(currentBanner.id, { mobileImageUrl: '' })}
                  label="Optional Mobile Optimized Image"
                />
              </div>
            </div>
          )}
        </div>
      );
    }

    case 'promotional_ribbon': {
      // Multi-ad ribbon support with backward compatibility
      const ads: PromoAdItem[] = Array.isArray(section.data.ads) && section.data.ads.length > 0
        ? section.data.ads
        : [
            {
              id: 'ad-1',
              text: section.data.text || '🌱 Spring Bio-Harvest Sale: Get 25% Off Premium Vermicompost & Bio-Fertilizers!',
              campaignLabel: section.data.campaignLabel || 'PROMO OFFER',
              ctaText: section.data.ctaText || 'Shop Bio-Deals',
              ctaLink: section.data.ctaLink || '#shop',
              active: true,
              order: 1
            }
          ];

      const currentAd = ads.find(a => a.id === (activeAdId || ads[0]?.id)) || ads[0];

      const handleUpdateAd = (adId: string, updates: Partial<PromoAdItem>) => {
        const next = ads.map(a => (a.id === adId ? { ...a, ...updates } : a));
        updateData('ads', next);
      };

      const handleAddAd = () => {
        const newAd: PromoAdItem = {
          id: `ad-${Date.now()}`,
          text: '🌿 Free Express Dispatch on certified organic inputs over ₹999 across India!',
          campaignLabel: 'SPECIAL AD',
          ctaText: 'Explore Now',
          ctaLink: '#shop',
          active: true,
          order: ads.length + 1
        };
        const next = [...ads, newAd];
        updateData('ads', next);
        setActiveAdId(newAd.id);
      };

      const handleDeleteAd = (adId: string) => {
        if (ads.length <= 1) {
          alert('You must have at least one promotional message in the ribbon.');
          return;
        }
        if (!confirm('Are you sure you want to delete this promotional message?')) return;
        const next = ads.filter(a => a.id !== adId).map((a, i) => ({ ...a, order: i + 1 }));
        updateData('ads', next);
        if (activeAdId === adId) {
          setActiveAdId(next[0]?.id || null);
        }
      };

      const handleDuplicateAd = (ad: PromoAdItem) => {
        const duplicated: PromoAdItem = {
          ...ad,
          id: `ad-${Date.now()}`,
          text: `${ad.text} (Copy)`,
          order: ad.order + 1
        };
        const next = [...ads, duplicated].map((a, i) => ({ ...a, order: i + 1 }));
        updateData('ads', next);
        setActiveAdId(duplicated.id);
      };

      const handleMoveAd = (index: number, direction: 'up' | 'down') => {
        if ((direction === 'up' && index === 0) || (direction === 'down' && index === ads.length - 1)) return;
        const target = direction === 'up' ? index - 1 : index + 1;
        const next = [...ads];
        const [moved] = next.splice(index, 1);
        next.splice(target, 0, moved);
        const reindexed = next.map((a, i) => ({ ...a, order: i + 1 }));
        updateData('ads', reindexed);
      };

      return (
        <div className="space-y-6">
          {/* Global Ribbon Toggle & Settings */}
          <div className="bg-slate-50 dark:bg-charcoal-800 p-4 rounded-xl border border-slate-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <input
                  type="checkbox"
                  id="ribbon-enable"
                  checked={section.enabled}
                  onChange={(e) => onChange({ ...section, enabled: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <label htmlFor="ribbon-enable" className="text-xs font-bold text-slate-800 dark:text-white cursor-pointer">
                  Display Promotional Marquee Ribbon Directly Below Hero
                </label>
              </div>
              <p className="text-[11px] text-slate-500">
                Multiple advertisements scroll continuously in a horizontal marquee on the Customer Store.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddAd}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Advertisement
            </button>
          </div>

          {/* Ad Messages Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-white/10">
            {ads.map((ad, idx) => (
              <div
                key={ad.id}
                onClick={() => setActiveAdId(ad.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer border transition-all shrink-0 ${
                  currentAd?.id === ad.id
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-300 shadow-sm'
                    : 'bg-white dark:bg-charcoal-900 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                <Megaphone className="w-3.5 h-3.5 text-emerald-600" />
                <span className="truncate max-w-[140px]">{ad.campaignLabel || `Ad ${idx + 1}`}</span>
                {!ad.active && (
                  <span className="w-2 h-2 rounded-full bg-slate-400" title="Disabled" />
                )}
                <div className="flex items-center gap-0.5 ml-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => handleMoveAd(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1 hover:text-emerald-600 disabled:opacity-30"
                    title="Move Left"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveAd(idx, 'down')}
                    disabled={idx === ads.length - 1}
                    className="p-1 hover:text-emerald-600 disabled:opacity-30"
                    title="Move Right"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Active Ad Editor */}
          {currentAd && (
            <div className="p-5 border border-slate-200 dark:border-white/10 rounded-2xl bg-white dark:bg-charcoal-900 space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Editing Ad #{currentAd.order}: {currentAd.campaignLabel || 'Campaign Message'}
                  </span>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentAd.active}
                      onChange={(e) => handleUpdateAd(currentAd.id, { active: e.target.checked })}
                      className="rounded text-emerald-600"
                    />
                    Active in Marquee
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDuplicateAd(currentAd)}
                    className="px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-charcoal-800 rounded-lg flex items-center gap-1 border border-slate-200 dark:border-white/10"
                    title="Duplicate Ad"
                  >
                    <Copy className="w-3 h-3" />
                    Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteAd(currentAd.id)}
                    className="px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg flex items-center gap-1 border border-rose-200 dark:border-rose-900/30"
                    title="Delete Ad"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Campaign Tag / Pill Label
                </label>
                <input
                  type="text"
                  value={currentAd.campaignLabel || ''}
                  onChange={(e) => handleUpdateAd(currentAd.id, { campaignLabel: e.target.value })}
                  placeholder="e.g. FLASH OFFER / BIO-HARVEST / FREE DISPATCH"
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-800 font-bold uppercase tracking-wider"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Promotional Message Text *
                </label>
                <textarea
                  rows={2}
                  value={currentAd.text || ''}
                  onChange={(e) => handleUpdateAd(currentAd.id, { text: e.target.value })}
                  placeholder="e.g. 🌱 Spring Bio-Harvest Sale: Get 25% Off Premium Vermicompost & Bio-Fertilizers!"
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-800 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    CTA Button Label (Optional)
                  </label>
                  <input
                    type="text"
                    value={currentAd.ctaText || ''}
                    onChange={(e) => handleUpdateAd(currentAd.id, { ctaText: e.target.value })}
                    placeholder="e.g. Shop Bio-Deals"
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    CTA Link Destination
                  </label>
                  <input
                    type="text"
                    value={currentAd.ctaLink || '#shop'}
                    onChange={(e) => handleUpdateAd(currentAd.id, { ctaLink: e.target.value })}
                    placeholder="#shop or /#shop"
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-800 font-mono"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    case 'stats':
      return (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">Edit individual trust stat figures and descriptions:</p>
          {(section.data.stats || []).map((stat: any, idx: number) => (
            <div key={idx} className="p-3 border border-slate-200 dark:border-white/10 rounded-xl bg-slate-50 dark:bg-charcoal-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Metric Value</label>
                <input
                  type="text"
                  value={stat.value}
                  onChange={(e) => {
                    const newStats = [...section.data.stats];
                    newStats[idx] = { ...newStats[idx], value: e.target.value };
                    updateData('stats', newStats);
                  }}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-900 font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Label</label>
                <input
                  type="text"
                  value={stat.label}
                  onChange={(e) => {
                    const newStats = [...section.data.stats];
                    newStats[idx] = { ...newStats[idx], label: e.target.value };
                    updateData('stats', newStats);
                  }}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-900"
                />
              </div>
            </div>
          ))}
        </div>
      );

    case 'product_carousel':
    case 'product_grid':
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Section Title</label>
              <input
                type="text"
                value={section.data.title || ''}
                onChange={(e) => updateData('title', e.target.value)}
                placeholder="e.g. Best Sellers"
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Subheading / Tagline</label>
              <input
                type="text"
                value={section.data.tagline || ''}
                onChange={(e) => updateData('tagline', e.target.value)}
                placeholder="Double-screened vermicompost..."
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Filter Type</label>
              <select
                value={section.data.filterType || 'best_sellers'}
                onChange={(e) => updateData('filterType', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-800"
              >
                <option value="best_sellers">Best Sellers</option>
                <option value="new_arrivals">New Harvest Arrivals</option>
                <option value="trending">Trending Now</option>
                <option value="all">All Products</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Category Filter Link</label>
              <input
                type="text"
                value={section.data.categoryFilter || 'All'}
                onChange={(e) => updateData('categoryFilter', e.target.value)}
                placeholder="All / Seeds / Potting Mix"
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-800"
              />
            </div>
          </div>
        </div>
      );

    case 'brand_philosophy':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Eyebrow</label>
            <input
              type="text"
              value={section.data.eyebrow || ''}
              onChange={(e) => updateData('eyebrow', e.target.value)}
              placeholder="Our Ecological Vision"
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Main Heading</label>
            <input
              type="text"
              value={section.data.title || ''}
              onChange={(e) => updateData('title', e.target.value)}
              placeholder="Nurturing Living Soil, Not Just Plants"
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Description Paragraph</label>
            <textarea
              rows={3}
              value={section.data.description || ''}
              onChange={(e) => updateData('description', e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-800"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 border rounded-xl bg-slate-50 dark:bg-charcoal-800 space-y-2">
              <label className="block text-xs font-bold text-slate-800 dark:text-white">Bullet Point 1</label>
              <input
                type="text"
                value={section.data.bullet1Title || ''}
                onChange={(e) => updateData('bullet1Title', e.target.value)}
                placeholder="Bullet 1 Title"
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded bg-white dark:bg-charcoal-900"
              />
              <textarea
                rows={2}
                value={section.data.bullet1Desc || ''}
                onChange={(e) => updateData('bullet1Desc', e.target.value)}
                placeholder="Bullet 1 Description"
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded bg-white dark:bg-charcoal-900"
              />
            </div>
            <div className="p-3 border rounded-xl bg-slate-50 dark:bg-charcoal-800 space-y-2">
              <label className="block text-xs font-bold text-slate-800 dark:text-white">Bullet Point 2</label>
              <input
                type="text"
                value={section.data.bullet2Title || ''}
                onChange={(e) => updateData('bullet2Title', e.target.value)}
                placeholder="Bullet 2 Title"
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded bg-white dark:bg-charcoal-900"
              />
              <textarea
                rows={2}
                value={section.data.bullet2Desc || ''}
                onChange={(e) => updateData('bullet2Desc', e.target.value)}
                placeholder="Bullet 2 Description"
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded bg-white dark:bg-charcoal-900"
              />
            </div>
          </div>

          <ImageUploader
            currentUrl={section.data.imageUrl}
            onUploadSuccess={(url) => updateData('imageUrl', url)}
            onRemove={() => updateData('imageUrl', '')}
            label="Philosophy Side Imagery"
          />
        </div>
      );

    case 'lifestyle_bento':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Section Title</label>
            <input
              type="text"
              value={section.data.title || ''}
              onChange={(e) => updateData('title', e.target.value)}
              placeholder="Designed for Modern Homes"
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Subtitle</label>
            <input
              type="text"
              value={section.data.description || ''}
              onChange={(e) => updateData('description', e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-800"
            />
          </div>

          <div className="p-4 border rounded-xl bg-slate-50 dark:bg-charcoal-800 space-y-3">
            <h5 className="text-xs font-bold text-slate-800 dark:text-white">Card 1 (Home Gardening Hub)</h5>
            <input
              type="text"
              value={section.data.card1Title || ''}
              onChange={(e) => updateData('card1Title', e.target.value)}
              placeholder="Card 1 Title"
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded bg-white dark:bg-charcoal-900"
            />
            <textarea
              rows={2}
              value={section.data.card1Desc || ''}
              onChange={(e) => updateData('card1Desc', e.target.value)}
              placeholder="Card 1 Description"
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded bg-white dark:bg-charcoal-900"
            />
            <ImageUploader
              currentUrl={section.data.card1Image}
              onUploadSuccess={(url) => updateData('card1Image', url)}
              onRemove={() => updateData('card1Image', '')}
              label="Card 1 Feature Image"
            />
          </div>
        </div>
      );

    case 'rich_text':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Section Heading</label>
            <input
              type="text"
              value={section.data.title || ''}
              onChange={(e) => updateData('title', e.target.value)}
              placeholder="Heading"
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-800"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Rich Content (HTML/Markdown)</label>
            <textarea
              rows={6}
              value={section.data.content || ''}
              onChange={(e) => updateData('content', e.target.value)}
              placeholder="Enter rich paragraph content, policy text, or articles..."
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-800 font-mono"
            />
          </div>
          <ImageUploader
            currentUrl={section.data.image}
            onUploadSuccess={(url) => updateData('image', url)}
            onRemove={() => updateData('image', '')}
            label="Optional Section Graphic"
          />
        </div>
      );

    case 'faq':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">FAQ Section Title</label>
            <input
              type="text"
              value={section.data.title || ''}
              onChange={(e) => updateData('title', e.target.value)}
              placeholder="Frequently Asked Questions"
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-800"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Maximum Questions to Display</label>
            <input
              type="number"
              value={section.data.limit || 6}
              onChange={(e) => updateData('limit', Number(e.target.value))}
              className="w-32 px-3 py-2 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-800"
            />
          </div>
        </div>
      );

    case 'newsletter':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Newsletter Title</label>
            <input
              type="text"
              value={section.data.title || ''}
              onChange={(e) => updateData('title', e.target.value)}
              placeholder="Join the BioCart Circular"
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-800"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <textarea
              rows={2}
              value={section.data.description || ''}
              onChange={(e) => updateData('description', e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-800"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Input Placeholder</label>
              <input
                type="text"
                value={section.data.placeholder || ''}
                onChange={(e) => updateData('placeholder', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Submit Button Text</label>
              <input
                type="text"
                value={section.data.buttonText || ''}
                onChange={(e) => updateData('buttonText', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-800"
              />
            </div>
          </div>
        </div>
      );

    case 'cta_banner':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Badge / Eyebrow Text</label>
            <input
              type="text"
              value={section.data.badgeText || section.data.eyebrow || ''}
              onChange={(e) => updateData('badgeText', e.target.value)}
              placeholder="e.g. JOIN THE SOIL REVOLUTION"
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-800"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Banner Title *</label>
            <input
              type="text"
              value={section.data.title || ''}
              onChange={(e) => updateData('title', e.target.value)}
              placeholder="e.g. Become an Authorized BioCart District Dealer"
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-800 font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Subtitle / Description</label>
            <textarea
              rows={3}
              value={section.data.subtitle || section.data.description || ''}
              onChange={(e) => updateData('subtitle', e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-800"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Action Button Text</label>
              <input
                type="text"
                value={section.data.buttonText || ''}
                onChange={(e) => updateData('buttonText', e.target.value)}
                placeholder="e.g. Contact Us / Apply Now"
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Action Button URL / Hash</label>
              <input
                type="text"
                value={section.data.buttonUrl || ''}
                onChange={(e) => updateData('buttonUrl', e.target.value)}
                placeholder="e.g. #contact or #shop"
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-800"
              />
            </div>
          </div>
        </div>
      );

    case 'contact_form':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Form Heading</label>
            <input
              type="text"
              value={section.data.title || ''}
              onChange={(e) => updateData('title', e.target.value)}
              placeholder="e.g. Send Us an Inquiry / Book Consultation"
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-800 font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Subtitle / Instructions</label>
            <textarea
              rows={2}
              value={section.data.subtitle || section.data.description || ''}
              onChange={(e) => updateData('subtitle', e.target.value)}
              placeholder="Brief instructions displayed above the form..."
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-800"
            />
          </div>
        </div>
      );

    case 'features_list': {
      const features = Array.isArray(section.data.features) ? section.data.features : [];
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Section Title</label>
            <input
              type="text"
              value={section.data.title || ''}
              onChange={(e) => updateData('title', e.target.value)}
              placeholder="e.g. Why Choose BioCart?"
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-800 font-bold"
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Feature Items ({features.length})</label>
              <button
                type="button"
                onClick={() => updateData('features', [...features, { title: 'New Feature', desc: 'Description of the feature...' }])}
                className="px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg flex items-center gap-1 hover:bg-emerald-100"
              >
                <Plus className="w-3.5 h-3.5" /> Add Feature
              </button>
            </div>
            {features.map((feat: any, idx: number) => (
              <div key={idx} className="p-3 border border-slate-200 dark:border-white/10 rounded-xl bg-slate-50 dark:bg-charcoal-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Item #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => updateData('features', features.filter((_: any, i: number) => i !== idx))}
                    className="p-1 text-rose-500 hover:text-rose-700 text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  type="text"
                  value={feat.title || ''}
                  onChange={(e) => {
                    const next = [...features];
                    next[idx] = { ...next[idx], title: e.target.value };
                    updateData('features', next);
                  }}
                  placeholder="Feature Title"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded bg-white dark:bg-charcoal-900"
                />
                <textarea
                  rows={2}
                  value={feat.desc || ''}
                  onChange={(e) => {
                    const next = [...features];
                    next[idx] = { ...next[idx], desc: e.target.value };
                    updateData('features', next);
                  }}
                  placeholder="Feature Description"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded bg-white dark:bg-charcoal-900"
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'team_members': {
      const members = Array.isArray(section.data.members) ? section.data.members : [];
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Section Title</label>
            <input
              type="text"
              value={section.data.title || ''}
              onChange={(e) => updateData('title', e.target.value)}
              placeholder="e.g. Leadership & Founders"
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-800 font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Subtitle</label>
            <textarea
              rows={2}
              value={section.data.subtitle || section.data.description || ''}
              onChange={(e) => updateData('subtitle', e.target.value)}
              placeholder="Section Subtitle"
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-800"
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Team Members ({members.length})</label>
              <button
                type="button"
                onClick={() => updateData('members', [...members, { name: 'New Member', role: 'Role Title', bio: 'Bio...', image: '' }])}
                className="px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg flex items-center gap-1 hover:bg-emerald-100"
              >
                <Plus className="w-3.5 h-3.5" /> Add Member
              </button>
            </div>
            {members.map((m: any, idx: number) => (
              <div key={idx} className="p-3 border border-slate-200 dark:border-white/10 rounded-xl bg-slate-50 dark:bg-charcoal-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Member #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => updateData('members', members.filter((_: any, i: number) => i !== idx))}
                    className="p-1 text-rose-500 hover:text-rose-700 text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={m.name || ''}
                    onChange={(e) => {
                      const next = [...members];
                      next[idx] = { ...next[idx], name: e.target.value };
                      updateData('members', next);
                    }}
                    placeholder="Full Name"
                    className="px-3 py-1.5 text-xs border border-slate-300 rounded bg-white dark:bg-charcoal-900"
                  />
                  <input
                    type="text"
                    value={m.role || ''}
                    onChange={(e) => {
                      const next = [...members];
                      next[idx] = { ...next[idx], role: e.target.value };
                      updateData('members', next);
                    }}
                    placeholder="Role / Title"
                    className="px-3 py-1.5 text-xs border border-slate-300 rounded bg-white dark:bg-charcoal-900"
                  />
                </div>
                <textarea
                  rows={2}
                  value={m.bio || ''}
                  onChange={(e) => {
                    const next = [...members];
                    next[idx] = { ...next[idx], bio: e.target.value };
                    updateData('members', next);
                  }}
                  placeholder="Biography or responsibilities..."
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded bg-white dark:bg-charcoal-900"
                />
                <ImageUploader
                  currentUrl={m.image}
                  onUploadSuccess={(url) => {
                    const next = [...members];
                    next[idx] = { ...next[idx], image: url };
                    updateData('members', next);
                  }}
                  onRemove={() => {
                    const next = [...members];
                    next[idx] = { ...next[idx], image: '' };
                    updateData('members', next);
                  }}
                  label="Portrait Image"
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'timeline_milestones': {
      const milestones = Array.isArray(section.data.milestones) ? section.data.milestones : [];
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Section Title</label>
            <input
              type="text"
              value={section.data.title || ''}
              onChange={(e) => updateData('title', e.target.value)}
              placeholder="e.g. Our Growth Journey"
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-800 font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Subtitle</label>
            <textarea
              rows={2}
              value={section.data.subtitle || section.data.description || ''}
              onChange={(e) => updateData('subtitle', e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-800"
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Milestones ({milestones.length})</label>
              <button
                type="button"
                onClick={() => updateData('milestones', [...milestones, { year: '2025', title: 'New Milestone', desc: 'Milestone description...' }])}
                className="px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg flex items-center gap-1 hover:bg-emerald-100"
              >
                <Plus className="w-3.5 h-3.5" /> Add Milestone
              </button>
            </div>
            {milestones.map((m: any, idx: number) => (
              <div key={idx} className="p-3 border border-slate-200 dark:border-white/10 rounded-xl bg-slate-50 dark:bg-charcoal-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Milestone #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => updateData('milestones', milestones.filter((_: any, i: number) => i !== idx))}
                    className="p-1 text-rose-500 hover:text-rose-700 text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    value={m.year || ''}
                    onChange={(e) => {
                      const next = [...milestones];
                      next[idx] = { ...next[idx], year: e.target.value };
                      updateData('milestones', next);
                    }}
                    placeholder="Year (e.g. 2024)"
                    className="px-3 py-1.5 text-xs border border-slate-300 rounded bg-white dark:bg-charcoal-900 font-bold"
                  />
                  <input
                    type="text"
                    value={m.title || ''}
                    onChange={(e) => {
                      const next = [...milestones];
                      next[idx] = { ...next[idx], title: e.target.value };
                      updateData('milestones', next);
                    }}
                    placeholder="Milestone Title"
                    className="sm:col-span-3 px-3 py-1.5 text-xs border border-slate-300 rounded bg-white dark:bg-charcoal-900"
                  />
                </div>
                <textarea
                  rows={2}
                  value={m.desc || ''}
                  onChange={(e) => {
                    const next = [...milestones];
                    next[idx] = { ...next[idx], desc: e.target.value };
                    updateData('milestones', next);
                  }}
                  placeholder="Details of the milestone..."
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded bg-white dark:bg-charcoal-900"
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'partner_inquiry': {
      const pillars = Array.isArray(section.data.pillars) ? section.data.pillars : [];
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Eyebrow / Badge Text</label>
            <input
              type="text"
              value={section.data.eyebrow || ''}
              onChange={(e) => updateData('eyebrow', e.target.value)}
              placeholder="e.g. Institutional Alliance Models"
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-800"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Section Heading *</label>
            <input
              type="text"
              value={section.data.heading || section.data.title || ''}
              onChange={(e) => updateData('heading', e.target.value)}
              placeholder="e.g. Building India's Organic Soil Backbone"
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-800 font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Overview Description</label>
            <textarea
              rows={3}
              value={section.data.description || ''}
              onChange={(e) => updateData('description', e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-800"
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Partnership Pillars ({pillars.length})</label>
              <button
                type="button"
                onClick={() => updateData('pillars', [...pillars, { title: 'Pillar Title', desc: 'Pillar description...' }])}
                className="px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg flex items-center gap-1 hover:bg-emerald-100"
              >
                <Plus className="w-3.5 h-3.5" /> Add Pillar
              </button>
            </div>
            {pillars.map((p: any, idx: number) => (
              <div key={idx} className="p-3 border border-slate-200 dark:border-white/10 rounded-xl bg-slate-50 dark:bg-charcoal-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Pillar #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => updateData('pillars', pillars.filter((_: any, i: number) => i !== idx))}
                    className="p-1 text-rose-500 hover:text-rose-700 text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  type="text"
                  value={p.title || ''}
                  onChange={(e) => {
                    const next = [...pillars];
                    next[idx] = { ...next[idx], title: e.target.value };
                    updateData('pillars', next);
                  }}
                  placeholder="Pillar Title"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded bg-white dark:bg-charcoal-900 font-bold"
                />
                <textarea
                  rows={2}
                  value={p.desc || ''}
                  onChange={(e) => {
                    const next = [...pillars];
                    next[idx] = { ...next[idx], desc: e.target.value };
                    updateData('pillars', next);
                  }}
                  placeholder="Pillar Description"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded bg-white dark:bg-charcoal-900"
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    default:
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Section Title</label>
            <input
              type="text"
              value={section.data.title || ''}
              onChange={(e) => updateData('title', e.target.value)}
              placeholder="Section Title"
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-800"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Description / Content</label>
            <textarea
              rows={4}
              value={section.data.content || section.data.description || ''}
              onChange={(e) => updateData('content', e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-800"
            />
          </div>
          <ImageUploader
            currentUrl={section.data.image}
            onUploadSuccess={(url) => updateData('image', url)}
            onRemove={() => updateData('image', '')}
            label="Section Image"
          />
        </div>
      );
  }
};
