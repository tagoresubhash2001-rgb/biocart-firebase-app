/**
 * EKART (Ekart Elite) shipping — real API only.
 *   checkEkartPincode, createEkartShipment, trackEkartShipment, getEkartLabel,
 *   cancelEkartShipment, ekartWebhook, pollEkartShipments,
 *   registerEkartPickupAddress (admin), registerEkartWebhook (admin)
 */
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getStorage } from 'firebase-admin/storage';
import * as crypto from 'node:crypto';
import { db, FieldValue, REGION, EKART_SECRETS, getCaller, isAdminCaller, requireAdmin, callerOwnsVendor, nowIso, rupees, cleanPhone, cleanPincode, audit, loadCourierRates } from './core';
import { computeEkartCourierCharge, computeEkartRtoCharge, normaliseCourierRates } from './courierRates';
import {
  checkServiceability, createShipment, cancelShipment, downloadLabelPdf, trackShipment, addAddress, addWebhook, listWebhooks,
  verifyEkartHmac, ekartWebhookSecret, normaliseEkartStatus, EkartApiError, pricingEstimate, maskSensitive,
  listAddresses,
} from './ekartApi';
import { bookCourierCharge, EarningsState } from './ledger';

/**
 * Books the EKART courier charge (vendor's cost) on the sub-order and the vendor wallet, once per kind.
 * Returns the amount booked (0 when already booked).
 */
export async function applyCourierCharge(orderId: string, vendorId: string, kind: 'forward' | 'rto', amountPaise: number, source: Record<string, any>) {
  if (!(amountPaise > 0)) return 0;
  const ref = db().collection('orders').doc(orderId).collection('vendor_orders').doc(vendorId);
  return db().runTransaction(async (t) => {
    const ss = await t.get(ref);
    if (!ss.exists) return 0;
    const so = ss.data()!;
    if (so.courierCharges?.[kind] != null) return 0;
    const state = (so.earnings?.state || 'none') as EarningsState;
    if (state === 'none' || state === 'reversed') {
      // money for this order is not (or no longer) in the wallet: recover from the next settlement
      bookCourierCharge(t, orderId, vendorId, kind, amountPaise, 'settled');
    } else {
      bookCourierCharge(t, orderId, vendorId, kind, amountPaise, state);
    }
    t.update(ref, {
      [`courierCharges.${kind}`]: amountPaise, courierChargePaise: FieldValue.increment(amountPaise),
      [`courierChargeSource.${kind}`]: source, updatedAt: nowIso(),
    });
    return amountPaise;
  });
}
/**
 * Replaces the courier-charge estimate held at order time with the real charge once the parcel is booked.
 * Lower than the hold → the difference goes back to the seller; higher → more is held. Booked once per booking.
 * Orders placed before the hold existed have nothing held, so the full charge is taken here (as before).
 */
export async function settleCourierActual(orderId: string, vendorId: string, actualPaise: number, details: Record<string, any>) {
  const ref = db().collection('orders').doc(orderId).collection('vendor_orders').doc(vendorId);
  return db().runTransaction(async (t) => {
    const ss = await t.get(ref);
    if (!ss.exists) return { heldPaise: 0, actualPaise: 0, deltaPaise: 0 };
    const so = ss.data()!;
    const hadCharge = so.courierCharges?.forward != null;
    const held = Math.round(Number(so.courierCharges?.forward) || 0);
    const delta = actualPaise - held;
    const raw = (so.earnings?.state || 'none') as EarningsState;
    const state: EarningsState = raw === 'none' || raw === 'reversed' ? 'settled' : raw;
    const ts = nowIso();
    if (delta !== 0) bookCourierCharge(t, orderId, vendorId, hadCharge ? 'adjust' : 'forward', delta, state, hadCharge ? `_${details.awb || Date.now()}` : '');
    const totalCourier = (Number(so.courierChargePaise) || 0) + delta;
    const net = Math.max(0, (Number(so.vendorPayablePaise) || 0) - totalCourier);
    t.update(ref, {
      'courierCharges.forward': actualPaise, courierChargePaise: FieldValue.increment(delta),
      'courierChargeSource.forward': { ...details, at: ts },
      'courier.actualChargePaise': actualPaise, 'courier.actualCharge': rupees(actualPaise), 'courier.status': 'held_actual', 'courier.actualAt': ts,
      'courier.actualGrams': details.weightGrams ?? null, 'courier.actualBillableGrams': details.billableGrams ?? null, 'courier.actualSource': details.type || null,
      'courier.adjustmentPaise': delta, 'courier.heldPaise': actualPaise,
      netPayoutPaise: net, netPayout: rupees(net), courierChargeStatus: 'booked', updatedAt: ts,
    });
    return { heldPaise: held, actualPaise, deltaPaise: delta };
  });
}
import { markSubOrderDelivered, recomputeParentStatus } from './orders';

