import React, { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../config/firebase';
import { useApp } from '../../context/AppContext';

/**
 * Marketplace money rules used by the backend (settings/financialPolicy).
 * Saved only through the updateFinancialPolicy callable (audited).
 */
export const MarketplaceRulesPanel: React.FC = () => {
  const { addToast } = useApp();
  const [shippingFee, setShippingFee] = useState('99');
  const [threshold, setThreshold] = useState('1499');
  const [codEnabled, setCodEnabled] = useState(false);
  const [holdDays, setHoldDays] = useState('0');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return onSnapshot(doc(db, 'settings', 'financialPolicy'), (snap) => {
      const d: any = snap.data() || {};
      if (Number.isInteger(d.shippingFeePaise)) setShippingFee(String(d.shippingFeePaise / 100));
      if (Number.isInteger(d.freeShippingThresholdPaise)) setThreshold(String(d.freeShippingThresholdPaise / 100));
      setCodEnabled(d.codEnabled === true);
      if (Number.isInteger(d.payoutHoldDaysAfterDelivery)) setHoldDays(String(d.payoutHoldDaysAfterDelivery));
    }, () => undefined);
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const fn = httpsCallable<any, any>(functions, 'updateFinancialPolicy');
      await fn({ shippingFee: Number(shippingFee), freeShippingThreshold: Number(threshold), codEnabled, payoutHoldDaysAfterDelivery: Number(holdDays) });
      addToast('Marketplace rules saved.', 'success');
    } catch (e: any) {
      addToast(e?.message || 'Could not save', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
      <div className="border-b border-slate-200 pb-3">
        <h3 className="font-semibold text-sm text-slate-900">Marketplace Money Rules</h3>
        <p className="text-[11px] text-slate-500 mt-1">Used by checkout, commission and weekly settlement. Commission % is set per vendor in Vendors.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <label className="block">
          <span className="block text-slate-700 font-semibold mb-1">Shipping charge (₹)</span>
          <input type="number" min={0} value={shippingFee} onChange={(e) => setShippingFee(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900" />
        </label>
        <label className="block">
          <span className="block text-slate-700 font-semibold mb-1">Free shipping from (₹ product total)</span>
          <input type="number" min={0} value={threshold} onChange={(e) => setThreshold(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900" />
        </label>
        <label className="block">
          <span className="block text-slate-700 font-semibold mb-1">Vendor payout hold after delivery (days)</span>
          <input type="number" min={0} max={30} value={holdDays} onChange={(e) => setHoldDays(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900" />
        </label>
        <label className="flex items-center gap-2 mt-5">
          <input type="checkbox" checked={codEnabled} onChange={(e) => setCodEnabled(e.target.checked)} className="h-4 w-4" />
          <span className="font-bold text-slate-900">Allow Cash on Delivery (vendors then choose per product)</span>
        </label>
      </div>
      <button onClick={save} disabled={saving} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50">
        {saving ? 'Saving…' : 'Save marketplace rules'}
      </button>
    </div>
  );
};
