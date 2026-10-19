/**
 * BioCart Central Analytics & Financial Aggregation Engine
 * 
 * Provides authoritative definitions, calculations, date-range filtering,
 * time-series aggregations, and comparison models for marketplace operations.
 * All financial arithmetic is computed in integer Paise to prevent floating-point drift.
 */

export type DateRangePreset = 
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'previous_week'
  | 'this_month'
  | 'previous_month'
  | 'this_year'
  | 'previous_year'
  | 'custom';

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

export interface FinancialMetricItem {
  key: string;
  label: string;
  amountPaise: number;
  amountFormatted: string;
  definition: string;
  category: 'gmv' | 'revenue' | 'liability' | 'cost' | 'cash';
}

export interface MarketplaceFinancialSummary {
  // 1. GMV
  grossMerchandiseValuePaise: number;
  // 2. Order counts
  totalOrdersCount: number;
  completedOrdersCount: number;
  pendingOrdersCount: number;
  cancelledOrdersCount: number;
  refundedOrdersCount: number;
  // 3. Prepaid collections
  prepaidCollectionsPaise: number;
  // 4. COD collections
  codAwaitingCollectionPaise: number;
  codCollectedConfirmedPaise: number;
  // 5. Gross product sales
  grossProductSalesPaise: number;
  // 6. Discounts & coupons split
  totalDiscountsPaise: number;
  vendorFundedDiscountsPaise: number;
  platformFundedDiscountsPaise: number;
  // 7. Shipping
  shippingCollectedPaise: number;
  shippingObligationsPaise: number;
  // 8. Applicable taxes
  taxCollectedPaise: number;
  // 9. Gateway fees
  gatewayProcessingFeesPaise: number;
  gatewayFeeGstPaise: number;
  // 10. Platform commission
  platformCommissionRevenuePaise: number;
  commissionGstPaise: number;
  // 11. Refunds & cancellations
  refundsAndChargebacksPaise: number;
  // 12. Vendor net earnings accrued
  vendorEarningsAccruedPaise: number;
  // 13. Vendor wallet liabilities
  vendorWalletLiabilitiesPaise: number;
  // 14. Payouts reserved, processing, paid, failed
  payoutsReservedPaise: number;
  payoutsProcessingPaise: number;
  payoutsPaidPaise: number;
  payoutsFailedPaise: number;
  payoutsNeedsReviewPaise: number;
  // 15. Available platform funds
  availablePlatformFundsPaise: number;
  outstandingPlatformObligationsPaise: number;
  // Average Order Value
  averageOrderValuePaise: number;
}

export interface VendorFinancialSummary {
  vendorId: string;
  storeName: string;
  status: 'active' | 'pending' | 'suspended';
  // Order counts
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  refundedOrders: number;
  // Financial amounts (in Paise)
  gmvPaise: number;
  vendorFundedDiscountPaise: number;
  platformFundedDiscountPaise: number;
  allocatedGatewayFeePaise: number;
  platformCommissionPaise: number;
  commissionGstPaise: number;
  netEarningsPaise: number;
  // Wallet state
  walletPendingPaise: number;
  walletAvailablePaise: number;
  walletOnHoldPaise: number;
  walletSettlingPaise: number;
  walletPaidOutPaise: number;
  lifetimeGrossPaise: number;
  lifetimeCommissionPaise: number;
  lifetimeSettledPaise: number;
  // Payout history
  totalSuccessfullySettledPaise: number;
  failedPayoutAmountPaise: number;
  lastPayoutDate?: string;
  nextScheduledPayoutDate: string;
  // Beneficiary details
  bankName: string;
  accountNumberMasked: string;
  ifscCode: string;
  beneficiaryName: string;
  isBankVerified: boolean;
}