const WEBHOOK_URL = process.env.EKART_WEBHOOK_URL || 'https://asia-southeast1-bio-cart.cloudfunctions.net/ekartWebhook';
const shipmentId = (orderId: string, vendorId: string) => `ekart_${orderId}_${vendorId}`;
/** EKART's full error text (message | description | remark | field errors), phones masked. */
const friendly = (e: any) => (e instanceof EkartApiError ? e.full : String(e?.message || e));

export const checkEkartPincode = onCall({ region: REGION, secrets: EKART_SECRETS }, async (request) => {
  const pin = cleanPincode(request.data?.pincode);
  if (!pin) return { success: false, serviceable: false, pincode: String(request.data?.pincode || ''), prepaid: false, cod: false, message: 'Enter a valid 6-digit PIN code.' };
  try {
    const s = await checkServiceability(pin);
    return { success: true, serviceable: s.serviceable, pincode: pin, prepaid: s.serviceable, cod: s.cod, city: s.city, state: s.state, message: s.serviceable ? undefined : (s.remark || 'Delivery is not available to this PIN code yet.') };
  } catch (e: any) {
    console.error('[EKART] serviceability error', JSON.stringify({ pin, error: friendly(e) }));
    throw new HttpsError('unavailable', 'Could not check delivery for this PIN code right now. You can still continue; we will confirm before shipping.');
  }
});

