import { apiRequest } from "./api";

export interface BackendWishlist {
  wishlistId: string;
  products: BackendWishlistProduct[];
  count: number;
}

export interface BackendWishlistProduct {
  id: string;
  name: string;
  slug: string;
  productCode: string;
  brand: string;
  category: string;
  price: number;
  salePrice: number | null;
  displayPrice: number;
  image: string;
  sizes: number[];
  colors: string[];
  availableQuantity: number;
  inStock: boolean;
  isNew: boolean;
  isFeatured: boolean;
}

export const wishlistApi = {
  getWishlist: () => apiRequest<BackendWishlist>("/wishlist", { method: "GET" }),

  addItem: (productId: string) =>
    apiRequest<BackendWishlist>("/wishlist/items", {
      method: "POST",
      body: JSON.stringify({ productId }),
    }),

  removeItem: (productId: string) =>
    apiRequest<void>(`/wishlist/items/${productId}`, { method: "DELETE" }),

  clearWishlist: () => apiRequest<void>("/wishlist", { method: "DELETE" }),

  mergeWishlist: (productIds: string[]) =>
    apiRequest<BackendWishlist>("/wishlist/merge", {
      method: "POST",
      body: JSON.stringify({ productIds }),
    }),
};
