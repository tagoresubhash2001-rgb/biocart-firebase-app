"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateInvoicePDF = exports.createVendorAccount = exports.provisionBioCartOwner = exports.createOrder = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const node_crypto_1 = require("node:crypto");
const auth_1 = require("firebase-admin/auth");
const firestore_2 = require("firebase-admin/firestore");
const storage_1 = require("firebase-admin/storage");
const PDFDocument = __importStar(require("pdfkit"));
admin.initializeApp();
const db = (0, firestore_2.getFirestore)();
const storage = (0, storage_1.getStorage)();
function generateRandomId(length) {
    return (0, node_crypto_1.randomBytes)(Math.ceil(length / 2)).toString('hex').toUpperCase().slice(0, length);
}
// ==========================================================
// createOrder — restored original transaction, PLUS
// multi-vendor order splitting + wallet crediting.
// ==========================================================
exports.createOrder = (0, https_1.onCall)({ region: 'asia-southeast1' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in.');
    }
    if (request.auth.token.email_verified !== true) {
        throw new https_1.HttpsError('permission-denied', 'Verify your email before placing an order.');
    }
    const data = request.data;
    const { items, shippingAddress, billingAddress, couponCode } = data;
    if (!Array.isArray(items) || items.length === 0 || items.length > 50 ||
        items.some(item => !item || typeof item.productId !== 'string' ||
            !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99)) {
        throw new https_1.HttpsError('invalid-argument', 'Cart is empty.');
    }
    if (!shippingAddress || typeof shippingAddress !== 'object' || Array.isArray(shippingAddress) ||
        !billingAddress || typeof billingAddress !== 'object' || Array.isArray(billingAddress)) {
        throw new https_1.HttpsError('invalid-argument', 'Valid shipping and billing addresses are required.');
    }
    if (new Set(items.map(item => item.productId)).size !== items.length) {
        throw new https_1.HttpsError('invalid-argument', 'Cart contains duplicate products.');
    }
    const userId = request.auth.uid;
    const year = new Date().getFullYear();
    let orderNumber = '';
    let invoiceNumber = '';
    await db.runTransaction(async (transaction) => {
        // 1. Read inventory stock
        const inventoryRefs = items.map(item => db.collection('inventory').doc(item.productId));
        const inventoryDocs = await transaction.getAll(...inventoryRefs);
        // Also read product data for prices + vendorId
        const productRefs = items.map(item => db.collection('products').doc(item.productId));
        const productDocs = await transaction.getAll(...productRefs);
        const inventoryMap = new Map();
        let subtotal = 0;
        // Build items array to store directly on the order document,
        // AND group them by vendorId for the marketplace split.
        const orderItems = [];
        const vendorGroups = new Map(); // vendorId -> orderItems[]
        inventoryDocs.forEach((doc, index) => {
            if (!doc.exists) {
                throw new https_1.HttpsError('not-found', `Inventory for ${items[index].productId} not found`);
            }
            const invData = doc.data();
            const requestedQty = items[index].quantity;
            if (invData.availableQuantity < requestedQty) {
                throw new https_1.HttpsError('out-of-range', `Not enough stock for item ${items[index].productId}`);
            }
            inventoryMap.set(doc.id, invData);
        });
        // vendors referenced by this cart — read their commission % in the same transaction
        const vendorIdsInCart = new Set();
        productDocs.forEach((doc, index) => {
            if (!doc.exists) {
                throw new https_1.HttpsError('not-found', `Product ${items[index].productId} not found`);
            }
            const productData = doc.data();
            if (productData.active === false || typeof productData.price !== 'number' || !Number.isFinite(productData.price) || productData.price < 0) {
                throw new https_1.HttpsError('failed-precondition', `Product ${doc.id} is unavailable.`);
            }
            const vendorId = productData.vendorId || 'biocart';
            vendorIdsInCart.add(vendorId);
        });
        const vendorIdsArr = Array.from(vendorIdsInCart);
        const vendorRefs = vendorIdsArr.map((vid) => db.collection('vendors').doc(vid));
        const vendorDocs = vendorRefs.length > 0 ? await transaction.getAll(...vendorRefs) : [];
        const vendorCommissionMap = new Map();
        vendorDocs.forEach((doc, i) => {
            const commission = doc.exists ? Number(doc.data()?.commissionRate ?? doc.data()?.commissionPercent ?? 0) : 0;
            vendorCommissionMap.set(vendorIdsArr[i], commission);
        });
        productDocs.forEach((doc, index) => {
            const productData = doc.data();
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
            if (!vendorGroups.has(vendorId))
                vendorGroups.set(vendorId, []);
            vendorGroups.get(vendorId).push(orderItem);
        });
        // 2. Validate coupon
        let discount = 0;
        let couponRef = null;
        let couponDoc = null;
        if (couponCode) {
            const couponsSnapshot = await transaction.get(db.collection('coupons').where('code', '==', couponCode).limit(1));
            if (!couponsSnapshot.empty) {
                couponDoc = couponsSnapshot.docs[0];
                couponRef = couponDoc.ref;
                const couponData = couponDoc.data();
                const now = firestore_2.Timestamp.now();
                if (couponData.expiryDate && couponData.expiryDate.toMillis() < now.toMillis()) {
                    throw new https_1.HttpsError('failed-precondition', 'Coupon expired');
                }
                if (couponData.usageLimit && couponData.usedCount >= couponData.usageLimit) {
                    throw new https_1.HttpsError('failed-precondition', 'Coupon usage limit reached');
                }
                if (couponData.type === 'fixed') {
                    discount = couponData.value;
                }
                else if (couponData.type === 'percentage') {
                    discount = subtotal * (couponData.value / 100);
                }
            }
            else {
                throw new https_1.HttpsError('not-found', 'Coupon not found');
            }
        }
        const settingsDoc = await transaction.get(db.collection('settings').doc('main'));
        let shippingFee = 99;
        let freeShippingThreshold = 1999;
        let taxRate = 5;
        if (settingsDoc.exists) {
            const settingsData = settingsDoc.data();
            if (settingsData.shippingFee !== undefined)
                shippingFee = Number(settingsData.shippingFee);
            if (settingsData.freeShippingThreshold !== undefined)
                freeShippingThreshold = Number(settingsData.freeShippingThreshold);
            if (settingsData.taxRate !== undefined)
                taxRate = Number(settingsData.taxRate);
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
            createdAt: firestore_2.FieldValue.serverTimestamp(),
            updatedAt: firestore_2.FieldValue.serverTimestamp(),
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
                createdAt: firestore_2.FieldValue.serverTimestamp()
            });
            const walletRef = db.collection('vendor_wallets').doc(vendorId);
            transaction.set(walletRef, {
                vendorId,
                availableBalance: firestore_2.FieldValue.increment(vendorPayable),
                lifetimeGross: firestore_2.FieldValue.increment(vendorSubtotal),
                lifetimeCommission: firestore_2.FieldValue.increment(commissionAmount),
                lifetimeSettled: firestore_2.FieldValue.increment(0),
                updatedAt: firestore_2.FieldValue.serverTimestamp()
            }, { merge: true });
        });
    });
    return { success: true, orderId: orderNumber, invoiceId: invoiceNumber };
});
// ==========================================================
// provisionBioCartOwner — grants admin access only to the verified owner.
// ==========================================================
exports.provisionBioCartOwner = (0, https_1.onCall)({ region: 'asia-southeast1' }, async (request) => {
    const ownerEmail = 'sinfoxmedia@gmail.com';
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Sign in first.');
    if (request.auth.token.email_verified !== true ||
        typeof request.auth.token.email !== 'string' || request.auth.token.email.toLowerCase() !== ownerEmail) {
        throw new https_1.HttpsError('permission-denied', 'Only the verified BioCart owner can run account setup.');
    }
    const ownerUser = await (0, auth_1.getAuth)().getUser(request.auth.uid);
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
exports.createVendorAccount = (0, https_1.onCall)({ region: 'asia-southeast1' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be logged in.');
    }
    // Authorize: caller must be admin/super_admin per their Firestore user doc.
    const callerDoc = await db.collection('users').doc(request.auth.uid).get();
    const callerRole = callerDoc.exists ? callerDoc.data()?.role : null;
    if ((callerRole !== 'admin' && callerRole !== 'super_admin') ||
        callerDoc.data()?.status !== 'active' || request.auth.token.email_verified !== true) {
        throw new https_1.HttpsError('permission-denied', 'Only admins can create vendor accounts.');
    }
    const data = request.data;
    const businessName = typeof data.businessName === 'string' ? data.businessName.trim() : '';
    const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
    const ownerName = typeof data.ownerName === 'string' ? data.ownerName.trim() : '';
    const phone = typeof data.phone === 'string' ? data.phone.trim() : '';
    const commissionRate = Number(data.commissionRate ?? 10);
    if (!businessName || businessName.length > 120 || !/^\S+@\S+\.\S+$/.test(email) || email.length > 254 ||
        !Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 100) {
        throw new https_1.HttpsError('invalid-argument', 'businessName and email are required.');
    }
    // Generate a temp password the admin can hand to the vendor (or the vendor
    // can use "Forgot password" immediately — either works).
    const tempPassword = `${(0, node_crypto_1.randomBytes)(24).toString('base64url')}Aa1!`;
    let userRecord;
    try {
        userRecord = await (0, auth_1.getAuth)().createUser({
            email,
            password: tempPassword,
            displayName: ownerName || businessName,
            phoneNumber: undefined
        });
    }
    catch (err) {
        if (err?.code === 'auth/email-already-exists') {
            throw new https_1.HttpsError('already-exists', 'A BioCart account already uses this email.');
        }
        console.error('Vendor account creation failed:', err);
        throw new https_1.HttpsError('internal', 'Could not create the vendor login.');
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
exports.generateInvoicePDF = (0, firestore_1.onDocumentCreated)({ document: 'orders/{orderId}', region: 'asia-southeast1' }, async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const orderData = snap.data();
    const orderId = orderData.id;
    const invoiceNumber = orderData.invoiceNumber;
    const items = orderData.items || [];
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
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
        items.forEach((item, index) => {
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
            }
            catch (error) {
                console.error('Error updating order with PDF URL', error);
                reject(error);
            }
        });
        stream.on('error', (err) => {
            console.error('Error generating PDF', err);
            reject(err);
        });
    });
});