async function loadSubOrderForCaller(auth: any, orderId: string, vendorId: string) {
  const caller = await getCaller(auth);
  const admin = isAdminCaller(caller);
  if (!admin && !(await callerOwnsVendor(caller, vendorId))) throw new HttpsError('permission-denied', 'This order does not belong to your store.');
  const ref = db().collection('orders').doc(orderId).collection('vendor_orders').doc(vendorId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Order not found for this store.');
  return { caller, admin, ref, so: snap.data()! };
}

export const createEkartShipment = onCall({ region: REGION, secrets: EKART_SECRETS, timeoutSeconds: 60 }, async (request) => {
  const orderId = String(request.data?.orderNumber || request.data?.orderId || '');
  const vendorId = String(request.data?.vendorId || '');
  const { caller, ref, so } = await loadSubOrderForCaller(request.auth, orderId, vendorId);
  const sRef = db().collection('shipments').doc(shipmentId(orderId, vendorId));

  const existing = await sRef.get();
  if (existing.exists && existing.data()!.awb) {
    const d = existing.data()!;
    return { success: true, waybill: d.awb, shipmentId: sRef.id, status: d.status, carrier: 'ekart', trackingUrl: d.trackingUrl };
  }
  if (so.status !== 'packed') throw new HttpsError('failed-precondition', 'Mark the order as Packed before booking the courier.');
  if (!['paid', 'cod_pending'].includes(String(so.paymentStatus))) throw new HttpsError('failed-precondition', 'This order is not paid yet.');

  const vendorSnap = await db().collection('vendors').doc(vendorId).get();
  const vendor = vendorSnap.data() || {};
  // Use the vendor's linked EKART pickup address; if none is linked yet, pick the matching address
  // that is already saved in the EKART panel (same PIN code) and remember it.
  let alias = vendor.ekartPickupAlias as string | undefined;
  if (!alias) alias = (await findSavedEkartAlias(vendor).catch(() => null)) || undefined;
  if (alias && !vendor.ekartPickupAlias) await vendorSnap.ref.update({ ekartPickupAlias: alias, ekartPickupRegisteredAt: nowIso(), ekartPickupSource: 'ekart_panel' });
  if (!alias) throw new HttpsError('failed-precondition', await pickupProblem(vendor));

  // A shipment is only blocked when the seller's phone or pickup address is missing.
  // A missing GSTIN never blocks: unregistered sellers are sent to EKART with an empty GSTIN.
  const pickupAddr = (vendor.addresses?.pickupAddress?.addressLine1 ? vendor.addresses.pickupAddress : vendor.addresses?.registeredAddress) || {};
  const sellerPhone = cleanPhone(vendor.addresses?.pickupAddress?.contactPhone || vendor.phone);
  if (!sellerPhone) throw new HttpsError('failed-precondition', 'Your store has no 10-digit phone number. Add it in Settings (store phone / pickup contact phone), then book the courier again.');
  if (!String(pickupAddr.addressLine1 || '').trim() || !cleanPincode(pickupAddr.pinCode || pickupAddr.pincode)) {
    throw new HttpsError('failed-precondition', 'Your pickup address is incomplete (address line and 6-digit PIN code are needed). Update it in Settings → Shipping, then book the courier again.');
  }

  // Parcel weight comes from the order itself (ordered size × quantity, e.g. 2 × 1kg = 2000 g).
  // The seller may add packing weight, but can never declare less than the products weigh.
  const orderWeight = Math.round(Number(so.totalWeightGrams) || 0);
  const weight = Math.max(Math.round(Number(request.data?.weightGrams) || 0), orderWeight);
  const L = Math.round(Number(request.data?.lengthCm) || 0), W = Math.round(Number(request.data?.widthCm) || 0), H = Math.round(Number(request.data?.heightCm) || 0);
  if (weight < 1 || L < 1 || W < 1 || H < 1) throw new HttpsError('invalid-argument', 'Enter the packed parcel weight (grams) and size (cm).');

  // Lock: only one booking attempt at a time for this sub-order.
  try {
    await sRef.create({ id: sRef.id, status: 'booking', parentOrderId: orderId, orderNumber: orderId, vendorId, userId: so.userId, carrier: 'ekart', createdAt: nowIso() });
  } catch {
    const cur = (await sRef.get()).data() || {};
    if (cur.awb) return { success: true, waybill: cur.awb, shipmentId: sRef.id, status: cur.status, carrier: 'ekart' };
    if (cur.status === 'booking' && Date.now() - Date.parse(cur.createdAt || 0) < 120_000) throw new HttpsError('aborted', 'Booking already in progress. Please wait a moment.');
    await sRef.set({ status: 'booking', createdAt: nowIso() }, { merge: true });
  }

  const f = so.fulfilment || {};
  const totalRupees = rupees(so.customerPaidPaise || so.subtotalPaise || 0);
  const codRupees = f.paymentMode === 'COD' ? rupees(f.codAmountPaise || 0) : 0;
  const qty = (so.items || []).reduce((s: number, it: any) => s + (it.quantity || 1), 0) || 1;
  const today = new Date().toISOString().slice(0, 10);
  const sellerAddr = vendor.addresses?.registeredAddress || vendor.addresses?.pickupAddress || {};
  const payload = {
    seller_name: vendor.storeName || vendor.businessName || 'BioCart Seller',
    seller_address: ([sellerAddr.addressLine1 || sellerAddr.line1 || sellerAddr.address || sellerAddr.street, sellerAddr.city, sellerAddr.state, sellerAddr.pinCode || sellerAddr.pincode || sellerAddr.zip].filter(Boolean).join(', ') || 'India') + (!vendor.legal?.gstin && vendor.legal?.udyam ? ` (Udyam: ${vendor.legal.udyam})` : ''),
    seller_gst_tin: vendor.legal?.gstin || '',
    consignee_gst_amount: 0,
    order_number: `${orderId}-${vendorId.slice(0, 8)}`,
    invoice_number: `${orderId}-${vendorId.slice(0, 8)}`,
    invoice_date: today,
    consignee_name: f.name,
    consignee_alternate_phone: f.phone,
    payment_mode: f.paymentMode === 'COD' ? 'COD' : 'Prepaid',
    category_of_goods: 'Organic products',
    products_desc: (so.items || []).map((i: any) => `${i.name} x${i.quantity}`).join(', ').slice(0, 200),
    total_amount: Math.max(1, totalRupees),
    tax_value: 0,
    taxable_amount: Math.max(1, totalRupees),
    commodity_value: String(Math.max(1, totalRupees)),
    cod_amount: codRupees,
    quantity: qty,
    weight, length: L, width: W, height: H,
    return_reason: '',
    drop_location: { name: f.name, phone: Number(cleanPhone(f.phone)), address: f.address, city: f.city, state: f.state, country: 'India', pin: Number(f.zip) },
    pickup_location: { name: alias },
    return_location: { name: alias },
  };

  let booked;
  try {
    booked = await createShipment(payload);
  } catch (e: any) {
    const msg = friendly(e);
    await sRef.set({
      status: 'booking_failed', lastError: msg, updatedAt: nowIso(),
      lastErrorStatus: e instanceof EkartApiError ? e.status : null,
      lastErrorResponse: e instanceof EkartApiError ? maskSensitive(e.body ?? null) : null,
      lastErrorRequest: maskSensitive(payload),
    }, { merge: true });
    console.error('[EKART] booking failed', JSON.stringify({ orderId, vendorId, error: msg }));
    throw new HttpsError('unavailable', `EKART could not book this shipment: ${msg}`);
  }
  const ts = nowIso();
  const trackingUrl = `https://app.elite.ekartlogistics.in/track/${booked.trackingId}`;
  await sRef.set({
    awb: booked.trackingId, waybill: booked.trackingId, trackingNumber: booked.trackingId, vendorWaybill: booked.wbn || null, courierPartner: booked.vendor || null,
    status: 'pickup_pending', trackingUrl, weightGrams: weight, lengthCm: L, widthCm: W, heightCm: H,
    earningsReleased: false, events: [], lastEventAt: 0, bookedBy: caller.uid, dispatchedAt: ts, updatedAt: ts,
  }, { merge: true });
  await ref.update({
    status: 'shipped', orderStatus: 'shipped', shipmentStatus: 'pickup_pending', awbNumber: booked.trackingId, trackingNumber: booked.trackingId,
    carrier: 'ekart', trackingUrl, shippedAt: ts, updatedAt: ts,
    statusHistory: FieldValue.arrayUnion({ status: 'shipped', at: ts, by: caller.uid, role: 'vendor', reason: `EKART AWB ${booked.trackingId}` }),
  });
  await recomputeParentStatus(orderId);

  // Real courier charge for the parcel as booked (real weight and size): EKART's own price for our
  // rate card, or our rate-card formula if EKART's price service does not answer. It replaces the
  // estimate that was held from the seller's share when the order was paid.
  let courierChargePaise = 0;
  try {
    const rates = normaliseCourierRates(so.courier?.ratesSnapshot || (await loadCourierRates()));
    const isCod = f.paymentMode === 'COD';
    const formula = computeEkartCourierCharge({ actualGrams: weight, lengthCm: L, widthCm: W, heightCm: H, cod: isCod, codAmountRupees: codRupees }, rates);
    let actualPaise = formula.chargePaise;
    let billableGrams = formula.billableGrams;
    let source: Record<string, any> = { type: 'rate_card_formula', awb: booked.trackingId };
    try {
      const pickupPin = String(vendor.addresses?.pickupAddress?.pinCode || vendor.addresses?.pickupAddress?.pincode || sellerAddr.pinCode || sellerAddr.pincode || '');
      const est = await pricingEstimate({ pickupPin, dropPin: String(f.zip), weightGrams: weight, lengthCm: L, widthCm: W, heightCm: H, cod: isCod, codAmount: codRupees, invoiceAmount: Math.max(1, totalRupees) });
      actualPaise = est.totalPaise;
      if (est.billingGrams > 0) billableGrams = est.billingGrams;
      source = { type: 'ekart_pricing_estimate', awb: booked.trackingId, zone: est.zone || null, ekartReply: est.raw, formulaPaise: formula.chargePaise };
    } catch (e: any) {
      console.warn('[EKART] price estimate failed; using the rate-card formula', friendly(e));
      source.estimateError = friendly(e).slice(0, 300);
    }
    const r = await settleCourierActual(orderId, vendorId, actualPaise, { ...source, weightGrams: weight, billableGrams, lengthCm: L, widthCm: W, heightCm: H });
    courierChargePaise = r.actualPaise;
    const rtoChargePaise = computeEkartRtoCharge(billableGrams, rates);
    await sRef.set({ courierEstimate: { forwardPaise: actualPaise, rtoTotalPaise: actualPaise + rtoChargePaise, billableGrams, source: source.type, at: nowIso() }, rtoChargePaise, courierHeldBeforePaise: r.heldPaise, courierAdjustmentPaise: r.deltaPaise }, { merge: true });
  } catch (e: any) {
    console.error('[EKART] courier charge could not be booked; admin must enter it', friendly(e));
    await ref.set({ courierChargeStatus: 'needs_admin', courierChargeError: friendly(e).slice(0, 200) }, { merge: true });
  }
  return { success: true, waybill: booked.trackingId, shipmentId: sRef.id, status: 'pickup_pending', carrier: 'ekart', trackingUrl, courierCharge: rupees(courierChargePaise) };
});

/** Applies authoritative Ekart tracking data to the shipment + sub-order. */
async function applyTracking(sRef: FirebaseFirestore.DocumentReference, track: any) {
  const t = track?.track || track || {};
  const details: any[] = Array.isArray(t.details) && t.details.length ? t.details : [{ status: t.status, ctime: t.ctime, desc: t.desc, location: t.location }];
  const snap = await sRef.get();
  const s = snap.data() || {};
  const known = new Set((s.events || []).map((e: any) => `${e.ctime}_${e.status}`));
  const fresh = details.filter((d) => d?.status && !known.has(`${d.ctime}_${d.status}`)).map((d) => ({ status: d.status, ctime: Number(d.ctime) || 0, desc: d.desc || '', location: d.location || '' }));
  const all = [...(s.events || []), ...fresh].sort((a, b) => a.ctime - b.ctime);
  const latest = all[all.length - 1];
  const latestCtime = latest?.ctime || 0;
  const update: Record<string, any> = { events: all.slice(-100), updatedAt: nowIso() };
  if (latest && latestCtime >= (s.lastEventAt || 0)) {
    const n = normaliseEkartStatus(latest.status);
    update.status = n.shipment; update.carrierStatus = latest.status; update.lastEventAt = latestCtime;
    if (t.ndrStatus) update.ndrStatus = t.ndrStatus;
    if (track?.edd) update.expectedDeliveryAt = new Date(Number(track.edd)).toISOString();
    if (n.delivered) update.deliveredAt = new Date(latestCtime || Date.now()).toISOString();
  }
  await sRef.set(update, { merge: true });
  const st = update.status || s.status;
  if (s.parentOrderId && s.vendorId) {
    const soRef = db().collection('orders').doc(s.parentOrderId).collection('vendor_orders').doc(s.vendorId);
    if (st === 'delivered') {
      await markSubOrderDelivered(s.parentOrderId, s.vendorId, update.deliveredAt || nowIso(), 'ekart');
      await sRef.set({ earningsReleased: true }, { merge: true });
    } else if (st) {
      const soUpdate: Record<string, any> = { shipmentStatus: st, updatedAt: nowIso() };
      if (['rto_delivered', 'lost', 'damaged'].includes(st)) { soUpdate.status = 'rto'; soUpdate.orderStatus = 'rto'; soUpdate.needsAdminAction = `Shipment ${st.replace('_', ' ')} — decide refund/replacement`; }
      await soRef.set(soUpdate, { merge: true });
      // Parcel coming back: EKART bills the return trip too (rate card RTO total minus the forward part already charged).
      if (st === 'rto_in_progress' || st === 'rto_delivered') {
        // RTO block of the rate card that applied to this order (currently ₹0); older shipments use EKART's stored estimate.
        const est = s.courierEstimate || {};
        const extra = s.rtoChargePaise != null ? Math.max(0, Number(s.rtoChargePaise) || 0) : Math.max(0, Number(est.rtoTotalPaise || 0) - Number(est.forwardPaise || 0));
        if (extra > 0) await applyCourierCharge(s.parentOrderId, s.vendorId, 'rto', extra, { type: 'ekart_rate_card_rto', awb: s.awb }).catch((e) => console.warn('[EKART] RTO charge failed', e));
      }
      if (soUpdate.status) await recomputeParentStatus(s.parentOrderId);
    }
  }
  return { status: st, events: all };
}

async function findShipmentByAwb(awb: string) {
  const q = await db().collection('shipments').where('awb', '==', awb).limit(1).get();
  return q.empty ? null : q.docs[0];
}

export const trackEkartShipment = onCall({ region: REGION, secrets: EKART_SECRETS }, async (request) => {
  const caller = await getCaller(request.auth);
  const awb = String(request.data?.waybill || '').trim();
  const doc = await findShipmentByAwb(awb);
  if (!doc) throw new HttpsError('not-found', 'No shipment with this tracking number.');
  const s = doc.data();
  const allowed = isAdminCaller(caller) || s.userId === caller.uid || (await callerOwnsVendor(caller, s.vendorId));
  if (!allowed) throw new HttpsError('permission-denied', 'You cannot view this shipment.');
  let result: any = { status: s.status, events: s.events || [] };
  let trackingError: string | null = null;
  try { result = await applyTracking(doc.ref, await trackShipment(awb)); } catch (e: any) { trackingError = friendly(e); console.error('[EKART] track failed', JSON.stringify({ awb, error: trackingError })); await doc.ref.set({ lastTrackError: trackingError, lastTrackErrorAt: nowIso() }, { merge: true }); }
  return {
    success: true, trackingError, waybill: awb, carrier: 'ekart', status: result.status, carrierStatus: (result.events || []).slice(-1)[0]?.status || s.carrierStatus || 'Booked',
    expectedDeliveryDate: s.expectedDeliveryAt || null, trackingUrl: s.trackingUrl,
    scans: (result.events || []).slice().reverse().map((e: any) => ({ timestamp: new Date(e.ctime || Date.now()).toISOString(), location: e.location || '', activity: e.desc || e.status, status: e.status })),
  };
});

export const getEkartLabel = onCall({ region: REGION, secrets: EKART_SECRETS }, async (request) => {
  const awb = String(request.data?.waybill || '').trim();
  const doc = await findShipmentByAwb(awb);
  if (!doc) throw new HttpsError('not-found', 'No shipment with this tracking number.');
  const s = doc.data();
  await loadSubOrderForCaller(request.auth, s.parentOrderId, s.vendorId);
  if (s.labelUrl) return { success: true, labelUrl: s.labelUrl };
  let pdf: Buffer;
  try { pdf = await downloadLabelPdf([awb]); } catch (e: any) {
    const msg = friendly(e);
    console.error('[EKART] label failed', JSON.stringify({ awb, error: msg }));
    await doc.ref.set({ lastLabelError: msg, lastLabelErrorAt: nowIso() }, { merge: true });
    throw new HttpsError('unavailable', `EKART label not ready: ${msg}`);
  }
  const bucket = getStorage().bucket();
  const path = `labels/${s.vendorId}/${awb}.pdf`;
  const token = crypto.randomUUID();
  await bucket.file(path).save(pdf, { resumable: false, metadata: { contentType: 'application/pdf', metadata: { firebaseStorageDownloadTokens: token } } });
  const labelUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
  await doc.ref.set({ labelUrl, labelPath: path }, { merge: true });
  return { success: true, labelUrl };
});

export const cancelEkartShipment = onCall({ region: REGION, secrets: EKART_SECRETS }, async (request) => {
  const awb = String(request.data?.waybill || '').trim();
  const doc = await findShipmentByAwb(awb);
  if (!doc) throw new HttpsError('not-found', 'No shipment with this tracking number.');
  const s = doc.data();
  const { caller, ref } = await loadSubOrderForCaller(request.auth, s.parentOrderId, s.vendorId);
  if (!['pickup_pending', 'booking_failed'].includes(String(s.status))) throw new HttpsError('failed-precondition', 'The courier has already picked up this parcel; it cannot be cancelled here.');
  try { await cancelShipment(awb); } catch (e: any) {
    const msg = friendly(e);
    console.error('[EKART] cancel failed', JSON.stringify({ awb, error: msg }));
    await doc.ref.set({ lastCancelError: msg, lastCancelErrorAt: nowIso() }, { merge: true });
    throw new HttpsError('unavailable', `EKART could not cancel: ${msg}`);
  }
  const ts = nowIso();
  await doc.ref.set({ status: 'cancelled', cancelledAt: ts, cancelledBy: caller.uid, awb: FieldValue.delete(), cancelledAwb: awb, updatedAt: ts }, { merge: true });
  await doc.ref.set({ history: FieldValue.arrayUnion({ awb, cancelledAt: ts }) }, { merge: true });
  await ref.update({
    status: 'packed', orderStatus: 'packed', shipmentStatus: 'packed', awbNumber: null, trackingNumber: null, updatedAt: ts,
    statusHistory: FieldValue.arrayUnion({ status: 'packed', at: ts, by: caller.uid, role: 'vendor', reason: `EKART booking ${awb} cancelled` }),
  });
  await recomputeParentStatus(s.parentOrderId);
  return { success: true, waybill: awb, status: 'cancelled', carrier: 'ekart' };
});

/** Webhook is only a trigger: the shipment is always re-read from EKART's tracking API. */
export const ekartWebhook = onRequest({ region: REGION, secrets: EKART_SECRETS }, async (req, res) => {
  if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }
  const raw = (req as any).rawBody ? (req as any).rawBody.toString('utf8') : '';
  const signed = verifyEkartHmac(raw, req.headers as any, ekartWebhookSecret());
  const id = String(req.body?.id || '').trim();
  if (!id) { res.status(200).json({ status: 'ignored' }); return; }
  try {
    const doc = await findShipmentByAwb(id);
    if (doc) await applyTracking(doc.ref, await trackShipment(id));
    await db().collection('courier_webhook_events').add({ awb: id, status: req.body?.status || null, signed, receivedAt: nowIso() });
    res.status(200).json({ status: 'ok' });
  } catch (e: any) {
    console.error('[EKART webhook]', friendly(e));
    res.status(500).json({ status: 'retry' });
  }
});