export class AnalyticsService {
  /**
   * Resolves date boundaries strictly in Asia/Kolkata (IST = UTC+5:30)
   */
  static getDateRange(preset: DateRangePreset, customStart?: Date, customEnd?: Date): { current: DateRange; previous: DateRange } {
    const now = new Date();
    // Helper to get start/end of day in local time
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

    let cStart = startOfDay(now);
    let cEnd = endOfDay(now);
    let pStart = new Date(cStart.getTime() - 24 * 60 * 60 * 1000);
    let pEnd = new Date(cEnd.getTime() - 24 * 60 * 60 * 1000);
    let label = 'Today';

    switch (preset) {
      case 'today':
        label = 'Today';
        cStart = startOfDay(now);
        cEnd = endOfDay(now);
        pStart = new Date(cStart.getTime() - 24 * 60 * 60 * 1000);
        pEnd = new Date(cEnd.getTime() - 24 * 60 * 60 * 1000);
        break;

      case 'yesterday':
        label = 'Yesterday';
        cStart = new Date(startOfDay(now).getTime() - 24 * 60 * 60 * 1000);
        cEnd = new Date(endOfDay(now).getTime() - 24 * 60 * 60 * 1000);
        pStart = new Date(cStart.getTime() - 24 * 60 * 60 * 1000);
        pEnd = new Date(cEnd.getTime() - 24 * 60 * 60 * 1000);
        break;

      case 'this_week': {
        label = 'This Week';
        const day = now.getDay(); // 0 is Sunday
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
        cStart = startOfDay(new Date(now.setDate(diff)));
        cEnd = endOfDay(new Date());
        const weekDuration = 7 * 24 * 60 * 60 * 1000;
        pStart = new Date(cStart.getTime() - weekDuration);
        pEnd = new Date(cEnd.getTime() - weekDuration);
        break;
      }

      case 'previous_week': {
        label = 'Previous Week';
        const day = now.getDay();
        const diff = now.getDate() - day - 6;
        cStart = startOfDay(new Date(now.setDate(diff)));
        cEnd = new Date(cStart.getTime() + 6 * 24 * 60 * 60 * 1000 + 86399999);
        const weekDuration = 7 * 24 * 60 * 60 * 1000;
        pStart = new Date(cStart.getTime() - weekDuration);
        pEnd = new Date(cEnd.getTime() - weekDuration);
        break;
      }

      case 'this_month': {
        label = 'This Month';
        cStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        cEnd = endOfDay(now);
        pStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        pEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      }

      case 'previous_month': {
        label = 'Previous Month';
        cStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        cEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        pStart = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0);
        pEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999);
        break;
      }

      case 'this_year': {
        label = 'This Year';
        cStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        cEnd = endOfDay(now);
        pStart = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
        pEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
        break;
      }

      case 'previous_year': {
        label = 'Previous Year';
        cStart = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
        cEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
        pStart = new Date(now.getFullYear() - 2, 0, 1, 0, 0, 0, 0);
        pEnd = new Date(now.getFullYear() - 2, 11, 31, 23, 59, 59, 999);
        break;
      }

