import { apiRequest } from "./api";
import type {
  ReturnEligibilityResult,
  ReturnRequestItem,
  ReturnRequestStatus,
  ReturnRequestType,
} from "../types/return";
import type { PaginatedResult } from "./order-api";

export const returnApi = {
  // Customer endpoints
  createReturnRequest: (data: {
    orderItemId: string;
    type: ReturnRequestType;
    quantity: number;
    reason: string;
    customerNotes?: string;
    replacementVariantId?: string;
  }) =>
    apiRequest<ReturnRequestItem>("/returns", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getMyReturnRequests: (params?: { status?: ReturnRequestStatus; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const query = searchParams.toString();
    return apiRequest<PaginatedResult<ReturnRequestItem>>(`/returns${query ? `?${query}` : ""}`, {
      method: "GET",
    });
  },

  getEligibility: (orderItemId: string) =>
    apiRequest<ReturnEligibilityResult>(`/returns/eligibility/${orderItemId}`, {
      method: "GET",
    }),

  getMyReturnById: (id: string) =>
    apiRequest<ReturnRequestItem>(`/returns/${id}`, { method: "GET" }),

  cancelCustomerReturn: (id: string) =>
    apiRequest<ReturnRequestItem>(`/returns/${id}/cancel`, { method: "POST" }),

  // Admin endpoints
  getAdminReturns: (params?: {
    search?: string;
    type?: ReturnRequestType;
    status?: ReturnRequestStatus;
    page?: number;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set("search", params.search);
    if (params?.type) searchParams.set("type", params.type);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const query = searchParams.toString();
    return apiRequest<PaginatedResult<ReturnRequestItem>>(`/admin/returns${query ? `?${query}` : ""}`, {
      method: "GET",
    });
  },

  getAdminReturnById: (id: string) =>
    apiRequest<ReturnRequestItem>(`/admin/returns/${id}`, { method: "GET" }),

  updateReturnStatusByAdmin: (
    id: string,
    status: ReturnRequestStatus,
    adminNotes?: string,
  ) =>
    apiRequest<ReturnRequestItem>(`/admin/returns/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, adminNotes }),
    }),
};