export const pollEkartShipments = onSchedule({ schedule: 'every 3 hours', region: REGION, secrets: EKART_SECRETS, timeoutSeconds: 540 }, async () => {
  const active = ['pickup_pending', 'in_transit', 'out_for_delivery', 'ndr', 'rto_in_progress'];
  const snap = await db().collection('shipments').where('status', 'in', active).limit(300).get();
  for (const d of snap.docs) {
    const awb = d.data().awb;
    if (!awb) continue;
    try { await applyTracking(d.ref, await trackShipment(awb)); } catch (e: any) {
      const msg = friendly(e);
      console.error('[EKART poll] track failed', JSON.stringify({ awb, error: msg }));
      await d.ref.set({ lastTrackError: msg, lastTrackErrorAt: nowIso() }, { merge: true }).catch(() => undefined);
    }
  }
});

/** Vendor pickup PIN code (pickup address first, then registered address). */
function vendorPickupPin(v: any): string {
  const a = v?.addresses?.pickupAddress || v?.addresses?.registeredAddress || {};
  return cleanPincode(a.pinCode || a.pincode || a.zip || v?.pickupPincode) || '';
}

/** Clear reason why no EKART pickup can be used for this vendor (embargo / no saved address). */
async function pickupProblem(v: any): Promise<string> {
  const pin = vendorPickupPin(v);
  if (!pin) return 'Your pickup address has no PIN code. Update it in Settings → Shipping, then try again.';
  const sv = await checkServiceability(pin).catch(() => null);
  if (sv && !sv.pickup) return `EKART does not collect parcels from PIN ${pin} right now (pickup paused by EKART for this area). Ask your EKART account manager to enable pickup for ${pin}, or use a pickup address in a PIN where EKART pickup is open.`;
  const saved = await listAddresses().catch(() => [] as any[]);
  const pins = Array.from(new Set(saved.map((x: any) => String(x?.pincode ?? x?.pin ?? '')).filter(Boolean))).slice(0, 6);
  return `No EKART pickup address saved for PIN ${pin}.` + (pins.length ? ` Addresses saved in EKART are for PIN ${pins.join(', ')}.` : ' No pickup addresses are saved in EKART yet.') + ' Add your pickup address in the EKART panel (Settings → Addresses) or ask BioCart admin (Vendors → Register EKART pickup).';
}

