import { z } from 'zod';

// ==========================================
// User Roles & Access Control
// ==========================================
export type UserRole = 'super_admin' | 'admin' | 'manager' | 'customer' | 'guest' | 'vendor';

export const USER_ROLES: Record<string, UserRole> = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  CUSTOMER: 'customer',
  GUEST: 'guest',
  VENDOR: 'vendor',
};

// ==========================================
// Base Entity Definition (Zero-Trust Standard)
// ==========================================
export interface BaseEntity {
  id: string;
  createdAt: string; // ISO String
  updatedAt: string; // ISO String
  createdBy: string; // UID reference
  updatedBy: string; // UID reference
  status: string;    // 'active', 'inactive', 'draft', etc.
  isDeleted: boolean;
  version: number;
}

export const BaseEntitySchema = z.object({
  id: z.string().min(1, 'ID is required'),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string(),
  updatedBy: z.string(),
  status: z.string().default('active'),
  isDeleted: z.boolean().default(false),
  version: z.number().default(1),
});

// ==========================================
// 1. User Profile
// ==========================================
export interface UserProfile extends Partial<BaseEntity> {
  uid: string;
  email?: string;
  name: string;
  role: UserRole;
  phoneNumber?: string;
  phone?: string; // Compatibility alias
  location?: string;
  status: 'active' | 'suspended';
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  photoURL?: string;
  lastLoginAt?: string;
}

export const UserProfileSchema = z.object({
  uid: z.string().min(1, 'UID is required'),
  email: z.string().email('Invalid email address').or(z.literal('')).optional(),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['super_admin', 'admin', 'manager', 'customer', 'guest', 'vendor'] as const),
  phoneNumber: z.string().optional(),
  phone: z.string().optional(), // Compatibility alias
  location: z.string().optional(),
  status: z.enum(['active', 'suspended'] as const),
  createdAt: z.string(),
  updatedAt: z.string(),
  photoURL: z.string().url().optional().or(z.literal('')),
  lastLoginAt: z.string().optional(),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
  isDeleted: z.boolean().optional(),
  version: z.number().optional(),
});

// ==========================================
// 1.5 Vendor Profile & Wallets
// ==========================================
export interface WalletBuckets {
  pending: number;
  onHold: number;
  available: number;
  settling: number;
  paidOut: number;
}

export const WalletBucketsSchema = z.object({
  pending: z.number().nonnegative().default(0),
  onHold: z.number().nonnegative().default(0),
  available: z.number().nonnegative().default(0),
  settling: z.number().nonnegative().default(0),
  paidOut: z.number().nonnegative().default(0),
});

export interface VendorEntity extends BaseEntity {
  userId: string;
  businessName: string;
  wallets: WalletBuckets;
  commissionRate: number;
}

export const VendorEntitySchema = BaseEntitySchema.extend({
  userId: z.string().min(1),
  businessName: z.string().min(1),
  wallets: WalletBucketsSchema,
  commissionRate: z.number().min(0).max(100).default(10),
});


// ==========================================
// 2. Products
// ==========================================
export interface ProductEntity extends BaseEntity {
  vendorId: string;
  name: string;
  category: string; // category ID reference
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
  stockStatus: 'In Stock' | 'Low Stock' | 'Out of Stock';
  inStock: boolean;
  badge?: string;
  materials?: string;
  dimensions?: string;
}

export const ProductEntitySchema = BaseEntitySchema.extend({
  vendorId: z.string(),
  name: z.string().min(1, 'Product name is required'),
  category: z.string().min(1, 'Category is required'),
  price: z.number().nonnegative(),
  mrp: z.number().nonnegative(),
  discount: z.number().optional(),
  sku: z.string().min(1, 'SKU is required'),
  rating: z.number().min(0).max(5).default(0),
  reviewsCount: z.number().nonnegative().default(0),
  image: z.string().url('Main image must be a valid URL'),
  images: z.array(z.string().url()),
  description: z.string(),
  shortDescription: z.string(),
  features: z.array(z.string()),
  benefits: z.array(z.string()),
  usageInstructions: z.array(z.string()),
  ingredients: z.array(z.string()).optional(),
  weightVariants: z.array(z.string()),
  stockStatus: z.enum(['In Stock', 'Low Stock', 'Out of Stock']),
  inStock: z.boolean(),
  badge: z.string().optional(),
  materials: z.string().optional(),
  dimensions: z.string().optional(),
});

