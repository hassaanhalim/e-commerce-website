import { apiRequest } from "./api";
import type { PaginatedResult } from "./order-api";

export type CustomerActivityType =
  | "CHAT_MESSAGE"
  | "ORDER_PLACED"
  | "REVIEW_SUBMITTED"
  | "RETURN_REQUESTED"
  | "ACCOUNT_CREATED";

export interface CompactProductDto {
  id: string;
  name: string;
  slug: string;
  brand: string;
  category: string;
  price: number;
  salePrice: number | null;
  displayPrice: number;
  image: string;
  inStock: boolean;
  availableSizes: number[];
}

export interface CustomerConversationSummary {
  id: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessageAt: string;
  lastMessageSnippet: string | null;
}

export interface CustomerChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  products?: CompactProductDto[];
}

export interface CustomerConversationDetail {
  id: string;
  customerId: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  messages: CustomerChatMessage[];
}

export interface BackendCustomerConversationsResponse {
  customerId: string;
  totalConversations: number;
  latestConversationAt: string | null;
  conversations: CustomerConversationSummary[];
}

export interface BackendCustomerItem {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  orderCount: number;
  reviewCount: number;
  returnCount: number;
  totalSpent: number;
  lastActivityAt?: string;
  lastActivityType?: CustomerActivityType;
}

export interface BackendCustomerDetail extends BackendCustomerItem {
  conversationCount?: number;
  addresses: Array<{

    id: string;
    label?: string | null;
    recipientName: string;
    phone: string;
    addressLine1: string;
    city: string;
    country: string;
    isDefault: boolean;
  }>;
  orders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    paymentMethod: string;
    total: number;
    createdAt: string;
  }>;
  reviews: Array<{
    id: string;
    rating: number;
    title?: string | null;
    comment: string;
    status: string;
    createdAt: string;
    product?: { id: string; name: string; slug: string };
  }>;
  returnRequests: Array<{
    id: string;
    requestNumber: string;
    type: string;
    status: string;
    refundAmount: number;
    reason: string;
    createdAt: string;
  }>;
}

export interface BackendStaffItem {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BackendAuditLogItem {
  id: string;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  description: string;
  metadata?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  actorUser?: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  } | null;
}

export interface BackendDashboardSummary {
  totalCustomers: number;
  newCustomers: number;
  totalOrders: number;
  ordersByStatus: Record<string, number>;
  grossPaidRevenue: number;
  refundedAmount: number;
  netRevenue: number;
  pendingPaymentAmount: number;
  averageOrderValue: number;
  products: number;
  activeProducts: number;
  totalVariants: number;
  lowStockVariants: number;
  outOfStockVariants: number;
  pendingReviews: number;
  openReturns: number;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    customerEmail: string;
    status: string;
    paymentStatus: string;
    total: number;
    createdAt: string;
    user?: { fullName: string };
  }>;
  recentInventoryAdjustments: Array<any>;
}

