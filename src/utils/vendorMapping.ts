/**
 * Vendor Profile & Settings Normalization Layer
 * Provides typed parsing, canonical-to-legacy fallback resolution,
 * and explicit allowlisted update payload generation for Firestore persistence.
 */

export interface VendorSettingsFormModel {
  // Identity & Store
  vendorId: string;
  storeName: string; // Canonical business/store name (e.g. "BioCart Direct Official")
  ownerName: string; // Authoritative human owner/contact name (e.g. "Subhash Tagore")
  email: string;     // Canonical vendor contact/login email (read-only for client settings)
  phone: string;     // Business contact phone
  website: string;   // Optional store website
  description: string; // Store description
  logoUrl: string;   // Storage image URL

  // Legal & Tax Compliance
  businessType: 'proprietorship' | 'partnership' | 'llp' | 'private_limited' | 'public_limited' | 'other';
  gstin: string;     // 15-character uppercase GSTIN
  pan: string;       // 10-character uppercase PAN

  // Registered Street Address
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;

  // Pickup Address (Logistics)
  pickupAddressLine1: string;
  pickupCity: string;
  pickupState: string;
  pickupPinCode: string;
  sameAsRegistered: boolean;

  // Operational & Fulfilment Preferences
  handlingTimeDays: number;
  dispatchDays: string;
  returnAccepted: boolean;
  returnWindowDays: number;

  // Notification Preferences
  notifyOrders: boolean;
  notifyLowStock: boolean;
  notifySettlements: boolean;
  notifyAnnouncements: boolean;

  // Read-only Financial Audit Info (for display only, never mutated by client)
  bankName?: string;
  accountNumberMasked?: string;
  ifscCode?: string;
  commissionBaseRateBps?: number;
  status: 'active' | 'pending' | 'suspended';
}

/**
 * Normalizes raw Firestore vendor document data (and optional user profile / auth email fallbacks)
 * into a stable, strongly typed VendorSettingsFormModel.
 * Preserves canonical fields over legacy aliases and never maps document IDs or UIDs into human names.
 */
export function normalizeVendorSettings(
  vendorId: string,
  rawDoc: any,
  authFallbackEmail?: string | null,
  ownerProfileName?: string | null
): VendorSettingsFormModel {
  const d = rawDoc || {};

  // 1. Business / Store Name:
  // Canonical: storeName. Fallback alias: businessName. Never use vendorId slug as store name if legitimate name exists.
  let resolvedStoreName = (d.storeName || d.businessName || '').trim();
  if (!resolvedStoreName && vendorId === 'biocart') {
    resolvedStoreName = 'BioCart Direct Official';
  }

  // 2. Owner Name:
  // Must be the authoritative human owner name.
  // Check rawDoc.ownerName first, then owner profile name, then auth display name.
  // CRITICAL: If ownerName is identical to doc id ('biocart') or 'system', treat as unpopulated and fall back to verified owner profile name if present.
  let resolvedOwnerName = (d.ownerName || '').trim();
  if (!resolvedOwnerName || resolvedOwnerName.toLowerCase() === 'biocart' || resolvedOwnerName.toLowerCase() === 'system') {
    if (ownerProfileName && ownerProfileName.trim() && !['biocart', 'biocart vendor', 'biocart user'].includes(ownerProfileName.trim().toLowerCase())) {
      resolvedOwnerName = ownerProfileName.trim();
    } else {
      resolvedOwnerName = '';
    }
  }

  // 3. Email:
  const resolvedEmail = (d.email || authFallbackEmail || '').trim().toLowerCase();

  // 4. Phone:
  const resolvedPhone = (d.phone || d.contact?.phone || '').trim();

  // 5. Website & Description:
  const resolvedWebsite = (d.website || '').trim();
  const resolvedDescription = (d.description || '').trim();
  const resolvedLogo = (d.logo || '').trim();

  // 6. Legal & Tax:
  const legal = d.legal || {};
  const resolvedGstin = (legal.gstin || d.gstNumber || '').trim().toUpperCase();
  const resolvedPan = (legal.pan || '').trim().toUpperCase();
  const validBusinessTypes = ['proprietorship', 'partnership', 'llp', 'private_limited', 'public_limited', 'other'];
  const resolvedBusinessType = validBusinessTypes.includes(legal.businessType)
    ? legal.businessType
    : 'proprietorship';

  // 7. Address Mapping (canonical: addresses.registeredAddress, fallback: contact.address or flat fields)
  const addresses = d.addresses || {};
  const regAddr = addresses.registeredAddress || {};
  const pickupAddr = addresses.pickupAddress || {};
  const sameAsRegistered = addresses.sameAsRegistered !== false;

  const resolvedAddressLine1 = (regAddr.addressLine1 || d.address || d.contact?.address || '').trim();
  const resolvedAddressLine2 = (regAddr.addressLine2 || '').trim();
  const resolvedLandmark = (regAddr.landmark || '').trim();
  const resolvedCity = (regAddr.city || d.city || '').trim();
  const resolvedState = (regAddr.state || d.state || '').trim();
  const resolvedPinCode = (regAddr.pinCode || d.pincode || '').trim();

  const resolvedPickupAddressLine1 = (pickupAddr.addressLine1 || resolvedAddressLine1).trim();
  const resolvedPickupCity = (pickupAddr.city || resolvedCity).trim();
  const resolvedPickupState = (pickupAddr.state || resolvedState).trim();
  const resolvedPickupPinCode = (pickupAddr.pinCode || resolvedPinCode).trim();

  // 8. Fulfilment & Shipping Preferences:
  const shippingPrefs = d.shippingPreferences || {};
  const handlingTimeDays = Number(shippingPrefs.handlingTimeDays) || 1;
  const dispatchDays = shippingPrefs.dispatchDays || 'Mon-Sat';
  const returnAccepted = shippingPrefs.returnAccepted !== false;
  const returnWindowDays = Number(shippingPrefs.returnWindowDays) || 7;

  // 9. Notification Preferences:
  const notifPrefs = d.notificationPreferences || {};
  const notifyOrders = notifPrefs.orders !== false;
  const notifyLowStock = notifPrefs.lowStock !== false;
  const notifySettlements = notifPrefs.settlements !== false;
  const notifyAnnouncements = notifPrefs.announcements !== false;

  // 10. Financial Audit Display:
  const settlement = d.settlement || {};
  const rawAcct = settlement.accountNumber ? String(settlement.accountNumber).trim() : '';
  const maskedAcct = rawAcct.length > 4 ? `•••• •••• ${rawAcct.slice(-4)}` : (rawAcct || 'Not linked');
  const ifscCode = (settlement.ifscCode || '').trim().toUpperCase();
  const bankName = (settlement.bankName || '').trim();
  const commissionBaseRateBps = d.commission?.baseRateBps || 1000;
  const status = (d.status === 'pending' || d.status === 'suspended') ? d.status : 'active';

  return {
    vendorId,
    storeName: resolvedStoreName,
    ownerName: resolvedOwnerName,
    email: resolvedEmail,
    phone: resolvedPhone,
    website: resolvedWebsite,
    description: resolvedDescription,
    logoUrl: resolvedLogo,
    businessType: resolvedBusinessType as any,
    gstin: resolvedGstin,
    pan: resolvedPan,
    addressLine1: resolvedAddressLine1,
    addressLine2: resolvedAddressLine2,
    landmark: resolvedLandmark,
    city: resolvedCity,
    state: resolvedState,
    pinCode: resolvedPinCode,
    country: 'India',
    pickupAddressLine1: resolvedPickupAddressLine1,
    pickupCity: resolvedPickupCity,
    pickupState: resolvedPickupState,
    pickupPinCode: resolvedPickupPinCode,
    sameAsRegistered,
    handlingTimeDays,
    dispatchDays,
    returnAccepted,
    returnWindowDays,
    notifyOrders,
    notifyLowStock,
    notifySettlements,
    notifyAnnouncements,
    bankName,
    accountNumberMasked: maskedAcct,
    ifscCode,
    commissionBaseRateBps,
    status
  };
}

