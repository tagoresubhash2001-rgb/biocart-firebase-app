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
  Filter
} from 'lucide-react';
import { AnalyticsService, DateRange } from '../../services/AnalyticsService';

interface RealTimeAnalyticsChartsProps {
  orders: any[];
  categories: any[];
  products: any[];
  dateRange: DateRange;
}

export const RealTimeAnalyticsCharts: React.FC<RealTimeAnalyticsChartsProps> = ({
  orders,
  categories,
  products,
  dateRange
}) => {
  const [timeDimension, setTimeDimension] = useState<'hourly' | 'daily' | 'monthly'>('daily');
  const [activeMetricTab, setActiveMetricTab] = useState<'gmv' | 'orders' | 'commission'>('gmv');

  const timeSeries = AnalyticsService.generateTimeSeriesData(orders, dateRange, timeDimension);
  const categoryStats = AnalyticsService.aggregateCategoryPerformance(orders, categories);
  const { topProducts, lowProducts } = AnalyticsService.aggregateProductPerformance(orders, products);

  const maxSeriesValue = Math.max(...timeSeries.map(s => s[activeMetricTab]), 1);

  return (
    <div className="space-y-6">
      {/* Time-Based Performance Chart */}
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

      {/* Category Performance & Contribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        {/* Product Analytics: Top vs Low Performing */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Product Velocity & Stock Insights</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">Top Revenue Performers</span>
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
      </div>
    </div>
  );
};
