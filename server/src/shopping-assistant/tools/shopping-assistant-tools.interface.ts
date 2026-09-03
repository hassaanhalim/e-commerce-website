import type {
  CheckAvailabilityToolArgs,
  CompareProductsToolArgs,
  GetProductDetailsToolArgs,
  ProductCatalogSummary,
  SearchProductsToolArgs,
  StorePolicyInfoToolArgs,
} from "../types/shopping-assistant.types";

export interface IShoppingAssistantTools {
  searchProducts(args: SearchProductsToolArgs): Promise<{
    count: number;
    products: ProductCatalogSummary[];
    message?: string;
  }>;

  getProductDetails(args: GetProductDetailsToolArgs): Promise<{
    found: boolean;
    product?: ProductCatalogSummary;
    message?: string;
  }>;

  compareProducts(args: CompareProductsToolArgs): Promise<{
    count: number;
    products: ProductCatalogSummary[];
    comparisonSummary: string;
  }>;

  checkAvailability(args: CheckAvailabilityToolArgs): Promise<{
    productName: string;
    available: boolean;
    availableSizes: number[];
    availableColors: string[];
    requestedSizeAvailable?: boolean;
    requestedColorAvailable?: boolean;
    product?: ProductCatalogSummary;
  }>;

  getStorePolicyInfo(args: StorePolicyInfoToolArgs): Promise<{
    policy: string;
    details: string;
  }>;
}
