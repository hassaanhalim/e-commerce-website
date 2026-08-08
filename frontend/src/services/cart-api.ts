import { apiRequest } from "./api";
import type {
  BackendCart,
  GuestCartMergeItem,
} from "../types/cart";

export const cartApi = {
  getCart: () => apiRequest<BackendCart>("/cart", { method: "GET" }),

  addItem: (variantId: string, quantity: number, productId?: string) =>
    apiRequest<BackendCart>("/cart/items", {
      method: "POST",
      body: JSON.stringify({ variantId, quantity, ...(productId ? { productId } : {}) }),
    }),

  updateItem: (itemId: string, quantity: number) =>
    apiRequest<object>(`/cart/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    }),

  removeItem: (itemId: string) =>
    apiRequest<void>(`/cart/items/${itemId}`, { method: "DELETE" }),

  clearCart: () => apiRequest<void>("/cart", { method: "DELETE" }),

  mergeCart: (items: GuestCartMergeItem[]) =>
    apiRequest<BackendCart>("/cart/merge", {
      method: "POST",
      body: JSON.stringify({ items }),
    }),
};
