import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ShoppingAssistantToolsService } from "./tools/shopping-assistant-tools.service";
import { GroqLlmService, type ToolCallItem } from "./llm/groq-llm.service";
import type {
  ChatMessageItem,
  ProductCatalogSummary,
  RecommendedProductDto,
  ShoppingAssistantChatResponseDto,
  TelemetryLog,
} from "./types/shopping-assistant.types";
import { ChatMessageRole } from "@prisma/client";

const SYSTEM_PROMPT = `You are the AI Shopping Assistant for Shoe Store (shoestore.live), a premier footwear store in Pakistan.
Your role is to help customers discover, understand, compare, and choose shoes from our real store catalog, while being a pleasant, intelligent conversational companion.

CORE INSTRUCTIONS & POLICIES:
1. GENERAL GREETINGS & CASUAL CHAT ("Hi", "How are you?", "Assalamualaikum", "Thanks"):
   - Respond warmly, naturally, and concisely.
   - DO NOT ask for shoe size or force a shopping flow unless the user asks for shoes.
   - DO NOT call search tools for general greetings.

2. GENERAL KNOWLEDGE / UNRELATED QUESTIONS ("Who is the Prime Minister of Pakistan?", "What is 2+2?", "Tell me a joke", "What is AI?"):
   - Answer the user's question accurately and helpfully.
   - DO NOT invent shoe questions or ask for shoe sizes.
   - DO NOT inject product recommendations into unrelated questions.

3. CONTEXTUAL NUMERIC UNDERSTANDING:
   - "10 km" = walking/running distance, NOT shoe size 10.
   - "10 years old" / "My son is 8" = age, NOT shoe size.
   - "15000" / "under 20k" = budget in PKR, NOT shoe size.
   - "42" / "size 44" = shoe size (when discussing shoe fit).
   - "67" / "90" / "-1" = not valid standard shoe sizes; interpret contextually.

4. PRODUCT DISCOVERY & RECOMMENDATIONS:
   - Whenever the customer indicates they want to find, buy, or see shoes (e.g. "I need running shoes", "comfortable walking shoes", "shoes for my sister", "women's shoes", "under 15000", "show me Nike"), ALWAYS invoke 'search_products' immediately to fetch matching catalog shoes.
   - Do NOT stop to ask clarifying questions before searching; search first, present the top options, and then offer follow-up refinements if helpful.
   - The backend tool will return real verified products from the database with real prices, sizes, colors, and stock.
   - In your synthesis response, explain naturally why the options match the customer's request.
   - NEVER fabricate products, prices, discounts, sizes, or stock.
   - If the search tool returns 0 matching products, tell the user honestly that no exact match was found in the store catalog and suggest adjusting criteria (e.g., budget or color).

5. THIRD-PARTY SHOPPING:
   - When the customer is shopping for someone else ("for my sister", "for my father", "for my daughter"), naturally address the intended recipient.

6. CONVERSATIONAL CONTEXT:
   - Maintain context across recent messages. If the user corrects or resets context ("Actually forget that, I need running shoes for myself"), immediately adapt to the new request without carrying over old constraints.
   - Do NOT ask for information the user has already provided.
   - Only ask a follow-up question if it is genuinely necessary to narrow down choices.

7. STORE POLICIES:
   - 7-Day Hassle-Free Exchange on unworn shoes.
   - Free shipping across Pakistan on orders above PKR 5,000.
   - Cash on Delivery (COD) and Online Card Payment supported.
   - 100% Genuine and Quality Checked.

8. RESPONSE FORMATTING & PRESENTATION (CRITICAL):
   - Write in a friendly, conversational, modern tone suitable for a sleek chat interface.
   - NEVER generate multi-column markdown tables (e.g. | Product | Color | Size | Price | ... |). Markdown tables break layout and look terrible on mobile chat screens.
   - Instead, present product details, comparisons, and availability using clean conversational sentences, concise bullet points (• or -), and bold highlights (**Nike Pegasus 40**, **PKR 27,500**).
   - When presenting shoe specs or availability, use elegant bullet points:
     • **Product**: Nike Pegasus 40 Running Shoes
     • **Size & Fit**: Size 39 (In Stock & ready to ship)
     • **Price**: PKR 27,500 (Discounted from PKR 31,000)
     • **Colors**: Blue (also available in Grey)
   - Keep replies concise (2-4 sentences max plus bullet points). Interactive product cards with photos, prices, and links appear automatically below your message, so do not output repetitive catalog dumps.`;

