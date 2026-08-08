import { apiRequest } from "./api";
import type { PublicReview, RatingSummary, ReviewItem, ReviewStatus } from "../types/review";
import type { PaginatedResult } from "./order-api";

export const reviewApi = {
  // Customer endpoints
  createReview: (data: {
    orderItemId: string;
    rating: number;
    title?: string;
    comment: string;
  }) =>
    apiRequest<ReviewItem>("/reviews", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateMyReview: (
    id: string,
    data: { rating: number; title?: string; comment: string },
  ) =>
    apiRequest<ReviewItem>(`/reviews/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  getMyReviews: (params?: { page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const query = searchParams.toString();
    return apiRequest<PaginatedResult<ReviewItem>>(`/reviews/me${query ? `?${query}` : ""}`, {
      method: "GET",
    });
  },

  checkEligibility: (orderItemId: string) =>
    apiRequest<{ eligible: boolean; orderItemId: string; productId: string; productName: string }>(
      `/reviews/eligibility/${orderItemId}`,
      { method: "GET" },
    ),

  // Public endpoints
  getProductReviews: (productId: string, params?: { rating?: number; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.rating) searchParams.set("rating", String(params.rating));
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const query = searchParams.toString();
    return apiRequest<PaginatedResult<PublicReview>>(`/products/${productId}/reviews${query ? `?${query}` : ""}`, {
      method: "GET",
    });
  },

  getRatingSummary: (productId: string) =>
    apiRequest<RatingSummary>(`/products/${productId}/rating-summary`, { method: "GET" }),

  // Admin endpoints
  getAdminReviews: (params?: {
    search?: string;
    status?: ReviewStatus;
    rating?: number;
    productId?: string;
    page?: number;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set("search", params.search);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.rating) searchParams.set("rating", String(params.rating));
    if (params?.productId) searchParams.set("productId", params.productId);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const query = searchParams.toString();
    return apiRequest<PaginatedResult<ReviewItem>>(`/admin/reviews${query ? `?${query}` : ""}`, {
      method: "GET",
    });
  },

  moderateReview: (id: string, status: "APPROVED" | "REJECTED", moderationNote?: string) =>
    apiRequest<ReviewItem>(`/admin/reviews/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, moderationNote }),
    }),
};
