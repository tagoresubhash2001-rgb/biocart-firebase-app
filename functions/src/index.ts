import './core'; // initialises firebase-admin exactly once
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { randomBytes } from 'node:crypto';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const db = getFirestore();
const storage = getStorage();

function maskedBank(s: any) {
  const acc = String(s?.accountNumber || '');
  return { bankName: s?.bankName || '', ifscCode: s?.ifscCode || '', beneficiaryName: s?.beneficiaryName || '', accountType: s?.accountType || '',
    accountNumberMasked: acc.length > 4 ? `•••• ${acc.slice(-4)}` : '', hasBankDetails: Boolean(acc && s?.ifscCode) };
}


// ==========================================================
// provisionBioCartOwner — grants admin access only to authorized administrators.
// ==========================================================
export const provisionBioCartOwner = onCall({ region: 'asia-southeast1' }, async (request) => {
  const allowedAdmins = ['sinfoxmedia@gmail.com', 'tagoresubhash2001@gmail.com'];
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  const userEmail = request.auth.token.email?.toLowerCase();
  if (request.auth.token.email_verified !== true ||
      typeof userEmail !== 'string' || !allowedAdmins.includes(userEmail)) {
    throw new HttpsError('permission-denied', 'Only authorized BioCart administrators can run account setup.');
  }

  const ownerUser = await getAuth().getUser(request.auth.uid);
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
      // Commission is set by the admin in Vendors → Commercials (BioCart pays commission like every vendor).
      createdAt: now,
      updatedAt: now
    });
  } else {
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
  } else {
    await biocartWalletRef.update({
      ownerUid: request.auth.uid,
      updatedAt: now
    });
  }

  return { success: true, email: userEmail };
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
  description?: string;
  website?: string;
  legal?: {
    businessType?: string;
    pan?: string;
    gstin?: string;
    registrationNumber?: string;
    establishedYear?: string;
  };
  addresses?: {
    registeredAddress?: any;
    pickupAddress?: any;
    sameAsRegistered?: boolean;
  };
  settlement?: {
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    accountType?: string;
  };
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
      // The admin typed this email for the vendor; without this flag the vendor
      // could not pass isVendorOwner() in the security rules.
      emailVerified: true,
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
  await getAuth().setCustomUserClaims(uid, { role: 'vendor' });

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
    settlement: maskedBank(data.settlement || {}), // full bank details live in vendors/{id}/private/settlement (admin-only)
    status: 'active',
    approvalStatus: 'approved',
    commissionRate,
    commission: { baseRateBps: Math.round(commissionRate * 100) },
    createdAt: now,
    updatedAt: now
  });

  batch.set(db.collection('vendors').doc(uid).collection('private').doc('settlement'), { ...(data.settlement || {}), updatedAt: now });

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

export const clearMustChangePassword = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be signed in.');
  }
  await db.collection('users').doc(request.auth.uid).update({
    mustChangePassword: false,
    updatedAt: new Date().toISOString()
  });
  return { success: true };
});

export const allocateCustomerId = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be signed in.');
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


