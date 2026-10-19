import React, { useEffect, useState } from 'react';
import { useVendor } from '../../hooks/useVendor';
import { db } from '../../config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Wallet, TrendingUp, DollarSign, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { WalletEntity } from '../../types';
import { AdminService } from '../../services/AdminService';
import { BioCartLoader } from '../ui/BioCartLoader';

export const VendorWallet: React.FC = () => {
  const { vendorId, loading: vendorLoading } = useVendor();
  const [wallet, setWallet] = useState<Partial<WalletEntity>>({});
  const [dataLoading, setDataLoading] = useState(true);
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(true);

  useEffect(() => {
    if (vendorLoading) return;
    if (!vendorId) {
      setDataLoading(false);
      setLedgerLoading(false);
      return;
    }
    
    const unsubWallet = onSnapshot(doc(db, 'vendor_wallets', vendorId), (docSnap) => {
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

    const unsubLedger = AdminService.subscribeToFinancialLedger((entries) => {
      setLedgerEntries(entries);
      setLedgerLoading(false);
    }, vendorId);

    return () => {
      unsubWallet();
      unsubLedger();
    };
  }, [vendorId, vendorLoading]);

  if (vendorLoading || dataLoading) {
    return (
      <div className="flex justify-center p-12">
        <BioCartLoader message="Loading wallet and settlement ledger..." size="md" />
      </div>
    );
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
            <p className="text-2xl font-bold text-charcoal-900">{formatMoney((wallet as any).pendingBalance ?? wallet.pending)}</p>
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
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-lg text-charcoal-900">Wallet & Settlement Ledger</h3>
            <p className="text-xs text-slate-500">Immutable double-entry audit history of order credits and automated Tuesday payouts.</p>
          </div>
          <span className="text-[11px] font-mono font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
            Auto-Settlement: Every Tuesday
          </span>
        </div>

        {ledgerLoading ? (
          <div className="flex justify-center py-8">
            <BioCartLoader message="Syncing ledger transactions..." size="sm" />
          </div>
        ) : ledgerEntries.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <p className="text-xs text-slate-500 font-medium">No financial transactions recorded yet.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Earnings and settlement transfers will populate here in real-time.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Transaction Type</th>
                  <th className="py-2.5 px-3">Order / Batch</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {ledgerEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      }) : '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        entry.direction === 'credit'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}>
                        {entry.entryType.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                      {entry.orderNumber || entry.batchId || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                      {entry.description}
                    </td>
                    <td className={`py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap ${
                      entry.direction === 'credit' ? 'text-emerald-700' : 'text-slate-800'
                    }`}>
                      {entry.direction === 'credit' ? '+' : '-'}₹{((entry.amountPaise || 0) / 100).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        entry.status === 'settled'
                          ? 'bg-emerald-100 text-emerald-800'
                          : entry.status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {entry.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