// ==========================================
// 3. Categories
// ==========================================
export interface CategoryEntity extends BaseEntity {
  name: string;
  slug: string;
  description: string;
  image?: string;
  parentId?: string; // Recursive hierarchy reference
}

export const CategoryEntitySchema = BaseEntitySchema.extend({
  name: z.string().min(1, 'Category name is required'),
  slug: z.string().min(1, 'Slug is required'),
  description: z.string(),
  image: z.string().url().optional(),
  parentId: z.string().optional(),
});

// ==========================================
// 4. Inventory
// ==========================================
export interface InventoryEntity extends BaseEntity {
  vendorId: string;
  productId: string;
  variantId?: string;
  sku: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  lowStockThreshold: number;
}

export const InventoryEntitySchema = BaseEntitySchema.extend({
  vendorId: z.string(),
  productId: z.string().min(1, 'Product ID is required'),
  variantId: z.string().optional(),
  sku: z.string().min(1, 'SKU is required'),
  quantity: z.number().int().nonnegative(),
  reservedQuantity: z.number().int().nonnegative().default(0),
  availableQuantity: z.number().int().nonnegative(),
  lowStockThreshold: z.number().int().nonnegative().default(5),
});

// ==========================================
// 5. Product Variants
// ==========================================
export interface ProductVariantEntity extends BaseEntity {
  productId: string;
  sku: string;
  price: number;
  mrp: number;
  weight: string;
  stockStatus: 'In Stock' | 'Low Stock' | 'Out of Stock';
  image?: string;
}

export const ProductVariantEntitySchema = BaseEntitySchema.extend({
  productId: z.string().min(1, 'Product ID is required'),
  sku: z.string().min(1, 'SKU is required'),
  price: z.number().nonnegative(),
  mrp: z.number().nonnegative(),
  weight: z.string(),
  stockStatus: z.enum(['In Stock', 'Low Stock', 'Out of Stock']),
  image: z.string().url().optional(),
});

// ==========================================
// 6. Orders
// ==========================================
export interface OrderEntity extends BaseEntity {
  userId: string;
  orderNumber: string;
  paymentMethod: 'cod' | 'razorpay' | 'stripe' | 'card';
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  shippingAddressId: string;
  billingAddressId: string;
  subtotalPaise: number;
  discountAmountPaise: number;
  taxAmountPaise: number;
  shippingCostPaise: number;
  totalAmountPaise: number;
  trackingNumber?: string;
  shippingCarrier?: string;
  notes?: string;
}

export const OrderEntitySchema = BaseEntitySchema.extend({
  userId: z.string().min(1, 'User ID is required'),
  orderNumber: z.string().min(1, 'Order number is required'),
  paymentMethod: z.enum(['cod', 'razorpay', 'stripe', 'card']),
  paymentStatus: z.enum(['pending', 'completed', 'failed', 'refunded']),
  shippingAddressId: z.string().min(1, 'Shipping address is required'),
  billingAddressId: z.string().min(1, 'Billing address is required'),
  subtotalPaise: z.number().nonnegative(),
  discountAmountPaise: z.number().nonnegative().default(0),
  taxAmountPaise: z.number().nonnegative().default(0),
  shippingCostPaise: z.number().nonnegative().default(0),
  totalAmountPaise: z.number().nonnegative(),
  trackingNumber: z.string().optional(),
  shippingCarrier: z.string().optional(),
  notes: z.string().optional(),
});

