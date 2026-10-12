import React, { useState, useEffect } from 'react';
import { AdminService } from '../../services/AdminService';
import { AdminBanners } from './AdminBanners';
import { StoreSettings, PromotionalRibbonConfig } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../context/AppContext';
import { 
  Home as HomeIcon, 
  Megaphone, 
  Eye, 
  EyeOff, 
  Save, 
  Sparkles,
  ExternalLink
} from 'lucide-react';

export const AdminHomepage: React.FC = () => {
  const { userProfile } = useAuth();
  const { addToast } = useApp();

  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [ribbonConfig, setRibbonConfig] = useState<PromotionalRibbonConfig>({
    enabled: true,
    text: '',
    ctaText: '',
    ctaLink: '#shop'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return AdminService.subscribeToSettings((data) => {
      setSettings(data);
      if (data.promotionalRibbon) {
        setRibbonConfig(data.promotionalRibbon);
      }
    });
  }, []);

  const actor = {
    id: userProfile?.uid || 'admin',
    email: userProfile?.email || 'admin@biocart.com'
  };

  const handleSaveRibbon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      setSaving(true);
      await AdminService.updateStoreSettings({
        ...settings,
        promotionalRibbon: ribbonConfig
      }, actor);
      addToast('Promotional Ribbon settings updated live!', 'success');
    } catch (err) {
      addToast('Failed to save promotional ribbon', 'warning');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <HomeIcon className="w-5 h-5 text-emerald-400" />
          Homepage Content & Promotional Ribbon
        </h1>
        <p className="text-xs text-[#777777]">Control promotional banners, sticky top ribbons, and section visibility dynamically.</p>
      </div>

      {/* Promotional Top Ribbon Manager */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
            <Megaphone className="w-4 h-4" />
            Promotional Top Banner Ribbon
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#777777]">Status:</span>
            <button
              onClick={() => setRibbonConfig({ ...ribbonConfig, enabled: !ribbonConfig.enabled })}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all ${
                ribbonConfig.enabled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800 text-[#777777]'
              }`}
            >
              {ribbonConfig.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              {ribbonConfig.enabled ? 'Ribbon Enabled' : 'Ribbon Hidden'}
            </button>
          </div>
        </div>

        {/* Live Ribbon Preview */}
        <div className="p-3 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-slate-900 rounded-xl flex items-center justify-between text-xs shadow-md">
          <div className="flex items-center gap-2 truncate">
            <span className="font-bold px-1.5 py-0.5 bg-black/20 rounded text-[10px] uppercase">LIVE PREVIEW</span>
            <span className="truncate">{ribbonConfig.text || 'Enter announcement text below...'}</span>
          </div>
          {ribbonConfig.ctaText && (
            <span className="px-3 py-1 bg-white text-emerald-900 rounded-full font-bold text-[11px] flex-shrink-0 flex items-center gap-1">
              {ribbonConfig.ctaText} <ExternalLink className="w-3 h-3" />
            </span>
          )}
        </div>

        <form onSubmit={handleSaveRibbon} className="space-y-4 text-xs">
          <div>
            <label className="block text-[#777777] mb-1 font-medium">Ribbon Announcement Text *</label>
            <input
              type="text"
              required
              value={ribbonConfig.text}
              onChange={(e) => setRibbonConfig({ ...ribbonConfig, text: e.target.value })}
              placeholder="e.g. 🌱 Spring Bio-Harvest Sale: Get 25% Off Premium Vermicompost!"
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[#777777] mb-1 font-medium">CTA Button Label</label>
              <input
                type="text"
                value={ribbonConfig.ctaText}
                onChange={(e) => setRibbonConfig({ ...ribbonConfig, ctaText: e.target.value })}
                placeholder="Shop Bio-Deals"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
              />
            </div>

            <div>
              <label className="block text-[#777777] mb-1 font-medium">CTA Destination Link / Hash</label>
              <input
                type="text"
                value={ribbonConfig.ctaLink}
                onChange={(e) => setRibbonConfig({ ...ribbonConfig, ctaLink: e.target.value })}
                placeholder="#shop"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-900 rounded-xl font-semibold shadow-lg shadow-emerald-950/40 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Ribbon Live'}
            </button>
          </div>
        </form>
      </div>

      {/* Dynamic Homepage Sections Control */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <h3 className="font-semibold text-sm text-slate-900 border-b border-slate-200 pb-3">Homepage Dynamic Sections Overview</h3>

        <div className="space-y-3 text-xs">
          {[
            { title: 'Hero Carousel & Banners', desc: 'Controlled dynamically via Banners section', active: true },
            { title: 'Featured Organic Categories', desc: 'Driven by active categories with Featured flag', active: true },
            { title: 'Featured Bio-Products Grid', desc: 'Driven by products with Featured flag', active: true },
            { title: 'Best Sellers Showcase', desc: 'Driven by products with BestSeller flag', active: true },
            { title: 'Customer Testimonials & Reviews', desc: 'Driven by approved customer reviews', active: true },
            { title: 'Dealer & Distributor Callout', desc: 'Static layout with real enquiry forms', active: true }
          ].map((sec, i) => (
            <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-700">{sec.title}</p>
                <p className="text-[11px] text-[#777777]">{sec.desc}</p>
              </div>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 font-mono text-[10px] rounded font-bold">
                LIVE
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
