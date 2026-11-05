import {  
  collection,
  writeBatch, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  limit
, where } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, app, auth } from '../config/firebase';
const storage = getStorage(app);


import { Product, CategoryItem, BannerItem, VendorItem, Review, StoreSettings, AuditLog, AgentEntity, VendorProductAssignment } from '../types';
import { SEED_PRODUCTS } from '../data/seedData';
import { MASTER_CATEGORIES } from '../data/categoryCatalog';

// Default Centralized BioCart Settings
export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  businessName: 'BioCart Sustainable Marketplace',
    storeName: 'BioCart',
    address: 'Tirupati, Andhra Pradesh – 517507, India',
  contactEmail: 'biocart.2025@gmail.com',
  contactPhone: '+91 9494080479',
    socialLinks: {
    facebook: 'https://facebook.com/biocart',
    instagram: 'https://www.instagram.com/bio_cart/?hl=en',
    twitter: 'https://twitter.com/biocart',
    youtube: 'https://youtube.com/biocart',
    linkedin: 'https://linkedin.com/company/biocart'
  },
  currency: '₹',
  freeShippingThreshold: 499,
  defaultCommission: 10,
  maintenanceMode: false,
  promotionalRibbon: {
    enabled: true,
    text: '🌱 Spring Bio-Harvest Sale: Get 25% Off Premium Vermicompost & Bio-Fertilizers!',
    ctaText: 'Shop Bio-Deals',
    ctaLink: '#shop'
  },
  financialPolicy: {
    commissionBasis: 'net_after_gateway_fee',
    gatewayFeeRateBps: 200, // 2.0% Razorpay / Payment Gateway fee
    gatewayFeeFlatPaise: 0,
    gatewayFeeTaxRateBps: 1800, // 18% GST on Gateway fee
    commissionGstRateBps: 1800, // 18% GST on Commission
    couponFunding: 'platform',
    settlementDayOfWeek: 2, // Tuesday
    payoutHoldPeriodDays: 3,
    minimumPayoutPaise: 50000 // Rs. 500
  },
  orderThresholds: {
    minOrderValue: 199,
    freeShippingThreshold: 499,
    codMinValue: 299,
    codMaxValue: 5000,
    codAvailable: true
  }
};

export class AdminService {
  // ==========================================
  // REAL-TIME SUBSCRIPTIONS
  // ==========================================

