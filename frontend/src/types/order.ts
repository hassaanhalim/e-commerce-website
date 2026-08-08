export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export type PaymentMethod = "CASH_ON_DELIVERY" | "MOCK_ONLINE";

export interface OrderItemSnapshot {
  id: string;
  orderId: string;
  productId: string;
  variantId: string;
  productNameSnapshot: string;
  productCodeSnapshot: string;
  productSlugSnapshot: string;
  skuSnapshot: string;
  sizeSnapshot?: number | null;
  colorSnapshot?: string | null;
  imageSnapshot?: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  createdAt: string;
}

export interface OrderStatusHistoryItem {
  id: string;
  orderId: string;
  fromStatus?: OrderStatus | null;
  toStatus: OrderStatus;
  note?: string | null;
  changedById?: string | null;
  changedBy?: { id: string; fullName: string; email?: string } | null;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  provider?: string | null;
  providerReference?: string | null;
  failureReason?: string | null;
  paidAt?: string | null;
  refundedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderAddressSnapshot {
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  stateOrProvince?: string | null;
  postalCode?: string | null;
  country: string;
}

export interface BackendOrder {
  id: string;
  orderNumber: string;
  userId: string;
  checkoutSessionId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  customerEmail: string;
  customerPhone: string;
  shippingAddressSnapshot: OrderAddressSnapshot;
  billingAddressSnapshot?: OrderAddressSnapshot | null;
  shippingMethod: string;
  subtotal: number;
  shippingAmount: number;
  discountAmount: number;
  total: number;
  customerNotes?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItemSnapshot[];
  payments: PaymentRecord[];
  statusHistory?: OrderStatusHistoryItem[];
  user?: { id: string; fullName: string; email: string; phone?: string | null };
}

export interface PublicOrderTrackingResult {
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  shippingMethod: string;
  total: number;
  itemCount: number;
  itemsSummary: Array<{
    productName: string;
    sku: string;
    size?: number | null;
    color?: string | null;
    quantity: number;
  }>;
  timeline: Array<{
    status: OrderStatus;
    timestamp: string;
    note?: string | null;
  }>;
  createdAt: string;
  updatedAt: string;
}
