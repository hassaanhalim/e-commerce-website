/* ================================================================
   Admin-domain type definitions
   ================================================================ */

// ── Orders ──────────────────────────────────────────────────────

export type OrderStatus =
  | "Pending"
  | "Confirmed"
  | "Processing"
  | "Shipped"
  | "Delivered"
  | "Cancelled"
  | "Refunded";

export interface OrderItem {
  productId: string | number;
  name: string;
  image: string;
  size: number;
  color: string;
  quantity: number;
  unitPrice: number;
  exchangeSize?: number;
  exchangeColor?: string;
  stockProcessed?: boolean;
}

export interface OrderAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  province: string;
  postalCode?: string;
}

export interface Order {
  id: string;
  customerId: string | null; // null = guest
  customerEmail: string;
  customerName: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  discount: number;
  total: number;
  status: OrderStatus;
  paymentMethod: string;
  shippingAddress: OrderAddress;
  notes: string;
  couponCode?: string;
  createdAt: string; // ISO
  updatedAt: string;
}

// ── Customers ───────────────────────────────────────────────────

export interface Customer {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  type: "registered" | "guest";
  totalOrders: number;
  totalSpent: number;
  adminNotes: string;
  createdAt: string;
}

// ── Reviews ─────────────────────────────────────────────────────

export type ReviewStatus = "Pending" | "Approved" | "Rejected";

export interface Review {
  id: string;
  productId: string | number;
  productName: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  rating: number; // 1-5
  title: string;
  body: string;
  status: ReviewStatus;
  createdAt: string;
}

// ── Coupons ─────────────────────────────────────────────────────

export type CouponType = "percentage" | "fixed";

export interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  value: number; // percent (0-100) or fixed PKR amount
  minOrderAmount: number;
  maxUses: number;
  usedCount: number;
  isActive: boolean;
  expiresAt: string; // ISO
  createdAt: string;
}

// ── Returns ─────────────────────────────────────────────────────

export type ReturnStatus =
  | "Requested"
  | "Approved"
  | "Rejected"
  | "Received"
  | "Refunded";

export interface ReturnRequest {
  id: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  items: OrderItem[];
  reason: string;
  status: ReturnStatus;
  adminNotes: string;
  refundAmount: number;
  createdAt: string;
  updatedAt: string;
  type?: "return" | "exchange";
}

// ── Payments ────────────────────────────────────────────────────

export type PaymentStatus = "Completed" | "Pending" | "Failed" | "Refunded";

export interface PaymentRecord {
  id: string;
  orderId: string;
  customerName: string;
  amount: number;
  method: string;
  status: PaymentStatus;
  transactionRef?: string;
  createdAt: string;
}

// ── Content ─────────────────────────────────────────────────────

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  linkUrl: string;
  isActive: boolean;
  sortOrder: number;
}

export interface HomepageContent {
  heroHeading: string;
  heroSubheading: string;
  featuredCategoryIds: number[];
  banners: Banner[];
}

// ── Settings ────────────────────────────────────────────────────

export interface GeneralSettings {
  storeName: string;
  tagline: string;
  currency: string;
  timezone: string;
  logoUrl: string;
}

export interface ContactSettings {
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  province: string;
  country: string;
  postalCode: string;
  facebook: string;
  instagram: string;
  twitter: string;
}

export interface ShippingZone {
  id: string;
  name: string;
  regions: string[];
  flatRate: number;
}

export interface ShippingSettings {
  freeShippingThreshold: number;
  defaultRate: number;
  zones: ShippingZone[];
}

export interface PaymentMethodConfig {
  id: string;
  name: string;
  enabled: boolean;
  instructions: string;
}

export interface PaymentSettings {
  methods: PaymentMethodConfig[];
}

export interface PolicyBlock {
  id: string;
  title: string;
  slug: string;
  content: string;
  updatedAt: string;
}

// ── Newsletter ──────────────────────────────────────────────────

export interface NewsletterSubscriber {
  id: string;
  email: string;
  subscribedAt: string;
}

// ── Staff ───────────────────────────────────────────────────────

export interface StaffMember {
  id: string;
  fullName: string;
  email: string;
  role: "ADMIN";
  isActive: boolean;
  createdAt: string;
}

// ── Audit Log ───────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  timestamp: string; // ISO
}

// ── Admin Product (extends Product with admin fields) ───────────

export interface AdminProductVariant {
  id?: string;
  sku: string;
  size: number;
  color: string;
  price?: number | null;
  effectivePrice?: number;
  isActive: boolean;
  quantityOnHand?: number;
  reservedQuantity?: number;
  availableQuantity?: number;
  lowStockThreshold?: number;
  inStock?: boolean;
  initialStock?: number;
}

export interface AdminProductImage {
  id?: string;
  url: string;
  altText?: string | null;
  sortOrder?: number;
  isPrimary?: boolean;
}

export interface AdminProduct {
  id: string;
  productCode: string;
  name: string;
  slug: string;
  brand: string;
  category: string;
  gender: "Men" | "Women" | "Unisex" | "Kids";
  price: number;
  basePrice?: number;
  salePrice?: number | null;
  displayPrice?: number;
  image: string;
  sizes: number[];
  colors: string[];
  rating: number;
  reviewCount: number;
  stock?: number;
  isNew: boolean;
  isFeatured?: boolean;
  isActive: boolean;
  description: string;
  sku: string;
  categoryId?: string;
  brandId?: string;
  variants?: AdminProductVariant[];
  images?: AdminProductImage[];
  createdAt: string;
  updatedAt?: string;
}

// ── Category / Brand (admin-managed) ────────────────────────────

export interface AdminCategory {
  id: string;
  name: string;
  slug?: string;
  description: string;
  productCount: number;
  isActive: boolean;
}

export interface AdminBrand {
  id: string;
  name: string;
  slug?: string;
  description: string;
  productCount: number;
  isActive: boolean;
}

// ── Inventory Movements ──────────────────────────────────────────

export interface InventoryMovement {
  id: string;
  productId: string | number;
  productName: string;
  sku: string;
  size: number;
  color: string;
  quantity: number; // positive for addition, negative for subtraction
  type: "sale" | "return" | "exchange_in" | "exchange_out" | "adjustment";
  referenceId: string;
  createdAt: string;
}
