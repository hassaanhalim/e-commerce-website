import { apiRequest } from "./api";
import type {
  BackendOrder,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PublicOrderTrackingResult,
} from "../types/order";

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const orderApi = {
  // Customer endpoints
  createOrder: (data: {
    checkoutSessionId: string;
    paymentMethod: PaymentMethod;
    customerNotes?: string;
  }) =>
    apiRequest<BackendOrder>("/orders", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getCustomerOrders: (params?: { status?: OrderStatus; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const query = searchParams.toString();
    return apiRequest<PaginatedResult<BackendOrder>>(`/orders${query ? `?${query}` : ""}`, {
      method: "GET",
    });
  },

  getCustomerOrderById: (id: string) =>
    apiRequest<BackendOrder>(`/orders/${id}`, { method: "GET" }),

  cancelCustomerOrder: (id: string, reason?: string) =>
    apiRequest<BackendOrder>(`/orders/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  executeMockPayment: (id: string, success: boolean, failureReason?: string) =>
    apiRequest<BackendOrder>(`/orders/${id}/payments/mock`, {
      method: "POST",
      body: JSON.stringify({ success, failureReason }),
    }),

  // Public Guest Tracking
  trackOrderPublic: (orderNumber: string, verificationInput: string) =>
    apiRequest<PublicOrderTrackingResult>("/order-tracking", {
      method: "POST",
      body: JSON.stringify({ orderNumber, verificationInput }),
    }),

  // Admin endpoints
  getAdminOrders: (params?: {
    search?: string;
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    paymentMethod?: PaymentMethod;
    page?: number;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set("search", params.search);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.paymentStatus) searchParams.set("paymentStatus", params.paymentStatus);
    if (params?.paymentMethod) searchParams.set("paymentMethod", params.paymentMethod);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const query = searchParams.toString();
    return apiRequest<PaginatedResult<BackendOrder>>(`/admin/orders${query ? `?${query}` : ""}`, {
      method: "GET",
    });
  },

  getAdminOrderById: (id: string) =>
    apiRequest<BackendOrder>(`/admin/orders/${id}`, { method: "GET" }),

  updateOrderStatusByAdmin: (id: string, status: OrderStatus, note?: string) =>
    apiRequest<BackendOrder>(`/admin/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, note }),
    }),

  updatePaymentStatusByAdmin: (id: string, status: PaymentStatus) =>
    apiRequest<BackendOrder>(`/admin/orders/${id}/payment-status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};
