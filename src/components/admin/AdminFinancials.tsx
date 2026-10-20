import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  BarChart3,
  Store,
  Calendar,
  Layers,
  RefreshCw,
  Download,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { AdminService } from '../../services/AdminService';
import {
  AnalyticsService,
  DateRange,
  DateRangePreset,
  MarketplaceFinancialSummary,
  VendorFinancialSummary
} from '../../services/AnalyticsService';
import { FinancialControlCenter } from './FinancialControlCenter';
import { VendorFinancials } from './VendorFinancials';
import { RealTimeAnalyticsCharts } from './RealTimeAnalyticsCharts';

export const AdminFinancials: React.FC = () => {
  // Global Date-Range State
  const [dateRangeType, setDateRangeType] = useState<DateRangePreset>('this_month');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'vendors' | 'analytics'>('overview');

  // Subscribed Data
  const [orders, setOrders] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [financialLedger, setFinancialLedger] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Subscriptions
  useEffect(() => {
    setLoading(true);
    let loadedCount = 0;
    const checkLoaded = () => {
      loadedCount++;
      if (loadedCount >= 6) {
        setLoading(false);
      }
    };

    const unsubOrders = AdminService.subscribeToOrders((list) => {
      setOrders(list);
      checkLoaded();
    });

    const unsubVendors = AdminService.subscribeToVendors((list) => {
      setVendors(list);
      checkLoaded();
    });

    const unsubWallets = AdminService.subscribeToVendorWallets((list) => {
      setWallets(list);
      checkLoaded();
    });

    const unsubSettlements = AdminService.subscribeToSettlements((list) => {
      setSettlements(list);
      checkLoaded();
    });

    const unsubLedger = AdminService.subscribeToFinancialLedger((list) => {
      setFinancialLedger(list);
      checkLoaded();
    });

    const unsubCategories = AdminService.subscribeToCategories((list) => {
      setCategories(list);
      checkLoaded();
    });

    const unsubProducts = AdminService.subscribeToProducts((list) => {
      setProducts(list);
    });

    return () => {
      unsubOrders();
      unsubVendors();
      unsubWallets();
      unsubSettlements();
      unsubLedger();
      unsubCategories();
      unsubProducts();
    };
  }, []);

  // Compute Current Date Range
  const { current: dateRange } = AnalyticsService.getDateRange(
    dateRangeType,
    customStart ? new Date(customStart) : undefined,
    customEnd ? new Date(customEnd) : undefined
  );

  // Filter Orders by Date Range
  const filteredOrders = orders.filter((o) => {
    const rawDate = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt || o.date || 0);
    return rawDate >= dateRange.start && rawDate <= dateRange.end;
  });

  // Calculate 15 Marketplace Financial Metrics
  const financialSummary: MarketplaceFinancialSummary = AnalyticsService.aggregateMarketplaceFinancials(
    filteredOrders,
    wallets,
    settlements,
    financialLedger
  );

  // Build Vendor Summaries
  const vendorSummaries: VendorFinancialSummary[] = AnalyticsService.buildVendorFinancialSummaries(
    vendors,
    wallets,
    settlements,
    filteredOrders
  );

  return (
    <div className="space-y-6">
      {/* Top Header & Global Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 text-xs font-mono font-bold tracking-wider uppercase mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Authoritative Financial Control & Analytics</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Financial Control Center & Real-Time BI
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Double-entry reconciliation, multi-vendor wallet liabilities, manual settlements & performance trends.
            </p>
          </div>

          {/* Date Range Selector */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              <select
                value={dateRangeType}
                onChange={(e) => setDateRangeType(e.target.value as any)}
                className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="this_week">This Week</option>
                <option value="previous_week">Previous Week</option>
                <option value="this_month">This Month</option>
                <option value="previous_month">Previous Month</option>
                <option value="this_year">This Year</option>
                <option value="previous_year">Previous Year</option>
                <option value="custom">Custom Date Range</option>
              </select>
            </div>

            {dateRangeType === 'custom' && (
              <div className="flex items-center gap-1.5 text-xs">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-700 font-mono text-xs outline-none"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-700 font-mono text-xs outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 mt-6 -mb-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'overview'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Marketplace Overview ({financialSummary.totalOrdersCount} orders)
          </button>
          <button
            onClick={() => setActiveTab('vendors')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'vendors'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Store className="w-4 h-4" />
            Vendor Wallets & Settlements ({vendorSummaries.length} vendors)
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'analytics'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Real-Time Analytics & BI
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
          <p className="text-xs text-slate-400 font-mono">Loading real-time financial snapshots & double-entry ledgers...</p>
        </div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <FinancialControlCenter
              summary={financialSummary}
              dateRangeLabel={dateRange.label}
            />
          )}

          {activeTab === 'vendors' && (
            <VendorFinancials
              vendorSummaries={vendorSummaries}
              ledgerEntries={financialLedger}
            />
          )}

          {activeTab === 'analytics' && (
            <RealTimeAnalyticsCharts
              orders={filteredOrders}
              categories={categories}
              products={products}
              dateRange={dateRange}
            />
          )}
        </>
      )}
    </div>
  );
};
