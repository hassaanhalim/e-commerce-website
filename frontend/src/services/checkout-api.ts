import { apiRequest } from "./api";
import type {
  BackendAddress,
  CreateAddressInput,
  CheckoutPreviewResult,
  CheckoutSession,
} from "../types/auth";

export const addressApi = {
  getAddresses: () => apiRequest<BackendAddress[]>("/addresses", { method: "GET" }),

  createAddress: (data: CreateAddressInput) =>
    apiRequest<BackendAddress>("/addresses", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateAddress: (id: string, data: Partial<CreateAddressInput>) =>
    apiRequest<BackendAddress>(`/addresses/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteAddress: (id: string) =>
    apiRequest<void>(`/addresses/${id}`, { method: "DELETE" }),

  setDefault: (id: string) =>
    apiRequest<BackendAddress>(`/addresses/${id}/default`, { method: "PATCH" }),
};

export const checkoutApi = {
  preview: (shippingAddressId: string, shippingMethod: string) =>
    apiRequest<CheckoutPreviewResult>("/checkout/preview", {
      method: "POST",
      body: JSON.stringify({ shippingAddressId, shippingMethod }),
    }),

  createSession: (data: {
    shippingAddressId: string;
    billingAddressId?: string;
    shippingMethod: string;
  }) =>
    apiRequest<CheckoutSession>("/checkout/sessions", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getSession: (id: string) =>
    apiRequest<CheckoutSession>(`/checkout/sessions/${id}`, { method: "GET" }),

  cancelSession: (id: string) =>
    apiRequest<{ message: string; sessionId: string }>(
      `/checkout/sessions/${id}/cancel`,
      { method: "POST" },
    ),
};
