import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { randomBytes } from 'node:crypto';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import * as PDFDocument from 'pdfkit';

admin.initializeApp();

const db = getFirestore();
const storage = getStorage();

interface OrderItemPayload {
  productId: string;
  quantity: number;
}

interface CreateOrderPayload {
  items: OrderItemPayload[];
  shippingAddress: any;
  billingAddress: any;
  couponCode?: string;
}

function generateRandomId(length: number): string {
  return randomBytes(Math.ceil(length / 2)).toString('hex').toUpperCase().slice(0, length);
}

// ==========================================================
// createOrder — restored original transaction, PLUS
// multi-vendor order splitting + wallet crediting.
// ==========================================================
export const createOrder = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in.');
  }
  if (request.auth.token.email_verified !== true) {
    throw new HttpsError('permission-denied', 'Verify your email before placing an order.');
  }

  const data = request.data as CreateOrderPayload;
  const { items, shippingAddress, billingAddress, couponCode } = data;
  if (!Array.isArray(items) || items.length === 0 || items.length > 50 ||
      items.some(item => !item || typeof item.productId !== 'string' ||
        !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99)) {
    throw new HttpsError('invalid-argument', 'Cart is empty.');
  }
  if (!shippingAddress || typeof shippingAddress !== 'object' || Array.isArray(shippingAddress) ||
      !billingAddress || typeof billingAddress !== 'object' || Array.isArray(billingAddress)) {
    throw new HttpsError('invalid-argument', 'Valid shipping and billing addresses are required.');
  }
  if (new Set(items.map(item => item.productId)).size !== items.length) {
    throw new HttpsError('invalid-argument', 'Cart contains duplicate products.');
  }

  const userId = request.auth.uid;
  const year = new Date().getFullYear();

  let orderNumber = '';
  let invoiceNumber = '';

  await db.runTransaction(async (transaction: any) => {
    // 1. Read inventory stock
    const inventoryRefs = items.map(item => db.collection('inventory').doc(item.productId));
    const inventoryDocs = await transaction.getAll(...inventoryRefs);

    // Also read product data for prices + vendorId
    const productRefs = items.map(item => db.collection('products').doc(item.productId));
    const productDocs = await transaction.getAll(...productRefs);

    const inventoryMap = new Map<string, any>();
    let subtotal = 0;

    // Build items array to store directly on the order document,
    // AND group them by vendorId for the marketplace split.
    const orderItems: any[] = [];
    const vendorGroups = new Map<string, any[]>(); // vendorId -> orderItems[]

    inventoryDocs.forEach((doc: any, index: number) => {
      if (!doc.exists) {
        throw new HttpsError('not-found', `Inventory for ${items[index].productId} not found`);
      }
      const invData = doc.data()!;
      const requestedQty = items[index].quantity;
      if (invData.availableQuantity < requestedQty) {
        throw new HttpsError('out-of-range', `Not enough stock for item ${items[index].productId}`);
      }
      inventoryMap.set(doc.id, invData);
    });

    // vendors referenced by this cart — read their commission % in the same transaction
    const vendorIdsInCart = new Set<string>();
    productDocs.forEach((doc: any, index: number) => {
      if (!doc.exists) {
        throw new HttpsError('not-found', `Product ${items[index].productId} not found`);
      }
      const productData = doc.data()!;
      if (productData.active === false || typeof productData.price !== 'number' || !Number.isFinite(productData.price) || productData.price < 0) {
        throw new HttpsError('failed-precondition', `Product ${doc.id} is unavailable.`);
      }
      const vendorId = productData.vendorId || 'biocart';
      vendorIdsInCart.add(vendorId);
    });
    const vendorIdsArr = Array.from(vendorIdsInCart);
    const vendorRefs = vendorIdsArr.map((vid) => db.collection('vendors').doc(vid));
    const vendorDocs = vendorRefs.length > 0 ? await transaction.getAll(...vendorRefs) : [];
    const vendorCommissionMap = new Map<string, number>();
    vendorDocs.forEach((doc: any, i: number) => {
      const commission = doc.exists ? Number(doc.data()?.commissionRate ?? doc.data()?.commissionPercent ?? 0) : 0;
      vendorCommissionMap.set(vendorIdsArr[i], commission);
    });

    productDocs.forEach((doc: any, index: number) => {
      const productData = doc.data()!;
      const requestedQty = items[index].quantity;
      const vendorId = productData.vendorId || 'biocart';
      const lineTotal = productData.price * requestedQty;
      subtotal += lineTotal;

      const orderItem = {
        productId: doc.id,
        name: productData.name,
        price: productData.price,
        quantity: requestedQty,
        total: lineTotal,
        vendorId
      };
      orderItems.push(orderItem);

      if (!vendorGroups.has(vendorId)) vendorGroups.set(vendorId, []);
      vendorGroups.get(vendorId)!.push(orderItem);
    });

    // 2. Validate coupon
    let discount = 0;
    let couponRef = null;
    let couponDoc = null;

    if (couponCode) {
      const couponsSnapshot = await transaction.get(
        db.collection('coupons').where('code', '==', couponCode).limit(1)
      );
      if (!couponsSnapshot.empty) {
        couponDoc = couponsSnapshot.docs[0];
        couponRef = couponDoc.ref;
        const couponData = couponDoc.data();

        const now = Timestamp.now();
        if (couponData.expiryDate && couponData.expiryDate.toMillis() < now.toMillis()) {
          throw new HttpsError('failed-precondition', 'Coupon expired');
        }
        if (couponData.usageLimit && couponData.usedCount >= couponData.usageLimit) {
          throw new HttpsError('failed-precondition', 'Coupon usage limit reached');
        }

        if (couponData.type === 'fixed') {
          discount = couponData.value;
        } else if (couponData.type === 'percentage') {
          discount = subtotal * (couponData.value / 100);
        }
      } else {
        throw new HttpsError('not-found', 'Coupon not found');
      }
    }

    const settingsDoc = await transaction.get(db.collection('settings').doc('main'));
    let shippingFee = 99;
    let freeShippingThreshold = 1999;
    let taxRate = 5;

    if (settingsDoc.exists) {
      const settingsData = settingsDoc.data()!;
      if (settingsData.shippingFee !== undefined) shippingFee = Number(settingsData.shippingFee);
      if (settingsData.freeShippingThreshold !== undefined) freeShippingThreshold = Number(settingsData.freeShippingThreshold);
      if (settingsData.taxRate !== undefined) taxRate = Number(settingsData.taxRate);
    }

    // Tax and shipping logic
    const shipping = subtotal >= freeShippingThreshold ? 0 : shippingFee;
    const tax = (subtotal - discount) * (taxRate / 100);
    const grandTotal = subtotal - discount + tax + shipping;

    orderNumber = `BC-${year}-${generateRandomId(6)}`;
    invoiceNumber = `INV-${year}-${generateRandomId(6)}`;

    // 3. Deduct inventory
    items.forEach((item) => {
      const invRef = db.collection('inventory').doc(item.productId);
      const currentInv = inventoryMap.get(item.productId);
      transaction.update(invRef, {
        availableQuantity: currentInv.availableQuantity - item.quantity,
        quantity: currentInv.quantity - item.quantity
      });
    });

    // 4. Increment coupon usage
    if (couponRef && couponDoc) {
      transaction.update(couponRef, {
        usedCount: couponDoc.data().usedCount + 1
      });
    }

    // 5. Save canonical (customer-facing) order
    const orderRef = db.collection('orders').doc(orderNumber);
    transaction.set(orderRef, {
      id: orderNumber,
      orderNumber,
      userId,
      invoiceNumber,
      items: orderItems,
      vendorIds: vendorIdsArr,
      subtotal,
      discountAmount: discount,
      taxAmount: tax,
      shippingAmount: shipping,
      totalAmount: grandTotal,
      shippingAddress,
      billingAddress,
      couponId: couponCode || null,
      couponCode: couponCode || null,
      orderStatus: 'pending',
      paymentMethod: 'cod', // mock, no gateway wired yet
      paymentStatus: 'pending',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      pdfUrl: null
    });

    // 6. Split per vendor: write vendor_orders sub-doc + credit vendor wallet.
    // TODO(razorpay): once a real payment gateway is wired in, move the wallet
    // credit below to a payment-confirmed webhook instead of doing it here at
    // order-creation time (paymentStatus is currently always 'pending').
    vendorGroups.forEach((vendorItems, vendorId) => {
      const vendorSubtotal = vendorItems.reduce((sum, it) => sum + it.total, 0);
      const commissionPercent = vendorCommissionMap.get(vendorId) ?? 0;
      const commissionAmount = Math.round(vendorSubtotal * commissionPercent) / 100;
      const vendorPayable = vendorSubtotal - commissionAmount;

      const vendorOrderRef = orderRef.collection('vendor_orders').doc(vendorId);
      transaction.set(vendorOrderRef, {
        vendorId,
        orderNumber,
        items: vendorItems,
        subtotal: vendorSubtotal,
        commissionPercent,
        commissionAmount,
        vendorPayable,
        shipmentStatus: 'pending',
        trackingNumber: null,
        createdAt: FieldValue.serverTimestamp()
      });

      const walletRef = db.collection('vendor_wallets').doc(vendorId);
      transaction.set(walletRef, {
        vendorId,
        availableBalance: FieldValue.increment(vendorPayable),
        lifetimeGross: FieldValue.increment(vendorSubtotal),
        lifetimeCommission: FieldValue.increment(commissionAmount),
        lifetimeSettled: FieldValue.increment(0),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    });
  });

  return { success: true, orderId: orderNumber, invoiceId: invoiceNumber };
});