@Injectable()
export class ShoppingAssistantService {
  private readonly logger = new Logger(ShoppingAssistantService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly toolsService: ShoppingAssistantToolsService,
    private readonly llmService: GroqLlmService,
  ) {}

  /**
   * Main entry point for customer chat messages
   */
  async processChat(
    message: string,
    history: ChatMessageItem[] = [],
    userId?: string,
    conversationId?: string,
  ): Promise<ShoppingAssistantChatResponseDto> {
    const startTime = Date.now();
    const cleanMessage = message.trim();

    // Prepare LLM message history (recent 10 messages max to maintain speed & context)
    const recentHistory = (history || [])
      .filter((m) => m.content && m.content.trim().length > 0)
      .slice(-10);

    const decisionMessages: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }> = [
      { role: "system", content: SYSTEM_PROMPT },
      ...recentHistory.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: cleanMessage },
    ];

    let llmLatencyMs = 0;
    let toolLatencyMs = 0;
    let executedToolCalls: string[] = [];
    let validatedProducts: ProductCatalogSummary[] = [];
    let assistantReply = "";
    let detectedIntent = "GENERAL_CONVERSATION";

    try {
      // ───────────────────────────────────────────────────────────────────────
      // Step 1: LLM Decision & Tool Calling Pass
      // ───────────────────────────────────────────────────────────────────────
      const decision = await this.llmService.generateDecision(decisionMessages);
      llmLatencyMs += decision.latencyMs;

      if (decision.toolCalls && decision.toolCalls.length > 0) {
        detectedIntent = "TOOL_ASSISTED";
        const toolStartTime = Date.now();

        // ─────────────────────────────────────────────────────────────────────
        // Step 2: Execute Real Backend Database Tools
        // ─────────────────────────────────────────────────────────────────────
        const toolOutputs: Array<{
          tool_call_id: string;
          name: string;
          output: any;
        }> = [];

        for (const toolCall of decision.toolCalls) {
          executedToolCalls.push(toolCall.name);
          const args = toolCall.arguments || {};
          let result: any = null;

          switch (toolCall.name) {
            case "search_products": {
              const res = await this.toolsService.searchProducts(args);
              result = res;
              validatedProducts.push(...res.products);
              break;
            }
            case "get_product_details": {
              const res = await this.toolsService.getProductDetails(args);
              result = res;
              if (res.found && res.product) {
                validatedProducts.push(res.product);
              }
              break;
            }
            case "compare_products": {
              const res = await this.toolsService.compareProducts(args);
              result = res;
              validatedProducts.push(...res.products);
              break;
            }
            case "check_availability": {
              const res = await this.toolsService.checkAvailability(args);
              result = res;
              if (res.product) {
                validatedProducts.push(res.product);
              }
              break;
            }
            case "get_store_policy_info": {
              const res = await this.toolsService.getStorePolicyInfo(args);
              result = res;
              break;
            }
            default: {
              result = { error: `Unknown tool: ${toolCall.name}` };
            }
          }

          toolOutputs.push({
            tool_call_id: toolCall.id,
            name: toolCall.name,
            output: result,
          });
        }

        toolLatencyMs = Date.now() - toolStartTime;

        // ─────────────────────────────────────────────────────────────────────
        // Step 3: LLM Synthesis with Grounded Verified Database Output
        // ─────────────────────────────────────────────────────────────────────
        const synthesisMessages: Array<{
          role: "system" | "user" | "assistant" | "tool";
          content: string;
          name?: string;
          tool_call_id?: string;
        }> = [
          { role: "system", content: SYSTEM_PROMPT },
          ...recentHistory.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          { role: "user", content: cleanMessage },
          // Assistant's tool call invocation declaration
          {
            role: "assistant",
            content: `Invoking tools: ${JSON.stringify(decision.toolCalls)}`,
          },
          // Factual Tool Results
          ...toolOutputs.map((to) => ({
            role: "tool" as const,
            name: to.name,
            tool_call_id: to.tool_call_id,
            content: JSON.stringify(to.output),
          })),
          {
            role: "system",
            content:
              "Synthesize your response for the user based strictly on the factual tool results above. Present the information with natural conversational text, bold highlights, and clean bullet points. DO NOT use markdown tables.",
          },
        ];

        const synthesis = await this.llmService.generateSynthesis(synthesisMessages);
        llmLatencyMs += synthesis.latencyMs;
        assistantReply = synthesis.content;
      } else {
        // Direct response from decision pass (general conversation, greetings, factual questions)
        assistantReply =
          decision.content ||
          "I'm here to help you find the right shoes or answer questions about our store. What are you looking for today?";
      }
    } catch (err: any) {
      this.logger.error(`Error in ShoppingAssistantService processChat: ${err.message}`);
      assistantReply =
        "I'm here to help you discover shoes from our store. What kind of shoes are you looking for today?";
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Step 4: Product Factuality Barrier & Deduplication
    // ─────────────────────────────────────────────────────────────────────────
    const uniqueProductsMap = new Map<string, ProductCatalogSummary>();
    for (const p of validatedProducts) {
      if (!uniqueProductsMap.has(p.id)) {
        uniqueProductsMap.set(p.id, p);
      }
    }

    const recommendedProductDtos: RecommendedProductDto[] = Array.from(
      uniqueProductsMap.values(),
    )
      .slice(0, 6)
      .map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        brand: p.brand,
        category: p.category,
        price: p.price,
        salePrice: p.salePrice,
        displayPrice: p.displayPrice,
        image: p.image,
        inStock: p.inStock,
        availableSizes: p.availableSizes,
        matchingSizes: p.availableSizes,
        matchingColors: p.availableColors,
      }));

    const totalLatencyMs = Date.now() - startTime;

    // Safe Development Telemetry
    const telemetry: TelemetryLog = {
      model: "openai/gpt-oss-120b",
      llmUsed: this.llmService.isConfigured(),
      intent: detectedIntent,
      toolCalls: executedToolCalls,
      llmLatencyMs,
      toolLatencyMs,
      totalLatencyMs,
      productsCount: recommendedProductDtos.length,
    };
    this.logger.log(
      `[CHAT_TELEMETRY] model=${telemetry.model} llm=${telemetry.llmUsed ? "USED" : "FALLBACK"} intent=${telemetry.intent} tools=[${telemetry.toolCalls.join(",")}] products=${telemetry.productsCount} llm_latency=${telemetry.llmLatencyMs}ms tool_latency=${telemetry.toolLatencyMs}ms total_latency=${telemetry.totalLatencyMs}ms`,
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Step 5: Persist Conversation History for Authenticated Customers
    // ─────────────────────────────────────────────────────────────────────────
    let activeConversationId = conversationId || null;
    if (userId) {
      try {
        activeConversationId = await this.persistHistory(
          userId,
          cleanMessage,
          assistantReply,
          recommendedProductDtos,
          conversationId,
        );
      } catch (dbErr: any) {
        this.logger.warn(`Failed to persist chat history for user ${userId}: ${dbErr.message}`);
      }
    }

    return {
      conversationId: activeConversationId,
      message: assistantReply,
      readyForRecommendations: recommendedProductDtos.length > 0,
      products: recommendedProductDtos.length > 0 ? recommendedProductDtos : undefined,
    };
  }

  /**
   * Retrieve latest conversation history for authenticated user
   */
  async getLatestHistory(userId: string) {
    const conversation = await this.prisma.chatConversation.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 30,
        },
      },
    });

    if (!conversation) {
      return {
        conversationId: null,
        messages: [],
      };
    }

    const messages = conversation.messages.map((m) => ({
      id: m.id,
      role: m.role === ChatMessageRole.USER ? ("user" as const) : ("assistant" as const),
      content: m.content,
      timestamp: m.createdAt.getTime(),
      products: (m.metadata as any)?.products || undefined,
    }));

    return {
      conversationId: conversation.id,
      messages,
    };
  }

  private async persistHistory(
    userId: string,
    userMessage: string,
    assistantReply: string,
    products: RecommendedProductDto[],
    existingConversationId?: string,
  ): Promise<string> {
    let conversation = existingConversationId
      ? await this.prisma.chatConversation.findFirst({
          where: { id: existingConversationId, userId },
        })
      : null;

    if (!conversation) {
      conversation = await this.prisma.chatConversation.create({
        data: { userId },
      });
    } else {
      await this.prisma.chatConversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      });
    }

    await this.prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        role: ChatMessageRole.USER,
        content: userMessage,
      },
    });

    await this.prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        role: ChatMessageRole.ASSISTANT,
        content: assistantReply,
        metadata: products.length > 0 ? ({ products } as any) : undefined,
      },
    });

    return conversation.id;
  }
}