export interface VendorOrderEntity extends BaseEntity {
  orderId: string;
  vendorId: string;
  vendorOrderNumber: string;
  subtotalPaise: number;
  discountAmountPaise: number;
  taxAmountPaise: number;
  shippingCostPaise: number;
  totalAmountPaise: number;
  commissionAmountPaise: number;
  vendorSettlementAmountPaise: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  trackingNumber?: string;
  shippingCarrier?: string;
}

export const VendorOrderEntitySchema = BaseEntitySchema.extend({
  orderId: z.string(),
  vendorId: z.string(),
  vendorOrderNumber: z.string(),
  subtotalPaise: z.number().nonnegative(),
  discountAmountPaise: z.number().nonnegative().default(0),
  taxAmountPaise: z.number().nonnegative().default(0),
  shippingCostPaise: z.number().nonnegative().default(0),
  totalAmountPaise: z.number().nonnegative(),
  commissionAmountPaise: z.number().nonnegative(),
  vendorSettlementAmountPaise: z.number().nonnegative(),
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
  trackingNumber: z.string().optional(),
  shippingCarrier: z.string().optional(),
});

// ==========================================
// 7. Order Items
// ==========================================
export interface OrderItemEntity extends BaseEntity {
  orderId: string;
  vendorOrderId?: string;
  productId: string;
  variantId?: string;
  sku: string;
  name: string;
  pricePaise: number;
  quantity: number;
  totalPaise: number;
}

export const OrderItemEntitySchema = BaseEntitySchema.extend({
  orderId: z.string().min(1, 'Order ID is required'),
  vendorOrderId: z.string().optional(),
  productId: z.string().min(1, 'Product ID is required'),
  variantId: z.string().optional(),
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Product name is required'),
  pricePaise: z.number().nonnegative(),
  quantity: z.number().int().positive(),
  totalPaise: z.number().nonnegative(),
});

// ==========================================
// 8. Shopping Cart
// ==========================================
export interface CartItem {
  productId: string;
  variantId?: string;
  sku: string;
  quantity: number;
  addedAt: string;
}

export interface ShoppingCartEntity extends BaseEntity {
  userId: string;
  items: CartItem[];
}

export const CartItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  variantId: z.string().optional(),
  sku: z.string().min(1, 'SKU is required'),
  quantity: z.number().int().positive(),
  addedAt: z.string(),
});

export const ShoppingCartEntitySchema = BaseEntitySchema.extend({
  userId: z.string().min(1, 'User ID is required'),
  items: z.array(CartItemSchema).default([]),
});

// ==========================================
// 9. Wishlist
// ==========================================
export interface WishlistEntity extends BaseEntity {
  userId: string;
  productIds: string[];
}

export const WishlistEntitySchema = BaseEntitySchema.extend({
  userId: z.string().min(1, 'User ID is required'),
  productIds: z.array(z.string()).default([]),
});

// ==========================================
// 10. Addresses
// ==========================================
export interface AddressEntity extends BaseEntity {
  userId: string;
  addressType: 'shipping' | 'billing';
  name: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  isDefault: boolean;
}

