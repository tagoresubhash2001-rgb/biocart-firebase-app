import React, { useState } from 'react';
import {
  Store,
  Search,
  Filter,
  DollarSign,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Calendar,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  FileText
} from 'lucide-react';
import { VendorFinancialSummary } from '../../services/AnalyticsService';
import { InitiateSettlementModal } from './InitiateSettlementModal';
import { VendorLedgerDrawer } from './VendorLedgerDrawer';
import { AdminService } from '../../services/AdminService';
import { useApp } from '../../context/AppContext';

interface VendorFinancialsProps {
  vendorSummaries: VendorFinancialSummary[];
  ledgerEntries: any[];
}

export const VendorFinancials: React.FC<VendorFinancialsProps> = ({
  vendorSummaries,
  ledgerEntries
}) => {
  const { addToast } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal / Drawer state
  const [selectedSettlementVendor, setSelectedSettlementVendor] = useState<VendorFinancialSummary | null>(null);
  const [selectedLedgerVendor, setSelectedLedgerVendor] = useState<{ id: string; name: string } | null>(null);

  const handleManualSettlementSubmit = async (vendorId: string, amountPaise: number, reason: string) => {
    try {
      const res = await AdminService.triggerManualPayout(vendorId, amountPaise, reason);
      if (res.success) {
        addToast(`Manual payout initiated successfully! Ref: ${res.providerReferenceId || 'Approved'}`, 'success');
      } else {
        addToast(`Manual payout failed: ${res.failureReason || 'Provider rejected request'}`, 'error');
      }
    } catch (err: any) {
      addToast(`Error submitting manual payout: ${err.message || 'Network exception'}`, 'error');
      throw err;
    }
  };

  const filtered = vendorSummaries.filter((v) => {
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
    const q = search.toLowerCase().trim();
    const matchesSearch = !q ||
      v.storeName.toLowerCase().includes(q) ||
      v.vendorId.toLowerCase().includes(q) ||
      v.bankName.toLowerCase().includes(q) ||
      v.accountNumberMasked.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search vendor, ID, bank, account..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          {['all', 'active', 'pending', 'suspended'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-colors ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Vendor Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Vendor Partner</th>
                <th className="py-3 px-4">Orders & GMV</th>
                <th className="py-3 px-4">Net Earnings</th>
                <th className="py-3 px-4">Available Payout</th>
                <th className="py-3 px-4">Settling / In Flight</th>
                <th className="py-3 px-4">Bank Destination</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No vendors found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((vendor) => {
                  const availRupees = vendor.walletAvailablePaise / 100;
                  const settlingRupees = vendor.walletSettlingPaise / 100;
                  const earningsRupees = vendor.netEarningsPaise / 100;

                  return (
                    <tr key={vendor.vendorId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-xs">{vendor.storeName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{vendor.vendorId}</div>
                        <div className="mt-1">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            vendor.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {vendor.status}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-semibold text-slate-900">
                          ₹{(vendor.gmvPaise / 100).toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-slate-400 font-sans">
                          {vendor.totalOrders} total ({vendor.completedOrders} completed)
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        ₹{earningsRupees.toLocaleString('en-IN')}
                        <div className="text-[10px] font-normal text-slate-400 font-sans">
                          Fee: ₹{(vendor.allocatedGatewayFeePaise / 100).toFixed(0)} • Comm: ₹{(vendor.platformCommissionPaise / 100).toFixed(0)}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        <span className={`font-bold text-sm ${availRupees > 0 ? 'text-emerald-700' : 'text-slate-500'}`}>
                          ₹{availRupees.toLocaleString('en-IN')}
                        </span>
                        {vendor.walletPendingPaise > 0 && (
                          <div className="text-[10px] text-slate-400 font-sans">
                            Pending: ₹{(vendor.walletPendingPaise / 100).toLocaleString('en-IN')}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        {settlingRupees > 0 ? (
                          <span className="font-bold text-amber-700">₹{settlingRupees.toLocaleString('en-IN')}</span>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                        <div className="text-[10px] text-slate-400 font-sans">
                          Settled: ₹{(vendor.walletPaidOutPaise / 100).toLocaleString('en-IN')}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-xs font-medium text-slate-800 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          {vendor.bankName}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">
                          {vendor.accountNumberMasked} • {vendor.ifscCode}
                        </div>
                        <div>
                          {vendor.isBankVerified ? (
                            <span className="text-[10px] text-emerald-700 font-bold">Verified Destination</span>
                          ) : (
                            <span className="text-[10px] text-rose-600 font-bold">Incomplete / Unverified</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedLedgerVendor({ id: vendor.vendorId, name: vendor.storeName })}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors"
                            title="View Financial Ledger"
                          >
                            <BookOpen className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setSelectedSettlementVendor(vendor)}
                            disabled={!vendor.isBankVerified || availRupees <= 0}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            Settle Funds
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Initiate Settlement Modal */}
      {selectedSettlementVendor && (
        <InitiateSettlementModal
          vendor={selectedSettlementVendor}
          isOpen={true}
          onClose={() => setSelectedSettlementVendor(null)}
          onSubmit={handleManualSettlementSubmit}
        />
      )}

      {/* Vendor Ledger Drawer */}
      {selectedLedgerVendor && (
        <VendorLedgerDrawer
          vendorId={selectedLedgerVendor.id}
          vendorName={selectedLedgerVendor.name}
          isOpen={true}
          onClose={() => setSelectedLedgerVendor(null)}
          ledgerEntries={ledgerEntries}
        />
      )}
    </div>
  );
};