// ==========================================================
// provisionBioCartOwner — grants admin access only to the verified owner.
// ==========================================================
export const provisionBioCartOwner = onCall({ region: 'asia-southeast1' }, async (request) => {
  const ownerEmail = 'sinfoxmedia@gmail.com';
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  if (request.auth.token.email_verified !== true ||
      typeof request.auth.token.email !== 'string' || request.auth.token.email.toLowerCase() !== ownerEmail) {
    throw new HttpsError('permission-denied', 'Only the verified BioCart owner can run account setup.');
  }

  const ownerUser = await getAuth().getUser(request.auth.uid);
  const ownerRef = db.collection('users').doc(request.auth.uid);
  const currentOwner = await ownerRef.get();
  const now = new Date().toISOString();
  const displayName = typeof request.data?.displayName === 'string' && request.data.displayName.trim()
    ? request.data.displayName.trim()
    : ownerUser.displayName || 'BioCart Owner';

  await ownerRef.set({
    uid: request.auth.uid,
    email: ownerEmail,
    name: displayName,
    role: 'super_admin',
    status: 'active',
    photoURL: ownerUser.photoURL || '',
    createdAt: currentOwner.data()?.createdAt || ownerUser.metadata.creationTime || now,
    updatedAt: now,
    lastLoginAt: now,
  }, { merge: true });

  return { success: true, email: ownerEmail };
});

