import React, { useState } from 'react';
import {
  TrendingUp,
  BarChart3,
  PieChart,
  ShoppingBag,
  DollarSign,
  Package,
  Layers,
  ArrowUpRight,
  Filter,
  CreditCard,
  RotateCcw,
  Store,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import { AnalyticsService, DateRange, MarketplaceFinancialSummary } from '../../services/AnalyticsService';

interface RealTimeAnalyticsChartsProps {
  orders: any[];
  categories: any[];
  products: any[];
  vendors?: any[];
  financialSummary: MarketplaceFinancialSummary;
  dateRange: DateRange;
}

export const RealTimeAnalyticsCharts: React.FC<RealTimeAnalyticsChartsProps> = ({
  orders,
  categories,
  products,
  vendors = [],
  financialSummary,
  dateRange
}) => {
  const [timeDimension, setTimeDimension] = useState<'hourly' | 'daily' | 'monthly'>('daily');
  const [activeMetricTab, setActiveMetricTab] = useState<'gmv' | 'orders' | 'commission'>('gmv');

  const timeSeries = AnalyticsService.generateTimeSeriesData(orders, dateRange, timeDimension);
  const categoryStats = AnalyticsService.aggregateCategoryPerformance(orders, categories);
  const { topProducts, lowProducts } = AnalyticsService.aggregateProductPerformance(orders, products);

  const maxSeriesValue = Math.max(...timeSeries.map(s => s[activeMetricTab]), 1);

  // Distribution 1: Order Status Breakdown
  const totalOrders = financialSummary.totalOrdersCount || orders.length || 1;
  const statusStats = [
    { label: 'Completed', count: financialSummary.completedOrdersCount, color: 'bg-emerald-500', textColor: 'text-emerald-700', bgLight: 'bg-emerald-50' },
    { label: 'Pending', count: financialSummary.pendingOrdersCount, color: 'bg-amber-500', textColor: 'text-amber-700', bgLight: 'bg-amber-50' },
    { label: 'Cancelled', count: financialSummary.cancelledOrdersCount, color: 'bg-slate-400', textColor: 'text-slate-700', bgLight: 'bg-slate-50' },
    { label: 'Refunded', count: financialSummary.refundedOrdersCount, color: 'bg-rose-500', textColor: 'text-rose-700', bgLight: 'bg-rose-50' }
  ].map(s => ({ ...s, percent: Math.round((s.count / totalOrders) * 100) }));

  // Distribution 2: Payment Method Breakdown
  const totalInflowsPaise = (financialSummary.prepaidCollectionsPaise + financialSummary.codCollectedConfirmedPaise + financialSummary.codAwaitingCollectionPaise) || 1;
  const paymentStats = [
    {
      label: 'Prepaid Gateways',
      amountPaise: financialSummary.prepaidCollectionsPaise,
      color: 'bg-blue-500',
      textColor: 'text-blue-700',
      percent: Math.round((financialSummary.prepaidCollectionsPaise / totalInflowsPaise) * 100)
    },
    {
      label: 'COD Delivered',
      amountPaise: financialSummary.codCollectedConfirmedPaise,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-700',
      percent: Math.round((financialSummary.codCollectedConfirmedPaise / totalInflowsPaise) * 100)
    },
    {
      label: 'COD In-Transit',
      amountPaise: financialSummary.codAwaitingCollectionPaise,
      color: 'bg-amber-500',
      textColor: 'text-amber-700',
      percent: Math.round((financialSummary.codAwaitingCollectionPaise / totalInflowsPaise) * 100)
    }
  ];

  // Distribution 3: Vendor Contribution
  const vendorGmvMap = new Map<string, { storeName: string; gmv: number; orders: number }>();
  for (const order of orders) {
    const vId = order.vendorId || (order.vendorIds && order.vendorIds[0]) || 'biocart';
    const amount = Number(order.totalAmount || (order.totalAmountPaise ? order.totalAmountPaise / 100 : 0));
    const cur = vendorGmvMap.get(vId) || {
      storeName: vendors.find(v => v.id === vId)?.storeName || vId,
      gmv: 0,
      orders: 0
    };
    vendorGmvMap.set(vId, {
      storeName: cur.storeName,
      gmv: cur.gmv + amount,
      orders: cur.orders + 1
    });
  }
  const totalMarketGmv = Array.from(vendorGmvMap.values()).reduce((sum, v) => sum + v.gmv, 0) || 1;
  const vendorStats = Array.from(vendorGmvMap.entries())
    .map(([id, d]) => ({
      vendorId: id,
      storeName: d.storeName,
      gmv: d.gmv,
      orders: d.orders,
      sharePercent: Math.round((d.gmv / totalMarketGmv) * 100)
    }))
    .sort((a, b) => b.gmv - a.gmv)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* 1. Time-Based Interactive Performance Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">Time-Based Marketplace Performance</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Interactive timeline analysis ({dateRange.label}) • Dimension: {timeDimension}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Metric Switch */}
            <div className="flex bg-slate-100 p-0.5 rounded-xl text-xs font-semibold">
              {(['gmv', 'orders', 'commission'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setActiveMetricTab(m)}
                  className={`px-3 py-1 rounded-lg uppercase transition-colors ${
                    activeMetricTab === m
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Granularity Switch */}
            <div className="flex bg-slate-100 p-0.5 rounded-xl text-xs font-semibold">
              {(['hourly', 'daily', 'monthly'] as const).map((dim) => (
                <button
                  key={dim}
                  onClick={() => setTimeDimension(dim)}
                  className={`px-2.5 py-1 rounded-lg capitalize transition-colors ${
                    timeDimension === dim
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {dim}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Visual Bar Chart */}
        {timeSeries.length === 0 ? (
          <div className="h-56 flex items-center justify-center text-xs text-slate-400">
            No transaction events recorded for this selected timeline.
          </div>
        ) : (
          <div className="space-y-2">
            <div className="h-52 flex items-end gap-2 pt-6 pb-2 overflow-x-auto">
              {timeSeries.map((point, idx) => {
                const val = point[activeMetricTab];
                const heightPct = Math.max(8, Math.round((val / maxSeriesValue) * 100));
                return (
                  <div key={idx} className="flex-1 min-w-[36px] flex flex-col items-center gap-1.5 group">
                    {/* Tooltip on hover */}
                    <span className="text-[10px] font-mono font-bold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                      {activeMetricTab === 'orders' ? val : `₹${Math.round(val).toLocaleString('en-IN')}`}
                    </span>
                    <div className="w-full bg-slate-100 rounded-t-lg overflow-hidden h-36 flex items-end">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full transition-all duration-500 rounded-t-lg ${
                          activeMetricTab === 'commission'
                            ? 'bg-amber-500 group-hover:bg-amber-600'
                            : 'bg-emerald-600 group-hover:bg-emerald-700'
                        }`}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-slate-400 truncate max-w-[44px]">
                      {point.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-2 font-mono">
              <span>Peak: {activeMetricTab === 'orders' ? maxSeriesValue : `₹${Math.round(maxSeriesValue).toLocaleString('en-IN')}`}</span>
              <span>Data points: {timeSeries.length}</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Order Status & Payment Method Donut/Bar Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Status Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-purple-600" />
              <h3 className="text-sm font-bold text-slate-900">Order Status Distribution</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">{financialSummary.totalOrdersCount} Total Orders</span>
          </div>

          <div className="space-y-3">
            {/* Multi-segment Progress Bar */}
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
              {statusStats.map((st, i) => (
                <div
                  key={i}
                  style={{ width: `${st.percent}%` }}
                  className={`${st.color} h-full transition-all duration-300`}
                  title={`${st.label}: ${st.count} (${st.percent}%)`}
                />
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              {statusStats.map((st, i) => (
                <div key={i} className={`p-2.5 rounded-xl border border-slate-100 ${st.bgLight} flex flex-col justify-between`}>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${st.color}`} />
                    <span className="text-[11px] font-semibold text-slate-700">{st.label}</span>
                  </div>
                  <div className="mt-1">
                    <span className={`text-sm font-bold font-mono ${st.textColor}`}>{st.count}</span>
                    <span className="text-[10px] text-slate-400 ml-1">({st.percent}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Payment Method Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Payment Inflow Distribution</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">Real-time Collections</span>
          </div>

          <div className="space-y-3">
            {/* Multi-segment Progress Bar */}
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
              {paymentStats.map((pt, i) => (
                <div
                  key={i}
                  style={{ width: `${pt.percent}%` }}
                  className={`${pt.color} h-full transition-all duration-300`}
                  title={`${pt.label}: ₹${Math.round(pt.amountPaise / 100).toLocaleString('en-IN')} (${pt.percent}%)`}
                />
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
              {paymentStats.map((pt, i) => (
                <div key={i} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${pt.color}`} />
                    <span className="text-[11px] font-semibold text-slate-700">{pt.label}</span>
                  </div>
                  <div className="mt-1">
                    <span className="text-xs font-bold font-mono text-slate-900">
                      ₹{Math.round(pt.amountPaise / 100).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-slate-400 block">{pt.percent}% of inflows</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Category Sales & Vendor Contribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Contribution */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Category Sales & Contribution</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">Ranked by GMV</span>
          </div>

          <div className="space-y-3">
            {categoryStats.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No category sales recorded yet.</div>
            ) : (
              categoryStats.map((cat, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                    <span>{cat.category}</span>
                    <span className="font-mono">₹{cat.gmv.toLocaleString('en-IN')} ({cat.sharePercent}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${cat.sharePercent}%` }}
                      className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>{cat.orders} orders</span>
                    <span>{cat.units} units sold</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Vendor Contribution */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900">Vendor Sales Contribution</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">Top Partners by GMV</span>
          </div>

          <div className="space-y-3">
            {vendorStats.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No vendor sales recorded in this period.</div>
            ) : (
              vendorStats.map((ven, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                    <span className="truncate max-w-[180px]">{ven.storeName}</span>
                    <span className="font-mono">₹{ven.gmv.toLocaleString('en-IN')} ({ven.sharePercent}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${ven.sharePercent}%` }}
                      className="bg-amber-500 h-full rounded-full transition-all duration-300"
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>{ven.orders} orders</span>
                    <span>ID: {ven.vendorId}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 4. Top Products vs Stock Insights & Commission vs Vendor Net */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Analytics: Top vs Low Performing */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Product Velocity & Top Performers</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">Revenue Ranking</span>
          </div>

          <div className="space-y-2.5">
            {topProducts.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No products sold in this period.</div>
            ) : (
              topProducts.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono font-bold text-[10px] text-slate-400">#{idx + 1}</span>
                    <span className="font-semibold text-slate-800 truncate max-w-[180px]">{p.name}</span>
                  </div>
                  <div className="text-right font-mono text-xs">
                    <span className="font-bold text-slate-900">₹{p.revenue.toLocaleString('en-IN')}</span>
                    <span className="text-[10px] text-slate-400 block font-sans">{p.units} units</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {lowProducts.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100">
              <div className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Attention Required: Low Volume in Stock</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {lowProducts.map((lp, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-amber-50 text-amber-900 border border-amber-200">
                    {lp.name} ({lp.stock} in stock)
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Platform Commission vs Vendor Net Earnings Comparison */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Commission vs Vendor Split</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">Financial Split</span>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-slate-800">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  Vendor Net Earnings Accrued
                </span>
                <span className="font-mono">
                  ₹{Math.round(financialSummary.vendorEarningsAccruedPaise / 100).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div
                  style={{
                    width: `${Math.round(
                      (financialSummary.vendorEarningsAccruedPaise /
                        ((financialSummary.vendorEarningsAccruedPaise + financialSummary.platformCommissionRevenuePaise) || 1)) *
                        100
                    )}%`
                  }}
                  className="bg-emerald-600 h-full rounded-full transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-200">
              <div className="flex justify-between text-xs font-semibold text-slate-800">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  Platform Retained Commission
                </span>
                <span className="font-mono text-blue-700">
                  ₹{Math.round(financialSummary.platformCommissionRevenuePaise / 100).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div
                  style={{
                    width: `${Math.round(
                      (financialSummary.platformCommissionRevenuePaise /
                        ((financialSummary.vendorEarningsAccruedPaise + financialSummary.platformCommissionRevenuePaise) || 1)) *
                        100
                    )}%`
                  }}
                  className="bg-blue-600 h-full rounded-full transition-all"
                />
              </div>
            </div>

            <div className="pt-2 text-[11px] text-slate-500 flex justify-between">
              <span>Settlement Payout Status:</span>
              <span className="font-semibold text-emerald-700">
                ₹{Math.round(financialSummary.payoutsPaidPaise / 100).toLocaleString('en-IN')} Paid / ₹{Math.round(financialSummary.payoutsProcessingPaise / 100).toLocaleString('en-IN')} Processing
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
