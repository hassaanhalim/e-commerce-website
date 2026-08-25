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

    if (query.size !== undefined || query.color?.trim()) {
      where.variants = {
        some: {
          isActive: true,
          ...(query.size !== undefined ? { size: query.size } : {}),
          ...(query.color?.trim()
            ? { color: { equals: query.color.trim(), mode: "insensitive" } }
            : {}),
          inventory: {
            quantityOnHand: { gt: 0 },
          },
        },
      };
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

    // Build Prisma order by
    const sort = query.sort ?? "newest";
    let orderBy: Prisma.ProductOrderByWithRelationInput | Prisma.ProductOrderByWithRelationInput[] = {
      createdAt: "desc",
    };
    if (sort === "name-asc") {
      orderBy = { name: "asc" };
    } else if (sort === "name-desc") {
      orderBy = { name: "desc" };
    } else if (sort === "price-asc") {
      orderBy = [{ salePrice: "asc" }, { basePrice: "asc" }];
    } else if (sort === "price-desc") {
      orderBy = [{ salePrice: "desc" }, { basePrice: "desc" }];
    }

    const skip = (page - 1) * limit;

    // Fetch paginated products and total count concurrently
    const [total, rawProducts] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          slug: true,
          productCode: true,
          basePrice: true,
          salePrice: true,
          gender: true,
          isNew: true,
          isFeatured: true,
          createdAt: true,
          brand: {
            select: { id: true, name: true, slug: true },
          },
          category: {
            select: { id: true, name: true, slug: true },
          },
          variants: {
            where: { isActive: true },
            select: {
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
          images: {
            select: {
              url: true,
              isPrimary: true,
              sortOrder: true,
            },
            orderBy: { sortOrder: "asc" },
          },
        },
      }),
    ]);

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
        description: "",
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

    return {
      data: mapped,
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
      select: {
        id: true,
        productCode: true,
        name: true,
        slug: true,
        description: true,
        basePrice: true,
        salePrice: true,
        gender: true,
        isNew: true,
        isFeatured: true,
        categoryId: true,
        brandId: true,
        createdAt: true,
        updatedAt: true,
        category: {
          select: { id: true, name: true, slug: true },
        },
        brand: {
          select: { id: true, name: true, slug: true },
        },
        variants: {
          where: { isActive: true },
          select: {
            id: true,
            sku: true,
            size: true,
            color: true,
            price: true,
            isActive: true,
            inventory: {
              select: { quantityOnHand: true, reservedQuantity: true },
            },
          },
          orderBy: { size: "asc" },
        },
        images: {
          select: { id: true, url: true, altText: true, sortOrder: true, isPrimary: true },
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
