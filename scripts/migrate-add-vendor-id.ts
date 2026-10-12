import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp();
const db = getFirestore();

async function migrate() {
  console.log('Starting migration...');

  const superAdminUid = process.env.BIOCART_OWNER_UID;
if (!superAdminUid) {
  throw new Error('BIOCART_OWNER_UID is required.');
}
  await db.collection('vendors').doc('biocart').set({
    ownerUid: superAdminUid,
    businessName: 'Biocart',
    ownerName: 'Biocart Admin',
    email: 'admin@biocart.com',
    phone: '',
    commissionPercent: 0,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'system',
    updatedBy: 'system',
    isDeleted: false,
    version: 1
  });
  console.log('Created vendors/biocart');

  await db.collection('vendor_wallets').doc('biocart').set({
    vendorId: 'biocart',
    availableBalance: 0,
    lifetimeGross: 0,
    lifetimeCommission: 0,
    lifetimeSettled: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'system',
    updatedBy: 'system',
    isDeleted: false,
    version: 1
  });
  console.log('Created vendor_wallets/biocart');

  const products = await db.collection('products').get();
  const productBatch = db.batch();
  let pCount = 0;
  for (const doc of products.docs) {
    if (!doc.data().vendorId) {
      productBatch.update(doc.ref, { vendorId: 'biocart', updatedAt: new Date().toISOString() });
      pCount++;
    }
  }
  if (pCount > 0) await productBatch.commit();
  console.log(`Updated ${pCount} products with vendorId = biocart`);

  const inventory = await db.collection('inventory').get();
  const invBatch = db.batch();
  let iCount = 0;
  for (const doc of inventory.docs) {
    if (!doc.data().vendorId) {
      invBatch.update(doc.ref, { vendorId: 'biocart', updatedAt: new Date().toISOString() });
      iCount++;
    }
  }
  if (iCount > 0) await invBatch.commit();
  console.log(`Updated ${iCount} inventory records with vendorId = biocart`);

  console.log('Migration complete.');
}

migrate().catch(console.error);
