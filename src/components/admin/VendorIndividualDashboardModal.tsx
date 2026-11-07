import React, { useState, useEffect } from 'react';
import { VendorItem } from '../../types';
import {
  Store,
  X,
  Building2,
  DollarSign,
  TrendingUp,
  Package,
  ShoppingBag,
  CreditCard,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Filter,
  Layers,
  Banknote
} from 'lucide-react';
import {
  AnalyticsService,
  DateRangePreset,
  VendorFinancialSummary
} from '../../services/AnalyticsService';
import { AdminService } from '../../services/AdminService';
import { InitiateSettlementModal } from './InitiateSettlementModal';
import { VendorLedgerDrawer } from './VendorLedgerDrawer';
import { useApp } from '../../context/AppContext';

interface VendorIndividualDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendor: VendorItem;
  onNavigateToProducts?: () => void;
  onNavigateToOrders?: () => void;
}

export const VendorIndividualDashboardModal: React.FC<VendorIndividualDashboardModalProps> = ({
  isOpen,
  onClose,
  vendor,
  onNavigateToProducts,
  onNavigateToOrders
}) => {
  const { addToast } = useApp();
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('this_month');
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'financials' | 'performance'>('overview');

  // Real-time subscribed data scoped to this vendor
  const [orders, setOrders] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Sub-modal triggers
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [showLedgerDrawer, setShowLedgerDrawer] = useState(false);

  useEffect(() => {
    if (!isOpen || !vendor?.id) return;
    setLoading(true);

    const unsubOrders = AdminService.subscribeToOrders((list) => {
      setOrders(list);
    });

    const unsubWallets = AdminService.subscribeToVendorWallets((list) => {
      setWallets(list);
    });

    const unsubSettlements = AdminService.subscribeToSettlements((list) => {
      setSettlements(list);
    });

    const unsubLedger = AdminService.subscribeToFinancialLedger((list) => {
      // Filter ledger for this vendor
      setLedgerEntries(list.filter((entry) => entry.vendorId === vendor.id));
      setLoading(false);
    });

    return () => {
      unsubOrders();
      unsubWallets();
      unsubSettlements();
      unsubLedger();
    };
  }, [isOpen, vendor?.id]);

  if (!isOpen || !vendor) return null;

  // Resolve Asia/Kolkata date range
  const { current: dateRange } = AnalyticsService.getDateRange(dateRangePreset);

  // Filter orders by date range and vendor association
  const vendorOrders = orders.filter((order) => {
    const isAssociated = order.vendorId === vendor.id ||
      (Array.isArray(order.items) && order.items.some((it: any) => it.vendorId === vendor.id || (!it.vendorId && vendor.id === 'biocart'))) ||
      (Array.isArray(order.vendorOrders) && order.vendorOrders.some((vo: any) => vo.vendorId === vendor.id));

    if (!isAssociated) return false;

    const orderTime = order.createdAt?.seconds
      ? order.createdAt.seconds * 1000
      : new Date(order.createdAt || 0).getTime();

    return orderTime >= dateRange.start.getTime() && orderTime <= dateRange.end.getTime();
  });

  // Build authoritative financial summary for this vendor
  const vendorSummaries = AnalyticsService.buildVendorFinancialSummaries(
    [vendor],
    wallets,
    settlements,
    vendorOrders
  );
  const summary: VendorFinancialSummary = vendorSummaries[0] || {
    vendorId: vendor.id,
    storeName: vendor.storeName,
    status: vendor.status || 'active',
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
    cancelledOrders: 0,
    refundedOrders: 0,
    gmvPaise: 0,
    vendorFundedDiscountPaise: 0,
    platformFundedDiscountPaise: 0,
    allocatedGatewayFeePaise: 0,
    platformCommissionPaise: 0,
    commissionGstPaise: 0,
    netEarningsPaise: 0,
    walletPendingPaise: 0,
    walletAvailablePaise: 0,
    walletOnHoldPaise: 0,
    walletSettlingPaise: 0,
    walletPaidOutPaise: 0,
    lifetimeGrossPaise: 0,
    lifetimeCommissionPaise: 0,
    lifetimeSettledPaise: 0,
    totalSuccessfullySettledPaise: 0,
    failedPayoutAmountPaise: 0,
    nextScheduledPayoutDate: 'Next Tuesday (17:00 IST)',
    bankName: vendor.settlement?.bankName || 'Not Provided',
    accountNumberMasked: vendor.settlement?.accountNumber ? `•••• ${vendor.settlement.accountNumber.slice(-4)}` : '••••',
    ifscCode: vendor.settlement?.ifscCode || 'Not Provided',
    beneficiaryName: vendor.settlement?.beneficiaryName || vendor.ownerName || 'Vendor',
    isBankVerified: false
  };

  const formatRupees = (paise: number) => {
    return '₹' + (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  };

  const handleManualSettlementSubmit = async (vendorId: string, amountPaise: number, reason: string) => {
    try {
      const res = await AdminService.triggerManualPayout(vendorId, amountPaise, reason);
      if (res.success) {
        addToast(`Manual payout initiated successfully! Reference: ${res.providerReferenceId || 'Approved'}`, 'success');
        setShowSettlementModal(false);
      } else {
        addToast(`Manual payout failed: ${res.failureReason || 'Provider error'}`, 'error');
      }
    } catch (err: any) {
      addToast(`Error submitting payout: ${err.message}`, 'error');
      throw err;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Bar */}
        <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">{vendor.storeName}</h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  vendor.status === 'active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                  vendor.status === 'pending' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                  'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  {vendor.status}
                </span>
                <span className="text-[11px] font-mono text-slate-400">ID: {vendor.id}</span>
              </div>
              <p className="text-xs text-slate-400">
                Owner: <strong className="text-slate-200">{vendor.ownerName || 'Verified Partner'}</strong> • Contact: {vendor.email || vendor.phone || '—'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Date Range Selector */}
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={dateRangePreset}
                onChange={(e) => setDateRangePreset(e.target.value as DateRangePreset)}
                className="bg-transparent text-xs text-slate-200 font-semibold outline-none cursor-pointer"
              >
                <option value="today" className="bg-slate-900 text-white">Today</option>
                <option value="yesterday" className="bg-slate-900 text-white">Yesterday</option>
                <option value="this_week" className="bg-slate-900 text-white">This Week</option>
                <option value="previous_week" className="bg-slate-900 text-white">Previous Week</option>
                <option value="this_month" className="bg-slate-900 text-white">This Month</option>
                <option value="previous_month" className="bg-slate-900 text-white">Previous Month</option>
                <option value="this_year" className="bg-slate-900 text-white">This Year</option>
                <option value="previous_year" className="bg-slate-900 text-white">Previous Year</option>
              </select>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              title="Close Dashboard"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation & Contextual Actions Bar */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold">
          <div className="flex items-center gap-1">
            {[
              { id: 'overview', label: 'Executive Overview', icon: DollarSign },
              { id: 'orders', label: `Orders (${summary.totalOrders})`, icon: ShoppingBag },
              { id: 'financials', label: 'Wallet & Ledger', icon: CreditCard },
              { id: 'performance', label: 'Performance & Products', icon: TrendingUp }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-white text-emerald-800 shadow-sm border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4 text-emerald-600" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLedgerDrawer(true)}
              className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              <span>Double-Entry Ledger</span>
            </button>
            <button
              onClick={() => setShowSettlementModal(true)}
              disabled={summary.walletAvailablePaise <= 0}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Banknote className="w-3.5 h-3.5" />
              <span>Initiate Settlement</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-grow">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
              <p className="text-xs font-mono">Loading vendor financial snapshot & order analytics...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: EXECUTIVE OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Primary 4-Metric Position Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Gross Attributed GMV</p>
                      <h3 className="text-2xl font-black text-emerald-950 mt-1">{formatRupees(summary.gmvPaise)}</h3>
                      <p className="text-[11px] text-emerald-700 mt-0.5">{dateRange.label} merchandise sales</p>
                    </div>

                    <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl">
                      <p className="text-xs font-bold uppercase tracking-wider text-blue-800">Vendor Net Earnings</p>
                      <h3 className="text-2xl font-black text-blue-950 mt-1">{formatRupees(summary.netEarningsPaise)}</h3>
                      <p className="text-[11px] text-blue-700 mt-0.5">Commercial payout accrued</p>
                    </div>

                    <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl">
                      <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Available Wallet Balance</p>
                      <h3 className="text-2xl font-black text-amber-950 mt-1">{formatRupees(summary.walletAvailablePaise)}</h3>
                      <p className="text-[11px] text-amber-700 mt-0.5">Cleared & withdrawable funds</p>
                    </div>

                    <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl">
                      <p className="text-xs font-bold uppercase tracking-wider text-purple-800">Total Settled To Bank</p>
                      <h3 className="text-2xl font-black text-purple-950 mt-1">{formatRupees(summary.totalSuccessfullySettledPaise)}</h3>
                      <p className="text-[11px] text-purple-700 mt-0.5">Lifetime successful bank transfers</p>
                    </div>
                  </div>

                  {/* Commercial Terms & Wallet Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 text-xs">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <span className="font-bold text-slate-900 flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4 text-emerald-600" /> Commercial Deductions & Split
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">{dateRange.label}</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">Platform Commission Retained:</span>
                          <span className="font-semibold text-slate-800">{formatRupees(summary.platformCommissionPaise)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">Vendor Funded Discounts:</span>
                          <span className="font-semibold text-slate-800">{formatRupees(summary.vendorFundedDiscountPaise)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">Platform Subsidized Discounts:</span>
                          <span className="font-semibold text-emerald-700">{formatRupees(summary.platformFundedDiscountPaise)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">Cashfree fee (paid by BioCart):</span>
                          <span className="font-semibold text-slate-800">{formatRupees(summary.allocatedGatewayFeePaise)}</span>
                        </div>
                        <div className="flex justify-between pt-1 font-bold text-slate-900">
                          <span>Base Contracted Commission Rate:</span>
                          <span className="text-emerald-700">{(vendor.commission?.baseRateBps || 1000) / 100}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 text-xs">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <span className="font-bold text-slate-900 flex items-center gap-1.5">
                          <CreditCard className="w-4 h-4 text-emerald-600" /> Wallet Balance State (Live)
                        </span>
                        <span className="text-[11px] text-emerald-700 font-mono font-bold">Authoritative Ledger</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">Pending Cooling Hold:</span>
                          <span className="font-semibold text-amber-700">{formatRupees(summary.walletPendingPaise)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">Active Payout Reservation (Settling):</span>
                          <span className="font-semibold text-blue-700">{formatRupees(summary.walletSettlingPaise)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">Available For Immediate Settlement:</span>
                          <span className="font-bold text-emerald-700 text-sm">{formatRupees(summary.walletAvailablePaise)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">Beneficiary Bank Account:</span>
                          <span className="font-mono text-slate-800">{summary.bankName} ({summary.accountNumberMasked})</span>
                        </div>
                        <div className="flex justify-between pt-1">
                          <span className="text-slate-500">Next Automatic Scheduled Payout:</span>
                          <span className="font-bold text-slate-800">{summary.nextScheduledPayoutDate}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ORDERS ANALYTICS */}
              {activeTab === 'orders' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-900">
                      Orders Associated with {vendor.storeName} ({vendorOrders.length} total)
                    </h3>
                    <span className="text-xs text-slate-500 font-mono">Date filter: {dateRange.label}</span>
                  </div>

                  {vendorOrders.length > 0 ? (
                    <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
                          <tr>
                            <th className="p-3">Order ID</th>
                            <th className="p-3">Date</th>
                            <th className="p-3">Customer</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Payment</th>
                            <th className="p-3 text-right">Order Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {vendorOrders.slice(0, 15).map((order) => {
                            const dateStr = order.createdAt?.toDate
                              ? order.createdAt.toDate().toLocaleDateString('en-IN')
                              : (order.createdAt?.split?.('T')[0] || '—');
                            return (
                              <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-3 font-mono font-bold text-slate-900">{order.id}</td>
                                <td className="p-3 text-slate-500">{dateStr}</td>
                                <td className="p-3 text-slate-800">{order.customerName || order.userEmail || 'Customer'}</td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    order.status === 'delivered' || order.status === 'completed'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : order.status === 'cancelled'
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {order.status || 'processing'}
                                  </span>
                                </td>
                                <td className="p-3 capitalize font-mono text-[11px]">{order.paymentMethod || 'prepaid'}</td>
                                <td className="p-3 text-right font-bold text-slate-900">
                                  {formatRupees(Number(order.totalAmountPaise ?? Math.round((order.totalAmount || 0) * 100)))}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-12 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                      <ShoppingBag className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="font-bold text-slate-800 text-sm">No orders found in this period</p>
                      <p className="text-xs text-slate-500">Try adjusting the date filter or expanding the query range.</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: WALLET & DOUBLE-ENTRY LEDGER */}
              {activeTab === 'financials' && (
                <div className="space-y-6">
                  {/* Beneficiary details card */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">Registered Bank Beneficiary</h4>
                        <p className="text-slate-600 mt-0.5">Beneficiary: <strong>{summary.beneficiaryName}</strong></p>
                        <p className="text-slate-500 font-mono">{summary.bankName} • Account: {summary.accountNumberMasked} • IFSC: {summary.ifscCode}</p>
                      </div>
                    </div>
                    <div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                        summary.isBankVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {summary.isBankVerified ? 'Bank Details Verified' : 'Standard Verification'}
                      </span>
                    </div>
                  </div>

                  {/* Ledger entries preview */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-slate-900">Recent Double-Entry Ledger Transactions</h4>
                      <button
                        onClick={() => setShowLedgerDrawer(true)}
                        className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
                      >
                        Open Full Ledger View <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {ledgerEntries.length > 0 ? (
                      <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                        <table className="w-full text-left text-xs text-slate-700">
                          <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                            <tr>
                              <th className="p-3">Date</th>
                              <th className="p-3">Type</th>
                              <th className="p-3">Description</th>
                              <th className="p-3">Reference / UTR</th>
                              <th className="p-3 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {ledgerEntries.slice(0, 10).map((entry) => (
                              <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-3 text-slate-500 font-mono text-[11px]">
                                  {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString('en-IN') : '—'}
                                </td>
                                <td className="p-3">
                                  <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-100 text-slate-800">
                                    {entry.entryType || entry.type || 'entry'}
                                  </span>
                                </td>
                                <td className="p-3 text-slate-800 max-w-xs truncate">{entry.description || '—'}</td>
                                <td className="p-3 font-mono text-[10px] text-slate-500">{entry.utr || entry.providerReferenceId || '—'}</td>
                                <td className={`p-3 text-right font-bold font-mono ${
                                  entry.direction === 'credit' ? 'text-emerald-700' : 'text-slate-900'
                                }`}>
                                  {entry.direction === 'credit' ? '+' : '-'}{formatRupees(Number(entry.amountPaise || 0))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500">
                        No financial ledger movements recorded for this vendor yet.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: PERFORMANCE & ACTIONS */}
              {activeTab === 'performance' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                      <p className="text-slate-500">Order Completion Rate</p>
                      <h4 className="text-xl font-bold text-slate-900 mt-1">
                        {summary.totalOrders > 0
                          ? `${((summary.completedOrders / summary.totalOrders) * 100).toFixed(0)}%`
                          : '100%'}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">{summary.completedOrders} delivered of {summary.totalOrders}</p>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                      <p className="text-slate-500">Cancellation & Refund Rate</p>
                      <h4 className="text-xl font-bold text-slate-900 mt-1">
                        {summary.totalOrders > 0
                          ? `${(((summary.cancelledOrders + summary.refundedOrders) / summary.totalOrders) * 100).toFixed(1)}%`
                          : '0.0%'}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">{summary.cancelledOrders} cancelled, {summary.refundedOrders} refunded</p>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                      <p className="text-slate-500">Average Order Value (AOV)</p>
                      <h4 className="text-xl font-bold text-slate-900 mt-1">
                        {summary.totalOrders > 0 ? formatRupees(Math.round(summary.gmvPaise / summary.totalOrders)) : '₹0'}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Across all confirmed customer carts</p>
                    </div>
                  </div>

                  {/* Contextual Jump Actions */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                    <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">Quick Management Shortcuts</h4>
                    <div className="flex flex-wrap gap-3">
                      {onNavigateToProducts && (
                        <button
                          onClick={() => {
                            onClose();
                            onNavigateToProducts();
                          }}
                          className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                        >
                          <Package className="w-3.5 h-3.5 text-emerald-600" /> View Catalog Products
                        </button>
                      )}
                      {onNavigateToOrders && (
                        <button
                          onClick={() => {
                            onClose();
                            onNavigateToOrders();
                          }}
                          className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                        >
                          <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" /> View Orders Foundation
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Asia/Kolkata Business Boundary Active</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-colors cursor-pointer"
          >
            Close Dashboard
          </button>
        </div>
      </div>

      {/* Slide-over Ledger Drawer */}
      <VendorLedgerDrawer
        isOpen={showLedgerDrawer}
        onClose={() => setShowLedgerDrawer(false)}
        vendorId={vendor.id}
        vendorName={vendor.storeName}
        ledgerEntries={ledgerEntries}
      />

      {/* Manual Settlement Release Modal */}
      <InitiateSettlementModal
        isOpen={showSettlementModal}
        onClose={() => setShowSettlementModal(false)}
        vendor={summary}
        onSubmit={handleManualSettlementSubmit}
      />
    </div>
  );
};
