import { apiRequest } from "../api";
import type { AdminBrand, AdminCategory, AdminProduct } from "../../types/admin";

export interface AdminQueryFilter {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  categoryId?: string;
  brandId?: string;
}

export interface AdminInventoryQuery {
  page?: number;
  limit?: number;
  search?: string;
  productId?: string;
  sku?: string;
  lowStock?: boolean;
  outOfStock?: boolean;
}

export interface AdminInventoryRow {
  variantId: string;
  productId: string;
  productName: string;
  productCode: string;
  sku: string;
  size: number;
  color: string;
  isActive: boolean;
  quantityOnHand: number;
  reservedQuantity: number;
  availableQuantity: number;
  inStock: boolean;
  lowStockThreshold: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
  updatedAt: string;
}

export interface InventoryAdjustmentRecord {
  id: string;
  type: string;
  onHandDelta: number;
  reservedDelta: number;
  beforeOnHand: number;
  afterOnHand: number;
  beforeReserved: number;
  afterReserved: number;
  reason: string;
  performedBy: {
    id: string;
    fullName: string;
    email: string;
  };
  createdAt: string;
}

export interface AdminPaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const catalogAdminApi = {
  // Categories
  getCategories: (params: AdminQueryFilter = {}) => {
    const q = new URLSearchParams();
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    if (params.search?.trim()) q.set("search", params.search.trim());
    if (params.isActive !== undefined) q.set("isActive", String(params.isActive));
    return apiRequest<AdminPaginatedResponse<AdminCategory>>(`/admin/categories?${q.toString()}`);
  },

  getCategoryById: (id: string) =>
    apiRequest<AdminCategory>(`/admin/categories/${id}`),

