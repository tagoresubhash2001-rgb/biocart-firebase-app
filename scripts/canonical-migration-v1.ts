import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as fs from 'fs';

initializeApp();
const db = getFirestore();

const IS_DRY_RUN = process.argv.includes('--dry-run');
const MIGRATION_VERSION = 'biocart-canonical-migration-v1';

async function migrate() {
  console.log(`Starting ${MIGRATION_VERSION} (Dry Run: ${IS_DRY_RUN})...`);
  
  const report = {
    recordsScanned: 0,
    recordsChanged: 0,
    recordsSkipped: 0,
    recordsAlreadyCanonical: 0,
    recordsFailed: 0,
    recordsRequiringManualReview: 0,
    details: [] as any[]
  };

  const addReport = (type: string, collection: string, id: string, oldVal: any, newVal: any, reason: string) => {
    report.details.push({ collection, documentId: id, oldField_Value: oldVal, newField_Value: newVal, reason, timestamp: new Date().toISOString(), migrationVersion: MIGRATION_VERSION });
  };

  // 1. PRODUCTS MIGRATION (vendorId, inventory creation)
  const products = await db.collection('products').get();
  for (const doc of products.docs) {
    report.recordsScanned++;
    const data = doc.data();
    let updates: any = {};
    let needsUpdate = false;
    
    if (data.vendorId === 'vendor-biocart-official') {
      updates.vendorId = 'biocart';
      needsUpdate = true;
      addReport('change', 'products', doc.id, {vendorId: 'vendor-biocart-official'}, {vendorId: 'biocart'}, 'Approved vendor ID mapping');
    }

    if (data.customerId) {
      if (!data.userId) {
        updates.userId = data.customerId;
        needsUpdate = true;
        addReport('change', 'products', doc.id, {customerId: data.customerId}, {userId: data.customerId}, 'Approved customerId to userId mapping');
      } else if (data.customerId !== data.userId) {
        report.recordsRequiringManualReview++;
        addReport('conflict', 'products', doc.id, {customerId: data.customerId, userId: data.userId}, null, 'customerId and userId disagree');
        needsUpdate = false;
        continue;
      }
    }

    if (needsUpdate && !IS_DRY_RUN) {
      await doc.ref.update(updates);
      report.recordsChanged++;
    } else if (needsUpdate) {
      report.recordsChanged++; // Count in dry run
    } else {
      report.recordsAlreadyCanonical++;
    }

    // Inventory Document Extraction (Rule D)
    if (data.stockQuantity !== undefined) {
      const invRef = db.collection('inventory').doc(doc.id);
      const invSnap = await invRef.get();
      if (!invSnap.exists) {
        const invData = {
          productId: doc.id,
          vendorId: updates.vendorId || data.vendorId || 'biocart',
          quantity: data.stockQuantity,
          availableQuantity: data.stockQuantity,
          reservedQuantity: 0,
          updatedAt: FieldValue.serverTimestamp()
        };
        addReport('change', 'inventory', doc.id, 'Missing', invData, 'Created canonical inventory from products.stockQuantity');
        if (!IS_DRY_RUN) {
          await invRef.set(invData);
        }
        report.recordsChanged++;
      }
    }
  }

  // 2. VENDORS MIGRATION (businessName, commissionPercent, status)
  const vendors = await db.collection('vendors').get();
  for (const doc of vendors.docs) {
    report.recordsScanned++;
    const data = doc.data();
    let updates: any = {};
    let needsUpdate = false;
    
    if (data.storeName !== undefined) {
      updates.businessName = data.storeName;
      needsUpdate = true;
      addReport('change', 'vendors', doc.id, {storeName: data.storeName}, {businessName: data.storeName}, 'Approved storeName mapping');
    }
    if (data.commissionRate !== undefined) {
      // Must verify it's a valid percentage logic
      let percent = typeof data.commissionRate === 'number' ? 
        (data.commissionRate <= 1 ? data.commissionRate * 100 : data.commissionRate) : parseFloat(data.commissionRate);
      updates.commissionPercent = percent;
      needsUpdate = true;
      addReport('change', 'vendors', doc.id, {commissionRate: data.commissionRate}, {commissionPercent: percent}, 'Approved commissionRate mapping');
    }
    if (data.approvalStatus !== undefined) {
      updates.status = data.approvalStatus;
      needsUpdate = true;
      addReport('change', 'vendors', doc.id, {approvalStatus: data.approvalStatus}, {status: data.approvalStatus}, 'Approved approvalStatus mapping');
    }

    if (needsUpdate && !IS_DRY_RUN) {
      await doc.ref.update(updates);
      report.recordsChanged++;
    } else if (needsUpdate) {
      report.recordsChanged++;
    } else {
      report.recordsAlreadyCanonical++;
    }
  }

  fs.writeFileSync('migration-report.json', JSON.stringify(report, null, 2));
  console.log(`Migration Complete. Report written to migration-report.json`);
}

migrate().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
