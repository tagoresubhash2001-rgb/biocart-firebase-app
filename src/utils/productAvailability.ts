/**
 * Same rule the server uses in functions/src/orders.ts (isProductApproved).
 * A product may be shown/sold to customers only when this returns true,
 * otherwise checkout is rejected with "... is no longer available".
 */
export function isProductSellable(p: any): boolean {
  if (!p || p.active === false || p.status === 'archived' || p.status === 'suspended') return false;
  if (p.approvalStatus) return String(p.approvalStatus).toLowerCase() === 'approved';
  return p.source !== 'vendor_created';
}