export const adminApi = {
  // Dashboard
  getDashboardSummary: (params?: { from?: string; to?: string }) => {
    const sp = new URLSearchParams();
    if (params?.from) sp.set("from", params.from);
    if (params?.to) sp.set("to", params.to);
    const q = sp.toString();
    return apiRequest<BackendDashboardSummary>(`/admin/dashboard/summary${q ? `?${q}` : ""}`, {
      method: "GET",
    });
  },

  // Customers
  getCustomers: (params?: { search?: string; isActive?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.search) sp.set("search", params.search);
    if (params?.isActive) sp.set("isActive", params.isActive);
    if (params?.from) sp.set("from", params.from);
    if (params?.to) sp.set("to", params.to);
    if (params?.page) sp.set("page", String(params.page));
    if (params?.limit) sp.set("limit", String(params.limit));
    const q = sp.toString();
    return apiRequest<PaginatedResult<BackendCustomerItem>>(`/admin/customers${q ? `?${q}` : ""}`, {
      method: "GET",
    });
  },

  getCustomerById: (id: string) =>
    apiRequest<BackendCustomerDetail>(`/admin/customers/${id}`, { method: "GET" }),

  getCustomerConversations: (id: string) =>
    apiRequest<BackendCustomerConversationsResponse>(`/admin/customers/${id}/conversations`, {
      method: "GET",
    }),

  getCustomerConversationById: (customerId: string, conversationId: string) =>
    apiRequest<CustomerConversationDetail>(
      `/admin/customers/${customerId}/conversations/${conversationId}`,
      { method: "GET" },
    ),

  updateCustomerStatus: (id: string, isActive: boolean) =>

    apiRequest<BackendCustomerItem>(`/admin/customers/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    }),

  // Staff
  getStaff: (search?: string) => {
    const q = search ? `?search=${encodeURIComponent(search)}` : "";
    return apiRequest<BackendStaffItem[]>(`/admin/staff${q}`, { method: "GET" });
  },

  getStaffById: (id: string) =>
    apiRequest<BackendStaffItem>(`/admin/staff/${id}`, { method: "GET" }),

  createStaff: (data: { fullName: string; email: string; password: string; phone?: string }) =>
    apiRequest<BackendStaffItem>("/admin/staff", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateStaff: (id: string, data: { fullName?: string; phone?: string; role?: string }) =>
    apiRequest<BackendStaffItem>(`/admin/staff/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  updateStaffStatus: (id: string, isActive: boolean) =>
    apiRequest<BackendStaffItem>(`/admin/staff/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    }),

  // Audit Logs
  getAuditLogs: (params?: {
    actorUserId?: string;
    action?: string;
    entityType?: string;
    search?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) => {
    const sp = new URLSearchParams();
    if (params?.actorUserId) sp.set("actorUserId", params.actorUserId);
    if (params?.action) sp.set("action", params.action);
    if (params?.entityType) sp.set("entityType", params.entityType);
    if (params?.search) sp.set("search", params.search);
    if (params?.from) sp.set("from", params.from);
    if (params?.to) sp.set("to", params.to);
    if (params?.page) sp.set("page", String(params.page));
    if (params?.limit) sp.set("limit", String(params.limit));
    const q = sp.toString();
    return apiRequest<PaginatedResult<BackendAuditLogItem>>(`/admin/audit-logs${q ? `?${q}` : ""}`, {
      method: "GET",
    });
  },

  getAuditLogById: (id: string) =>
    apiRequest<BackendAuditLogItem>(`/admin/audit-logs/${id}`, { method: "GET" }),

  // Reports
  getSalesReport: (params?: { from?: string; to?: string; groupBy?: string }) => {
    const sp = new URLSearchParams();
    if (params?.from) sp.set("from", params.from);
    if (params?.to) sp.set("to", params.to);
    if (params?.groupBy) sp.set("groupBy", params.groupBy);
    const q = sp.toString();
    return apiRequest<any>(`/admin/reports/sales${q ? `?${q}` : ""}`, { method: "GET" });
  },

  getOrdersReport: (params?: { from?: string; to?: string }) => {
    const sp = new URLSearchParams();
    if (params?.from) sp.set("from", params.from);
    if (params?.to) sp.set("to", params.to);
    const q = sp.toString();
    return apiRequest<any>(`/admin/reports/orders${q ? `?${q}` : ""}`, { method: "GET" });
  },

  getProductsReport: (params?: { from?: string; to?: string }) => {
    const sp = new URLSearchParams();
    if (params?.from) sp.set("from", params.from);
    if (params?.to) sp.set("to", params.to);
    const q = sp.toString();
    return apiRequest<any>(`/admin/reports/products${q ? `?${q}` : ""}`, { method: "GET" });
  },

  getInventoryReport: () =>
    apiRequest<any>("/admin/reports/inventory", { method: "GET" }),

  getCustomersReport: (params?: { from?: string; to?: string }) => {
    const sp = new URLSearchParams();
    if (params?.from) sp.set("from", params.from);
    if (params?.to) sp.set("to", params.to);
    const q = sp.toString();
    return apiRequest<any>(`/admin/reports/customers${q ? `?${q}` : ""}`, { method: "GET" });
  },

  getReturnsReport: (params?: { from?: string; to?: string }) => {
    const sp = new URLSearchParams();
    if (params?.from) sp.set("from", params.from);
    if (params?.to) sp.set("to", params.to);
    const q = sp.toString();
    return apiRequest<any>(`/admin/reports/returns${q ? `?${q}` : ""}`, { method: "GET" });
  },
};
