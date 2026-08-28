import { ForbiddenException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ChatMessageRole, Prisma, ProductGender } from "@prisma/client";
import Groq from "groq-sdk";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthenticatedUser } from "../auth/auth.types";
import { ChatRequestDto } from "./dto/chat-request.dto";
import {
  ChatIntent,
  HistoricalChatMessageDto,
  NaturalLanguagePayload,
  NextAction,
  PendingQuestion,
  ProductSearchConstraints,
  RecommendationSearchResult,
  RecommendedProductDto,
  ShoePurpose,
  ShoppingAssistantChatResponse,
  ShoppingAssistantHistoryResponse,
  ShoppingPreferences,
  WearerInfo,
  WearerType,
} from "./types/shopping-assistant.types";

export interface ExtractedDeltaUpdates {
  intent?: ChatIntent | null;
  wearerType?: WearerType | null;
  wearerRelation?: string | null;
  age?: number | null;
  gender?: string | null;
  size?: number | null;
  rawSizeInput?: string | null;
  sizeSystemHint?: "US" | "UK" | "EU" | null;
  isAmbiguousSmallSize?: boolean;
  isInvalidSize?: boolean;
  purpose?: ShoePurpose | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  brand?: string | null;
  color?: string | null;
  style?: string | null;
  comfort?: string | null;
  comparedProducts?: string[];
  orderNumber?: string | null;
  storeInfoTopic?: "SHIPPING" | "RETURNS" | "PAYMENT" | "WARRANTY" | "SIZING" | "GENERAL" | null;
  clearedFields?: Array<"brand" | "color" | "budget" | "size" | "purpose">;
  isAmbiguousAffirmation?: boolean;
  isAffirmativeRelaxation?: boolean;
  isNegativeRelaxation?: boolean;
  isNewWearerContext?: boolean;
  isCorrection?: boolean;
  isProactiveSuggestionRequest?: boolean;
  language?: NaturalLanguagePayload | null;
}

const EXTRACTION_SYSTEM_INSTRUCTION = `You are an expert, friendly, and conversational AI Shopping Assistant for an online footwear store.
Your goal is to have natural, helpful conversations with customers: answer shoe advice questions, recommend footwear styles, explain shoe features, assist with store policies, and understand shopping preferences.

Guidelines:
1. intent: "GREETING" | "PRODUCT_DISCOVERY" | "PRODUCT_RECOMMENDATION" | "PRODUCT_COMPARISON" | "PRODUCT_QUESTION" | "STORE_INFORMATION" | "ORDER_SUPPORT" | "CASUAL_CONVERSATION" | "PRODUCT_REFINEMENT" | "NEW_SHOPPING_CONTEXT" | "GENERAL_SHOE_HELP" | "OFF_TOPIC"
2. wearerType: "SELF" | "CHILD" | "OTHER" | null
3. wearerRelation: "daughter", "son", "husband", "wife", "sister", "brother", "mother", "father", "friend", "myself", "child" | null
4. age: number | null
5. gender: "MEN" | "WOMEN" | "BOYS" | "GIRLS" | "UNISEX" | null
6. size: numeric integer string in EU sizing ("36" to "44") | null
7. purpose: "EVERYDAY" | "SPORTS" | "RUNNING" | "GYM" | "FORMAL" | "CASUAL" | null
8. budgetMax: maximum budget number (must be > 0) | null
9. budgetMin: minimum budget number (must be >= 0) | null
10. brand: brand name (e.g. "Nike", "Adidas", "Puma", "ASICS", "New Balance", "Reebok", "Skechers") | null
11. color: color string | null
12. style: style description (e.g. "office and casual", "versatile sneakers", "leather formal", "slip-on") | null
13. comfort: comfort requirements (e.g. "10 km daily walking", "cushioned arch support", "breathable", "flat feet") | null
14. comparedProducts: array of product model names to compare (e.g. ["Nike Pegasus", "Adidas Ultraboost"]) | null
15. orderNumber: extracted order tracking number or ID (e.g. "ORD-12345") | null
16. storeInfoTopic: "SHIPPING" | "RETURNS" | "PAYMENT" | "WARRANTY" | "SIZING" | "GENERAL" | null
17. isAmbiguousAffirmation: true if customer replied "yes", "no", "ok", "both" to a choice question
18. isAffirmativeRelaxation: true if customer agreed to relax constraints (e.g. "yes", "sure", "show casual")
19. isNewWearerContext: true if shopping for someone new (e.g. "for my daughter", "for my sister")
20. isCorrection: true if correcting previous input ("I said 38 not 3838", "actually 39")
21. isProactiveSuggestionRequest: true if asking for suggestions ("suggest me", "what do you have", "show me")
22. language:
    - acknowledgement: short acknowledgement of newly shared context or greeting
    - question: gentle next question if needed, or empty
    - naturalReply: helpful, friendly 1-3 sentence response.
      * For questions/advice (e.g., gym shoes, walking, flat feet, shoe types), provide knowledgeable footwear guidance first before asking any gentle question.
      * Do NOT aggressively ask for shoe size on the very first turn if the user is just asking advice or exploring.
      * For Islamic greetings, reply "Wa Alaikum Assalam! ...".
      * For general greetings, welcome warmly.
      * For store info, summarize policy accurately.

CRITICAL RULES:
- Do NOT invent fake product discounts or fake prices (e.g. "only $20", "50% off").
- Keep responses concise (1-3 sentences), warm, and natural.
- Use natural pronouns based on wearer relation.`;

@Injectable()
export class ShoppingAssistantService {
  private readonly logger = new Logger(ShoppingAssistantService.name);
  private readonly groq: Groq | null = null;
  private readonly modelName: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const apiKey =
      this.configService.get<string>("GROQ_API_KEY") ||
      this.configService.get<string>("SHOPPING_ASSISTANT_API_KEY") ||
      process.env.GROQ_API_KEY ||
      process.env.SHOPPING_ASSISTANT_API_KEY ||
      "";

    this.modelName =
      this.configService.get<string>("SHOPPING_ASSISTANT_MODEL") ||
      process.env.SHOPPING_ASSISTANT_MODEL ||
      "openai/gpt-oss-120b";