export const AddressEntitySchema = BaseEntitySchema.extend({
  userId: z.string().min(1, 'User ID is required'),
  addressType: z.enum(['shipping', 'billing']),
  name: z.string().min(1, 'Name is required'),
  street: z.string().min(1, 'Street is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().min(1, 'Country is required'),
  phone: z.string().min(1, 'Phone is required'),
  isDefault: z.boolean().default(false),
});

// ==========================================
// 11. Reviews
// ==========================================
export interface ReviewEntity extends BaseEntity {
  productId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  likes: number;
  isApproved: boolean;
}

export const ReviewEntitySchema = BaseEntitySchema.extend({
  productId: z.string().min(1, 'Product ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  userName: z.string().min(1, 'Username is required'),
  userAvatar: z.string().url().optional(),
  rating: z.number().min(1).max(5),
  comment: z.string().min(1, 'Comment is required'),
  likes: z.number().int().nonnegative().default(0),
  isApproved: z.boolean().default(false),
});

// ==========================================
// 12. Blogs
// ==========================================
export interface BlogEntity extends BaseEntity {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  coverImage: string;
  authorId: string;
  authorName: string;
  tags: string[];
  readTime: string; // e.g. "5 min read"
}

export const BlogEntitySchema = BaseEntitySchema.extend({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required'),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().min(1, 'Excerpt is required'),
  coverImage: z.string().url('Cover image must be a valid URL'),
  authorId: z.string().min(1, 'Author ID is required'),
  authorName: z.string().min(1, 'Author name is required'),
  tags: z.array(z.string()).default([]),
  readTime: z.string().min(1),
});

// ==========================================
// 13. Banners
// ==========================================
export interface BannerEntity extends BaseEntity {
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl: string;
  sequence: number;
  bannerType: 'hero' | 'promo' | 'sidebar';
}

export const BannerEntitySchema = BaseEntitySchema.extend({
  title: z.string().min(1, 'Title is required'),
  subtitle: z.string().optional(),
  imageUrl: z.string().url('Image must be a URL'),
  linkUrl: z.string(),
  sequence: z.number().int().nonnegative(),
  bannerType: z.enum(['hero', 'promo', 'sidebar']),
});

// ==========================================
// 14. Coupons
// ==========================================
export interface CouponEntity extends BaseEntity {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount?: number;
  startDate: string;
  endDate: string;
  usageLimit: number;
  usedCount: number;
}

export const CouponEntitySchema = BaseEntitySchema.extend({
  code: z.string().min(1, 'Coupon code is required'),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.number().positive(),
  minOrderAmount: z.number().nonnegative().default(0),
  maxDiscountAmount: z.number().positive().optional(),
  startDate: z.string(),
  endDate: z.string(),
  usageLimit: z.number().int().positive(),
  usedCount: z.number().int().nonnegative().default(0),
});

// ==========================================
// 15. Dealer Applications
// ==========================================
export interface DealerApplicationEntity extends BaseEntity {
  name: string;
  companyName: string;
  email: string;
  phone: string;
  location: string;
  message: string;
  businessLicenseUrl?: string;
  taxId?: string;
}

export const DealerApplicationEntitySchema = BaseEntitySchema.extend({
  name: z.string().min(1, 'Name is required'),
  companyName: z.string().min(1, 'Company name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone is required'),
  location: z.string().min(1, 'Location is required'),
  message: z.string().min(1, 'Message is required'),
  businessLicenseUrl: z.string().url().optional(),
  taxId: z.string().optional(),
});

// ==========================================
// 16. Distributor Applications
// ==========================================
export interface DistributorApplicationEntity extends BaseEntity {
  name: string;
  companyName: string;
  email: string;
  phone: string;
  location: string;
  message: string;
  distributionArea: string;
  warehouseCapacity: string;
}

export const DistributorApplicationEntitySchema = BaseEntitySchema.extend({
  name: z.string().min(1, 'Name is required'),
  companyName: z.string().min(1, 'Company name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone is required'),
  location: z.string().min(1, 'Location is required'),
  message: z.string().min(1, 'Message is required'),
  distributionArea: z.string().min(1, 'Distribution area is required'),
  warehouseCapacity: z.string().min(1, 'Warehouse capacity is required'),
});

// ==========================================
// 17. Notifications
// ==========================================
export interface NotificationEntity extends BaseEntity {
  userId: string;
  title: string;
  body: string;
  notificationType: 'info' | 'success' | 'warning' | 'order';
  isRead: boolean;
  linkUrl?: string;
}

export const NotificationEntitySchema = BaseEntitySchema.extend({
  userId: z.string().min(1, 'User ID is required'),
  title: z.string().min(1, 'Title is required'),
  body: z.string().min(1, 'Body is required'),
  notificationType: z.enum(['info', 'success', 'warning', 'order']),
  isRead: z.boolean().default(false),
  linkUrl: z.string().optional(),
});

// ==========================================
// 18. Settings
// ==========================================
export interface SettingsEntity extends BaseEntity {
  key: string;
  value: Record<string, any>;
  category: 'general' | 'security' | 'shipping' | 'payment';
}

export const SettingsEntitySchema = BaseEntitySchema.extend({
  key: z.string().min(1, 'Setting key is required'),
  value: z.record(z.string(), z.any()),
  category: z.enum(['general', 'security', 'shipping', 'payment']),
});

// ==========================================
// 19. Homepage Content
// ==========================================
export interface HomepageContentEntity extends BaseEntity {
  sectionKey: string;
  title: string;
  subtitle?: string;
  content: Record<string, any>;
}

export const HomepageContentEntitySchema = BaseEntitySchema.extend({
  sectionKey: z.string().min(1, 'Section key is required'),
  title: z.string().min(1, 'Title is required'),
  subtitle: z.string().optional(),
  content: z.record(z.string(), z.any()),
});

// ==========================================
// 20. Contact Messages
// ==========================================
export interface ContactMessageEntity extends BaseEntity {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  resolved: boolean;
}

export const ContactMessageEntitySchema = BaseEntitySchema.extend({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(1, 'Message is required'),
  resolved: z.boolean().default(false),
});

// ==========================================
// 21. Analytics
// ==========================================
export interface AnalyticsEntity extends BaseEntity {
  event: string;
  userId?: string;
  sessionId: string;
  payload: Record<string, any>;
  device: string;
  ip?: string;
}

export const AnalyticsEntitySchema = BaseEntitySchema.extend({
  event: z.string().min(1, 'Event name is required'),
  userId: z.string().optional(),
  sessionId: z.string().min(1, 'Session ID is required'),
  payload: z.record(z.string(), z.any()),
  device: z.string().min(1, 'Device details are required'),
  ip: z.string().optional(),
});

// ==========================================
// Authentication Schemas
// ==========================================
export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phoneNumber: z.string().optional(),
  location: z.string().optional(),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// ==========================================
// Repository Generic Abstractions
// ==========================================
export interface BaseRepository<T> {
  getById(id: string): Promise<T | null>;
  create(id: string, item: T): Promise<void>;
  update(id: string, item: Partial<T>): Promise<void>;
  delete(id: string): Promise<void>;
}

// ==========================================
// Audit Logs Schema (for security auditing)
// ==========================================
export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  timestamp: string;
  details?: Record<string, any>;
  ipAddress?: string;
}

export const AuditLogSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  action: z.string(),
  timestamp: z.string(),
  details: z.record(z.string(), z.any()).optional(),
  ipAddress: z.string().optional(),
});

