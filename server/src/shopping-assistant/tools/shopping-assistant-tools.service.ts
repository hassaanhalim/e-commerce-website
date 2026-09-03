import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type {
  CheckAvailabilityToolArgs,
  CompareProductsToolArgs,
  GetProductDetailsToolArgs,
  ProductCatalogSummary,
  SearchProductsToolArgs,
  StorePolicyInfoToolArgs,
} from "../types/shopping-assistant.types";
import type { IShoppingAssistantTools } from "./shopping-assistant-tools.interface";
import { ProductGender, type Prisma } from "@prisma/client";

@Injectable()
export class ShoppingAssistantToolsService implements IShoppingAssistantTools {
  private readonly logger = new Logger(ShoppingAssistantToolsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Search active products in the real catalog based on verified criteria
   */
  async searchProducts(args: SearchProductsToolArgs): Promise<{
    count: number;
    products: ProductCatalogSummary[];
    message?: string;
  }> {
    const where: Prisma.ProductWhereInput = {
      isActive: true,
    };

    // 1. Gender filtering
    if (args.gender) {
      const normalizedGender = String(args.gender).toUpperCase();
      if (normalizedGender === "MEN" || normalizedGender === "MAN" || normalizedGender === "MALE") {
        where.gender = { in: [ProductGender.Men, ProductGender.Unisex] };
      } else if (normalizedGender === "WOMEN" || normalizedGender === "WOMAN" || normalizedGender === "FEMALE") {
        where.gender = { in: [ProductGender.Women, ProductGender.Unisex] };
      } else if (normalizedGender === "KIDS" || normalizedGender === "CHILD" || normalizedGender === "BOY" || normalizedGender === "GIRL") {
        where.gender = ProductGender.Kids;
      } else if (normalizedGender === "UNISEX") {
        where.gender = ProductGender.Unisex;
      }
    }

    // 2. Category filtering with DB resolution
    let extraKeywordsFromCategory: string[] = [];
    if (args.category && args.category.trim().length > 0) {
      const catLower = args.category.toLowerCase().trim();
      const dbCat = await this.prisma.category.findFirst({
        where: { name: { equals: catLower, mode: "insensitive" } },
      });
      if (dbCat) {
        where.category = { id: dbCat.id };
      } else {
        extraKeywordsFromCategory.push(catLower);
      }
    }

    // 3. Brand filtering with DB resolution
    let extraKeywordsFromBrand: string[] = [];
    if (args.brand && args.brand.trim().length > 0) {
      const brandLower = args.brand.toLowerCase().trim();
      const dbBrand = await this.prisma.brand.findFirst({
        where: { name: { contains: brandLower, mode: "insensitive" } },
      });
      if (dbBrand) {
        where.brand = { id: dbBrand.id };
      } else {
        extraKeywordsFromBrand.push(brandLower);
      }
    }

    // 4. Price range filtering
    if (args.minPrice !== undefined || args.maxPrice !== undefined) {
      where.basePrice = {};
      if (args.minPrice !== undefined && !isNaN(args.minPrice) && args.minPrice > 0) {
        where.basePrice.gte = args.minPrice;
      }
      if (args.maxPrice !== undefined && !isNaN(args.maxPrice) && args.maxPrice > 0) {
        where.basePrice.lte = args.maxPrice;
      }
    }

    // 5. Size or Color filtering via variants
    if (args.size !== undefined || args.color) {
      const variantWhere: Prisma.ProductVariantWhereInput = {
        isActive: true,
      };

      if (args.size !== undefined && !isNaN(args.size)) {
        variantWhere.size = Math.round(Number(args.size));
      }

      if (args.color) {
        variantWhere.color = {
          contains: args.color.trim(),
          mode: "insensitive",
        };
      }

      where.variants = {
        some: variantWhere,
      };
    }

    // 6. Free-text search matching name, description, brand, or category
    const stopWords = new Set([
      "shoe", "shoes", "need", "want", "looking", "for", "pair", "something",
      "comfortable", "comfy", "durable", "stylish", "best", "good", "nice", "a", "an", "the",
      "i", "me", "my", "your", "our", "all", "catalog", "store", "show", "give",
      "top", "featured", "popular", "trending", "suggest", "suggested", "suggestion",
      "recommend", "recommended", "recommendation", "products", "items", "collection"
    ]);

    let searchKeywords: string[] = [...extraKeywordsFromCategory, ...extraKeywordsFromBrand];
    if (args.query && args.query.trim().length > 0) {
      const rawWords = args.query.toLowerCase().split(/\s+/).map((w) => w.replace(/[^a-z0-9]/g, "")).filter(Boolean);
      const filteredWords = rawWords.filter((w) => !stopWords.has(w) && w.length > 1);
      searchKeywords.push(...filteredWords);

      // If user mentioned walking, include walk / sneaker / running variations
      if (args.query.toLowerCase().includes("walk")) {
        searchKeywords.push("walk", "sneaker", "running");
      }
    }

    if (searchKeywords.length > 0) {
      where.OR = searchKeywords.flatMap((kw) => [
        { name: { contains: kw, mode: "insensitive" } },
        { description: { contains: kw, mode: "insensitive" } },
        { brand: { name: { contains: kw, mode: "insensitive" } } },
        { category: { name: { contains: kw, mode: "insensitive" } } },
      ]);
    }

    const limit = Math.min(Math.max(Number(args.limit) || 6, 1), 10);

    let rawProducts = await this.prisma.product.findMany({
      where,
      include: {
        category: true,
        brand: true,
        images: {
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
        },
        variants: {
          where: { isActive: true },
          include: { inventory: true },
        },
        reviews: {
          select: { rating: true },
        },
      },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      take: limit * 2,
    });

    // If search had keywords that returned 0 results, relax the OR keywords and keep structured filters
    if (rawProducts.length === 0 && searchKeywords.length > 0 && (where.gender || where.brand || where.category || where.basePrice || where.variants)) {
      const relaxedWhere: Prisma.ProductWhereInput = {
        isActive: true,
        gender: where.gender,
        brand: where.brand,
        category: where.category,
        basePrice: where.basePrice,
        variants: where.variants,
      };

      rawProducts = await this.prisma.product.findMany({
        where: relaxedWhere,
        include: {
          category: true,
          brand: true,
          images: {
            orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
          },
          variants: {
            where: { isActive: true },
            include: { inventory: true },
          },
          reviews: {
            select: { rating: true },
          },
        },
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
        take: limit * 2,
      });
    }

    const products = rawProducts.slice(0, limit).map((p) => this.mapToCatalogSummary(p));

    return {
      count: products.length,
      products,
      message:
        products.length === 0
          ? "No exact products matched the requested criteria in the store catalog."
          : `Found ${products.length} matching products from the store catalog.`,
    };
  }

  /**
   * Look up exact details of a single product by name, slug, or ID
   */
  async getProductDetails(args: GetProductDetailsToolArgs): Promise<{
    found: boolean;
    product?: ProductCatalogSummary;
    message?: string;
  }> {
    const orClauses: Prisma.ProductWhereInput[] = [];

    if (args.productIdOrSlug) {
      orClauses.push({ id: args.productIdOrSlug });
      orClauses.push({ slug: args.productIdOrSlug });
    }

    if (args.productName) {
      orClauses.push({
        name: { contains: args.productName.trim(), mode: "insensitive" },
      });
    }

    if (orClauses.length === 0) {
      return { found: false, message: "No product identifier or name provided." };
    }

    const raw = await this.prisma.product.findFirst({
      where: {
        isActive: true,
        OR: orClauses,
      },
      include: {
        category: true,
        brand: true,
        images: {
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
        },
        variants: {
          where: { isActive: true },
          include: { inventory: true },
        },
        reviews: {
          select: { rating: true },
        },
      },
    });

    if (!raw) {
      return {
        found: false,
        message: `Product "${args.productName || args.productIdOrSlug}" was not found in the catalog.`,
      };
    }

    return {
      found: true,
      product: this.mapToCatalogSummary(raw),
    };
  }

  /**
   * Compare 2-3 products using verified database specs
   */
  async compareProducts(args: CompareProductsToolArgs): Promise<{
    count: number;
    products: ProductCatalogSummary[];
    comparisonSummary: string;
  }> {
    if (!args.productNamesOrIds || args.productNamesOrIds.length === 0) {
      return {
        count: 0,
        products: [],
        comparisonSummary: "No products provided for comparison.",
      };
    }

    const searchItems = args.productNamesOrIds.slice(0, 3);
    const products: ProductCatalogSummary[] = [];

    for (const item of searchItems) {
      const res = await this.getProductDetails({
        productIdOrSlug: item,
        productName: item,
      });
      if (res.found && res.product) {
        products.push(res.product);
      }
    }

    if (products.length === 0) {
      return {
        count: 0,
        products: [],
        comparisonSummary: "None of the specified products were found in the catalog.",
      };
    }

    const summaryParts = products.map(
      (p) =>
        `- ${p.name} (${p.brand}): PKR ${p.displayPrice.toLocaleString()} | Category: ${p.category} | Gender: ${p.gender} | Available Sizes: [${p.availableSizes.join(", ")}] | Colors: [${p.availableColors.join(", ")}]`,
    );

    return {
      count: products.length,
      products,
      comparisonSummary: `Comparison of ${products.length} product(s):\n${summaryParts.join("\n")}`,
    };
  }

  /**
   * Check real stock availability for a specific size and color
   */
  async checkAvailability(args: CheckAvailabilityToolArgs): Promise<{
    productName: string;
    available: boolean;
    availableSizes: number[];
    availableColors: string[];
    requestedSizeAvailable?: boolean;
    requestedColorAvailable?: boolean;
    product?: ProductCatalogSummary;
  }> {
    const details = await this.getProductDetails({
      productName: args.productName,
    });

    if (!details.found || !details.product) {
      return {
        productName: args.productName || "Unknown Shoe",
        available: false,
        availableSizes: [],
        availableColors: [],
      };
    }

    const p = details.product;
    const requestedSize = args.size ? Number(args.size) : undefined;
    const requestedColor = args.color ? args.color.toLowerCase().trim() : undefined;

    const requestedSizeAvailable =
      requestedSize !== undefined
        ? p.availableSizes.includes(requestedSize)
        : undefined;

    const requestedColorAvailable =
      requestedColor !== undefined
        ? p.availableColors.some((c) => c.toLowerCase() === requestedColor)
        : undefined;

    let available = p.inStock;
    if (requestedSizeAvailable !== undefined) {
      available = available && requestedSizeAvailable;
    }
    if (requestedColorAvailable !== undefined) {
      available = available && requestedColorAvailable;
    }

    return {
      productName: p.name,
      available,
      availableSizes: p.availableSizes,
      availableColors: p.availableColors,
      requestedSizeAvailable,
      requestedColorAvailable,
      product: p,
    };
  }

  /**
   * Return verified store policies
   */
  async getStorePolicyInfo(args: StorePolicyInfoToolArgs): Promise<{
    policy: string;
    details: string;
  }> {
    const topic = args.topic || "general";
    switch (topic) {
      case "exchange":
        return {
          policy: "7-Day Exchange Policy",
          details:
            "We offer a 7-day hassle-free exchange policy on all unworn footwear in its original packaging.",
        };
      case "shipping":
        return {
          policy: "Shipping & Delivery",
          details:
            "Free standard delivery across Pakistan on orders above PKR 5,000. Standard delivery time is 2-4 business days.",
        };
      case "payment":
        return {
          policy: "Payment Methods",
          details:
            "We accept Cash on Delivery (COD) across Pakistan as well as secure online card payments.",
        };
      case "authenticity":
        return {
          policy: "100% Quality & Authenticity Guarantee",
          details:
            "All products are 100% genuine and quality checked before dispatch.",
        };
      default:
        return {
          policy: "Store Overview",
          details:
            "Shoe Store offers 100% authentic branded shoes with 7-day exchange, free shipping above PKR 5,000, and Cash on Delivery nationwide.",
        };
    }
  }

  private mapToCatalogSummary(p: any): ProductCatalogSummary {
    const priceNum = Number(p.basePrice);
    const salePriceNum = p.salePrice ? Number(p.salePrice) : null;
    const displayPrice =
      salePriceNum !== null && salePriceNum < priceNum ? salePriceNum : priceNum;

    const activeInStockVariants = (p.variants || []).filter((v: any) => {
      if (!v.isActive) return false;
      const inv = v.inventory;
      if (!inv) return true;
      return (inv.quantityOnHand - inv.reservedQuantity) > 0;
    });

    const availableSizes = Array.from(
      new Set(activeInStockVariants.map((v: any) => v.size)),
    ).sort((a: any, b: any) => a - b) as number[];

    const availableColors = Array.from(
      new Set(activeInStockVariants.map((v: any) => v.color)),
    ) as string[];

    const primaryImage =
      p.images?.find((img: any) => img.isPrimary)?.url ||
      p.images?.[0]?.url ||
      "";

    const ratingAvg =
      p.reviews && p.reviews.length > 0
        ? p.reviews.reduce((s: number, r: any) => s + r.rating, 0) /
          p.reviews.length
        : undefined;

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      brand: p.brand?.name || "Shoe Store",
      category: p.category?.name || "Footwear",
      gender: p.gender || "Unisex",
      price: priceNum,
      salePrice: salePriceNum,
      displayPrice,
      image: primaryImage,
      inStock: activeInStockVariants.length > 0,
      availableSizes,
      availableColors,
      description: p.description || undefined,
      averageRating: ratingAvg ? Number(ratingAvg.toFixed(1)) : undefined,
    };
  }
}
