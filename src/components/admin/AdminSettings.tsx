import React, { useState, useEffect } from 'react';
import { MarketplaceRulesPanel } from './MarketplaceRulesPanel';
import { AdminService, DEFAULT_STORE_SETTINGS } from '../../services/AdminService';
import { StoreSettings } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../context/AppContext';
import { Settings as SettingsIcon, Save, Truck, Percent, Shield, Sparkles, UserCheck, CheckCircle2 } from 'lucide-react';
import { BioCartLoading } from '../ui/BioCartLoading';
import { AdminProfileSecurity } from './AdminProfileSecurity';
import { AdminApiConfiguration } from './AdminApiConfiguration';
import { Key } from 'lucide-react';

export const AdminSettings: React.FC = () => {
  const { userProfile } = useAuth();
  const { addToast } = useApp();

  const [activeTab, setActiveTab] = useState<'store' | 'financial' | 'security' | 'api'>('store');
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return AdminService.subscribeToSettings((data) => setSettings(data));
  }, []);

  const [lastSaved, setLastSaved] = useState<string | null>(null);

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
      const timeStr = new Date().toLocaleTimeString();
      setLastSaved(timeStr);
      addToast('Central Store Settings updated live!', 'success');
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to save settings. Please verify admin privileges.';
      addToast(errMsg, 'warning');
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return <BioCartLoading message="Loading Central Store Settings..." subMessage="Fetching configuration from Firestore" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-emerald-600" />
            Central Settings & Administrator Controls
          </h1>
          <p className="text-xs text-slate-500">Configure global marketplace parameters or manage administrator profile and authentication credentials.</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('store')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'store'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <SettingsIcon className="w-3.5 h-3.5" />
            Store Configuration
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('financial' as any)}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              (activeTab as any) === 'financial'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            Financial & Settlement Policy
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('api')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'api'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            Logistics & API Integration
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'security'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Admin Profile & Security
          </button>
        </div>
      </div>

      {activeTab === 'security' ? (
        <AdminProfileSecurity />
      ) : activeTab === 'api' ? (
        <AdminApiConfiguration />
      ) : activeTab === 'financial' ? (
        <div className="space-y-4">
          <MarketplaceRulesPanel />
          <div className="bg-white border border-slate-200 rounded-2xl p-5 text-xs text-slate-600 space-y-1.5" id="money-rules-notes">
            <p><b>Commission</b> is set per vendor in <b>Vendors Marketplace → Commission</b> (e.g. 20% → ₹1,000 sale = ₹800 vendor + ₹200 BioCart).</p>
            <p><b>Payment gateway fee</b> is the actual Cashfree fee, taken from Cashfree's daily report and paid from BioCart's share.</p>
            <p><b>Vendor settlement</b> runs every Tuesday 6 PM for orders delivered in the previous Tue–Mon week; you pay and enter the UTR in <b>Payouts & Settlements</b>.</p>
          </div>
        </div>
      ) : (

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

        <MarketplaceRulesPanel />

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

        <div className="flex items-center justify-between pt-2">
          <div>
            {lastSaved && (
              <span className="text-xs text-emerald-700 font-medium flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Live in Production — Last updated at {lastSaved}
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md flex items-center gap-2 text-xs transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4 text-white" />
            {saving ? 'Saving...' : 'Save Settings Live'}
          </button>
        </div>
      </form>
      )}
    </div>
  );
};