/**
 * Builds an explicit, sanitized allowlisted update payload for Firestore vendors/{vendorId}.
 * Strictly excludes ownerUid, vendorId, commission, settlement, and wallet fields.
 */
export function buildVendorUpdatePayload(
  model: VendorSettingsFormModel,
  rawExistingDoc: any
): Record<string, any> {
  const existingAddresses = rawExistingDoc?.addresses || {};
  const existingLegal = rawExistingDoc?.legal || {};

  const cleanStoreName = model.storeName.trim();
  const cleanOwnerName = model.ownerName.trim();
  const cleanPhone = model.phone.trim();
  const cleanWebsite = model.website.trim();
  const cleanDescription = model.description.trim();
  const cleanGstin = model.gstin.trim().toUpperCase();
  const cleanPan = model.pan.trim().toUpperCase();
  const cleanAddress1 = model.addressLine1.trim();
  const cleanCity = model.city.trim();
  const cleanState = model.state.trim();
  const cleanPin = model.pinCode.trim();

  const registeredAddress = {
    ...(existingAddresses.registeredAddress || {}),
    addressLine1: cleanAddress1,
    addressLine2: (model.addressLine2 || '').trim(),
    landmark: (model.landmark || '').trim(),
    city: cleanCity,
    state: cleanState,
    pinCode: cleanPin,
    country: 'India'
  };

  const pickupAddress = model.sameAsRegistered
    ? {
        ...registeredAddress,
        contactPerson: cleanOwnerName,
        contactPhone: cleanPhone
      }
    : {
        ...(existingAddresses.pickupAddress || {}),
        addressLine1: model.pickupAddressLine1.trim() || cleanAddress1,
        city: model.pickupCity.trim() || cleanCity,
        state: model.pickupState.trim() || cleanState,
        pinCode: model.pickupPinCode.trim() || cleanPin,
        country: 'India',
        contactPerson: cleanOwnerName,
        contactPhone: cleanPhone
      };

  const legal = {
    ...existingLegal,
    businessType: model.businessType,
    gstin: cleanGstin,
    pan: cleanPan
  };

  const notificationPreferences = {
    orders: model.notifyOrders,
    lowStock: model.notifyLowStock,
    settlements: model.notifySettlements,
    announcements: model.notifyAnnouncements
  };

  const shippingPreferences = {
    handlingTimeDays: Number(model.handlingTimeDays) || 1,
    dispatchDays: model.dispatchDays || 'Mon-Sat',
    returnAccepted: model.returnAccepted,
    returnWindowDays: Number(model.returnWindowDays) || 7
  };

  // Strictly allowlisted payload matching firestore.rules
  return {
    storeName: cleanStoreName,
    businessName: cleanStoreName,
    ownerName: cleanOwnerName,
    phone: cleanPhone,
    description: cleanDescription,
    website: cleanWebsite,
    logo: model.logoUrl || '',
    addresses: {
      ...existingAddresses,
      registeredAddress,
      pickupAddress,
      sameAsRegistered: model.sameAsRegistered
    },
    legal,
    notificationPreferences,
    shippingPreferences,
    updatedAt: new Date().toISOString()
  };
}
