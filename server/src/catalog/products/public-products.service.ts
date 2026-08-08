import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { PublicProductQueryDto } from "./dto/public-product-query.dto";

@Injectable()
export class PublicProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PublicProductQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    if (query.minPrice !== undefined && query.maxPrice !== undefined) {
      if (query.minPrice > query.maxPrice) {
        throw new BadRequestException("minPrice cannot be greater than maxPrice.");
      }
    }

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      category: { isActive: true },
      brand: { isActive: true },
    };

    if (query.category) {
      where.category = { slug: query.category, isActive: true };
    }

    if (query.brand) {
      where.brand = { slug: query.brand, isActive: true };
    }

    if (query.gender) {
      where.gender = query.gender;
    }

    if (query.isFeatured !== undefined) {
      where.isFeatured = query.isFeatured;
    }

    if (query.isNew !== undefined) {
      where.isNew = query.isNew;
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { productCode: { contains: search, mode: "insensitive" } },
        { brand: { name: { contains: search, mode: "insensitive" } } },
        { category: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      const min = query.minPrice ?? 0;
      const max = query.maxPrice ?? Number.MAX_SAFE_INTEGER;

      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          OR: [
            {
              salePrice: { not: null, gte: min, lte: max },
            },
            {
              salePrice: null,
              basePrice: { gte: min, lte: max },
            },
          ],
        },
      ];
    }

    // Fetch all matching items for sorting & size/color derivation
    const rawProducts = await this.prisma.product.findMany({
      where,
      include: {
        category: true,
        brand: true,
        variants: {
          where: { isActive: true },
          include: { inventory: true },
        },
        images: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    const mapped = rawProducts.map((p) => {
      const basePriceNum = Number(p.basePrice);
      const salePriceNum = p.salePrice ? Number(p.salePrice) : null;
      const displayPrice = salePriceNum ?? basePriceNum;

      const activeVariants = p.variants || [];
      const sizes = Array.from(new Set(activeVariants.map((v) => v.size))).sort((a, b) => a - b);
      const colors = Array.from(new Set(activeVariants.map((v) => v.color)));
      const availableQuantity = activeVariants.reduce((sum, variant) => {
        const quantityOnHand = variant.inventory?.quantityOnHand ?? 0;
        const reservedQuantity = variant.inventory?.reservedQuantity ?? 0;
        return sum + Math.max(0, quantityOnHand - reservedQuantity);
      }, 0);

      const primaryImg = p.images.find((img) => img.isPrimary) || p.images[0];
      const imageUrl = primaryImg?.url || "";

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        productCode: p.productCode,
        description: p.description,
        brand: {
          id: p.brand.id,
          name: p.brand.name,
          slug: p.brand.slug,
        },
        category: {
          id: p.category.id,
          name: p.category.name,
          slug: p.category.slug,
        },
        gender: p.gender,
        price: basePriceNum,
        salePrice: salePriceNum,
        displayPrice,
        image: imageUrl,
        sizes,
        colors,
        availableQuantity,
        inStock: availableQuantity > 0,
        isNew: p.isNew,
        isFeatured: p.isFeatured,
        rating: 0,
        reviewCount: 0,
        createdAt: p.createdAt,
      };
    });

    // Apply sorting
    const sort = query.sort ?? "newest";
    mapped.sort((a, b) => {
      if (sort === "price-asc") return a.displayPrice - b.displayPrice;
      if (sort === "price-desc") return b.displayPrice - a.displayPrice;
      if (sort === "name-asc") return a.name.localeCompare(b.name);
      if (sort === "name-desc") return b.name.localeCompare(a.name);
      // newest
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    const total = mapped.length;
    const skip = (page - 1) * limit;
    const paginatedData = mapped.slice(skip, skip + limit);

    return {
      data: paginatedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        slug,
        isActive: true,
        category: { isActive: true },
        brand: { isActive: true },
      },
      include: {
        category: true,
        brand: true,
        variants: {
          where: { isActive: true },
          include: { inventory: true },
          orderBy: { size: "asc" },
        },
        images: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with slug "${slug}" not found.`);
    }

    const basePriceNum = Number(product.basePrice);
    const salePriceNum = product.salePrice ? Number(product.salePrice) : null;
    const displayPrice = salePriceNum ?? basePriceNum;

    // Order images putting primary image first
    const primaryImg = product.images.find((img) => img.isPrimary);
    const nonPrimaryImgs = product.images.filter((img) => !img.isPrimary);
    const orderedImages = primaryImg ? [primaryImg, ...nonPrimaryImgs] : product.images;

    const activeVariants = product.variants || [];
    const sizes = Array.from(new Set(activeVariants.map((v) => v.size))).sort((a, b) => a - b);
    const colors = Array.from(new Set(activeVariants.map((v) => v.color)));

    const reviewAgg = await this.prisma.review.aggregate({
      where: { productId: product.id, status: "APPROVED" },
      _avg: { rating: true },
      _count: { rating: true },
    });
    const reviewCount = reviewAgg._count.rating ?? 0;
    const rawAvg = reviewAgg._avg.rating ?? 0;
    const averageRating = reviewCount > 0 ? Math.round(rawAvg * 10) / 10 : 0;

    return {
      id: product.id,
      productCode: product.productCode,
      name: product.name,
      slug: product.slug,
      description: product.description,
      basePrice: basePriceNum,
      salePrice: salePriceNum,
      displayPrice,
      gender: product.gender,
      isNew: product.isNew,
      isFeatured: product.isFeatured,
      categoryId: product.categoryId,
      brandId: product.brandId,
      category: {
        id: product.category.id,
        name: product.category.name,
        slug: product.category.slug,
      },
      brand: {
        id: product.brand.id,
        name: product.brand.name,
        slug: product.brand.slug,
      },
      variants: activeVariants.map((v) => {
        const vPriceNum = v.price ? Number(v.price) : null;
        const quantityOnHand = v.inventory?.quantityOnHand ?? 0;
        const reservedQuantity = v.inventory?.reservedQuantity ?? 0;
        const availableQuantity = Math.max(0, quantityOnHand - reservedQuantity);
        return {
          id: v.id,
          sku: v.sku,
          size: v.size,
          color: v.color,
          price: vPriceNum,
          effectivePrice: vPriceNum ?? basePriceNum,
          isActive: v.isActive,
          availableQuantity,
          inStock: availableQuantity > 0,
        };
      }),
      images: orderedImages.map((img) => ({
        id: img.id,
        url: img.url,
        altText: img.altText,
        sortOrder: img.sortOrder,
        isPrimary: img.isPrimary,
      })),
      sizes,
      colors,
      rating: averageRating,
      averageRating,
      reviewCount,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}
