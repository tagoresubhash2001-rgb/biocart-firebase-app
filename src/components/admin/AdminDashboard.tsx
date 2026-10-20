import React, { useEffect, useState } from 'react';
import { AdminService } from '../../services/AdminService';
import { Product, CategoryItem, VendorItem, Review, StoreSettings, AuditLog } from '../../types';
import {
  DollarSign,
  ShoppingBag,
  Users,
  Store,
  Package,
  AlertTriangle,
  Star,
  TrendingUp,
  ArrowUpRight,
  RefreshCw,
  CheckCircle2,
  Clock,
  Sparkles,
  CreditCard,
  Banknote,
  RotateCcw,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { AdminSection } from './AdminLayout';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  AnalyticsService,
  DateRangePreset,
  MarketplaceFinancialSummary
} from '../../services/AnalyticsService';

interface AdminDashboardProps {
  onNavigate: (section: AdminSection) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const { addToast } = useApp();
  const { userProfile } = useAuth();

  // Time Filter State
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('this_month');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  // Subscribed Entities
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [financialLedger, setFinancialLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setLoading(true);
    let loaded = 0;
    const checkLoaded = () => {
      loaded++;
      if (loaded >= 5) setLoading(false);
    };

    AdminService.seedInitialCatalogIfEmpty().catch(console.error);

    const unsubProducts = AdminService.subscribeToProducts((list) => {
      setProducts(list);
      checkLoaded();
    });
    const unsubCategories = AdminService.subscribeToCategories((list) => {
      setCategories(list);
      checkLoaded();
    });
    const unsubVendors = AdminService.subscribeToVendors((list) => {
      setVendors(list);
      checkLoaded();
    });
    const unsubReviews = AdminService.subscribeToReviews((list) => setReviews(list));
    const unsubUsers = AdminService.subscribeToUsers((list) => setUsers(list));
    const unsubOrders = AdminService.subscribeToOrders((list) => {
      setOrders(list);
      checkLoaded();
    });
    const unsubWallets = AdminService.subscribeToVendorWallets((list) => setWallets(list));
    const unsubSettlements = AdminService.subscribeToSettlements((list) => setSettlements(list));
    const unsubLogs = AdminService.subscribeToAuditLogs((list) => setAuditLogs(list));
    const unsubLedger = AdminService.subscribeToFinancialLedger((list) => {
      setFinancialLedger(list);
      checkLoaded();
    });

    return () => {
      unsubProducts();
      unsubCategories();
      unsubVendors();
      unsubReviews();
      unsubUsers();
      unsubOrders();
      unsubWallets();
      unsubSettlements();
      unsubLogs();
      unsubLedger();
    };
  }, []);

  const handleSyncCatalog = async () => {
    try {
      setIsSyncing(true);
      const res = await AdminService.syncMasterCatalog({
        id: userProfile?.uid || 'admin',
        email: userProfile?.email || 'admin@biocart.in'
      });
      addToast(`Catalog synced: ${res.products} products, ${res.categories} categories`, 'success');
    } catch (err: any) {
      console.error('Failed to sync master catalog:', err);
      addToast(err.message || 'Catalog synchronization failed', 'warning');
    } finally {
      setIsSyncing(false);
    }
  };

  // Resolve Asia/Kolkata date boundaries & comparison period
  const { current: dateRange, previous: prevDateRange } = AnalyticsService.getDateRange(
    dateRangePreset,
    customStart ? new Date(customStart) : undefined,
    customEnd ? new Date(customEnd) : undefined
  );

  // Filter orders by active date range
  const filteredOrders = orders.filter((o) => {
    const rawDate = o.createdAt?.seconds 
      ? o.createdAt.seconds * 1000 
      : new Date(o.createdAt || o.date || 0).getTime();
    return rawDate >= dateRange.start.getTime() && rawDate <= dateRange.end.getTime();
  });

  // Filter comparison orders
  const comparisonOrders = orders.filter((o) => {
    const rawDate = o.createdAt?.seconds 
      ? o.createdAt.seconds * 1000 
      : new Date(o.createdAt || o.date || 0).getTime();
    return rawDate >= prevDateRange.start.getTime() && rawDate <= prevDateRange.end.getTime();
  });

  // Calculate authoritative 15 marketplace metrics for selected period
  const financialSummary: MarketplaceFinancialSummary = AnalyticsService.aggregateMarketplaceFinancials(
    filteredOrders,
    wallets,
    settlements,
    financialLedger,
    dateRange
  );

  const prevSummary: MarketplaceFinancialSummary = AnalyticsService.aggregateMarketplaceFinancials(
    comparisonOrders,
    wallets,
    settlements,
    financialLedger,
    prevDateRange
  );

  const formatRupees = (paise: number) => {
    return '₹' + (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  };

  const calculatePctDelta = (current: number, prev: number) => {
    if (prev === 0) return current > 0 ? '+100%' : '0%';
    const pct = ((current - prev) / prev) * 100;
    return (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
  };

  // Operational items
  const activeProducts = products.filter((p) => p.active !== false).length;
  const outOfStockProducts = products.filter((p) => !p.inStock || (p.stockQuantity !== undefined && p.stockQuantity <= 0)).length;
  const pendingReviews = reviews.filter((r) => r.status === 'pending').length;
  const pendingVendors = vendors.filter((v) => v.status === 'pending').length;
  const delayedOrders = orders.filter((o) => o.status === 'processing' && !o.trackingNumber).length;
  const uncollectedCodOrders = orders.filter((o) => o.paymentMethod === 'cod' && o.paymentStatus !== 'paid' && o.status !== 'cancelled').length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
        <p className="text-xs text-[#777777] font-mono">Syncing real-time Firestore database metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Date-Range Controller */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 rounded-3xl border border-slate-700 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono mb-1">
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span>LIVE FIRESTORE REAL-TIME CONTROL • ASIA/KOLKATA (IST)</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Marketplace Executive Operations</h1>
          <p className="text-xs text-slate-300 mt-1">Authoritative gross merchandise value, net sales, vendor liabilities, and queue alerts.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Time Preset Dropdown */}
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-white">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <select
              value={dateRangePreset}
              onChange={(e) => setDateRangePreset(e.target.value as DateRangePreset)}
              className="bg-transparent text-xs font-semibold text-white outline-none cursor-pointer"
            >
              <option value="today" className="bg-slate-900">Today</option>
              <option value="yesterday" className="bg-slate-900">Yesterday</option>
              <option value="this_week" className="bg-slate-900">This Week</option>
              <option value="previous_week" className="bg-slate-900">Previous Week</option>
              <option value="this_month" className="bg-slate-900">This Month</option>
              <option value="previous_month" className="bg-slate-900">Previous Month</option>
              <option value="this_year" className="bg-slate-900">This Year</option>
              <option value="previous_year" className="bg-slate-900">Previous Year</option>
              <option value="custom" className="bg-slate-900">Custom Date Range</option>
            </select>
          </div>

          {dateRangePreset === 'custom' && (
            <div className="flex items-center gap-1.5 text-xs text-white">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-600 rounded-xl bg-slate-800 text-white font-mono text-xs outline-none"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-600 rounded-xl bg-slate-800 text-white font-mono text-xs outline-none"
              />
            </div>
          )}

          <button
            onClick={() => onNavigate('financials')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-900/30 transition-all flex items-center gap-2 cursor-pointer"
          >
            <DollarSign className="w-4 h-4" />
            Financial Control Center
          </button>
        </div>
      </div>

      {/* Primary Executive Financial Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* GMV */}
        <div 
          onClick={() => onNavigate('financials')}
          className="group cursor-pointer p-5 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl transition-all shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gross Merchandise Value</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-105 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {formatRupees(financialSummary.grossMerchandiseValuePaise)}
            </h2>
            <div className="flex items-center gap-1.5 mt-1 text-[11px]">
              <span className="font-semibold text-emerald-700">
                {calculatePctDelta(financialSummary.grossMerchandiseValuePaise, prevSummary.grossMerchandiseValuePaise)}
              </span>
              <span className="text-slate-400">vs. previous period</span>
            </div>
          </div>
        </div>

        {/* Net Sales */}
        <div 
          onClick={() => onNavigate('financials')}
          className="group cursor-pointer p-5 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl transition-all shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Net Sales (Gross - Returns)</span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 group-hover:scale-105 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {formatRupees(financialSummary.grossProductSalesPaise - financialSummary.refundsAndChargebacksPaise)}
            </h2>
            <p className="text-[11px] text-slate-500 mt-1">Excludes cancelled & refunded items</p>
          </div>
        </div>

        {/* Orders Completion Ratio */}
        <div 
          onClick={() => onNavigate('orders')}
          className="group cursor-pointer p-5 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl transition-all shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Completed Orders</span>
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 group-hover:scale-105 transition-transform">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {financialSummary.completedOrdersCount} <span className="text-sm font-normal text-slate-500">/ {financialSummary.totalOrdersCount} Total</span>
            </h2>
            <p className="text-[11px] text-slate-500 mt-1">
              Delivered customer orders ({((financialSummary.completedOrdersCount / (financialSummary.totalOrdersCount || 1)) * 100).toFixed(0)}% fulfilled)
            </p>
          </div>
        </div>

        {/* Vendor Wallet Liabilities */}
        <div 
          onClick={() => onNavigate('financials')}
          className="group cursor-pointer p-5 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl transition-all shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vendor Liabilities</span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 group-hover:scale-105 transition-transform">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {formatRupees(financialSummary.vendorWalletLiabilitiesPaise)}
            </h2>
            <p className="text-[11px] text-slate-500 mt-1">Available + Pending + Settling obligations</p>
          </div>
        </div>
      </div>

      {/* Secondary Financial Breakdown: Inflows vs Platform Retention */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Cash Inflow Breakdown */}
        <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="font-bold text-xs text-slate-900 uppercase tracking-wider">Cash Inflows & Payments</span>
            <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">Captured</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600">Prepaid Gateways Captured:</span>
              <span className="font-bold text-slate-900">{formatRupees(financialSummary.prepaidCollectionsPaise)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Confirmed COD Delivered:</span>
              <span className="font-bold text-slate-900">{formatRupees(financialSummary.codCollectedConfirmedPaise)}</span>
            </div>
            <div className="flex justify-between text-amber-700 font-semibold">
              <span>COD Awaiting Delivery:</span>
              <span>{formatRupees(financialSummary.codAwaitingCollectionPaise)}</span>
            </div>
          </div>
        </div>

        {/* Platform Revenue & Subsidies */}
        <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="font-bold text-xs text-slate-900 uppercase tracking-wider">Marketplace Net Margin</span>
            <span className="text-[10px] font-mono text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full font-bold">Retained</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600">Commission Revenue:</span>
              <span className="font-bold text-emerald-700">{formatRupees(financialSummary.platformCommissionRevenuePaise)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Platform Coupon Subsidies:</span>
              <span className="font-semibold text-slate-700">-{formatRupees(financialSummary.platformFundedDiscountsPaise)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Gateway Fees (2%+GST):</span>
              <span className="font-semibold text-slate-700">-{formatRupees(financialSummary.gatewayProcessingFeesPaise + financialSummary.gatewayFeeGstPaise)}</span>
            </div>
          </div>
        </div>

        {/* Solvency & Disbursal Status */}
        <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="font-bold text-xs text-slate-900 uppercase tracking-wider">Platform Liquid Solvency</span>
            <span className="text-[10px] font-mono text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full font-bold">Liquid Reserve</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600">Disbursed Bank Payouts:</span>
              <span className="font-bold text-slate-900">{formatRupees(financialSummary.payoutsPaidPaise)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Active Payouts Processing:</span>
              <span className="font-bold text-blue-700">{formatRupees(financialSummary.payoutsProcessingPaise)}</span>
            </div>
            <div className="flex justify-between font-bold text-emerald-800 pt-1 border-t border-slate-200">
              <span>Available Liquid Balance:</span>
              <span className="text-sm">{formatRupees(financialSummary.availablePlatformFundsPaise)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Alerts & Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Required Operational Action Queue */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Operational Action Queue
            </h3>
            <span className="text-[11px] font-mono text-slate-500">Real-Time Dispatch Queue</span>
          </div>

          <div className="space-y-3 text-xs">
            {pendingVendors > 0 ? (
              <div 
                onClick={() => onNavigate('vendors')} 
                className="p-3 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer hover:bg-amber-100/60 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-amber-900">{pendingVendors} Pending Vendor Application(s)</p>
                    <p className="text-[11px] text-amber-700">Review business licenses and approve marketplace seller status.</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-amber-700" />
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <p className="text-emerald-800">All vendor onboarding applications are up to date.</p>
              </div>
            )}

            {outOfStockProducts > 0 && (
              <div 
                onClick={() => onNavigate('products')} 
                className="p-3 bg-purple-50 border border-purple-200 rounded-xl cursor-pointer hover:bg-purple-100/60 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-purple-900">{outOfStockProducts} Out of Stock / Low Stock Item(s)</p>
                    <p className="text-[11px] text-purple-700">Update inventory levels or notify vendor suppliers.</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-purple-700" />
              </div>
            )}

            {uncollectedCodOrders > 0 && (
              <div 
                onClick={() => onNavigate('orders')} 
                className="p-3 bg-blue-50 border border-blue-200 rounded-xl cursor-pointer hover:bg-blue-100/60 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-blue-900">{uncollectedCodOrders} Active Cash on Delivery Deliveries</p>
                    <p className="text-[11px] text-blue-700">Awaiting carrier remittance and delivery confirmation.</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-blue-700" />
              </div>
            )}

            {pendingReviews > 0 && (
              <div 
                onClick={() => onNavigate('reviews')} 
                className="p-3 bg-rose-50 border border-rose-200 rounded-xl cursor-pointer hover:bg-rose-100/60 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-100 text-rose-700 rounded-lg">
                    <Star className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-rose-900">{pendingReviews} Unmoderated Product Review(s)</p>
                    <p className="text-[11px] text-rose-700">Approve customer feedback for visible display on product pages.</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-rose-700" />
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity Audit Trail */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              Recent Admin Activity Log
            </h3>
            <button onClick={() => onNavigate('audit-logs')} className="text-[11px] font-bold text-emerald-700 hover:underline">
              View All Logs
            </button>
          </div>

          <div className="space-y-2.5">
            {auditLogs.length > 0 ? (
              auditLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <div className="truncate max-w-[70%]">
                    <p className="text-slate-800 font-medium truncate">{log.action}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{log.actorEmail}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">No recent audit logs recorded yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Featured Catalog Summary Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <h3 className="font-semibold text-sm text-slate-900">BioCart Featured Catalog Summary</h3>
            <p className="text-[11px] text-slate-500">Live products controlling customer homepage & shop categories</p>
          </div>
          <button
            onClick={() => onNavigate('products')}
            className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
          >
            Manage Catalog <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase font-mono text-[10px]">
              <tr>
                <th className="p-3">Product Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">SKU</th>
                <th className="p-3">Price</th>
                <th className="p-3">MRP</th>
                <th className="p-3">Stock Status</th>
                <th className="p-3">Flags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.slice(0, 6).map((product) => (
                <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-medium text-slate-900 flex items-center gap-3">
                    <img src={product.image} alt={product.name} className="w-8 h-8 rounded-lg object-cover bg-slate-100" />
                    <span className="truncate max-w-[200px]">{product.name}</span>
                  </td>
                  <td className="p-3 text-slate-500">{product.category}</td>
                  <td className="p-3 font-mono text-[11px] text-slate-500">{product.sku}</td>
                  <td className="p-3 font-semibold text-emerald-700">₹{product.price}</td>
                  <td className="p-3 text-slate-400 line-through">₹{product.mrp}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      product.inStock ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {product.stockStatus}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      {product.isFeatured && <span className="px-1.5 py-0.5 text-[9px] bg-blue-100 text-blue-800 rounded">Featured</span>}
                      {product.isBestSeller && <span className="px-1.5 py-0.5 text-[9px] bg-amber-100 text-amber-800 rounded">BestSeller</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
