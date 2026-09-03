export type ChatRole = "user" | "assistant" | "system" | "tool";

export interface ChatMessageItem {
  role: "user" | "assistant";
  content: string;
}

export interface SearchProductsToolArgs {
  query?: string;
  gender?: "MEN" | "WOMEN" | "UNISEX" | "KIDS" | "Men" | "Women" | "Unisex" | "Kids";
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  size?: number;
  color?: string;
  limit?: number;
}

export interface GetProductDetailsToolArgs {
  productIdOrSlug?: string;
  productName?: string;
}

export interface CompareProductsToolArgs {
  productNamesOrIds?: string[];
}

export interface CheckAvailabilityToolArgs {
  productName?: string;
  size?: number;
  color?: string;
}

export interface StorePolicyInfoToolArgs {
  topic?: "exchange" | "shipping" | "payment" | "authenticity" | "general";
}

export interface ProductCatalogSummary {
  id: string;
  name: string;
  slug: string;
  brand: string;
  category: string;
  gender: string;
  price: number;
  salePrice: number | null;
  displayPrice: number;
  image: string;
  inStock: boolean;
  availableSizes: number[];
  availableColors: string[];
  description?: string;
  averageRating?: number;
}

export interface RecommendedProductDto {
  id: string;
  name: string;
  slug: string;
  brand: string;
  category: string;
  price: number;
  originalPrice?: number;
  salePrice?: number | null;
  displayPrice: number;
  image: string;
  inStock: boolean;
  availableSizes: number[];
  matchingSizes?: number[];
  matchedSize?: number;
  matchedVariantId?: string;
  availableQuantity?: number;
  matchingColors?: string[];
}

export interface ShoppingAssistantChatResponseDto {
  conversationId?: string | null;
  message: string;
  preferences?: Record<string, any>;
  pendingQuestion?: any | null;
  readyForRecommendations: boolean;
  products?: RecommendedProductDto[];
}

export interface TelemetryLog {
  model: string;
  llmUsed: boolean;
  intent: string;
  toolCalls: string[];
  llmLatencyMs: number;
  toolLatencyMs: number;
  totalLatencyMs: number;
  fallbackReason?: string;
  productsCount: number;
}
