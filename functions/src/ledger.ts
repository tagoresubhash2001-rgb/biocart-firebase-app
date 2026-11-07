/**
 * Ledger + wallet writes. Every entry has a deterministic document id, so a
 * retried transaction or a duplicate webhook can never book the same money twice.
 *
 * Vendor wallet buckets (vendor_wallets/{vendorId}):
 *   pending     – earned on a paid order, not delivered yet
 *   available   – delivered (+ hold days) → will go into the next Tuesday cycle
 *   settling    – inside a settlement that is ready for payment
 *   paidOut     – paid to the vendor's bank (UTR recorded)
 *   adjustmentDue – refunds after settlement, deducted from the next cycle
 * Company wallet: company_wallet/main.
 */
import { Transaction } from 'firebase-admin/firestore';
import { db, FieldValue, nowIso, rupees } from './core';

export type EarningsState =
  | 'none' | 'pending' | 'awaiting_cod_remittance' | 'eligible' | 'in_settlement' | 'settled' | 'reversed';

const ledgerRef = (id: string) => db().collection('financial_ledger').doc(id.replace(/[\/]/g, '_'));
const walletRef = (vendorId: string) => db().collection('vendor_wallets').doc(vendorId);
const companyRef = () => db().collection('company_wallet').doc('main');

function entry(t: Transaction, id: string, data: Record<string, any>) {
  t.set(ledgerRef(id), { id, ...data, createdAt: nowIso() });
}

/** Book a confirmed (paid or COD-confirmed) order. Caller guarantees it runs once (financialsAllocated guard). */
export function bookOrderAllocation(t: Transaction, order: any, subOrders: Array<{ vendorId: string; data: any }>) {
  const orderId = order.id;
  for (const so of subOrders) {
    const v = so.data;
    entry(t, `${orderId}_${so.vendorId}_sale`, {
      orderId, orderNumber: orderId, vendorId: so.vendorId, account: `vendor:${so.vendorId}`,
      entryType: 'vendor_sale_credit', direction: 'credit', bucket: 'pending', status: 'pending',
      amountPaise: v.vendorPayablePaise,
      description: `Order ${orderId}: vendor share ₹${rupees(v.vendorPayablePaise)} (product value ₹${rupees(v.commissionBasePaise)}, commission ${v.commissionRateBps / 100}%)`,
      metadata: { subtotalPaise: v.subtotalPaise, commissionPaise: v.commissionPaise, commissionRateBps: v.commissionRateBps },
    });
    t.set(walletRef(so.vendorId), {
      vendorId: so.vendorId,
      pending: FieldValue.increment(v.vendorPayablePaise),
      pendingBalance: FieldValue.increment(v.vendorPayablePaise),
      lifetimeGross: FieldValue.increment(v.subtotalPaise),
      lifetimeCommission: FieldValue.increment(v.commissionPaise),
      updatedAt: nowIso(),
    }, { merge: true });

    if (v.commissionPaise > 0) {
      entry(t, `${orderId}_${so.vendorId}_commission`, {
        orderId, orderNumber: orderId, vendorId: so.vendorId, account: 'company',
        entryType: 'platform_commission_earned', direction: 'credit', status: 'settled',
        amountPaise: v.commissionPaise, description: `Order ${orderId}: commission from ${so.vendorId}`,
      });
    }
  }
  const shipping = order.shippingAmountPaise || 0;
  if (shipping > 0) {
    entry(t, `${orderId}_shipping`, {
      orderId, orderNumber: orderId, account: 'company', entryType: 'shipping_income', direction: 'credit',
      status: 'settled', amountPaise: shipping, description: `Order ${orderId}: shipping charge`,
    });
  }
  const subsidy = subOrders.reduce((s, so) => s + (so.data.platformFundedDiscountPaise || 0), 0);
  if (subsidy > 0) {
    entry(t, `${orderId}_coupon_subsidy`, {
      orderId, orderNumber: orderId, account: 'company', entryType: 'platform_coupon_subsidy', direction: 'debit',
      status: 'settled', amountPaise: subsidy, description: `Order ${orderId}: BioCart-funded coupon ${order.couponCode || ''}`,
    });
  }
  const commission = subOrders.reduce((s, so) => s + (so.data.commissionPaise || 0), 0);
  t.set(companyRef(), {
    commissionEarnedPaise: FieldValue.increment(commission),
    shippingIncomePaise: FieldValue.increment(shipping),
    couponSubsidyPaise: FieldValue.increment(subsidy),
    customerCollectionsPaise: FieldValue.increment(order.totalAmountPaise || 0),
    updatedAt: nowIso(),
  }, { merge: true });
}

