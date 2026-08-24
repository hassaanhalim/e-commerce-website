import { apiRequest } from "./api";
import type {
  BackendCart,
  GuestCartMergeItem,
} from "../types/cart";

export const cartApi = {
  getCart: () => apiRequest<BackendCart>("/cart", { method: "GET" }),

  /**
   * The backend POST /cart/items returns the authoritative BackendCart.
   * If an older backend returns raw CartItem, we fall back to getCart().
   */
  addItem: async (
    variantId: string,
    quantity: number,
    productId?: string,
  ): Promise<BackendCart> => {
    const response = await apiRequest<any>("/cart/items", {
      method: "POST",
      body: JSON.stringify({ variantId, quantity, ...(productId ? { productId } : {}) }),
    });

    if (response && Array.isArray(response.items) && typeof response.cartId === "string") {
      return response as BackendCart;
    }
    return apiRequest<BackendCart>("/cart", { method: "GET" });
  },

  updateItem: async (itemId: string, quantity: number): Promise<BackendCart | object> => {
    return apiRequest<any>(`/cart/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    });
  },

  removeItem: (itemId: string) =>
    apiRequest<void>(`/cart/items/${itemId}`, { method: "DELETE" }),

  clearCart: () => apiRequest<void>("/cart", { method: "DELETE" }),

  mergeCart: (items: GuestCartMergeItem[]) =>
    apiRequest<BackendCart>("/cart/merge", {
      method: "POST",
      body: JSON.stringify({ items }),
    }),
};