    if (apiKey) {
      this.groq = new Groq({ apiKey });
      this.logger.log(`Initialized Shopping Assistant LLM with Groq model: ${this.modelName}`);
    } else {
      this.logger.warn(
        "GROQ_API_KEY or SHOPPING_ASSISTANT_API_KEY not configured. Fast local deterministic mode enabled.",
      );
    }
  }

  async handleChat(
    dto: ChatRequestDto,
    user?: AuthenticatedUser,
  ): Promise<ShoppingAssistantChatResponse> {
    const startTime = Date.now();
    const userMessage = dto.message.trim();

    // Context token reduction: take only the latest 4-6 relevant messages
    const history = (dto.messages || []).slice(-6);

    let conversationId: string | null = null;

    // Handle authenticated user conversation persistence initialization
    if (user) {
      try {
        if (dto.conversationId) {
          const existing = await this.prisma.chatConversation.findUnique({
            where: { id: dto.conversationId },
          });

          if (existing) {
            if (existing.userId !== user.id) {
              throw new ForbiddenException("Cannot access conversation belonging to another user");
            }
            conversationId = existing.id;
          }
        }

        if (!conversationId) {
          const newConv = await this.prisma.chatConversation.create({
            data: { userId: user.id },
          });
          conversationId = newConv.id;
        }

        // Persist user message
        await this.prisma.chatMessage.create({
          data: {
            conversationId,
            role: ChatMessageRole.USER,
            content: userMessage,
          },
        });
      } catch (err) {
        this.logger.error("Failed to initialize or save user chat message to database", err);
        if (err instanceof ForbiddenException) throw err;
      }
    }

    // Authoritative incoming client state (Version 3)
    const currentPreferences = this.sanitizePreferences(dto.preferences);
    const currentPendingQuestion = dto.pendingQuestion || null;

    // Step 1: Groq Call with model fallback and fast path
    let extractedUpdates: ExtractedDeltaUpdates;

    const isSimpleFastPath = this.canUseFastPath(userMessage, currentPendingQuestion, currentPreferences);

    const isDev = process.env.NODE_ENV === "development";
    let debugGroqUsed = false;
    let debugGroqLatencyMs = 0;
    let debugRawGroqOutput: any = null;
    let debugResponseSource: "FAST_PATH" | "GROQ_EXTRACTION" | "GROQ_FALLBACK" | "NO_AI_CLIENT" = "FAST_PATH";

    if (!this.groq || isSimpleFastPath) {
      extractedUpdates = this.extractFallbackUpdates(userMessage, currentPendingQuestion, currentPreferences);
      debugResponseSource = !this.groq ? "NO_AI_CLIENT" : "FAST_PATH";
      if (isDev) {
        this.logger.debug(`[GROQ_SKIPPED] reason=${debugResponseSource} | message="${userMessage}" | fastPath=${isSimpleFastPath} | aiClient=${!!this.groq}`);
      }
    } else {
      try {
        const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
          {
            role: "system",
            content: `${EXTRACTION_SYSTEM_INSTRUCTION}\n\nIMPORTANT: You must respond in a valid JSON object matching the requested schema.\nCurrent Known Preferences State: ${JSON.stringify(currentPreferences)}\nCurrent Pending Question: ${JSON.stringify(currentPendingQuestion)}`,
          },
        ];

        for (const msg of history) {
          if (!msg.content?.trim()) continue;
          messages.push({
            role: msg.role === "assistant" ? "assistant" : "user",
            content: msg.content.trim(),
          });
        }

        messages.push({
          role: "user",
          content: userMessage,
        });

        if (isDev) {
          this.logger.debug(`[GROQ_CALL_START] message="${userMessage}" | model=${this.modelName} | historyTurns=${messages.length}`);
        }

        const groqResult = await this.executeGroqCompletion(messages);

        if (!groqResult) {
          throw new Error("All Groq models failed or returned empty response");
        }

        debugGroqLatencyMs = groqResult.latencyMs;
        debugGroqUsed = true;
        debugResponseSource = "GROQ_EXTRACTION";
        debugRawGroqOutput = groqResult.parsed;

        if (isDev) {
          this.logger.debug(`[GROQ_CALL_SUCCESS] latency=${debugGroqLatencyMs}ms | model=${groqResult.modelUsed} | rawOutput=${JSON.stringify(groqResult.parsed)}`);
          if (groqResult.parsed.language?.naturalReply) {
            this.logger.debug(`[GROQ_LANGUAGE] naturalReply="${groqResult.parsed.language.naturalReply}"`);
          }
        }

        extractedUpdates = this.normalizeExtractedUpdates(groqResult.parsed, userMessage, currentPendingQuestion, currentPreferences);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        this.logger.error(`Shopping Assistant LLM extraction error: ${errorMsg}`);
        debugResponseSource = "GROQ_FALLBACK";
        if (isDev) {
          this.logger.debug(`[GROQ_CALL_FAILED] error="${errorMsg}" | fallingBack=true`);
        }
        extractedUpdates = this.extractFallbackUpdates(userMessage, currentPendingQuestion, currentPreferences);
      }
    }


    // Step 2: Apply Intent Router & Authoritative Conversation State Engine (Phase 1)
    const policyResult = this.applyConversationPolicy(
      currentPreferences,
      currentPendingQuestion,
      extractedUpdates,
      userMessage,
    );

    let finalResponse: ShoppingAssistantChatResponse;

    // Step 3: Pure Database Grounded Search (Phase 2 & Phase 3)
    if (policyResult.canSearchCatalog) {
      try {
        const searchResult = await this.findRecommendedProducts(policyResult.mergedPreferences);
        const durationMs = Date.now() - startTime;
        this.logger.log(`Recommendation search status: ${searchResult.status}, returned ${searchResult.products.length} products in ${durationMs}ms`);

        if (searchResult.status === "MATCH" && searchResult.products.length > 0) {
          let summaryIntro = `I found ${searchResult.products.length} options matching your preferences:`;
          if (policyResult.mergedPreferences.size) {
            summaryIntro = `I found ${searchResult.products.length} in-stock options in size ${policyResult.mergedPreferences.size}:`;
          } else if (policyResult.mergedPreferences.brand) {
            summaryIntro = `Here are popular in-stock ${policyResult.mergedPreferences.brand} options:`;
          } else if (policyResult.mergedPreferences.purpose === "CASUAL") {
            summaryIntro = "Here are some great casual and everyday alternatives available in stock:";
          }

          finalResponse = {
            conversationId,
            message: summaryIntro,
            preferences: policyResult.mergedPreferences,
            pendingQuestion: null,
            readyForRecommendations: true,
            products: searchResult.products,
          };
        } else {
          // Zero-result handling strictly grounded in database realities
          const requestedSizeNum = policyResult.mergedPreferences.size ?? null;
          const isOutOfSizeRange =
            requestedSizeNum !== null &&
            !isNaN(requestedSizeNum) &&
            (requestedSizeNum < 36 || requestedSizeNum > 44);

          const isFormal = policyResult.mergedPreferences.purpose === "FORMAL";
          const isChild =
            (policyResult.mergedPreferences.wearer?.age !== null &&
              policyResult.mergedPreferences.wearer?.age !== undefined &&
              policyResult.mergedPreferences.wearer.age <= 12) ||
            (policyResult.mergedPreferences.age !== null &&
              policyResult.mergedPreferences.age !== undefined &&
              policyResult.mergedPreferences.age <= 12) ||
            (requestedSizeNum !== null && requestedSizeNum < 36);

          const isStylingAdviceQuery =
            userMessage.toLowerCase().includes("what shoes should") ||
            userMessage.toLowerCase().includes("what should i wear") ||
            userMessage.toLowerCase().includes("which shoes") ||
            userMessage.toLowerCase().includes("can i wear") ||
            userMessage.toLowerCase().includes("how should") ||
            userMessage.toLowerCase().includes("beach") ||
            userMessage.toLowerCase().includes("dinner") ||
            userMessage.toLowerCase().includes("party");

          if (isStylingAdviceQuery && extractedUpdates.language?.naturalReply) {
            finalResponse = {
              conversationId,
              message: extractedUpdates.language.naturalReply,
              preferences: policyResult.mergedPreferences,
              pendingQuestion: null,
              readyForRecommendations: false,
              products: [],
            };
          } else if (isFormal) {
            const sizeNote = policyResult.mergedPreferences.size ? ` in size ${policyResult.mergedPreferences.size}` : "";
            finalResponse = {
              conversationId,
              message: `I couldn't find formal shoes${sizeNote} in our current catalog. Would you like to see casual or everyday options${sizeNote} instead?`,
              preferences: policyResult.mergedPreferences,
              pendingQuestion: {
                field: "RELAX_PURPOSE",
                type: "BOOLEAN",
                options: ["Show casual alternatives", "Try another size"],
              },
              readyForRecommendations: false,
              products: [],
            };
          } else if (isOutOfSizeRange) {
            finalResponse = {
              conversationId,
              message: `Size ${policyResult.mergedPreferences.size} is outside our current stock range. We carry adult footwear in EU sizes 36 to 44. Would you like to try a size within that range?`,
              preferences: policyResult.mergedPreferences,
              pendingQuestion: {
                field: "SIZE",
                type: "SIZE",
                options: ["Show size 36 to 44", "Try another size"],
              },
              readyForRecommendations: false,
              products: [],
            };
          } else if (isChild) {
            finalResponse = {
              conversationId,
              message: "We currently carry adult and teen footwear in EU sizes 36 to 44, and don't stock children's sizes just yet. Would you like me to look for adult or teen options instead?",
              preferences: policyResult.mergedPreferences,
              pendingQuestion: {
                field: "WEARER",
                type: "CHOICE",
                options: ["Show adult options", "New search"],
              },
              readyForRecommendations: false,
              products: [],
            };
          } else if (policyResult.mergedPreferences.budgetMax && policyResult.mergedPreferences.budgetMax < 5000) {
            finalResponse = {
              conversationId,
              message: `I couldn't find shoes under Rs ${policyResult.mergedPreferences.budgetMax.toLocaleString()}${policyResult.mergedPreferences.size ? ` in size ${policyResult.mergedPreferences.size}` : ""}. Would you like to see what's available at a slightly higher price?`,
              preferences: policyResult.mergedPreferences,
              pendingQuestion: { field: "BUDGET", type: "NUMBER" },
              readyForRecommendations: false,
              products: [],
            };
          } else {
            // Build a natural summary of what was searched
            const criteriaList: string[] = [];
            if (policyResult.mergedPreferences.brand) criteriaList.push(policyResult.mergedPreferences.brand);
            if (policyResult.mergedPreferences.purpose) criteriaList.push(policyResult.mergedPreferences.purpose.toLowerCase());
            if (policyResult.mergedPreferences.size) criteriaList.push(`size ${policyResult.mergedPreferences.size}`);
            if (policyResult.mergedPreferences.budgetMax) criteriaList.push(`under Rs ${policyResult.mergedPreferences.budgetMax.toLocaleString()}`);
            const criteriaSummary = criteriaList.length > 0 ? ` matching ${criteriaList.join(", ")}` : "";

            finalResponse = {
              conversationId,
              message: `I couldn't find an in-stock option${criteriaSummary}. Would you like to adjust the brand, size, or budget?`,
              preferences: policyResult.mergedPreferences,
              pendingQuestion: {
                field: "SIZE",
                type: "SIZE",
                options: ["Try another size", "Show all in-stock"],
              },
              readyForRecommendations: false,
              products: [],
            };
          }
        }
      } catch (dbError) {
        this.logger.error("Error querying product catalog", dbError);
        finalResponse = {
          conversationId,
          message: "I couldn't search the catalog just now. Please try again in a moment.",
          preferences: policyResult.mergedPreferences,
          pendingQuestion: policyResult.nextQuestion,
          readyForRecommendations: false,
          products: [],
        };
      }
    } else if (policyResult.mergedPreferences.nextAction === "ANSWER_STORE_INFO") {
      let finalMessage = this.getStoreInformation(extractedUpdates.storeInfoTopic, userMessage);
      if (extractedUpdates.language?.naturalReply && this.validateNaturalResponse(extractedUpdates.language.naturalReply, "ANSWER_STORE_INFO", policyResult.mergedPreferences)) {
        finalMessage = extractedUpdates.language.naturalReply;
      }
      finalResponse = {
        conversationId,
        message: finalMessage,
        preferences: policyResult.mergedPreferences,
        pendingQuestion: null,
        readyForRecommendations: false,
        products: [],
      };
    } else if (policyResult.mergedPreferences.nextAction === "ANSWER_ORDER_STATUS") {
      const orderMsg = await this.getOrderStatusMessage(extractedUpdates.orderNumber, user);
      finalResponse = {
        conversationId,
        message: orderMsg,
        preferences: policyResult.mergedPreferences,
        pendingQuestion: extractedUpdates.orderNumber ? null : { field: "ORDER_ID", type: "FREE_TEXT" },
        readyForRecommendations: false,
        products: [],
      };
    } else if (policyResult.mergedPreferences.nextAction === "COMPARE_PRODUCTS") {
      const comparison = await this.compareProducts(extractedUpdates.comparedProducts || []);
      finalResponse = {
        conversationId,
        message: comparison.message,
        preferences: policyResult.mergedPreferences,
        pendingQuestion: { field: "SIZE", type: "SIZE" },
        readyForRecommendations: comparison.products.length > 0,
        products: comparison.products,
      };
    } else {
      // Conversational question turn (Phase 3 Natural Phrasing with Action Validation Guard)
      let finalMessage = policyResult.replyMessage || "How can I help you find the right pair of shoes today?";

      // Check if LLM generated a valid natural reply that aligns with nextAction
      if (extractedUpdates.language?.naturalReply) {
        const candidate = extractedUpdates.language.naturalReply.trim();
        if (this.validateNaturalResponse(candidate, policyResult.mergedPreferences.nextAction, policyResult.mergedPreferences)) {
          finalMessage = candidate;
        }
      }

      finalResponse = {
        conversationId,
        message: finalMessage,
        preferences: policyResult.mergedPreferences,
        pendingQuestion: policyResult.nextQuestion,
        readyForRecommendations: false,
        products: [],
      };
    }

    // Persist assistant message for authenticated user
    if (user && conversationId) {
      try {
        const metadata =
          finalResponse.products && finalResponse.products.length > 0
            ? {
                productIds: finalResponse.products.map((p) => p.id),
                preferences: finalResponse.preferences,
                pendingQuestion: finalResponse.pendingQuestion,
              }
            : {
                preferences: finalResponse.preferences,
                pendingQuestion: finalResponse.pendingQuestion,
              };

        await this.prisma.chatMessage.create({
          data: {
            conversationId,
            role: ChatMessageRole.ASSISTANT,
            content: finalResponse.message,
            metadata: metadata as unknown as Prisma.InputJsonValue,
          },
        });

        await this.prisma.chatConversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });
      } catch (err) {
        this.logger.error("Failed to persist assistant chat reply to database", err);
      }
    }

    const durationMs = Date.now() - startTime;
    this.logger.log(`Shopping Assistant turn completed in ${durationMs}ms`);

    if (isDev) {
      this.logger.debug(
        `[CHAT_TELEMETRY] message="${userMessage}" | groqUsed=${debugGroqUsed} | latency=${debugGroqLatencyMs}ms | source=${policyResult.canSearchCatalog ? "DATABASE_LOGIC" : debugGroqUsed ? "GROQ_GENERATED" : "DETERMINISTIC_RULE"} | rawGroq=${JSON.stringify(debugRawGroqOutput?.language?.naturalReply || null)} | finalResponse="${finalResponse.message}"`,
      );
    }

    return finalResponse;
  }

  /**
   * Robust multi-model Groq completion execution with fallback
   */
  private async executeGroqCompletion(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  ): Promise<{ parsed: any; latencyMs: number; modelUsed: string } | null> {
    if (!this.groq) return null;

    const candidateModels = Array.from(
      new Set([
        this.modelName,
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b",
        "qwen/qwen3.8-27b",
        "qwen/qwen3.6-27b",
      ]),
    ).filter(Boolean);

    for (const model of candidateModels) {
      try {
        const start = Date.now();
        const responsePromise = this.groq.chat.completions.create({
          model,
          messages,
          temperature: 0.3,
          response_format: { type: "json_object" },
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`LLM request to ${model} timed out after 8s`)), 8000),
        );

        const completion = await Promise.race([responsePromise, timeoutPromise]);
        const rawText = completion.choices[0]?.message?.content;
        if (!rawText) continue;

        const parsed = JSON.parse(rawText);
        const latencyMs = Date.now() - start;
        return { parsed, latencyMs, modelUsed: model };
      } catch (err: any) {
        this.logger.warn(`Groq completion attempt on model "${model}" failed: ${err.message}`);
      }
    }

    return null;
  }

  /**
   * Fast-Path check (Phase 4 Step 35) for simple unambiguous replies
   */
  private canUseFastPath(
    userMessage: string,
    pendingQuestion: PendingQuestion | null,
    preferences: ShoppingPreferences,
  ): boolean {
    const text = userMessage.trim().toLowerCase();

    // 1. Size answers (pure numeric) - ONLY if pendingQuestion is SIZE and value is in valid EU range 36..44
    if (pendingQuestion?.field === "SIZE" && /^\d{1,2}$/.test(text)) {
      const num = parseInt(text, 10);
      if (num >= 36 && num <= 44) return true;
    }

    // 2. Boolean confirmations (e.g. clicking yes/no chip)
    if (pendingQuestion?.type === "BOOLEAN" && ["yes", "yeah", "yep", "sure", "ok", "no", "nope", "nah"].includes(text)) return true;

    return false;
  }

  /**
   * Store Information Tool: Grounded policy knowledge
   */
  public getStoreInformation(topic?: string | null, userMessage?: string): string {
    const textLower = (userMessage || "").toLowerCase();

    if (topic === "RETURNS" || textLower.includes("return") || textLower.includes("exchange") || textLower.includes("refund")) {
      return "We offer a 14-day hassle-free return and exchange policy for unworn items in their original packaging with tags.";
    }
    if (topic === "SHIPPING" || textLower.includes("delivery") || textLower.includes("shipping") || textLower.includes("how long")) {
      return "Standard delivery takes 2 to 4 business days across Pakistan. We offer free shipping on all orders over PKR 5,000.";
    }
    if (topic === "PAYMENT" || textLower.includes("pay") || textLower.includes("cod") || textLower.includes("cash on delivery") || textLower.includes("card") || textLower.includes("bitcoin") || textLower.includes("crypto")) {
      if (textLower.includes("crypto") || textLower.includes("bitcoin")) {
        return "We accept Cash on Delivery (COD), Credit/Debit Cards (Visa/Mastercard), and direct bank transfers. We do not support cryptocurrency or Bitcoin at this time.";
      }
      return "We accept Cash on Delivery (COD), Credit/Debit Cards (Visa/Mastercard), and direct bank transfers at checkout.";
    }
    if (topic === "WARRANTY" || textLower.includes("warranty") || textLower.includes("guarantee") || textLower.includes("authentic")) {
      return "All our products are 100% authentic and covered by a 30-day manufacturer defect warranty.";
    }
    if (topic === "SIZING" || textLower.includes("size chart") || textLower.includes("size guide") || textLower.includes("how to measure")) {
      return "Our footwear uses standard European (EU) sizing from 36 to 44. You can also view our full Size Guide in the website menu.";
    }
    return "We offer 100% authentic footwear with 14-day returns, nationwide 2-4 day shipping, and Cash on Delivery. How can I assist you today?";
  }

  /**
   * Order Status Tool: Query Prisma DB for authenticated user or order ID
   */
  public async getOrderStatusMessage(orderNumber?: string | null, user?: AuthenticatedUser): Promise<string> {
    if (!orderNumber && !user) {
      return "To track your order, please provide your Order Number (e.g. ORD-12345) or log in to view your orders directly.";
    }

    try {
      let order: any = null;

      if (orderNumber) {
        order = await this.prisma.order.findFirst({
          where: {
            OR: [
              { id: orderNumber },
              { orderNumber: orderNumber },
            ],
            ...(user ? { userId: user.id } : {}),
          },
          include: {
            items: true,
          },
        });
      } else if (user) {
        order = await this.prisma.order.findFirst({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          include: {
            items: true,
          },
        });
      }

      if (!order) {
        return orderNumber
          ? `I couldn't find an order matching "${orderNumber}". Please double-check your Order ID or check your email confirmation.`
          : "You don't have any recent orders. Let me know if you need help finding shoes!";
      }

      const statusMap: Record<string, string> = {
        PENDING: "pending processing",
        CONFIRMED: "confirmed and being packed",
        SHIPPED: "shipped and on the way",
        DELIVERED: "delivered",
        CANCELLED: "cancelled",
        RETURNED: "returned",
      };

      const friendlyStatus = statusMap[order.status] || String(order.status).toLowerCase();
      const itemCount = order.items?.length || 1;
      const orderRef = order.orderNumber || order.id.slice(0, 8);

      return `Order #${orderRef} with ${itemCount} item(s) is currently ${friendlyStatus}. Total: PKR ${Number(order.total).toLocaleString()}.`;
    } catch (err) {
      this.logger.error("Error looking up order status", err);
      return "I encountered an issue looking up your order. Please check your Account Orders page or try again in a moment.";
    }
  }

  /**
   * Product Comparison Tool: Grounded DB comparison for requested shoe models
   */
  public async compareProducts(productNames: string[]): Promise<{ message: string; products: RecommendedProductDto[] }> {
    if (!productNames || productNames.length < 2) {
      return {
        message: "Please specify two shoe models to compare (for example: Nike Pegasus vs Adidas Ultraboost).",
        products: [],
      };
    }

    try {
      const results: any[] = [];
      for (const name of productNames.slice(0, 3)) {
        const found = await this.prisma.product.findFirst({
          where: {
            OR: [
              { name: { contains: name, mode: "insensitive" } },
              { slug: { contains: name.toLowerCase().replace(/\s+/g, "-") } },
            ],
            isActive: true,
          },
          include: {
            brand: true,
            category: true,
            images: true,
            variants: {
              include: {
                inventory: true,
              },
            },
          },
        });
        if (found) results.push(found);
      }

      if (results.length === 0) {
        return {
          message: `I couldn't find ${productNames.join(" or ")} in our current catalog, but we have a wide selection of running, casual, and sports shoes. What style or size are you looking for?`,
          products: [],
        };
      }

      const dtos: RecommendedProductDto[] = results.map((p) => {
        const inStockVariants = (p.variants || []).filter((v: any) => {
          const onHand = v.inventory?.quantityOnHand ?? 0;
          const reserved = v.inventory?.reservedQuantity ?? 0;
          return onHand - reserved > 0;
        });
        const sizeSet = new Set<number>();
        for (const v of inStockVariants) {
          if (typeof v.size === "number") sizeSet.add(v.size);
        }
        const availableSizes: number[] = Array.from(sizeSet).sort((a: number, b: number) => a - b);
        const primaryImg = p.images.find((img: any) => img.isPrimary) || p.images[0];
        const pricing = this.calculateEffectivePrice(p.basePrice, p.salePrice);
        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          brand: p.brand.name,
          category: p.category.name,
          price: Number(p.basePrice),
          originalPrice: pricing.originalPrice,
          salePrice: p.salePrice ? Number(p.salePrice) : null,
          displayPrice: pricing.displayPrice,
          image: primaryImg?.url || "",
          inStock: inStockVariants.length > 0,
          availableSizes,
        };
      });

      if (results.length === 1) {
        const p1 = dtos[0];
        return {
          message: `We have the ${p1.brand} ${p1.name} in stock (${p1.category}) for PKR ${p1.displayPrice.toLocaleString()}. What shoe size would you like to check?`,
          products: dtos,
        };
      }

      const p1 = dtos[0];
      const p2 = dtos[1];
      const summary = `Comparing ${p1.brand} ${p1.name} (PKR ${p1.displayPrice.toLocaleString()}, ${p1.category}) and ${p2.brand} ${p2.name} (PKR ${p2.displayPrice.toLocaleString()}, ${p2.category}). Both are in stock! What size do you wear?`;

      return {
        message: summary,
        products: dtos,
      };
    } catch (err) {
      this.logger.error("Error comparing products", err);
      return {
        message: "I couldn't compare those products right now. What kind of shoes are you looking for?",
        products: [],
      };
    }
  }

  /**
   * Phase 3: Natural Response Guard & Action Alignment Validation
   */
  public validateNaturalResponse(
    text: string,
    action: NextAction | null | undefined,
    state: ShoppingPreferences,
  ): boolean {
    if (!text || text.length < 5 || text.length > 800) return false;
    const textLower = text.toLowerCase();

    // 1. PRODUCT-CLAIM GUARD: Never allow unsupported specific price/discount claims in conversational text
    if (
      /\b(?:rs\.?|pkr|\$)\s*\d+/i.test(text) ||
      /\bin stock for (?:rs|pkr|\$|\d+)/i.test(text) ||
      /\b\d+%\s*off\b/i.test(text) ||
      /\bdiscount of\b/i.test(text)
    ) {
      return false;
    }

    // 2. OFF-TOPIC GUARD: If the action is off-topic redirect, must mention shoes/footwear
    if (action === "OFF_TOPIC_REDIRECT") {
      return textLower.includes("shoe") || textLower.includes("footwear");
    }

    // 3. Conversational responses that pass the claim guard and are helpful are valid
    return true;
  }


  /**
   * Intent Router (Phase 1): Classifies incoming message into one of the 5 canonical intents
   */
  public classifyIntent(
    userMessage: string,
    state: ShoppingPreferences,
    pendingQuestion: PendingQuestion | null,
    extracted?: ExtractedDeltaUpdates,
  ): ChatIntent {
    const textLower = userMessage.toLowerCase().trim();

    // 1. Off-Topic detection
    if (
      textLower.includes("python") ||
      textLower.includes("write code") ||
      textLower.includes("javascript") ||
      textLower.includes("weather") ||
      textLower.includes("recipe") ||
      textLower.includes("essay")
    ) {
      return "OFF_TOPIC";
    }

    // 2. Greeting
    if (
      /^(?:as[- ]?salam(?:u|o)?\s*(?:alaikum|alaykum|alekum)?|assalam\s*o\s*alaikum|salam|slam|aaoa)$/i.test(textLower) ||
      textLower.startsWith("assalam") ||
      textLower.startsWith("as-salam") ||
      ["hi", "hello", "hey", "good morning", "good evening", "greetings", "hi there", "hello there"].includes(textLower)
    ) {
      if (!state.purpose && !state.size && !state.brand && !extracted?.purpose && !extracted?.brand) {
        return "GREETING";
      }
    }

    // 3. Store Information
    if (
      textLower.includes("return policy") ||
      textLower.includes("return") ||
      textLower.includes("refund") ||
      textLower.includes("exchange") ||
      textLower.includes("delivery") ||
      textLower.includes("shipping") ||
      textLower.includes("how long delivery") ||
      textLower.includes("payment") ||
      textLower.includes("cash on delivery") ||
      textLower.includes("bitcoin") ||
      textLower.includes("crypto") ||
      textLower.includes("how to pay") ||
      textLower.includes("warranty") ||
      extracted?.storeInfoTopic
    ) {
      if (!state.size && !extracted?.size && !extracted?.purpose) {
        return "STORE_INFORMATION";
      }
    }

    // 4. Order Support
    if (
      textLower.includes("where is my order") ||
      textLower.includes("track order") ||
      textLower.includes("order status") ||
      textLower.includes("my order") ||
      extracted?.orderNumber
    ) {
      return "ORDER_SUPPORT";
    }

    // 5. Product Comparison
    if (
      textLower.includes(" vs ") ||
      textLower.includes("compare ") ||
      (extracted?.comparedProducts && extracted.comparedProducts.length >= 2)
    ) {
      return "PRODUCT_COMPARISON";
    }

    // 6. Casual Conversation
    if (["thanks", "thank you", "nice", "cool", "great", "ok thanks", "awesome"].includes(textLower)) {
      return "CASUAL_CONVERSATION";
    }

    // 7. New Shopping Context
    if (
      extracted?.isNewWearerContext ||
      textLower.includes("for my daughter") ||
      textLower.includes("for my son") ||
      textLower.includes("for my sister") ||
      textLower.includes("for my brother") ||
      textLower.includes("for my husband") ||
      textLower.includes("for my wife") ||
      textLower.includes("for my mother") ||
      textLower.includes("for my mom") ||
      textLower.includes("for my father") ||
      textLower.includes("for my dad") ||
      textLower.includes("shoes for myself") ||
      textLower.includes("now i need") ||
      textLower.includes("now for")
    ) {
      return "NEW_SHOPPING_CONTEXT";
    }

    // 8. Product Refinement
    if (
      extracted?.isCorrection ||
      textLower.includes("cheaper") ||
      textLower.includes("instead") ||
      textLower.includes("actually") ||
      textLower.includes("i meant") ||
      textLower.includes("not ") ||
      textLower.includes("under ") ||
      textLower.includes("color") ||
      textLower.includes("black if possible") ||
      textLower.includes("in black") ||
      (state.size && (extracted?.brand || extracted?.color || extracted?.budgetMax))
    ) {
      return "PRODUCT_REFINEMENT";
    }

    // 9. Product Recommendation / Style exploration
    if (
      textLower.includes("suit me") ||
      textLower.includes("recommend") ||
      textLower.includes("what shoes should i get") ||
      textLower.includes("help me choose") ||
      textLower.includes("10 km") ||
      textLower.includes("walking") ||
      textLower.includes("comfortable") ||
      textLower.includes("office and casual") ||
      textLower.includes("office but")
    ) {
      return "PRODUCT_RECOMMENDATION";
    }

    // 10. General Shoe Help & Advice Q&A
    if (
      textLower.includes("what size") ||
      textLower.includes("size chart") ||
      textLower.includes("how to measure") ||
      textLower.includes("what kind") ||
      textLower.includes("which shoes") ||
      textLower.includes("what shoes should") ||
      textLower.includes("what should i wear") ||
      textLower.includes("can i wear") ||
      textLower.includes("difference between") ||
      textLower.includes("how should") ||
      textLower.includes("flat feet") ||
      textLower.includes("gym") ||
      textLower.includes("workout") ||
      textLower.includes("standing all day") ||
      textLower.includes("plantar") ||
      textLower.includes("tips") ||
      textLower.includes("advice") ||
      textLower.includes("joke") ||
      textLower.includes("fun fact") ||
      textLower.includes("human or") ||
      textLower.includes("who made you") ||
      textLower.includes("tiring day") ||
      textLower.includes("long day") ||
      extracted?.intent === "GENERAL_SHOE_HELP" ||
      extracted?.intent === "PRODUCT_QUESTION"
    ) {
      return "GENERAL_SHOE_HELP";
    }

    // 11. Default: Product Discovery
    return extracted?.intent || "PRODUCT_DISCOVERY";
  }


  /**
   * Deterministic State Engine (Phase 1): Merges current state with extracted delta (3-state distinction)
   */
  public mergeStateWithDelta(
    currentState: ShoppingPreferences,
    updates: ExtractedDeltaUpdates,
    userMessage: string,
    currentPendingQuestion?: PendingQuestion | null,
  ): ShoppingPreferences {
    const textLower = userMessage.toLowerCase().trim();
    const merged: ShoppingPreferences = {
      version: 3,
      intent: updates.intent ?? currentState.intent ?? "PRODUCT_DISCOVERY",
      wearer: currentState.wearer ? { ...currentState.wearer } : null,
      size: currentState.size !== undefined ? currentState.size : null,
      rawSizeInput: currentState.rawSizeInput ?? null,
      sizeSystem: currentState.sizeSystem ?? null,
      purpose: currentState.purpose ?? null,
      budgetMin: currentState.budgetMin ?? null,
      budgetMax: currentState.budgetMax ?? null,
      brand: currentState.brand ?? null,
      color: currentState.color ?? null,
      style: currentState.style ?? null,
      comfort: currentState.comfort ?? null,
      comfortPreference: currentState.comfortPreference ?? null,
      other: currentState.other ?? null,
      isRelaxationApproved: Boolean(currentState.isRelaxationApproved),
      age: currentState.age ?? null,
      gender: currentState.gender ?? null,
      pendingQuestion: currentState.pendingQuestion ?? null,
      nextAction: currentState.nextAction ?? null,
    };

    // Handle Context Switch (e.g. from self to daughter/sister)
    const isNewWearer =
      updates.isNewWearerContext ||
      (updates.wearerRelation && updates.wearerRelation !== currentState.wearer?.relation);

    if (isNewWearer) {
      const newRelation = updates.wearerRelation || (updates.wearerType === "SELF" ? "myself" : null);
      const isSelf = newRelation === "myself" || updates.wearerType === "SELF";
      const isChild =
        !isSelf &&
        (updates.wearerType === "CHILD" ||
          (newRelation && ["daughter", "son", "kid", "child"].includes(newRelation)) ||
          (updates.age !== null && updates.age !== undefined && updates.age <= 12));

      merged.wearer = {
        type: isSelf ? "SELF" : isChild ? "CHILD" : (updates.wearerType ?? (newRelation ? "OTHER" : null)),
        relation: newRelation,
        age:
          updates.age ??
          (newRelation && currentState.wearer?.relation === newRelation ? currentState.wearer.age : null),
        gender:
          newRelation && ["daughter", "wife", "sister", "mother"].includes(newRelation)
            ? (isChild ? "GIRLS" : "WOMEN")
            : newRelation && ["son", "husband", "brother", "father"].includes(newRelation)
            ? (isChild ? "BOYS" : "MEN")
            : updates.gender ?? null,
      };

      // Context-sensitive clearing: Clear previous wearer's size, age, and relaxation flag
      merged.size = null;
      merged.rawSizeInput = null;
      merged.sizeSystem = null;
      merged.age = merged.wearer.age;
      merged.gender = merged.wearer.gender;
      merged.isRelaxationApproved = false;

      // Clean context reset when explicitly switching context or returning to self
      if (
        updates.intent === "NEW_SHOPPING_CONTEXT" ||
        textLower.includes("forget that") ||
        textLower.includes("start over") ||
        (isSelf && currentState.wearer && currentState.wearer.type !== "SELF")
      ) {
        merged.purpose = updates.purpose ?? null;
        merged.style = updates.style ?? null;
        merged.brand = updates.brand ?? null;
        merged.color = updates.color ?? null;
        merged.budgetMax = updates.budgetMax ?? null;
        merged.budgetMin = updates.budgetMin ?? null;
      }
    } else {
      // Merge wearer updates if provided
      if (updates.wearerType || updates.wearerRelation || updates.age !== null || updates.gender) {
        const isSelf =
          updates.wearerRelation === "myself" ||
          updates.wearerType === "SELF" ||
          merged.wearer?.type === "SELF";
        merged.wearer = {
          type: isSelf ? "SELF" : updates.wearerType ?? merged.wearer?.type ?? null,
          relation: updates.wearerRelation ?? merged.wearer?.relation ?? null,
          age: updates.age ?? merged.wearer?.age ?? null,
          gender: updates.gender ?? merged.wearer?.gender ?? null,
        };
        if (updates.age !== undefined && updates.age !== null) {
          merged.age = updates.age;
        }
        if (updates.gender !== undefined && updates.gender !== null) {
          merged.gender = updates.gender;
        }
      }
    }

    // Explicit field clearing (State 3: FIELD EXPLICITLY CLEARED)
    if (updates.clearedFields && Array.isArray(updates.clearedFields)) {
      for (const f of updates.clearedFields) {
        if (f === "brand") merged.brand = null;
        if (f === "color") merged.color = null;
        if (f === "size") {
          merged.size = null;
          merged.rawSizeInput = null;
          merged.sizeSystem = null;
        }
        if (f === "purpose") merged.purpose = null;
        if (f === "budget") {
          merged.budgetMin = null;
          merged.budgetMax = null;
        }
      }
    }

    // Explicit field updates (State 2: FIELD EXPLICITLY UPDATED)
    if (updates.size !== undefined) {
      merged.size = updates.size;
    }
    if (updates.rawSizeInput) {
      merged.rawSizeInput = updates.rawSizeInput;
    }
    if (updates.sizeSystemHint) {
      merged.sizeSystem = updates.sizeSystemHint;
    }
    if (updates.purpose !== undefined && updates.purpose !== null) {
      merged.purpose = updates.purpose;
      merged.isRelaxationApproved = false;
    }
    if (updates.budgetMax !== undefined && updates.budgetMax !== null) {
      merged.budgetMax = updates.budgetMax;
    }
    if (updates.budgetMin !== undefined && updates.budgetMin !== null) {
      merged.budgetMin = updates.budgetMin;
    }
    if (updates.brand !== undefined && updates.brand !== null) {
      merged.brand = updates.brand;
    }
    if (updates.color !== undefined && updates.color !== null) {
      merged.color = updates.color;
    }
    if (updates.style !== undefined && updates.style !== null) {
      merged.style = updates.style;
    }
    if (updates.comfort !== undefined && updates.comfort !== null) {
      merged.comfort = updates.comfort;
      merged.comfortPreference = updates.comfort;
    }

    // Relaxation approval handling
    const isRelaxPrompt =
      currentPendingQuestion?.field === "RELAX_PURPOSE" ||
      currentState.pendingQuestion?.field === "RELAX_PURPOSE";
    if (
      updates.isAffirmativeRelaxation ||
      (isRelaxPrompt &&
        ["yes", "yeah", "yep", "sure", "ok", "casual", "show casual", "show me casual", "casual is fine", "yeah casual is fine"].includes(
          textLower,
        ))
    ) {
      merged.isRelaxationApproved = true;
      if (isRelaxPrompt) {
        merged.purpose = "CASUAL";
      }
    } else if (isRelaxPrompt && ["no", "nope", "nah", "don't", "dont"].includes(textLower)) {
      merged.isRelaxationApproved = false;
    }

    // Proactive suggestion request handling
    if (updates.isProactiveSuggestionRequest) {
      merged.isRelaxationApproved = true;
      merged.size = null;
    }

    return merged;
  }

  /**
   * Deterministic Next-Action Engine (Phase 1 & Phase 3 Phrasing): Decides the next logical action
   */
  public determineNextAction(
    state: ShoppingPreferences,
    userMessage: string,
    pendingQuestion: PendingQuestion | null,
    updates?: ExtractedDeltaUpdates,
  ): {
    nextAction: NextAction;
    nextQuestion: PendingQuestion | null;
    replyMessage: string | null;
    canSearchCatalog: boolean;
  } {
    const textLower = userMessage.toLowerCase().trim();

    // 0. Invalid size input (outside 36..44 EU, e.g. 67, 90, -1)
    if (updates?.isInvalidSize) {
      return {
        nextAction: "ASK_SIZE",
        nextQuestion: { field: "SIZE", type: "SIZE" },
        replyMessage:
          "I think that might not be a valid shoe size. Our catalog uses EU sizes from 36 to 44. What size do you usually wear?",
        canSearchCatalog: false,
      };
    }

    // 0b. Islamic Greetings ("assalamualaikum", "salam", "salam alaikum", etc.)
    const isIslamicGreeting =
      /^(?:as[- ]?salam(?:u|o)?\s*(?:alaikum|alaykum|alekum)?|assalam\s*o\s*alaikum|salam|slam|aaoa)$/i.test(textLower) ||
      textLower.startsWith("assalam") ||
      textLower.startsWith("as-salam") ||
      textLower === "salam" ||
      textLower === "slam";

    if (
      isIslamicGreeting &&
      !state.size &&
      !state.purpose &&
      !state.brand &&
      !updates?.purpose &&
      !updates?.brand
    ) {
      return {
        nextAction: "ASK_WEARER",
        nextQuestion: { field: "WEARER", type: "CHOICE", options: ["For me", "For someone else"] },
        replyMessage:
          "Wa Alaikum Assalam! I can help you find the right shoes. Are you shopping for yourself or someone else?",
        canSearchCatalog: false,
      };
    }

    // 0c. General standalone greetings ("hi", "hello", "hey")
    const isGeneralGreeting =
      ["hi", "hello", "hey", "good morning", "good evening", "greetings", "hi there", "hello there"].includes(textLower) &&
      !state.size &&
      !state.purpose &&
      !state.brand &&
      !updates?.purpose &&
      !updates?.brand;

    if (isGeneralGreeting) {
      return {
        nextAction: "ASK_WEARER",
        nextQuestion: { field: "WEARER", type: "CHOICE", options: ["For me", "For someone else"] },
        replyMessage:
          "Hello! I can help you find the right shoes. Are you shopping for yourself or someone else?",
        canSearchCatalog: false,
      };
    }

    // 0d. Store Information (Returns, Shipping, Payment, Warranty, Size Guide)
    if (
      state.intent === "STORE_INFORMATION" ||
      updates?.storeInfoTopic ||
      textLower.includes("return policy") ||
      textLower.includes("return") ||
      textLower.includes("refund") ||
      textLower.includes("exchange") ||
      textLower.includes("how long delivery") ||
      textLower.includes("delivery takes") ||
      textLower.includes("shipping") ||
      textLower.includes("payment method") ||
      textLower.includes("warranty")
    ) {
      if (!state.size && !updates?.size && !state.purpose && !updates?.purpose) {
        return {
          nextAction: "ANSWER_STORE_INFO",
          nextQuestion: null,
          replyMessage: this.getStoreInformation(updates?.storeInfoTopic, userMessage),
          canSearchCatalog: false,
        };
      }
    }

    // 0e. Order Support & Tracking
    if (
      state.intent === "ORDER_SUPPORT" ||
      updates?.orderNumber ||
      textLower.includes("where is my order") ||
      textLower.includes("track order") ||
      textLower.includes("order status")
    ) {
      return {
        nextAction: "ANSWER_ORDER_STATUS",
        nextQuestion: updates?.orderNumber ? null : { field: "ORDER_ID", type: "FREE_TEXT" },
        replyMessage: null,
        canSearchCatalog: false,
      };
    }

    // 0f. Product Comparison
    if (
      state.intent === "PRODUCT_COMPARISON" ||
      (updates?.comparedProducts && updates.comparedProducts.length >= 2) ||
      (textLower.includes(" vs ") && (textLower.includes("nike") || textLower.includes("adidas") || textLower.includes("pegasus") || textLower.includes("ultraboost") || textLower.includes("shoes")))
    ) {
      return {
        nextAction: "COMPARE_PRODUCTS",
        nextQuestion: { field: "SIZE", type: "SIZE" },
        replyMessage: null,
        canSearchCatalog: false,
      };
    }

    // 0g. Casual Conversation
    if (
      state.intent === "CASUAL_CONVERSATION" ||
      ["thanks", "thank you", "nice", "cool", "great", "ok thanks", "awesome"].includes(textLower)
    ) {
      return {
        nextAction: "CASUAL_REPLY",
        nextQuestion: null,
        replyMessage: "You're very welcome! Let me know if you need any help finding shoes or checking styles.",
        canSearchCatalog: false,
      };
    }

    // 0h. Style Guidance / Multi-purpose (Office and Casual weekends)
    if (
      (textLower.includes("office") && (textLower.includes("casual") || textLower.includes("weekend"))) ||
      textLower.includes("versatile")
    ) {
      if (!state.size && !state.purpose) {
        return {
          nextAction: "ASK_PURPOSE",
          nextQuestion: {
            field: "PURPOSE",
            type: "CHOICE",
            options: ["Everyday sneakers", "Casual leather shoes", "Formal dress shoes"],
          },
          replyMessage: "I can help you find versatile shoes that work for office and casual wear. Are you looking for clean sneakers or something more formal?",
          canSearchCatalog: false,
        };
      }
    }

    // 0i. High-mileage walking / Comfort (10 km daily walking)
    if (
      (textLower.includes("10 km") || textLower.includes("walking") || textLower.includes("walk a lot")) &&
      !state.size
    ) {
      return {
        nextAction: "ASK_SIZE",
        nextQuestion: { field: "SIZE", type: "SIZE" },
        replyMessage: "For walking 10 km daily, cushioned shoes with strong arch support are ideal. What shoe size should I look for in our walking and running collection?",
        canSearchCatalog: false,
      };
    }

    // 1. Off-Topic Redirection
    if (state.intent === "OFF_TOPIC") {
      return {
        nextAction: "OFF_TOPIC_REDIRECT",
        nextQuestion: {
          field: "PURPOSE",
          type: "CHOICE",
          options: ["Everyday sneakers", "Sports shoes", "Help me choose"],
        },
        replyMessage:
          "I'm focused on helping with shoes here. What kind of footwear are you looking for?",
        canSearchCatalog: false,
      };
    }

    // 2. Direct "Help me choose" / Greeting
    if (
      (textLower.includes("help me choose") || textLower === "help" || textLower === "choose") &&
      !state.size &&
      !state.purpose
    ) {
      return {
        nextAction: "ASK_WEARER",
        nextQuestion: { field: "WEARER", type: "CHOICE", options: ["For me", "For someone else"] },
        replyMessage: "Sure! Are the shoes for you or someone else?",
        canSearchCatalog: false,
      };
    }

    // 2b. Wearer is OTHER but relation is not specified -> ASK_WEARER_RELATION
    if (state.wearer?.type === "OTHER" && (!state.wearer?.relation || state.wearer.relation === "someone else")) {
      return {
        nextAction: "ASK_WEARER_RELATION",
        nextQuestion: {
          field: "WEARER_RELATION",
          type: "CHOICE",
          options: ["My sister", "My brother", "My daughter", "My son", "My wife", "My husband", "A friend"],
        },
        replyMessage: "Sure, who are the shoes for? For example: sister, brother, wife, husband, son, or daughter.",
        canSearchCatalog: false,
      };
    }

    // 3. Ambiguous small size or non-EU size clarification requirement (NO silent conversions)
    if (updates?.isAmbiguousSmallSize || (state.rawSizeInput && state.size === null && updates?.rawSizeInput)) {
      const raw = updates?.rawSizeInput || state.rawSizeInput;
      return {
        nextAction: "CLARIFY_INPUT",
        nextQuestion: {
          field: "SIZE_SYSTEM",
          type: "CHOICE",
          options: ["EU size (36 to 44)", "US/UK size"],
        },
        replyMessage: `Is that EU, US, or UK size ${raw}? Our store catalog is listed in European sizes (36 to 44).`,
        canSearchCatalog: false,
      };
    }

    // 4. Ambiguous "yes" to a CHOICE question -> Clarify
    if (
      pendingQuestion?.type === "CHOICE" &&
      (updates?.isAmbiguousAffirmation ||
        ["yes", "yeah", "yep", "anything", "both", "all", "ok", "sure"].includes(
          textLower,
        ))
    ) {
      return {
        nextAction: "CLARIFY_PURPOSE",
        nextQuestion: pendingQuestion,
        replyMessage: "Which would you prefer: everyday, sports, or formal shoes?",
        canSearchCatalog: false,
      };
    }

    // 5. Relaxation handling to a BOOLEAN question (e.g. RELAX_PURPOSE)
    if (pendingQuestion?.field === "RELAX_PURPOSE") {
      if (
        updates?.isAffirmativeRelaxation ||
        ["yes", "yeah", "yep", "sure", "ok", "casual", "show casual", "show me casual", "casual is fine", "yeah casual is fine"].includes(
          textLower,
        )
      ) {
        return {
          nextAction: "SEARCH_PRODUCTS",
          nextQuestion: null,
          replyMessage: null,
          canSearchCatalog: true,
        };
      } else if (["no", "nope", "nah", "dont", "don't"].includes(textLower)) {
        return {
          nextAction: "ASK_PURPOSE",
          nextQuestion: {
            field: "PURPOSE",
            type: "CHOICE",
            options: ["Sports shoes", "Everyday sneakers", "Try another size"],
          },
          replyMessage: "Understood. Would you like to check sports shoes, everyday sneakers, or try another size?",
          canSearchCatalog: false,
        };
      }
    }

    // 6. Proactive suggestion requests
    if (
      updates?.isProactiveSuggestionRequest ||
      textLower.includes("suggest me") ||
      textLower.includes("suggest something") ||
      textLower.includes("yes suggest") ||
      textLower.includes("what do you have") ||
      textLower.includes("show me popular") ||
      textLower.includes("show all") ||
      (pendingQuestion?.field === "SIZE" &&
        ["yes", "sure", "ok", "suggest", "show me"].includes(textLower))
    ) {
      return {
        nextAction: "SEARCH_PRODUCTS",
        nextQuestion: null,
        replyMessage: null,
        canSearchCatalog: true,
      };
    }

    // 7. Child context: check if age is unknown and size is not yet adult size
    const wearer = state.wearer;
    const isChild =
      wearer?.type === "CHILD" ||
      ["daughter", "son", "kid", "child"].includes(wearer?.relation || "") ||
      (state.age !== null && state.age !== undefined && state.age <= 12);

    const hasAdultSize = state.size && state.size >= 36;

    if (isChild && (!wearer?.age || wearer.age === null) && !hasAdultSize) {
      const relName = wearer?.relation || "child";
      return {
        nextAction: "ASK_AGE",
        nextQuestion: { field: "AGE", type: "NUMBER" },
        replyMessage: `How old is your ${relName}?`,
        canSearchCatalog: false,
      };
    }

    // 8. Out-of-range size handling (e.g. size 28, 49)
    if (state.size !== null && state.size !== undefined) {
      const requestedSizeNum = state.size;
      if (!isNaN(requestedSizeNum) && (requestedSizeNum < 36 || requestedSizeNum > 44)) {
        return {
          nextAction: "ASK_SIZE",
          nextQuestion: {
            field: "SIZE",
            type: "SIZE",
            options: ["Show size 36 to 44", "Try another size"],
          },
          replyMessage: `Our store inventory currently carries adult footwear in sizes 36 to 44. Size ${state.size} is not available in stock. Would you like to see available options in size 36 or another size?`,
          canSearchCatalog: false,
        };
      }
    }

    // 9b. General Footwear Advice, Product Questions, & Casual Q&A
    const currIntent = (state.intent || "") as string;
    const updIntent = (updates?.intent || "") as string;
    if (
      currIntent === "GENERAL_SHOE_HELP" ||
      currIntent === "PRODUCT_QUESTION" ||
      currIntent === "CASUAL_CONVERSATION" ||
      updIntent === "GENERAL_SHOE_HELP" ||
      updIntent === "PRODUCT_QUESTION" ||
      updIntent === "CASUAL_CONVERSATION"
    ) {
      return {
        nextAction: "CASUAL_REPLY",
        nextQuestion: null,
        replyMessage:
          updates?.language?.naturalReply ||
          "I can help with shoe styles, fit, features, and recommendations. What are you looking for?",
        canSearchCatalog: false,
      };
    }


    // 10. Size is missing -> ASK_SIZE (Wearer-aware phrasing)

    if (state.size === null || state.size === undefined) {
      let sizePrompt = "What shoe size should I look for?";
      if (wearer?.relation === "daughter") {
        sizePrompt = "What shoe size does she usually wear?";
      } else if (wearer?.relation === "son") {
        sizePrompt = "What shoe size does he usually wear?";
      } else if (wearer?.relation === "sister") {
        sizePrompt = "What shoe size does she wear?";
      } else if (wearer?.relation === "brother") {
        sizePrompt = "What shoe size does he wear?";
      } else if (wearer?.relation === "husband") {
        sizePrompt = "What shoe size does he wear?";
      } else if (wearer?.relation === "wife") {
        sizePrompt = "What shoe size does she wear?";
      } else if (wearer?.relation === "mother") {
        sizePrompt = "What shoe size does she wear?";
      } else if (wearer?.relation === "father") {
        sizePrompt = "What shoe size does he wear?";
      } else if (wearer?.relation === "friend") {
        sizePrompt = "What shoe size do they wear?";
      } else if (wearer?.type === "OTHER") {
        sizePrompt = "What shoe size do they wear?";
      } else if (isChild) {
        sizePrompt = "What shoe size does your child usually wear?";
      } else if (updates?.gender === "MEN") {
        sizePrompt = "Got it, men's shoes! What size should I look for?";
      } else if (updates?.gender === "WOMEN") {
        sizePrompt = "Got it, women's shoes! What size should I look for?";
      } else if (updates?.brand) {
        sizePrompt = `Got it, ${updates.brand}! What shoe size should I look for?`;
      }

      return {
        nextAction: "ASK_SIZE",
        nextQuestion: { field: "SIZE", type: "SIZE" },
        replyMessage: sizePrompt,
        canSearchCatalog: false,
      };
    }

    // 11. Direct Brand Search when size is known or brand specifically requested
    if (state.brand && !state.purpose) {
      return {
        nextAction: "SEARCH_PRODUCTS",
        nextQuestion: null,
        replyMessage: null,
        canSearchCatalog: true,
      };
    }

    // 12. Purpose is missing -> ASK_PURPOSE
    if (!state.purpose && !state.brand) {
      let purposePrompt = "What kind of shoes are you looking for — casual, sporty, or formal?";
      if (updates?.isCorrection && updates?.size) {
        purposePrompt = `Got it, size ${state.size}. What kind of shoes are you looking for — casual, sporty, or formal?`;
      } else if (updates?.size && (wearer?.relation === "sister" || wearer?.relation === "daughter" || wearer?.relation === "mother" || wearer?.relation === "wife")) {
        purposePrompt = `Perfect, size ${state.size}. Is she looking for something casual, sporty, or formal?`;
      } else if (updates?.size && (wearer?.relation === "brother" || wearer?.relation === "son" || wearer?.relation === "father" || wearer?.relation === "husband")) {
        purposePrompt = `Perfect, size ${state.size}. Is he looking for something casual, sporty, or formal?`;
      } else if (updates?.size && (wearer?.relation === "friend" || wearer?.type === "OTHER")) {
        purposePrompt = `Perfect, size ${state.size}. Are they looking for something casual, sporty, or formal?`;
      } else if (updates?.size && !isChild) {
        purposePrompt = `Perfect, size ${state.size}. What kind are you after — casual, sporty, or formal?`;
      } else if (isChild) {
        purposePrompt = "Are they for everyday wear or sports?";
      }

      return {
        nextAction: "ASK_PURPOSE",
        nextQuestion: {
          field: "PURPOSE",
          type: "CHOICE",
          options: isChild ? ["Everyday", "Sports"] : ["Casual", "Sporty", "Formal"],
        },
        replyMessage: purposePrompt,
        canSearchCatalog: false,
      };
    }

    // 13. Size AND (Purpose OR Brand OR Budget) are known -> SEARCH_PRODUCTS
    return {
      nextAction: "SEARCH_PRODUCTS",
      nextQuestion: null,
      replyMessage: null,
      canSearchCatalog: true,
    };
  }

  /**
   * Deterministic conversation policy and state transition coordinator
   */
  private applyConversationPolicy(
    currentPreferences: ShoppingPreferences,
    currentPendingQuestion: PendingQuestion | null,
    updates: ExtractedDeltaUpdates,
    userMessage: string,
  ): {
    mergedPreferences: ShoppingPreferences;
    nextQuestion: PendingQuestion | null;
    replyMessage: string | null;
    canSearchCatalog: boolean;
  } {
    // 1. Route Intent
    const intent = this.classifyIntent(userMessage, currentPreferences, currentPendingQuestion, updates);
    updates.intent = intent;

    // 2. Merge State (3-State Distinction & Context-Sensitive Clearing)
    const mergedPreferences = this.mergeStateWithDelta(currentPreferences, updates, userMessage, currentPendingQuestion);

    // 3. Determine Next Action
    const actionResult = this.determineNextAction(mergedPreferences, userMessage, currentPendingQuestion, updates);
    mergedPreferences.nextAction = actionResult.nextAction;
    mergedPreferences.pendingQuestion = actionResult.nextQuestion;

    return {
      mergedPreferences,
      nextQuestion: actionResult.nextQuestion,
      replyMessage: actionResult.replyMessage,
      canSearchCatalog: actionResult.canSearchCatalog,
    };
  }

  /**
   * Phase 2: Centralized Search Constraint Builder
   */
  public buildProductSearchConstraints(preferences: ShoppingPreferences): ProductSearchConstraints {
    const size = preferences.size !== undefined && preferences.size !== null ? preferences.size : null;

    const isChild =
      preferences.wearer?.type === "CHILD" ||
      (preferences.wearer?.age !== null &&
        preferences.wearer?.age !== undefined &&
        preferences.wearer.age <= 12) ||
      (preferences.age !== null &&
        preferences.age !== undefined &&
        preferences.age <= 12) ||
      (size !== null && size < 36) ||
      preferences.gender === "kids";

    let gender: "Men" | "Women" | "Unisex" | "Kids" | null = null;
    if (isChild) {
      gender = "Kids";
    } else if (
      preferences.wearer?.gender === "GIRLS" ||
      preferences.gender === "women" ||
      preferences.gender === "WOMEN" ||
      preferences.gender === "woman"
    ) {
      gender = "Women";
    } else if (
      preferences.wearer?.gender === "BOYS" ||
      preferences.gender === "men" ||
      preferences.gender === "MEN" ||
      preferences.gender === "man"
    ) {
      gender = "Men";
    }

    return {
      gender,
      wearerType: preferences.wearer?.type || null,
      isChild,
      size,
      purpose: preferences.purpose || null,
      budgetMin: preferences.budgetMin ?? null,
      budgetMax: preferences.budgetMax ?? null,
      brand: preferences.brand ? preferences.brand.trim() : null,
      color: preferences.color ? preferences.color.toLowerCase().trim() : null,
      style: preferences.style ? preferences.style.toLowerCase().trim() : null,
      isRelaxationApproved: Boolean(preferences.isRelaxationApproved),
    };
  }

  /**
   * Phase 2: Authoritative storefront effective pricing calculation
   */
  public calculateEffectivePrice(
    basePrice: Prisma.Decimal | number,
    salePrice?: Prisma.Decimal | number | null,
  ): { displayPrice: number; originalPrice: number; isOnSale: boolean } {
    const base = Number(basePrice);
    const sale = salePrice !== null && salePrice !== undefined ? Number(salePrice) : null;
    if (sale !== null && !isNaN(sale) && sale > 0 && sale < base) {
      return { displayPrice: sale, originalPrice: base, isOnSale: true };
    }
    return { displayPrice: base, originalPrice: base, isOnSale: false };
  }

  /**
   * Phase 2: Deterministic Validation Barrier
   * Validates each candidate product against hard constraints before exposing it.
   */
  public validateRecommendation(
    product: {
      id: string;
      name: string;
      slug: string;
      basePrice: Prisma.Decimal | number;
      salePrice?: Prisma.Decimal | number | null;
      gender: ProductGender;
      isActive: boolean;
      brand: { name: string };
      category: { name: string; slug: string };
      variants: Array<{
        id: string;
        size: number;
        color: string;
        isActive: boolean;
        price?: Prisma.Decimal | number | null;
        inventory: { quantityOnHand: number; reservedQuantity: number } | null;
      }>;
    },
    constraints: ProductSearchConstraints,
  ): {
    valid: boolean;
    reason?: string;
    matchedVariant?: any;
    availableQuantity?: number;
    displayPrice?: number;
    originalPrice?: number;
  } {
    // 1. HARD: Active Product
    if (!product.isActive) {
      return { valid: false, reason: "Product is inactive" };
    }

    // 2. HARD: Brand Check (if requested as hard constraint)
    if (constraints.brand && !product.brand.name.toLowerCase().includes(constraints.brand.toLowerCase())) {
      return { valid: false, reason: `Brand ${product.brand.name} does not match requested ${constraints.brand}` };
    }

    // 3. HARD: Wearer/Gender Compatibility
    if (constraints.isChild && product.gender !== ProductGender.Kids) {
      return { valid: false, reason: "Adult product cannot be recommended for child" };
    }
    if (constraints.gender === "Women" && product.gender !== ProductGender.Women && product.gender !== ProductGender.Unisex) {
      return { valid: false, reason: "Product is not women/unisex compatible" };
    }
    if (constraints.gender === "Men" && product.gender !== ProductGender.Men && product.gender !== ProductGender.Unisex) {
      return { valid: false, reason: "Product is not men/unisex compatible" };
    }

    // 4. HARD: Style / Sub-Type Validation
    const pSlug = product.category.slug.toLowerCase();
    const pName = product.name.toLowerCase();

    if (constraints.style) {
      const s = constraints.style.toLowerCase();
      if (s.includes("loafer") || s.includes("moccasin")) {
        if (!pName.includes("loafer") && !pName.includes("moccasin") && !pName.includes("slip-on")) {
          return { valid: false, reason: "Product is not a loafer or moccasin" };
        }
      } else if (s.includes("heel") || s.includes("pump") || s.includes("stiletto") || s.includes("wedge")) {
        if (!pName.includes("heel") && !pName.includes("pump") && !pName.includes("stiletto") && !pName.includes("wedge")) {
          return { valid: false, reason: "Product is not a heel or pump" };
        }
      } else if (s.includes("boot") || s.includes("chelsea") || s.includes("chukka")) {
        if (!pName.includes("boot") && !pName.includes("chelsea") && !pName.includes("chukka")) {
          return { valid: false, reason: "Product is not a boot" };
        }
      } else if (s.includes("flat") || s.includes("ballet") || s.includes("mule")) {
        if (!pName.includes("flat") && !pName.includes("ballet") && !pName.includes("mule")) {
          return { valid: false, reason: "Product is not a flat" };
        }
      } else if (s.includes("football") || s.includes("cleat") || s.includes("soccer") || s.includes("futsal")) {
        if (!pName.includes("football") && !pName.includes("cleat") && !pName.includes("soccer") && !pName.includes("futsal") && !pName.includes("mercurial") && !pName.includes("predator")) {
          return { valid: false, reason: "Product is not a football boot/cleat" };
        }
      }
    }

    // 5. HARD: Purpose Taxonomy Compatibility
    if (constraints.purpose === "FORMAL") {
      const isTrueFormal =
        pSlug === "formal" ||
        pSlug === "dress" ||
        pName.includes("formal") ||
        pName.includes("oxford") ||
        pName.includes("brogue") ||
        pName.includes("derby") ||
        pName.includes("loafer") ||
        pName.includes("monk");
      if (!isTrueFormal) {
        return { valid: false, reason: "Product is not a formal shoe" };
      }
    } else if (constraints.purpose === "RUNNING") {
      const isRunning =
        pSlug === "sports" ||
        pName.includes("run") ||
        pName.includes("running") ||
        pName.includes("runner") ||
        pName.includes("pegasus") ||
        pName.includes("ultraboost") ||
        pName.includes("ghost") ||
        pName.includes("kayano");
      if (!isRunning) {
        return { valid: false, reason: "Product is not running-compatible" };
      }
    } else if (constraints.purpose === "SPORTS" || constraints.purpose === "GYM") {
      const isSports =
        pSlug === "sports" ||
        pName.includes("sport") ||
        pName.includes("gym") ||
        pName.includes("train") ||
        pName.includes("run") ||
        pName.includes("metcon") ||
        pName.includes("nano");
      if (!isSports) {
        return { valid: false, reason: "Product is not sports-compatible" };
      }
    }

    // 6. HARD: Find Active Matching Variant with Positive Stock (> 0)
    const inStockMatchingVariants = (product.variants || []).filter((v) => {
      if (!v.isActive) return false;
      const onHand = v.inventory?.quantityOnHand ?? 0;
      const reserved = v.inventory?.reservedQuantity ?? 0;
      const available = onHand - reserved;
      if (available <= 0) return false;

      // Exact Size Hard Constraint
      if (constraints.size !== null && v.size !== constraints.size) {
        return false;
      }

      return true;
    });

    if (inStockMatchingVariants.length === 0) {
      return { valid: false, reason: "No active in-stock variant matching requested size" };
    }

    const matchedVariant = inStockMatchingVariants[0];
    const availableQuantity = (matchedVariant.inventory?.quantityOnHand ?? 0) - (matchedVariant.inventory?.reservedQuantity ?? 0);

    // 7. HARD: Effective Price within Budget Bounds
    const pricing = this.calculateEffectivePrice(product.basePrice, product.salePrice);
    if (constraints.budgetMax !== null && pricing.displayPrice > constraints.budgetMax) {
      return { valid: false, reason: `Price ${pricing.displayPrice} exceeds max budget ${constraints.budgetMax}` };
    }
    if (constraints.budgetMin !== null && pricing.displayPrice < constraints.budgetMin) {
      return { valid: false, reason: `Price ${pricing.displayPrice} is below min budget ${constraints.budgetMin}` };
    }

    return {
      valid: true,
      matchedVariant,
      availableQuantity,
      displayPrice: pricing.displayPrice,
      originalPrice: pricing.originalPrice,
    };
  }

  /**
   * Phase 2: Authoritative Database Product Retrieval
   */
  async findRecommendedProducts(
    preferences: ShoppingPreferences,
  ): Promise<RecommendationSearchResult> {
    const constraints = this.buildProductSearchConstraints(preferences);

    // If child wearer or size < 36, check if kids products exist
    if (constraints.isChild) {
      const kidsCount = await this.prisma.product.count({
        where: { isActive: true, gender: ProductGender.Kids },
      });
      if (kidsCount === 0) {
        return { status: "NO_MATCH", products: [] };
      }
    }

    // Build database query filters
    const where: Prisma.ProductWhereInput = {
      isActive: true,
      category: { isActive: true },
      brand: { isActive: true },
      variants: {
        some: {
          isActive: true,
          ...(constraints.size !== null ? { size: constraints.size } : {}),
          inventory: {
            quantityOnHand: { gt: 0 },
          },
        },
      },
    };

    // Specific shoe sub-type / style filter
    const styleQuery = (constraints.style || "").toLowerCase();
    let styleOrFilters: Prisma.ProductWhereInput[] | null = null;

    if (styleQuery.includes("loafer") || styleQuery.includes("moccasin")) {
      styleOrFilters = [
        { name: { contains: "loafer", mode: "insensitive" } },
        { name: { contains: "moccasin", mode: "insensitive" } },
        { description: { contains: "loafer", mode: "insensitive" } },
        { description: { contains: "moccasin", mode: "insensitive" } },
      ];
    } else if (styleQuery.includes("heel") || styleQuery.includes("pump") || styleQuery.includes("stiletto") || styleQuery.includes("wedge")) {
      styleOrFilters = [
        { name: { contains: "heel", mode: "insensitive" } },
        { name: { contains: "pump", mode: "insensitive" } },
        { name: { contains: "stiletto", mode: "insensitive" } },
        { name: { contains: "wedge", mode: "insensitive" } },
        { description: { contains: "heel", mode: "insensitive" } },
        { description: { contains: "pump", mode: "insensitive" } },
      ];
    } else if (styleQuery.includes("boot") || styleQuery.includes("chelsea") || styleQuery.includes("chukka")) {
      styleOrFilters = [
        { name: { contains: "boot", mode: "insensitive" } },
        { name: { contains: "chelsea", mode: "insensitive" } },
        { name: { contains: "chukka", mode: "insensitive" } },
        { description: { contains: "boot", mode: "insensitive" } },
      ];
    } else if (styleQuery.includes("flat") || styleQuery.includes("ballet") || styleQuery.includes("mule")) {
      styleOrFilters = [
        { name: { contains: "flat", mode: "insensitive" } },
        { name: { contains: "ballet", mode: "insensitive" } },
        { name: { contains: "mule", mode: "insensitive" } },
        { description: { contains: "flat", mode: "insensitive" } },
      ];
    } else if (styleQuery.includes("sandal") || styleQuery.includes("slide")) {
      styleOrFilters = [
        { name: { contains: "sandal", mode: "insensitive" } },
        { name: { contains: "slide", mode: "insensitive" } },
        { description: { contains: "sandal", mode: "insensitive" } },
        { description: { contains: "slide", mode: "insensitive" } },
      ];
    } else if (styleQuery.includes("football") || styleQuery.includes("cleat") || styleQuery.includes("soccer") || styleQuery.includes("futsal")) {
      styleOrFilters = [
        { name: { contains: "football", mode: "insensitive" } },
        { name: { contains: "cleat", mode: "insensitive" } },
        { name: { contains: "soccer", mode: "insensitive" } },
        { name: { contains: "futsal", mode: "insensitive" } },
        { description: { contains: "football", mode: "insensitive" } },
      ];
    } else if (styleQuery.includes("tennis")) {
      styleOrFilters = [
        { name: { contains: "tennis", mode: "insensitive" } },
        { description: { contains: "tennis", mode: "insensitive" } },
      ];
    } else if (styleQuery.includes("training") || styleQuery.includes("gym") || styleQuery.includes("cross-train") || styleQuery.includes("lifter")) {
      styleOrFilters = [
        { name: { contains: "training", mode: "insensitive" } },
        { name: { contains: "gym", mode: "insensitive" } },
        { name: { contains: "cross-train", mode: "insensitive" } },
        { name: { contains: "lifter", mode: "insensitive" } },
        { description: { contains: "training", mode: "insensitive" } },
      ];
    } else if (styleQuery.includes("oxford") || styleQuery.includes("brogue") || styleQuery.includes("derby") || styleQuery.includes("monk strap")) {
      styleOrFilters = [
        { name: { contains: "oxford", mode: "insensitive" } },
        { name: { contains: "brogue", mode: "insensitive" } },
        { name: { contains: "derby", mode: "insensitive" } },
        { name: { contains: "monk strap", mode: "insensitive" } },
        { description: { contains: "oxford", mode: "insensitive" } },
      ];
    }

    if (styleOrFilters) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        { OR: styleOrFilters },
      ];
    } else if (constraints.purpose === "FORMAL") {
      where.OR = [
        { category: { slug: { in: ["formal", "dress"] } } },
        { name: { contains: "formal", mode: "insensitive" } },
        { name: { contains: "oxford", mode: "insensitive" } },
        { name: { contains: "brogue", mode: "insensitive" } },
        { name: { contains: "derby", mode: "insensitive" } },
        { name: { contains: "loafer", mode: "insensitive" } },
        { description: { contains: "formal", mode: "insensitive" } },
        { description: { contains: "oxford", mode: "insensitive" } },
      ];
    } else if (
      constraints.purpose === "SPORTS" ||
      constraints.purpose === "RUNNING" ||
      constraints.purpose === "GYM"
    ) {
      where.category = { slug: "sports", isActive: true };
    } else if (constraints.purpose === "EVERYDAY" || constraints.purpose === "CASUAL") {
      where.category = { slug: { in: ["men", "women", "sports"] }, isActive: true };
    }

    // Gender filter
    if (constraints.gender === "Women") {
      where.gender = { in: [ProductGender.Women, ProductGender.Unisex] };
    } else if (constraints.gender === "Men") {
      where.gender = { in: [ProductGender.Men, ProductGender.Unisex] };
    } else if (constraints.gender === "Kids") {
      where.gender = ProductGender.Kids;
    }

    // Brand filter
    if (constraints.brand) {
      where.brand = {
        name: { contains: constraints.brand, mode: "insensitive" },
        isActive: true,
      };
    }

    // Budget filter
    if (constraints.budgetMax !== null && constraints.budgetMax > 0) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          OR: [
            { salePrice: { not: null, lte: constraints.budgetMax } },
            { salePrice: null, basePrice: { lte: constraints.budgetMax } },
          ],
        },
      ];
    }

    if (constraints.budgetMin !== null && constraints.budgetMin > 0) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          OR: [
            { salePrice: { not: null, gte: constraints.budgetMin } },
            { salePrice: null, basePrice: { gte: constraints.budgetMin } },
          ],
        },
      ];
    }

    // Query candidate products from Prisma with minimal field selection
    let rawProducts = await this.prisma.product.findMany({
      where,
      take: 10,
      select: {
        id: true,
        name: true,
        slug: true,
        basePrice: true,
        salePrice: true,
        gender: true,
        isFeatured: true,
        isActive: true,
        brand: { select: { name: true } },
        category: { select: { name: true, slug: true } },
        images: {
          select: { url: true, isPrimary: true, sortOrder: true },
          orderBy: { sortOrder: "asc" },
          take: 2,
        },
        variants: {
          where: { isActive: true },
          select: {
            id: true,
            size: true,
            color: true,
            isActive: true,
            price: true,
            inventory: {
              select: {
                quantityOnHand: true,
                reservedQuantity: true,
              },
            },
          },
        },
      },
    });

    // Run each candidate through the Deterministic Validation Barrier
    const validCandidates: Array<{
      product: RecommendedProductDto;
      score: number;
    }> = [];

    for (const p of rawProducts) {
      const validation = this.validateRecommendation(p, constraints);
      if (!validation.valid) continue;

      const inStockVariants = (p.variants || []).filter((v) => {
        const onHand = v.inventory?.quantityOnHand ?? 0;
        const reserved = v.inventory?.reservedQuantity ?? 0;
        return v.isActive && onHand - reserved > 0;
      });

      const availableSizes = Array.from(new Set(inStockVariants.map((v) => v.size))).sort((a, b) => a - b);
      const availableColors = Array.from(new Set(inStockVariants.map((v) => v.color)));

      let score = 10;
      let matchingSizes: number[] | undefined;
      let matchingColors: string[] | undefined;

      if (constraints.size !== null && availableSizes.includes(constraints.size)) {
        score += 60;
        matchingSizes = [constraints.size];
      }

      if (constraints.color) {
        const foundColor = availableColors.find(
          (c) => c.toLowerCase() === constraints.color || constraints.color!.includes(c.toLowerCase()),
        );
        if (foundColor) {
          score += 30;
          matchingColors = [foundColor];
        }
      }

      if (constraints.brand && p.brand.name.toLowerCase().includes(constraints.brand.toLowerCase())) {
        score += 30;
      }

      if (p.isFeatured) {
        score += 10;
      }

      if (validation.availableQuantity && validation.availableQuantity > 5) {
        score += 5;
      }

      const primaryImg = p.images.find((img) => img.isPrimary) || p.images[0];
      const imageUrl = primaryImg?.url || "";

      validCandidates.push({
        score,
        product: {
          id: p.id,
          name: p.name,
          slug: p.slug,
          brand: p.brand.name,
          category: p.category.name,
          price: Number(p.basePrice),
          originalPrice: validation.originalPrice,
          salePrice: p.salePrice ? Number(p.salePrice) : null,
          displayPrice: validation.displayPrice ?? Number(p.basePrice),
          image: imageUrl,
          inStock: true,
          availableSizes,
          matchingSizes,
          matchedSize: constraints.size ?? undefined,
          matchedVariantId: validation.matchedVariant?.id,
          availableQuantity: validation.availableQuantity,
          matchingColors,
        },
      });
    }

    if (validCandidates.length === 0) {
      const possibleRelaxations: Array<"PURPOSE" | "BRAND" | "BUDGET" | "SIZE"> = [];
      if (constraints.purpose === "FORMAL") possibleRelaxations.push("PURPOSE");
      if (constraints.brand) possibleRelaxations.push("BRAND");
      if (constraints.budgetMax) possibleRelaxations.push("BUDGET");
      return {
        status: "NO_MATCH",
        products: [],
        possibleRelaxations,
      };
    }

    // Deterministic ranking: Sort descending by score
    validCandidates.sort((a, b) => b.score - a.score);

    // Return top 3-4 products maximum
    const finalProducts = validCandidates.slice(0, 4).map((c) => c.product);

    return {
      status: "MATCH",
      products: finalProducts,
    };
  }

  /**
   * Load the customer's most recent conversation with live catalog cards
   */
  async getLatestHistory(user: AuthenticatedUser): Promise<ShoppingAssistantHistoryResponse> {
    const conversation = await this.prisma.chatConversation.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 50,
        },
      },
    });

    if (!conversation || conversation.messages.length === 0) {
      return {
        conversationId: conversation ? conversation.id : null,
        preferences: null,
        pendingQuestion: null,
        messages: [],
      };
    }

    const allProductIds = Array.from(
      new Set(
        conversation.messages.flatMap((m) => {
          const meta = m.metadata as { productIds?: string[] } | null;
          return Array.isArray(meta?.productIds) ? meta.productIds : [];
        }),
      ),
    );

    const productMap = new Map<string, RecommendedProductDto>();
    if (allProductIds.length > 0) {
      const liveProducts = await this.fetchLiveRecommendedProducts(allProductIds);
      liveProducts.forEach((p) => productMap.set(p.id, p));
    }

    let lastPreferences: ShoppingPreferences | null = null;
    let lastPendingQuestion: PendingQuestion | null = null;

    const messages: HistoricalChatMessageDto[] = conversation.messages.map((m) => {
      const role: "user" | "assistant" =
        m.role === ChatMessageRole.USER ? "user" : "assistant";
      const meta = m.metadata as {
        productIds?: string[];
        preferences?: ShoppingPreferences;
        pendingQuestion?: PendingQuestion;
      } | null;

      if (meta?.preferences) {
        lastPreferences = meta.preferences;
      }
      if (meta?.pendingQuestion !== undefined) {
        lastPendingQuestion = meta.pendingQuestion || null;
      }

      const pIds = Array.isArray(meta?.productIds) ? meta.productIds : [];
      const prods = pIds
        .map((id) => productMap.get(id))
        .filter((p): p is RecommendedProductDto => Boolean(p));

      return {
        id: m.id,
        role,
        content: m.content,
        timestamp: m.createdAt.getTime(),
        products: prods.length > 0 ? prods : undefined,
      };
    });

    return {
      conversationId: conversation.id,
      preferences: lastPreferences,
      pendingQuestion: lastPendingQuestion,
      messages,
    };
  }

  private async fetchLiveRecommendedProducts(
    productIds: string[],
  ): Promise<RecommendedProductDto[]> {
    const rawProducts = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        basePrice: true,
        salePrice: true,
        brand: { select: { name: true } },
        category: { select: { name: true } },
        images: {
          select: { url: true, isPrimary: true, sortOrder: true },
          orderBy: { sortOrder: "asc" },
          take: 1,
        },
        variants: {
          where: { isActive: true },
          select: {
            id: true,
            size: true,
            color: true,
            inventory: {
              select: {
                quantityOnHand: true,
                reservedQuantity: true,
              },
            },
          },
        },
      },
    });

    return rawProducts.map((p) => {
      const inStockVariants = (p.variants || []).filter((v) => {
        const onHand = v.inventory?.quantityOnHand ?? 0;
        const reserved = v.inventory?.reservedQuantity ?? 0;
        return onHand - reserved > 0;
      });

      const availableSizes = Array.from(new Set(inStockVariants.map((v) => v.size))).sort((a, b) => a - b);
      const primaryImg = p.images.find((img) => img.isPrimary) || p.images[0];
      const pricing = this.calculateEffectivePrice(p.basePrice, p.salePrice);

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        brand: p.brand.name,
        category: p.category.name,
        price: Number(p.basePrice),
        originalPrice: pricing.originalPrice,
        salePrice: p.salePrice ? Number(p.salePrice) : null,
        displayPrice: pricing.displayPrice,
        image: primaryImg?.url || "",
        inStock: inStockVariants.length > 0,
        availableSizes,
      };
    });
  }

  private normalizeExtractedUpdates(
    parsed: any,
    userMessage: string,
    pendingQuestion: PendingQuestion | null,
    currentPreferences?: ShoppingPreferences,
  ): ExtractedDeltaUpdates {
    const textLower = userMessage.toLowerCase().trim();
    const updates: ExtractedDeltaUpdates = {};

    // 1. Wearer Relations (Comprehensive Relative Coverage)
    if (parsed.wearerType) updates.wearerType = parsed.wearerType as WearerType;
    if (parsed.wearerRelation) updates.wearerRelation = parsed.wearerRelation;
    if (typeof parsed.age === "number") updates.age = parsed.age;
    if (parsed.gender) updates.gender = parsed.gender;

    // Wearer relation parsing (Adult relations mapped to WOMEN/MEN, CHILD only with age/child context)
    if (
      textLower === "someone else" ||
      textLower === "for someone else" ||
      textLower === "someone" ||
      textLower.includes("someone else") ||
      textLower.includes("for someone else")
    ) {
      updates.wearerType = "OTHER";
      updates.wearerRelation = null;
      updates.isNewWearerContext = true;
    } else if (textLower.includes("daughter") || textLower.includes("for my girl")) {
      updates.wearerRelation = "daughter";
      updates.gender = updates.age && updates.age <= 12 ? "GIRLS" : "WOMEN";
      updates.wearerType = updates.age && updates.age <= 12 ? "CHILD" : "OTHER";
      updates.isNewWearerContext = true;
    } else if (textLower.includes("son") || textLower.includes("for my boy")) {
      updates.wearerRelation = "son";
      updates.gender = updates.age && updates.age <= 12 ? "BOYS" : "MEN";
      updates.wearerType = updates.age && updates.age <= 12 ? "CHILD" : "OTHER";
      updates.isNewWearerContext = true;
    } else if (textLower.includes("sister") || textLower.includes("for my sister") || textLower.includes("for my sis")) {
      updates.wearerRelation = "sister";
      updates.gender = updates.age && updates.age <= 12 ? "GIRLS" : "WOMEN";
      updates.wearerType = updates.age && updates.age <= 12 ? "CHILD" : "OTHER";
      updates.isNewWearerContext = true;
    } else if (textLower.includes("brother") || textLower.includes("for my brother") || textLower.includes("for my bro")) {
      updates.wearerRelation = "brother";
      updates.gender = updates.age && updates.age <= 12 ? "BOYS" : "MEN";
      updates.wearerType = updates.age && updates.age <= 12 ? "CHILD" : "OTHER";
      updates.isNewWearerContext = true;
    } else if (textLower.includes("husband") || textLower.includes("for my husband")) {
      updates.wearerType = "OTHER";
      updates.wearerRelation = "husband";
      updates.gender = "MEN";
      updates.isNewWearerContext = true;
    } else if (textLower.includes("wife") || textLower.includes("for my wife")) {
      updates.wearerType = "OTHER";
      updates.wearerRelation = "wife";
      updates.gender = "WOMEN";
      updates.isNewWearerContext = true;
    } else if (textLower.includes("mother") || textLower.includes("for my mom") || textLower.includes("for my mother")) {
      updates.wearerType = "OTHER";
      updates.wearerRelation = "mother";
      updates.gender = "WOMEN";
      updates.isNewWearerContext = true;
    } else if (textLower.includes("father") || textLower.includes("for my dad") || textLower.includes("for my father")) {
      updates.wearerType = "OTHER";
      updates.wearerRelation = "father";
      updates.gender = "MEN";
      updates.isNewWearerContext = true;
    } else if (textLower.includes("friend") || textLower.includes("for a friend")) {
      updates.wearerType = "OTHER";
      updates.wearerRelation = "friend";
      updates.isNewWearerContext = true;
    } else if (
      textLower.includes("myself") ||
      textLower.includes("for me") ||
      textLower.includes("for self") ||
      textLower.includes("buying shoes for myself") ||
      textLower === "me" ||
      textLower === "for yo" ||
      textLower === "for you"
    ) {
      updates.wearerType = "SELF";
      updates.wearerRelation = "myself";
      updates.isNewWearerContext = currentPreferences?.wearer?.type === "CHILD";
    }

    // Gender vs Purpose Separation (Step 9)
    if (textLower.includes("men shoes") || textLower.includes("men's shoes") || textLower.includes("for men") || textLower === "men") {
      updates.gender = "MEN";
      if (!updates.wearerType && !currentPreferences?.wearer?.relation) updates.wearerType = "SELF";
    } else if (textLower.includes("women shoes") || textLower.includes("women's shoes") || textLower.includes("for women") || textLower === "women") {
      updates.gender = "WOMEN";
      if (!updates.wearerType && !currentPreferences?.wearer?.relation) updates.wearerType = "SELF";
    }

    // Age parsing
    if (pendingQuestion?.field === "AGE") {
      const directAgeMatch =
        textLower.match(/^(\d{1,2})\s*(?:years?(?:\s*[-]?\s*old)?|yo|yr|year)?$/i) ||
        textLower.match(/(\d{1,2})\s*(?:years?(?:\s*[-]?\s*old)?|yo|yr|year)/i) ||
        textLower.match(/she\s*is\s*(\d{1,2})/i) ||
        textLower.match(/he\s*is\s*(\d{1,2})/i) ||
        textLower.match(/(\d{1,2})/);
      if (directAgeMatch) {
        updates.age = parseInt(directAgeMatch[1], 10);
        updates.wearerType = updates.age <= 12 ? "CHILD" : "OTHER";
      }
    } else {
      const ageMatch =
        textLower.match(/(\d+)\s*[-]?\s*(?:years?(?:\s*[-]?\s*old)?|yo|yr|year|age)/i) ||
        textLower.match(/age\s*[:=]?\s*(\d+)/i) ||
        textLower.match(/she\s*is\s*(\d{1,2})/i) ||
        textLower.match(/he\s*is\s*(\d{1,2})/i);
      if (ageMatch) {
        updates.age = parseInt(ageMatch[1], 10);
        updates.wearerType = updates.age <= 12 ? "CHILD" : "OTHER";
      }
    }

    // Post-process: Re-evaluate gender for child-capable relations when age is now known
    if (updates.age !== null && updates.age !== undefined && updates.age <= 12 && updates.wearerRelation) {
      if (["daughter", "sister"].includes(updates.wearerRelation)) {
        updates.gender = "GIRLS";
        updates.wearerType = "CHILD";
      } else if (["son", "brother"].includes(updates.wearerRelation)) {
        updates.gender = "BOYS";
        updates.wearerType = "CHILD";
      }
    }

    // 2. Strict Contextual Size Extraction & Normalization (Canonical number | null, NO silent conversions)
    if (pendingQuestion?.field !== "AGE") {
      let candidateSize: string | null = null;
      let detectedSystemHint: "US" | "UK" | "EU" | null = null;

      const hasExplicitSizeKeyword =
        textLower.includes("size") ||
        textLower.includes("sz") ||
        textLower.includes("shoe size") ||
        textLower.includes("wear") ||
        textLower.includes("eu") ||
        textLower.includes("us") ||
        textLower.includes("uk");

      const isSizeQuestionPending = pendingQuestion?.field === "SIZE";
      const isDistanceMeasurement = /\b\d+\s*(?:km|kms|kilometer|kilometers|mile|miles)\b/i.test(textLower);

      // Explicit system prefix match: "US size 8", "US 8", "UK 7", "EU 39", "8 US", "7 UK", "39 EU"
      const systemPrefixMatch =
        textLower.match(/\b(us|uk|eu)\s*(?:size)?\s*[:=]?\s*(\d{1,2}(?:\.\d)?)\b/i) ||
        textLower.match(/\b(\d{1,2}(?:\.\d)?)\s*(us|uk|eu)\b/i);

      if (systemPrefixMatch && !isDistanceMeasurement) {
        const isPrefix = ["us", "uk", "eu"].includes(systemPrefixMatch[1].toLowerCase());
        detectedSystemHint = (isPrefix ? systemPrefixMatch[1] : systemPrefixMatch[2]).toUpperCase() as "US" | "UK" | "EU";
        candidateSize = isPrefix ? systemPrefixMatch[2] : systemPrefixMatch[1];
        updates.sizeSystemHint = detectedSystemHint;
      } else if (!isDistanceMeasurement) {
        // Check for correction pattern: "I said 38, not 3838", "not 49, 39", "38 not 3838", "actually 39"
        const beforeNotMatch = textLower.match(/(\d{1,2}(?:\.\d)?)\s*,?\s*not\s*\d+/i);
        const afterNotMatch = textLower.match(/not\s*\d+[,]?\s*(\d{1,2}(?:\.\d)?)/i);
        const saidCorrectionMatch = textLower.match(/(?:i said|actually|mean|meant)\s*(\d{1,2}(?:\.\d)?)/i);
        const pureNumberMatch = textLower.match(/^(-?\d+(?:\.\d+)?)$/);

        if (beforeNotMatch) {
          candidateSize = beforeNotMatch[1];
          updates.isCorrection = true;
        } else if (afterNotMatch) {
          candidateSize = afterNotMatch[1];
          updates.isCorrection = true;
        } else if (saidCorrectionMatch) {
          candidateSize = saidCorrectionMatch[1];
          updates.isCorrection = true;
        } else if (pureNumberMatch && (isSizeQuestionPending || hasExplicitSizeKeyword)) {
          candidateSize = pureNumberMatch[1];
        } else if (parsed.size && (isSizeQuestionPending || hasExplicitSizeKeyword || (Number(parsed.size) >= 36 && Number(parsed.size) <= 44))) {
          candidateSize = String(parsed.size);
        } else if (hasExplicitSizeKeyword || isSizeQuestionPending) {
          const sizeMatch =
            textLower.match(/(?:size|sz)\s*[:=]?\s*(-?\d+(?:\.\d+)?)/i) ||
            textLower.match(/(?:actually|try|change\s*to|make\s*it|wear)?\s*\b([3-9]|1[0-4]|2[0-9]|3[0-9]|4[0-9]|50)\b/i);
          if (sizeMatch) {
            candidateSize = sizeMatch[1];
          }
        }
      }

      if (candidateSize) {
        const num = parseFloat(candidateSize.trim());
        updates.rawSizeInput = candidateSize;

        // Valid direct EU size (36 to 44)
        if (!isNaN(num) && num >= 36 && num <= 44 && (!detectedSystemHint || detectedSystemHint === "EU")) {
          updates.size = Math.round(num);
          updates.sizeSystemHint = "EU";
          updates.isInvalidSize = false;
          updates.isAmbiguousSmallSize = false;
        } else if (
          (detectedSystemHint === "US" || detectedSystemHint === "UK") ||
          (!isNaN(num) && num >= 4 && num <= 14 && detectedSystemHint !== "EU")
        ) {
          // Ambiguous small size or non-EU sizing (e.g. 8, 7, US 8, UK 7): DO NOT SILENTLY CONVERT
          updates.size = null;
          updates.isAmbiguousSmallSize = true;
          updates.isInvalidSize = false;
        } else if (isSizeQuestionPending || hasExplicitSizeKeyword) {
          // Explicitly invalid size when asked or stated as size
          updates.size = null;
          updates.isInvalidSize = true;
          updates.isAmbiguousSmallSize = false;
        }
      }
    }

    // 3. Purpose Normalization
    if (parsed.purpose) {
      updates.purpose = parsed.purpose.toUpperCase() as ShoePurpose;
    } else {
      if (textLower.includes("formal") || textLower.includes("office") || textLower.includes("dress") || textLower.includes("wedding") || textLower.includes("oxford") || textLower.includes("brogue")) {
        updates.purpose = "FORMAL";
      } else if (textLower.includes("running") || textLower.includes("jogging")) {
        updates.purpose = "RUNNING";
      } else if (textLower.includes("sport") || textLower.includes("gym") || textLower.includes("training") || textLower.includes("athletic") || textLower.includes("sporty") || textLower.includes("football") || textLower.includes("tennis")) {
        updates.purpose = "SPORTS";
      } else if (textLower.includes("everyday") || textLower.includes("daily") || textLower.includes("lifestyle")) {
        updates.purpose = "EVERYDAY";
      } else if (textLower.includes("casual") || textLower.includes("loafer") || textLower.includes("flat") || textLower.includes("sandal") || textLower.includes("boot") || textLower.includes("heel")) {
        updates.purpose = "CASUAL";
      }
    }

    // 4. Budget Normalization
    if (typeof parsed.budgetMax === "number") updates.budgetMax = parsed.budgetMax;
    if (typeof parsed.budgetMin === "number") updates.budgetMin = parsed.budgetMin;

    const budgetMatch = textLower.match(/(?:under|below|max|budget)\s*(?:pkr|rs\.?)?\s*(\d+)/i);
    if (budgetMatch) {
      updates.budgetMax = parseInt(budgetMatch[1], 10);
    }

    // 5. Brand Normalization (with Typo Resilience)
    const knownBrands = [
      "Nike", "Adidas", "Puma", "ASICS", "New Balance", "Reebok", "Skechers",
      "Clarks", "Aldo", "Timberland", "Bata", "Hush Puppies", "Steve Madden", "Vans", "Converse"
    ];
    const brandAliases: Record<string, string> = {
      "nik": "Nike",
      "nike": "Nike",
      "adiddas": "Adidas",
      "addidas": "Adidas",
      "adidas": "Adidas",
      "puma": "Puma",
      "asics": "ASICS",
      "reebok": "Reebok",
      "rebok": "Reebok",
      "new balance": "New Balance",
      "newbalance": "New Balance",
      "nb": "New Balance",
      "skechers": "Skechers",
      "sketchers": "Skechers",
      "clark": "Clarks",
      "clarks": "Clarks",
      "aldo": "Aldo",
      "timberland": "Timberland",
      "timberlands": "Timberland",
      "timbs": "Timberland",
      "bata": "Bata",
      "hush puppies": "Hush Puppies",
      "hushpuppies": "Hush Puppies",
      "hush puppy": "Hush Puppies",
      "steve madden": "Steve Madden",
      "stevemadden": "Steve Madden",
      "madden": "Steve Madden",
      "van": "Vans",
      "vans": "Vans",
      "converse": "Converse",
      "chucks": "Converse",
    };

    for (const [alias, canonical] of Object.entries(brandAliases)) {
      const regex = new RegExp(`\\b${alias}\\b`, "i");
      if (regex.test(textLower)) {
        updates.brand = canonical;
        break;
      }
    }

    if (!updates.brand) {
      for (const b of knownBrands) {
        if (textLower.includes(b.toLowerCase())) {
          updates.brand = b;
          break;
        }
      }
    }

    if (!updates.brand && parsed.brand && typeof parsed.brand === "string" && parsed.brand.trim().length > 0) {
      updates.brand = parsed.brand.trim();
    }

    if (!updates.brand) {
      const brandWordMatch = textLower.match(/\b([a-z0-9_-]+)\s+(?:sports|running|casual|formal|gym|sneakers?|shoes?)\b/i);
      if (brandWordMatch) {
        const candidateBrand = brandWordMatch[1].toLowerCase();
        const nonBrandWords = [
          "men", "mens", "women", "womens", "boy", "boys", "girl", "girls", "kid", "kids",
          "black", "white", "blue", "red", "green", "grey", "gray", "brown", "beige", "navy",
          "cheap", "cheaper", "best", "new", "top", "good", "some", "any", "show", "find",
          "need", "want", "running", "runner", "sports", "sport", "sporty", "casual", "formal", "gym",
          "everyday", "daily", "lifestyle", "comfort", "outdoor", "stylish", "nice", "cool", "looking",
          "yeah", "yes", "sure", "ok", "fine", "instead", "actually", "for", "with", "pair", "size", "under", "below"
        ];
        if (!nonBrandWords.includes(candidateBrand) && candidateBrand.length > 2) {
          updates.brand = brandWordMatch[1];
        }
      }
    }

    // 6. Style & Comfort Extraction
    if (parsed.style) updates.style = parsed.style;
    if (parsed.comfort) updates.comfort = parsed.comfort;

    if (!updates.style) {
      if (textLower.includes("loafer") || textLower.includes("moccasin")) {
        updates.style = "loafers";
      } else if (textLower.includes("heel") || textLower.includes("pump") || textLower.includes("stiletto") || textLower.includes("wedge")) {
        updates.style = "heels";
      } else if (textLower.includes("boot") || textLower.includes("chelsea") || textLower.includes("chukka")) {
        updates.style = "boots";
      } else if (textLower.includes("flat") || textLower.includes("ballet") || textLower.includes("mule")) {
        updates.style = "flats";
      } else if (textLower.includes("sandal") || textLower.includes("slide")) {
        updates.style = "sandals";
      } else if (textLower.includes("football") || textLower.includes("cleat") || textLower.includes("soccer") || textLower.includes("futsal")) {
        updates.style = "football";
      } else if (textLower.includes("tennis")) {
        updates.style = "tennis";
      } else if (textLower.includes("gym") || textLower.includes("cross-train") || textLower.includes("training") || textLower.includes("workout")) {
        updates.style = "training";
      } else if (textLower.includes("oxford") || textLower.includes("brogue") || textLower.includes("derby") || textLower.includes("monk strap")) {
        updates.style = "oxfords";
      } else if (textLower.includes("office and casual") || textLower.includes("office but") || textLower.includes("versatile")) {
        updates.style = "versatile office & casual";
      }
    }

    if (!updates.comfort && (textLower.includes("10 km") || textLower.includes("walking") || textLower.includes("comfort"))) {
      updates.comfort = "high-mileage walking comfort";
    }

    // 7. Product Comparison Extraction
    if (Array.isArray(parsed.comparedProducts) && parsed.comparedProducts.length >= 2) {
      updates.comparedProducts = parsed.comparedProducts;
    } else if (textLower.includes(" vs ") || textLower.includes("compare ")) {
      const compareMatch = textLower.match(/(?:compare\s+)?([a-z0-9\s]+?)\s+(?:vs\.?|and|with)\s+([a-z0-9\s]+)/i);
      if (compareMatch) {
        updates.comparedProducts = [compareMatch[1].trim(), compareMatch[2].trim()];
      }
    }

    // 8. Order Number Extraction
    if (parsed.orderNumber) {
      updates.orderNumber = String(parsed.orderNumber).trim();
    } else {
      const orderMatch = textLower.match(/(?:order\s*#?|ord[-_]?)\s*([a-z0-9-]{4,36})/i);
      if (orderMatch) {
        updates.orderNumber = orderMatch[1].trim();
      }
    }

    // 9. Store Information Topic Extraction
    if (parsed.storeInfoTopic) {
      updates.storeInfoTopic = parsed.storeInfoTopic;
    } else if (textLower.includes("return") || textLower.includes("exchange") || textLower.includes("refund")) {
      updates.storeInfoTopic = "RETURNS";
    } else if (textLower.includes("delivery") || textLower.includes("shipping") || textLower.includes("how long")) {
      updates.storeInfoTopic = "SHIPPING";
    } else if (textLower.includes("payment") || textLower.includes("cod") || textLower.includes("cash on delivery") || textLower.includes("card")) {
      updates.storeInfoTopic = "PAYMENT";
    } else if (textLower.includes("warranty") || textLower.includes("guarantee") || textLower.includes("authentic")) {
      updates.storeInfoTopic = "WARRANTY";
    } else if (textLower.includes("size chart") || textLower.includes("size guide") || textLower.includes("how to measure")) {
      updates.storeInfoTopic = "SIZING";
    }

    // 10. Budget & Age Sanity Bounds (reject negative budgets or impossible ages)
    if (typeof updates.budgetMax === "number" && updates.budgetMax <= 0) updates.budgetMax = null;
    if (typeof updates.budgetMin === "number" && updates.budgetMin < 0) updates.budgetMin = null;
    if (typeof updates.age === "number" && (updates.age < 1 || updates.age > 100)) updates.age = null;

    // 11. Color Normalization
    if (parsed.color) updates.color = parsed.color;
    const knownColors = ["black", "white", "blue", "red", "green", "grey", "brown", "beige", "navy"];
    for (const c of knownColors) {
      if (textLower.includes(c)) {
        updates.color = c;
        break;
      }
    }

    // 12. Explicit Cleared Fields
    const cleared: Array<"brand" | "color" | "budget" | "size" | "purpose"> = [];
    if (textLower.includes("no brand") || textLower.includes("any brand") || textLower.includes("without brand")) {
      cleared.push("brand");
    }
    if (textLower.includes("any color") || textLower.includes("no color preference")) {
      cleared.push("color");
    }
    if (textLower.includes("no budget") || textLower.includes("any price")) {
      cleared.push("budget");
    }
    if (cleared.length > 0) {
      updates.clearedFields = cleared;
    }

    // 13. Ambiguity, Relaxation, and Proactive Suggestion flags
    updates.isAmbiguousAffirmation = Boolean(parsed.isAmbiguousAffirmation);
    updates.isAffirmativeRelaxation = Boolean(
      parsed.isAffirmativeRelaxation ||
      textLower.includes("casual is fine") ||
      textLower.includes("yeah casual is fine") ||
      textLower.includes("sure casual")
    );
    updates.isNewWearerContext = Boolean(parsed.isNewWearerContext || updates.isNewWearerContext);
    updates.isCorrection = Boolean(parsed.isCorrection || updates.isCorrection);
    updates.isProactiveSuggestionRequest = Boolean(
      parsed.isProactiveSuggestionRequest ||
        textLower.includes("suggest") ||
        textLower.includes("popular") ||
        textLower.includes("what do you have"),
    );

    // 14. Natural Language Phrasing Payload (Phase 3)
    if (parsed.language && typeof parsed.language === "object") {
      updates.language = {
        acknowledgement: parsed.language.acknowledgement || null,
        question: parsed.language.question || null,
        naturalReply: parsed.language.naturalReply || null,
      };
    }

    return updates;
  }

  private extractFallbackUpdates(
    userMessage: string,
    pendingQuestion: PendingQuestion | null,
    currentPreferences?: ShoppingPreferences,
  ): ExtractedDeltaUpdates {
    return this.normalizeExtractedUpdates({}, userMessage, pendingQuestion, currentPreferences);
  }

  private sanitizePreferences(prefs?: Partial<ShoppingPreferences>): ShoppingPreferences {
    if (!prefs || typeof prefs !== "object") {
      return { version: 3 };
    }

    const wearer: WearerInfo | null = prefs.wearer
      ? {
          type: prefs.wearer.type || null,
          relation: prefs.wearer.relation || null,
          age: typeof prefs.wearer.age === "number" ? prefs.wearer.age : null,
          gender: prefs.wearer.gender || null,
        }
      : null;

    let cleanSize: number | null = null;
    if (typeof prefs.size === "number") {
      cleanSize = isNaN(prefs.size) ? null : prefs.size;
    } else if (prefs.size !== undefined && prefs.size !== null) {
      const parsedNum = parseInt(String(prefs.size).replace(/\D/g, "").slice(0, 2), 10);
      if (!isNaN(parsedNum)) {
        cleanSize = parsedNum;
      }
    }

    // Only accept valid EU shoe sizes between 36 and 44
    if (cleanSize !== null && (cleanSize < 36 || cleanSize > 44)) {
      cleanSize = null;
    }

    return {
      version: 3,
      intent: prefs.intent || null,
      wearer,
      size: cleanSize,
      rawSizeInput: prefs.rawSizeInput || null,
      sizeSystem: prefs.sizeSystem || null,
      purpose: (prefs.purpose as ShoePurpose) || null,
      budgetMin: typeof prefs.budgetMin === "number" ? prefs.budgetMin : null,
      budgetMax: typeof prefs.budgetMax === "number" ? prefs.budgetMax : null,
      brand: typeof prefs.brand === "string" ? prefs.brand : null,
      color: typeof prefs.color === "string" ? prefs.color : null,
      style: typeof prefs.style === "string" ? prefs.style : null,
      comfort: typeof prefs.comfort === "string" ? prefs.comfort : null,
      comfortPreference: typeof prefs.comfortPreference === "string" ? prefs.comfortPreference : null,
      other: typeof prefs.other === "string" ? prefs.other : null,
      isRelaxationApproved: Boolean(prefs.isRelaxationApproved),
      age: typeof prefs.age === "number" ? prefs.age : wearer?.age || null,
      gender: typeof prefs.gender === "string" ? prefs.gender : wearer?.gender || null,
      pendingQuestion: prefs.pendingQuestion || null,
      nextAction: prefs.nextAction || null,
    };
  }
}
