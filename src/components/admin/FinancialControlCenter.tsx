import React, { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Users,
  Store,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Building2,
  Calendar,
  Layers,
  BarChart3,
  PieChart,
  HelpCircle,
  FileSpreadsheet,
  Download
} from 'lucide-react';
import { MarketplaceFinancialSummary } from '../../services/AnalyticsService';

interface FinancialControlCenterProps {
  summary: MarketplaceFinancialSummary;
  dateRangeLabel: string;
}

export const FinancialControlCenter: React.FC<FinancialControlCenterProps> = ({
  summary,
  dateRangeLabel
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'gmv' | 'revenue' | 'liabilities' | 'cash'>('all');

  const formatRupees = (paise: number) => {
    return '₹' + (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  };

  const metrics = [
    // 1. GMV
    {
      num: 1,
      name: 'Gross Merchandise Value (GMV)',
      value: formatRupees(summary.grossMerchandiseValuePaise),
      category: 'gmv',
      definition: 'Total monetary value of all merchandise transactions processed across the marketplace before discounts and refunds.',
      status: 'Authoritative Total'
    },
    // 2. Total & completed orders
    {
      num: 2,
      name: 'Total & Completed Orders',
      value: `${summary.completedOrdersCount} / ${summary.totalOrdersCount}`,
      category: 'gmv',
      definition: 'Completed and delivered customer orders compared against total order volume placed.',
      status: `${((summary.completedOrdersCount / (summary.totalOrdersCount || 1)) * 100).toFixed(0)}% Completion`
    },
    // 3. Prepaid collections
    {
      num: 3,
      name: 'Successful Prepaid Collections',
      value: formatRupees(summary.prepaidCollectionsPaise),
      category: 'cash',
      definition: 'Actual funds captured upfront via online payment gateways (Razorpay, UPI, NetBanking, Cards).',
      status: 'Bank Settled / Captured'
    },
    // 4. COD collections
    {
      num: 4,
      name: 'Cash on Delivery (COD) Status',
      value: `${formatRupees(summary.codCollectedConfirmedPaise)} collected`,
      category: 'cash',
      definition: `COD amounts confirmed as collected by delivery carrier vs. pending collection (${formatRupees(summary.codAwaitingCollectionPaise)} in-transit).`,
      status: 'Carrier Confirmed'
    },
    // 5. Gross product sales
    {
      num: 5,
      name: 'Gross Product Sales',
      value: formatRupees(summary.grossProductSalesPaise),
      category: 'gmv',
      definition: 'Cumulative item catalog price subtotal across all basket items before shipping, tax and coupons.',
      status: 'Catalog Subtotal'
    },
    // 6. Discounts & coupons split
    {
      num: 6,
      name: 'Discounts & Coupon Subsidies',
      value: formatRupees(summary.totalDiscountsPaise),
      category: 'cost',
      definition: `Promotional deductions split by responsibility: Vendor-Funded (${formatRupees(summary.vendorFundedDiscountsPaise)}) vs. Platform-Funded Subsidy (${formatRupees(summary.platformFundedDiscountsPaise)}).`,
      status: 'Dual-Party Funded'
    },
    // 7. Shipping collected
    {
      num: 7,
      name: 'Shipping Charges & Logistics',
      value: formatRupees(summary.shippingCollectedPaise),
      category: 'cost',
      definition: 'Shipping fee collected from customers vs. logistics obligations to carrier partner (Delhivery).',
      status: 'Carrier Clearing'
    },
    // 8. Applicable taxes
    {
      num: 8,
      name: 'Applicable GST Collected',
      value: formatRupees(summary.taxCollectedPaise),
      category: 'cost',
      definition: 'Statutory GST collected on applicable organic agricultural supplies, held for tax remittance.',
      status: 'Tax Liability'
    },
    // 9. Gateway processing fees
    {
      num: 9,
      name: 'Payment Gateway Fees (2% + GST)',
      value: formatRupees(summary.gatewayProcessingFeesPaise + summary.gatewayFeeGstPaise),
      category: 'cost',
      definition: 'Merchant discount rate (MDR) processing fees and 18% GST charged by gateway providers.',
      status: 'Direct Gateway Cost'
    },
    // 10. Platform commission
    {
      num: 10,
      name: 'Platform Commission Revenue',
      value: formatRupees(summary.platformCommissionRevenuePaise),
      category: 'revenue',
      definition: `Net platform fee retained after vendor discounts and gateway fee allocations. Commission GST: ${formatRupees(summary.commissionGstPaise)}.`,
      status: 'Earned Operating Revenue'
    },
    // 11. Refunds & cancellations
    {
      num: 11,
      name: 'Refunds & Chargeback Reversals',
      value: formatRupees(summary.refundsAndChargebacksPaise),
      category: 'cost',
      definition: 'Reversed order payments and cancelled order amounts debited from vendor wallets.',
      status: 'Reversed Transactions'
    },
    // 12. Total vendor earnings accrued
    {
      num: 12,
      name: 'Total Vendor Earnings Accrued',
      value: formatRupees(summary.vendorEarningsAccruedPaise),
      category: 'liabilities',
      definition: 'Net payable amounts calculated for vendor partners across all valid orders.',
      status: 'Vendor Accruals'
    },
    // 13. Total vendor wallet liabilities
    {
      num: 13,
      name: 'Total Vendor Wallet Liabilities',
      value: formatRupees(summary.vendorWalletLiabilitiesPaise),
      category: 'liabilities',
      definition: 'Total outstanding funds owed to all vendor partners across available, pending, and settling buckets.',
      status: 'Immediate Platform Debt'
    },
    // 14. Payouts reserved, processing, paid, failed
    {
      num: 14,
      name: 'Payout Settlement Lifecycle',
      value: `${formatRupees(summary.payoutsPaidPaise)} paid`,
      category: 'liabilities',
      definition: `Processing/Reserved: ${formatRupees(summary.payoutsProcessingPaise + summary.payoutsReservedPaise)} • Needs Review: ${formatRupees(summary.payoutsNeedsReviewPaise)} • Failed: ${formatRupees(summary.payoutsFailedPaise)}.`,
      status: 'Bank Batch Status'
    },
    // 15. Available platform funds
    {
      num: 15,
      name: 'Available Platform Funds',
      value: formatRupees(summary.availablePlatformFundsPaise),
      category: 'cash',
      definition: 'Net liquid cash balance derived from confirmed customer receipts minus completed disbursements and refunds.',
      status: 'Liquid Solvency'
    }
  ];

  const filteredMetrics = activeTab === 'all' 
    ? metrics 
    : metrics.filter(m => m.category === activeTab);

  const exportCSV = () => {
    const headers = ['Metric Number', 'Financial Metric Name', 'Value (INR)', 'Category', 'Authoritative Definition', 'Status'];
    const rows = metrics.map(m => [
      m.num,
      `"${m.name}"`,
      `"${m.value}"`,
      m.category,
      `"${m.definition.replace(/"/g, '""')}"`,
      `"${m.status}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BioCart_Financial_Position_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Controls & Navigation */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          {[
            { id: 'all', label: 'All 15 Metrics' },
            { id: 'gmv', label: 'GMV & Volumes' },
            { id: 'revenue', label: 'Platform Revenue' },
            { id: 'liabilities', label: 'Vendor Liabilities' },
            { id: 'cash', label: 'Cash & Solvency' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors shrink-0"
        >
          <Download className="w-3.5 h-3.5 text-slate-600" />
          Export Financial Report (CSV)
        </button>
      </div>

      {/* 15 Financial Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMetrics.map((metric) => (
          <div
            key={metric.num}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                  #{metric.num}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {metric.status}
                </span>
              </div>

              <h3 className="text-sm font-bold text-slate-900 mt-2">{metric.name}</h3>
              <div className="mt-2 text-2xl font-black text-slate-900 font-mono tracking-tight">
                {metric.value}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-500 leading-relaxed">
                {metric.definition}
              </p>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                <span>Period: {dateRangeLabel}</span>
                <span>Currency: INR (₹)</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