/** Alias of an address already saved in the EKART panel with the vendor's PIN code (null if none). */
async function findSavedEkartAlias(v: any): Promise<string | null> {
  const pin = vendorPickupPin(v);
  if (!pin) return null;
  const list = await listAddresses();
  const same = list.filter((x: any) => String(x?.pincode ?? x?.pin ?? x?.pinCode ?? '') === pin && (x?.alias || x?.name));
  if (!same.length) return null;
  const line = String(v?.addresses?.pickupAddress?.addressLine1 || '').toLowerCase().slice(0, 12);
  const best = (line && same.find((x: any) => String(x.address_line1 || '').toLowerCase().includes(line))) || same[0];
  return String(best.alias || best.name);
}

export const registerEkartPickupAddress = onCall({ region: REGION, secrets: EKART_SECRETS }, async (request) => {
  const caller = await requireAdmin(request.auth);
  const vendorId = String(request.data?.vendorId || '');
  const vRef = db().collection('vendors').doc(vendorId);
  const v = (await vRef.get()).data();
  if (!v) throw new HttpsError('not-found', 'Vendor not found.');
  const a = request.data?.address || v.addresses?.pickupAddress || v.addresses?.registeredAddress || {};
  const phone = cleanPhone(request.data?.phone || a.phone || v.phone);
  const pin = cleanPincode(a.pinCode || a.pincode || a.zip || v.pickupPincode);
  const line1 = String(a.addressLine1 || a.line1 || a.address || a.street || v.pickupAddressLine1 || '').trim();
  if (!phone || !pin || !line1) throw new HttpsError('invalid-argument', 'Vendor pickup address needs address line, 6-digit PIN code and 10-digit phone.');
  // Already saved in the EKART panel? Link it instead of adding a duplicate.
  if (!request.data?.alias && !request.data?.forceNew) {
    const existingAlias = await findSavedEkartAlias(v).catch(() => null);
    if (existingAlias) {
      await vRef.update({ ekartPickupAlias: existingAlias, ekartPickupRegisteredAt: nowIso(), ekartPickupSource: 'ekart_panel' });
      await audit(caller.uid, 'ekart_pickup_linked', 'vendor', vendorId, { alias: existingAlias });
      return { success: true, alias: existingAlias, linkedExisting: true };
    }
  }
  {
    const sv = await checkServiceability(cleanPincode((request.data?.address || v.addresses?.pickupAddress || {}).pinCode || (request.data?.address || v.addresses?.pickupAddress || {}).pincode || v.pickupPincode) || '').catch(() => null);
    if (sv && !sv.pickup) throw new HttpsError('failed-precondition', await pickupProblem(v));
  }
  const alias = String(request.data?.alias || `BC_${(v.storeName || vendorId).replace(/[^A-Za-z0-9]/g, '').slice(0, 20)}_${vendorId.slice(0, 6)}`);
  try {
    const r = await addAddress({ alias, phone: Number(phone), address_line1: line1, address_line2: a.addressLine2 || a.line2 || undefined, pincode: Number(pin), city: a.city, state: a.state, country: 'India' });
    if (r?.status === false) throw new EkartApiError(200, r);
  } catch (e: any) {
    throw new HttpsError('unavailable', `EKART rejected the address: ${friendly(e)}`);
  }
  await vRef.update({ ekartPickupAlias: alias, ekartPickupRegisteredAt: nowIso() });
  await audit(caller.uid, 'ekart_pickup_registered', 'vendor', vendorId, { alias });
  return { success: true, alias };
});

