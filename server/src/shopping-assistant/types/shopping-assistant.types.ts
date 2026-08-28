export type WearerType = "SELF" | "CHILD" | "OTHER";

export interface WearerInfo {
  type: WearerType | null;
  relation: string | null; // "daughter", "son", "husband", "wife", "myself", "child", etc.
  age: number | null;
  gender: string | null; // "men", "women", "boy", "girl", "unisex", "kids", "MEN", "WOMEN", "BOYS", "GIRLS"
}

export type ShoePurpose =
  | "EVERYDAY"
  | "SPORTS"
  | "RUNNING"
  | "GYM"
  | "FORMAL"
  | "CASUAL";

export type ChatIntent =
  | "GREETING"
  | "PRODUCT_DISCOVERY"
  | "PRODUCT_RECOMMENDATION"
  | "PRODUCT_COMPARISON"
  | "PRODUCT_QUESTION"
  | "STORE_INFORMATION"
  | "ORDER_SUPPORT"
  | "CASUAL_CONVERSATION"
  | "PRODUCT_REFINEMENT"
  | "NEW_SHOPPING_CONTEXT"
  | "GENERAL_SHOE_HELP"
  | "OFF_TOPIC";

export type NextAction =
  | "GREET"
  | "ASK_WEARER"
  | "ASK_WEARER_RELATION"
  | "ASK_AGE"
  | "ASK_SIZE"
  | "ASK_PURPOSE"
  | "ASK_BUDGET"
  | "CLARIFY_PURPOSE"
  | "CLARIFY_INPUT"
  | "SEARCH_PRODUCTS"
  | "COMPARE_PRODUCTS"
  | "ANSWER_STORE_INFO"
  | "ANSWER_ORDER_STATUS"
  | "CASUAL_REPLY"
  | "OFFER_ALTERNATIVES"
  | "OFF_TOPIC_REDIRECT";

export type QuestionType =
  | "CHOICE"
  | "BOOLEAN"
  | "SIZE"
  | "NUMBER"
  | "FREE_TEXT";

export interface PendingQuestion {
  field: "WEARER" | "WEARER_RELATION" | "AGE" | "SIZE" | "PURPOSE" | "BUDGET" | "RELAX_PURPOSE" | "CLARIFICATION" | "SIZE_SYSTEM" | "ORDER_ID" | "STORE_TOPIC";
  type?: QuestionType;
  options?: string[];
  promptText?: string;
}

export interface ShoppingPreferences {
  version?: number; // Version 3 authoritative state
  intent?: ChatIntent | null;
  wearer?: WearerInfo | null;
  size?: number | null; // Canonical numeric representation (e.g. 38, 39, 42)
  rawSizeInput?: string | null;
  sizeSystem?: "EU" | "US" | "UK" | null;
  purpose?: ShoePurpose | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  brand?: string | null;
  color?: string | null;
  style?: string | null;
  comfort?: string | null;
  comfortPreference?: string | null;
  other?: string | null;
  isRelaxationApproved?: boolean;
  age?: number | null;
  gender?: string | null;
  pendingQuestion?: PendingQuestion | null;
  nextAction?: NextAction | null;
}

export interface ProductSearchConstraints {
  gender?: "Men" | "Women" | "Unisex" | "Kids" | null;
  wearerType?: WearerType | null;
  isChild?: boolean;
  size: number | null;
  purpose: ShoePurpose | null;
  budgetMin: number | null;
  budgetMax: number | null;
  brand: string | null;
  color: string | null;
  style?: string | null;
  isRelaxationApproved?: boolean;
}

export type RecommendationResultStatus = "MATCH" | "NO_MATCH" | "ERROR";

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

export interface RecommendationSearchResult {
  status: RecommendationResultStatus;
  products: RecommendedProductDto[];
  possibleRelaxations?: Array<"PURPOSE" | "BRAND" | "BUDGET" | "SIZE">;
}

export interface NaturalLanguagePayload {
  acknowledgement?: string | null;
  question?: string | null;
  naturalReply?: string | null;
}

export interface ShoppingAssistantChatResponse {
  conversationId?: string | null;
  message: string;
  preferences: ShoppingPreferences;
  pendingQuestion?: PendingQuestion | null;
  readyForRecommendations: boolean;
  products?: RecommendedProductDto[];
}

export interface HistoricalChatMessageDto {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  products?: RecommendedProductDto[];
}

export interface ShoppingAssistantHistoryResponse {
  conversationId: string | null;
  preferences?: ShoppingPreferences | null;
  pendingQuestion?: PendingQuestion | null;
  messages: HistoricalChatMessageDto[];
}