/** Move a delivered sub-order's earnings from pending → available (eligible for the next cycle). */
export function bookEarningsEligible(t: Transaction, orderId: string, vendorId: string, payablePaise: number) {
  entry(t, `${orderId}_${vendorId}_eligible`, {
    orderId, orderNumber: orderId, vendorId, account: `vendor:${vendorId}`,
    entryType: 'pending_earnings_cleared', direction: 'transfer', bucket: 'available', status: 'settled',
    amountPaise: payablePaise, description: `Order ${orderId}: delivered — earnings eligible for weekly settlement`,
  });
  t.set(walletRef(vendorId), {
    pending: FieldValue.increment(-payablePaise),
    pendingBalance: FieldValue.increment(-payablePaise),
    available: FieldValue.increment(payablePaise),
    availableBalance: FieldValue.increment(payablePaise),
    updatedAt: nowIso(),
  }, { merge: true });
}

/** Reverse one vendor sub-order's money according to where its earnings currently sit. */
export function bookSubOrderReversal(
  t: Transaction, refundId: string, orderId: string, vendorId: string, so: any, state: EarningsState,
) {
  const payable = so.vendorPayablePaise || 0;
  const commission = so.commissionPaise || 0;
  if (state === 'none' || state === 'reversed') return;
  const w: Record<string, any> = { updatedAt: nowIso(), lifetimeGross: FieldValue.increment(-(so.subtotalPaise || 0)), lifetimeCommission: FieldValue.increment(-commission) };
  let bucket = 'pending';
  if (state === 'pending' || state === 'awaiting_cod_remittance') {
    w.pending = FieldValue.increment(-payable); w.pendingBalance = FieldValue.increment(-payable);
  } else if (state === 'eligible') {
    w.available = FieldValue.increment(-payable); w.availableBalance = FieldValue.increment(-payable); bucket = 'available';
  } else {
    // already inside a settlement or paid out → recover from the next cycle
    w.adjustmentDue = FieldValue.increment(payable); bucket = 'adjustment_due';
  }
  t.set(walletRef(vendorId), w, { merge: true });
  entry(t, `${refundId}_${vendorId}_reversal`, {
    orderId, orderNumber: orderId, vendorId, refundId, account: `vendor:${vendorId}`,
    entryType: 'refund_reversal', direction: 'debit', bucket, status: 'settled', amountPaise: payable,
    description: `Refund ${refundId}: vendor share reversed (${bucket === 'adjustment_due' ? 'deducted from next settlement' : 'removed from ' + bucket})`,
  });
  if (commission > 0) {
    entry(t, `${refundId}_${vendorId}_commission_reversal`, {
      orderId, orderNumber: orderId, vendorId, refundId, account: 'company', entryType: 'platform_commission_reversed',
      direction: 'debit', status: 'settled', amountPaise: commission, description: `Refund ${refundId}: commission reversed`,
    });
  }
  const subsidy = so.platformFundedDiscountPaise || 0;
  t.set(companyRef(), {
    commissionEarnedPaise: FieldValue.increment(-commission),
    couponSubsidyPaise: FieldValue.increment(-subsidy),
    updatedAt: nowIso(),
  }, { merge: true });
}

export function bookShippingReversal(t: Transaction, refundId: string, orderId: string, shippingPaise: number) {
  if (shippingPaise <= 0) return;
  entry(t, `${refundId}_shipping_reversal`, {
    orderId, orderNumber: orderId, refundId, account: 'company', entryType: 'shipping_income_reversed',
    direction: 'debit', status: 'settled', amountPaise: shippingPaise, description: `Refund ${refundId}: shipping refunded`,
  });
  t.set(companyRef(), { shippingIncomePaise: FieldValue.increment(-shippingPaise), updatedAt: nowIso() }, { merge: true });
}

export function bookCustomerRefund(t: Transaction, refundId: string, orderId: string, amountPaise: number) {
  t.set(companyRef(), {
    customerRefundsPaise: FieldValue.increment(amountPaise),
    updatedAt: nowIso(),
  }, { merge: true });
  entry(t, `${refundId}_customer_refund`, {
    orderId, orderNumber: orderId, refundId, account: 'company', entryType: 'customer_refund', direction: 'debit',
    status: 'pending', amountPaise, description: `Refund ${refundId}: ₹${rupees(amountPaise)} to customer`,
  });
}

export function bookGatewayFee(t: Transaction, orderId: string, feePaise: number, taxPaise: number, source: Record<string, any>) {
  entry(t, `${orderId}_gateway_fee`, {
    orderId, orderNumber: orderId, account: 'company', entryType: 'gateway_fee', direction: 'debit', status: 'settled',
    amountPaise: feePaise + taxPaise, metadata: { feePaise, taxPaise, ...source },
    description: `Order ${orderId}: actual Cashfree fee ₹${rupees(feePaise)} + tax ₹${rupees(taxPaise)} (borne by BioCart)`,
  });
  t.set(companyRef(), { gatewayFeesPaise: FieldValue.increment(feePaise + taxPaise), updatedAt: nowIso() }, { merge: true });
}
