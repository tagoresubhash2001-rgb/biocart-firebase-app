/**
 * EKART Elite Cloud Functions — every function here talks to the real EKART API
 * through ./client. Nothing in this file fabricates AWBs, scans or labels.
 */
import { onCall, onRequest, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { getFirestore, FieldValue, DocumentReference } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import {
  ekartRequest, logEkartEvent, sanitize, extractEkartMessage,
  EKART_API_SECRETS, EKART_WEBHOOK_SECRET, EKART_BASE_URL
} from './client';

const REGION = 'asia-southeast1';
const STORAGE_BUCKET = 'biocart-production-storage';
const db = () => getFirestore();

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

function requireAuth(request: CallableRequest<any>): string {
  if (!request.auth) throw new HttpsError('unauthenticated', 'You must be signed in.');
  return request.auth.uid;
}

async function isAdminUid(uid: string): Promise<boolean> {
  const snap = await db().collection('users').doc(uid).get();
  const d = snap.data();
  return !!d && (d.role === 'admin' || d.role === 'super_admin') && (d.status === undefined || d.status === 'active');
}

async function requireAdmin(request: CallableRequest<any>): Promise<string> {
  const uid = requireAuth(request);
  if (!(await isAdminUid(uid))) throw new HttpsError('permission-denied', 'Only an admin can do this.');
  return uid;
}

function ownsVendor(uid: string, vendorId: string, vendor: any): boolean {
  return uid === vendorId || (!!vendor && vendor.ownerUid === uid);
}

async function requireAdminOrVendorOwner(request: CallableRequest<any>, vendorId: string, vendor: any): Promise<string> {
  const uid = requireAuth(request);
  if (ownsVendor(uid, vendorId, vendor)) return uid;
  if (await isAdminUid(uid)) return uid;
  throw new HttpsError('permission-denied', 'Only an admin or the owner of this vendor account can do this.');
}

// ---------------------------------------------------------------------------
// Small data helpers
// ---------------------------------------------------------------------------

const str = (v: any): string => (v === null || v === undefined ? '' : String(v).trim());

/** Last 10 digits of an Indian mobile number, or '' if it is not a valid one. */
function phone10(v: any): string {
  const digits = str(v).replace(/\D/g, '');
  const last = digits.slice(-10);
  return /^[6-9]\d{9}$/.test(last) ? last : '';
}

function pin6(v: any): string {
  const digits = str(v).replace(/\D/g, '');
  return /^[1-9]\d{5}$/.test(digits) ? digits : '';
}

function joinAddress(...parts: any[]): string {
  return parts.map(str).filter(Boolean).join(', ');
}

function toDate(v: any): Date | null {
  if (!v) return null;
  if (typeof v.toDate === 'function') return v.toDate();
  const n = typeof v === 'number' ? v : (/^\d{10,13}$/.test(String(v)) ? Number(v) : NaN);
  if (!Number.isNaN(n)) return new Date(n < 1e12 ? n * 1000 : n);
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toIso(v: any): string | null {
  const d = toDate(v);
  return d ? d.toISOString() : null;
}

/** YYYY-MM-DD in India time. */
function istDate(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

/** Parses product weight text such as "500 g", "1.5kg", "250ml" into grams. */
function parseWeightGrams(v: any): number | null {
  if (typeof v === 'number' && v > 0) return Math.round(v);
  const m = str(v).toLowerCase().match(/^([\d.]+)\s*(kg|kgs|g|gm|gms|gram|grams|ml|l|ltr|litre|liter)?$/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!(n > 0)) return null;
  const unit = m[2] || 'g';
  return Math.round(['kg', 'kgs', 'l', 'ltr', 'litre', 'liter'].includes(unit) ? n * 1000 : n);
}

function positiveInt(v: any, max: number): number | null {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 && n <= max ? n : null;
}

interface PickupDetails { addressLine1: string; addressLine2: string; city: string; state: string; pincode: string; phone: string; }

function readPickupAddress(vendor: any): PickupDetails {
  const a = vendor?.addresses || {};
  const pickup = a.pickupAddress && str(a.pickupAddress.addressLine1) ? a.pickupAddress : null;
  // Vendors who ticked "same as registered" may only have the registered address saved.
  const src = pickup || (a.sameAsRegistered !== false ? a.registeredAddress : null) || {};
  return {
    addressLine1: str(src.addressLine1),
    addressLine2: joinAddress(src.addressLine2, src.landmark),
    city: str(src.city),
    state: str(src.state),
    pincode: pin6(src.pinCode ?? src.pincode ?? src.postalCode),
    phone: phone10(src.contactPhone) || phone10(vendor?.phone) || phone10(vendor?.contact?.phone)
  };
}

// ---------------------------------------------------------------------------
// Status mapping + delivery handling
// ---------------------------------------------------------------------------

type AppShipmentStatus = 'manifested' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'exception';

/**
 * Maps EKART's status text to the app's shipment status. "delivered" is only
 * returned for an exact "Delivered" — never for "RTO Delivered", "Undelivered"
 * etc. — because vendor payout eligibility depends on it.
 */
export function normalizeEkartStatus(raw: any): AppShipmentStatus | null {
  const s = str(raw).toLowerCase().replace(/[_-]+/g, ' ');
  if (!s) return null;
  if (s === 'delivered') return 'delivered';
  if (/rto|return|undeliver|lost|damage|exception|ndr|fail|reject/.test(s)) return 'exception';
  if (/cancel/.test(s)) return 'cancelled';
  if (/out for delivery/.test(s)) return 'out_for_delivery';
  if (/order placed|manifest|pickup scheduled|out for pickup|pickup pending|created/.test(s)) return 'manifested';
  if (/picked|transit|hub|shipped|dispatch|received|bagged|connected|reached/.test(s)) return 'in_transit';
  return null;
}

interface TrackingUpdate {
  carrierStatus: string;
  desc?: string;
  location?: string;
  edd?: string | null;
  scans?: Array<Record<string, any>>;
  eventTime?: string | null;
  source: string;
}

/** Marks one vendor slice delivered, and the parent order once every slice is delivered. */
async function markVendorOrderDelivered(orderNumber: string, vendorId: string, deliveredAt: string): Promise<void> {
  const orderRef = db().collection('orders').doc(orderNumber);
  const voRef = orderRef.collection('vendor_orders').doc(vendorId);
  const voSnap = await voRef.get();
  if (!voSnap.exists) return;
  const current = str(voSnap.data()!.orderStatus || voSnap.data()!.status).toLowerCase();
  if (['cancelled', 'rejected'].includes(current)) {
    logger.warn('EKART reports delivery for a cancelled/rejected vendor order; not changing it', { orderNumber, vendorId });
    return;
  }
  await voRef.set({ orderStatus: 'delivered', status: 'delivered', shipmentStatus: 'delivered', deliveredAt, updatedAt: deliveredAt }, { merge: true });

  const all = await orderRef.collection('vendor_orders').get();
  const open = all.docs.filter((d) => {
    const st = str(d.data().orderStatus || d.data().status).toLowerCase();
    return !['delivered', 'cancelled', 'rejected'].includes(st);
  });
  if (open.length === 0) {
    const orderSnap = await orderRef.get();
    const st = str(orderSnap.data()?.status).toLowerCase();
    if (orderSnap.exists && !['delivered', 'cancelled', 'refunded'].includes(st)) {
      await orderRef.update({
        status: 'delivered',
        orderStatus: 'delivered',
        deliveredAt,
        updatedAt: FieldValue.serverTimestamp(),
        statusHistory: FieldValue.arrayUnion({ status: 'delivered', at: deliveredAt, by: 'ekart', role: 'system', reason: 'Delivered (confirmed by EKART)' })
      });
    }
  }
}

/** Writes a tracking update to the shipment doc and mirrors it onto the vendor order. */
async function applyTrackingUpdate(shipRef: DocumentReference, ship: any, upd: TrackingUpdate): Promise<AppShipmentStatus | null> {
  const now = new Date().toISOString();
  const normalized = normalizeEkartStatus(upd.carrierStatus);
  const previous = str(ship.status).toLowerCase();
  const locked = previous === 'delivered' || previous === 'cancelled';

  const patch: Record<string, any> = { updatedAt: now, lastSyncedAt: now, lastSyncSource: upd.source };
  if (upd.carrierStatus) patch.carrierStatus = upd.carrierStatus;
  if (upd.desc) { patch.desc = upd.desc; patch.remarks = upd.desc; }
  if (upd.location) patch.lastLocation = upd.location;
  if (upd.edd) patch.expectedDeliveryDate = upd.edd;
  if (upd.scans) patch.scans = upd.scans;
  if (normalized && !locked) patch.status = normalized;
  const newlyDelivered = normalized === 'delivered' && previous !== 'delivered' && previous !== 'cancelled';
  const deliveredAt = upd.eventTime || now;
  if (newlyDelivered) patch.deliveredAt = deliveredAt;
  await shipRef.set(patch, { merge: true });

  const orderNumber = str(ship.orderNumber || ship.parentOrderId);
  const vendorId = str(ship.vendorId);
  if (!orderNumber || !vendorId || !normalized || locked) return normalized;

  const voRef = db().collection('orders').doc(orderNumber).collection('vendor_orders').doc(vendorId);
  if (newlyDelivered) {
    await markVendorOrderDelivered(orderNumber, vendorId, deliveredAt);
  } else if (normalized === 'in_transit' || normalized === 'out_for_delivery') {
    const voSnap = await voRef.get();
    const cur = str(voSnap.data()?.orderStatus || voSnap.data()?.status).toLowerCase();
    if (voSnap.exists && !['delivered', 'cancelled', 'rejected'].includes(cur)) {
      await voRef.set({
        orderStatus: 'shipped', status: 'shipped', shipmentStatus: 'shipped',
        ...(voSnap.data()!.shippedAt ? {} : { shippedAt: upd.eventTime || now }),
        updatedAt: now
      }, { merge: true });
    }
  } else if (normalized === 'exception' || normalized === 'cancelled') {
    await voRef.set({ shipmentStatus: normalized, updatedAt: now }, { merge: true });
  }
  return normalized;
}

async function findShipmentByTrackingId(id: string) {
  const col = db().collection('shipments');
  let snap = await col.where('ekartTrackingId', '==', id).limit(1).get();
  if (snap.empty) snap = await col.where('waybill', '==', id).limit(1).get();
  return snap.empty ? null : snap.docs[0];
}

/** Calls EKART's open tracking API and maps the answer into the app's shape. */
async function fetchEkartTracking(id: string, fn: string, ctx: { orderNumber?: string; vendorId?: string } = {}) {
  const raw: any = await ekartRequest('GET', `/api/v1/track/${encodeURIComponent(id)}`, { ctx: { fn, ...ctx }, auth: false });
  const track = raw?.track && typeof raw.track === 'object' ? raw.track : (raw || {});
  const details: any[] = Array.isArray(track.details) ? track.details : [];
  const scans = details.map((d) => ({
    timestamp: toIso(d.ctime) || str(d.ctime),
    location: str(d.location),
    activity: str(d.desc),
    scanDetail: str(d.desc),
    status: str(d.status)
  }));
  const carrierStatus = str(track.status);
  if (!carrierStatus) {
    throw new HttpsError('failed-precondition', `EKART returned no tracking status for ${id}: ${extractEkartMessage(raw, 'empty response')}`);
  }
  return {
    carrierStatus,
    desc: str(track.desc),
    location: str(track.location),
    edd: toIso(raw?.edd ?? track.edd),
    eventTime: toIso(track.ctime),
    scans
  };
}

// ---------------------------------------------------------------------------
// a) checkEkartPincode
// ---------------------------------------------------------------------------

export const checkEkartPincode = onCall({ region: REGION, secrets: EKART_API_SECRETS }, async (request) => {
  const pincode = str(request.data?.pincode);
  const base = { success: false, serviceable: false, pincode, cod: false, maxCodAmount: 0, prepaid: false, city: '', state: '' };
  if (!pin6(pincode)) {
    return { ...base, message: 'Invalid 6-digit Indian PIN code.' };
  }
  try {
    const res: any = await ekartRequest('GET', `/api/v2/serviceability/${pincode}`, { ctx: { fn: 'checkEkartPincode' }, allowStatusFalse: true });
    const details = res?.details || {};
    const prepaid = details.forward_drop === true;
    return {
      success: true,
      serviceable: res?.status === true && prepaid,
      pincode,
      cod: res?.status === true && details.cod === true,
      maxCodAmount: Number(details.max_cod_amount) || 0,
      prepaid,
      city: str(details.city),
      state: str(details.state),
      message: str(res?.remark)
    };
  } catch (e: any) {
    // Never assume a PIN code is serviceable when EKART could not confirm it.
    return { ...base, message: e?.message || 'Could not check serviceability with EKART.' };
  }
});

// ---------------------------------------------------------------------------
// b) registerEkartPickupAddress + listEkartAddresses
// ---------------------------------------------------------------------------

export const registerEkartPickupAddress = onCall({ region: REGION, secrets: EKART_API_SECRETS }, async (request) => {
  const vendorId = str(request.data?.vendorId);
  if (!vendorId) throw new HttpsError('invalid-argument', 'vendorId is required.');
  const vendorRef = db().collection('vendors').doc(vendorId);
  const vendorSnap = await vendorRef.get();
  if (!vendorSnap.exists) throw new HttpsError('not-found', 'Vendor not found.');
  const vendor = vendorSnap.data()!;
  await requireAdminOrVendorOwner(request, vendorId, vendor);

  const p = readPickupAddress(vendor);
  const missing: string[] = [];
  if (!p.addressLine1) missing.push('address line 1');
  if (!p.city) missing.push('city');
  if (!p.state) missing.push('state');
  if (!p.pincode) missing.push('6-digit PIN code');
  if (!p.phone) missing.push('10-digit mobile number');
  if (missing.length) {
    throw new HttpsError('failed-precondition', `The vendor pickup address is incomplete. Missing: ${missing.join(', ')}. Save it in the vendor profile first.`);
  }

  const alias = `BC_${vendorId}`;
  const body = {
    alias,
    phone: Number(p.phone),
    address_line1: p.addressLine1,
    address_line2: p.addressLine2,
    pincode: Number(p.pincode),
    city: p.city,
    state: p.state,
    country: 'India'
  };
  const ctx = { fn: 'registerEkartPickupAddress', vendorId };

  let response: any;
  let alreadyRegistered = false;
  try {
    response = await ekartRequest('POST', '/api/v2/address', { body, ctx });
  } catch (e: any) {
    // If EKART says this alias already exists, confirm it against EKART's own address list.
    if (!/already|exist|duplicate/i.test(e?.message || '')) throw e;
    const list: any = await ekartRequest('GET', '/api/v2/addresses', { ctx });
    const rows: any[] = Array.isArray(list) ? list : (Array.isArray(list?.data) ? list.data : (Array.isArray(list?.addresses) ? list.addresses : []));
    const found = rows.find((r) => str(r?.alias) === alias);
    if (!found) throw e;
    response = found;
    alreadyRegistered = true;
  }

  const registeredAt = new Date().toISOString();
  await vendorRef.set({
    ekart: {
      pickupAlias: alias,
      pickupRegisteredAt: registeredAt,
      pickupAddressSnapshot: { ...p, phone: sanitize({ phone: p.phone }).phone },
      pickupRegistrationResponse: sanitize(response)
    }
  }, { merge: true });

  return {
    success: true,
    alias,
    registeredAt,
    alreadyRegistered,
    message: alreadyRegistered ? 'This pickup address was already registered with EKART.' : (str(response?.remark || response?.message) || 'Pickup address registered with EKART.')
  };
});

export const listEkartAddresses = onCall({ region: REGION, secrets: EKART_API_SECRETS }, async (request) => {
  await requireAdmin(request);
  const res: any = await ekartRequest('GET', '/api/v2/addresses', { ctx: { fn: 'listEkartAddresses' } });
  return { success: true, addresses: sanitize(res) };
});

// ---------------------------------------------------------------------------
// c) createEkartShipment
// ---------------------------------------------------------------------------

export const createEkartShipment = onCall({ region: REGION, secrets: EKART_API_SECRETS }, async (request) => {
  const uid = requireAuth(request);
  const orderNumber = str(request.data?.orderNumber);
  const vendorId = str(request.data?.vendorId);
  if (!orderNumber || !vendorId) throw new HttpsError('invalid-argument', 'orderNumber and vendorId are required.');

  const orderRef = db().collection('orders').doc(orderNumber);
  const voRef = orderRef.collection('vendor_orders').doc(vendorId);
  const vendorRef = db().collection('vendors').doc(vendorId);
  const [orderSnap, voSnap, vendorSnap] = await Promise.all([orderRef.get(), voRef.get(), vendorRef.get()]);
  if (!vendorSnap.exists) throw new HttpsError('not-found', 'Vendor not found.');
  const vendor = vendorSnap.data()!;
  await requireAdminOrVendorOwner(request, vendorId, vendor);
  if (!orderSnap.exists) throw new HttpsError('not-found', `Order ${orderNumber} not found.`);
  if (!voSnap.exists) throw new HttpsError('not-found', `Order ${orderNumber} has no items for this vendor.`);
  const order = orderSnap.data()!;
  const vo = voSnap.data()!;

  // Idempotency: only a shipment that really exists at EKART counts.
  const shipmentId = `ekart_${orderNumber}_${vendorId}`;
  const shipRef = db().collection('shipments').doc(shipmentId);
  const existingSnap = await shipRef.get();
  const existing = existingSnap.data();
  if (existing?.ekartTrackingId && str(existing.status).toLowerCase() !== 'cancelled') {
    return {
      success: true, alreadyExists: true,
      waybill: existing.ekartTrackingId, trackingId: existing.ekartTrackingId,
      trackingUrl: existing.trackingUrl, shipmentId, status: existing.carrierStatus || existing.status
    };
  }

  const orderState = str(order.status || order.orderStatus).toLowerCase();
  const voState = str(vo.orderStatus || vo.status).toLowerCase();
  if (['cancelled', 'refunded'].includes(orderState) || ['cancelled', 'rejected'].includes(voState)) {
    throw new HttpsError('failed-precondition', `This order is ${voState || orderState}; it cannot be shipped.`);
  }
  const isCod = str(order.paymentMethod).toLowerCase() === 'cod';
  if (!isCod && str(order.paymentStatus).toLowerCase() !== 'paid') {
    throw new HttpsError('failed-precondition', 'This prepaid order has not been paid yet, so it cannot be shipped.');
  }

  const alias = str(vendor.ekart?.pickupAlias);
  if (!alias) throw new HttpsError('failed-precondition', 'Register pickup address with EKART first');
  const gstin = str(vendor.legal?.gstin).toUpperCase();
  if (!gstin) throw new HttpsError('failed-precondition', 'This vendor has no GSTIN saved. Add the GSTIN in the vendor profile before creating an EKART shipment.');

  // Customer address
  const addr = order.shippingAddress || {};
  const consigneeName = str(addr.name || addr.fullName);
  const consigneePhone = phone10(addr.phone ?? addr.phoneNumber ?? addr.mobile);
  const dropPin = pin6(addr.postalCode ?? addr.pincode ?? addr.pinCode ?? addr.zip);
  const dropAddress = joinAddress(addr.street, addr.addressLine1, addr.addressLine2, addr.landmark);
  const dropProblems: string[] = [];
  if (!consigneeName) dropProblems.push('name');
  if (!consigneePhone) dropProblems.push('10-digit mobile number');
  if (!dropAddress) dropProblems.push('street address');
  if (!str(addr.city)) dropProblems.push('city');
  if (!str(addr.state)) dropProblems.push('state');
  if (!dropPin) dropProblems.push('6-digit PIN code');
  if (dropProblems.length) {
    throw new HttpsError('failed-precondition', `The customer's delivery address is incomplete. Missing: ${dropProblems.join(', ')}.`);
  }

  // Items + amounts for THIS vendor's slice only (paise, integers).
  const items: any[] = Array.isArray(vo.items) ? vo.items : [];
  if (!items.length) throw new HttpsError('failed-precondition', 'This vendor order has no items.');
  const quantity = items.reduce((n, it) => n + (Number(it.quantity) || 0), 0);
  const lineTotal = (it: any) => Number(it.lineTotalPaise ?? (Number(it.pricePaise) || 0) * (Number(it.quantity) || 0)) || 0;
  const sliceSubtotalPaise = Number(vo.subtotalPaise) || items.reduce((n, it) => n + lineTotal(it), 0);
  // Product prices include GST, so the GST inside each line is total * rate / (1 + rate).
  const sliceInclusiveGstPaise = items.reduce((n, it) => {
    const rate = Number(it.taxRateBps ?? 500);
    return n + Math.round((lineTotal(it) * rate) / (10000 + rate));
  }, 0);

  const orderSubtotalPaise = Number(order.subtotalPaise) || sliceSubtotalPaise;
  const vendorCount = Array.isArray(order.vendorIds) ? order.vendorIds.length : 1;
  const ratio = vendorCount <= 1 ? 1 : Math.min(1, sliceSubtotalPaise / orderSubtotalPaise);
  const discountSharePaise = Math.round((Number(order.discountAmountPaise) || 0) * ratio);
  const shippingSharePaise = Math.round((Number(order.shippingAmountPaise) || 0) * ratio);
  const goodsPaise = Math.max(0, sliceSubtotalPaise - discountSharePaise);
  // What the customer pays for this vendor's parcel (goods after discount + its share of shipping).
  const totalPaise = vendorCount <= 1 && Number(order.totalAmountPaise) > 0
    ? Number(order.totalAmountPaise)
    : goodsPaise + shippingSharePaise;
  const taxPaise = sliceSubtotalPaise > 0 ? Math.round((sliceInclusiveGstPaise * goodsPaise) / sliceSubtotalPaise) : 0;
  const rupees = (paise: number) => Math.round(paise) / 100;
  const totalAmount = rupees(totalPaise);
  const taxValue = rupees(Math.min(taxPaise, totalPaise));
  const taxableAmount = rupees(totalPaise - Math.min(taxPaise, totalPaise));
  if (!(totalAmount > 0)) throw new HttpsError('failed-precondition', 'The order amount for this vendor is zero; cannot create a shipment.');

  // Weight and size: function inputs, else product data, else 1000 g and 10 x 10 x 10 cm.
  let weight = positiveInt(request.data?.weightGrams, 100000);
  if (!weight) {
    try {
      const refs = items.filter((it) => it.productId).map((it) => db().collection('products').doc(String(it.productId)));
      const prodSnaps = refs.length ? await db().getAll(...refs) : [];
      let sum = 0;
      let complete = prodSnaps.length === items.length && items.length > 0;
      prodSnaps.forEach((ps, i) => {
        const g = parseWeightGrams(ps.data()?.weightGrams ?? ps.data()?.weight);
        if (g) sum += g * (Number(items[i].quantity) || 1); else complete = false;
      });
      if (complete && sum > 0) weight = Math.min(sum, 100000);
    } catch (e: any) {
      logger.warn('Could not read product weights; using default', { message: e?.message });
    }
  }
  weight = weight || 1000;
  const length = positiveInt(request.data?.lengthCm, 300) || 10;
  const width = positiveInt(request.data?.widthCm, 300) || 10;
  const height = positiveInt(request.data?.heightCm, 300) || 10;

  const reg = vendor.addresses?.registeredAddress || vendor.addresses?.pickupAddress || {};
  const sellerAddress = joinAddress(reg.addressLine1, reg.addressLine2, reg.landmark, reg.city, reg.state, reg.pinCode ?? reg.pincode);
  const ekartOrderNumber = `${orderNumber}-${vendorId.slice(0, 6)}`;
  const hsn = str(items.find((it) => it.hsnCode)?.hsnCode);

  const basePayload: Record<string, any> = {
    seller_name: str(vendor.storeName || vendor.businessName),
    seller_address: sellerAddress,
    seller_gst_tin: gstin,
    consignee_gst_amount: 0,
    order_number: ekartOrderNumber,
    invoice_number: str(vo.invoiceNumber) || ekartOrderNumber,
    invoice_date: istDate(toDate(order.createdAt) || new Date()),
    consignee_name: consigneeName,
    consignee_alternate_phone: consigneePhone,
    payment_mode: isCod ? 'COD' : 'Prepaid',
    category_of_goods: 'Organic Food Products',
    products_desc: items.map((it) => str(it.name)).filter(Boolean).join(', ').slice(0, 200),
    ...(hsn ? { hsn_code: hsn } : {}),
    total_amount: totalAmount,
    tax_value: taxValue,
    taxable_amount: taxableAmount,
    commodity_value: String(taxableAmount),
    cod_amount: isCod ? totalAmount : 0,
    return_reason: '',
    quantity,
    weight,
    length,
    height,
    width,
    drop_location: {
      name: consigneeName,
      address: dropAddress,
      city: str(addr.city),
      state: str(addr.state),
      country: 'India',
      phone: Number(consigneePhone),
      pin: Number(dropPin)
    },
    pickup_location: { name: alias },
    return_location: { name: alias },
    service: 'SURFACE'
  };

  const ctx = { fn: 'createEkartShipment', orderNumber, vendorId };
  let payload = basePayload;
  let response: any;
  try {
    response = await ekartRequest('PUT', '/api/v1/package/create', { body: payload, ctx });
  } catch (e: any) {
    // EKART rejected the request as invalid: retry once with the full pickup/return
    // location instead of the alias-only autofill. Both attempts are in ekart_api_logs.
    const st = Number(e?.details?.ekartStatus);
    const isValidation = e instanceof HttpsError && e.code === 'failed-precondition' && (st === 400 || st === 422 || (st >= 200 && st < 300));
    const p = readPickupAddress(vendor);
    if (!isValidation || !p.addressLine1 || !p.pincode || !p.phone) throw e;
    const fullLocation = {
      name: alias,
      address: joinAddress(p.addressLine1, p.addressLine2),
      city: p.city,
      state: p.state,
      country: 'India',
      phone: Number(p.phone),
      pin: Number(p.pincode)
    };
    payload = { ...basePayload, pickup_location: fullLocation, return_location: fullLocation };
    logger.warn('EKART rejected alias-only locations; retrying with full location object', { orderNumber, vendorId, firstError: e.message });
    response = await ekartRequest('PUT', '/api/v1/package/create', { body: payload, ctx });
  }

  const trackingId = str(response?.tracking_id);
  if (!trackingId) {
    throw new HttpsError('failed-precondition', `EKART did not return a tracking id: ${extractEkartMessage(response, 'unexpected response')}`);
  }

  const now = new Date().toISOString();
  const trackingUrl = `${EKART_BASE_URL}/track/${trackingId}`;
  const carrierStatus = 'Order Placed';
  // A full replace (no merge) so nothing from an older fake "EKT…IN" document survives.
  await shipRef.set({
    id: shipmentId,
    shipmentId,
    orderNumber,
    orderId: orderNumber,
    parentOrderId: orderNumber,
    vendorOrderId: vendorId,
    vendorId,
    userId: order.userId || null,
    carrier: 'ekart',
    ekartTrackingId: trackingId,
    ekartOrderNumber,
    waybill: trackingId,
    trackingNumber: trackingId,
    courierWbn: response?.barcodes?.wbn ?? null,
    courierVendor: response?.vendor ?? null,
    trackingUrl,
    status: 'manifested',
    carrierStatus,
    payment: { mode: isCod ? 'COD' : 'Pre-paid', codAmount: isCod ? totalAmount : 0, totalAmount },
    packageDetails: { itemCount: quantity, weightGrams: weight, dimensions: { lengthCm: length, widthCm: width, heightCm: height }, description: basePayload.products_desc },
    pickupLocation: alias,
    scans: [],
    earningsReleased: false,
    createdBy: uid,
    createdAt: now,
    updatedAt: now
  });
  // Request/response contain the customer's address, and `shipments` is readable by
  // signed-in users, so they are kept in an admin-SDK-only sub-document.
  await shipRef.collection('private').doc('ekart').set({
    requestPayload: sanitize(payload),
    rawResponse: sanitize(response),
    createdAt: now
  });

  await voRef.set({
    awbNumber: trackingId,
    trackingNumber: trackingId,
    trackingUrl,
    carrier: 'ekart',
    shipmentStatus: 'Manifested',
    shipmentId,
    manifestedAt: now,
    updatedAt: now
  }, { merge: true });

  return { success: true, waybill: trackingId, trackingId, trackingUrl, shipmentId, status: carrierStatus, carrier: 'ekart' };
});

// ---------------------------------------------------------------------------
// d) trackEkartShipment
// ---------------------------------------------------------------------------

export const trackEkartShipment = onCall({ region: REGION, secrets: EKART_API_SECRETS }, async (request) => {
  const waybill = str(request.data?.waybill);
  if (!waybill) throw new HttpsError('invalid-argument', 'waybill is required.');
  if (/^EKT\d{8}IN$/.test(waybill)) {
    throw new HttpsError('failed-precondition', 'This AWB was generated by the old system and was never sent to EKART. Create the shipment again to get a real EKART tracking id.');
  }

  const shipDoc = await findShipmentByTrackingId(waybill);
  const ship = shipDoc?.data();
  const t = await fetchEkartTracking(waybill, 'trackEkartShipment', { orderNumber: ship?.orderNumber, vendorId: ship?.vendorId });
  let status: string | null = normalizeEkartStatus(t.carrierStatus);
  if (shipDoc) {
    await applyTrackingUpdate(shipDoc.ref, ship, { ...t, source: 'trackEkartShipment' });
    if (!status) status = str(ship?.status) || null;
  }
  return {
    success: true,
    waybill,
    carrier: 'ekart',
    status: status || 'in_transit',
    carrierStatus: t.carrierStatus,
    description: t.desc,
    expectedDeliveryDate: t.edd,
    scans: t.scans
  };
});

// ---------------------------------------------------------------------------
// e) getEkartLabel
// ---------------------------------------------------------------------------

/** Loads a shipment by tracking id and checks the caller is an admin or its vendor. */
async function loadOwnedShipment(request: CallableRequest<any>, waybill: string) {
  const uid = requireAuth(request);
  const shipDoc = await findShipmentByTrackingId(waybill);
  if (!shipDoc) throw new HttpsError('not-found', `No shipment found for ${waybill}.`);
  const ship = shipDoc.data();
  if (!(await isAdminUid(uid))) {
    const vendorSnap = await db().collection('vendors').doc(str(ship.vendorId)).get();
    if (!ownsVendor(uid, str(ship.vendorId), vendorSnap.data())) {
      throw new HttpsError('permission-denied', 'This shipment belongs to another vendor.');
    }
  }
  return { shipDoc, ship };
}

export const getEkartLabel = onCall({ region: REGION, secrets: EKART_API_SECRETS }, async (request) => {
  const waybill = str(request.data?.waybill);
  if (!waybill) throw new HttpsError('invalid-argument', 'waybill is required.');
  const { shipDoc, ship } = await loadOwnedShipment(request, waybill);
  if (!ship.ekartTrackingId) {
    throw new HttpsError('failed-precondition', 'This shipment was never created at EKART, so it has no label. Create the shipment again.');
  }

  const pdf = await ekartRequest<Buffer>('POST', '/api/v1/package/label', {
    query: { json_only: false },
    body: { ids: [waybill] },
    expect: 'pdf',
    ctx: { fn: 'getEkartLabel', orderNumber: ship.orderNumber, vendorId: ship.vendorId }
  });

  const filePath = `shipping-labels/${waybill}.pdf`;
  const file = getStorage().bucket(STORAGE_BUCKET).file(filePath);
  const downloadToken = randomUUID();
  await file.save(pdf, {
    contentType: 'application/pdf',
    resumable: false,
    metadata: { cacheControl: 'private, max-age=0', metadata: { firebaseStorageDownloadTokens: downloadToken } }
  });

  let labelUrl: string;
  let urlType = 'signed';
  try {
    const [signed] = await file.getSignedUrl({ version: 'v4', action: 'read', expires: Date.now() + 7 * 24 * 60 * 60 * 1000 - 60_000 });
    labelUrl = signed;
  } catch (e: any) {
    // Signing needs the "Service Account Token Creator" role on the runtime service account.
    // Until that is granted, fall back to a private download-token link for the same file.
    logger.error('Could not sign label URL; using download-token URL instead', { message: e?.message });
    labelUrl = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodeURIComponent(filePath)}?alt=media&token=${downloadToken}`;
    urlType = 'download-token';
  }

  await shipDoc.ref.set({ labelPath: filePath, labelGeneratedAt: new Date().toISOString() }, { merge: true });
  return { success: true, waybill, carrier: 'ekart', labelUrl, urlType };
});

// ---------------------------------------------------------------------------
// f) cancelEkartShipment
// ---------------------------------------------------------------------------

export const cancelEkartShipment = onCall({ region: REGION, secrets: EKART_API_SECRETS }, async (request) => {
  const waybill = str(request.data?.waybill);
  const reason = str(request.data?.reason).slice(0, 300);
  if (!waybill) throw new HttpsError('invalid-argument', 'waybill is required.');
  const { shipDoc, ship } = await loadOwnedShipment(request, waybill);
  if (!ship.ekartTrackingId) {
    throw new HttpsError('failed-precondition', 'This shipment was never created at EKART, so there is nothing to cancel there.');
  }

  // Throws with EKART's reason unless EKART confirms the cancellation.
  const res: any = await ekartRequest('DELETE', '/api/v1/package/cancel', {
    query: { tracking_id: waybill },
    ctx: { fn: 'cancelEkartShipment', orderNumber: ship.orderNumber, vendorId: ship.vendorId }
  });

  const now = new Date().toISOString();
  await shipDoc.ref.set({
    status: 'cancelled',
    carrierStatus: 'Cancelled',
    cancelledAt: now,
    cancelledBy: request.auth!.uid,
    cancellationReason: reason || null,
    updatedAt: now
  }, { merge: true });
  await shipDoc.ref.collection('private').doc('ekart').set({ cancelResponse: sanitize(res), cancelledAt: now }, { merge: true });

  if (ship.orderNumber && ship.vendorId) {
    const voRef = db().collection('orders').doc(ship.orderNumber).collection('vendor_orders').doc(ship.vendorId);
    const voSnap = await voRef.get();
    if (voSnap.exists && voSnap.data()!.awbNumber === waybill) {
      // The order itself is not cancelled — only its shipment — so it can be dispatched again.
      await voRef.set({
        shipmentStatus: 'cancelled',
        awbNumber: FieldValue.delete(),
        trackingNumber: null,
        trackingUrl: FieldValue.delete(),
        lastCancelledAwb: waybill,
        updatedAt: now
      }, { merge: true });
    }
  }

  return { success: true, waybill, status: 'Cancelled', carrier: 'ekart', message: str(res?.remark || res?.message) || 'EKART confirmed the cancellation.' };
});

// ---------------------------------------------------------------------------
// g) ekartWebhook (HTTPS, called by EKART)
// ---------------------------------------------------------------------------

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export const ekartWebhook = onRequest({ region: REGION, secrets: [EKART_WEBHOOK_SECRET] }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, message: 'POST only' });
    return;
  }

  const rawBody: Buffer = (req as any).rawBody || Buffer.from(JSON.stringify(req.body ?? {}));
  const body: any = req.body && typeof req.body === 'object' ? req.body : {};

  // Signature check. EKART's signature header name is not confirmed yet, so every
  // plausible header is compared and the result is only logged — nothing is rejected.
  const secret = EKART_WEBHOOK_SECRET.value();
  const hmac = createHmac('sha256', secret).update(rawBody);
  const digest = hmac.digest();
  const expected = [digest.toString('hex'), digest.toString('base64')];
  const candidateHeaders = Object.keys(req.headers).filter((h) => /sign|hmac|hash|digest/i.test(h));
  let signatureHeader: string | null = null;
  for (const h of candidateHeaders) {
    const value = String(req.headers[h] ?? '').replace(/^sha256=/i, '').trim();
    if (expected.some((e) => safeEqual(e, value) || safeEqual(e, value.toLowerCase()))) { signatureHeader = h; break; }
  }
  const signatureValid = signatureHeader !== null;

  const headersForLog: Record<string, any> = {};
  for (const [k, v] of Object.entries(req.headers)) {
    headersForLog[k] = /^(authorization|cookie)$/i.test(k) ? '[REDACTED]' : v;
  }

  const payload = body.data && typeof body.data === 'object' ? { ...body, ...body.data } : body;
  const trackingId = str(payload.id || payload.tracking_id || payload.trackingId || payload.wbn);
  const topic = str(body.topic || body.event || body.type || req.headers['x-topic'] || req.headers['x-event']);

  const logRecord: Record<string, any> = {
    function: 'ekartWebhook', method: 'POST', path: '/ekartWebhook', direction: 'inbound',
    headers: headersForLog, requestBody: body, topic, trackingId,
    signatureHeaderCandidates: candidateHeaders, signatureHeader, signatureValid
  };

  try {
    if (!trackingId) {
      await logEkartEvent({ ...logRecord, status: 200, result: 'ignored: no tracking id in body' });
      res.status(200).json({ success: true });
      return;
    }
    const shipDoc = await findShipmentByTrackingId(trackingId);
    if (!shipDoc) {
      await logEkartEvent({ ...logRecord, status: 200, result: 'ignored: unknown tracking id' });
      res.status(200).json({ success: true });
      return;
    }
    const ship = shipDoc.data();

    let update: TrackingUpdate;
    if (signatureValid) {
      update = {
        carrierStatus: str(payload.status),
        desc: str(payload.desc),
        location: str(payload.location),
        edd: toIso(payload.edd),
        eventTime: toIso(payload.ctime),
        source: 'ekartWebhook'
      };
    } else {
      // The sender is not proven to be EKART yet. A forged "Delivered" would make a vendor
      // payout eligible, so the body is treated only as a hint and the real status is
      // read back from EKART's own tracking API.
      const t = await fetchEkartTracking(trackingId, 'ekartWebhook', { orderNumber: ship.orderNumber, vendorId: ship.vendorId });
      update = { ...t, source: 'ekartWebhook:verified-via-track-api' };
    }

    const applied = update.carrierStatus ? await applyTrackingUpdate(shipDoc.ref, ship, update) : null;
    await logEkartEvent({
      ...logRecord, status: 200, orderNumber: ship.orderNumber, vendorId: ship.vendorId,
      result: `applied: ${update.carrierStatus || 'no status'} -> ${applied || 'unchanged'}`, statusSource: update.source
    });
    res.status(200).json({ success: true });
  } catch (e: any) {
    await logEkartEvent({ ...logRecord, status: 500, result: `error: ${e?.message || e}` }, true);
    // 500 so EKART retries the delivery later.
    res.status(500).json({ success: false });
  }
});

// ---------------------------------------------------------------------------
// h) registerEkartWebhook
// ---------------------------------------------------------------------------

export const registerEkartWebhook = onCall({ region: REGION, secrets: [...EKART_API_SECRETS, EKART_WEBHOOK_SECRET] }, async (request) => {
  const uid = await requireAdmin(request);
  const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  if (!projectId) throw new HttpsError('internal', 'Could not determine the Firebase project id.');
  const url = `https://${REGION}-${projectId}.cloudfunctions.net/ekartWebhook`;

  const res: any = await ekartRequest('POST', '/api/v2/webhook', {
    body: { url, secret: EKART_WEBHOOK_SECRET.value(), topics: ['track_updated', 'shipment_created'], active: true },
    ctx: { fn: 'registerEkartWebhook' }
  });

  await db().collection('settings').doc('shipping').set({
    ekartWebhook: { url, topics: ['track_updated', 'shipment_created'], registeredAt: new Date().toISOString(), registeredBy: uid, response: sanitize(res) }
  }, { merge: true });

  return { success: true, url, message: str(res?.remark || res?.message) || 'Webhook registered with EKART.' };
});
