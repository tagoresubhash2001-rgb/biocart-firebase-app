/**
 * BioCart pricing & commission engine — pure functions, integer paise only.
 *
 * Owner rules (Nov 2026):
 *  R1  Commission is per vendor (vendors/{id}.commission.baseRateBps), charged on the
 *      vendor's product value after any coupon that vendor funds. BioCart's own vendor
 *      account pays commission too. Vendor share = product value − commission.
 *  R2  Payment-gateway fees are NOT estimated here: the actual Cashfree fee is booked
 *      later from reconciliation and comes 100% out of BioCart's share.
 *  R3  Shipping: one ₹99 charge when the product subtotal is below ₹1,499, free at
 *      ₹1,499 and above. Shipping is never commissionable and belongs 100% to BioCart.
 *  Prices are MRP-inclusive: no tax is ever added on top.
 *  Admin (platform) coupons are funded by BioCart: the vendor share is unchanged.
 */

export interface PricingLineInput {
  productId: string;
  name: string;
  vendorId: string;
  category?: string;
  pricePaise: number;
  quantity: number;
  hsnCode?: string;
  codAllowed?: boolean;
}

export interface PricingCoupon {
  code: string;
  creatorRole: 'admin' | 'vendor';
  creatorVendorId?: string;
  /** product ids the coupon applies to (already filtered by vendor/product/category scope) */
  eligibleProductIds: string[];
  discountPaise: number;
}

export interface PricingPolicy {
  shippingFeePaise: number;
  freeShippingThresholdPaise: number;
}

export interface VendorSplit {
  vendorId: string;
  commissionRateBps: number;
  items: Array<PricingLineInput & { lineTotalPaise: number; discountPaise: number }>;
  subtotalPaise: number;
  vendorFundedDiscountPaise: number;
  platformFundedDiscountPaise: number;
  /** what the customer pays for this vendor's products */
  customerPaidPaise: number;
  /** product value commission is charged on */
  commissionBasePaise: number;
  commissionPaise: number;
  vendorPayablePaise: number;
}

export interface PricingResult {
  subtotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  totalPaise: number;
  totalCommissionPaise: number;
  totalVendorPayablePaise: number;
  platformCouponSubsidyPaise: number;
  vendorSplits: VendorSplit[];
}

function assertPaise(n: number, label: string) {
  if (!Number.isInteger(n) || n < 0) throw new Error(`${label} must be a non-negative integer number of paise`);
}

/** Splits `total` across `weights` proportionally; the parts always sum exactly to `total`. */
export function allocateProportionally(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (total <= 0 || sum <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (total * w) / sum);
  const floors = raw.map(Math.floor);
  let remainder = total - floors.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (remainder <= 0) break;
    floors[i] += 1;
    remainder -= 1;
  }
  return floors;
}

export function shippingFor(subtotalPaise: number, policy: PricingPolicy): number {
  if (subtotalPaise <= 0) return 0;
  return subtotalPaise >= policy.freeShippingThresholdPaise ? 0 : policy.shippingFeePaise;
}

export function priceOrder(
  lines: PricingLineInput[],
  commissionBpsByVendor: Record<string, number>,
  coupon: PricingCoupon | null,
  policy: PricingPolicy,
): PricingResult {
  if (!lines.length) throw new Error('Cart is empty');
  lines.forEach((l) => {
    assertPaise(l.pricePaise, 'price');
    if (!Number.isInteger(l.quantity) || l.quantity < 1) throw new Error('quantity must be a positive integer');
  });

  const lineTotals = lines.map((l) => l.pricePaise * l.quantity);
  const subtotalPaise = lineTotals.reduce((a, b) => a + b, 0);

  // ---- coupon allocation per line (exact, largest remainder) ----
  const lineDiscounts = lines.map(() => 0);
  if (coupon && coupon.discountPaise > 0) {
    const eligible = new Set(coupon.eligibleProductIds);
    const weights = lines.map((l, i) => (eligible.has(l.productId) &&
      (coupon.creatorRole !== 'vendor' || l.vendorId === coupon.creatorVendorId) ? lineTotals[i] : 0));
    const eligibleTotal = weights.reduce((a, b) => a + b, 0);
    const discount = Math.min(coupon.discountPaise, eligibleTotal);
    allocateProportionally(discount, weights).forEach((d, i) => { lineDiscounts[i] = d; });
  }
  const discountPaise = lineDiscounts.reduce((a, b) => a + b, 0);

  // ---- per-vendor split ----
  const vendorOrder: string[] = [];
  const byVendor = new Map<string, number[]>();
  lines.forEach((l, i) => {
    if (!byVendor.has(l.vendorId)) { byVendor.set(l.vendorId, []); vendorOrder.push(l.vendorId); }
    byVendor.get(l.vendorId)!.push(i);
  });

  const vendorFunded = coupon?.creatorRole === 'vendor';
  const vendorSplits: VendorSplit[] = vendorOrder.map((vendorId) => {
    const idx = byVendor.get(vendorId)!;
    const rate = commissionBpsByVendor[vendorId];
    if (!Number.isInteger(rate) || rate < 0 || rate > 10000) {
      throw new Error(`Commission rate for vendor ${vendorId} is not configured`);
    }
    const subtotal = idx.reduce((s, i) => s + lineTotals[i], 0);
    const disc = idx.reduce((s, i) => s + lineDiscounts[i], 0);
    const vendorFundedDiscountPaise = vendorFunded ? disc : 0;
    const platformFundedDiscountPaise = vendorFunded ? 0 : disc;
    const commissionBasePaise = subtotal - vendorFundedDiscountPaise;
    const commissionPaise = Math.round((commissionBasePaise * rate) / 10000);
    return {
      vendorId,
      commissionRateBps: rate,
      items: idx.map((i) => ({ ...lines[i], lineTotalPaise: lineTotals[i], discountPaise: lineDiscounts[i] })),
      subtotalPaise: subtotal,
      vendorFundedDiscountPaise,
      platformFundedDiscountPaise,
      customerPaidPaise: subtotal - disc,
      commissionBasePaise,
      commissionPaise,
      vendorPayablePaise: commissionBasePaise - commissionPaise,
    };
  });

  const shippingPaise = shippingFor(subtotalPaise, policy);
  const totalPaise = subtotalPaise - discountPaise + shippingPaise;
  return {
    subtotalPaise,
    discountPaise,
    shippingPaise,
    totalPaise,
    totalCommissionPaise: vendorSplits.reduce((s, v) => s + v.commissionPaise, 0),
    totalVendorPayablePaise: vendorSplits.reduce((s, v) => s + v.vendorPayablePaise, 0),
    platformCouponSubsidyPaise: vendorSplits.reduce((s, v) => s + v.platformFundedDiscountPaise, 0),
    vendorSplits,
  };
}