// ==========================================================
// createVendorAccount — admin-only callable. Creates a real
// Firebase Auth login for a vendor AND its vendors/{uid} +
// users/{uid} docs in one step, so vendorId === ownerUid.
// ==========================================================
interface CreateVendorAccountPayload {
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  commissionRate: number;
}

export const createVendorAccount = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in.');
  }

  // Authorize: caller must be admin/super_admin per their Firestore user doc.
  const callerDoc = await db.collection('users').doc(request.auth.uid).get();
  const callerRole = callerDoc.exists ? callerDoc.data()?.role : null;
  if ((callerRole !== 'admin' && callerRole !== 'super_admin') ||
      callerDoc.data()?.status !== 'active' || request.auth.token.email_verified !== true) {
    throw new HttpsError('permission-denied', 'Only admins can create vendor accounts.');
  }

  const data = request.data as CreateVendorAccountPayload;
  const businessName = typeof data.businessName === 'string' ? data.businessName.trim() : '';
  const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
  const ownerName = typeof data.ownerName === 'string' ? data.ownerName.trim() : '';
  const phone = typeof data.phone === 'string' ? data.phone.trim() : '';
  const commissionRate = Number(data.commissionRate ?? 10);
  if (!businessName || businessName.length > 120 || !/^\S+@\S+\.\S+$/.test(email) || email.length > 254 ||
      !Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 100) {
    throw new HttpsError('invalid-argument', 'businessName and email are required.');
  }

  // Generate a temp password the admin can hand to the vendor (or the vendor
  // can use "Forgot password" immediately — either works).
  const tempPassword = `${randomBytes(24).toString('base64url')}Aa1!`;

  let userRecord;
  try {
    userRecord = await getAuth().createUser({
      email,
      password: tempPassword,
      displayName: ownerName || businessName,
      phoneNumber: undefined
    });
  } catch (err: any) {
    if ((err as any)?.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'A BioCart account already uses this email.');
    }
    console.error('Vendor account creation failed:', err);
    throw new HttpsError('internal', 'Could not create the vendor login.');
  }

  const uid = userRecord.uid;
  const now = new Date().toISOString();

  const batch = db.batch();

  batch.set(db.collection('vendors').doc(uid), {
    id: uid,
    ownerUid: uid,
    storeName: businessName,
    ownerName,
    email,
    phone,
    status: 'active',
    approvalStatus: 'approved',
    commissionRate,
    commission: { baseRateBps: Math.round(commissionRate * 100) },
    createdAt: now,
    updatedAt: now
  });

  batch.set(db.collection('users').doc(uid), {
    uid,
    email,
    name: ownerName || businessName,
    role: 'vendor',
    status: 'active',
    createdAt: now,
    updatedAt: now
  });

  batch.set(db.collection('vendor_wallets').doc(uid), {
    vendorId: uid,
    availableBalance: 0,
    lifetimeGross: 0,
    lifetimeCommission: 0,
    lifetimeSettled: 0,
    createdAt: now,
    updatedAt: now
  });

  await batch.commit();

  return { success: true, uid, tempPassword, email };
});

