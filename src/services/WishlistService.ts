import { db } from '../config/firebase';
import { 
  doc, 
  getDoc, 
  setDoc,
  onSnapshot
} from 'firebase/firestore';
import { WishlistEntity, WishlistEntitySchema } from '../types/backend';
import { normalizeError } from '../utils/errors';

export class WishlistService {
  /**
   * Listen to real-time changes to the user's wishlist in Firestore
   */
  static subscribeToUserWishlist(
    userId: string, 
    callback: (productIds: string[]) => void
  ): () => void {
    if (!userId) {
      callback([]);
      return () => {};
    }

    const docRef = doc(db, 'wishlists', userId);
    return onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        callback(Array.isArray(data.productIds) ? data.productIds : []);
      } else {
        callback([]);
      }
    }, (err) => {
      console.warn('Wishlist subscription warning:', err);
      // Fallback
    });
  }

  /**
   * Fetch user's wishlist once
   */
  static async getWishlist(userId: string): Promise<string[]> {
    if (!userId) return [];
    try {
      const docRef = doc(db, 'wishlists', userId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        return Array.isArray(data.productIds) ? data.productIds : [];
      }
      return [];
    } catch (err) {
      console.warn('Error fetching wishlist:', err);
      return [];
    }
  }

  /**
   * Save / Sync the user's wishlist product IDs to Firestore
   */
  static async saveWishlist(userId: string, productIds: string[]): Promise<void> {
    if (!userId) return;
    try {
      const docRef = doc(db, 'wishlists', userId);
      const now = new Date().toISOString();
      const uniqueIds = Array.from(new Set(productIds));

      const entity: WishlistEntity = {
        id: userId,
        userId: userId,
        productIds: uniqueIds,
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        updatedBy: userId,
        status: 'active',
        isDeleted: false,
        version: 1
      };

      // Validate schema
      WishlistEntitySchema.parse(entity);

      await setDoc(docRef, entity, { merge: true });
    } catch (err) {
      throw normalizeError(err);
    }
  }

  /**
   * Toggle a product in the user's wishlist in Firestore
   */
  static async toggleProduct(userId: string, productId: string, currentIds: string[]): Promise<string[]> {
    if (!userId || !productId) return currentIds;
    const exists = currentIds.includes(productId);
    const updated = exists 
      ? currentIds.filter(id => id !== productId)
      : [...currentIds, productId];

    await WishlistService.saveWishlist(userId, updated);
    return updated;
  }
}
export default WishlistService;