export const registerEkartWebhook = onCall({ region: REGION, secrets: EKART_SECRETS }, async (request) => {
  const caller = await requireAdmin(request.auth);
  const secret = ekartWebhookSecret();
  if (secret.length < 6) throw new HttpsError('failed-precondition', 'EKART_WEBHOOK_SECRET is not set.');
  const existing = await listWebhooks().catch(() => []);
  if (existing.some((w: any) => w.url === WEBHOOK_URL)) return { success: true, alreadyRegistered: true };
  const r = await addWebhook(WEBHOOK_URL, secret.slice(0, 30)).catch((e) => { throw new HttpsError('unavailable', friendly(e)); });
  await audit(caller.uid, 'ekart_webhook_registered', 'settings', 'ekart', { id: r?.id });
  return { success: true, id: r?.id || null };
});


/**
 * Admin: enter or correct the EKART courier charge for a seller's parcel (e.g. from EKART's invoice).
 * The difference against what was already charged is booked to the seller's wallet.
 */
export const setCourierCharge = onCall({ region: REGION }, async (request) => {
  const caller = await requireAdmin(request.auth);
  const orderId = String(request.data?.orderId || '');
  const vendorId = String(request.data?.vendorId || '');
  const kind = request.data?.kind === 'rto' ? 'rto' : 'forward';
  const target = Math.round(Number(request.data?.amount) * 100);
  const reason = String(request.data?.reason || '').trim();
  if (!orderId || !vendorId) throw new HttpsError('invalid-argument', 'Order and seller are required.');
  if (!Number.isFinite(target) || target < 0 || target > 1_000_000) throw new HttpsError('invalid-argument', 'Enter the courier charge in rupees (0–10,000).');
  if (reason.length < 5) throw new HttpsError('invalid-argument', 'Please write a short reason (e.g. "EKART invoice #123").');
  const ref = db().collection('orders').doc(orderId).collection('vendor_orders').doc(vendorId);
  const result = await db().runTransaction(async (t) => {
    const ss = await t.get(ref);
    if (!ss.exists) throw new HttpsError('not-found', 'Seller order not found.');
    const so = ss.data()!;
    const current = Number(so.courierCharges?.[kind] || 0);
    const delta = target - current;
    if (delta === 0) return { changed: false, current };
    const state = (so.earnings?.state || 'none') as EarningsState;
    bookCourierCharge(t, orderId, vendorId, current === 0 && so.courierCharges?.[kind] == null ? kind : 'correction', delta,
      state === 'none' || state === 'reversed' ? 'settled' : state, `_${Date.now()}`);
    t.update(ref, {
      [`courierCharges.${kind}`]: target, courierChargePaise: FieldValue.increment(delta), courierChargeStatus: 'set_by_admin',
      [`courierChargeSource.${kind}`]: { type: 'admin', by: caller.uid, reason, at: nowIso() }, updatedAt: nowIso(),
      ...(kind === 'forward' ? { 'courier.actualChargePaise': target, 'courier.actualCharge': rupees(target), 'courier.status': 'held_actual', 'courier.actualSource': 'admin', 'courier.heldPaise': target } : {}),
      netPayoutPaise: Math.max(0, (Number(so.vendorPayablePaise) || 0) - (Number(so.courierChargePaise) || 0) - delta),
      netPayout: rupees(Math.max(0, (Number(so.vendorPayablePaise) || 0) - (Number(so.courierChargePaise) || 0) - delta)),
    });
    return { changed: true, current, target };
  });
  await audit(caller.uid, 'courier_charge_set', 'vendor_order', `${orderId}_${vendorId}`, { kind, ...result, reason });
  return { success: true, ...result };
});
