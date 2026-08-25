import { apiRequest } from "./api";
import type { Product, ProductGender } from "../types/product";

export interface PublicCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  productCount: number;
}

export interface PublicBrand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  productCount: number;
}

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  brand?: string;
  gender?: ProductGender;
  isFeatured?: boolean;
  isNew?: boolean;
  minPrice?: number;
  maxPrice?: number;
  size?: number;
  color?: string;
  sort?: "newest" | "price-asc" | "price-desc" | "name-asc" | "name-desc";
}

export interface PaginatedProductsResponse {
  data: Product[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ProductVariantDetail {
  id: string;
  sku: string;
  size: number;
  color: string;
  price: number | null;
  effectivePrice: number;
  isActive: boolean;
  availableQuantity: number;
  inStock: boolean;
}

export interface ProductImageDetail {
  id: string;
  url: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

export interface ProductDetailResponse extends Product {
  basePrice: number;
  displayPrice: number;
  categoryId: string;
  brandId: string;
  categoryObj: { id: string; name: string; slug: string };
  brandObj: { id: string; name: string; slug: string };
  variants: ProductVariantDetail[];
  images: ProductImageDetail[];
}

function getAvailableQuantity(item: any): number {
  if (typeof item?.availableQuantity === "number") {
    return Math.max(0, item.availableQuantity);
  }
  const inventory = item?.inventory;
  if (inventory) {
    const quantityOnHand = Number(inventory.quantityOnHand ?? 0);
    const reservedQuantity = Number(inventory.reservedQuantity ?? 0);
    return Math.max(0, quantityOnHand - reservedQuantity);
  }
  const qOnHand = Number(item?.quantityOnHand ?? 0);
  const qReserved = Number(item?.reservedQuantity ?? 0);
  return Math.max(0, qOnHand - qReserved);
}

// ── In-Memory Cache Structures ────────────────────────────────────────────────
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const CATEGORIES_TTL_MS = 5 * 60 * 1000; // 5 minutes
const BRANDS_TTL_MS = 5 * 60 * 1000; // 5 minutes
const PRODUCT_SLUG_TTL_MS = 60 * 1000; // 1 minute
const PRODUCTS_LIST_TTL_MS = 30 * 1000; // 30 seconds

let cachedCategories: CacheEntry<PublicCategory[]> | null = null;
let cachedBrands: CacheEntry<PublicBrand[]> | null = null;
const productSlugCache = new Map<string, CacheEntry<ProductDetailResponse>>();
const productsListCache = new Map<string, CacheEntry<PaginatedProductsResponse>>();

export const catalogApi = {
  getCategories: async (forceRefresh = false): Promise<PublicCategory[]> => {
    const now = Date.now();
    if (!forceRefresh && cachedCategories && cachedCategories.expiresAt > now) {
      return cachedCategories.data;
    }
    const categories = await apiRequest<PublicCategory[]>("/categories", { method: "GET" });
    cachedCategories = { data: categories, expiresAt: now + CATEGORIES_TTL_MS };
    return categories;
  },

  getBrands: async (forceRefresh = false): Promise<PublicBrand[]> => {
    const now = Date.now();
    if (!forceRefresh && cachedBrands && cachedBrands.expiresAt > now) {
      return cachedBrands.data;
    }
    const brands = await apiRequest<PublicBrand[]>("/brands", { method: "GET" });
    cachedBrands = { data: brands, expiresAt: now + BRANDS_TTL_MS };
    return brands;
  },

  getProducts: async (params: ProductQueryParams = {}, forceRefresh = false): Promise<PaginatedProductsResponse> => {
    const query = new URLSearchParams();

    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));
    if (params.search?.trim()) query.set("search", params.search.trim());
    if (params.category) query.set("category", params.category);
    if (params.brand) query.set("brand", params.brand);
    if (params.gender) query.set("gender", params.gender);
    if (params.isFeatured !== undefined) query.set("isFeatured", String(params.isFeatured));
    if (params.isNew !== undefined) query.set("isNew", String(params.isNew));
    if (params.minPrice !== undefined) query.set("minPrice", String(params.minPrice));
    if (params.maxPrice !== undefined) query.set("maxPrice", String(params.maxPrice));
    if (params.size !== undefined) query.set("size", String(params.size));
    if (params.color?.trim()) query.set("color", params.color.trim());
    if (params.sort) query.set("sort", params.sort);

    const queryString = query.toString();
    const cacheKey = queryString || "__default__";
    const now = Date.now();

    if (!forceRefresh) {
      const cached = productsListCache.get(cacheKey);
      if (cached && cached.expiresAt > now) {
        return cached.data;
      }
    }

    const path = `/products${queryString ? `?${queryString}` : ""}`;
    const raw = await apiRequest<any>(path, { method: "GET" });

    // Handle both wrapped response shape { data, meta } and direct array
    const rawItems: any[] = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
    const meta = raw?.meta || {
      total: rawItems.length,
      page: params.page || 1,
      limit: params.limit || 20,
      totalPages: Math.ceil(rawItems.length / (params.limit || 20)) || 1,
    };

    const data: Product[] = rawItems.map((item) => {
      const brandName = typeof item?.brand === "object" && item.brand ? item.brand.name || "" : (item?.brand || "");
      const categoryName = typeof item?.category === "object" && item.category ? item.category.name || "" : (item?.category || "");

      let primaryImage = item?.image || "";
      if (!primaryImage && Array.isArray(item?.images) && item.images.length > 0) {
        const primaryObj = item.images.find((img: any) => img?.isPrimary);
        primaryImage = primaryObj?.url || item.images[0]?.url || "";
      }

      return {
        id: String(item?.id || ""),
        name: item?.name || "Product",
        slug: item?.slug || "",
        productCode: item?.productCode || item?.sku || "",
        brand: brandName,
        category: categoryName,
        gender: item?.gender || "Unisex",
        price: item?.price ?? (item?.basePrice ?? 0),
        salePrice: item?.salePrice ?? null,
        displayPrice: item?.displayPrice ?? (item?.salePrice ?? (item?.basePrice ?? item?.price ?? 0)),
        image: primaryImage || "https://placehold.co/600x400?text=No+Image",
        sizes: Array.isArray(item?.sizes) ? item.sizes : [],
        colors: Array.isArray(item?.colors) ? item.colors : [],
        rating: item?.rating ?? 0,
        reviewCount: item?.reviewCount ?? 0,
        availableQuantity: Number(item?.availableQuantity ?? 0),
        inStock: Boolean(item?.inStock ?? Number(item?.availableQuantity ?? 0) > 0),
        isNew: item?.isNew ?? false,
        isFeatured: item?.isFeatured ?? false,
        description: item?.description || "",
      };
    });

    const result: PaginatedProductsResponse = {
      data,
      meta,
    };

    productsListCache.set(cacheKey, { data: result, expiresAt: now + PRODUCTS_LIST_TTL_MS });

    return result;
  },

  getProductBySlug: async (slug: string, forceRefresh = false): Promise<ProductDetailResponse> => {
    const normalizedSlug = slug.trim();
    const now = Date.now();

    if (!forceRefresh) {
      const cached = productSlugCache.get(normalizedSlug);
      if (cached && cached.expiresAt > now) {
        return cached.data;
      }
    }

    const raw = await apiRequest<any>(`/products/${encodeURIComponent(normalizedSlug)}`, { method: "GET" });

    const brandName = typeof raw?.brand === "object" && raw.brand ? raw.brand.name || "" : (raw?.brand || "");
    const categoryName = typeof raw?.category === "object" && raw.category ? raw.category.name || "" : (raw?.category || "");

    const images: ProductImageDetail[] = Array.isArray(raw?.images) ? raw.images : [];
    const primaryImageObj = images.find((img) => img?.isPrimary);
    const mainImageUrl = primaryImageObj?.url || images[0]?.url || raw?.image || "https://placehold.co/600x400?text=No+Image";

    const result: ProductDetailResponse = {
      id: String(raw?.id || ""),
      name: raw?.name || "Product",
      slug: raw?.slug || normalizedSlug,
      productCode: raw?.productCode || raw?.sku || "",
      brand: brandName,
      category: categoryName,
      gender: raw?.gender || "Unisex",
      price: raw?.basePrice ?? (raw?.price ?? 0),
      basePrice: raw?.basePrice ?? (raw?.price ?? 0),
      salePrice: raw?.salePrice ?? null,
      displayPrice: raw?.displayPrice ?? (raw?.salePrice ?? (raw?.basePrice ?? raw?.price ?? 0)),
      image: mainImageUrl,
      sizes: Array.isArray(raw?.sizes) ? raw.sizes : [],
      colors: Array.isArray(raw?.colors) ? raw.colors : [],
      rating: raw?.rating ?? 0,
      reviewCount: raw?.reviewCount ?? 0,
      availableQuantity: Number(raw?.availableQuantity ?? 0),
      inStock: Boolean(raw?.inStock ?? Number(raw?.availableQuantity ?? 0) > 0),
      isNew: raw?.isNew ?? false,
      isFeatured: raw?.isFeatured ?? false,
      description: raw?.description || "",
      categoryId: raw?.categoryId || "",
      brandId: raw?.brandId || "",
      categoryObj: typeof raw?.category === "object" && raw.category ? raw.category : { id: "", name: categoryName, slug: "" },
      brandObj: typeof raw?.brand === "object" && raw.brand ? raw.brand : { id: "", name: brandName, slug: "" },
      variants: Array.isArray(raw?.variants)
        ? raw.variants.map((variant: any) => ({
            ...variant,
            availableQuantity: getAvailableQuantity(variant),
            inStock: getAvailableQuantity(variant) > 0,
          }))
        : [],
      images,
    };

    productSlugCache.set(normalizedSlug, { data: result, expiresAt: now + PRODUCT_SLUG_TTL_MS });

    return result;
  },

  prefetchProduct: (slug: string): void => {
    if (!slug) return;
    const normalizedSlug = slug.trim();
    const cached = productSlugCache.get(normalizedSlug);
    if (!cached || cached.expiresAt <= Date.now()) {
      catalogApi.getProductBySlug(normalizedSlug).catch(() => {});
    }
  },

  clearCache: (): void => {
    cachedCategories = null;
    cachedBrands = null;
    productSlugCache.clear();
    productsListCache.clear();
  },
};
