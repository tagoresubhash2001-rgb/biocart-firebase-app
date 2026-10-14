const fs = require('fs');

let service = fs.readFileSync('src/services/AdminService.ts', 'utf8');

// Ensure all mocks are imported
service = service.replace(/import { MOCK_PRODUCTS } from '\.\.\/data\/mockData';/g, "import { MOCK_PRODUCTS, MOCK_CATEGORIES, MOCK_BANNERS, MOCK_VENDORS, MOCK_REVIEWS, MOCK_TESTIMONIALS } from '../data/mockData';");

// Patch products
service = service.replace(
  /return onSnapshot\(q, \(snapshot\) => \{\s+const products: Product\[\] = \[\];\s+snapshot\.forEach\(\(docSnap\) => \{\s+const data = docSnap\.data\(\);\s+products\.push\(\{ id: docSnap\.id, \.\.\.data \} as Product\);\s+\}\);\s+callback\(products\);\s+\}\);/,
  `return onSnapshot(q, (snapshot) => {
      const products: Product[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        products.push({ id: docSnap.id, ...data } as Product);
      });
      callback(products);
    }, (error) => {
      console.error('Firebase Error (Products):', error.message);
      if (error.message.includes('not found') || error.message.includes('permission')) {
        console.warn('Falling back to MOCK_PRODUCTS');
        callback(MOCK_PRODUCTS as Product[]);
      }
    });`
);

// Patch categories
service = service.replace(
  /return onSnapshot\(categoriesRef, \(snapshot\) => \{\s+const list: CategoryItem\[\] = \[\];\s+snapshot\.forEach\(\(docSnap\) => \{\s+const d = docSnap\.data\(\);\s+list\.push\(\{ id: docSnap\.id, \.\.\.d \} as CategoryItem\);\s+\}\);\s+callback\(list\);\s+\}\);/,
  `return onSnapshot(categoriesRef, (snapshot) => {
      const list: CategoryItem[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({ id: docSnap.id, ...d } as CategoryItem);
      });
      callback(list);
    }, (error) => {
      console.error('Firebase Error (Categories):', error.message);
      if (error.message.includes('not found') || error.message.includes('permission')) {
        console.warn('Falling back to MOCK_CATEGORIES');
        callback(MOCK_CATEGORIES as CategoryItem[]);
      }
    });`
);

// Patch banners
service = service.replace(
  /return onSnapshot\(ref, \(snapshot\) => \{\s+const list: BannerItem\[\] = \[\];\s+snapshot\.forEach\(\(docSnap\) => \{\s+const d = docSnap\.data\(\);\s+list\.push\(\{ id: docSnap\.id, \.\.\.d \} as BannerItem\);\s+\}\);\s+callback\(list\.sort\(\(a, b\) => \(a\.sequence \|\| 0\) - \(b\.sequence \|\| 0\)\)\);\s+\}\);/,
  `return onSnapshot(ref, (snapshot) => {
      const list: BannerItem[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({ id: docSnap.id, ...d } as BannerItem);
      });
      callback(list.sort((a, b) => (a.sequence || 0) - (b.sequence || 0)));
    }, (error) => {
      console.error('Firebase Error (Banners):', error.message);
      if (error.message.includes('not found') || error.message.includes('permission')) {
        console.warn('Falling back to MOCK_BANNERS');
        callback(MOCK_BANNERS as BannerItem[]);
      }
    });`
);

// Patch vendors
service = service.replace(
  /return onSnapshot\(ref, \(snapshot\) => \{\s+const list: VendorItem\[\] = \[\];\s+snapshot\.forEach\(\(docSnap\) => \{\s+const d = docSnap\.data\(\);\s+list\.push\(\{ id: docSnap\.id, \.\.\.d \} as VendorItem\);\s+\}\);\s+callback\(list\);\s+\}\);/,
  `return onSnapshot(ref, (snapshot) => {
      const list: VendorItem[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({ id: docSnap.id, ...d } as VendorItem);
      });
      callback(list);
    }, (error) => {
      console.error('Firebase Error (Vendors):', error.message);
      if (error.message.includes('not found') || error.message.includes('permission')) {
        console.warn('Falling back to MOCK_VENDORS');
        callback(MOCK_VENDORS as any[]);
      }
    });`
);

// Patch reviews
service = service.replace(
  /return onSnapshot\(ref, \(snapshot\) => \{\s+const list: Review\[\] = \[\];\s+snapshot\.forEach\(\(docSnap\) => \{\s+const d = docSnap\.data\(\);\s+list\.push\(\{ id: docSnap\.id, \.\.\.d \} as Review\);\s+\}\);\s+callback\(list\);\s+\}\);/,
  `return onSnapshot(ref, (snapshot) => {
      const list: Review[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({ id: docSnap.id, ...d } as Review);
      });
      callback(list);
    }, (error) => {
      console.error('Firebase Error (Reviews):', error.message);
      if (error.message.includes('not found') || error.message.includes('permission')) {
        console.warn('Falling back to MOCK_REVIEWS');
        callback(MOCK_REVIEWS as any[]);
      }
    });`
);

// Patch testimonials
service = service.replace(
  /return onSnapshot\(ref, \(snapshot\) => \{\s+const list: any\[\] = \[\];\s+snapshot\.forEach\(\(docSnap\) => \{\s+list\.push\(\{ id: docSnap\.id, \.\.\.docSnap\.data\(\) \}\);\s+\}\);\s+callback\(list\);\s+\}\);/,
  `return onSnapshot(ref, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      callback(list);
    }, (error) => {
      console.error('Firebase Error (Testimonials):', error.message);
      if (error.message.includes('not found') || error.message.includes('permission')) {
        console.warn('Falling back to MOCK_TESTIMONIALS');
        callback(MOCK_TESTIMONIALS as any[]);
      }
    });`
);

// Wrap seed function in try/catch to gracefully handle db not found
service = service.replace(
  /static async seedInitialCatalogIfEmpty\(\) \{/,
  `static async seedInitialCatalogIfEmpty() {
    try {`
);
service = service.replace(
  /console\.log\('Initial BioCart catalog successfully seeded to Firestore\.'\);\s+/,
  `console.log('Initial BioCart catalog successfully seeded to Firestore.');
    } catch (e: any) {
      console.error('Seed skipped (Firestore unavailable):', e.message);
    }`
);

fs.writeFileSync('src/services/AdminService.ts', service);
console.log('Patched AdminService fallback logic');

