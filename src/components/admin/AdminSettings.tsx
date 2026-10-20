import React, { useState, useEffect } from 'react';
import { AdminService, DEFAULT_STORE_SETTINGS } from '../../services/AdminService';
import { StoreSettings } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../context/AppContext';
import { Settings as SettingsIcon, Save, Truck, Percent, Shield, Sparkles, UserCheck, CheckCircle2 } from 'lucide-react';
import { BioCartLoading } from '../ui/BioCartLoading';
import { AdminProfileSecurity } from './AdminProfileSecurity';

export const AdminSettings: React.FC = () => {
  const { userProfile } = useAuth();
  const { addToast } = useApp();

  const [activeTab, setActiveTab] = useState<'store' | 'security'>('store');
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
      ) : activeTab === ('financial' as any) ? (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
            <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Percent className="w-4 h-4 text-emerald-600" />
                  Marketplace Commission & Gateway Fee Architecture
                </h3>
                <p className="text-xs text-slate-500">Configures single authoritative ledger calculations for platform earnings and vendor split payouts.</p>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-semibold">
                Basis: Integer Paise Math
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Commission Calculation Basis</label>
                <select
                  value={settings.financialPolicy?.commissionBasis || 'net_after_gateway_fee'}
                  onChange={(e) => setSettings({
                    ...settings,
                    financialPolicy: {
                      ...(settings.financialPolicy || DEFAULT_STORE_SETTINGS.financialPolicy!),
                      commissionBasis: e.target.value as any
                    }
                  })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium"
                >
                  <option value="net_after_gateway_fee">Net After Gateway Fee (Gross - Gateway Fee)</option>
                  <option value="gross_order_value">Gross Order Value (Full Product Line Total)</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">Controls whether platform commission is deducted before or after payment gateway costs.</p>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Coupon Funding Responsibility</label>
                <select
                  value={settings.financialPolicy?.couponFunding || 'platform'}
                  onChange={(e) => setSettings({
                    ...settings,
                    financialPolicy: {
                      ...(settings.financialPolicy || DEFAULT_STORE_SETTINGS.financialPolicy!),
                      couponFunding: e.target.value as any
                    }
                  })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium"
                >
                  <option value="platform">100% Platform Funded (Absorbed by BioCart)</option>
                  <option value="vendor">100% Vendor Funded (Deducted from Vendor Share)</option>
                  <option value="shared">50% / 50% Shared Absorption</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">Defines who absorbs the cost when customers apply discount promo codes.</p>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Default Platform Commission Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={settings.defaultCommission}
                  onChange={(e) => setSettings({ ...settings, defaultCommission: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold"
                />
                <p className="text-[10px] text-slate-500 mt-1">Applied to standard vendors unless overridden by vendor-specific contract rate.</p>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Gateway Processing Fee Rate (BPS)</label>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={settings.financialPolicy?.gatewayFeeRateBps ?? 200}
                  onChange={(e) => setSettings({
                    ...settings,
                    financialPolicy: {
                      ...(settings.financialPolicy || DEFAULT_STORE_SETTINGS.financialPolicy!),
                      gatewayFeeRateBps: Number(e.target.value)
                    }
                  })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono font-bold"
                />
                <p className="text-[10px] text-slate-500 mt-1">200 Basis Points = 2.00% (Standard Razorpay / Domestic Card gateway rate).</p>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">GST on Platform Commission (BPS)</label>
                <input
                  type="number"
                  min="0"
                  max="3000"
                  value={settings.financialPolicy?.commissionGstRateBps ?? 1800}
                  onChange={(e) => setSettings({
                    ...settings,
                    financialPolicy: {
                      ...(settings.financialPolicy || DEFAULT_STORE_SETTINGS.financialPolicy!),
                      commissionGstRateBps: Number(e.target.value)
                    }
                  })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono font-bold"
                />
                <p className="text-[10px] text-slate-500 mt-1">1800 Basis Points = 18.00% Statutory GST collected on platform fees.</p>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">GST on Gateway Processing Fee (BPS)</label>
                <input
                  type="number"
                  min="0"
                  max="3000"
                  value={settings.financialPolicy?.gatewayFeeTaxRateBps ?? 1800}
                  onChange={(e) => setSettings({
                    ...settings,
                    financialPolicy: {
                      ...(settings.financialPolicy || DEFAULT_STORE_SETTINGS.financialPolicy!),
                      gatewayFeeTaxRateBps: Number(e.target.value)
                    }
                  })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono font-bold"
                />
                <p className="text-[10px] text-slate-500 mt-1">1800 Basis Points = 18% GST charged on payment gateway fees.</p>
              </div>
            </div>
          </div>

          {/* Tuesday Settlement Schedule Parameters */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-200 pb-3 flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-600" />
              Automated Tuesday Settlement & Clearing Policy
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Settlement Cycle Day</label>
                <input
                  type="text"
                  disabled
                  value="Every Tuesday (Weekly)"
                  className="w-full p-2.5 bg-slate-100 border border-slate-300 rounded-xl text-slate-700 font-semibold cursor-not-allowed"
                />
                <p className="text-[10px] text-slate-500 mt-1">Automated batch bank payout sweep triggers every Tuesday at 17:00 IST (5:00 PM–6:00 PM IST window).</p>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Clearing Hold Period (Days)</label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={settings.financialPolicy?.payoutHoldPeriodDays ?? 3}
                  onChange={(e) => setSettings({
                    ...settings,
                    financialPolicy: {
                      ...(settings.financialPolicy || DEFAULT_STORE_SETTINGS.financialPolicy!),
                      payoutHoldPeriodDays: Number(e.target.value)
                    }
                  })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold"
                />
                <p className="text-[10px] text-slate-500 mt-1">Days after verified shipment delivery before funds transition from Pending to Available.</p>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Minimum Payout Threshold (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={((settings.financialPolicy?.minimumPayoutPaise ?? 50000) / 100)}
                  onChange={(e) => setSettings({
                    ...settings,
                    financialPolicy: {
                      ...(settings.financialPolicy || DEFAULT_STORE_SETTINGS.financialPolicy!),
                      minimumPayoutPaise: Math.round(Number(e.target.value) * 100)
                    }
                  })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold"
                />
                <p className="text-[10px] text-slate-500 mt-1">Minimum accrued available balance required for automated Tuesday bank transfer.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              {lastSaved && (
                <span className="text-xs text-emerald-700 font-medium flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Financial Policy Live — Updated at {lastSaved}
                </span>
              )}
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md flex items-center gap-2 text-xs transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4 text-white" />
              {saving ? 'Saving Policy...' : 'Save Financial Policy'}
            </button>
          </div>
        </form>
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

        {/* Marketplace Commercial & Universal Order Thresholds */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <h3 className="font-semibold text-sm text-slate-900">Universal Order, COD & Shipping Thresholds</h3>
            <span className="text-[11px] font-mono px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-semibold">
              Platform Defaults
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Universal Min Order Value (₹)</label>
              <input
                type="number"
                min={0}
                value={settings.orderThresholds?.minOrderValue ?? 199}
                onChange={(e) => setSettings({
                  ...settings,
                  orderThresholds: {
                    ...(settings.orderThresholds || { minOrderValue: 199, freeShippingThreshold: 499, codMinValue: 299, codMaxValue: 5000, codAvailable: true }),
                    minOrderValue: Number(e.target.value)
                  }
                })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono font-bold"
              />
              <p className="text-[10px] text-slate-500 mt-1">Default minimum order required across marketplace.</p>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-emerald-600" /> Free Shipping Order Threshold (₹)
              </label>
              <input
                type="number"
                min={0}
                value={settings.orderThresholds?.freeShippingThreshold ?? settings.freeShippingThreshold ?? 499}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setSettings({
                    ...settings,
                    freeShippingThreshold: val,
                    orderThresholds: {
                      ...(settings.orderThresholds || { minOrderValue: 199, freeShippingThreshold: 499, codMinValue: 299, codMaxValue: 5000, codAvailable: true }),
                      freeShippingThreshold: val
                    }
                  });
                }}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-emerald-700 font-mono font-bold"
              />
              <p className="text-[10px] text-slate-500 mt-1">Platform baseline for free customer shipping.</p>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-amber-600" /> Default Platform Commission (%)
              </label>
              <input
                type="number"
                value={settings.defaultCommission}
                onChange={(e) => setSettings({ ...settings, defaultCommission: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-amber-700 font-bold"
              />
              <p className="text-[10px] text-slate-500 mt-1">Default marketplace take rate for standard vendors.</p>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Universal COD Min Value (₹)</label>
              <input
                type="number"
                min={0}
                value={settings.orderThresholds?.codMinValue ?? 299}
                onChange={(e) => setSettings({
                  ...settings,
                  orderThresholds: {
                    ...(settings.orderThresholds || { minOrderValue: 199, freeShippingThreshold: 499, codMinValue: 299, codMaxValue: 5000, codAvailable: true }),
                    codMinValue: Number(e.target.value)
                  }
                })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono font-bold"
              />
              <p className="text-[10px] text-slate-500 mt-1">Minimum order total for Cash on Delivery.</p>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Universal COD Max Cap (₹)</label>
              <input
                type="number"
                min={0}
                value={settings.orderThresholds?.codMaxValue ?? 5000}
                onChange={(e) => setSettings({
                  ...settings,
                  orderThresholds: {
                    ...(settings.orderThresholds || { minOrderValue: 199, freeShippingThreshold: 499, codMinValue: 299, codMaxValue: 5000, codAvailable: true }),
                    codMaxValue: Number(e.target.value)
                  }
                })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono font-bold"
              />
              <p className="text-[10px] text-slate-500 mt-1">Maximum cap to prevent courier RTO losses.</p>
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.orderThresholds?.codAvailable !== false}
                  onChange={(e) => setSettings({
                    ...settings,
                    orderThresholds: {
                      ...(settings.orderThresholds || { minOrderValue: 199, freeShippingThreshold: 499, codMinValue: 299, codMaxValue: 5000, codAvailable: true }),
                      codAvailable: e.target.checked
                    }
                  })}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <span className="text-xs font-bold text-slate-900">Enable Cash on Delivery (COD) Globally</span>
              </label>
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
