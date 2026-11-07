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
  const [freeShippingEnabled, setFreeShippingEnabled] = useState(true);
  const [codMin, setCodMin] = useState('0');
  const [codMax, setCodMax] = useState('5000');
  const [holdDays, setHoldDays] = useState('0');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return onSnapshot(doc(db, 'settings', 'financialPolicy'), (snap) => {
      const d: any = snap.data() || {};
      if (Number.isInteger(d.shippingFeePaise)) setShippingFee(String(d.shippingFeePaise / 100));
      if (Number.isInteger(d.freeShippingThresholdPaise)) setThreshold(String(d.freeShippingThresholdPaise / 100));
      setCodEnabled(d.codEnabled === true);
      setFreeShippingEnabled(d.freeShippingEnabled !== false);
      if (Number.isInteger(d.codMinOrderPaise)) setCodMin(String(d.codMinOrderPaise / 100));
      if (Number.isInteger(d.codMaxOrderPaise)) setCodMax(String(d.codMaxOrderPaise / 100));
      if (Number.isInteger(d.payoutHoldDaysAfterDelivery)) setHoldDays(String(d.payoutHoldDaysAfterDelivery));
    }, () => undefined);
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const fn = httpsCallable<any, any>(functions, 'updateFinancialPolicy');
      if (Number(codMin) > Number(codMax)) throw new Error('COD minimum cannot be more than the COD maximum.');
      await fn({
        shippingFee: Number(shippingFee), freeShippingThreshold: Number(threshold), freeShippingEnabled,
        codEnabled, codMinOrder: Number(codMin), codMaxOrder: Number(codMax),
        payoutHoldDaysAfterDelivery: Number(holdDays),
      });
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
        <div className="block">
          <label className="flex items-center gap-2 mb-1">
            <input type="checkbox" id="free-shipping-enabled" checked={freeShippingEnabled} onChange={(e) => setFreeShippingEnabled(e.target.checked)} className="h-4 w-4" />
            <span className="text-slate-700 font-semibold">Free delivery {freeShippingEnabled ? 'ON' : 'OFF (shipping always charged)'}</span>
          </label>
          <input type="number" min={0} value={threshold} disabled={!freeShippingEnabled} onChange={(e) => setThreshold(e.target.value)} placeholder="Free from ₹" className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 disabled:opacity-50" />
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {[0, 499, 999, 1499].map((v) => (
              <button key={v} type="button" disabled={!freeShippingEnabled} onClick={() => setThreshold(String(v))}
                className={`px-2 py-1 rounded-lg border text-[11px] font-semibold disabled:opacity-40 ${Number(threshold) === v ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white border-slate-300 text-slate-700'}`}>
                {v === 0 ? 'Free on every order' : `Free from ₹${v.toLocaleString('en-IN')}`}
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="block text-slate-700 font-semibold mb-1">Vendor payout hold after delivery (days)</span>
          <input type="number" min={0} max={30} value={holdDays} onChange={(e) => setHoldDays(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900" />
        </label>
        <div className="block sm:col-span-2 p-3 rounded-xl border border-slate-200 space-y-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" id="cod-enabled" checked={codEnabled} onChange={(e) => setCodEnabled(e.target.checked)} className="h-4 w-4" />
            <span className="font-bold text-slate-900">Cash on Delivery {codEnabled ? 'ON' : 'OFF'} (vendors then choose per product)</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-slate-700 font-semibold mb-1">COD allowed from order total (₹)</span>
              <input type="number" min={0} value={codMin} disabled={!codEnabled} onChange={(e) => setCodMin(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 disabled:opacity-50" />
            </label>
            <label className="block">
              <span className="block text-slate-700 font-semibold mb-1">COD allowed up to order total (₹)</span>
              <input type="number" min={0} value={codMax} disabled={!codEnabled} onChange={(e) => setCodMax(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 disabled:opacity-50" />
            </label>
          </div>
          <p className="text-[10px] text-slate-500">Example: from ₹0 up to ₹5,000 = COD on any order up to ₹5,000. EKART's own COD limit for the PIN code also applies.</p>
        </div>
      </div>
      <button onClick={save} disabled={saving} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50">
        {saving ? 'Saving…' : 'Save marketplace rules'}
      </button>
    </div>
  );
};
