/**
 * Tax-Aware & Coupon Funding Financial Calculation Engine for BioCart Marketplace
 * 
 * All arithmetic strictly executed in integer Paise to prevent floating point rounding discrepancies.
 * 1 Rupee = 100 Paise.
 * 1% = 100 Basis Points (BPS).
 * 
 * Non-Negotiable Business Rules:
 * Rule A: Tax-aware commission calculation. Commission base is calculated on merchandise value
 *         excluding statutory GST and applying discounts according to the approved policy.
 * Rule B: Coupon creator bears coupon cost:
 *         - Vendor-created coupon: Deducted from that specific vendor's gross payable.
 *         - Admin-created coupon: Funded by BioCart platform account. If discount exceeds
 *           platform commission, explicit platform subsidy is recorded; vendor earnings are NEVER reduced.
 */

export interface FinancialPolicy {
  policyVersion: string;
  commissionBasis: 'net_after_gateway_fee' | 'gross_merchandise_value';
  gatewayFeeRateBps: number; // e.g. 200 = 2.0%
  gatewayFeeFlatPaise: number; // e.g. 0
  gatewayFeeTaxRateBps: number; // e.g. 1800 = 18% GST
  commissionGstRateBps: number; // e.g. 1800 = 18% GST
  couponFundingPolicy: 'strict_creator_funded' | 'platform_subsidized';
  settlementDayOfWeek: number; // 2 = Tuesday
  payoutHoldPeriodDays: number; // e.g. 3 days after delivery
  minimumPayoutPaise: number; // e.g. 50000 = Rs. 500
}

export const DEFAULT_FINANCIAL_POLICY: FinancialPolicy = {
  policyVersion: 'v1.0-2026',
  commissionBasis: 'net_after_gateway_fee',
  gatewayFeeRateBps: 200, // 2%
  gatewayFeeFlatPaise: 0,
  gatewayFeeTaxRateBps: 1800, // 18%
  commissionGstRateBps: 1800, // 18%
  couponFundingPolicy: 'strict_creator_funded',
  settlementDayOfWeek: 2,
  payoutHoldPeriodDays: 3,
  minimumPayoutPaise: 50000
};

export interface CouponAllocationInput {
  code: string;
  creatorRole: 'admin' | 'vendor';
  creatorVendorId?: string; // If vendor-created
  discountPaise: number;
}

export interface VendorCartSplitInput {
  vendorId: string;
  vendorStoreName?: string;
  commissionRatePercent?: number;
  commissionRateBps?: number;
  isGstRegistered?: boolean;
  gstin?: string;
  items: Array<{
    productId: string;
    name: string;
    pricePaise: number;
    quantity: number;
    hsnCode?: string;
    taxRateBps?: number; // e.g. 500 = 5%, 1800 = 18%
  }>;
}

export interface VendorSplitCalculation {
  vendorId: string;
  vendorStoreName: string;
  subtotalPaise: number;
  // Merchandise level discounts
  vendorFundedDiscountPaise: number;
  platformFundedDiscountPaise: number;
  totalDiscountPaise: number;
  // Tax
  taxPaise: number;
  isGstRegistered: boolean;
  // Commercial breakdown
  grossMerchandisePaise: number;
  gatewayFeePaise: number;
  gatewayFeeGstPaise: number;
  totalGatewayDeductionPaise: number;
  // Commission
  commissionBasePaise: number;
  commissionRateBps: number;
  commissionPaise: number;
  commissionGstPaise: number;
  totalPlatformCommissionDeductionPaise: number;
  // Vendor Net Credit & Platform Subsidy
  vendorNetCreditPaise: number;
  platformSubsidyPaise: number;
  items: any[];
}

