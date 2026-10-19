import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { CouponEntity } from '../types/backend';
import { Product } from '../types';

import { removeUndefined } from '../utils/firestore';

export interface CouponValidationResult {
  valid: boolean;
  coupon?: CouponEntity;
  discountAmount: number;
  errorMessage?: string;
  eligibleItemIds?: string[];
}

export class CouponService {
  /**
   * Subscribes to real-time coupons for a specific vendor.
   * If vendorId is 'biocart' or current user is admin, can list platform/vendor coupons.
   */
  static subscribeToVendorCoupons(
    vendorId: string,
    onSuccess: (coupons: CouponEntity[]) => void,
    onError?: (error: any) => void
  ): () => void {
    const couponsRef = collection(db, 'coupons');
    // Query vendor coupons created by this vendor
    const qVendor = query(couponsRef, where('creatorVendorId', '==', vendorId));
    // Also query universal admin coupons
    const qAdmin = query(couponsRef, where('creatorRole', '==', 'admin'));

    let vendorCoupons: CouponEntity[] = [];
    let adminCoupons: CouponEntity[] = [];

    const mergeAndEmit = () => {
      const map = new Map<string, CouponEntity>();
      vendorCoupons.forEach((c) => map.set(c.id, c));
      adminCoupons.forEach((c) => {
        // Only include admin coupons that are either universal or targeted to this vendor
        if (!c.creatorVendorId || c.creatorVendorId === vendorId) {
          map.set(c.id, c);
        }
      });
      onSuccess(Array.from(map.values()));
    };

    const unsubVendor = onSnapshot(
      qVendor,
      (snapshot) => {
        vendorCoupons = [];
        snapshot.forEach((d) => {
          vendorCoupons.push({ id: d.id, ...d.data() } as CouponEntity);
        });
        mergeAndEmit();
      },
      (err) => {
        console.error('[CouponService] Error subscribing to vendor coupons:', err);
        if (onError) onError(err);
      }
    );

    const unsubAdmin = onSnapshot(
      qAdmin,
      (snapshot) => {
        adminCoupons = [];
        snapshot.forEach((d) => {
          adminCoupons.push({ id: d.id, ...d.data() } as CouponEntity);
        });
        mergeAndEmit();
      },
      (err) => {
        console.warn('[CouponService] Non-fatal admin coupon subscription note:', err);
      }
    );

    return () => {
      unsubVendor();
      unsubAdmin();
    };
  }