// ==========================================
// Enterprise Factory & Mapper Abstractions
// ==========================================
export class EntityFactory {
  static createBase(createdBy = 'system', status = 'active'): BaseEntity {
    const now = new Date().toISOString();
    return {
      id: '',
      createdAt: now,
      updatedAt: now,
      createdBy,
      updatedBy: createdBy,
      status,
      isDeleted: false,
      version: 1,
    };
  }

  static createProduct(params: Partial<ProductEntity>, userId = 'system'): ProductEntity {
    return {
      ...this.createBase(userId),
      name: '',
      category: '',
      price: 0,
      mrp: 0,
      sku: '',
      rating: 0,
      reviewsCount: 0,
      image: '',
      images: [],
      description: '',
      shortDescription: '',
      features: [],
      benefits: [],
      usageInstructions: [],
      weightVariants: [],
      stockStatus: 'In Stock',
      inStock: true,
      ...params,
    } as ProductEntity;
  }

  static createOrder(params: Partial<OrderEntity>, userId: string): OrderEntity {
    return {
      ...this.createBase(userId),
      userId,
      orderNumber: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      shippingAddressId: '',
      billingAddressId: '',
      subtotal: 0,
      discountAmount: 0,
      taxAmount: 0,
      shippingCost: 0,
      totalAmount: 0,
      ...params,
    } as OrderEntity;
  }
}









