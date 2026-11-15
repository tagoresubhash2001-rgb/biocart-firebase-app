import React, { useState, useEffect } from 'react';
import {
  Banknote,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Building2,
  Calendar,
  Filter,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Info,
  DollarSign
} from 'lucide-react';
import { AdminService } from '../../services/AdminService';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';
import { useApp } from '../../context/AppContext';

export interface SettlementBatchItem {
  id: string;
  batchId?: string;
  vendorId: string;
  vendorName?: string;
  amountPaise: number;
  currency?: string;
  status: 'paid' | 'processing' | 'failed' | 'needs_review' | 'ready_for_payment' | 'offset_by_adjustments';
  providerReferenceId?: string;
  utr?: string;
  failureReason?: string;
  scheduledDay?: string;
  scheduledAt?: string;
  paidAt?: any;
  bankDetails?: {
    bankName?: string;
    accountNumberMasked?: string;
    ifscCode?: string;
    beneficiaryName?: string;
  };
  createdAt?: any;
  updatedAt?: any;
}

export const AdminPayouts: React.FC = () => {
  const { addToast } = useApp();
  const [settlements, setSettlements] = useState<SettlementBatchItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [retryingId, setRetryingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = AdminService.subscribeToSettlements((list) => {
      setSettlements(list as SettlementBatchItem[]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const [runningCycle, setRunningCycle] = useState(false);

  // Manual payout mode: admin pays from the bank, then records the UTR here.
  const handleMarkPaid = async (item: SettlementBatchItem) => {
    const utr = window.prompt(`Pay ₹${(item.amountPaise / 100).toLocaleString('en-IN')} to ${item.vendorName || item.vendorId} from your bank, then enter the UTR / reference number:`);
    if (!utr) return;
    const paidOn = window.prompt('Payment date (YYYY-MM-DD):', new Date().toISOString().slice(0, 10));
    if (!paidOn) return;
    setRetryingId(item.id);
    try {
      const fn = httpsCallable<any, any>(functions, 'markSettlementPaid');
      await fn({ settlementId: item.id, utr: utr.trim(), paidOn: paidOn.trim(), amountPaise: item.amountPaise });
      addToast(`Settlement marked paid (UTR ${utr.trim().toUpperCase()}).`, 'success');
    } catch (err: any) {
      addToast(err?.message || 'Could not mark as paid', 'error');
    } finally {
      setRetryingId(null);
    }
  };

  const handleRunCycle = async () => {
    if (!window.confirm('Calculate settlements now for all delivered orders up to last Monday? (This normally runs automatically every Tuesday 6 PM.)')) return;
    setRunningCycle(true);
    try {
      const fn = httpsCallable<any, any>(functions, 'triggerManualSettlement');
      const res = await fn({});
      addToast(res.data?.skipped ? `Cycle ${res.data.cycleId} was already calculated.` : `Cycle ${res.data?.cycleId}: ${res.data?.created ?? 0} vendor settlement(s) created.`, 'success');
    } catch (err: any) {
      addToast(err?.message || 'Could not run the settlement cycle', 'error');
    } finally {
      setRunningCycle(false);
    }
  };

  const handleRetryPayout = async (settlementId: string) => {
    setRetryingId(settlementId);
    try {
      const res = await AdminService.retryVendorPayout(settlementId);
      if (res.success) {
        addToast(`Payout successfully disbursed! Ref: ${res.providerReferenceId || 'Approved'}`, 'success');
      } else {
        addToast(`Payout retry failed: ${res.failureReason || 'Gateway error'}`, 'error');
      }
    } catch (err: any) {
      addToast(`Error retrying payout: ${err.message || 'Network exception'}`, 'error');
    } finally {
      setRetryingId(null);
    }
  };

  // Metric aggregates
  const totalSettledPaise = settlements
    .filter(s => s.status === 'paid')
    .reduce((acc, curr) => acc + (curr.amountPaise || 0), 0);

  const processingPaise = settlements
    .filter(s => s.status === 'processing' || s.status === 'ready_for_payment')
    .reduce((acc, curr) => acc + (curr.amountPaise || 0), 0);

  const failedPaise = settlements
    .filter(s => s.status === 'failed' || s.status === 'needs_review')
    .reduce((acc, curr) => acc + (curr.amountPaise || 0), 0);

  const filteredSettlements = settlements.filter(s => {
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      (s.vendorName || '').toLowerCase().includes(q) ||
      (s.vendorId || '').toLowerCase().includes(q) ||
      (s.batchId || '').toLowerCase().includes(q) ||
      (s.providerReferenceId || '').toLowerCase().includes(q) ||
      (s.utr || '').toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Banknote className="w-7 h-7 text-emerald-600" />
              Vendor Payouts & Weekly Settlements
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
              <Zap className="w-3 h-3 text-emerald-600" />
              Every Tuesday 5:00 PM IST
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Automated direct bank payouts to verified vendor accounts via server-side gateway integration.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1.5 font-medium">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            Payout Window: 5:00 PM–6:00 PM IST
          </div>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Disbursed</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">₹{(totalSettledPaise / 100).toLocaleString('en-IN')}</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Directly credited to verified bank accounts</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Currently In Flight</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">₹{(processingPaise / 100).toLocaleString('en-IN')}</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Processing via clearing cycle</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Requires Review / Failed</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-700">₹{(failedPaise / 100).toLocaleString('en-IN')}</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Missing bank info or gateway rejection</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Automated Safeguards</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-lg font-bold text-slate-900">Strict Idempotency</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">2-Phase commit & zero double transfers</p>
        </div>
      </div>

      {/* Information Banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3 text-emerald-900">
        <Info className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-semibold text-emerald-950">
            Automated Production Workflow Execution Policy
          </p>
          <p className="text-emerald-800">
            Every Tuesday at 5:00 PM IST, eligible vendors with verified bank accounts and available balances exceeding ₹500
            are processed. Funds transition safely through a two-phase reservation model. Incomplete bank accounts trigger an actionable review alert without locking funds in limbo.
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by vendor, batch ID, reference ID or UTR..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={handleRunCycle}
            disabled={runningCycle}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {runningCycle ? 'Calculating…' : 'Run settlement now'}
          </button>
          {(['all', 'ready_for_payment', 'paid', 'offset_by_adjustments', 'failed', 'needs_review'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'needs_review' ? 'Needs Review' : st === 'ready_for_payment' ? 'To pay' : st === 'offset_by_adjustments' ? 'Offset' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Settlements Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
            <p className="text-sm font-medium">Loading settlement batches from real-time ledger...</p>
          </div>
        ) : filteredSettlements.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Banknote className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-base font-semibold text-slate-700">No settlement transfers found</p>
            <p className="text-xs text-slate-400">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search query or filter criteria.'
                : 'Automated transfers will trigger next Tuesday at 5:00 PM IST.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Batch & Date</th>
                  <th className="py-3 px-4">Vendor Partner</th>
                  <th className="py-3 px-4">Bank Destination</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Reference / UTR</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSettlements.map((item) => {
                  const statusColors = {
                    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    processing: 'bg-amber-50 text-amber-700 border-amber-200',
                    failed: 'bg-rose-50 text-rose-700 border-rose-200',
                    needs_review: 'bg-purple-50 text-purple-700 border-purple-200',
                    ready_for_payment: 'bg-sky-50 text-sky-700 border-sky-200',
                    offset_by_adjustments: 'bg-slate-50 text-slate-600 border-slate-200'
                  } as Record<string, string>;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-bold text-slate-900 text-xs">{item.batchId || item.id}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {item.scheduledAt || (item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString('en-IN') : 'Scheduled')}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{item.vendorName || item.vendorId}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{item.vendorId}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        {item.bankDetails ? (
                          <div className="space-y-0.5">
                            <div className="font-medium text-slate-800 flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-slate-400" />
                              {item.bankDetails.bankName || 'Bank Account'}
                            </div>
                            <div className="text-[11px] font-mono text-slate-600">
                              {item.bankDetails.accountNumberMasked || '••••'}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              IFSC: {item.bankDetails.ifscCode || 'None'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Not available</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-sm text-slate-900">
                          ₹{(item.amountPaise / 100).toLocaleString('en-IN')}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border capitalize ${statusColors[item.status] || 'bg-slate-100 text-slate-700'}`}>
                          {item.status === 'paid' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          {item.status === 'processing' && <Clock className="w-3 h-3 text-amber-600" />}
                          {item.status === 'failed' && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                          {item.status === 'needs_review' && <AlertTriangle className="w-3 h-3 text-purple-600" />}
                          {item.status === 'needs_review' ? 'Needs Review' : item.status === 'ready_for_payment' ? 'To pay' : item.status === 'offset_by_adjustments' ? 'Offset by refunds' : item.status}
                        </span>
                        {item.failureReason && (
                          <p className="text-[10px] text-rose-600 mt-1 max-w-xs truncate" title={item.failureReason}>
                            {item.failureReason}
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        {item.utr ? (
                          <div>
                            <span className="font-semibold text-emerald-800">UTR: {item.utr}</span>
                            <div className="text-[10px] text-slate-400">{item.providerReferenceId}</div>
                          </div>
                        ) : item.providerReferenceId ? (
                          <span className="text-slate-700">{item.providerReferenceId}</span>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {item.status === 'ready_for_payment' ? (
                          <button
                            onClick={() => handleMarkPaid(item)}
                            disabled={retryingId === item.id || (item as any).needsBankDetails}
                            title={(item as any).needsBankDetails ? 'Add the vendor bank details first (Vendors → Commercials)' : ''}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white transition-colors disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {retryingId === item.id ? 'Saving…' : (item as any).needsBankDetails ? 'Bank details missing' : 'Mark as paid (UTR)'}
                          </button>
                        ) : (item.status === 'failed' || item.status === 'needs_review') ? (
                          <button
                            onClick={() => handleRetryPayout(item.id)}
                            disabled={retryingId === item.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
                          >
                            <RotateCcw className={`w-3.5 h-3.5 ${retryingId === item.id ? 'animate-spin' : ''}`} />
                            {retryingId === item.id ? 'Retrying...' : 'Retry Transfer'}
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">Reconciled</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