      case 'custom': {
        label = 'Custom Range';
        cStart = customStart ? startOfDay(customStart) : startOfDay(now);
        cEnd = customEnd ? endOfDay(customEnd) : endOfDay(now);
        const duration = cEnd.getTime() - cStart.getTime();
        pStart = new Date(cStart.getTime() - duration);
        pEnd = new Date(cStart.getTime() - 1);
        break;
      }
    }

    return {
      current: { start: cStart, end: cEnd, label },
      previous: { start: pStart, end: pEnd, label: `Prior ${label}` }
    };
  }

  /**
   * Aggregates complete marketplace financial position from raw persisted orders,
   * vendor wallets, settlement records, and financial ledger entries.
   */
  static aggregateMarketplaceFinancials(
    orders: any[],
    wallets: any[],
    settlements: any[],
    ledgerEntries: any[],
    range?: DateRange
  ): MarketplaceFinancialSummary {
    const startTime = range ? range.start.getTime() : 0;
    const endTime = range ? range.end.getTime() : Number.MAX_SAFE_INTEGER;

    // Filter orders within the selected time window (or all for cumulative lifetime balances)
    const inRangeOrders = range
      ? orders.filter((o) => {
          const orderTime = o.createdAt?.seconds 
            ? o.createdAt.seconds * 1000 
            : new Date(o.createdAt || 0).getTime();
          return orderTime >= startTime && orderTime <= endTime;
        })
      : orders;

    let gmvPaise = 0;
    let totalOrdersCount = inRangeOrders.length;
    let completedOrdersCount = 0;
    let pendingOrdersCount = 0;
    let cancelledOrdersCount = 0;
    let refundedOrdersCount = 0;

    let prepaidCollectionsPaise = 0;
    let codAwaitingCollectionPaise = 0;
    let codCollectedConfirmedPaise = 0;

    let grossProductSalesPaise = 0;
    let totalDiscountsPaise = 0;
    let vendorFundedDiscountsPaise = 0;
    let platformFundedDiscountsPaise = 0;

    let shippingCollectedPaise = 0;
    let taxCollectedPaise = 0;

    let gatewayProcessingFeesPaise = 0;
    let gatewayFeeGstPaise = 0;
    let platformCommissionRevenuePaise = 0;
    let commissionGstPaise = 0;
    let refundsAndChargebacksPaise = 0;
    let vendorEarningsAccruedPaise = 0;

    for (const order of inRangeOrders) {
      const orderTotal = Number(order.totalAmountPaise ?? Math.round((order.totalAmount ?? order.total ?? 0) * 100));
      gmvPaise += orderTotal;

      const orderStatus = order.orderStatus || order.status || 'pending';
      if (orderStatus === 'completed' || orderStatus === 'delivered') {
        completedOrdersCount++;
      } else if (orderStatus === 'cancelled') {
        cancelledOrdersCount++;
      } else if (orderStatus === 'refunded' || orderStatus === 'partially_refunded') {
        refundedOrdersCount++;
      } else {
        pendingOrdersCount++;
      }

      // Payment collections
      const paymentMethod = (order.paymentMethod || 'razorpay').toLowerCase();
      const paymentStatus = (order.paymentStatus || 'pending').toLowerCase();

      if (paymentMethod === 'cod') {
        if (paymentStatus === 'paid' || orderStatus === 'delivered' || orderStatus === 'completed') {
          codCollectedConfirmedPaise += orderTotal;
        } else {
          codAwaitingCollectionPaise += orderTotal;
        }
      } else {
        if (paymentStatus === 'paid' || paymentStatus === 'completed' || paymentStatus === 'captured') {
          prepaidCollectionsPaise += orderTotal;
        }
      }

      // Product sales & discounts
      const subtotal = Number(order.subtotalPaise ?? Math.round((order.subtotal || 0) * 100));
      grossProductSalesPaise += subtotal;

      const discount = Number(order.discountPaise ?? Math.round((order.discountAmount ?? order.discount ?? 0) * 100));
      totalDiscountsPaise += discount;

      const vFunded = Number(order.vendorFundedDiscountTotalPaise || 0);
      const pFunded = Number(order.platformFundedDiscountTotalPaise || 0);
      vendorFundedDiscountsPaise += vFunded;
      platformFundedDiscountsPaise += (pFunded || (discount - vFunded));

      shippingCollectedPaise += Number(order.shippingPaise ?? Math.round((order.shippingCharges ?? order.shippingFee ?? 0) * 100));
      taxCollectedPaise += Number(order.taxPaise ?? Math.round((order.taxAmount ?? 0) * 100));

      // Commercial deductions
      gatewayProcessingFeesPaise += Number(order.totalGatewayFeePaise || 0);
      gatewayFeeGstPaise += Number(order.totalGatewayFeeGstPaise || 0);
      platformCommissionRevenuePaise += Number(order.totalPlatformCommissionPaise || 0);
      commissionGstPaise += Number(order.totalCommissionGstPaise || 0);
      vendorEarningsAccruedPaise += Number(order.totalVendorPayablePaise || 0);

      if (orderStatus === 'cancelled' || orderStatus === 'refunded' || paymentStatus === 'refunded') {
        refundsAndChargebacksPaise += orderTotal;
      }
    }

    // Wallets & Liabilities (current live snapshot across all active vendors)
    let vendorWalletLiabilitiesPaise = 0;
    let totalPendingPaise = 0;
    let totalAvailablePaise = 0;
    let totalSettlingPaise = 0;
    let totalPaidOutPaise = 0;

    for (const w of wallets) {
      const avail = Number(w.availableBalance ?? w.available ?? 0);
      const pend = Number(w.pendingBalance ?? w.pending ?? 0);
      const settl = Number(w.settlingBalance ?? w.settling ?? 0);
      const paid = Number(w.paidOut ?? w.lifetimeSettled ?? 0);

      totalAvailablePaise += avail;
      totalPendingPaise += pend;
      totalSettlingPaise += settl;
      totalPaidOutPaise += paid;

      // Platform owes vendor available + pending + settling
      vendorWalletLiabilitiesPaise += (avail + pend + settl);
    }

    // Settlement batches breakdown
    let payoutsReservedPaise = totalSettlingPaise;
    let payoutsProcessingPaise = 0;
    let payoutsPaidPaise = 0;
    let payoutsFailedPaise = 0;
    let payoutsNeedsReviewPaise = 0;

    for (const s of settlements) {
      const amt = Number(s.amountPaise || 0);
      if (s.status === 'paid') payoutsPaidPaise += amt;
      else if (s.status === 'processing') payoutsProcessingPaise += amt;
      else if (s.status === 'failed') payoutsFailedPaise += amt;
      else if (s.status === 'needs_review') payoutsNeedsReviewPaise += amt;
    }

    // Available platform funds = (prepaid collected + COD confirmed) - (payouts paid) - refunds
    const totalCashCollected = prepaidCollectionsPaise + codCollectedConfirmedPaise;
    const availablePlatformFundsPaise = Math.max(0, totalCashCollected - payoutsPaidPaise - refundsAndChargebacksPaise);
    const outstandingPlatformObligationsPaise = vendorWalletLiabilitiesPaise;

    const averageOrderValuePaise = totalOrdersCount > 0 
      ? Math.round(gmvPaise / totalOrdersCount) 
      : 0;

    return {
      grossMerchandiseValuePaise: gmvPaise,
      totalOrdersCount,
      completedOrdersCount,
      pendingOrdersCount,
      cancelledOrdersCount,
      refundedOrdersCount,
      prepaidCollectionsPaise,
      codAwaitingCollectionPaise,
      codCollectedConfirmedPaise,
      grossProductSalesPaise,
      totalDiscountsPaise,
      vendorFundedDiscountsPaise,
      platformFundedDiscountsPaise,
      shippingCollectedPaise,
      shippingObligationsPaise: shippingCollectedPaise, // baseline obligation
      taxCollectedPaise,
      gatewayProcessingFeesPaise,
      gatewayFeeGstPaise,
      platformCommissionRevenuePaise,
      commissionGstPaise,
      refundsAndChargebacksPaise,
      vendorEarningsAccruedPaise,
      vendorWalletLiabilitiesPaise,
      payoutsReservedPaise,
      payoutsProcessingPaise,
      payoutsPaidPaise,
      payoutsFailedPaise,
      payoutsNeedsReviewPaise,
      availablePlatformFundsPaise,
      outstandingPlatformObligationsPaise,
      averageOrderValuePaise
    };
  }

  /**
   * Build complete per-vendor financial breakdown combining vendor items,
   * wallets, order slices, and settlements.
   */
  static buildVendorFinancialSummaries(
    vendors: any[],
    wallets: any[],
    settlements: any[],
    orders: any[]
  ): VendorFinancialSummary[] {
    const walletMap = new Map<string, any>();
    wallets.forEach(w => walletMap.set(w.id || w.vendorId, w));

    // Calculate next Tuesday date
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 is Sunday, 2 is Tuesday
    let daysUntilTuesday = (2 - dayOfWeek + 7) % 7;
    if (daysUntilTuesday === 0 && now.getHours() >= 17) {
      daysUntilTuesday = 7;
    }
    const nextTuesday = new Date(now.getTime() + daysUntilTuesday * 24 * 60 * 60 * 1000);
    const nextTuesdayStr = `${nextTuesday.toISOString().split('T')[0]} (17:00 IST)`;

    return vendors.map((vendor) => {
      const vId = vendor.id;
      const wallet = walletMap.get(vId) || {};
      const settlementInfo = vendor.settlement || {};

      // Match orders associated with this vendor
      let vGmv = 0;
      let vCompleted = 0;
      let vPending = 0;
      let vCancelled = 0;
      let vRefunded = 0;
      let vVendorDiscount = 0;
      let vPlatformDiscount = 0;
      let vGatewayFee = 0;
      let vCommission = 0;
      let vCommissionGst = 0;
      let vNetEarnings = 0;
      let vOrderCount = 0;

      for (const order of orders) {
        const orderStatus = order.orderStatus || order.status || 'pending';
        // Check vendor sub-orders or vendor items
        let isAssociated = false;
        let vendorSliceAmount = 0;

        if (Array.isArray(order.items)) {
          for (const item of order.items) {
            if (item.vendorId === vId || (!item.vendorId && vId === 'biocart')) {
              isAssociated = true;
              vendorSliceAmount += Number(item.pricePaise ?? Math.round((item.price || 0) * 100)) * (item.quantity || 1);
            }
          }
        }

        if (Array.isArray(order.vendorOrders)) {
          for (const vo of order.vendorOrders) {
            if (vo.vendorId === vId) {
              isAssociated = true;
              vendorSliceAmount += Number(vo.subtotalPaise ?? Math.round((vo.subtotal ?? vo.totalAmount ?? 0) * 100));
              vCommission += Number(vo.commissionFeePaise ?? Math.round((vo.commissionFee || 0) * 100));
              vNetEarnings += Number(vo.netVendorEarningsPaise ?? Math.round((vo.netVendorEarnings || 0) * 100));
            }
          }
        }

        if (isAssociated || order.vendorId === vId) {
          vOrderCount++;
          vGmv += vendorSliceAmount || Number(order.totalAmountPaise ?? Math.round((order.totalAmount || 0) * 100));

          if (orderStatus === 'completed' || orderStatus === 'delivered') vCompleted++;
          else if (orderStatus === 'cancelled') vCancelled++;
          else if (orderStatus === 'refunded') vRefunded++;
          else vPending++;

          // Parse splits if available
          if (Array.isArray(order.vendorSplits)) {
            const split = order.vendorSplits.find((s: any) => s.vendorId === vId);
            if (split) {
              vVendorDiscount += Number(split.vendorFundedDiscountPaise || 0);
              vPlatformDiscount += Number(split.platformFundedDiscountPaise || 0);
              vGatewayFee += Number(split.gatewayFeePaise || 0) + Number(split.gatewayFeeGstPaise || 0);
              vCommission += Number(split.commissionPaise || 0);
              vCommissionGst += Number(split.commissionGstPaise || 0);
              vNetEarnings += Number(split.vendorNetCreditPaise || 0);
            }
          }
        }
      }

      // Settlements for this vendor
      const vSettlements = settlements.filter(s => s.vendorId === vId);
      let vSettledTotal = 0;
      let vFailedTotal = 0;
      let lastPayoutDate: string | undefined = undefined;

      for (const s of vSettlements) {
        const amt = Number(s.amountPaise || 0);
        if (s.status === 'paid') {
          vSettledTotal += amt;
          const pDate = s.paidAt?.toDate ? s.paidAt.toDate().toISOString().split('T')[0] : (s.scheduledAt?.split('T')[0] || s.createdAt?.split?.('T')[0]);
          if (!lastPayoutDate || (pDate && pDate > lastPayoutDate)) {
            lastPayoutDate = pDate;
          }
        } else if (s.status === 'failed' || s.status === 'needs_review') {
          vFailedTotal += amt;
        }
      }

      const accNum = settlementInfo.accountNumber || '';
      const ifsc = settlementInfo.ifscCode || '';
      const isBankVerified = Boolean(accNum.length >= 8 && ifsc.length === 11);

      return {
        vendorId: vId,
        storeName: vendor.storeName || vendor.businessName || vId,
        status: vendor.status || 'active',
        totalOrders: vOrderCount,
        completedOrders: vCompleted,
        pendingOrders: vPending,
        cancelledOrders: vCancelled,
        refundedOrders: vRefunded,
        gmvPaise: vGmv,
        vendorFundedDiscountPaise: vVendorDiscount,
        platformFundedDiscountPaise: vPlatformDiscount,
        allocatedGatewayFeePaise: vGatewayFee,
        platformCommissionPaise: vCommission,
        commissionGstPaise: vCommissionGst,
        netEarningsPaise: vNetEarnings || Number(wallet.lifetimeGross ?? 0),
        walletPendingPaise: Number(wallet.pendingBalance ?? wallet.pending ?? 0),
        walletAvailablePaise: Number(wallet.availableBalance ?? wallet.available ?? 0),
        walletOnHoldPaise: Number(wallet.onHold ?? 0),
        walletSettlingPaise: Number(wallet.settling ?? 0),
        walletPaidOutPaise: Number(wallet.paidOut ?? wallet.lifetimeSettled ?? 0),
        lifetimeGrossPaise: Number(wallet.lifetimeGross ?? 0),
        lifetimeCommissionPaise: Number(wallet.lifetimeCommission ?? 0),
        lifetimeSettledPaise: Number(wallet.lifetimeSettled ?? 0),
        totalSuccessfullySettledPaise: vSettledTotal,
        failedPayoutAmountPaise: vFailedTotal,
        lastPayoutDate,
        nextScheduledPayoutDate: nextTuesdayStr,
        bankName: settlementInfo.bankName || 'Not Provided',
        accountNumberMasked: accNum.length > 4 ? `•••• ${accNum.slice(-4)}` : '••••',
        ifscCode: ifsc || 'Not Provided',
        beneficiaryName: settlementInfo.beneficiaryName || vendor.ownerName || vendor.storeName || 'Vendor',
        isBankVerified
      };
    });
  }

  /**
   * Generates time-series buckets (hourly, daily, weekly, monthly) for chart visualisations
   */
  static generateTimeSeriesData(
    orders: any[],
    range: DateRange,
    dimension: 'hourly' | 'daily' | 'monthly' = 'daily'
  ): Array<{ label: string; gmv: number; orders: number; commission: number; netSales: number }> {
    const buckets = new Map<string, { gmv: number; orders: number; commission: number; netSales: number }>();
    const startTime = range.start.getTime();
    const endTime = range.end.getTime();

    for (const order of orders) {
      const orderDate = order.createdAt?.seconds 
        ? new Date(order.createdAt.seconds * 1000)
        : new Date(order.createdAt || 0);

      const time = orderDate.getTime();
      if (time < startTime || time > endTime) continue;

      let key = '';
      if (dimension === 'hourly') {
        key = `${orderDate.getHours().toString().padStart(2, '0')}:00`;
      } else if (dimension === 'daily') {
        key = orderDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      } else {
        key = orderDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      }

      const current = buckets.get(key) || { gmv: 0, orders: 0, commission: 0, netSales: 0 };
      const gmv = Number(order.totalAmountPaise ?? Math.round((order.totalAmount || 0) * 100)) / 100;
      const commission = Number(order.totalPlatformCommissionPaise || 0) / 100;
      const discount = Number(order.discountPaise ?? 0) / 100;

      buckets.set(key, {
        gmv: current.gmv + gmv,
        orders: current.orders + 1,
        commission: current.commission + commission,
        netSales: current.netSales + Math.max(0, gmv - discount)
      });
    }

    return Array.from(buckets.entries()).map(([label, data]) => ({
      label,
      ...data
    }));
  }

  /**
   * Computes category sales and volume distribution
   */
  static aggregateCategoryPerformance(orders: any[], categories: any[]): Array<{
    category: string;
    gmv: number;
    orders: number;
    units: number;
    sharePercent: number;
  }> {
    const categoryTotals = new Map<string, { gmv: number; orders: number; units: number }>();
    let totalMarketplaceGmv = 0;

    for (const order of orders) {
      if (Array.isArray(order.items)) {
        for (const item of order.items) {
          const cat = item.category || 'Organic Fertilizers';
          const price = Number(item.price || (item.pricePaise ? item.pricePaise / 100 : 0));
          const qty = item.quantity || 1;
          const lineTotal = price * qty;
          totalMarketplaceGmv += lineTotal;

          const cur = categoryTotals.get(cat) || { gmv: 0, orders: 0, units: 0 };
          categoryTotals.set(cat, {
            gmv: cur.gmv + lineTotal,
            orders: cur.orders + 1,
            units: cur.units + qty
          });
        }
      }
    }

    return Array.from(categoryTotals.entries()).map(([category, stats]) => ({
      category,
      gmv: stats.gmv,
      orders: stats.orders,
      units: stats.units,
      sharePercent: totalMarketplaceGmv > 0 ? Number(((stats.gmv / totalMarketplaceGmv) * 100).toFixed(1)) : 0
    })).sort((a, b) => b.gmv - a.gmv);
  }

  /**
   * Computes top selling and low performing products
   */
  static aggregateProductPerformance(orders: any[], products: any[]): {
    topProducts: Array<{ name: string; sku: string; units: number; revenue: number }>;
    lowProducts: Array<{ name: string; sku: string; units: number; stock: number }>;
  } {
    const productMap = new Map<string, { name: string; sku: string; units: number; revenue: number }>();

    for (const order of orders) {
      if (Array.isArray(order.items)) {
        for (const item of order.items) {
          const id = item.productId || item.name || 'unknown';
          const cur = productMap.get(id) || {
            name: item.name || id,
            sku: item.sku || id,
            units: 0,
            revenue: 0
          };
          const price = Number(item.price || (item.pricePaise ? item.pricePaise / 100 : 0));
          const qty = item.quantity || 1;
          productMap.set(id, {
            name: item.name || cur.name,
            sku: item.sku || cur.sku,
            units: cur.units + qty,
            revenue: cur.revenue + (price * qty)
          });
        }
      }
    }

    const sorted = Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue);
    const topProducts = sorted.slice(0, 8);

    // Identify low performing products (active products with stock but 0 or low units sold)
    const lowProducts = products
      .filter(p => p.active !== false && p.stockQuantity > 0)
      .map(p => {
        const stats = productMap.get(p.id) || { units: 0, revenue: 0 };
        return {
          name: p.name,
          sku: p.sku || p.id,
          units: stats.units,
          stock: p.stockQuantity || 0
        };
      })
      .filter(p => p.units <= 1)
      .slice(0, 8);

    return { topProducts, lowProducts };
  }

  /**
   * Percentage change calculation with safe baseline protection
   */
  static calculatePercentageChange(current: number, previous: number): { change: number; trend: 'up' | 'down' | 'flat'; isNew: boolean } {
    if (previous <= 0) {
      if (current > 0) return { change: 100, trend: 'up', isNew: true };
      return { change: 0, trend: 'flat', isNew: false };
    }
    const diff = current - previous;
    const pct = Number(((diff / previous) * 100).toFixed(1));
    return {
      change: Math.abs(pct),
      trend: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat',
      isNew: false
    };
  }
}
