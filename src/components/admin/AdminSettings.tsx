import React, { useState, useEffect } from 'react';
import { AdminService } from '../../services/AdminService';
import { StoreSettings } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../context/AppContext';
import { Settings as SettingsIcon, Save, Truck, Percent, Shield, Sparkles } from 'lucide-react';

export const AdminSettings: React.FC = () => {
  const { userProfile } = useAuth();
  const { addToast } = useApp();

  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return AdminService.subscribeToSettings((data) => setSettings(data));
  }, []);

  const actor = {
    id: userProfile?.uid || 'admin',
    email: userProfile?.email || 'admin@biocart.com'
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      setSaving(true);
      await AdminService.updateStoreSettings(settings, actor);
      addToast('Central Store Settings updated live!', 'success');
    } catch (err) {
      addToast('Failed to save settings', 'warning');
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
        <h3 className="text-xl font-bold mb-2">Loading Settings...</h3>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-emerald-400" />
          Central Store Settings & Configuration
        </h1>
        <p className="text-xs text-[#777777]">Configure global parameters controlling checkout shipping thresholds, platform commissions & contact info.</p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold text-sm text-slate-900 border-b border-slate-200 pb-3">General Store Information</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[#777777] mb-1">Store Name *</label>
              <input
                type="text"
                required
                value={settings.storeName}
                onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold"
              />
            </div>

            <div>
              <label className="block text-[#777777] mb-1">Currency Symbol</label>
              <input
                type="text"
                value={settings.currency}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="block text-[#777777] mb-1">Contact Email *</label>
              <input
                type="email"
                required
                value={settings.contactEmail}
                onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
              />
            </div>

            <div>
              <label className="block text-[#777777] mb-1">Contact Phone</label>
              <input
                type="text"
                value={settings.contactPhone}
                onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[#777777] mb-1">Physical Address</label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Marketplace Commercial Parameters */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold text-sm text-slate-900 border-b border-slate-200 pb-3">Marketplace Financial & Shipping Rules</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[#777777] mb-1 flex items-center gap-1.5 font-medium">
                <Truck className="w-3.5 h-3.5 text-emerald-400" /> Free Shipping Order Threshold (₹)
              </label>
              <input
                type="number"
                value={settings.freeShippingThreshold}
                onChange={(e) => setSettings({ ...settings, freeShippingThreshold: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-emerald-400 font-bold text-sm"
              />
            </div>

            <div>
              <label className="block text-[#777777] mb-1 flex items-center gap-1.5 font-medium">
                <Percent className="w-3.5 h-3.5 text-amber-400" /> Default Platform Commission (%)
              </label>
              <input
                type="number"
                value={settings.defaultCommission}
                onChange={(e) => setSettings({ ...settings, defaultCommission: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-amber-400 font-bold text-sm"
              />
            </div>
          </div>
        </div>

        {/* Social Media Links */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold text-sm text-slate-900 border-b border-slate-200 pb-3">Social Media URLs (Footer Sync)</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[#777777] mb-1">Instagram URL</label>
              <input
                type="text"
                value={settings.socialLinks?.instagram || ''}
                onChange={(e) => setSettings({ 
                  ...settings, 
                  socialLinks: { ...settings.socialLinks, instagram: e.target.value } 
                })}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-[11px]"
              />
            </div>

            <div>
              <label className="block text-[#777777] mb-1">Facebook URL</label>
              <input
                type="text"
                value={settings.socialLinks?.facebook || ''}
                onChange={(e) => setSettings({ 
                  ...settings, 
                  socialLinks: { ...settings.socialLinks, facebook: e.target.value } 
                })}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-[11px]"
              />
            </div>

            <div>
              <label className="block text-[#777777] mb-1">YouTube URL</label>
              <input
                type="text"
                value={settings.socialLinks?.youtube || ''}
                onChange={(e) => setSettings({ 
                  ...settings, 
                  socialLinks: { ...settings.socialLinks, youtube: e.target.value } 
                })}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-[11px]"
              />
            </div>

            <div>
              <label className="block text-[#777777] mb-1">LinkedIn URL</label>
              <input
                type="text"
                value={settings.socialLinks?.linkedin || ''}
                onChange={(e) => setSettings({ 
                  ...settings, 
                  socialLinks: { ...settings.socialLinks, linkedin: e.target.value } 
                })}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-[11px]"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-slate-900 rounded-xl font-semibold shadow-lg shadow-emerald-950/40 flex items-center gap-2 text-xs"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Settings Live'}
          </button>
        </div>
      </form>
    </div>
  );
};
