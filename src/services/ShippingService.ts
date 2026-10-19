import { functions, db } from '../config/firebase';
import { httpsCallable } from 'firebase/functions';
import { 
  collection, doc, onSnapshot, query, where, orderBy, 
  getDoc, setDoc 
} from 'firebase/firestore';
import { ShipmentItem, ShipmentScan } from '../types';

export interface PincodeCheckResult {
  success: boolean;
  serviceable: boolean;
  pincode: string;
  prepaid: boolean;
  cod: boolean;
  city?: string;
  state?: string;
  message?: string;
}

export interface CreateShipmentParams {
  orderNumber: string;
  vendorId: string;
  weightGrams?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  pickupLocation?: string;
  goodsDescription?: string;
}

export interface TrackingResult {
  success: boolean;
  waybill: string;
  carrier: 'delhivery';
  status: ShipmentItem['status'];
  carrierStatus: string;
  expectedDeliveryDate?: string | null;
  origin?: string;
  destination?: string;
  scans: ShipmentScan[];
}

export interface ShippingConfig {
  delhiveryEnv: 'production' | 'staging';
  delhiveryToken?: string;
  defaultPickupLocation: string;
  clientName?: string;
  updatedAt?: string;
}

export class ShippingService {
  /**
   * Check if a 6-digit Indian PIN code is serviceable by Delhivery for Prepaid and COD.
   */
  static async checkPincode(pincode: string): Promise<PincodeCheckResult> {
    const fn = httpsCallable<{ pincode: string }, PincodeCheckResult>(functions, 'checkDelhiveryPincode');
    const res = await fn({ pincode });
    return res.data;
  }

  /**
   * Idempotently create a Delhivery shipment for an authorized vendor order.
   */
  static async createShipment(params: CreateShipmentParams): Promise<{ success: boolean; waybill: string; shipmentId: string; status: string }> {
    const fn = httpsCallable<CreateShipmentParams, any>(functions, 'createDelhiveryShipment');
    const res = await fn(params);
    return res.data;
  }

  /**
   * Track a Delhivery shipment by its waybill/AWB.
   */
  static async trackShipment(waybill: string): Promise<TrackingResult> {
    const fn = httpsCallable<{ waybill: string }, TrackingResult>(functions, 'trackDelhiveryShipment');
    const res = await fn({ waybill });
    return res.data;
  }

  /**
   * Retrieve printable PDF packing slip / label URL.
   */
  static async getShippingLabel(waybill: string): Promise<{ success: boolean; labelUrl: string }> {
    const fn = httpsCallable<{ waybill: string }, { success: boolean; labelUrl: string }>(functions, 'getDelhiveryLabel');
    const res = await fn({ waybill });
    return res.data;
  }

  /**
   * Cancel an eligible Delhivery shipment.
   */
  static async cancelShipment(waybill: string, reason?: string): Promise<{ success: boolean; waybill: string; status: string }> {
    const fn = httpsCallable<{ waybill: string; reason?: string }, any>(functions, 'cancelDelhiveryShipment');
    const res = await fn({ waybill, reason });
    return res.data;
  }

  /**
   * Realtime subscription to shipments.
   * If vendorId is provided, filters for that vendor's packages.
   * Otherwise returns all shipments (for Super Admin).
   */
  static subscribeToShipments(
    callback: (shipments: ShipmentItem[]) => void,
    vendorId?: string
  ): () => void {
    const colRef = collection(db, 'shipments');
    const q = vendorId
      ? query(colRef, where('vendorId', '==', vendorId), orderBy('createdAt', 'desc'))
      : query(colRef, orderBy('createdAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const list: ShipmentItem[] = [];
        snapshot.forEach((snap) => {
          list.push({ id: snap.id, ...snap.data() } as ShipmentItem);
        });
        callback(list);
      },
      (err) => {
        console.warn('Shipments composite query failed, retrying without order-by:', err);
        const fallbackQ = vendorId
          ? query(colRef, where('vendorId', '==', vendorId))
          : colRef;

        onSnapshot(fallbackQ, (fallbackSnap) => {
          const list: ShipmentItem[] = [];
          fallbackSnap.forEach((snap) => {
            list.push({ id: snap.id, ...snap.data() } as ShipmentItem);
          });
          list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          callback(list);
        }, (e) => {
          console.error('Shipments subscription error:', e);
          callback([]);
        });
      }
    );
  }

  /**
   * Realtime subscription to a single shipment document.
   */
  static subscribeToShipment(
    shipmentId: string,
    callback: (shipment: ShipmentItem | null) => void
  ): () => void {
    const docRef = doc(db, 'shipments', shipmentId);
    return onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          callback({ id: snap.id, ...snap.data() } as ShipmentItem);
        } else {
          callback(null);
        }
      },
      (err) => {
        console.error(`Shipment ${shipmentId} subscription error:`, err);
        callback(null);
      }
    );
  }

  /**
   * Fetch secure shipping configuration (Super Admin only).
   */
  static async getShippingConfig(): Promise<ShippingConfig | null> {
    const snap = await getDoc(doc(db, 'settings', 'shipping'));
    if (snap.exists()) {
      return snap.data() as ShippingConfig;
    }
    return {
      delhiveryEnv: 'production',
      defaultPickupLocation: 'BioCart Central Hub',
      clientName: 'SINDULIS B2C'
    };
  }

  /**
   * Save secure shipping configuration (Super Admin only).
   */
  static async saveShippingConfig(config: Partial<ShippingConfig>): Promise<void> {
    const docRef = doc(db, 'settings', 'shipping');
    await setDoc(docRef, {
      ...config,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  }
}