// ==========================================================
// generateInvoicePDF — restored, unchanged.
// ==========================================================
export const generateInvoicePDF = onDocumentCreated({ document: 'orders/{orderId}', region: 'asia-southeast1' }, async (event: any) => {
  const snap = event.data;
  if (!snap) return;

  const orderData = snap.data();
  const orderId = orderData.id;
  const invoiceNumber = orderData.invoiceNumber;
  const items = orderData.items || [];

  return new Promise<void>((resolve, reject) => {
    const doc = new (PDFDocument as any)({ margin: 50 });
    const bucket = storage.bucket();
    const userId = orderData.userId || 'unknown';
    const pdfPath = `invoices/${userId}/${orderId}.pdf`;
    const file = bucket.file(pdfPath);
    const stream = file.createWriteStream({
      metadata: {
        contentType: 'application/pdf'
      }
    });

    doc.pipe(stream);

    doc.fontSize(20).text('INVOICE', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Invoice Number: ${invoiceNumber}`);
    doc.text(`Order Number: ${orderData.orderNumber || orderId}`);
    doc.text(`Date: ${new Date().toLocaleDateString()}`);

    doc.moveDown();
    doc.text('Bill To:');
    doc.text(JSON.stringify(orderData.billingAddress));

    doc.moveDown();
    doc.text('Items:');
    items.forEach((item: any, index: number) => {
      doc.text(`${index + 1}. ${item.name} - Qty: ${item.quantity} - Rs.${item.price} = Rs.${item.total}`);
    });

    doc.moveDown();
    doc.text(`Subtotal: Rs.${orderData.subtotal.toFixed(2)}`);
    doc.text(`Discount: Rs.${(orderData.discountAmount || 0).toFixed(2)}`);
    doc.text(`Tax: Rs.${(orderData.taxAmount || 0).toFixed(2)}`);
    doc.text(`Shipping: Rs.${(orderData.shippingAmount || 0).toFixed(2)}`);
    doc.text(`Grand Total: Rs.${(orderData.totalAmount || 0).toFixed(2)}`, { stroke: true });

    doc.end();

    stream.on('finish', async () => {
      try {
        const gsUrl = `gs://${bucket.name}/${pdfPath}`;
        await snap.ref.update({ pdfUrl: gsUrl });
        resolve();
      } catch (error) {
        console.error('Error updating order with PDF URL', error);
        reject(error);
      }
    });

    stream.on('error', (err: any) => {
      console.error('Error generating PDF', err);
      reject(err);
    });
  });
});
