export type MessageRole = "user" | "assistant";

export type WearerType = "SELF" | "CHILD" | "OTHER";

export interface WearerInfo {
  type: WearerType | null;
  relation: string | null;
  age: number | null;
  gender: string | null;
}

export type ShoePurpose =
  | "EVERYDAY"
  | "SPORTS"
  | "RUNNING"
  | "GYM"
  | "FORMAL"
  | "CASUAL";

export type ChatIntent =
  | "PRODUCT_DISCOVERY"
  | "PRODUCT_REFINEMENT"
  | "NEW_SHOPPING_CONTEXT"
  | "GENERAL_SHOE_HELP"
  | "OFF_TOPIC";

export type NextAction =
  | "ASK_WEARER"
  | "ASK_WEARER_RELATION"
  | "ASK_AGE"
  | "ASK_SIZE"
  | "ASK_PURPOSE"
  | "ASK_BUDGET"
  | "CLARIFY_PURPOSE"
  | "CLARIFY_INPUT"
  | "SEARCH_PRODUCTS"
  | "OFFER_ALTERNATIVES"
  | "OFF_TOPIC_REDIRECT";

export type QuestionType =
  | "CHOICE"
  | "BOOLEAN"
  | "SIZE"
  | "NUMBER"
  | "FREE_TEXT";

export interface PendingQuestion {
  field: "WEARER" | "WEARER_RELATION" | "AGE" | "SIZE" | "PURPOSE" | "BUDGET" | "RELAX_PURPOSE" | "CLARIFICATION" | "SIZE_SYSTEM";
  type?: QuestionType;
  options?: string[];
  promptText?: string;
}

export interface ShoppingPreferences {
  version?: number;
  intent?: ChatIntent | null;
  wearer?: WearerInfo | null;
  size?: number | null; // Canonical numeric representation
  rawSizeInput?: string | null;
  sizeSystem?: "EU" | "US" | "UK" | null;
  purpose?: ShoePurpose | string | null;
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

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  products?: RecommendedProductDto[];
}

export interface ShoppingAssistantChatResponse {
  conversationId?: string | null;
  message: string;
  preferences: ShoppingPreferences;
  pendingQuestion?: PendingQuestion | null;
  readyForRecommendations: boolean;
  products?: RecommendedProductDto[];
}

export interface ShoppingAssistantHistoryResponse {
  conversationId: string | null;
  preferences?: ShoppingPreferences | null;
  pendingQuestion?: PendingQuestion | null;
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: number;
    products?: RecommendedProductDto[];
  }>;
}

export interface ShoppingAssistantStorageData {
  version?: number;
  messages: ChatMessage[];
  isOpen?: boolean;
  preferences?: ShoppingPreferences | null;
  pendingQuestion?: PendingQuestion | null;
  readyForRecommendations?: boolean;
}

export const SHOPPING_ASSISTANT_STORAGE_KEY = "shoe-store-shopping-assistant-v3";

export const INITIAL_ASSISTANT_MESSAGE: ChatMessage = {
  id: "initial-assistant-greeting",
  role: "assistant",
  content: "Hi, I can help you find the right shoes. Tell me what you're looking for.",
  timestamp: 1714500000000,
};

export const SUGGESTION_CHIPS = [
  "Everyday shoes",
  "Sports shoes",
  "Help me choose",
] as const;

export const FALLBACK_ASSISTANT_ERROR =
  "I couldn't respond just now. Please try again.";