  createCategory: (data: { name: string; slug?: string; description?: string; isActive?: boolean }) =>
    apiRequest<AdminCategory>("/admin/categories", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateCategory: (id: string, data: { name?: string; slug?: string; description?: string; isActive?: boolean }) =>
    apiRequest<AdminCategory>(`/admin/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // Brands
  getBrands: (params: AdminQueryFilter = {}) => {
    const q = new URLSearchParams();
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    if (params.search?.trim()) q.set("search", params.search.trim());
    if (params.isActive !== undefined) q.set("isActive", String(params.isActive));
    return apiRequest<AdminPaginatedResponse<AdminBrand>>(`/admin/brands?${q.toString()}`);
  },

  getBrandById: (id: string) =>
    apiRequest<AdminBrand>(`/admin/brands/${id}`),

  createBrand: (data: { name: string; slug?: string; description?: string; isActive?: boolean }) =>
    apiRequest<AdminBrand>("/admin/brands", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateBrand: (id: string, data: { name?: string; slug?: string; description?: string; isActive?: boolean }) =>
    apiRequest<AdminBrand>(`/admin/brands/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // Products
  getProducts: async (params: AdminQueryFilter = {}): Promise<AdminPaginatedResponse<AdminProduct>> => {
    const q = new URLSearchParams();
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    if (params.search?.trim()) q.set("search", params.search.trim());
    if (params.isActive !== undefined) q.set("isActive", String(params.isActive));
    if (params.categoryId) q.set("categoryId", params.categoryId);
    if (params.brandId) q.set("brandId", params.brandId);

    const raw = await apiRequest<any>(`/admin/products?${q.toString()}`);
    const rawItems: any[] = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
    const meta = raw?.meta || {
      total: rawItems.length,
      page: params.page || 1,
      limit: params.limit || 20,
      totalPages: Math.ceil(rawItems.length / (params.limit || 20)) || 1,
    };

    const data: AdminProduct[] = rawItems.map((item) => ({
      id: String(item.id),
      productCode: item.productCode || item.sku || "",
      name: item.name || "Product",
      slug: item.slug || "",
      brand: typeof item.brand === "object" && item.brand ? item.brand.name || "" : (item.brand || ""),
      category: typeof item.category === "object" && item.category ? item.category.name || "" : (item.category || ""),
      gender: item.gender || "Unisex",
      price: item.basePrice ?? (item.price ?? 0),
      basePrice: item.basePrice ?? (item.price ?? 0),
      salePrice: item.salePrice ?? null,
      displayPrice: item.displayPrice ?? (item.salePrice ?? (item.basePrice ?? item.price ?? 0)),
      image: item.images?.[0]?.url || item.image || "https://placehold.co/600x400?text=No+Image",
      sizes: (item.variants || []).map((v: any) => v.size),
      colors: (item.variants || []).map((v: any) => v.color),
      rating: item.rating ?? 0,
      reviewCount: item.reviewCount ?? 0,
      stock: 0,
      isNew: item.isNew ?? false,
      isFeatured: item.isFeatured ?? false,
      isActive: item.isActive ?? true,
      description: item.description || "",
      sku: item.productCode || item.sku || "",
      categoryId: item.categoryId || "",
      brandId: item.brandId || "",
      variants: item.variants || [],
      images: item.images || [],
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    return {
      data,
      meta,
    };
  },

  getProductById: async (id: string): Promise<AdminProduct> => {
    const item = await apiRequest<any>(`/admin/products/${id}`);

    return {
      id: String(item.id),
      productCode: item.productCode || item.sku || "",
      name: item.name || "Product",
      slug: item.slug || "",
      brand: typeof item.brand === "object" && item.brand ? item.brand.name || "" : (item.brand || ""),
      category: typeof item.category === "object" && item.category ? item.category.name || "" : (item.category || ""),
      gender: item.gender || "Unisex",
      price: item.basePrice ?? (item.price ?? 0),
      basePrice: item.basePrice ?? (item.price ?? 0),
      salePrice: item.salePrice ?? null,
      displayPrice: item.displayPrice ?? (item.salePrice ?? (item.basePrice ?? item.price ?? 0)),
      image: item.images?.[0]?.url || item.image || "https://placehold.co/600x400?text=No+Image",
      sizes: (item.variants || []).map((v: any) => v.size),
      colors: (item.variants || []).map((v: any) => v.color),
      rating: item.rating ?? 0,
      reviewCount: item.reviewCount ?? 0,
      stock: 0,
      isNew: item.isNew ?? false,
      isFeatured: item.isFeatured ?? false,
      isActive: item.isActive ?? true,
      description: item.description || "",
      sku: item.productCode || item.sku || "",
      categoryId: item.categoryId || "",
      brandId: item.brandId || "",
      variants: item.variants || [],
      images: item.images || [],
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  },

  createProduct: (data: any) =>
    apiRequest<AdminProduct>("/admin/products", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateProduct: (id: string, data: any) =>
    apiRequest<AdminProduct>(`/admin/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  getInventory: async (params: AdminInventoryQuery = {}): Promise<AdminPaginatedResponse<AdminInventoryRow>> => {
    const q = new URLSearchParams();
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    if (params.search?.trim()) q.set("search", params.search.trim());
    if (params.productId) q.set("productId", params.productId);
    if (params.sku?.trim()) q.set("sku", params.sku.trim());
    if (params.lowStock !== undefined) q.set("lowStock", String(params.lowStock));
    if (params.outOfStock !== undefined) q.set("outOfStock", String(params.outOfStock));

    return apiRequest<AdminPaginatedResponse<AdminInventoryRow>>(`/admin/inventory?${q.toString()}`);
  },

  getInventoryItem: (variantId: string) => apiRequest<AdminInventoryRow>(`/admin/inventory/${variantId}`),

  getInventoryHistory: (variantId: string) => apiRequest<InventoryAdjustmentRecord[]>(`/admin/inventory/${variantId}/history`),

  adjustInventory: (variantId: string, data: { type: string; onHandDelta?: number; reservedDelta?: number; reason?: string }) =>
    apiRequest<AdminInventoryRow>(`/admin/inventory/${variantId}/adjust`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateInventoryThreshold: (variantId: string, data: { lowStockThreshold: number }) =>
    apiRequest<AdminInventoryRow>(`/admin/inventory/${variantId}/threshold`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};