export interface AuthoritativeOrderCalculation {
  policyVersion: string;
  subtotalPaise: number;
  discountPaise: number;
  vendorFundedDiscountTotalPaise: number;
  platformFundedDiscountTotalPaise: number;
  shippingPaise: number;
  taxPaise: number;
  grandTotalPaise: number;
  totalGatewayFeePaise: number;
  totalGatewayFeeGstPaise: number;
  totalPlatformCommissionPaise: number;
  totalCommissionGstPaise: number;
  totalPlatformSubsidyPaise: number;
  totalVendorPayablePaise: number;
  vendorSplits: VendorSplitCalculation[];
}

/**
 * Calculates authoritative order totals and vendor allocations using integer paise arithmetic.
 * Strictly respects Rule A (tax-aware base) and Rule B (creator-funded coupons).
 */
export function calculateAuthoritativeOrder(
  vendorInputs: VendorCartSplitInput[],
  coupon: CouponAllocationInput | null,
  shippingPaise: number,
  policy: FinancialPolicy = DEFAULT_FINANCIAL_POLICY
): AuthoritativeOrderCalculation {
  let subtotalPaise = 0;
  let totalTaxPaise = 0;

  // 1. Calculate line item amounts and aggregate subtotal
  const preCalculatedSplits = vendorInputs.map(v => {
    let vendorSubtotal = 0;
    let vendorTax = 0;
    const items = v.items.map(it => {
      const lineTotal = it.pricePaise * it.quantity;
      vendorSubtotal += lineTotal;
      const taxRateBps = it.taxRateBps !== undefined ? it.taxRateBps : 500; // 5% GST default
      const lineTax = Math.round((lineTotal * taxRateBps) / 10000);
      vendorTax += lineTax;
      return {
        ...it,
        lineTotalPaise: lineTotal,
        taxPaise: lineTax
      };
    });
    subtotalPaise += vendorSubtotal;
    totalTaxPaise += vendorTax;
    return {
      vendorId: v.vendorId,
      vendorStoreName: v.vendorStoreName || v.vendorId,
      commissionRateBps: v.commissionRateBps !== undefined 
        ? v.commissionRateBps 
        : Math.round((v.commissionRatePercent ?? 10) * 100),
      isGstRegistered: !!v.isGstRegistered,
      gstin: v.gstin || '',
      subtotalPaise: vendorSubtotal,
      taxPaise: vendorTax,
      items
    };
  });

  const totalDiscountPaise = coupon?.discountPaise || 0;
  const grandTotalPaise = Math.max(0, subtotalPaise - totalDiscountPaise) + totalTaxPaise + shippingPaise;

  let totalGatewayFeePaise = 0;
  let totalGatewayFeeGstPaise = 0;
  let totalPlatformCommissionPaise = 0;
  let totalCommissionGstPaise = 0;
  let totalPlatformSubsidyPaise = 0;
  let totalVendorPayablePaise = 0;
  let vendorFundedDiscountTotalPaise = 0;
  let platformFundedDiscountTotalPaise = 0;

  // 2. Perform per-vendor split calculations enforcing Rule B
  const vendorSplits: VendorSplitCalculation[] = preCalculatedSplits.map(v => {
    let vendorFundedDiscountPaise = 0;
    let platformFundedDiscountPaise = 0;

    if (coupon && totalDiscountPaise > 0) {
      if (coupon.creatorRole === 'vendor') {
        // Vendor created the coupon: only deduct if it applies to this vendor
        if (coupon.creatorVendorId === v.vendorId) {
          vendorFundedDiscountPaise = Math.min(v.subtotalPaise, totalDiscountPaise);
        } else if (!coupon.creatorVendorId) {
          // Proportionate vendor-level attribution if creatorId not isolated
          const ratio = subtotalPaise > 0 ? (v.subtotalPaise / subtotalPaise) : 0;
          vendorFundedDiscountPaise = Math.round(totalDiscountPaise * ratio);
        }
      } else {
        // Admin / Platform created the coupon: Platform bears 100% of the cost.
        // Vendor's merchandise base is not reduced by the coupon.
        const ratio = subtotalPaise > 0 ? (v.subtotalPaise / subtotalPaise) : 0;
        platformFundedDiscountPaise = Math.round(totalDiscountPaise * ratio);
      }
    }

    vendorFundedDiscountTotalPaise += vendorFundedDiscountPaise;
    platformFundedDiscountTotalPaise += platformFundedDiscountPaise;

    // Gross merchandise value payable to vendor before platform deductions:
    // If vendor-funded, their merchandise value is reduced by their coupon.
    // If platform-funded, the vendor receives their full merchandise value (customer paid portion + platform subsidy portion).
    const grossMerchandisePaise = Math.max(0, v.subtotalPaise - vendorFundedDiscountPaise);

    // Gateway processing fee allocation
    const gatewayFee = Math.round((grossMerchandisePaise * policy.gatewayFeeRateBps) / 10000) + policy.gatewayFeeFlatPaise;
    const gatewayFeeGst = Math.round((gatewayFee * policy.gatewayFeeTaxRateBps) / 10000);
    const totalGatewayDeduction = gatewayFee + gatewayFeeGst;

    // Tax-aware commission base:
    // Excludes statutory GST, applies approved discount basis.
    let commissionBase = grossMerchandisePaise;
    if (policy.commissionBasis === 'net_after_gateway_fee') {
      commissionBase = Math.max(0, grossMerchandisePaise - totalGatewayDeduction);
    }

    const commissionPaise = Math.round((commissionBase * v.commissionRateBps) / 10000);
    const commissionGstPaise = Math.round((commissionPaise * policy.commissionGstRateBps) / 10000);
    const totalPlatformDeduction = commissionPaise + commissionGstPaise;

    // Vendor Net Credit = Gross Merchandise - Gateway Deductions - Platform Deductions
    const vendorNetCreditPaise = Math.max(0, grossMerchandisePaise - totalGatewayDeduction - totalPlatformDeduction);

    // Platform subsidy check (Rule B: If platform coupon exceeds platform commission, record explicit subsidy)
    let platformSubsidyPaise = 0;
    if (platformFundedDiscountPaise > commissionPaise) {
      platformSubsidyPaise = platformFundedDiscountPaise - commissionPaise;
    }

    totalGatewayFeePaise += gatewayFee;
    totalGatewayFeeGstPaise += gatewayFeeGst;
    totalPlatformCommissionPaise += commissionPaise;
    totalCommissionGstPaise += commissionGstPaise;
    totalPlatformSubsidyPaise += platformSubsidyPaise;
    totalVendorPayablePaise += vendorNetCreditPaise;

    return {
      vendorId: v.vendorId,
      vendorStoreName: v.vendorStoreName,
      subtotalPaise: v.subtotalPaise,
      vendorFundedDiscountPaise,
      platformFundedDiscountPaise,
      totalDiscountPaise: vendorFundedDiscountPaise + platformFundedDiscountPaise,
      taxPaise: v.taxPaise,
      isGstRegistered: v.isGstRegistered,
      grossMerchandisePaise,
      gatewayFeePaise: gatewayFee,
      gatewayFeeGstPaise: gatewayFeeGst,
      totalGatewayDeductionPaise: totalGatewayDeduction,
      commissionBasePaise: commissionBase,
      commissionRateBps: v.commissionRateBps,
      commissionPaise: commissionPaise,
      commissionGstPaise: commissionGstPaise,
      totalPlatformCommissionDeductionPaise: totalPlatformDeduction,
      vendorNetCreditPaise,
      platformSubsidyPaise,
      items: v.items
    };
  });

  return {
    policyVersion: policy.policyVersion,
    subtotalPaise,
    discountPaise: totalDiscountPaise,
    vendorFundedDiscountTotalPaise,
    platformFundedDiscountTotalPaise,
    shippingPaise,
    taxPaise: totalTaxPaise,
    grandTotalPaise,
    totalGatewayFeePaise,
    totalGatewayFeeGstPaise,
    totalPlatformCommissionPaise,
    totalCommissionGstPaise,
    totalPlatformSubsidyPaise,
    totalVendorPayablePaise,
    vendorSplits
  };
}
