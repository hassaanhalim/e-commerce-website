export interface BackendAddress {
  id: string;
  label: string | null;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  stateOrProvince: string | null;
  postalCode: string | null;
  country: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAddressInput {
  label?: string;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateOrProvince?: string;
  postalCode?: string;
  country: string;
  isDefault?: boolean;
}

export interface CheckoutPreviewResult {
  validationErrors: string[];
  isValid: boolean;
  shippingMethod: string;
  lineItems: CheckoutLineItem[];
  subtotal: number;
  shippingAmount: number;
  discountAmount: number;
  total: number;
  shippingAddress: Partial<BackendAddress>;
}

export interface CheckoutLineItem {
  variantId: string;
  productName: string;
  productCode: string;
  sku: string;
  size: number;
  color: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  availableQuantity: number;
}

export interface CheckoutSession {
  id: string;
  shippingMethod: string;
  subtotal: number;
  shippingAmount: number;
  discountAmount: number;
  total: number;
  status: "ACTIVE" | "CONSUMED" | "EXPIRED" | "CANCELLED";
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  shippingAddress: Partial<BackendAddress>;
  billingAddress: Partial<BackendAddress> | null;
  items: CheckoutSessionItem[];
}

export interface CheckoutSessionItem {
  id: string;
  productId: string;
  variantId: string;
  quantity: number;
  productNameSnapshot: string;
  productCodeSnapshot: string;
  skuSnapshot: string;
  sizeSnapshot: number;
  colorSnapshot: string;
  unitPrice: number;
  lineTotal: number;
}

// Legacy SavedAddress for backward compatibility with existing components
export interface SavedAddress {
  id: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  province: string;
  postalCode?: string;
  isDefault: boolean;
}

export type UserRole = "CUSTOMER" | "ADMIN";

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginUserInput {
  email: string;
  password: string;
}

export interface RegisterUserInput {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
}