export const submitProductChange = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be signed in.');
  }

  const { productId, updates } = (request.data || {}) as { productId: string; updates: Record<string, any> };
  if (!productId || typeof productId !== 'string' || !updates || typeof updates !== 'object') {
    throw new HttpsError('invalid-argument', 'Valid productId and updates payload are required.');
  }

  const prodRef = db.collection('products').doc(productId);
  const prodSnap = await prodRef.get();
  if (!prodSnap.exists) {
    throw new HttpsError('not-found', `Product ${productId} not found.`);
  }

  const prodData = prodSnap.data()!;
  const callerUid = request.auth.uid;

  // Check admin or vendor owner
  const userDoc = await db.collection('users').doc(callerUid).get();
  const isAdminUser = userDoc.exists && (userDoc.data()?.role === 'admin' || userDoc.data()?.role === 'super_admin');
  const isVendorOwnerUser = prodData.vendorId === callerUid;

  if (!isAdminUser && !isVendorOwnerUser) {
    throw new HttpsError('permission-denied', 'You do not own this product.');
  }

  const nowIso = new Date().toISOString();

  // Vendor updates must be sanitized against an allowlist and cannot modify protected fields
  let cleanUpdates: Record<string, any> = {};
  let finalApprovalStatus = prodData.approvalStatus || 'approved';

  if (!isAdminUser) {
    // Non-admin vendor: strictly allowlist editable keys (same list as firestore.rules)
    const contentKeys = [
      'name', 'description', 'shortDescription', 'images', 'image', 'price', 'mrp', 'weightVariants', 'selectedVariant',
      'category', 'categoryId', 'subCategory', 'sku', 'features', 'benefits', 'usageInstructions', 'howToUse', 'ingredients',
      'materials', 'dimensions', 'badge', 'faqs', 'tags', 'unit', 'weightGrams', 'hsnCode', 'minOrderQuantity', 'maxOrderQuantity',
    ];
    // Operational keys a vendor may change without a fresh admin review
    const operationalKeys = ['stockStatus', 'inStock', 'stockQuantity', 'stock', 'codAllowed'];
    const same = (a: any, b: any) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
    let contentChanged = false;
    for (const key of [...contentKeys, ...operationalKeys]) {
      if (key in updates && !same(updates[key], prodData[key])) {
        cleanUpdates[key] = updates[key];
        if (contentKeys.includes(key)) contentChanged = true;
      }
    }
    cleanUpdates.updatedAt = nowIso;
    // Any content change (name, price, images, …) needs admin approval again; vendors can never self-approve.
    if (contentChanged || String(prodData.approvalStatus || '').toLowerCase() !== 'approved') {
      cleanUpdates.approvalStatus = 'pending';
      cleanUpdates.approvalRequestedAt = nowIso;
      finalApprovalStatus = 'pending';
    }

    // Never allow vendor to change owner, active flag, commission, or approval
    delete cleanUpdates.vendorId;
    delete cleanUpdates.active;
    delete cleanUpdates.commissionRateBps;
    delete cleanUpdates.approvedBy;
    delete cleanUpdates.approvedAt;
  } else {
    // Admin user: can update any fields passed
    cleanUpdates = { ...updates, updatedAt: nowIso };
    finalApprovalStatus = updates.approvalStatus || prodData.approvalStatus || 'approved';
  }

  const stockChange = ['stockQuantity', 'stock'].map((k) => cleanUpdates[k]).find((v) => v !== undefined);
  delete cleanUpdates.stockQuantity; delete cleanUpdates.stock; delete cleanUpdates.inStock; delete cleanUpdates.stockStatus;
  await prodRef.update(cleanUpdates);
  if (stockChange !== undefined && Number.isInteger(Number(stockChange)) && Number(stockChange) >= 0) {
    const { applyStockOnHand } = await import('./policyAdmin');
    await applyStockOnHand(productId, Number(stockChange));
  }

  return {
    success: true,
    productId,
    approvalStatus: finalApprovalStatus
  };
});


// ==========================================================
// updateVendorEmail — admin-only callable to safely update a
// vendor's business email across Firebase Auth, Firestore
// users/{uid}, and vendors/{uid} with duplicate checks.
// ==========================================================
interface UpdateVendorEmailPayload {
  vendorId: string;
  newEmail: string;
}

