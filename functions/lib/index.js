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
exports.razorpayPayoutWebhook = exports.retryVendorPayout = exports.releasePendingEarnings = exports.processOrderRefund = exports.triggerManualSettlement = exports.tuesdayVendorSettlement = exports.updateVendorCommercials = exports.cancelDelhiveryShipment = exports.getDelhiveryLabel = exports.trackDelhiveryShipment = exports.createDelhiveryShipment = exports.checkDelhiveryPincode = exports.uploadMediaAsset = exports.generateInvoicePDF = exports.reconcileVendorAccount = exports.updateVendorEmail = exports.quoteOrder = exports.submitProductChange = exports.cancelOrder = exports.allocateCustomerId = exports.clearMustChangePassword = exports.createVendorAccount = exports.provisionBioCartOwner = exports.createOrder = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const node_crypto_1 = require("node:crypto");
const auth_1 = require("firebase-admin/auth");
const firestore_2 = require("firebase-admin/firestore");
const storage_1 = require("firebase-admin/storage");
const PDFDocument = __importStar(require("pdfkit"));
const financialEngine_1 = require("./financialEngine");
admin.initializeApp();
const db = (0, firestore_2.getFirestore)();
db.settings({ ignoreUndefinedProperties: true });
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
    if (request.auth.token.email_verified !== true && typeof request.auth.token.phone_number !== 'string') {
        throw new https_1.HttpsError('permission-denied', 'Verify your email or phone before placing an order.');
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
        const vendorMap = new Map();
        vendorDocs.forEach((doc, i) => {
            const vData = doc.exists ? doc.data() : {};
            vendorMap.set(vendorIdsArr[i], vData);
        });
        const vendorInputsMap = new Map();
        productDocs.forEach((doc, index) => {
            const productData = doc.data();
            const requestedQty = items[index].quantity;
            const vendorId = productData.vendorId || 'biocart';
            const pricePaise = Math.round(productData.price * 100);
            const lineTotalPaise = pricePaise * requestedQty;
            subtotal += lineTotalPaise;
            const orderItem = {
                productId: doc.id,
                name: productData.name,
                price: productData.price,
                pricePaise,
                quantity: requestedQty,
                total: productData.price * requestedQty,
                totalPaise: lineTotalPaise,
                hsnCode: productData.hsnCode || '310100', // Harmonized code for organic fertilizer
                vendorId
            };
            orderItems.push(orderItem);
            if (!vendorInputsMap.has(vendorId)) {
                const vInfo = vendorMap.get(vendorId) || {};
                const commissionBps = vInfo.commission?.baseRateBps
                    ?? Math.round(Number(vInfo.commissionRate ?? vInfo.commissionPercent ?? 10) * 100);
                vendorInputsMap.set(vendorId, {
                    vendorId,
                    vendorStoreName: vInfo.storeName || vInfo.businessName || vendorId,
                    commissionRateBps: commissionBps,
                    items: []
                });
            }
            vendorInputsMap.get(vendorId).items.push({
                productId: doc.id,
                name: productData.name,
                pricePaise,
                quantity: requestedQty,
                hsnCode: productData.hsnCode || '310100',
                taxRateBps: 500 // 5% GST
            });
        });
        // 2. Validate coupon in integer paise with strict creator/funding attribution (Rule B)
        let couponAllocation = null;
        let couponRef = null;
        let couponDoc = null;
        if (couponCode) {
            const couponsSnapshot = await transaction.get(db.collection('coupons').where('code', '==', couponCode).limit(1));
            if (!couponsSnapshot.empty) {
                couponDoc = couponsSnapshot.docs[0];
                couponRef = couponDoc.ref;
                const couponData = couponDoc.data();
                // Check expiry: support Timestamp or ISO string (endDate or expiryDate)
                const expiryVal = couponData.endDate || couponData.expiryDate;
                if (expiryVal) {
                    const expiryMillis = typeof expiryVal.toMillis === 'function'
                        ? expiryVal.toMillis()
                        : new Date(expiryVal).getTime();
                    if (expiryMillis < Date.now()) {
                        throw new https_1.HttpsError('failed-precondition', 'Coupon expired');
                    }
                }
                if (couponData.usageLimit && (couponData.usedCount || 0) >= couponData.usageLimit) {
                    throw new https_1.HttpsError('failed-precondition', 'Coupon usage limit reached');
                }
                // Check start date if present
                const startVal = couponData.startDate;
                if (startVal) {
                    const startMillis = typeof startVal.toMillis === 'function' ? startVal.toMillis() : new Date(startVal).getTime();
                    if (startMillis > Date.now()) {
                        throw new https_1.HttpsError('failed-precondition', 'Coupon has not started yet');
                    }
                }
                const isVendorScoped = (couponData.creatorRole === 'vendor' || !!couponData.creatorVendorId) && !!couponData.creatorVendorId;
                const vendorIdScope = couponData.creatorVendorId || couponData.vendorId;
                // Calculate eligible spend according to scope (Rule: Vendor, Products, Categories)
                let eligibleSubtotalPaise = 0;
                productDocs.forEach((doc, index) => {
                    const pData = doc.data();
                    const pVendorId = pData.vendorId || 'biocart';
                    const pId = doc.id;
                    const pCategory = pData.category || '';
                    const qty = items[index].quantity;
                    const linePaise = Math.round(pData.price * 100) * qty;
                    const matchesVendor = isVendorScoped ? pVendorId === vendorIdScope : true;
                    const matchesProduct = (couponData.applicableProductIds && couponData.applicableProductIds.length > 0)
                        ? couponData.applicableProductIds.includes(pId)
                        : true;
                    const matchesCategory = (couponData.applicableCategories && couponData.applicableCategories.length > 0)
                        ? couponData.applicableCategories.some((cat) => cat.toLowerCase() === pCategory.toLowerCase())
                        : true;
                    if (matchesVendor && matchesProduct && matchesCategory) {
                        eligibleSubtotalPaise += linePaise;
                    }
                });
                if (eligibleSubtotalPaise === 0) {
                    throw new https_1.HttpsError('failed-precondition', 'Coupon does not apply to any eligible items in the cart.');
                }
                // Enforce minOrderAmount
                const minOrderPaise = couponData.minOrderAmount ? Math.round(Number(couponData.minOrderAmount) * 100) : 0;
                if (minOrderPaise > 0 && eligibleSubtotalPaise < minOrderPaise) {
                    throw new https_1.HttpsError('failed-precondition', `Minimum order amount of ₹${couponData.minOrderAmount} required for this coupon.`);
                }
                const couponType = couponData.discountType || couponData.type || 'percentage';
                const couponVal = couponData.discountValue !== undefined ? couponData.discountValue : (couponData.value || 0);
                let discountPaise = 0;
                if (couponType === 'fixed') {
                    discountPaise = Math.min(eligibleSubtotalPaise, Math.round(couponVal * 100));
                }
                else if (couponType === 'percentage') {
                    discountPaise = Math.round((eligibleSubtotalPaise * couponVal) / 100);
                }
                // Cap discount if maxDiscountAmount is specified
                if (couponData.maxDiscountAmount && couponData.maxDiscountAmount > 0) {
                    const maxDiscountPaise = Math.round(couponData.maxDiscountAmount * 100);
                    if (discountPaise > maxDiscountPaise) {
                        discountPaise = maxDiscountPaise;
                    }
                }
                couponAllocation = {
                    code: couponCode,
                    creatorRole: couponData.creatorRole || (couponData.creatorVendorId || couponData.vendorId ? 'vendor' : 'admin'),
                    creatorVendorId: couponData.creatorVendorId || couponData.vendorId || undefined,
                    discountPaise
                };
            }
            else {
                throw new https_1.HttpsError('not-found', 'Coupon not found');
            }
        }
        // Read store settings (checking settings/general first, fallback to settings/main)
        let settingsDoc = await transaction.get(db.collection('settings').doc('general'));
        if (!settingsDoc.exists) {
            settingsDoc = await transaction.get(db.collection('settings').doc('main'));
        }
        let shippingFeePaise = 9900; // Rs. 99 in paise
        let freeShippingThresholdPaise = 49900; // Baseline ₹499
        let financialPolicy = financialEngine_1.DEFAULT_FINANCIAL_POLICY;
        if (settingsDoc.exists) {
            const settingsData = settingsDoc.data();
            if (settingsData.shippingFee !== undefined) {
                shippingFeePaise = Math.round(Number(settingsData.shippingFee) * 100);
            }
            const orderThresh = settingsData.orderThresholds;
            if (orderThresh && orderThresh.freeShippingThreshold !== undefined) {
                freeShippingThresholdPaise = Math.round(Number(orderThresh.freeShippingThreshold) * 100);
            }
            else if (settingsData.freeShippingThreshold !== undefined) {
                freeShippingThresholdPaise = Math.round(Number(settingsData.freeShippingThreshold) * 100);
            }
            if (settingsData.financialPolicy) {
                financialPolicy = {
                    ...financialEngine_1.DEFAULT_FINANCIAL_POLICY,
                    ...settingsData.financialPolicy
                };
            }
        }
        // Precedence: Single-vendor cart with active custom override takes precedence
        if (vendorIdsArr.length === 1) {
            const vInfo = vendorMap.get(vendorIdsArr[0]);
            const vThresh = vInfo?.orderThresholds;
            if (vThresh && vThresh.useCustomThresholds && vThresh.freeShippingThreshold !== undefined && vThresh.freeShippingThreshold !== null) {
                freeShippingThresholdPaise = Math.round(Number(vThresh.freeShippingThreshold) * 100);
            }
        }
        const shippingPaise = subtotal >= freeShippingThresholdPaise ? 0 : shippingFeePaise;
        // Execute Authoritative Integer Paise Financial Calculation
        const vendorInputsArray = Array.from(vendorInputsMap.values());
        const calculation = (0, financialEngine_1.calculateAuthoritativeOrder)(vendorInputsArray, couponAllocation, shippingPaise, financialPolicy);
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
        const grandTotalRupees = calculation.grandTotalPaise / 100;
        const isCod = (data.paymentMethod || 'cod') === 'cod';
        // 5. Save canonical (customer-facing) order
        const orderRef = db.collection('orders').doc(orderNumber);
        transaction.set(orderRef, {
            id: orderNumber,
            orderNumber,
            userId,
            invoiceNumber,
            items: orderItems,
            vendorIds: vendorIdsArr,
            subtotal: calculation.subtotalPaise / 100,
            subtotalPaise: calculation.subtotalPaise,
            discountAmount: calculation.discountPaise / 100,
            discountAmountPaise: calculation.discountPaise,
            taxAmount: calculation.taxPaise / 100,
            taxAmountPaise: calculation.taxPaise,
            shippingAmount: calculation.shippingPaise / 100,
            shippingAmountPaise: calculation.shippingPaise,
            totalAmount: grandTotalRupees,
            totalAmountPaise: calculation.grandTotalPaise,
            financialSummary: {
                totalGatewayFeePaise: calculation.totalGatewayFeePaise,
                totalPlatformCommissionPaise: calculation.totalPlatformCommissionPaise,
                totalCommissionGstPaise: calculation.totalCommissionGstPaise,
                totalVendorPayablePaise: calculation.totalVendorPayablePaise
            },
            shippingAddress,
            billingAddress,
            customerGstin: data.customerGstin || null,
            customerBusinessName: data.customerBusinessName || null,
            status: 'placed',
            orderStatus: 'placed',
            paymentMethod: data.paymentMethod || 'cod',
            paymentStatus: isCod ? 'pending' : 'pending',
            statusHistory: [
                {
                    status: 'placed',
                    at: new Date().toISOString(),
                    by: userId,
                    role: 'customer',
                    reason: 'Order placed by customer'
                }
            ],
            createdAt: firestore_2.FieldValue.serverTimestamp(),
            updatedAt: firestore_2.FieldValue.serverTimestamp(),
            pdfUrl: null
        });
        // 6. Split per vendor: write vendor_orders sub-doc + update vendor wallet & financial ledger
        const nowIso = new Date().toISOString();
        calculation.vendorSplits.forEach((split) => {
            const vendorOrderRef = orderRef.collection('vendor_orders').doc(split.vendorId);
            transaction.set(vendorOrderRef, {
                vendorId: split.vendorId,
                orderNumber,
                items: split.items,
                subtotal: split.subtotalPaise / 100,
                subtotalPaise: split.subtotalPaise,
                commissionPercent: split.commissionRateBps / 100,
                commissionRateBps: split.commissionRateBps,
                commissionAmount: split.commissionPaise / 100,
                commissionAmountPaise: split.commissionPaise,
                commissionGstPaise: split.commissionGstPaise,
                gatewayFeePaise: split.gatewayFeePaise,
                gatewayFeeGstPaise: split.gatewayFeeGstPaise,
                vendorPayable: split.vendorNetCreditPaise / 100,
                vendorPayablePaise: split.vendorNetCreditPaise,
                shipmentStatus: 'pending',
                trackingNumber: null,
                createdAt: firestore_2.FieldValue.serverTimestamp()
            });
            const walletRef = db.collection('vendor_wallets').doc(split.vendorId);
            // Credit wallet: pending for pre-delivery clearing
            transaction.set(walletRef, {
                vendorId: split.vendorId,
                pendingBalance: firestore_2.FieldValue.increment(split.vendorNetCreditPaise),
                pending: firestore_2.FieldValue.increment(split.vendorNetCreditPaise),
                lifetimeGross: firestore_2.FieldValue.increment(split.subtotalPaise),
                lifetimeCommission: firestore_2.FieldValue.increment(split.commissionPaise),
                lifetimeSettled: firestore_2.FieldValue.increment(0),
                updatedAt: firestore_2.FieldValue.serverTimestamp()
            }, { merge: true });
            // Double-entry record in financial_ledger
            const ledgerRef = db.collection('financial_ledger').doc();
            transaction.set(ledgerRef, {
                id: ledgerRef.id,
                orderId: orderNumber,
                orderNumber,
                vendorId: split.vendorId,
                entryType: 'vendor_wallet_pending_credit',
                amountPaise: split.vendorNetCreditPaise,
                direction: 'credit',
                status: 'pending',
                description: `Order ${orderNumber} - Vendor Net Credit Pending Delivery (Gross: ₹${split.subtotalPaise / 100}, Comm: ₹${split.commissionPaise / 100})`,
                metadata: {
                    subtotalPaise: split.subtotalPaise,
                    commissionPaise: split.commissionPaise,
                    commissionGstPaise: split.commissionGstPaise,
                    gatewayFeePaise: split.gatewayFeePaise
                },
                createdAt: nowIso
            });
        });
        // Record Platform Commission Earnings in financial_ledger
        if (calculation.totalPlatformCommissionPaise > 0) {
            const commissionLedgerRef = db.collection('financial_ledger').doc();
            transaction.set(commissionLedgerRef, {
                id: commissionLedgerRef.id,
                orderId: orderNumber,
                orderNumber,
                entryType: 'platform_commission_earned',
                amountPaise: calculation.totalPlatformCommissionPaise,
                direction: 'credit',
                status: 'settled',
                description: `Order ${orderNumber} - Platform Commission Earned`,
                metadata: {
                    commissionGstPaise: calculation.totalCommissionGstPaise
                },
                createdAt: nowIso
            });
        }
        // Record Explicit Platform Subsidy in financial_ledger (Rule B: Platform coupon exceeds commission)
        if (calculation.totalPlatformSubsidyPaise > 0) {
            const subsidyLedgerRef = db.collection('financial_ledger').doc();
            transaction.set(subsidyLedgerRef, {
                id: subsidyLedgerRef.id,
                orderId: orderNumber,
                orderNumber,
                entryType: 'platform_subsidy_incurred',
                amountPaise: calculation.totalPlatformSubsidyPaise,
                direction: 'debit',
                status: 'settled',
                description: `Order ${orderNumber} - Platform-Funded Coupon Discount Subsidy (Vendor Earnings Preserved)`,
                metadata: {
                    couponCode: couponCode || null,
                    platformFundedDiscountPaise: calculation.platformFundedDiscountTotalPaise,
                    platformCommissionPaise: calculation.totalPlatformCommissionPaise
                },
                createdAt: nowIso
            });
        }
    });
    return { success: true, orderId: orderNumber, invoiceId: invoiceNumber };
});
// ==========================================================
// provisionBioCartOwner — grants admin access only to authorized administrators.
// ==========================================================
exports.provisionBioCartOwner = (0, https_1.onCall)({ region: 'asia-southeast1' }, async (request) => {
    const allowedAdmins = ['sinfoxmedia@gmail.com', 'tagoresubhash2001@gmail.com'];
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Sign in first.');
    const userEmail = request.auth.token.email?.toLowerCase();
    if (request.auth.token.email_verified !== true ||
        typeof userEmail !== 'string' || !allowedAdmins.includes(userEmail)) {
        throw new https_1.HttpsError('permission-denied', 'Only authorized BioCart administrators can run account setup.');
    }
    const ownerUser = await (0, auth_1.getAuth)().getUser(request.auth.uid);
    const ownerRef = db.collection('users').doc(request.auth.uid);
    const currentOwner = await ownerRef.get();
    const now = new Date().toISOString();
    const defaultName = userEmail === 'tagoresubhash2001@gmail.com' ? 'Subhash Tagore' : 'BioCart Administrator';
    const displayName = typeof request.data?.displayName === 'string' && request.data.displayName.trim()
        ? request.data.displayName.trim()
        : ownerUser.displayName || defaultName;
    await ownerRef.set({
        uid: request.auth.uid,
        email: userEmail,
        name: displayName,
        role: 'super_admin',
        status: 'active',
        photoURL: ownerUser.photoURL || '',
        createdAt: currentOwner.data()?.createdAt || ownerUser.metadata.creationTime || now,
        updatedAt: now,
        lastLoginAt: now,
    }, { merge: true });
    // Ensure canonical vendors/biocart and vendor_wallets/biocart exist
    const biocartVendorRef = db.collection('vendors').doc('biocart');
    const biocartVendorSnap = await biocartVendorRef.get();
    if (!biocartVendorSnap.exists) {
        await biocartVendorRef.set({
            id: 'biocart',
            ownerUid: request.auth.uid,
            storeName: 'BioCart Direct Official',
            businessName: 'BioCart Direct Official',
            ownerName: displayName,
            email: userEmail,
            phone: '+91 9999999999',
            status: 'active',
            approvalStatus: 'approved',
            commissionRate: 0,
            commission: { baseRateBps: 0 },
            createdAt: now,
            updatedAt: now
        });
    }
    else {
        await biocartVendorRef.update({
            ownerUid: request.auth.uid,
            ownerName: displayName,
            updatedAt: now
        });
    }
    const biocartWalletRef = db.collection('vendor_wallets').doc('biocart');
    const biocartWalletSnap = await biocartWalletRef.get();
    if (!biocartWalletSnap.exists) {
        await biocartWalletRef.set({
            vendorId: 'biocart',
            ownerUid: request.auth.uid,
            availableBalance: 0,
            lifetimeGross: 0,
            lifetimeCommission: 0,
            lifetimeSettled: 0,
            pending: 0,
            onHold: 0,
            settling: 0,
            paidOut: 0,
            createdAt: now,
            updatedAt: now
        });
    }
    else {
        await biocartWalletRef.update({
            ownerUid: request.auth.uid,
            updatedAt: now
        });
    }
    return { success: true, email: userEmail };
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
    await (0, auth_1.getAuth)().setCustomUserClaims(uid, { role: 'vendor' });
    const now = new Date().toISOString();
    const batch = db.batch();
    batch.set(db.collection('vendors').doc(uid), {
        id: uid,
        ownerUid: uid,
        storeName: businessName,
        businessName,
        ownerName,
        email,
        phone,
        description: data.description || '',
        website: data.website || '',
        legal: data.legal || {},
        addresses: data.addresses || {},
        settlement: data.settlement || {},
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
        mustChangePassword: true,
        createdAt: now,
        updatedAt: now
    });
    batch.set(db.collection('vendor_wallets').doc(uid), {
        vendorId: uid,
        ownerUid: uid,
        availableBalance: 0,
        lifetimeGross: 0,
        lifetimeCommission: 0,
        lifetimeSettled: 0,
        pending: 0,
        onHold: 0,
        settling: 0,
        paidOut: 0,
        createdAt: now,
        updatedAt: now
    });
    await batch.commit();
    return { success: true, uid, tempPassword, email, mustChangePassword: true };
});
exports.clearMustChangePassword = (0, https_1.onCall)({ region: 'asia-southeast1' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be signed in.');
    }
    await db.collection('users').doc(request.auth.uid).update({
        mustChangePassword: false,
        updatedAt: new Date().toISOString()
    });
    return { success: true };
});
exports.allocateCustomerId = (0, https_1.onCall)({ region: 'asia-southeast1' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be signed in.');
    }
    const counterRef = db.collection('counters').doc('customers');
    const now = new Date();
    const allocatedSerial = await db.runTransaction(async (transaction) => {
        const snap = await transaction.get(counterRef);
        let current = 0;
        if (snap.exists) {
            const data = snap.data();
            if (typeof data?.currentSerial === 'number' && Number.isFinite(data.currentSerial)) {
                current = data.currentSerial;
            }
        }
        const next = current + 1;
        transaction.set(counterRef, {
            currentSerial: next,
            updatedAt: now.toISOString()
        }, { merge: true });
        return next;
    });
    const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const monthAbbr = MONTH_NAMES[now.getMonth()];
    const paddedSerial = allocatedSerial.toString().padStart(4, '0');
    const yearStr = now.getFullYear().toString().slice(-2);
    const customerId = `${monthAbbr}${paddedSerial}${yearStr}`;
    return { customerId, serial: allocatedSerial };
});
exports.cancelOrder = (0, https_1.onCall)({ region: 'asia-southeast1' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be signed in.');
    }
    const { orderId, reason = 'Cancelled by customer' } = (request.data || {});
    if (!orderId || typeof orderId !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'Valid orderId is required.');
    }
    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) {
        throw new https_1.HttpsError('not-found', `Order ${orderId} does not exist.`);
    }
    const orderData = orderSnap.data();
    const callerUid = request.auth.uid;
    const isCustomerOwner = orderData.userId === callerUid;
    // Check admin
    const userDoc = await db.collection('users').doc(callerUid).get();
    const isAdminUser = userDoc.exists && (userDoc.data()?.role === 'admin' || userDoc.data()?.role === 'super_admin');
    if (!isCustomerOwner && !isAdminUser) {
        throw new https_1.HttpsError('permission-denied', 'You do not have permission to cancel this order.');
    }
    // Enforce allowed cancellation statuses
    const cancellableStatuses = ['placed', 'processing', 'awaiting_payment'];
    if (!cancellableStatuses.includes(orderData.status)) {
        throw new https_1.HttpsError('failed-precondition', `Cannot cancel order in "${orderData.status}" status.`);
    }
    const nowIso = new Date().toISOString();
    const newHistoryEntry = {
        status: 'cancelled',
        at: nowIso,
        by: callerUid,
        role: isAdminUser ? 'admin' : 'customer',
        reason
    };
    const batch = db.batch();
    batch.update(orderRef, {
        status: 'cancelled',
        cancelledAt: nowIso,
        cancelledBy: callerUid,
        cancellationReason: reason,
        updatedAt: nowIso,
        statusHistory: firestore_2.FieldValue.arrayUnion(newHistoryEntry)
    });
    // Also update child vendor_orders if present
    const vendorOrdersSnap = await orderRef.collection('vendor_orders').get();
    for (const voDoc of vendorOrdersSnap.docs) {
        batch.update(voDoc.ref, {
            status: 'cancelled',
            cancelledAt: nowIso,
            updatedAt: nowIso
        });
    }
    await batch.commit();
    return { success: true, orderId, status: 'cancelled' };
});
exports.submitProductChange = (0, https_1.onCall)({ region: 'asia-southeast1' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be signed in.');
    }
    const { productId, updates } = (request.data || {});
    if (!productId || typeof productId !== 'string' || !updates || typeof updates !== 'object') {
        throw new https_1.HttpsError('invalid-argument', 'Valid productId and updates payload are required.');
    }
    const prodRef = db.collection('products').doc(productId);
    const prodSnap = await prodRef.get();
    if (!prodSnap.exists) {
        throw new https_1.HttpsError('not-found', `Product ${productId} not found.`);
    }
    const prodData = prodSnap.data();
    const callerUid = request.auth.uid;
    // Check admin or vendor owner
    const userDoc = await db.collection('users').doc(callerUid).get();
    const isAdminUser = userDoc.exists && (userDoc.data()?.role === 'admin' || userDoc.data()?.role === 'super_admin');
    const isVendorOwnerUser = prodData.vendorId === callerUid;
    if (!isAdminUser && !isVendorOwnerUser) {
        throw new https_1.HttpsError('permission-denied', 'You do not own this product.');
    }
    const nowIso = new Date().toISOString();
    // If vendor changes price, name or critical details, reset approvalStatus to 'pending'
    const requiresApproval = !isAdminUser && ('price' in updates ||
        'mrp' in updates ||
        'name' in updates ||
        'sku' in updates ||
        'category' in updates);
    const cleanUpdates = { ...updates, updatedAt: nowIso };
    if (requiresApproval) {
        cleanUpdates.approvalStatus = 'pending';
        cleanUpdates.approvalRequestedAt = nowIso;
    }
    await prodRef.update(cleanUpdates);
    return {
        success: true,
        productId,
        approvalStatus: requiresApproval ? 'pending' : (prodData.approvalStatus || 'approved')
    };
});
exports.quoteOrder = (0, https_1.onCall)({ region: 'asia-southeast1' }, async (request) => {
    const { items, couponCode } = (request.data || {});
    if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
        throw new https_1.HttpsError('invalid-argument', 'Cart items are required for quote.');
    }
    const productRefs = items.map(it => db.collection('products').doc(it.productId));
    const productDocs = await db.getAll(...productRefs);
    let subtotal = 0;
    const vendorIdsInCart = new Set();
    productDocs.forEach((doc, idx) => {
        if (!doc.exists) {
            throw new https_1.HttpsError('not-found', `Product ${items[idx].productId} not found.`);
        }
        const data = doc.data();
        const vendorId = data.vendorId || 'biocart';
        vendorIdsInCart.add(vendorId);
    });
    const vendorIdsArr = Array.from(vendorIdsInCart);
    const vendorRefs = vendorIdsArr.map(vid => db.collection('vendors').doc(vid));
    const vendorDocs = vendorRefs.length > 0 ? await db.getAll(...vendorRefs) : [];
    const vendorMap = new Map();
    vendorDocs.forEach((doc, i) => {
        vendorMap.set(vendorIdsArr[i], doc.exists ? doc.data() : {});
    });
    const vendorInputsMap = new Map();
    productDocs.forEach((doc, index) => {
        const productData = doc.data();
        const requestedQty = items[index].quantity;
        const vendorId = productData.vendorId || 'biocart';
        const pricePaise = Math.round(productData.price * 100);
        const lineTotalPaise = pricePaise * requestedQty;
        subtotal += lineTotalPaise;
        if (!vendorInputsMap.has(vendorId)) {
            const vInfo = vendorMap.get(vendorId) || {};
            const commissionBps = vInfo.commission?.baseRateBps
                ?? Math.round(Number(vInfo.commissionRate ?? vInfo.commissionPercent ?? 10) * 100);
            vendorInputsMap.set(vendorId, {
                vendorId,
                vendorStoreName: vInfo.storeName || vInfo.businessName || vendorId,
                commissionRateBps: commissionBps,
                items: []
            });
        }
        vendorInputsMap.get(vendorId).items.push({
            productId: doc.id,
            name: productData.name,
            pricePaise,
            quantity: requestedQty,
            hsnCode: productData.hsnCode || '310100',
            taxRateBps: 500
        });
    });
    let couponAllocation = null;
    if (couponCode && typeof couponCode === 'string') {
        const qSnap = await db.collection('coupons').where('code', '==', couponCode.trim().toUpperCase()).limit(1).get();
        if (!qSnap.empty) {
            const cDoc = qSnap.docs[0];
            const cData = cDoc.data();
            const expiryVal = cData.endDate || cData.expiryDate;
            let valid = true;
            if (expiryVal) {
                const expiryMillis = typeof expiryVal.toMillis === 'function' ? expiryVal.toMillis() : new Date(expiryVal).getTime();
                if (expiryMillis < Date.now())
                    valid = false;
            }
            if (cData.startDate) {
                const startMillis = typeof cData.startDate.toMillis === 'function' ? cData.startDate.toMillis() : new Date(cData.startDate).getTime();
                if (startMillis > Date.now())
                    valid = false;
            }
            if (cData.usageLimit && (cData.usedCount || 0) >= cData.usageLimit)
                valid = false;
            const isVendorScoped = (cData.creatorRole === 'vendor' || !!cData.creatorVendorId) && !!cData.creatorVendorId;
            const vendorIdScope = cData.creatorVendorId || cData.vendorId;
            let eligibleSubtotalPaise = 0;
            productDocs.forEach((doc, idx) => {
                const pData = doc.data();
                const pVendorId = pData.vendorId || 'biocart';
                const pId = doc.id;
                const pCategory = pData.category || '';
                const qty = items[idx].quantity;
                const linePaise = Math.round(pData.price * 100) * qty;
                const matchesVendor = isVendorScoped ? pVendorId === vendorIdScope : true;
                const matchesProduct = (cData.applicableProductIds && cData.applicableProductIds.length > 0)
                    ? cData.applicableProductIds.includes(pId)
                    : true;
                const matchesCategory = (cData.applicableCategories && cData.applicableCategories.length > 0)
                    ? cData.applicableCategories.some((cat) => cat.toLowerCase() === pCategory.toLowerCase())
                    : true;
                if (matchesVendor && matchesProduct && matchesCategory) {
                    eligibleSubtotalPaise += linePaise;
                }
            });
            if (eligibleSubtotalPaise === 0)
                valid = false;
            const minOrderPaise = cData.minOrderAmount ? Math.round(Number(cData.minOrderAmount) * 100) : 0;
            if (minOrderPaise > 0 && eligibleSubtotalPaise < minOrderPaise)
                valid = false;
            if (valid) {
                const couponType = cData.discountType || cData.type || 'percentage';
                const couponVal = cData.discountValue !== undefined ? cData.discountValue : (cData.value || 0);
                let discountPaise = 0;
                if (couponType === 'fixed') {
                    discountPaise = Math.min(eligibleSubtotalPaise, Math.round(couponVal * 100));
                }
                else if (couponType === 'percentage') {
                    discountPaise = Math.round((eligibleSubtotalPaise * couponVal) / 100);
                }
                if (cData.maxDiscountAmount && cData.maxDiscountAmount > 0) {
                    const maxDiscountPaise = Math.round(cData.maxDiscountAmount * 100);
                    if (discountPaise > maxDiscountPaise)
                        discountPaise = maxDiscountPaise;
                }
                couponAllocation = {
                    code: couponCode,
                    creatorRole: cData.creatorRole || (cData.creatorVendorId || cData.vendorId ? 'vendor' : 'admin'),
                    creatorVendorId: cData.creatorVendorId || cData.vendorId || undefined,
                    discountPaise
                };
            }
        }
    }
    let settingsDoc = await db.collection('settings').doc('general').get();
    if (!settingsDoc.exists) {
        settingsDoc = await db.collection('settings').doc('main').get();
    }
    let shippingFeePaise = 9900;
    let freeShippingThresholdPaise = 49900; // Baseline ₹499
    let minOrderValuePaise = 19900; // Baseline ₹199
    let codMinValuePaise = 29900; // Baseline ₹299
    let codMaxValuePaise = 500000; // Baseline ₹5,000
    let codAvailable = true;
    let financialPolicy = financialEngine_1.DEFAULT_FINANCIAL_POLICY;
    if (settingsDoc.exists) {
        const sData = settingsDoc.data();
        if (sData.shippingFee !== undefined)
            shippingFeePaise = Math.round(Number(sData.shippingFee) * 100);
        const orderThresh = sData.orderThresholds;
        if (orderThresh) {
            if (orderThresh.freeShippingThreshold !== undefined)
                freeShippingThresholdPaise = Math.round(Number(orderThresh.freeShippingThreshold) * 100);
            if (orderThresh.minOrderValue !== undefined)
                minOrderValuePaise = Math.round(Number(orderThresh.minOrderValue) * 100);
            if (orderThresh.codMinValue !== undefined)
                codMinValuePaise = Math.round(Number(orderThresh.codMinValue) * 100);
            if (orderThresh.codMaxValue !== undefined)
                codMaxValuePaise = Math.round(Number(orderThresh.codMaxValue) * 100);
            if (orderThresh.codAvailable !== undefined)
                codAvailable = Boolean(orderThresh.codAvailable);
        }
        else if (sData.freeShippingThreshold !== undefined) {
            freeShippingThresholdPaise = Math.round(Number(sData.freeShippingThreshold) * 100);
        }
        if (sData.financialPolicy)
            financialPolicy = { ...financialEngine_1.DEFAULT_FINANCIAL_POLICY, ...sData.financialPolicy };
    }
    // Precedence Rule: Check if a single primary vendor cart or vendor overrides apply
    // If vendor has useCustomThresholds === true, vendor overrides take precedence
    if (vendorIdsArr.length === 1) {
        const vInfo = vendorMap.get(vendorIdsArr[0]);
        const vThresh = vInfo?.orderThresholds;
        if (vThresh && vThresh.useCustomThresholds) {
            if (vThresh.freeShippingThreshold !== undefined && vThresh.freeShippingThreshold !== null) {
                freeShippingThresholdPaise = Math.round(Number(vThresh.freeShippingThreshold) * 100);
            }
            if (vThresh.minOrderValue !== undefined && vThresh.minOrderValue !== null) {
                minOrderValuePaise = Math.round(Number(vThresh.minOrderValue) * 100);
            }
            if (vThresh.codMinValue !== undefined && vThresh.codMinValue !== null) {
                codMinValuePaise = Math.round(Number(vThresh.codMinValue) * 100);
            }
            if (vThresh.codMaxValue !== undefined && vThresh.codMaxValue !== null) {
                codMaxValuePaise = Math.round(Number(vThresh.codMaxValue) * 100);
            }
            if (vThresh.codAvailable !== undefined) {
                codAvailable = Boolean(vThresh.codAvailable);
            }
        }
    }
    const shippingPaise = subtotal >= freeShippingThresholdPaise ? 0 : shippingFeePaise;
    const vendorInputsArray = Array.from(vendorInputsMap.values());
    const calculation = (0, financialEngine_1.calculateAuthoritativeOrder)(vendorInputsArray, couponAllocation, shippingPaise, financialPolicy);
    return {
        subtotal: calculation.subtotalPaise / 100,
        subtotalPaise: calculation.subtotalPaise,
        discountAmount: calculation.discountPaise / 100,
        discountAmountPaise: calculation.discountPaise,
        taxAmount: calculation.taxPaise / 100,
        taxAmountPaise: calculation.taxPaise,
        shippingAmount: calculation.shippingPaise / 100,
        shippingAmountPaise: calculation.shippingPaise,
        totalAmount: calculation.grandTotalPaise / 100,
        totalAmountPaise: calculation.grandTotalPaise,
        freeShippingThreshold: freeShippingThresholdPaise / 100,
        minOrderValue: minOrderValuePaise / 100,
        codMinValue: codMinValuePaise / 100,
        codMaxValue: codMaxValuePaise / 100,
        codAvailable
    };
});
exports.updateVendorEmail = (0, https_1.onCall)({ region: 'asia-southeast1' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be logged in.');
    }
    // Authorize: caller must be admin or super_admin
    const callerDoc = await db.collection('users').doc(request.auth.uid).get();
    const callerRole = callerDoc.exists ? callerDoc.data()?.role : null;
    if ((callerRole !== 'admin' && callerRole !== 'super_admin') ||
        callerDoc.data()?.status !== 'active') {
        throw new https_1.HttpsError('permission-denied', 'Only authorized administrators can update vendor login credentials.');
    }
    const { vendorId, newEmail } = (request.data || {});
    const cleanVendorId = typeof vendorId === 'string' ? vendorId.trim() : '';
    const cleanEmail = typeof newEmail === 'string' ? newEmail.trim().toLowerCase() : '';
    if (!cleanVendorId) {
        throw new https_1.HttpsError('invalid-argument', 'Valid vendorId is required.');
    }
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanEmail.length > 254) {
        throw new https_1.HttpsError('invalid-argument', 'Valid email address is required.');
    }
    // Verify vendor document exists
    const vendorRef = db.collection('vendors').doc(cleanVendorId);
    const vendorDoc = await vendorRef.get();
    if (!vendorDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Vendor record not found.');
    }
    const currentVendorData = vendorDoc.data();
    const oldEmail = currentVendorData.email?.toLowerCase();
    if (oldEmail === cleanEmail) {
        return { success: true, message: 'Email is unchanged.', email: cleanEmail };
    }
    // Check if another vendor already uses this email in Firestore
    const duplicateVendorSnap = await db.collection('vendors')
        .where('email', '==', cleanEmail)
        .limit(1)
        .get();
    if (!duplicateVendorSnap.empty && duplicateVendorSnap.docs[0].id !== cleanVendorId) {
        throw new https_1.HttpsError('already-exists', 'Another vendor partner is already registered with this email.');
    }
    // Check if vendor has a linked Firebase Auth record
    let authRecord = null;
    const ownerUid = currentVendorData.ownerUid || currentVendorData.userId || null;
    // 1. Check by explicit ownerUid
    if (ownerUid) {
        try {
            authRecord = await (0, auth_1.getAuth)().getUser(ownerUid);
        }
        catch {
            authRecord = null;
        }
    }
    // 2. Check by cleanVendorId if vendorId was the Auth UID
    if (!authRecord && cleanVendorId) {
        try {
            authRecord = await (0, auth_1.getAuth)().getUser(cleanVendorId);
        }
        catch {
            authRecord = null;
        }
    }
    // 3. If not found by UID, check if found by old email
    if (!authRecord && oldEmail) {
        try {
            authRecord = await (0, auth_1.getAuth)().getUserByEmail(oldEmail);
        }
        catch {
            authRecord = null;
        }
    }
    // 4. Also check if an account with cleanEmail already exists
    if (!authRecord) {
        try {
            const existingUserWithNewEmail = await (0, auth_1.getAuth)().getUserByEmail(cleanEmail);
            if (existingUserWithNewEmail) {
                // The user already has an auth account with this email; link it
                authRecord = existingUserWithNewEmail;
            }
        }
        catch {
            // User doesn't exist with new email yet
        }
    }
    // If Auth record exists, update its email via Admin SDK
    if (authRecord && authRecord.email !== cleanEmail) {
        try {
            await (0, auth_1.getAuth)().updateUser(authRecord.uid, {
                email: cleanEmail,
                emailVerified: false // Flag for re-verification
            });
        }
        catch (authUpdateErr) {
            if (authUpdateErr.code === 'auth/email-already-exists') {
                throw new https_1.HttpsError('already-exists', 'A Firebase account already exists with this email address.');
            }
            console.error('[updateVendorEmail] Auth update error:', authUpdateErr);
            throw new https_1.HttpsError('internal', authUpdateErr.message || 'Failed to update authentication account.');
        }
    }
    const now = new Date().toISOString();
    const batch = db.batch();
    // Update vendors/{vendorId}
    const vendorUpdatePayload = {
        email: cleanEmail,
        updatedAt: now
    };
    if (authRecord && !currentVendorData.ownerUid) {
        vendorUpdatePayload.ownerUid = authRecord.uid;
    }
    batch.update(vendorRef, vendorUpdatePayload);
    // If users/{uid} doc exists, keep it consistent
    const targetUid = authRecord ? authRecord.uid : (ownerUid || cleanVendorId);
    if (targetUid) {
        const userRef = db.collection('users').doc(targetUid);
        const userDoc = await userRef.get();
        if (userDoc.exists) {
            batch.update(userRef, {
                email: cleanEmail,
                updatedAt: now
            });
        }
    }
    // Log in audit_logs
    const auditRef = db.collection('audit_logs').doc();
    batch.set(auditRef, {
        id: auditRef.id,
        userId: request.auth.uid,
        userEmail: callerDoc.data()?.email || request.auth.token.email || 'admin',
        action: `Updated vendor "${currentVendorData.storeName || cleanVendorId}" login email`,
        resourceType: 'vendor',
        resourceId: cleanVendorId,
        details: {
            oldEmail: oldEmail || null,
            newEmail: cleanEmail,
            authUpdated: !!authRecord
        },
        createdAt: now
    });
    await batch.commit();
    return {
        success: true,
        vendorId: cleanVendorId,
        email: cleanEmail,
        authUpdated: !!authRecord
    };
});
exports.reconcileVendorAccount = (0, https_1.onCall)({ region: 'asia-southeast1' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be logged in.');
    }
    // Authorize: caller must be admin or super_admin
    const callerDoc = await db.collection('users').doc(request.auth.uid).get();
    const callerRole = callerDoc.exists ? callerDoc.data()?.role : null;
    if ((callerRole !== 'admin' && callerRole !== 'super_admin') ||
        callerDoc.data()?.status !== 'active') {
        throw new https_1.HttpsError('permission-denied', 'Only authorized administrators can reconcile vendor accounts.');
    }
    const { vendorId, targetEmail, createAuthIfMissing } = (request.data || {});
    const cleanVendorId = typeof vendorId === 'string' ? vendorId.trim() : '';
    if (!cleanVendorId) {
        throw new https_1.HttpsError('invalid-argument', 'Valid vendorId is required.');
    }
    const vendorRef = db.collection('vendors').doc(cleanVendorId);
    const vendorDoc = await vendorRef.get();
    if (!vendorDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Vendor record not found.');
    }
    const vendorData = vendorDoc.data();
    const emailToLink = (typeof targetEmail === 'string' && targetEmail.trim()
        ? targetEmail.trim().toLowerCase()
        : (vendorData.email || '').trim().toLowerCase());
    if (!emailToLink) {
        throw new https_1.HttpsError('invalid-argument', 'Vendor email is required to resolve or provision the vendor login.');
    }
    // 1. Check if an Auth user already exists for this email
    let authUser = null;
    let tempPassword = null;
    try {
        authUser = await (0, auth_1.getAuth)().getUserByEmail(emailToLink);
    }
    catch (err) {
        if (err.code === 'auth/user-not-found') {
            if (createAuthIfMissing) {
                // Create new Auth account with strong random password
                tempPassword = `${(0, node_crypto_1.randomBytes)(24).toString('base64url')}Aa1!`;
                authUser = await (0, auth_1.getAuth)().createUser({
                    email: emailToLink,
                    password: tempPassword,
                    displayName: vendorData.ownerName || vendorData.storeName || 'Vendor Partner',
                    emailVerified: true
                });
            }
            else {
                throw new https_1.HttpsError('not-found', `No Firebase Authentication account found for email: ${emailToLink}. Enable "createAuthIfMissing" or create account first.`);
            }
        }
        else {
            throw new https_1.HttpsError('internal', err.message || 'Failed to query Authentication user.');
        }
    }
    const targetUid = authUser.uid;
    // Check if targetUid is already linked to a DIFFERENT vendor
    const existingVendorConflict = await db.collection('vendors')
        .where('ownerUid', '==', targetUid)
        .limit(2)
        .get();
    const conflictingDoc = existingVendorConflict.docs.find(d => d.id !== cleanVendorId);
    if (conflictingDoc) {
        throw new https_1.HttpsError('already-exists', `The account ${emailToLink} is already assigned as owner of vendor "${conflictingDoc.data().storeName || conflictingDoc.id}".`);
    }
    const now = new Date().toISOString();
    const batch = db.batch();
    // 2. Update the vendor document: set ownerUid and email
    batch.update(vendorRef, {
        ownerUid: targetUid,
        email: emailToLink,
        status: vendorData.status || 'active',
        updatedAt: now
    });
    // 3. Ensure users/{targetUid} document exists with role: 'vendor'
    const userRef = db.collection('users').doc(targetUid);
    const userDoc = await userRef.get();
    if (userDoc.exists) {
        const existingRole = userDoc.data()?.role;
        // Don't downgrade admin or super_admin, but set vendor if customer or guest
        const updatedRole = (existingRole === 'admin' || existingRole === 'super_admin') ? existingRole : 'vendor';
        batch.update(userRef, {
            role: updatedRole,
            status: 'active',
            email: emailToLink,
            vendorId: cleanVendorId,
            updatedAt: now
        });
    }
    else {
        batch.set(userRef, {
            uid: targetUid,
            email: emailToLink,
            name: vendorData.ownerName || vendorData.storeName || 'Vendor Partner',
            role: 'vendor',
            status: 'active',
            vendorId: cleanVendorId,
            createdAt: now,
            updatedAt: now
        });
    }
    // 4. Ensure vendor_wallets exists (both under vendorId and targetUid for compatibility)
    // Preserving all historical ledger balances if document exists
    const walletRef = db.collection('vendor_wallets').doc(cleanVendorId);
    const walletDoc = await walletRef.get();
    if (!walletDoc.exists) {
        batch.set(walletRef, {
            vendorId: cleanVendorId,
            ownerUid: targetUid,
            availableBalance: 0,
            lifetimeGross: 0,
            lifetimeCommission: 0,
            lifetimeSettled: 0,
            pending: 0,
            onHold: 0,
            settling: 0,
            paidOut: 0,
            createdAt: now,
            updatedAt: now
        });
    }
    else {
        // If wallet already exists, update ownerUid link without touching balances or ledger
        batch.update(walletRef, {
            ownerUid: targetUid,
            updatedAt: now
        });
    }
    // 5. Audit log entry
    const auditRef = db.collection('audit_logs').doc();
    batch.set(auditRef, {
        id: auditRef.id,
        userId: request.auth.uid,
        userEmail: callerDoc.data()?.email || request.auth.token.email || 'admin',
        action: `Reconciled vendor "${vendorData.storeName || cleanVendorId}" to Auth UID ${targetUid} (${emailToLink})`,
        resourceType: 'vendor',
        resourceId: cleanVendorId,
        details: {
            vendorId: cleanVendorId,
            ownerUid: targetUid,
            email: emailToLink,
            authCreated: !!tempPassword
        },
        createdAt: now
    });
    await batch.commit();
    return {
        success: true,
        vendorId: cleanVendorId,
        ownerUid: targetUid,
        email: emailToLink,
        tempPassword: tempPassword || undefined,
        message: `Vendor "${vendorData.storeName || cleanVendorId}" successfully linked to account ${emailToLink}.`
    };
});
// ==========================================================
// generateInvoicePDF — restored, unchanged.
// ==========================================================================
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
        const bucket = storage.bucket('biocart-production-storage');
        const userId = orderData.userId || 'unknown';
        const pdfPath = `invoices/${userId}/${orderId}.pdf`;
        const file = bucket.file(pdfPath);
        const stream = file.createWriteStream({
            metadata: {
                contentType: 'application/pdf'
            }
        });
        doc.pipe(stream);
        const isB2B = !!orderData.customerGstin;
        const invoiceTitle = isB2B ? 'TAX INVOICE (B2B)' : 'RETAIL TAX INVOICE';
        doc.fontSize(20).text(invoiceTitle, { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(10).text('BioCart Sustainable Marketplace / Sindulis Agro Products', { align: 'center' });
        doc.text('Bio-Innovation Park, Hyderabad, India | GSTIN: 36AABCS1429B1Z8', { align: 'center' });
        doc.moveDown();
        doc.fontSize(11).text(`Invoice Number: ${invoiceNumber}`);
        doc.text(`Order Number: ${orderData.orderNumber || orderId}`);
        doc.text(`Invoice Date: ${new Date().toLocaleDateString('en-IN')}`);
        doc.text(`Place of Supply: ${orderData.shippingAddress?.state || 'Telangana'}`);
        if (isB2B) {
            doc.moveDown(0.5);
            doc.font('Helvetica-Bold').text(`Customer Business Name: ${orderData.customerBusinessName || 'N/A'}`);
            doc.text(`Customer GSTIN: ${orderData.customerGstin}`);
            doc.font('Helvetica');
        }
        doc.moveDown();
        doc.fontSize(11).text('Billed To:');
        const billAddr = orderData.billingAddress || orderData.shippingAddress || {};
        doc.fontSize(9).text(`${billAddr.name || ''}`);
        doc.text(`${billAddr.address || billAddr.street || ''}`);
        doc.text(`${billAddr.city || ''}, ${billAddr.state || ''} - ${billAddr.zip || billAddr.postalCode || ''}`);
        doc.text(`Phone: ${billAddr.phone || 'N/A'}`);
        doc.moveDown();
        doc.fontSize(11).text('Itemized Particulars:');
        doc.fontSize(9);
        items.forEach((item, index) => {
            const hsn = item.hsnCode || '310100';
            const itemPrice = typeof item.price === 'number' ? item.price : ((item.pricePaise || 0) / 100);
            const itemTotal = typeof item.total === 'number' ? item.total : ((item.totalPaise || 0) / 100);
            doc.text(`${index + 1}. ${item.name} | HSN: ${hsn} | Qty: ${item.quantity} | Rate: Rs.${itemPrice.toFixed(2)} | Amount: Rs.${itemTotal.toFixed(2)}`);
        });
        doc.moveDown();
        const subtotalVal = orderData.subtotalPaise ? (orderData.subtotalPaise / 100) : (orderData.subtotal || 0);
        const discountVal = orderData.discountAmountPaise ? (orderData.discountAmountPaise / 100) : (orderData.discountAmount || 0);
        const taxVal = orderData.taxAmountPaise ? (orderData.taxAmountPaise / 100) : (orderData.taxAmount || 0);
        const shippingVal = orderData.shippingAmountPaise ? (orderData.shippingAmountPaise / 100) : (orderData.shippingAmount || 0);
        const totalVal = orderData.totalAmountPaise ? (orderData.totalAmountPaise / 100) : (orderData.totalAmount || 0);
        doc.fontSize(10);
        doc.text(`Subtotal: Rs.${subtotalVal.toFixed(2)}`);
        doc.text(`Discount / Coupon: Rs.${discountVal.toFixed(2)}`);
        doc.text(`GST (CGST + SGST / IGST): Rs.${taxVal.toFixed(2)}`);
        doc.text(`Shipping & Handling: Rs.${shippingVal.toFixed(2)}`);
        doc.font('Helvetica-Bold').fontSize(12).text(`Grand Total: Rs.${totalVal.toFixed(2)}`);
        doc.font('Helvetica');
        doc.moveDown();
        doc.fontSize(8).text('This is a computer generated invoice and requires no physical signature.', { align: 'center' });
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
// ==========================================================
// uploadMediaAsset — authenticated backend upload for media assets
// Writes directly to GCS bucket biocart-production-storage
// ==========================================================
exports.uploadMediaAsset = (0, https_1.onCall)({ region: 'asia-southeast1' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be signed in.');
    }
    // Authorize: caller must be active admin or vendor
    const callerDoc = await db.collection('users').doc(request.auth.uid).get();
    const callerRole = callerDoc.exists ? callerDoc.data()?.role : null;
    const callerStatus = callerDoc.exists ? callerDoc.data()?.status : null;
    if ((callerRole !== 'admin' && callerRole !== 'super_admin' && callerRole !== 'vendor') || callerStatus !== 'active') {
        throw new https_1.HttpsError('permission-denied', 'Only authorized administrators or vendors can upload media assets.');
    }
    const { dataUrl, filename, folder = 'cms' } = request.data || {};
    if (!dataUrl || typeof dataUrl !== 'string' || !filename || typeof filename !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'Missing dataUrl or filename.');
    }
    // Parse dataUrl
    const matches = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (!matches) {
        throw new https_1.HttpsError('invalid-argument', 'Invalid base64 data URL.');
    }
    const contentType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    // Enforce 10MB limit
    if (buffer.length > 10 * 1024 * 1024) {
        throw new https_1.HttpsError('invalid-argument', 'File size exceeds 10MB limit.');
    }
    // Validate allowed image MIME types
    const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!allowedMime.includes(contentType.toLowerCase())) {
        throw new https_1.HttpsError('invalid-argument', `Unsupported file type: ${contentType}. Must be JPEG, PNG, WEBP, GIF, or SVG.`);
    }
    const cleanFileName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const filePath = `${folder}/${timestamp}_${cleanFileName}`;
    const bucket = storage.bucket('biocart-production-storage');
    const fileRef = bucket.file(filePath);
    await fileRef.save(buffer, {
        metadata: {
            contentType,
            cacheControl: 'public, max-age=31536000, immutable'
        },
        resumable: false
    });
    const publicUrl = `https://storage.googleapis.com/biocart-production-storage/${filePath}`;
    return { success: true, url: publicUrl, path: filePath };
});
var delhivery_1 = require("./delhivery");
Object.defineProperty(exports, "checkDelhiveryPincode", { enumerable: true, get: function () { return delhivery_1.checkDelhiveryPincode; } });
Object.defineProperty(exports, "createDelhiveryShipment", { enumerable: true, get: function () { return delhivery_1.createDelhiveryShipment; } });
Object.defineProperty(exports, "trackDelhiveryShipment", { enumerable: true, get: function () { return delhivery_1.trackDelhiveryShipment; } });
Object.defineProperty(exports, "getDelhiveryLabel", { enumerable: true, get: function () { return delhivery_1.getDelhiveryLabel; } });
Object.defineProperty(exports, "cancelDelhiveryShipment", { enumerable: true, get: function () { return delhivery_1.cancelDelhiveryShipment; } });
exports.updateVendorCommercials = (0, https_1.onCall)({ region: 'asia-southeast1' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be signed in.');
    }
    // Authorize: caller must be admin or super_admin
    const callerDoc = await db.collection('users').doc(request.auth.uid).get();
    const callerRole = callerDoc.exists ? callerDoc.data()?.role : null;
    if ((callerRole !== 'admin' && callerRole !== 'super_admin') || callerDoc.data()?.status !== 'active') {
        throw new https_1.HttpsError('permission-denied', 'Only authorized administrators can update vendor commercial settings.');
    }
    const { vendorId, baseRateBps, commissionRate, settlement } = (request.data || {});
    const cleanVendorId = typeof vendorId === 'string' ? vendorId.trim() : '';
    if (!cleanVendorId) {
        throw new https_1.HttpsError('invalid-argument', 'Valid vendorId is required.');
    }
    const vendorRef = db.collection('vendors').doc(cleanVendorId);
    const vendorDoc = await vendorRef.get();
    if (!vendorDoc.exists) {
        throw new https_1.HttpsError('not-found', `Vendor "${cleanVendorId}" does not exist.`);
    }
    const currentData = vendorDoc.data();
    const nowIso = new Date().toISOString();
    const updates = { updatedAt: nowIso };
    let finalBps = currentData.commission?.baseRateBps;
    if (baseRateBps !== undefined) {
        if (!Number.isInteger(baseRateBps) || baseRateBps < 0 || baseRateBps > 10000) {
            throw new https_1.HttpsError('invalid-argument', 'baseRateBps must be an integer between 0 and 10000 (0% to 100%).');
        }
        finalBps = baseRateBps;
        updates['commission.baseRateBps'] = baseRateBps;
        updates['commissionRate'] = baseRateBps / 100;
    }
    else if (commissionRate !== undefined) {
        if (typeof commissionRate !== 'number' || commissionRate < 0 || commissionRate > 100) {
            throw new https_1.HttpsError('invalid-argument', 'commissionRate must be a number between 0 and 100.');
        }
        finalBps = Math.round(commissionRate * 100);
        updates['commission.baseRateBps'] = finalBps;
        updates['commissionRate'] = commissionRate;
    }
    if (settlement && typeof settlement === 'object') {
        updates['settlement'] = {
            ...(currentData.settlement || {}),
            ...settlement
        };
    }
    const batch = db.batch();
    batch.update(vendorRef, updates);
    // Write to audit log
    const auditRef = db.collection('audit_logs').doc();
    batch.set(auditRef, {
        id: auditRef.id,
        userId: request.auth.uid,
        userEmail: callerDoc.data()?.email || request.auth.token.email || 'admin',
        action: `Updated commercial settings for vendor "${currentData.storeName || cleanVendorId}"`,
        resourceType: 'vendor',
        resourceId: cleanVendorId,
        details: {
            oldBps: currentData.commission?.baseRateBps,
            newBps: finalBps,
            settlementUpdates: settlement || null
        },
        createdAt: nowIso
    });
    await batch.commit();
    return {
        success: true,
        vendorId: cleanVendorId,
        baseRateBps: finalBps,
        commissionRate: finalBps !== undefined ? finalBps / 100 : undefined
    };
});
// ==========================================================
// Marketplace Financial Settlement Engine
// ==========================================================
var settlementEngine_1 = require("./settlementEngine");
Object.defineProperty(exports, "tuesdayVendorSettlement", { enumerable: true, get: function () { return settlementEngine_1.tuesdayVendorSettlement; } });
Object.defineProperty(exports, "triggerManualSettlement", { enumerable: true, get: function () { return settlementEngine_1.triggerManualSettlement; } });
Object.defineProperty(exports, "processOrderRefund", { enumerable: true, get: function () { return settlementEngine_1.processOrderRefund; } });
Object.defineProperty(exports, "releasePendingEarnings", { enumerable: true, get: function () { return settlementEngine_1.releasePendingEarnings; } });
Object.defineProperty(exports, "retryVendorPayout", { enumerable: true, get: function () { return settlementEngine_1.retryVendorPayout; } });
Object.defineProperty(exports, "razorpayPayoutWebhook", { enumerable: true, get: function () { return settlementEngine_1.razorpayPayoutWebhook; } });
