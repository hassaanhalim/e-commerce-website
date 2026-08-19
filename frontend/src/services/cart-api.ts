import { apiRequest } from "./api";
import type {
  BackendCart,
  GuestCartMergeItem,
} from "../types/cart";

export const cartApi = {
  getCart: () => apiRequest<BackendCart>("/cart", { method: "GET" }),

  /**
   * The backend POST /cart/items returns only the raw CartItem DB record
   * ({ id, cartId, variantId, quantity }), not a full BackendCart.
   * We follow up with getCart() so the caller always receives a BackendCart
   * with the expected { cartId, items, subtotal, itemCount } shape.
   */
  addItem: async (
    variantId: string,
    quantity: number,
    productId?: string,
  ): Promise<BackendCart> => {
    await apiRequest<unknown>("/cart/items", {
      method: "POST",
      body: JSON.stringify({ variantId, quantity, ...(productId ? { productId } : {}) }),
    });
    return apiRequest<BackendCart>("/cart", { method: "GET" });
  },

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
