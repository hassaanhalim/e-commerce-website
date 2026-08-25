import { apiRequest } from "./api";
import type {
  ChatMessage,
  PendingQuestion,
  ShoppingAssistantChatResponse,
  ShoppingAssistantHistoryResponse,
  ShoppingPreferences,
} from "../components/shopping-assistant/types";

export const shoppingAssistantApi = {
  async sendChat(
    message: string,
    history: ChatMessage[] = [],
    conversationId?: string | null,
    preferences?: ShoppingPreferences | null,
    pendingQuestion?: PendingQuestion | null,
  ): Promise<ShoppingAssistantChatResponse> {
    const formattedHistory = history
      .filter((m) => m.content && m.content.trim().length > 0)
      .slice(-15)
      .map((m) => ({
        role: m.role,
        content: m.content.trim(),
      }));

    return apiRequest<ShoppingAssistantChatResponse>("/shopping-assistant/chat", {
      method: "POST",
      body: JSON.stringify({
        conversationId: conversationId || undefined,
        message: message.trim(),
        messages: formattedHistory,
        preferences: preferences || undefined,
        pendingQuestion: pendingQuestion || undefined,
      }),
    });
  },

  async getLatestHistory(): Promise<ShoppingAssistantHistoryResponse> {
    return apiRequest<ShoppingAssistantHistoryResponse>("/shopping-assistant/history/latest", {
      method: "GET",
    });
  },
};
