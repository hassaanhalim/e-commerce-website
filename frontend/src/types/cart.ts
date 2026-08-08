// Backend cart item returned from API
export interface BackendCartItem {
  itemId: string;
  productId: string;
  productSlug: string;
  productName: string;
  productImage: string;
  variantId: string;
  sku: string;
  size: number;
  color: string;
  unitPrice: number;
  quantity: number;
  availableQuantity: number;
  inStock: boolean;
  lineTotal: number;
  availabilityWarning?: string;
}

export interface BackendCart {
  cartId: string;
  items: BackendCartItem[];
  subtotal: number;
  itemCount: number;
}

// Legacy guest cart item (localStorage)
export interface CartItem {
  id: string;
  productId: string;
  name: string;
  image: string;
  price: number;
  size: number;
  color: string;
  quantity: number;
  stock: number;
  // optional fields for backend-aware items
  variantId?: string;
  itemId?: string;
  availableQuantity?: number;
}

export type AddCartItem = Omit<CartItem, "id" | "quantity">;

// Guest merge payload item
export interface GuestCartMergeItem {
  variantId: string;
  quantity: number;
}