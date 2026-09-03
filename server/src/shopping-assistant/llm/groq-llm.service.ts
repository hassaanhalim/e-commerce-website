import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Groq from "groq-sdk";

export interface ToolCallItem {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface LlmDecisionResult {
  toolCalls: ToolCallItem[];
  content: string | null;
  model: string;
  latencyMs: number;
}

export interface LlmSynthesisResult {
  content: string;
  model: string;
  latencyMs: number;
}

const TOOLS_SCHEMA: Groq.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_products",
      description:
        "Search the shoe store catalog by customer criteria such as gender, category, brand, price limit, size, or color. ALWAYS invoke this tool immediately whenever the customer expresses interest in finding, discovering, or buying shoes (e.g. 'I need running shoes', 'women shoes', 'shoes for my sister', 'something comfortable for walking', 'Nike shoes', 'under 15000'). Do not merely ask follow-up questions without retrieving initial recommendations.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: ["string", "null"] as any,
            description: "Free-text keywords e.g. 'running shoes', 'sneakers', 'leather oxford'",
          },
          gender: {
            type: ["string", "null"] as any,
            description: "Target wearer gender ('Men', 'Women', 'Unisex', 'Kids')",
          },
          category: {
            type: ["string", "null"] as any,
            description: "Category name e.g. 'Sports', 'Men', 'Women'",
          },
          brand: {
            type: ["string", "null"] as any,
            description: "Brand name e.g. 'Nike', 'Adidas', 'Puma', 'ASICS', 'Skechers', 'Vans'",
          },
          minPrice: {
            type: ["number", "null"] as any,
            description: "Minimum price in PKR",
          },
          maxPrice: {
            type: ["number", "null"] as any,
            description: "Maximum budget or price in PKR",
          },
          size: {
            type: ["number", "null"] as any,
            description: "Shoe size (e.g. 40, 41, 42, 43, 44)",
          },
          color: {
            type: ["string", "null"] as any,
            description: "Color name e.g. 'Black', 'White', 'Blue', 'Red'",
          },
          limit: {
            type: ["number", "null"] as any,
            description: "Max products to return (default 4)",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_product_details",
      description: "Get detailed information about a specific shoe by name or slug.",
      parameters: {
        type: "object",
        properties: {
          productName: {
            type: "string",
            description: "Name of the shoe e.g. 'Nike Air Max 270', 'Pegasus 40'",
          },
          productIdOrSlug: {
            type: ["string", "null"] as any,
            description: "Product ID or URL slug if known",
          },
        },
        required: ["productName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compare_products",
      description: "Compare 2 to 3 specific shoe models side by side.",
      parameters: {
        type: "object",
        properties: {
          productNamesOrIds: {
            type: "array",
            items: { type: "string" },
            description: "Names or IDs of the products to compare",
          },
        },
        required: ["productNamesOrIds"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_availability",
      description: "Check if a specific shoe is in stock in a specific size or color.",
      parameters: {
        type: "object",
        properties: {
          productName: {
            type: "string",
            description: "Name of the shoe e.g. 'Nike Air Force 1'",
          },
          size: {
            type: ["number", "null"] as any,
            description: "Shoe size to check (e.g. 42)",
          },
          color: {
            type: ["string", "null"] as any,
            description: "Color to check (e.g. 'White')",
          },
        },
        required: ["productName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_store_policy_info",
      description: "Get verified store policies such as exchange/return period, free delivery thresholds, quality guarantee, and payment methods.",
      parameters: {
        type: "object",
        properties: {
          topic: {
            type: "string",
            enum: ["exchange", "shipping", "payment", "authenticity", "general"],
            description: "Store policy topic",
          },
        },
      },
    },
  },
];

@Injectable()
export class GroqLlmService {
  private readonly logger = new Logger(GroqLlmService.name);
  private groqClient: Groq | null = null;
  private readonly primaryModel: string;
  private readonly fallbackModel = "qwen/qwen3.8-27b";

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>("GROQ_API_KEY") || process.env.GROQ_API_KEY;
    this.primaryModel =
      this.configService.get<string>("SHOPPING_ASSISTANT_MODEL") ||
      process.env.SHOPPING_ASSISTANT_MODEL ||
      "openai/gpt-oss-120b";

    if (apiKey) {
      this.groqClient = new Groq({ apiKey });
      this.logger.log(`GroqLlmService initialized with model: ${this.primaryModel}`);
    } else {
      this.logger.warn("GROQ_API_KEY is not configured. LLM will use graceful fallback.");
    }
  }

  isConfigured(): boolean {
    return this.groqClient !== null;
  }

  /**
   * First pass: Model determines intent, general conversation, or decides which tools to call.
   */
  async generateDecision(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  ): Promise<LlmDecisionResult> {
    if (!this.groqClient) {
      throw new Error("Groq API client is not configured");
    }

    const start = Date.now();
    const modelsToTry = [this.primaryModel, this.fallbackModel];

    for (const model of modelsToTry) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await this.groqClient.chat.completions.create({
            model,
            messages: messages as any,
            tools: TOOLS_SCHEMA,
            tool_choice: "auto",
            temperature: 0.3,
            max_tokens: 450,
          });

          const choice = response.choices[0];
          const rawToolCalls = choice?.message?.tool_calls || [];
          const content = choice?.message?.content || null;

          const parsedToolCalls: ToolCallItem[] = rawToolCalls
            .map((tc) => {
              try {
                if (tc.type === "function") {
                  const rawArgs = JSON.parse(tc.function.arguments || "{}");
                  // Sanitize null properties out of arguments
                  const cleanArgs: Record<string, any> = {};
                  for (const [k, v] of Object.entries(rawArgs)) {
                    if (v !== null && v !== undefined) {
                      cleanArgs[k] = v;
                    }
                  }
                  return {
                    id: tc.id,
                    name: tc.function.name,
                    arguments: cleanArgs,
                  };
                }
                return null;
              } catch (err) {
                this.logger.warn(`Failed to parse tool call args: ${err}`);
                return null;
              }
            })
            .filter(Boolean) as ToolCallItem[];

          return {
            toolCalls: parsedToolCalls,
            content,
            model,
            latencyMs: Date.now() - start,
          };
        } catch (err: any) {
          if (attempt === 0 && (err.status === 429 || err.status >= 500)) {
            await new Promise((r) => setTimeout(r, 800));
            continue;
          }
          this.logger.warn(`Model ${model} decision call failed: ${err.message}`);
          break;
        }
      }
    }

    throw new Error("All configured Groq models failed for decision generation");
  }

  /**
   * Second pass: Model synthesizes verified tool results into a natural, grounded customer response.
   */
  async generateSynthesis(
    messages: Array<{
      role: "system" | "user" | "assistant" | "tool";
      content: string;
      name?: string;
      tool_call_id?: string;
    }>,
  ): Promise<LlmSynthesisResult> {
    if (!this.groqClient) {
      throw new Error("Groq API client is not configured");
    }

    const start = Date.now();
    const modelsToTry = [this.primaryModel, this.fallbackModel];

    for (const model of modelsToTry) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await this.groqClient.chat.completions.create({
            model,
            messages: messages as any,
            temperature: 0.4,
            max_tokens: 500,
          });

          const content = response.choices[0]?.message?.content || "";
          return {
            content,
            model,
            latencyMs: Date.now() - start,
          };
        } catch (err: any) {
          if (attempt === 0 && (err.status === 429 || err.status >= 500)) {
            await new Promise((r) => setTimeout(r, 800));
            continue;
          }
          this.logger.warn(`Model ${model} synthesis call failed: ${err.message}`);
          break;
        }
      }
    }

    throw new Error("All configured Groq models failed for synthesis generation");
  }
}
