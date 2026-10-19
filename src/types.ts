export interface Review {
  id: string;
  productId?: string;
  productName?: string;
  user: string;
  userEmail?: string;
  reviewerName?: string;
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
  approvalStatus?: 'approved' | 'pending' | 'rejected' | 'draft';
  rejectionReason?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  source?: 'catalogue' | 'vendor_created';
  stockQuantity?: number;
  // Product SEO extensions
  seoTitle?: string;
  seoDescription?: string;
  targetKeyword?: string;
  secondaryKeywords?: string[];
  canonicalUrl?: string;
  imageAltText?: string;
  noIndex?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export * from './types/blog';


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
  titleLine1?: string;
  titleLine2?: string;
  titleLine3?: string;
  subtitle?: string;
  badgeText?: string;
  imageUrl: string;
  mobileImageUrl?: string;
  linkUrl: string;
  sequence: number;
  bannerType: 'hero' | 'promo' | 'sidebar' | 'home' | 'about' | 'shop' | 'contact';
  active: boolean;
  promotionalLabel?: string;
  ribbonText?: string;
  ctaText?: string;
  primaryButtonText?: string;
  primaryButtonUrl?: string;
  secondaryButtonText?: string;
  secondaryButtonUrl?: string;
  scrollIndicatorText?: string;
  order?: number;
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
    businessType?: 'proprietorship' | 'partnership' | 'llp' | 'private_limited' | 'public_limited' | 'other';
    registrationNumber?: string;
    establishedYear?: string;
  };
  contact?: {
    phone?: string;
    email?: string;
    address?: string;
  };
  description?: string;
  website?: string;
  addresses?: {
    registeredAddress?: {
      addressLine1: string;
      addressLine2?: string;
      landmark?: string;
      city: string;
      state: string;
      pinCode: string;
      country: string;
    };
    pickupAddress?: {
      addressLine1: string;
      addressLine2?: string;
      landmark?: string;
      city: string;
      state: string;
      pinCode: string;
      country: string;
      contactPerson?: string;
      contactPhone?: string;
    };
    sameAsRegistered?: boolean;
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

export type AgentPermission =
  | 'view_vendors'
  | 'create_vendor_draft'
  | 'onboard_vendor'
  | 'edit_vendor_details'
  | 'upload_vendor_documents'
  | 'submit_vendor_review'
  | 'view_assigned_products'
  | 'assign_catalogue_products';

export interface AgentEntity {
  id: string; // Auth UID
  name: string;
  email: string;
  phone?: string;
  status: 'active' | 'suspended';
  permissions: AgentPermission[];
  assignedVendorsCount?: number;
  internalNotes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface VendorProductAssignment {
  id: string;
  vendorId: string;
  vendorName: string;
  productId: string;
  productName: string;
  sku: string;
  assignedBy: string;
  assignedByEmail: string;
  status: 'active' | 'inactive';
  assignedAt: string;
  updatedAt: string;
}

export interface PromotionalRibbonConfig {
  enabled: boolean;
  text: string;
  ctaText: string;
  ctaLink: string;
}

export interface FinancialPolicyConfig {
  commissionBasis: 'net_after_gateway_fee' | 'gross_order_value';
  gatewayFeeRateBps: number; // e.g. 200 for 2.0%
  gatewayFeeFlatPaise: number; // e.g. 0 paise
  gatewayFeeTaxRateBps: number; // e.g. 1800 for 18% GST on gateway fee
  commissionGstRateBps: number; // e.g. 1800 for 18% GST on platform commission
  couponFunding: 'platform' | 'vendor' | 'shared';
  settlementDayOfWeek: number; // 2 for Tuesday
  payoutHoldPeriodDays: number; // e.g. 3 days after delivery
  minimumPayoutPaise: number; // e.g. 50000 paise (Rs. 500)
}

export interface FinancialLedgerEntry {
  id: string;
  orderId?: string;
  orderNumber?: string;
  vendorId?: string;
  entryType: 
    | 'customer_payment_captured'
    | 'gateway_processing_fee'
    | 'platform_commission_earned'
    | 'commission_gst_collected'
    | 'vendor_wallet_credited'
    | 'vendor_payout_processed'
    | 'refund_reversal';
  amountPaise: number;
  direction: 'credit' | 'debit';
  balanceAfterPaise?: number;
  status: 'settled' | 'pending' | 'reversed';
  referenceId?: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: string;
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
  financialPolicy?: FinancialPolicyConfig;
  updatedAt?: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorEmail: string;
  action: string;
  entityType: 'product' | 'category' | 'banner' | 'vendor' | 'review' | 'settings' | 'user' | 'order' | 'homepage' | 'faq' | 'page' | 'shipment' | 'blog';
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

export type ShipmentStatus =
  | 'pending'
  | 'manifested'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'exception';

export interface ShipmentScan {
  scanDetail: string;
  location?: string;
  timestamp: string;
  instructions?: string;
  status?: string;
}

export interface ShipmentItem {
  id: string;
  orderId?: string;
  orderNumber?: string;
  parentOrderId: string;
  vendorOrderId: string;
  vendorId: string;
  carrier: 'delhivery';
  waybill: string | null;
  trackingNumber?: string | null;
  shipmentId: string;
  status: ShipmentStatus;
  carrierStatus: string;
  remarks?: string;
  pickupLocation?: string;
  expectedDeliveryDate?: string | null;
  scans?: ShipmentScan[];
  shippingAddress: {
    name: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    phone: string;
  };
  packageDetails: {
    items: { productId: string; name: string; price: number; quantity: number; total: number }[];
    itemCount: number;
    weightGrams: number;
    dimensions: { lengthCm: number; widthCm: number; heightCm: number };
    description: string;
  };
  payment: {
    mode: 'Pre-paid' | 'COD';
    codAmount: number;
    totalAmount: number;
  };
  statusHistory?: {
    status: ShipmentStatus;
    carrierStatus: string;
    location?: string;
    timestamp: string;
    remarks?: string;
  }[];
  labelUrl?: string | null;
  isCancelled?: boolean;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