  /**
   * Creates a new coupon owned by a vendor.
   */
  static async createVendorCoupon(
    vendorId: string,
    couponData: Omit<CouponEntity, 'id' | 'createdAt' | 'updatedAt' | 'usedCount' | 'createdBy' | 'updatedBy' | 'isDeleted' | 'version'>
  ): Promise<string> {
    const code = couponData.code.trim().toUpperCase();
    if (!code) throw new Error('Coupon code is required.');

    const couponRef = doc(db, 'coupons', code);
    const existing = await getDoc(couponRef);
    if (existing.exists()) {
      throw new Error(`Coupon code "${code}" already exists. Please choose a unique code.`);
    }

    const now = new Date().toISOString();
    const rawPayload: Record<string, any> = {
      ...couponData,
      id: code,
      code,
      creatorVendorId: vendorId,
      creatorRole: 'vendor',
      usedCount: 0,
      createdBy: vendorId,
      updatedBy: vendorId,
      status: couponData.status || 'active',
      isDeleted: false,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    // Sanitize to omit all undefined keys (such as applicableProductIds or applicableCategories when global scope)
    const sanitizedPayload = removeUndefined(rawPayload);

    await setDoc(couponRef, sanitizedPayload);

    // Verify written record by reading back from server
    const verifySnap = await getDoc(couponRef);
    if (!verifySnap.exists()) {
      throw new Error(`Failed to persist coupon "${code}". Record could not be retrieved.`);
    }

    return code;
  }

  /**
   * Updates an existing vendor coupon.
   * Ensures the coupon belongs to the specified vendor and rejects admin-owned coupons unconditionally.
   */
  static async updateVendorCoupon(
    vendorId: string,
    couponId: string,
    updates: Partial<CouponEntity>
  ): Promise<void> {
    const couponRef = doc(db, 'coupons', couponId);
    const snap = await getDoc(couponRef);
    if (!snap.exists()) {
      throw new Error('Coupon not found.');
    }

    const data = snap.data() as CouponEntity;
    if (data.creatorRole === 'admin') {
      throw new Error('Access denied: Vendors cannot modify administrator-owned platform coupons.');
    }
    if (data.creatorVendorId !== vendorId) {
      throw new Error('Access denied: You cannot modify coupons belonging to another vendor.');
    }

    // Protect immutable identity keys
    const rawUpdates: Record<string, any> = { ...updates };
    delete rawUpdates.id;
    delete rawUpdates.creatorVendorId;
    delete rawUpdates.creatorRole;
    delete rawUpdates.usedCount;
    rawUpdates.updatedAt = new Date().toISOString();

    const sanitizedUpdates = removeUndefined(rawUpdates);

    await updateDoc(couponRef, sanitizedUpdates);

    // Verify updated record by reading back
    const verifySnap = await getDoc(couponRef);
    if (!verifySnap.exists()) {
      throw new Error(`Failed to update coupon "${couponId}".`);
    }
  }

  /**
   * Deactivates or deletes an eligible vendor coupon.
   */
  static async deleteVendorCoupon(vendorId: string, couponId: string): Promise<void> {
    const couponRef = doc(db, 'coupons', couponId);
    const snap = await getDoc(couponRef);
    if (!snap.exists()) return;

    const data = snap.data() as CouponEntity;
    if (data.creatorVendorId !== vendorId) {
      throw new Error('Access denied: You cannot delete coupons belonging to another vendor.');
    }

    await deleteDoc(couponRef);
  }

  /**
   * Validates a coupon code against a shopping cart before checkout.
   * Strictly enforces:
   * 1. Expiry & Active Status
   * 2. Usage limits
   * 3. Minimum order spend
   * 4. Vendor ownership scope: If vendor coupon, discount applies ONLY to products belonging to that vendor!
   */
  static async validateCartCoupon(
    couponCode: string,
    cartItems: { product: Product; quantity: number }[]
  ): Promise<CouponValidationResult> {
    const cleanCode = couponCode.trim().toUpperCase();
    if (!cleanCode) {
      return { valid: false, discountAmount: 0, errorMessage: 'Please enter a coupon code.' };
    }

    if (cartItems.length === 0) {
      return { valid: false, discountAmount: 0, errorMessage: 'Cart is empty.' };
    }

    const couponRef = doc(db, 'coupons', cleanCode);
    const snap = await getDoc(couponRef);
    if (!snap.exists()) {
      return { valid: false, discountAmount: 0, errorMessage: `Coupon "${cleanCode}" does not exist.` };
    }

    const coupon = { id: snap.id, ...snap.data() } as CouponEntity;

    if (coupon.status === 'inactive') {
      return { valid: false, discountAmount: 0, errorMessage: 'This coupon is currently inactive.' };
    }

    // Check Start Date
    if (coupon.startDate && new Date(coupon.startDate).getTime() > Date.now()) {
      return { valid: false, discountAmount: 0, errorMessage: 'This coupon has not started yet.' };
    }

    // Check End Date
    if (coupon.endDate && new Date(coupon.endDate).getTime() < Date.now()) {
      return { valid: false, discountAmount: 0, errorMessage: 'This coupon has expired.' };
    }

    // Check Usage Limit
    if (coupon.usageLimit && (coupon.usedCount || 0) >= coupon.usageLimit) {
      return { valid: false, discountAmount: 0, errorMessage: 'This coupon has reached its maximum usage limit.' };
    }

    // Calculate Eligible Spend based on Creator & Scope
    let eligibleSubtotal = 0;
    const eligibleItemIds: string[] = [];

    const isVendorScoped = coupon.creatorRole === 'vendor' && !!coupon.creatorVendorId;
    const vendorId = coupon.creatorVendorId;

    for (const item of cartItems) {
      const prod = item.product;
      const itemTotal = prod.price * item.quantity;

      // 1. Check Product-level restrictions if specified
      const hasProductFilter = coupon.applicableProductIds && coupon.applicableProductIds.length > 0;
      const productMatches = hasProductFilter ? coupon.applicableProductIds!.includes(prod.id) : true;

      // 2. Check Category-level restrictions if specified
      const hasCategoryFilter = coupon.applicableCategories && coupon.applicableCategories.length > 0;
      const categoryMatches = hasCategoryFilter 
        ? coupon.applicableCategories!.some(cat => cat.toLowerCase() === (prod.category || '').toLowerCase())
        : true;

      if (isVendorScoped) {
        // Vendor coupon: strictly applies only to products belonging to this vendor AND matching product/category scope
        const itemVendorId = prod.vendorId || 'biocart';
        if (itemVendorId === vendorId && productMatches && categoryMatches) {
          eligibleSubtotal += itemTotal;
          eligibleItemIds.push(prod.id);
        }
      } else {
        // Admin / Universal coupon: applies if productMatches and categoryMatches
        if (productMatches && categoryMatches) {
          eligibleSubtotal += itemTotal;
          eligibleItemIds.push(prod.id);
        }
      }
    }

    if (eligibleSubtotal === 0) {
      if (isVendorScoped) {
        return { 
          valid: false, 
          discountAmount: 0, 
          errorMessage: 'This coupon is issued by a specific vendor and does not apply to any items in your cart.' 
        };
      }
      return {
        valid: false,
        discountAmount: 0,
        errorMessage: 'This coupon is not applicable to the items in your cart.'
      };
    }

    // Check Minimum Order Amount against eligible subtotal
    if (coupon.minOrderAmount && eligibleSubtotal < coupon.minOrderAmount) {
      return {
        valid: false,
        discountAmount: 0,
        errorMessage: `Minimum order amount of ₹${coupon.minOrderAmount} required for this coupon.`
      };
    }

    // Compute Discount Amount
    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = (eligibleSubtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
        discount = coupon.maxDiscountAmount;
      }
    } else {
      // Fixed discount cannot exceed eligible subtotal
      discount = Math.min(coupon.discountValue, eligibleSubtotal);
    }

    discount = Math.round(discount);

    return {
      valid: true,
      coupon,
      discountAmount: discount,
      eligibleItemIds
    };
  }
}
