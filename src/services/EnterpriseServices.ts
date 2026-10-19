import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  writeBatch 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { InventoryEntity } from '../types/backend';
import { Product } from '../types';

export const InventoryService = {
  /**
   * Fetches all inventory items from the canonical Firestore 'inventory' collection.
   */
  getAllInventory: async (): Promise<InventoryEntity[]> => {
    try {
      const snap = await getDocs(collection(db, 'inventory'));
      const items: InventoryEntity[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        items.push({
          id: docSnap.id,
          vendorId: d.vendorId || 'biocart',
          productId: d.productId || docSnap.id,
          sku: d.sku || docSnap.id,
          quantity: typeof d.quantity === 'number' ? d.quantity : Number(d.stockQuantity) || 0,
          reservedQuantity: typeof d.reservedQuantity === 'number' ? d.reservedQuantity : 0,
          availableQuantity: typeof d.availableQuantity === 'number' ? d.availableQuantity : (typeof d.quantity === 'number' ? d.quantity : 0),
          lowStockThreshold: typeof d.lowStockThreshold === 'number' ? d.lowStockThreshold : 10,
          createdBy: d.createdBy || 'system',
          updatedBy: d.updatedBy || 'system',
          status: d.status || 'active',
          isDeleted: d.isDeleted || false,
          version: typeof d.version === 'number' ? d.version : 1,
          createdAt: d.createdAt || new Date().toISOString(),
          updatedAt: d.updatedAt || new Date().toISOString()
        });
      });
      return items;
    } catch (err) {
      console.error('[InventoryService] Error fetching inventory records:', err);
      return [];
    }
  },

  /**
   * Scans all products in Firestore and ensures each product has a corresponding
   * inventory tracking document in the 'inventory' collection.
   */
  initializeMissingInventory: async (): Promise<void> => {
    try {
      const prodSnap = await getDocs(collection(db, 'products'));
      if (prodSnap.empty) return;

      const invSnap = await getDocs(collection(db, 'inventory'));
      const existingInvIds = new Set<string>();
      invSnap.forEach((d) => existingInvIds.add(d.id));

      const batch = writeBatch(db);
      let count = 0;

      prodSnap.forEach((pDoc) => {
        const p = pDoc.data() as Product;
        const prodId = pDoc.id;

        if (!existingInvIds.has(prodId)) {
          const invRef = doc(db, 'inventory', prodId);
          const initialQty = typeof p.stockQuantity === 'number' ? p.stockQuantity : 150;
          batch.set(invRef, {
            id: prodId,
            productId: prodId,
            vendorId: p.vendorId || 'biocart',
            sku: p.sku || prodId,
            quantity: initialQty,
            reservedQuantity: 0,
            availableQuantity: initialQty,
            lowStockThreshold: 10,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }, { merge: true });
          count++;
        }
      });

      if (count > 0) {
        await batch.commit();
        console.log(`[InventoryService] Initialized missing inventory for ${count} products.`);
      }
    } catch (err) {
      console.error('[InventoryService] Error initializing missing inventory:', err);
    }
  },

  /**
   * Updates inventory numbers in both the 'inventory' collection and 'products' document.
   */
  updateInventory: async (productId: string, quantity: number, availableQuantity: number): Promise<void> => {
    try {
      const invRef = doc(db, 'inventory', productId);
      const prodRef = doc(db, 'products', productId);
      const now = new Date().toISOString();

      // 1. Update inventory document
      await setDoc(invRef, {
        productId,
        quantity,
        availableQuantity,
        stockQuantity: quantity,
        updatedAt: now
      }, { merge: true });

      // 2. Sync to product document for storefront stock badges
      const inStock = availableQuantity > 0;
      const stockStatus = availableQuantity > 0 ? (availableQuantity <= 10 ? 'Low Stock' : 'In Stock') : 'Out of Stock';

      await updateDoc(prodRef, {
        stockQuantity: quantity,
        inStock,
        stockStatus,
        updatedAt: now
      }).catch(async (err) => {
        // If product doesn't exist yet, attempt merge set
        console.warn('[InventoryService] updateDoc on product failed, attempting setDoc merge:', err);
        await setDoc(prodRef, {
          stockQuantity: quantity,
          inStock,
          stockStatus,
          updatedAt: now
        }, { merge: true });
      });
    } catch (err) {
      console.error(`[InventoryService] Error updating inventory for product ${productId}:`, err);
      throw err;
    }
  }
};
