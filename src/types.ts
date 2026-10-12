export interface Review {
  id: string;
  productId?: string;
  productName?: string;
  user: string;
  userEmail?: string;
  rating: number;
  date: string;
  comment: string;
  avatar?: string;
  status?: 'approved' | 'pending' | 'rejected' | 'hidden';
}

export interface Product {
  id: string;
  name: string;
  category: string;
  categoryId?: string;
  vendorId?: string;
  vendorName?: string;
  price: number;
  mrp: number;
  discount?: number;
  sku: string;
  rating: number;
  reviewsCount: number;
  image: string;
  images: string[];
  description: string;
  shortDescription: string;
  features: string[];
  benefits: string[];
  usageInstructions: string[];
  ingredients?: string[];
  weightVariants: string[];
  selectedVariant?: string;
  stockStatus: 'In Stock' | 'Low Stock' | 'Out of Stock';
  inStock: boolean;
  quantityInCart?: number;
  badge?: string;
  materials?: string;
  dimensions?: string;
  faqs?: { question: string; answer: string }[];
  reviews?: Review[];
  // Marketplace & Placement Flags
  isFeatured?: boolean;
  isBestSeller?: boolean;
  isNewArrival?: boolean;
  isSponsored?: boolean;
  homepageVisible?: boolean;
  shopVisible?: boolean;
  active?: boolean;
  stockQuantity?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  displayOrder: number;
  isFeatured: boolean;
  active: boolean;
  productCount?: number;
  parentId?: string | null;
  aliases?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface BannerItem {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  mobileImageUrl?: string;
  linkUrl: string;
  sequence: number;
  bannerType: 'hero' | 'promo' | 'sidebar' | 'home' | 'about' | 'shop' | 'contact';
  active: boolean;
  promotionalLabel?: string;
  ribbonText?: string;
  ctaText?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface VendorEntity {
  id: string;
  ownerUid: string;
  storeName: string;
  ownerName: string;
  email: string;
  phone: string;
  logo?: string;
  status: 'pending' | 'active' | 'suspended';
  legal?: {
    pan?: string;
    gstin?: string;
    fssai?: string;
  };
  contact?: {
    phone?: string;
    email?: string;
    address?: string;
  };
  commission?: {
    baseRateBps: number;
    categoryRatesBps?: Record<string, number>;
  };
  settlement?: {
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    accountType?: string;
  };
  counters?: {
    totalOrders: number;
    totalRevenuePaise: number;
    totalCommissionPaise: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface WalletEntity {
  vendorId: string;
  pending: number;
  onHold: number;
  available: number;
  settling: number;
  paidOut: number;
  lifetimeGross: number;
  lifetimeCommission: number;
  lifetimeSettled: number;
  createdAt: string;
  updatedAt: string;
}

export interface WalletLedgerEntity {
  id: string;
  vendorId: string;
  walletId: string;
  amountPaise: number;
  transactionType: 'credit' | 'debit';
  status: 'pending' | 'completed' | 'failed';
  description: string;
  createdAt: string;
}


export type VendorItem = VendorEntity;

export interface PromotionalRibbonConfig {
  enabled: boolean;
  text: string;
  ctaText: string;
  ctaLink: string;
}

export interface StoreSettings {
  businessName?: string;
  storeName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  socialLinks: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
    linkedin?: string;
  };
  currency: string;
  freeShippingThreshold: number;
  defaultCommission: number;
  maintenanceMode: boolean;
  promotionalRibbon: PromotionalRibbonConfig;
  updatedAt?: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorEmail: string;
  action: string;
  entityType: 'product' | 'category' | 'banner' | 'vendor' | 'review' | 'settings' | 'user' | 'order' | 'homepage' | 'faq' | 'page';
  entityId: string;
  timestamp: string;
  details?: Record<string, any>;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: 'general' | 'products' | 'gardening' | 'shipping' | 'partnership';
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  quote: string;
  rating: number;
  avatar: string;
  active?: boolean;
}

export interface Founder {
  name: string;
  role: string;
  bio: string;
  image: string;
  signature?: string;
}

export interface TimelineItem {
  year: string;
  title: string;
  description: string;
}

export interface DealerEnquiry {
  name: string;
  company: string;
  email: string;
  phone: string;
  location: string;
  type: 'dealer' | 'distributor';
  message: string;
}

