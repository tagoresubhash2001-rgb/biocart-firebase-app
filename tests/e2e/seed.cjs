// Seeds the LOCAL Firebase emulators with test data for the browser tests.
// It refuses to run unless the emulator addresses are set, so it can never write to the live project.
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const PASSWORD = 'Test@12345';
const ACCOUNTS = {
  admin: { uid: 'test-admin', email: 'admin@biocart.test', name: 'Test Admin' },
  biocartVendor: { uid: 'test-vendor-biocart', email: 'vendor.biocart@biocart.test', name: 'Biocart Store Manager' },
  farmsVendor: { uid: 'test-vendor-farms', email: 'vendor.farms@biocart.test', name: 'Test Farms Owner' },
  customer: { uid: 'test-customer', email: 'customer@biocart.test', name: 'Test Customer', phone: '+919876500001' },
};
const now = () => new Date().toISOString();
const IMG = (label, color) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="${color}"/><text x="50%" y="50%" font-family="Arial" font-size="36" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${label}</text></svg>`)}`;

async function seed() {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    throw new Error('Refusing to seed: FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST are not set (this script only writes to the emulators).');
  }
  initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'bio-cart' });
  const auth = getAuth();
  const db = getFirestore();
  db.settings({ ignoreUndefinedProperties: true });
  const ts = now();

  for (const a of Object.values(ACCOUNTS)) {
    await auth.createUser({ uid: a.uid, email: a.email, password: PASSWORD, displayName: a.name, emailVerified: true, ...(a.phone ? { phoneNumber: a.phone } : {}) }).catch((e) => { if (e.code !== 'auth/uid-already-exists') throw e; });
  }
  await auth.setCustomUserClaims(ACCOUNTS.admin.uid, { role: 'super_admin' });
  await auth.setCustomUserClaims(ACCOUNTS.biocartVendor.uid, { role: 'vendor' });
  await auth.setCustomUserClaims(ACCOUNTS.farmsVendor.uid, { role: 'vendor' });

  const b = db.batch();
  const user = (a, extra) => b.set(db.doc(`users/${a.uid}`), { uid: a.uid, email: a.email, name: a.name, displayName: a.name, status: 'active', isTest: true, createdAt: ts, updatedAt: ts, ...extra });
  user(ACCOUNTS.admin, { role: 'super_admin' });
  user(ACCOUNTS.biocartVendor, { role: 'vendor', vendorId: 'biocart' });
  user(ACCOUNTS.farmsVendor, { role: 'vendor', vendorId: ACCOUNTS.farmsVendor.uid });
  user(ACCOUNTS.customer, { role: 'customer', phone: '9876500001', phoneNumber: '+919876500001' });

  const vendor = (id, ownerUid, name, ratePercent, extra) => {
    b.set(db.doc(`vendors/${id}`), {
      id, ownerUid, storeName: name, businessName: name, ownerName: name + ' Owner', email: `${id}@biocart.test`, phone: '9876500010',
      description: 'Test vendor for automated checks', status: 'active', approvalStatus: 'approved',
      commissionRate: ratePercent, commission: { baseRateBps: ratePercent * 100 },
      legal: { businessType: 'proprietorship', gstin: '', udyam: 'UDYAM-AP-23-0104910', pan: '' },
      addresses: {
        sameAsRegistered: true,
        registeredAddress: { addressLine1: '21-4-28, Shiv Jyoti Nagar, Korlagunta', addressLine2: '', landmark: '', city: 'Tirupati', state: 'Andhra Pradesh', pinCode: '517501', country: 'India' },
        pickupAddress: { addressLine1: '21-4-28, Shiv Jyoti Nagar, Korlagunta', addressLine2: '', landmark: '', city: 'Tirupati', state: 'Andhra Pradesh', pinCode: '517501', country: 'India', contactPerson: name, contactPhone: '9876500010' },
      },
      ekartPickupAlias: `TEST_${id}`, ekartPickupRegisteredAt: ts,
      isTest: true, createdAt: ts, updatedAt: ts, ...extra,
    });
    b.set(db.doc(`vendor_wallets/${id}`), { vendorId: id, ownerUid, pending: 0, pendingBalance: 0, available: 0, availableBalance: 0, settling: 0, paidOut: 0, lifetimeGross: 0, lifetimeCommission: 0, isTest: true, createdAt: ts, updatedAt: ts });
  };
  vendor('biocart', ACCOUNTS.biocartVendor.uid, 'Biocart', 20);
  vendor(ACCOUNTS.farmsVendor.uid, ACCOUNTS.farmsVendor.uid, 'Test Farms', 15);

  const product = (id, name, price, vendorId, vendorName, category, color, extra = {}) => {
    b.set(db.doc(`products/${id}`), {
      id, sku: id.toUpperCase(), name, price, mrp: Math.round(price * 1.2), category, vendorId, vendorName,
      image: IMG(name.split(' ').slice(0, 2).join(' '), color), images: [IMG(name.split(' ').slice(0, 2).join(' '), color)],
      description: `${name} — test product used by the automated checks.`, shortDescription: `${name} (test)`,
      features: ['Certified organic', 'Test item'], benefits: ['For automated checks'], usageInstructions: ['Not for sale'],
      weightVariants: [], rating: 4.5, reviewsCount: 12, stockStatus: 'In Stock', inStock: true,
      active: true, status: 'active', approvalStatus: 'approved', homepageVisible: true, shopVisible: true, isFeatured: true, isBestSeller: true,
      codAllowed: false, hsnCode: '310100', isTest: true, createdAt: ts, updatedAt: ts, ...extra,
    });
    b.set(db.doc(`inventory/${id}`), { productId: id, vendorId, availableQuantity: 50, quantity: 50, reservedQuantity: 0, isTest: true, updatedAt: ts });
  };
  const F = ACCOUNTS.farmsVendor.uid;
  // Biocart (20% commission)
  product('test-millet-1450', 'Rule Eight Organic Millet', 1000, 'biocart', 'Biocart', 'Organic Food', '#004643', { weightGrams: 1450, lengthCm: 20, widthCm: 15, heightCm: 10 });
  product('test-neem-oil', 'Cold Pressed Neem Oil', 299, 'biocart', 'Biocart', 'Plant Care', '#0b6b5d', { weightGrams: 500, lengthCm: 8, widthCm: 8, heightCm: 20 });
  product('test-grow-bags', 'Jute Grow Bags Set', 499, 'biocart', 'Biocart', 'Garden Accessories', '#5c4a1f'); // deliberately NO weight and NO size
  // Test Farms (15% commission)
  product('test-honey', 'Wild Forest Honey', 650, F, 'Test Farms', 'Organic Food', '#a8650b', { weightGrams: 750, lengthCm: 10, widthCm: 10, heightCm: 12 });
  product('test-compost', 'Vermicompost Bulk Bag', 900, F, 'Test Farms', 'Plant Care', '#3b2a1a', { weightGrams: 5000, lengthCm: 40, widthCm: 30, heightCm: 15 });
  product('test-ghee', 'A2 Cow Ghee', 1800, F, 'Test Farms', 'Organic Food', '#b58a00', { weightGrams: 950, lengthCm: 10, widthCm: 10, heightCm: 12, codAllowed: true });

  for (const [id, name] of [['organic-food', 'Organic Food'], ['plant-care', 'Plant Care'], ['garden-accessories', 'Garden Accessories']]) {
    b.set(db.doc(`categories/${id}`), { id, name, slug: id, active: true, status: 'active', isTest: true, createdAt: ts });
  }

  b.set(db.doc('addresses/test-customer-home'), {
    id: 'test-customer-home', userId: ACCOUNTS.customer.uid, addressType: 'shipping', name: 'Test Customer', phone: '9876500001',
    street: '12 Main Road, Brodipet', city: 'Guntur', state: 'Andhra Pradesh', postalCode: '522001', country: 'India', isDefault: true, isTest: true, createdAt: ts, updatedAt: ts,
  });

  b.set(db.doc('settings/financialPolicy'), { policyVersion: 'test-seed', shippingFeePaise: 9900, freeShippingThresholdPaise: 149900, freeShippingEnabled: true, codEnabled: false, codMinOrderPaise: 0, codMaxOrderPaise: 500000, payoutHoldDaysAfterDelivery: 0, reservationMinutes: 20, isTest: true });
  b.set(db.doc('settings/courierRates'), { carrier: 'ekart', upTo2kg: 90, additionalPerKg: 35, codFixed: 0, codPercent: 0, fuelPercent: 0, gstPercent: 18, volumetricDivisor: 5, rtoUpTo2kg: 0, rtoAdditionalKg: 0, packagingAllowanceGrams: 50, isTest: true });
  await b.commit();
  return { PASSWORD, ACCOUNTS };
}

module.exports = { seed, PASSWORD, ACCOUNTS };
if (require.main === module) seed().then(() => { console.log('Emulators seeded: 1 admin, 2 vendors (Biocart 20%, Test Farms 15%), 6 products, 1 customer (PIN 522001), settings.'); process.exit(0); }).catch((e) => { console.error(e); process.exit(1); });
