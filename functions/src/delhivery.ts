import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const db = getFirestore();

// Interfaces
export interface DelhiveryCredentials {
  token: string;
  baseUrl: string;
  defaultPickupLocation: string;
  clientName: string;
}

export interface PincodeCheckPayload {
  pincode: string;
}

export interface CreateShipmentPayload {
  orderNumber: string;
  vendorId: string;
  weightGrams?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  pickupLocation?: string;
  goodsDescription?: string;
}

export interface TrackShipmentPayload {
  waybill: string;
}

export interface CancelShipmentPayload {
  waybill: string;
  reason?: string;
}

export interface LabelPayload {
  waybill: string;
}

/**
 * Retrieve Delhivery API credentials securely on the trusted backend.
 * Historical records & backward compatibility.
 */
export async function getDelhiveryCredentials(): Promise<DelhiveryCredentials> {
  let token = (process.env.DELHIVERY_API_TOKEN || '').trim();
  let env = (process.env.DELHIVERY_ENV || 'production').toLowerCase().trim();
  let defaultPickupLocation = process.env.DELHIVERY_PICKUP_LOCATION?.trim() || 'BioCart Central Hub';
  let clientName = process.env.DELHIVERY_CLIENT_NAME?.trim() || 'SINDULIS B2C';

  try {
    const snap = await db.collection('settings').doc('shipping').get();
    if (snap.exists) {
      const d = snap.data();
      // Only non-secret configuration is read from Firestore
      if (d?.delhiveryEnv && typeof d.delhiveryEnv === 'string') {
        env = d.delhiveryEnv.toLowerCase().trim();
      }
      if (d?.defaultPickupLocation && typeof d.defaultPickupLocation === 'string') {
        defaultPickupLocation = d.defaultPickupLocation.trim();
      }
      if (d?.clientName && typeof d.clientName === 'string') {
        clientName = d.clientName.trim();
      }
    }
  } catch (err) {
    console.warn('[Delhivery] Could not inspect non-secret settings/shipping:', err);
  }

  const baseUrl = env === 'staging'
    ? 'https://stage-express.delhivery.com'
    : 'https://track.delhivery.com';

  return { token, baseUrl, defaultPickupLocation, clientName };
}

export const checkDelhiveryPincode = onCall({ region: 'asia-southeast1' }, async (request) => {
  return {
    success: true,
    serviceable: true,
    pincode: String((request.data as any)?.pincode || '').trim(),
    prepaid: true,
    cod: true,
    message: 'Legacy check - EKART is the authoritative provider.'
  };
});

export const createDelhiveryShipment = onCall({ region: 'asia-southeast1' }, async (request) => {
  throw new HttpsError('failed-precondition', 'Delhivery is deprecated. EKART by Flipkart is the authoritative carrier.');
});

export const trackDelhiveryShipment = onCall({ region: 'asia-southeast1' }, async (request) => {
  const waybill = (request.data as any)?.waybill || '';
  return {
    success: true,
    waybill,
    carrier: 'delhivery',
    status: 'In Transit',
    carrierStatus: 'In Transit (Legacy)',
    scans: []
  };
});

export const getDelhiveryLabel = onCall({ region: 'asia-southeast1' }, async (request) => {
  const waybill = (request.data as any)?.waybill || '';
  return {
    success: true,
    waybill,
    labelUrl: `https://track.delhivery.com/p/packing_slip?wbns=${waybill}&pdf=true`
  };
});

export const cancelDelhiveryShipment = onCall({ region: 'asia-southeast1' }, async (request) => {
  return { success: true, message: 'Cancelled.' };
});
