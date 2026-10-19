import React, { useState } from 'react';
import {
  X,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  ShieldCheck,
  Building2,
  Calendar,
  ExternalLink
} from 'lucide-react';

interface VendorLedgerDrawerProps {
  vendorId: string;
  vendorName: string;
  isOpen: boolean;
  onClose: () => void;
  ledgerEntries: any[];
}

export const VendorLedgerDrawer: React.FC<VendorLedgerDrawerProps> = ({
  vendorId,
  vendorName,
  isOpen,
  onClose,
  ledgerEntries
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  if (!isOpen) return null;

  // Filter entries for this vendor
  const vendorEntries = ledgerEntries.filter((e) => e.vendorId === vendorId);

  const filtered = vendorEntries.filter((e) => {
    const matchesType = typeFilter === 'all' || e.entryType === typeFilter;
    const q = search.toLowerCase().trim();
    const matchesSearch = !q ||
      (e.id || '').toLowerCase().includes(q) ||
      (e.orderId || '').toLowerCase().includes(q) ||
      (e.settlementId || '').toLowerCase().includes(q) ||
      (e.description || '').toLowerCase().includes(q) ||
      (e.providerReferenceId || '').toLowerCase().includes(q) ||
      (e.utr || '').toLowerCase().includes(q);
    return matchesType && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col border-l border-slate-200">
          {/* Header */}
          <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h2 className="text-base font-bold text-slate-900">Auditable Financial Ledger</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Vendor: <strong>{vendorName}</strong> ({vendorId}) • Double-entry immutable records
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search & Filter */}
          <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by order ID, settlement, ref ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none font-medium"
            >
              <option value="all">All Types</option>
              <option value="vendor_payout_disbursed">Disbursed Payouts</option>
              <option value="vendor_payout_failed">Failed / Reversed Payouts</option>
              <option value="pending_earnings_cleared">Earnings Cleared</option>
              <option value="refund_reversal">Refund Reversals</option>
            </select>
          </div>

          {/* Ledger Table */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                No ledger transactions found matching your criteria.
              </div>
            ) : (
              filtered.map((item) => {
                const isCredit = item.direction === 'credit';
                const amt = Number(item.amountPaise || 0) / 100;
                return (
                  <div key={item.id} className="p-4 hover:bg-slate-50/70 transition-colors text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`p-1 rounded-md ${isCredit ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {isCredit ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                        </span>
                        <span className="font-mono font-bold text-slate-900 text-[11px]">{item.id}</span>
                      </div>
                      <span className={`font-bold font-mono text-sm ${isCredit ? 'text-emerald-700' : 'text-slate-900'}`}>
                        {isCredit ? '+' : '-'}₹{amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <p className="text-slate-700 font-medium text-xs">{item.description || 'Ledger Transaction'}</p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400 font-mono">
                      <span>Type: <strong className="text-slate-600 font-sans">{item.entryType}</strong></span>
                      {item.orderId && <span>Order: <strong className="text-slate-600">{item.orderId}</strong></span>}
                      {item.utr && <span>UTR: <strong className="text-emerald-700">{item.utr}</strong></span>}
                      {item.providerReferenceId && <span>Ref: {item.providerReferenceId}</span>}
                      <span>Date: {item.createdAt || 'N/A'}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer summary */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
            <span>Total Entries: <strong>{filtered.length}</strong></span>
            <span className="font-semibold text-emerald-700">Strict Immutable Double-Entry Ledger</span>
          </div>
        </div>
      </div>
    </div>
  );
};