export const updateVendorEmail = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in.');
  }

  // Authorize: caller must be admin or super_admin
  const callerDoc = await db.collection('users').doc(request.auth.uid).get();
  const callerRole = callerDoc.exists ? callerDoc.data()?.role : null;
  if ((callerRole !== 'admin' && callerRole !== 'super_admin') ||
      callerDoc.data()?.status !== 'active') {
    throw new HttpsError('permission-denied', 'Only authorized administrators can update vendor login credentials.');
  }

  const { vendorId, newEmail } = (request.data || {}) as UpdateVendorEmailPayload;
  const cleanVendorId = typeof vendorId === 'string' ? vendorId.trim() : '';
  const cleanEmail = typeof newEmail === 'string' ? newEmail.trim().toLowerCase() : '';

  if (!cleanVendorId) {
    throw new HttpsError('invalid-argument', 'Valid vendorId is required.');
  }
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanEmail.length > 254) {
    throw new HttpsError('invalid-argument', 'Valid email address is required.');
  }

  // Verify vendor document exists
  const vendorRef = db.collection('vendors').doc(cleanVendorId);
  const vendorDoc = await vendorRef.get();
  if (!vendorDoc.exists) {
    throw new HttpsError('not-found', 'Vendor record not found.');
  }

  const currentVendorData = vendorDoc.data()!;
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
    throw new HttpsError('already-exists', 'Another vendor partner is already registered with this email.');
  }

  // Check if vendor has a linked Firebase Auth record
  let authRecord: any = null;
  const ownerUid = currentVendorData.ownerUid || currentVendorData.userId || null;

  // 1. Check by explicit ownerUid
  if (ownerUid) {
    try {
      authRecord = await getAuth().getUser(ownerUid);
    } catch {
      authRecord = null;
    }
  }

  // 2. Check by cleanVendorId if vendorId was the Auth UID
  if (!authRecord && cleanVendorId) {
    try {
      authRecord = await getAuth().getUser(cleanVendorId);
    } catch {
      authRecord = null;
    }
  }

  // 3. If not found by UID, check if found by old email
  if (!authRecord && oldEmail) {
    try {
      authRecord = await getAuth().getUserByEmail(oldEmail);
    } catch {
      authRecord = null;
    }
  }

  // 4. Also check if an account with cleanEmail already exists
  if (!authRecord) {
    try {
      const existingUserWithNewEmail = await getAuth().getUserByEmail(cleanEmail);
      if (existingUserWithNewEmail) {
        // The user already has an auth account with this email; link it
        authRecord = existingUserWithNewEmail;
      }
    } catch {
      // User doesn't exist with new email yet
    }
  }

  // If Auth record exists, update its email via Admin SDK
  if (authRecord && authRecord.email !== cleanEmail) {
    try {
      await getAuth().updateUser(authRecord.uid, {
        email: cleanEmail,
        emailVerified: false // Flag for re-verification
      });
    } catch (authUpdateErr: any) {
      if (authUpdateErr.code === 'auth/email-already-exists') {
        throw new HttpsError('already-exists', 'A Firebase account already exists with this email address.');
      }
      console.error('[updateVendorEmail] Auth update error:', authUpdateErr);
      throw new HttpsError('internal', authUpdateErr.message || 'Failed to update authentication account.');
    }
  }

  const now = new Date().toISOString();
  const batch = db.batch();

  // Update vendors/{vendorId}
  const vendorUpdatePayload: Record<string, any> = {
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

// ==========================================================
// reconcileVendorAccount — admin-only callable to securely link
// an existing unlinked vendor document to an authenticated user
// account, provision/ensure users/{uid} role='vendor', and
// initialize vendor_wallets/{vendorId} if missing.
// ==========================================================
interface ReconcileVendorPayload {
  vendorId: string;
  targetEmail?: string;
  createAuthIfMissing?: boolean;
}

export const reconcileVendorAccount = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in.');
  }

  // Authorize: caller must be admin or super_admin
  const callerDoc = await db.collection('users').doc(request.auth.uid).get();
  const callerRole = callerDoc.exists ? callerDoc.data()?.role : null;
  if ((callerRole !== 'admin' && callerRole !== 'super_admin') ||
      callerDoc.data()?.status !== 'active') {
    throw new HttpsError('permission-denied', 'Only authorized administrators can reconcile vendor accounts.');
  }

  const { vendorId, targetEmail, createAuthIfMissing } = (request.data || {}) as ReconcileVendorPayload;
  const cleanVendorId = typeof vendorId === 'string' ? vendorId.trim() : '';

  if (!cleanVendorId) {
    throw new HttpsError('invalid-argument', 'Valid vendorId is required.');
  }

  const vendorRef = db.collection('vendors').doc(cleanVendorId);
  const vendorDoc = await vendorRef.get();
  if (!vendorDoc.exists) {
    throw new HttpsError('not-found', 'Vendor record not found.');
  }

  const vendorData = vendorDoc.data()!;
  const emailToLink = (typeof targetEmail === 'string' && targetEmail.trim()
    ? targetEmail.trim().toLowerCase()
    : (vendorData.email || '').trim().toLowerCase());

  if (!emailToLink) {
    throw new HttpsError('invalid-argument', 'Vendor email is required to resolve or provision the vendor login.');
  }

  // 1. Check if an Auth user already exists for this email
  let authUser: any = null;
  let tempPassword: string | null = null;

  try {
    authUser = await getAuth().getUserByEmail(emailToLink);
  } catch (err: any) {
    if (err.code === 'auth/user-not-found') {
      if (createAuthIfMissing) {
        // Create new Auth account with strong random password
        tempPassword = `${randomBytes(24).toString('base64url')}Aa1!`;
        authUser = await getAuth().createUser({
          email: emailToLink,
          password: tempPassword,
          displayName: vendorData.ownerName || vendorData.storeName || 'Vendor Partner',
          emailVerified: true
        });
      } else {
        throw new HttpsError('not-found', `No Firebase Authentication account found for email: ${emailToLink}. Enable "createAuthIfMissing" or create account first.`);
      }
    } else {
      throw new HttpsError('internal', err.message || 'Failed to query Authentication user.');
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
    throw new HttpsError('already-exists', `The account ${emailToLink} is already assigned as owner of vendor "${conflictingDoc.data().storeName || conflictingDoc.id}".`);
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
  } else {
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
  } else {
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
// uploadMediaAsset — authenticated backend upload for media assets
// Writes directly to GCS bucket biocart-production-storage
// ==========================================================
export const uploadMediaAsset = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be signed in.');
  }

  // Authorize: caller must be active admin or vendor
  const callerDoc = await db.collection('users').doc(request.auth.uid).get();
  const callerRole = callerDoc.exists ? callerDoc.data()?.role : null;
  const callerStatus = callerDoc.exists ? callerDoc.data()?.status : null;

  if ((callerRole !== 'admin' && callerRole !== 'super_admin' && callerRole !== 'vendor') || callerStatus !== 'active') {
    throw new HttpsError('permission-denied', 'Only authorized administrators or vendors can upload media assets.');
  }

  const { dataUrl, filename, folder = 'cms' } = request.data || {};
  if (!dataUrl || typeof dataUrl !== 'string' || !filename || typeof filename !== 'string') {
    throw new HttpsError('invalid-argument', 'Missing dataUrl or filename.');
  }

  // Parse dataUrl
  const matches = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (!matches) {
    throw new HttpsError('invalid-argument', 'Invalid base64 data URL.');
  }

  const contentType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, 'base64');

  // Enforce 10MB limit
  if (buffer.length > 10 * 1024 * 1024) {
    throw new HttpsError('invalid-argument', 'File size exceeds 10MB limit.');
  }

  // Validate allowed image MIME types (disallow svg to prevent stored XSS)
  const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedMime.includes(contentType.toLowerCase())) {
    throw new HttpsError('invalid-argument', `Unsupported file type: ${contentType}. Must be JPEG, PNG, WEBP, or GIF.`);
  }

  // Whitelist allowed destination folders
  const allowedFolders = ['cms', 'products', 'banners', 'categories', 'media', 'vendors'];
  const targetFolder = allowedFolders.includes(folder) ? folder : 'media';

  const cleanFileName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const timestamp = Date.now();
  const filePath = `${targetFolder}/${timestamp}_${cleanFileName}`;

  const bucket = storage.bucket();
  const fileRef = bucket.file(filePath);
  const downloadToken = crypto.randomUUID ? crypto.randomUUID() : (crypto as any).randomBytes(16).toString('hex');

  await fileRef.save(buffer, {
    metadata: {
      contentType,
      cacheControl: 'public, max-age=31536000, immutable',
      metadata: {
        firebaseStorageDownloadTokens: downloadToken
      }
    },
    resumable: false
  });

  // Standard Firebase Storage download URL that works without requiring public bucket IAM read
  const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filePath)}?alt=media&token=${downloadToken}`;
  return { success: true, url: downloadUrl, path: filePath };
});


// ==========================================================
// updateVendorCommercials — admin-only callable to safely update
// vendor commission and settlement settings with audit logging.
// ==========================================================
interface UpdateVendorCommercialsPayload {
  vendorId: string;
  baseRateBps?: number;
  commissionRate?: number;
  settlement?: {
    cycle?: 'weekly' | 'biweekly' | 'monthly';
    beneficiaryName?: string;
    accountNumber?: string;
    ifscCode?: string;
    bankName?: string;
  };
}

export const updateVendorCommercials = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be signed in.');
  }

  // Authorize: caller must be admin or super_admin
  const callerDoc = await db.collection('users').doc(request.auth.uid).get();
  const callerRole = callerDoc.exists ? callerDoc.data()?.role : null;
  if ((callerRole !== 'admin' && callerRole !== 'super_admin') || callerDoc.data()?.status !== 'active') {
    throw new HttpsError('permission-denied', 'Only authorized administrators can update vendor commercial settings.');
  }

  const { vendorId, baseRateBps, commissionRate, settlement } = (request.data || {}) as UpdateVendorCommercialsPayload;
  const cleanVendorId = typeof vendorId === 'string' ? vendorId.trim() : '';

  if (!cleanVendorId) {
    throw new HttpsError('invalid-argument', 'Valid vendorId is required.');
  }

  const vendorRef = db.collection('vendors').doc(cleanVendorId);
  const vendorDoc = await vendorRef.get();
  if (!vendorDoc.exists) {
    throw new HttpsError('not-found', `Vendor "${cleanVendorId}" does not exist.`);
  }

  const currentData = vendorDoc.data()!;
  const nowIso = new Date().toISOString();
  const updates: Record<string, any> = { updatedAt: nowIso };

  let finalBps = currentData.commission?.baseRateBps;
  if (baseRateBps !== undefined) {
    if (!Number.isInteger(baseRateBps) || baseRateBps < 0 || baseRateBps > 10000) {
      throw new HttpsError('invalid-argument', 'baseRateBps must be an integer between 0 and 10000 (0% to 100%).');
    }
    finalBps = baseRateBps;
    updates['commission.baseRateBps'] = baseRateBps;
    updates['commissionRate'] = baseRateBps / 100;
  } else if (commissionRate !== undefined) {
    if (typeof commissionRate !== 'number' || commissionRate < 0 || commissionRate > 100) {
      throw new HttpsError('invalid-argument', 'commissionRate must be a number between 0 and 100.');
    }
    finalBps = Math.round(commissionRate * 100);
    updates['commission.baseRateBps'] = finalBps;
    updates['commissionRate'] = commissionRate;
  }

  const batch = db.batch();
  if (settlement && typeof settlement === 'object') {
    const privRef = vendorRef.collection('private').doc('settlement');
    const priv = (await privRef.get()).data() || {};
    const legacy = currentData.settlement || {};
    const full = { ...legacy, ...priv, ...settlement };
    delete (full as any).accountNumberMasked; delete (full as any).hasBankDetails;
    batch.set(privRef, { ...full, updatedAt: nowIso }, { merge: true });
    updates['settlement'] = maskedBank(full);
  }

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
// Marketplace order, payment, courier and settlement engine
// ==========================================================
export {
  quoteOrder, createOrder, releaseExpiredReservations, cancelOrder, processOrderRefund, retryRefund,
  updateOrderStatus, updateVendorOrderStatus, adminMarkDelivered, markCodRemitted,
} from './orders';
export {
  createCashfreeOrder, verifyCashfreePayment, cashfreePaymentWebhook, syncPendingRefunds, reconcileGatewayFees,
} from './cashfree';
export {
  checkEkartPincode, createEkartShipment, trackEkartShipment, getEkartLabel, cancelEkartShipment,
  ekartWebhook, pollEkartShipments, registerEkartPickupAddress, registerEkartWebhook,
} from './ekart';
export { tuesdayVendorSettlement, triggerManualSettlement, markSettlementPaid, retryVendorPayout } from './settlement';
export { updateFinancialPolicy, setProductStock } from './policyAdmin';