  // --- Products ---
  static subscribeToProducts(
    callback: (products: Product[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    const productsRef = collection(db, 'products');
    const q = query(productsRef);

    const unsub = onSnapshot(q, (snapshot) => {
      const products: Product[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        products.push({
          id: docSnap.id,
          name: data.name || '',
          category: data.category || 'Organic Fertilizers',
          categoryId: data.categoryId || '',
          vendorId: data.vendorId || 'biocart',
          vendorName: data.vendorName || 'BioCart Direct',
          price: Number(data.price) || 0,
          mrp: Number(data.mrp) || Number(data.price) || 0,
          discount: Number(data.discount) || 0,
          sku: data.sku || docSnap.id,
          rating: Number(data.rating) || 4.8,
          reviewsCount: Number(data.reviewsCount) || 0,
          image: data.image || '',
          images: Array.isArray(data.images) && data.images.length > 0 ? data.images : (data.image ? [data.image] : []),
          description: data.description || '',
          shortDescription: data.shortDescription || '',
          features: Array.isArray(data.features) ? data.features : [],
          benefits: Array.isArray(data.benefits) ? data.benefits : [],
          usageInstructions: Array.isArray(data.usageInstructions) ? data.usageInstructions : [],
          ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
          weightVariants: Array.isArray(data.weightVariants) && data.weightVariants.length > 0 ? data.weightVariants : ['1kg'],
          selectedVariant: data.selectedVariant || '',
          stockStatus: data.stockStatus || (data.inStock !== false ? 'In Stock' : 'Out of Stock'),
          inStock: data.inStock !== false,
          stockQuantity: typeof data.stockQuantity === 'number' ? data.stockQuantity : (Number(data.stock) || 0),
          badge: data.badge || '',
          materials: data.materials || '',
          dimensions: data.dimensions || '',
          faqs: Array.isArray(data.faqs) ? data.faqs : [],
          reviews: Array.isArray(data.reviews) ? data.reviews : [],
          isFeatured: data.isFeatured !== false,
          isBestSeller: !!data.isBestSeller,
          isNewArrival: !!data.isNewArrival,
          isSponsored: !!data.isSponsored,
          homepageVisible: data.homepageVisible !== false,
          shopVisible: data.shopVisible !== false,
          active: data.active !== false,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString()
        });
      });
      callback(products);
    }, (error) => {
      console.error('Products subscription error:', error);
      if (onError) {
        onError(error);
      } else {
        callback([]);
      }
    });
    return unsub;
  }

  /**
   * Fetches a single product by document ID or SKU.
   */
  static async getProductById(productId: string): Promise<Product | null> {
    try {
      const docRef = doc(db, 'products', productId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name || '',
          category: data.category || 'Organic Fertilizers',
          categoryId: data.categoryId || '',
          vendorId: data.vendorId || 'biocart',
          vendorName: data.vendorName || 'BioCart Direct',
          price: Number(data.price) || 0,
          mrp: Number(data.mrp) || Number(data.price) || 0,
          discount: Number(data.discount) || 0,
          sku: data.sku || docSnap.id,
          rating: Number(data.rating) || 4.8,
          reviewsCount: Number(data.reviewsCount) || 0,
          image: data.image || '',
          images: Array.isArray(data.images) && data.images.length > 0 ? data.images : (data.image ? [data.image] : []),
          description: data.description || '',
          shortDescription: data.shortDescription || '',
          features: Array.isArray(data.features) ? data.features : [],
          benefits: Array.isArray(data.benefits) ? data.benefits : [],
          usageInstructions: Array.isArray(data.usageInstructions) ? data.usageInstructions : [],
          ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
          weightVariants: Array.isArray(data.weightVariants) && data.weightVariants.length > 0 ? data.weightVariants : ['1kg'],
          selectedVariant: data.selectedVariant || '',
          stockStatus: data.stockStatus || (data.inStock !== false ? 'In Stock' : 'Out of Stock'),
          inStock: data.inStock !== false,
          stockQuantity: typeof data.stockQuantity === 'number' ? data.stockQuantity : (Number(data.stock) || 0),
          badge: data.badge || '',
          materials: data.materials || '',
          dimensions: data.dimensions || '',
          faqs: Array.isArray(data.faqs) ? data.faqs : [],
          reviews: Array.isArray(data.reviews) ? data.reviews : [],
          isFeatured: data.isFeatured !== false,
          isBestSeller: !!data.isBestSeller,
          isNewArrival: !!data.isNewArrival,
          isSponsored: !!data.isSponsored,
          homepageVisible: data.homepageVisible !== false,
          shopVisible: data.shopVisible !== false,
          active: data.active !== false,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString()
        };
      }

      // Check if matches SKU via query
      const q = query(collection(db, 'products'), where('sku', '==', productId), limit(1));
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        const foundDoc = querySnap.docs[0];
        const data = foundDoc.data();
        return {
          id: foundDoc.id,
          name: data.name || '',
          category: data.category || 'Organic Fertilizers',
          categoryId: data.categoryId || '',
          vendorId: data.vendorId || 'biocart',
          vendorName: data.vendorName || 'BioCart Direct',
          price: Number(data.price) || 0,
          mrp: Number(data.mrp) || Number(data.price) || 0,
          discount: Number(data.discount) || 0,
          sku: data.sku || foundDoc.id,
          rating: Number(data.rating) || 4.8,
          reviewsCount: Number(data.reviewsCount) || 0,
          image: data.image || '',
          images: Array.isArray(data.images) && data.images.length > 0 ? data.images : (data.image ? [data.image] : []),
          description: data.description || '',
          shortDescription: data.shortDescription || '',
          features: Array.isArray(data.features) ? data.features : [],
          benefits: Array.isArray(data.benefits) ? data.benefits : [],
          usageInstructions: Array.isArray(data.usageInstructions) ? data.usageInstructions : [],
          ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
          weightVariants: Array.isArray(data.weightVariants) && data.weightVariants.length > 0 ? data.weightVariants : ['1kg'],
          selectedVariant: data.selectedVariant || '',
          stockStatus: data.stockStatus || (data.inStock !== false ? 'In Stock' : 'Out of Stock'),
          inStock: data.inStock !== false,
          stockQuantity: typeof data.stockQuantity === 'number' ? data.stockQuantity : (Number(data.stock) || 0),
          badge: data.badge || '',
          materials: data.materials || '',
          dimensions: data.dimensions || '',
          faqs: Array.isArray(data.faqs) ? data.faqs : [],
          reviews: Array.isArray(data.reviews) ? data.reviews : [],
          isFeatured: data.isFeatured !== false,
          isBestSeller: !!data.isBestSeller,
          isNewArrival: !!data.isNewArrival,
          isSponsored: !!data.isSponsored,
          homepageVisible: data.homepageVisible !== false,
          shopVisible: data.shopVisible !== false,
          active: data.active !== false,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString()
        };
      }

      return null;
    } catch (err) {
      console.error('Error fetching product by ID:', err);
      return null;
    }
  }

  // --- FAQs ---
  static subscribeToFAQs(callback: (faqs: any[]) => void): () => void {
    const q = query(collection(db, 'faqs'), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => { console.error('FAQ subscription error:', error); callback([]); });
    return unsub;
  }

  static subscribeToCategories(
    callback: (categories: CategoryItem[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    const categoriesRef = collection(db, 'categories');
    const unsub = onSnapshot(
      categoriesRef,
      (snapshot) => {
        const list: CategoryItem[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({
            id: docSnap.id,
            name: d.name || '',
            slug: d.slug || d.name?.toLowerCase().replace(/\s+/g, '-') || '',
            description: d.description || '',
            image: d.image || '',
            displayOrder: Number(d.displayOrder) || 0,
            isFeatured: d.isFeatured !== false,
            active: d.active !== false,
            parentId: d.parentId || null,
            aliases: Array.isArray(d.aliases) ? d.aliases : [],
            productCount: typeof d.productCount === 'number' ? d.productCount : undefined,
            createdAt: d.createdAt || new Date().toISOString(),
            updatedAt: d.updatedAt || new Date().toISOString()
          });
        });
        list.sort((a, b) => a.displayOrder - b.displayOrder);
        callback(list);
      },
      (err) => {
        console.error('Categories subscription error:', err);
        if (onError) {
          onError(err);
        } else {
          callback([]);
        }
      }
    );
    return unsub;
  }

  static subscribeToBanners(callback: (banners: BannerItem[]) => void): () => void {
    const ref = collection(db, 'banners');
    return onSnapshot(ref, (snapshot) => {
      const list: BannerItem[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
          title: d.title || '',
          subtitle: d.subtitle || '',
          imageUrl: d.imageUrl || '',
          mobileImageUrl: d.mobileImageUrl || '',
          linkUrl: d.linkUrl || '#shop',
          sequence: Number(d.sequence) || 0,
          bannerType: d.bannerType || 'hero',
          active: d.active !== false,
          promotionalLabel: d.promotionalLabel || '',
          ribbonText: d.ribbonText || '',
          ctaText: d.ctaText || 'Explore Now',
          createdAt: d.createdAt || new Date().toISOString(),
          updatedAt: d.updatedAt || new Date().toISOString()
        });
      });
      list.sort((a, b) => a.sequence - b.sequence);
      callback(list);
    }, (err) => { console.error('Banners subscription error:', err); callback([]); });
  }

  static subscribeToVendors(callback: (vendors: VendorItem[]) => void): () => void {
    const ref = collection(db, 'vendors');
    return onSnapshot(ref, (snapshot) => {
      const list: VendorItem[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
            ownerUid: d.ownerUid || 'system',
            storeName: d.storeName || '',
            ownerName: d.ownerName || '',
            email: d.email || '',
            phone: d.phone || '',
            logo: d.logo || '',
            description: d.description || '',
            website: d.website || '',
            legal: d.legal || {},
            addresses: d.addresses || {},
            settlement: d.settlement || {},
            status: d.status === 'pending' || d.status === 'suspended' ? d.status : 'active',
            commission: d.commission || { baseRateBps: Math.round(Number(d.commissionRate ?? d.commissionPercent ?? 10) * 100) },
            createdAt: d.createdAt || new Date().toISOString(),
            updatedAt: d.updatedAt || new Date().toISOString()
        });
      });
      callback(list);
    }, (err) => { console.error('Vendors subscription error:', err); callback([]); });
  }

  static subscribeToReviews(callback: (reviews: Review[]) => void): () => void {
    const ref = collection(db, 'reviews');
    return onSnapshot(ref, (snapshot) => {
      const list: Review[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
          productId: d.productId || '',
          productName: d.productName || '',
          user: d.user || 'Anonymous Customer',
          userEmail: d.userEmail || '',
          rating: Number(d.rating) || 5,
          date: d.date || new Date().toISOString().split('T')[0],
          comment: d.comment || '',
          avatar: d.avatar || '',
          status: d.status || 'active'
        });
      });
      callback(list);
    }, (err) => { console.error('Reviews subscription error:', err); callback([]); });
  }

  static subscribeToTestimonials(callback: (testimonials: any[]) => void): () => void {
    const ref = collection(db, 'testimonials');
    return onSnapshot(ref, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      callback(list);
    }, (err) => { console.error('Testimonials subscription error:', err); callback([]); });
  }

  static subscribeToSettings(callback: (settings: StoreSettings) => void): () => void {
    const docRef = doc(db, 'settings', 'general');
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const d = snapshot.data() as StoreSettings;
        callback({
          ...DEFAULT_STORE_SETTINGS,
          ...d,
          promotionalRibbon: {
            ...DEFAULT_STORE_SETTINGS.promotionalRibbon,
            ...(d.promotionalRibbon || {})
          },
          socialLinks: {
            ...DEFAULT_STORE_SETTINGS.socialLinks,
            ...(d.socialLinks || {})
          },
          financialPolicy: {
            ...DEFAULT_STORE_SETTINGS.financialPolicy!,
            ...(d.financialPolicy || {})
          }
        });
      } else {
        callback(DEFAULT_STORE_SETTINGS);
      }
    }, (err) => { console.error('Settings subscription error:', err); callback(DEFAULT_STORE_SETTINGS); });
  }

  static subscribeToAuditLogs(callback: (logs: AuditLog[]) => void): () => void {
    const ref = collection(db, 'audit_logs');
    return onSnapshot(ref, (snapshot) => {
      const list: AuditLog[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
          actorId: d.actorId || 'system',
          actorEmail: d.actorEmail || 'system@biocart.in',
          action: d.action || '',
          entityType: d.entityType || 'product',
          entityId: d.entityId || '',
          timestamp: d.timestamp || new Date().toISOString(),
          details: d.details || {}
        });
      });
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      callback(list);
    }, (err) => { console.error('Audit logs subscription error:', err); callback([]); });
  }

  static subscribeToUsers(callback: (users: any[]) => void): () => void {
    const ref = collection(db, 'users');
    return onSnapshot(ref, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      callback(list);
    }, (err) => { console.error('Users subscription error:', err); callback([]); });
  }

  static subscribeToOrders(callback: (orders: any[]) => void): () => void {
    const ref = collection(db, 'orders');
    return onSnapshot(ref, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      list.sort((a, b) => {
        const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });
      callback(list);
    }, (err) => { console.error('Orders subscription error:', err); callback([]); });
  }

  static subscribeToVendorWallets(callback: (wallets: any[]) => void): () => void {
    const ref = collection(db, 'vendor_wallets');
    return onSnapshot(ref, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      callback(list);
    }, (err) => { console.error('Vendor wallets subscription error:', err); callback([]); });
  }

  // ==========================================
  // AUDIT LOGGING HELPER
  // ==========================================

  static resolveActor(passedActor?: { id?: string; email?: string }): { id: string; email: string } {
    const currentUser = auth.currentUser;
    const actorId = currentUser?.uid || passedActor?.id || 'system';
    const actorEmail = currentUser?.email || passedActor?.email || 'authenticated-admin@biocart.in';
    return { id: actorId, email: actorEmail };
  }

  static async logAuditAction(
    actorId: string,
    actorEmail: string,
    action: string,
    entityType: AuditLog['entityType'],
    entityId: string,
    details: Record<string, any> = {}
  ): Promise<void> {
    try {
      const resolved = this.resolveActor({ id: actorId, email: actorEmail });
      const logRef = doc(collection(db, 'audit_logs'));
      await setDoc(logRef, {
        actorId: resolved.id,
        actorEmail: resolved.email,
        action,
        entityType,
        entityId,
        timestamp: new Date().toISOString(),
        details
      });
    } catch (err) {
      console.error('Failed to log audit action:', err);
    }
  }

  // ==========================================
  // PRODUCT CRUD OPERATIONS
  // ==========================================

  static async saveProduct(product: Partial<Product>, actor?: { id: string; email: string }): Promise<string> {
    const activeActor = this.resolveActor(actor);
    const isNew = !product.id;
    const docId = product.id || `prod-${Date.now()}`;
    const productRef = doc(db, 'products', docId);

    const calcDiscount = product.mrp && product.price && product.mrp > product.price
      ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
      : (product.discount || 0);

    const payload = {
      ...product,
      id: docId,
      name: product.name || 'Untitled Product',
      category: product.category || 'Organic Fertilizers',
      categoryId: product.categoryId || '',
      vendorId: product.vendorId || 'biocart',
      vendorName: product.vendorName || 'BioCart Direct',
      price: Number(product.price) || 0,
      mrp: Number(product.mrp) || Number(product.price) || 0,
      discount: calcDiscount,
      sku: product.sku || `BC-${Date.now()}`,
      rating: Number(product.rating) || 4.8,
      reviewsCount: Number(product.reviewsCount) || 0,
      image: product.image || '/assets/products/prod_vermicompost.png',
      images: Array.isArray(product.images) && product.images.length > 0 ? product.images : [product.image || '/assets/products/prod_vermicompost.png'],
        shortDescription: product.shortDescription || '',
      features: Array.isArray(product.features) ? product.features : [],
      benefits: Array.isArray(product.benefits) ? product.benefits : [],
      usageInstructions: Array.isArray(product.usageInstructions) ? product.usageInstructions : [],
      ingredients: Array.isArray(product.ingredients) ? product.ingredients : [],
      weightVariants: Array.isArray(product.weightVariants) && product.weightVariants.length > 0 ? product.weightVariants : ['1kg', '5kg'],
      selectedVariant: product.selectedVariant || '1kg',
      stockStatus: product.stockStatus || 'In Stock',
      inStock: product.inStock !== false,
      badge: product.badge || '',
      materials: product.materials || '',
      dimensions: product.dimensions || '',
      faqs: Array.isArray(product.faqs) ? product.faqs : [],
      reviews: Array.isArray(product.reviews) ? product.reviews : [],
      isFeatured: product.isFeatured ?? true,
      isBestSeller: product.isBestSeller ?? false,
      isNewArrival: product.isNewArrival ?? false,
      isSponsored: product.isSponsored ?? false,
      homepageVisible: product.homepageVisible !== false,
      shopVisible: product.shopVisible !== false,
      active: product.active !== false,
      stockQuantity: Number(product.stockQuantity) || 0,
      updatedAt: new Date().toISOString(),
      ...(isNew ? { createdAt: new Date().toISOString() } : {})
    };

    const batch = writeBatch(db);
    batch.set(productRef, payload, { merge: true });

    // Atomic sync to inventory/{docId}
    const invRef = doc(db, 'inventory', docId);
    batch.set(invRef, {
      id: docId,
      productId: docId,
      vendorId: payload.vendorId,
      quantity: payload.stockQuantity,
      availableQuantity: payload.stockQuantity,
      reservedQuantity: 0,
      inStock: payload.inStock,
      stockStatus: payload.stockStatus,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    await batch.commit();

    await this.logAuditAction(
      activeActor.id,
      activeActor.email,
      isNew ? `Created product "${payload.name}"` : `Updated product "${payload.name}"`,
      'product',
      docId,
      { price: payload.price, active: payload.active }
    );

    return docId;
  }

  static async deleteProduct(productId: string, actor?: { id: string; email: string }): Promise<void> {
    const activeActor = this.resolveActor(actor);
    const ref = doc(db, 'products', productId);
    await deleteDoc(ref);
    await this.logAuditAction(activeActor.id, activeActor.email, `Deleted product ${productId}`, 'product', productId);
  }

  // ==========================================
  // CATEGORY CRUD OPERATIONS
  // ==========================================

  static async saveCategory(category: Partial<CategoryItem>, actor?: { id: string; email: string }): Promise<string> {
    const activeActor = this.resolveActor(actor);
    const isNew = !category.id;
    const docId = category.id || `cat-${Date.now()}`;
    const ref = doc(db, 'categories', docId);

    const payload = {
      id: docId,
      name: category.name || 'New Category',
      slug: category.slug || category.name?.toLowerCase().replace(/\s+/g, '-') || 'new-category',
      description: category.description || '',
      image: category.image || '',
      displayOrder: Number(category.displayOrder) || 0,
      isFeatured: category.isFeatured !== false,
      active: category.active !== false,
      parentId: category.parentId !== undefined ? category.parentId : null,
      aliases: Array.isArray(category.aliases) ? category.aliases : [],
      updatedAt: new Date().toISOString(),
      ...(isNew ? { createdAt: new Date().toISOString() } : {})
    };

    await setDoc(ref, payload, { merge: true });
    await this.logAuditAction(
      activeActor.id,
      activeActor.email,
      isNew ? `Created category "${payload.name}"` : `Updated category "${payload.name}"`,
      'category',
      docId
    );
    return docId;
  }

  static async deleteCategory(categoryId: string, actor?: { id: string; email: string }): Promise<void> {
    const activeActor = this.resolveActor(actor);
    // 1. Guard against deleting categories with attached products
    const catDoc = await getDoc(doc(db, 'categories', categoryId));
    const catName = catDoc.exists() ? catDoc.data()?.name : null;

    const productsSnap = await getDocs(collection(db, 'products'));
    const attachedProducts: string[] = [];
    productsSnap.forEach((pDoc) => {
      const p = pDoc.data();
      if (p.categoryId === categoryId || (catName && p.category?.toLowerCase() === catName.toLowerCase())) {
        attachedProducts.push(p.name || pDoc.id);
      }
    });

    if (attachedProducts.length > 0) {
      throw new Error(
        `Cannot delete category "${catName || categoryId}". It currently has ${attachedProducts.length} attached product(s): ${attachedProducts.slice(0, 3).join(', ')}${attachedProducts.length > 3 ? '...' : ''}. Please reassign or delete these products first.`
      );
    }

    await deleteDoc(doc(db, 'categories', categoryId));
    await this.logAuditAction(activeActor.id, activeActor.email, `Deleted category ${categoryId}`, 'category', categoryId);
  }

  static async reconcileCategories(options: { dryRun?: boolean; actor?: { id: string; email: string } } = {}): Promise<{
    added: string[];
    updated: string[];
    preserved: string[];
    logs: string[];
  }> {
    const activeActor = this.resolveActor(options.actor);
    const { dryRun = false } = options;
    const logs: string[] = [];
    const added: string[] = [];
    const updated: string[] = [];
    const preserved: string[] = [];

    logs.push(`Starting category reconciliation (Dry Run: ${dryRun})...`);

    // Fetch existing categories
    const existingSnap = await getDocs(collection(db, 'categories'));
    const existingMap = new Map<string, any>();
    existingSnap.forEach((d) => existingMap.set(d.id, { id: d.id, ...d.data() }));
    logs.push(`Found ${existingMap.size} existing categories in Firestore.`);

    // Fetch existing products to calculate product counts
    const productsSnap = await getDocs(collection(db, 'products'));
    const prodCounts = new Map<string, number>();
    productsSnap.forEach((pDoc) => {
      const p = pDoc.data();
      const cat = p.category;
      if (cat) {
        prodCounts.set(cat.toLowerCase(), (prodCounts.get(cat.toLowerCase()) || 0) + 1);
      }
    });

    const batch = writeBatch(db);
    let writesCount = 0;

    for (const master of MASTER_CATEGORIES) {
      const existing = existingMap.get(master.id);
      if (!existing) {
        // Missing category: Add non-destructively
        added.push(master.name);
        logs.push(`[ADD] Category "${master.name}" (${master.id}) is missing. Adding to database.`);
        if (!dryRun) {
          const docRef = doc(db, 'categories', master.id);
          batch.set(docRef, {
            ...master,
            productCount: prodCounts.get(master.name.toLowerCase()) || 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }, { merge: true });
          writesCount++;
        }
      } else {
        // Existing category: Preserve all custom user edits, safely reconcile aliases and parentId
        preserved.push(existing.name || master.name);
        const needsUpdate = 
          !existing.aliases || 
          existing.aliases.length === 0 || 
          existing.parentId === undefined;

        if (needsUpdate) {
          updated.push(existing.name || master.name);
          logs.push(`[UPDATE] Reconciling metadata (aliases/parent) for category "${existing.name}".`);
          if (!dryRun) {
            const docRef = doc(db, 'categories', master.id);
            batch.set(docRef, {
              aliases: master.aliases,
              parentId: existing.parentId !== undefined ? existing.parentId : master.parentId,
              productCount: prodCounts.get((existing.name || master.name).toLowerCase()) || 0,
              updatedAt: new Date().toISOString()
            }, { merge: true });
            writesCount++;
          }
        } else {
          logs.push(`[PRESERVE] Category "${existing.name}" is intact and verified.`);
        }
      }
    }

    if (!dryRun && writesCount > 0) {
      await batch.commit();
      logs.push(`Committed ${writesCount} category updates to Firestore.`);
      await this.logAuditAction(
        activeActor.id,
        activeActor.email,
        `Reconciled categories catalog: ${added.length} added, ${updated.length} updated, ${preserved.length} preserved`,
        'category',
        'catalog-reconciliation',
        { added, updated, preserved }
      );
    }

    logs.push(`Reconciliation complete. Total Catalog: ${existingMap.size + (dryRun ? 0 : added.length)} categories.`);
    return { added, updated, preserved, logs };
  }

  // ==========================================
  // BANNER CRUD OPERATIONS
  // ==========================================

  static async saveBanner(banner: Partial<BannerItem>, actor?: { id: string; email: string }): Promise<string> {
    const activeActor = this.resolveActor(actor);
    const isNew = !banner.id;
    const docId = banner.id || `banner-${Date.now()}`;
    const ref = doc(db, 'banners', docId);

    const payload = {
      id: docId,
      title: banner.title || 'Special Promotion',
      subtitle: banner.subtitle || '',
      imageUrl: banner.imageUrl || '',
      mobileImageUrl: banner.mobileImageUrl || '',
      linkUrl: banner.linkUrl || '#shop',
      sequence: Number(banner.sequence) || 0,
      bannerType: banner.bannerType || 'hero',
      active: banner.active !== false,
      promotionalLabel: banner.promotionalLabel || '',
      ribbonText: banner.ribbonText || '',
      ctaText: banner.ctaText || 'Shop Now',
      updatedAt: new Date().toISOString(),
      ...(isNew ? { createdAt: new Date().toISOString() } : {})
    };

    await setDoc(ref, payload, { merge: true });
    await this.logAuditAction(
      activeActor.id,
      activeActor.email,
      isNew ? `Created banner "${payload.title}"` : `Updated banner "${payload.title}"`,
      'banner',
      docId
    );
    return docId;
  }

  static async deleteBanner(bannerId: string, actor?: { id: string; email: string }): Promise<void> {
    const activeActor = this.resolveActor(actor);
    await deleteDoc(doc(db, 'banners', bannerId));
    await this.logAuditAction(activeActor.id, activeActor.email, `Deleted banner ${bannerId}`, 'banner', bannerId);
  }

  // ==========================================
  // VENDOR CRUD OPERATIONS
  // ==========================================

  static async saveVendor(vendor: Partial<VendorItem>, actor?: { id: string; email: string }): Promise<string> {
    const activeActor = this.resolveActor(actor);
    const vendorsSnap = await getDocs(collection(db, 'vendors'));
    const isNew = !vendor.id;
    // Generate a stable ID based on business name if not provided
    const docId = vendor.id || (vendor.storeName ? vendor.storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-') : `vendor-${Date.now()}`);
    
    const cleanEmail = (vendor.email || '').trim().toLowerCase();
    const cleanStoreName = (vendor.storeName || '').trim();
    const cleanOwnerName = (vendor.ownerName || '').trim();
    const cleanPhone = (vendor.phone || '').trim();

    if (isNew) {
      let duplicateFound = false;
      vendorsSnap.forEach(docSnap => {
        const d = docSnap.data();
        if (d.id === docId || (d.email && d.email.toLowerCase() === cleanEmail) || (d.phone && d.phone === cleanPhone)) {
          duplicateFound = true;
        }
      });
      if (duplicateFound) {
        throw new Error('A vendor with this Email, Phone, or Name already exists.');
      }
    } else {
      // Check for duplicate email in another vendor record
      if (cleanEmail) {
        vendorsSnap.forEach(docSnap => {
          const d = docSnap.data();
          if (docSnap.id !== docId && d.email && d.email.toLowerCase() === cleanEmail) {
            throw new Error('Another vendor partner is already registered with this email.');
          }
        });
      }
    }
    const ref = doc(db, 'vendors', docId);

    const payload: Partial<VendorItem> = {
      id: docId,
      storeName: cleanStoreName || 'New Vendor Store',
      ownerName: cleanOwnerName || 'Store Owner',
      email: cleanEmail,
      phone: cleanPhone,
      logo: vendor.logo || '',
      description: vendor.description || '',
      website: vendor.website || '',
      legal: vendor.legal || {},
      addresses: vendor.addresses || {},
      settlement: vendor.settlement || {},
      status: vendor.status || 'active',
      commission: vendor.commission || { baseRateBps: 1000 },
      updatedAt: new Date().toISOString(),
      ...(isNew ? { createdAt: new Date().toISOString() } : {})
    };

    await setDoc(ref, payload, { merge: true });
    await this.logAuditAction(
      activeActor.id,
      activeActor.email,
      isNew ? `Created vendor "${payload.storeName}"` : `Updated vendor "${payload.storeName}"`,
      'vendor',
      docId,
      { storeName: payload.storeName, email: payload.email, commissionRate: payload.commission?.baseRateBps ? payload.commission.baseRateBps / 100 : 10 }
    );
    return docId;
  }

  static async updateVendorStatus(
    vendorId: string, 
    status: VendorItem['status'],
    actor?: { id: string; email: string }
  ): Promise<void> {
    const activeActor = this.resolveActor(actor);
    const ref = doc(db, 'vendors', vendorId);
    await updateDoc(ref, {
      status,
      updatedAt: new Date().toISOString()
    });
    await this.logAuditAction(
      activeActor.id,
      activeActor.email,
      `Updated vendor ${vendorId} status to ${status}/${status}`,
      'vendor',
      vendorId
    );
  }

  // ==========================================
  // REVIEWS MODERATION OPERATIONS
  // ==========================================

  static async updateReviewStatus(reviewId: string, status: Review['status'], actor?: { id: string; email: string }): Promise<void> {
    const activeActor = this.resolveActor(actor);
    const ref = doc(db, 'reviews', reviewId);
    await updateDoc(ref, { status });
    await this.logAuditAction(activeActor.id, activeActor.email, `Changed review ${reviewId} status to ${status}`, 'review', reviewId);
  }

  static async deleteReview(reviewId: string, actor?: { id: string; email: string }): Promise<void> {
    const activeActor = this.resolveActor(actor);
    await deleteDoc(doc(db, 'reviews', reviewId));
    await this.logAuditAction(activeActor.id, activeActor.email, `Deleted review ${reviewId}`, 'review', reviewId);
  }

  // ==========================================
  // SETTINGS MANAGEMENT
  // ==========================================

  static async updateStoreSettings(settings: Partial<StoreSettings>, actor?: { id: string; email: string }): Promise<void> {
    const activeActor = this.resolveActor(actor);
    const docRef = doc(db, 'settings', 'general');
    const updated = {
      ...settings,
      updatedAt: new Date().toISOString()
    };
    await setDoc(docRef, updated, { merge: true });
    await this.logAuditAction(activeActor.id, activeActor.email, 'Updated central store settings', 'settings', 'general', settings);
  }

  // ==========================================
  // IDEMPOTENT MOCK DATA SEEDING
  // ==========================================

  static async seedInitialCatalogIfEmpty(force: boolean = false): Promise<void> {
    try {
      // 1. Seed Products & Inventory if missing or empty
      const prodSnapshot = await getDocs(collection(db, 'products'));
      if (prodSnapshot.empty || force) {
        console.log('Seeding initial BioCart product catalog to Firestore...');
        const batch = writeBatch(db);

        SEED_PRODUCTS.forEach((prod) => {
          const docRef = doc(db, 'products', prod.id);
          const payload: Product = {
            ...prod,
            vendorId: 'biocart',
            vendorName: 'BioCart Direct',
            isFeatured: true,
            isBestSeller: prod.badge === 'Best Seller',
            isNewArrival: prod.badge === 'New Arrival',
            isSponsored: prod.badge === 'Sponsored' || prod.badge === 'Organic Choice',
            homepageVisible: true,
            shopVisible: true,
            active: true,
            stockQuantity: 150,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          batch.set(docRef, payload, { merge: true });
          batch.set(doc(db, 'inventory', prod.id), {
            productId: prod.id,
            vendorId: 'biocart',
            sku: prod.sku,
            quantity: 150,
            availableQuantity: 150,
            lowStockThreshold: 10,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        });

        await batch.commit();
        console.log(`Successfully seeded ${SEED_PRODUCTS.length} products to Firestore.`);
      }

      // 2. Seed Categories if empty
      const catSnapshot = await getDocs(collection(db, 'categories'));
      if (catSnapshot.empty) {
        console.log('Seeding initial BioCart master categories...');
        const catBatch = writeBatch(db);
        MASTER_CATEGORIES.forEach((cat) => {
          const docRef = doc(db, 'categories', cat.id);
          catBatch.set(docRef, { ...cat, updatedAt: new Date().toISOString() }, { merge: true });
        });
        await catBatch.commit();
        console.log(`Successfully seeded ${MASTER_CATEGORIES.length} master categories to Firestore.`);
      }

      // 3. Seed Banners if empty
      const bannerSnapshot = await getDocs(collection(db, 'banners'));
      if (bannerSnapshot.empty) {
        console.log('Seeding initial BioCart banners...');
        const banners: Partial<BannerItem>[] = [
          {
            id: 'banner-hero-1',
            title: '100% Certified Organic Farm Inputs',
            subtitle: 'Direct from BioCart Verified Sustainable Producers & Bio-Labs',
            imageUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19657?auto=format&fit=crop&w=1600&q=80',
            linkUrl: '#shop',
            sequence: 1,
            bannerType: 'hero',
            active: true,
            promotionalLabel: 'EARTH FIRST',
            ribbonText: 'UP TO 40% OFF',
            ctaText: 'Explore Bio-Catalog'
          },
          {
            id: 'banner-hero-2',
            title: 'Boost Soil Fertility Naturally',
            subtitle: 'Enrich root microbiomes with double-screened vermicompost & mycorrhizae',
            imageUrl: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&w=1600&q=80',
            linkUrl: '#shop',
            sequence: 2,
            bannerType: 'hero',
            active: true,
            promotionalLabel: 'MICROBIAL POWER',
            ribbonText: 'FREE SHIPPING OVER ₹499',
            ctaText: 'Shop Organic Inputs'
          }
        ];

        const bannerBatch = writeBatch(db);
        banners.forEach((b) => {
          const docRef = doc(db, 'banners', b.id!);
          bannerBatch.set(docRef, { ...b, updatedAt: new Date().toISOString() }, { merge: true });
        });
        await bannerBatch.commit();
      }

      // Do not publish fabricated vendors, reviews, or testimonials as real data.
      // Keep the official first-party vendor record needed by checkout accounting.
      const vendorRef = doc(db, 'vendors', 'biocart');
      const vendorDoc = await getDoc(vendorRef);
      if (!vendorDoc.exists()) {
        await setDoc(vendorRef, {
          id: 'biocart',
          ownerUid: 'system',
          storeName: 'BioCart Direct Official',
          status: 'active',
          approvalStatus: 'approved',
          commissionRate: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      // 7. Seed Default Store Settings if empty
      const settingsRef = doc(db, 'settings', 'general');
      const settingsSnap = await getDoc(settingsRef);
      if (!settingsSnap.exists()) {
        await setDoc(settingsRef, DEFAULT_STORE_SETTINGS);
      }
      const orderSettingsRef = doc(db, 'settings', 'main');
      const orderSettingsSnap = await getDoc(orderSettingsRef);
      if (!orderSettingsSnap.exists()) {
        await setDoc(orderSettingsRef, { shippingFee: 99, freeShippingThreshold: 1999, taxRate: 5 });
      }

    } catch (err) {
      console.error('Error seeding initial catalog to Firestore:', err);
    }
  }

  static async syncMasterCatalog(actor?: { id: string; email: string }): Promise<{ products: number; categories: number; inventory: number }> {
    const activeActor = this.resolveActor(actor);
    
    // 1. Seed & reconcile categories
    const catBatch = writeBatch(db);
    MASTER_CATEGORIES.forEach((cat) => {
      const docRef = doc(db, 'categories', cat.id);
      catBatch.set(docRef, { 
        ...cat, 
        updatedAt: new Date().toISOString() 
      }, { merge: true });
    });
    await catBatch.commit();

    // 2. Seed & reconcile products & inventory
    const prodBatch = writeBatch(db);
    SEED_PRODUCTS.forEach((prod) => {
      const docRef = doc(db, 'products', prod.id);
      const payload: Product = {
        ...prod,
        vendorId: 'biocart',
        vendorName: 'BioCart Direct',
        isFeatured: true,
        isBestSeller: prod.badge === 'Best Seller',
        isNewArrival: prod.badge === 'New Arrival',
        isSponsored: prod.badge === 'Sponsored' || prod.badge === 'Organic Choice',
        homepageVisible: true,
        shopVisible: true,
        active: true,
        stockQuantity: 150,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      prodBatch.set(docRef, payload, { merge: true });
      prodBatch.set(doc(db, 'inventory', prod.id), {
        id: prod.id,
        productId: prod.id,
        vendorId: 'biocart',
        sku: prod.sku,
        quantity: 150,
        reservedQuantity: 0,
        availableQuantity: 150,
        lowStockThreshold: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
    });
    await prodBatch.commit();

    // 3. Ensure official BioCart vendor exists
    const vendorRef = doc(db, 'vendors', 'biocart');
    await setDoc(vendorRef, {
      id: 'biocart',
      ownerUid: 'system',
      storeName: 'BioCart Direct Official',
      status: 'active',
      approvalStatus: 'approved',
      commissionRate: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });

    await this.logAuditAction(
      activeActor.id,
      activeActor.email,
      `Synchronized master catalog: ${SEED_PRODUCTS.length} products, ${MASTER_CATEGORIES.length} categories, ${SEED_PRODUCTS.length} inventory records`,
      'product',
      'master-catalog-sync',
      { productsCount: SEED_PRODUCTS.length, categoriesCount: MASTER_CATEGORIES.length }
    );

    return {
      products: SEED_PRODUCTS.length,
      categories: MASTER_CATEGORIES.length,
      inventory: SEED_PRODUCTS.length
    };
  }

  static subscribeToVendorProducts(
    vendorId: string, 
    callback: (products: Product[]) => void,
    onError?: (err: Error) => void
  ) {
    if (!vendorId) {
      callback([]);
      return () => {};
    }

    const q = query(collection(db, 'products'), where('vendorId', '==', vendorId));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    }, (error) => {
      console.warn('Firebase listener detached due to connection failure.', error);
      if (onError) {
        onError(error);
      } else {
        callback(SEED_PRODUCTS.filter(p => p.vendorId === vendorId) as Product[]);
      }
    });
  }

  // ==========================================
  // WORDPRESS-STYLE CMS PAGE OPERATIONS
  // ==========================================

  static subscribeToPages(callback: (pages: any[]) => void): () => void {
    const colRef = collection(db, 'pages');
    return onSnapshot(colRef, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      callback(list);
    }, (err) => {
      console.warn('Error subscribing to CMS pages:', err);
      callback([]);
    });
  }

  static async getPageCMS(pageId: string): Promise<any> {
    try {
      const docRef = doc(db, 'pages', pageId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data();
      }
      return null;
    } catch (err) {
      console.error('Error fetching page CMS data:', err);
      return null;
    }
  }

  static async savePageCMS(pageId: string, data: any, actor?: { id: string; email: string }): Promise<void> {
    const activeActor = this.resolveActor(actor);
    const docRef = doc(db, 'pages', pageId);
    const payload = {
      ...data,
      id: pageId,
      updatedAt: new Date().toISOString()
    };
    await setDoc(docRef, payload, { merge: true });
    await this.logAuditAction(activeActor.id, activeActor.email, `Saved CMS for page "${pageId}"`, 'page', pageId);
  }

  static async savePageDraft(pageId: string, draftSections: any[], actor?: { id: string; email: string }): Promise<void> {
    const activeActor = this.resolveActor(actor);
    const docRef = doc(db, 'pages', pageId);
    const payload = {
      draftSections,
      hasDraft: true,
      updatedAt: new Date().toISOString()
    };

    // Bounded write promise (10 seconds timeout)
    const writePromise = setDoc(docRef, payload, { merge: true });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Network timeout: Firestore write took longer than 10s')), 10000)
    );

    try {
      await Promise.race([writePromise, timeoutPromise]);
    } catch (err: any) {
      console.error(`[AdminService] savePageDraft failed for "${pageId}":`, err);
      // Fallback: cache in localStorage so draft is never lost on network or offline glitch
      try {
        localStorage.setItem(`biocart_draft_page_${pageId}`, JSON.stringify(payload));
      } catch (cacheErr) {
        console.warn('Failed to cache draft locally:', cacheErr);
      }
      throw err;
    }

    // Attempt audit log without blocking main flow
    this.logAuditAction(activeActor.id, activeActor.email, `Saved Draft for page "${pageId}"`, 'page', pageId).catch((e) =>
      console.warn('Audit log write error:', e)
    );
  }

  static async publishPageCMS(pageId: string, data: any, actor?: { id: string; email: string }): Promise<void> {
    const activeActor = this.resolveActor(actor);
    const docRef = doc(db, 'pages', pageId);
    const publishedSections = data.draftSections && data.draftSections.length > 0 ? data.draftSections : (data.sections || []);
    const payload = {
      ...data,
      id: pageId,
      status: 'published',
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      hasDraft: false,
      draftSections: [],
      sections: publishedSections
    };

    // Bounded write promise (10 seconds timeout)
    const writePromise = setDoc(docRef, payload, { merge: true });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Firestore publish timeout: Request took longer than 10s')), 10000)
    );

    try {
      await Promise.race([writePromise, timeoutPromise]);
    } catch (err: any) {
      console.error(`[AdminService] publishPageCMS failed for "${pageId}":`, err);
      // Backup to localStorage so admin work is preserved
      try {
        localStorage.setItem(`biocart_published_page_${pageId}`, JSON.stringify(payload));
      } catch (cacheErr) {
        console.warn('Failed to cache published page locally:', cacheErr);
      }
      throw err;
    }

    // Non-blocking audit log
    this.logAuditAction(activeActor.id, activeActor.email, `Published CMS Page "${pageId}"`, 'page', pageId).catch((e) =>
      console.warn('Audit log write error:', e)
    );
  }

  static async unpublishPageCMS(pageId: string, actor?: { id: string; email: string }): Promise<void> {
    const activeActor = this.resolveActor(actor);
    const docRef = doc(db, 'pages', pageId);
    await setDoc(docRef, { status: 'draft', updatedAt: new Date().toISOString() }, { merge: true });
    this.logAuditAction(activeActor.id, activeActor.email, `Unpublished CMS Page "${pageId}"`, 'page', pageId).catch(() => {});
  }

  static async deletePageCMS(pageId: string, actor?: { id: string; email: string }): Promise<void> {
    const activeActor = this.resolveActor(actor);
    const docRef = doc(db, 'pages', pageId);
    await deleteDoc(docRef);
    this.logAuditAction(activeActor.id, activeActor.email, `Deleted CMS Page "${pageId}"`, 'page', pageId).catch(() => {});
  }

  static async saveHomepageCMS(data: any, actor?: { id: string; email: string }): Promise<void> {
    const activeActor = this.resolveActor(actor);
    const docRef = doc(db, 'pages', 'home');
    const payload = {
      ...data,
      id: 'home',
      status: 'published',
      promotionalRibbon: data.promotionalRibbon || null,
      updatedAt: new Date().toISOString()
    };
    
    const writePromise = setDoc(docRef, payload, { merge: true });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Firestore write timeout for homepage')), 10000)
    );

    try {
      await Promise.race([writePromise, timeoutPromise]);
    } catch (err) {
      console.error('[AdminService] saveHomepageCMS failed:', err);
      throw err;
    }

    this.logAuditAction(activeActor.id, activeActor.email, `Updated Global Homepage CMS`, 'page', 'home').catch(() => {});
  }

  static async saveGlobalAppearance(data: any, actor?: { id: string; email: string }): Promise<void> {
    const activeActor = this.resolveActor(actor);
    const docRef = doc(db, 'settings', 'appearance');
    await setDoc(docRef, { ...data, updatedAt: new Date().toISOString() }, { merge: true });
    await this.logAuditAction(activeActor.id, activeActor.email, `Updated Global Appearance settings`, 'settings', 'appearance');
  }

  static subscribeToGlobalAppearance(callback: (data: any) => void): () => void {
    const docRef = doc(db, 'settings', 'appearance');
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data());
      } else {
        callback(null);
      }
    }, (err) => {
      console.warn('Error fetching global appearance:', err);
      callback(null);
    });
  }

  // ==========================================
  // CONTACT MESSAGES & INQUIRIES
  // ==========================================

  static async submitContactMessage(messageData: {
    name: string;
    email: string;
    phone: string;
    message: string;
    type?: string;
    companyName?: string;
    city?: string;
    volumeEstimate?: string;
  }): Promise<string> {
    const msgId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const msgRef = doc(db, 'contact_messages', msgId);
    const payload = {
      ...messageData,
      id: msgId,
      status: 'new',
      createdAt: new Date().toISOString()
    };

    const writePromise = setDoc(msgRef, payload);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Contact submission timeout')), 8000)
    );

    try {
      await Promise.race([writePromise, timeoutPromise]);
    } catch (err: any) {
      console.warn('[AdminService] submitContactMessage Firestore error, saving locally:', err);
      try {
        const stored = JSON.parse(localStorage.getItem('biocart_offline_contact_messages') || '[]');
        stored.push(payload);
        localStorage.setItem('biocart_offline_contact_messages', JSON.stringify(stored));
      } catch (cacheErr) {
        console.warn('LocalStorage message fallback failed:', cacheErr);
      }
    }

    return msgId;
  }

  static subscribeToContactMessages(callback: (messages: any[]) => void): () => void {
    const colRef = collection(db, 'contact_messages');
    return onSnapshot(colRef, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      callback(list);
    }, (err) => {
      console.warn('Error fetching contact messages:', err);
      try {
        const offline = JSON.parse(localStorage.getItem('biocart_offline_contact_messages') || '[]');
        callback(offline);
      } catch {
        callback([]);
      }
    });
  }

  static async deleteContactMessage(msgId: string): Promise<void> {
    const msgRef = doc(db, 'contact_messages', msgId);
    await deleteDoc(msgRef);
  }

  // ==========================================
  // FAQ CRUD OPERATIONS
  // ==========================================

  static async addFAQ(faq: any): Promise<string> {
    const colRef = collection(db, 'faqs');
    const docRef = doc(colRef);
    await setDoc(docRef, {
      ...faq,
      id: docRef.id,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  }

  static async updateFAQ(faqId: string, updates: any): Promise<void> {
    const docRef = doc(db, 'faqs', faqId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  }

  static async deleteFAQ(faqId: string): Promise<void> {
    const docRef = doc(db, 'faqs', faqId);
    await deleteDoc(docRef);
  }

  // ==========================================
  // AGENT MANAGEMENT OPERATIONS
  // ==========================================

  static subscribeToAgents(callback: (agents: AgentEntity[]) => void): () => void {
    const colRef = collection(db, 'agents');
    return onSnapshot(colRef, (snapshot) => {
      const list: AgentEntity[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as AgentEntity);
      });
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      callback(list);
    }, (err) => {
      console.warn('Error fetching agents:', err);
      callback([]);
    });
  }

  static async saveAgent(agent: Partial<AgentEntity>, actor?: { id: string; email: string }): Promise<string> {
    const activeActor = this.resolveActor(actor);
    const agentId = agent.id || `agent-${Date.now()}`;
    const docRef = doc(db, 'agents', agentId);
    const payload: Partial<AgentEntity> = {
      id: agentId,
      name: agent.name || 'BioCart Agent',
      email: agent.email || '',
      phone: agent.phone || '',
      status: agent.status || 'active',
      permissions: agent.permissions || ['view_vendors', 'onboard_vendor'],
      internalNotes: agent.internalNotes || '',
      createdBy: activeActor.id,
      updatedAt: new Date().toISOString(),
      ...(agent.createdAt ? {} : { createdAt: new Date().toISOString() })
    };

    await setDoc(docRef, payload, { merge: true });
    await this.logAuditAction(
      activeActor.id,
      activeActor.email,
      `Saved Agent profile "${payload.name}" (${payload.email})`,
      'user',
      agentId,
      { permissions: payload.permissions, status: payload.status }
    );
    return agentId;
  }

  static async updateAgentStatus(agentId: string, status: 'active' | 'suspended', actor?: { id: string; email: string }): Promise<void> {
    const activeActor = this.resolveActor(actor);
    const docRef = doc(db, 'agents', agentId);
    await updateDoc(docRef, { status, updatedAt: new Date().toISOString() });
    await this.logAuditAction(
      activeActor.id,
      activeActor.email,
      `Updated Agent ${agentId} status to ${status}`,
      'user',
      agentId,
      { status }
    );
  }

  // ==========================================
  // VENDOR PRODUCT CATALOGUE ASSIGNMENT
  // ==========================================

  static subscribeToVendorAssignments(vendorId: string, callback: (assignments: VendorProductAssignment[]) => void): () => void {
    const q = query(collection(db, 'vendor_product_assignments'), where('vendorId', '==', vendorId));
    return onSnapshot(q, (snapshot) => {
      const list: VendorProductAssignment[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as VendorProductAssignment);
      });
      callback(list);
    }, (err) => {
      console.warn('Error fetching vendor assignments:', err);
      callback([]);
    });
  }

  static async assignProductToVendor(
    vendor: VendorItem,
    product: Product,
    actor?: { id: string; email: string }
  ): Promise<string> {
    const activeActor = this.resolveActor(actor);
    const assignmentId = `${vendor.id}_${product.id}`;
    const docRef = doc(db, 'vendor_product_assignments', assignmentId);

    const payload: VendorProductAssignment = {
      id: assignmentId,
      vendorId: vendor.id,
      vendorName: vendor.storeName,
      productId: product.id,
      productName: product.name,
      sku: product.sku || '',
      assignedBy: activeActor.id,
      assignedByEmail: activeActor.email,
      status: 'active',
      assignedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await setDoc(docRef, payload, { merge: true });
    await this.logAuditAction(
      activeActor.id,
      activeActor.email,
      `Assigned catalogue product "${product.name}" to vendor "${vendor.storeName}"`,
      'product',
      product.id,
      { vendorId: vendor.id, vendorName: vendor.storeName, assignmentId }
    );
    return assignmentId;
  }

  static async removeProductFromVendor(
    vendorId: string,
    productId: string,
    actor?: { id: string; email: string }
  ): Promise<void> {
    const activeActor = this.resolveActor(actor);
    const assignmentId = `${vendorId}_${productId}`;
    const docRef = doc(db, 'vendor_product_assignments', assignmentId);
    await deleteDoc(docRef);
    await this.logAuditAction(
      activeActor.id,
      activeActor.email,
      `Removed catalogue product ${productId} assignment from vendor ${vendorId}`,
      'product',
      productId,
      { vendorId, assignmentId }
    );
  }

  // ==========================================
  // FINANCIAL LEDGER
  // ==========================================
  static subscribeToFinancialLedger(
    callback: (entries: any[]) => void,
    vendorIdFilter?: string
  ): () => void {
    const colRef = collection(db, 'financial_ledger');
    let q = query(colRef, orderBy('createdAt', 'desc'), limit(100));
    if (vendorIdFilter) {
      q = query(colRef, where('vendorId', '==', vendorIdFilter), orderBy('createdAt', 'desc'), limit(100));
    }
    return onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      callback(list);
    }, (err) => {
      console.warn('Financial ledger subscription warning (falling back if index missing):', err);
      // Fallback query without composite orderBy
      const fallbackQ = vendorIdFilter
        ? query(colRef, where('vendorId', '==', vendorIdFilter), limit(100))
        : query(colRef, limit(100));
      onSnapshot(fallbackQ, (fallbackSnap) => {
        const fallbackList: any[] = [];
        fallbackSnap.forEach((docSnap) => {
          fallbackList.push({ id: docSnap.id, ...docSnap.data() });
        });
        fallbackList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        callback(fallbackList);
      });
    });
  }

  // ==========================================
  // BLOG CRUD & SUBSCRIPTION OPERATIONS
  // ==========================================

  static subscribeToBlogs(callback: (blogs: any[]) => void): () => void {
    const colRef = collection(db, 'blogs');
    return onSnapshot(colRef, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      callback(list);
    }, (err) => {
      console.warn('Error subscribing to blogs:', err);
      try {
        const offline = JSON.parse(localStorage.getItem('biocart_offline_blogs') || '[]');
        callback(offline);
      } catch {
        callback([]);
      }
    });
  }

  static async getBlogByIdOrSlug(idOrSlug: string): Promise<any | null> {
    try {
      // 1. Try by doc ID
      const directDocRef = doc(db, 'blogs', idOrSlug);
      const directSnap = await getDoc(directDocRef);
      if (directSnap.exists()) {
        return { id: directSnap.id, ...directSnap.data() };
      }

      // 2. Query by slug
      const q = query(collection(db, 'blogs'), where('slug', '==', idOrSlug), limit(1));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        const first = qSnap.docs[0];
        return { id: first.id, ...first.data() };
      }
      return null;
    } catch (err) {
      console.error('Error fetching blog post:', err);
      return null;
    }
  }

  static async saveBlog(blog: any, actor?: { id: string; email: string }): Promise<string> {
    const activeActor = this.resolveActor(actor);
    const blogId = blog.id || (blog.slug ? blog.slug : `blog-${Date.now()}`);
    const docRef = doc(db, 'blogs', blogId);

    const payload = {
      ...blog,
      id: blogId,
      updatedAt: new Date().toISOString(),
      createdAt: blog.createdAt || new Date().toISOString()
    };

    // Ensure content string is present for firestore.rules validation
    if (!payload.content) {
      payload.content = payload.excerpt || payload.title || 'BioCart Organic Agriculture Article';
    }

    await setDoc(docRef, payload, { merge: true });

    // Read-back verification
    const verified = await getDoc(docRef);
    if (!verified.exists()) {
      throw new Error(`Blog write verification failed for ID: ${blogId}`);
    }

    await this.logAuditAction(
      activeActor.id,
      activeActor.email,
      `Saved blog post "${blog.title || blogId}" with status [${blog.status || 'draft'}]`,
      'blog',
      blogId,
      { status: blog.status, slug: blog.slug }
    );

    return blogId;
  }

  static async deleteBlog(blogId: string, actor?: { id: string; email: string }): Promise<void> {
    const activeActor = this.resolveActor(actor);
    const docRef = doc(db, 'blogs', blogId);
    await deleteDoc(docRef);
    await this.logAuditAction(
      activeActor.id,
      activeActor.email,
      `Deleted blog post "${blogId}"`,
      'blog',
      blogId
    );
  }

  /**
   * Real-time subscription to Vendor Settlements & Payout Batches
   */
  static subscribeToSettlements(callback: (settlements: any[]) => void): () => void {
    const q = query(
      collection(db, 'vendor_settlements'),
      orderBy('createdAt', 'desc'),
      limit(150)
    );

    return onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(list);
    }, (error) => {
      console.warn('Error fetching settlements:', error);
      callback([]);
    });
  }

  /**
   * Super Admin Manual Payout Trigger via Cloud Function
   */
  static async triggerManualPayout(vendorId: string, amountPaise?: number, reason?: string): Promise<any> {
    const { httpsCallable } = await import('firebase/functions');
    const { functions } = await import('../config/firebase');
    const trigger = httpsCallable(functions, 'triggerManualSettlement');
    const res = await trigger({ vendorId, amountPaise, reason });
    return res.data;
  }

  /**
   * Admin Retry Vendor Payout via Cloud Function
   */
  static async retryVendorPayout(settlementId: string): Promise<any> {
    const { httpsCallable } = await import('firebase/functions');
    const { functions } = await import('../config/firebase');
    const retry = httpsCallable(functions, 'retryVendorPayout');
    const res = await retry({ settlementId });
    return res.data;
  }
}


