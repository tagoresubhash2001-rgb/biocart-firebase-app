import React, { useEffect, useState } from 'react';
import { useVendor } from '../../hooks/useVendor';
import { db } from '../../config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Wallet, TrendingUp, DollarSign, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { WalletEntity } from '../../types';

export const VendorWallet: React.FC = () => {
  const { vendorId, loading: vendorLoading } = useVendor();
  const [wallet, setWallet] = useState<Partial<WalletEntity>>({});
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (vendorLoading) return;
    if (!vendorId) {
      setDataLoading(false);
      return;
    }
    
    const unsub = onSnapshot(doc(db, 'vendor_wallets', vendorId), (docSnap) => {
      if (docSnap.exists()) {
        setWallet(docSnap.data() as WalletEntity);
      } else {
        setWallet({
          pending: 0,
          onHold: 0,
          available: 0,
          settling: 0,
          paidOut: 0,
          lifetimeGross: 0,
          lifetimeCommission: 0,
          lifetimeSettled: 0
        });
      }
      setDataLoading(false);
    });

    return () => unsub();
  }, [vendorId, vendorLoading]);

  if (vendorLoading || dataLoading) {
    return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const formatMoney = (paise?: number) => {
    return '₹' + ((paise || 0) / 100).toFixed(2);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4">
      <h2 className="text-2xl font-bold font-display text-charcoal-900 flex items-center gap-3">
        <Wallet className="w-8 h-8 text-emerald-600" />
        Wallet & Earnings
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-150 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Available Balance</p>
            <p className="text-2xl font-bold text-charcoal-900">{formatMoney(wallet.available)}</p>
          </div>
        </div>
        
        <div className="p-5 bg-white rounded-2xl border border-slate-150 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Pending (Clearing)</p>
            <p className="text-2xl font-bold text-charcoal-900">{formatMoney(wallet.pending)}</p>
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-150 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Settling Processing</p>
            <p className="text-2xl font-bold text-charcoal-900">{formatMoney(wallet.settling)}</p>
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-150 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">On Hold</p>
            <p className="text-2xl font-bold text-charcoal-900">{formatMoney(wallet.onHold)}</p>
          </div>
        </div>

        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 md:col-span-2">
          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600">
            <DollarSign className="w-5 h-5" />
          </div>
          <div className="flex gap-12 w-full">
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Paid Out</p>
              <p className="text-2xl font-bold text-charcoal-900">{formatMoney(wallet.paidOut)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Lifetime Gross</p>
              <p className="text-2xl font-bold text-charcoal-900">{formatMoney(wallet.lifetimeGross)}</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-2xl border border-slate-150 shadow-sm p-6 mt-6">
        <h3 className="font-bold text-lg mb-4 text-charcoal-900">Wallet Ledger</h3>
        <p className="text-sm text-slate-500 italic">Immutable ledger history implementation syncs below.</p>
      </div>
    </div>
  );
};
