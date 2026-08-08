import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InventoryAdjustmentType, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { normalizeSlug } from "../../common/utils/slug.util";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { ProductQueryDto } from "./dto/product-query.dto";

import { AuditService } from "../../audit/audit.service";

@Injectable()
export class AdminProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private serializeProduct(product: {
    id: string;
    productCode: string;
    name: string;
    slug: string;
    description: string;
    basePrice: Prisma.Decimal;
    salePrice: Prisma.Decimal | null;
    gender: string;
    isNew: boolean;
    isFeatured: boolean;
    isActive: boolean;
    categoryId: string;
    brandId: string;
    createdAt: Date;
    updatedAt: Date;
    category?: { id: string; name: string; slug: string } | null;
    brand?: { id: string; name: string; slug: string } | null;
    variants?: Array<{
      id: string;
      sku: string;
      size: number;
      color: string;
      price: Prisma.Decimal | null;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
      inventory?: {
        quantityOnHand: number;
        reservedQuantity: number;
        lowStockThreshold: number;
      } | null;
    }>;
    images?: Array<{
      id: string;
      url: string;
      altText: string | null;
      sortOrder: number;
      isPrimary: boolean;
      createdAt: Date;
    }>;
  }) {
    const basePriceNum = Number(product.basePrice);
    const salePriceNum = product.salePrice ? Number(product.salePrice) : null;

    const orderedImages = (product.images || [])
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const serializedVariants = (product.variants || []).map((v) => {
      const variantPriceNum = v.price ? Number(v.price) : null;
      const quantityOnHand = v.inventory?.quantityOnHand ?? 0;
      const reservedQuantity = v.inventory?.reservedQuantity ?? 0;
      const availableQuantity = Math.max(0, quantityOnHand - reservedQuantity);
      const lowStockThreshold = v.inventory?.lowStockThreshold ?? 5;
      return {
        id: v.id,
        sku: v.sku,
        size: v.size,
        color: v.color,
        price: variantPriceNum,
        effectivePrice: variantPriceNum ?? basePriceNum,
        isActive: v.isActive,
        quantityOnHand,
        reservedQuantity,
        availableQuantity,
        lowStockThreshold,
        inStock: availableQuantity > 0,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
      };
    });

    return {
      id: product.id,
      productCode: product.productCode,
      name: product.name,
      slug: product.slug,
      description: product.description,
      basePrice: basePriceNum,
      salePrice: salePriceNum,
      gender: product.gender,
      isNew: product.isNew,
      isFeatured: product.isFeatured,
      isActive: product.isActive,
      categoryId: product.categoryId,
      brandId: product.brandId,
      category: product.category
        ? {
            id: product.category.id,
            name: product.category.name,
            slug: product.category.slug,
          }
        : null,
      brand: product.brand
        ? {
            id: product.brand.id,
            name: product.brand.name,
            slug: product.brand.slug,
          }
        : null,
      variants: serializedVariants,
      images: orderedImages.map((img) => ({
        id: img.id,
        url: img.url,
        altText: img.altText,
        sortOrder: img.sortOrder,
        isPrimary: img.isPrimary,
        createdAt: img.createdAt,
      })),
      rating: 0,
      reviewCount: 0,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  async findAll(query: ProductQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.brandId) {
      where.brandId = query.brandId;
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { productCode: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { variants: { some: { sku: { contains: search, mode: "insensitive" } } } },
      ];
    }

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          category: true,
          brand: true,
          variants: {
            include: { inventory: true },
          },
          images: { orderBy: { sortOrder: "asc" } },
        },
      }),
    ]);

    return {
      data: products.map((p) => this.serializeProduct(p)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        brand: true,
        variants: {
          include: { inventory: true },
        },
        images: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found.`);
    }

    return this.serializeProduct(product);
  }

  async create(dto: CreateProductDto, adminUserId?: string) {
    const slug = normalizeSlug(dto.slug?.trim() || dto.name);
    const productCode = dto.productCode.trim().toUpperCase();

    if (dto.basePrice <= 0) {
      throw new BadRequestException("basePrice must be a positive number.");
    }

    if (dto.salePrice !== undefined && dto.salePrice !== null) {
      if (dto.salePrice <= 0 || dto.salePrice >= dto.basePrice) {
        throw new BadRequestException("salePrice must be a positive number lower than basePrice.");
      }
    }

    // Category and Brand existence validation
    const [category, brand] = await Promise.all([
      this.prisma.category.findUnique({ where: { id: dto.categoryId } }),
      this.prisma.brand.findUnique({ where: { id: dto.brandId } }),
    ]);

    if (!category) {
      throw new NotFoundException(`Category with ID "${dto.categoryId}" not found.`);
    }

    if (!brand) {
      throw new NotFoundException(`Brand with ID "${dto.brandId}" not found.`);
    }

    // Slug and ProductCode uniqueness validation
    const [existingSlug, existingCode] = await Promise.all([
      this.prisma.product.findUnique({ where: { slug } }),
      this.prisma.product.findUnique({ where: { productCode } }),
    ]);

    if (existingSlug) {
      throw new ConflictException(`Product with slug "${slug}" already exists.`);
    }

    if (existingCode) {
      throw new ConflictException(`Product with productCode "${productCode}" already exists.`);
    }

    // Validate Variants
    if (!dto.variants || dto.variants.length === 0) {
      throw new BadRequestException("Product must have at least one variant.");
    }

    const isActiveProduct = dto.isActive ?? true;
    const activeVariants = dto.variants.filter((v) => v.isActive !== false);
    if (isActiveProduct && activeVariants.length === 0) {
      throw new BadRequestException("An active product must have at least one active variant.");
    }

    const variantSkus = new Set<string>();
    const sizeColorCombos = new Set<string>();

    for (const v of dto.variants) {
      const vSku = v.sku.trim().toUpperCase();
      if (variantSkus.has(vSku)) {
        throw new BadRequestException(`Duplicate variant SKU "${vSku}" in request.`);
      }
      variantSkus.add(vSku);

      const combo = `${v.size}-${v.color.trim().toLowerCase()}`;
      if (sizeColorCombos.has(combo)) {
        throw new BadRequestException(`Duplicate variant size/color combination "${v.size} / ${v.color}" in request.`);
      }
      sizeColorCombos.add(combo);

      if (v.price !== undefined && v.price !== null && v.price <= 0) {
        throw new BadRequestException(`Variant price for SKU "${vSku}" must be positive.`);
      }
    }

    // Check SKU collisions in DB
    const existingVariantSkus = await this.prisma.productVariant.findMany({
      where: { sku: { in: Array.from(variantSkus) } },
      select: { sku: true },
    });

    if (existingVariantSkus.length > 0) {
      const taken = existingVariantSkus.map((s) => s.sku).join(", ");
      throw new ConflictException(`Variant SKU(s) already in use: ${taken}`);
    }

    // Validate Images
    if (!dto.images || dto.images.length === 0) {
      throw new BadRequestException("Product must have at least one image.");
    }

    let primaryCount = dto.images.filter((img) => img.isPrimary === true).length;
    const normalizedImages = dto.images.map((img, idx) => ({
      url: img.url.trim(),
      altText: img.altText?.trim() || null,
      sortOrder: img.sortOrder ?? idx,
      isPrimary: primaryCount === 0 ? idx === 0 : Boolean(img.isPrimary),
    }));

    if (primaryCount > 1) {
      let foundFirstPrimary = false;
      normalizedImages.forEach((img) => {
        if (img.isPrimary) {
          if (foundFirstPrimary) img.isPrimary = false;
          else foundFirstPrimary = true;
        }
      });
    }

    // Execute atomic transaction
    const createdProduct = await this.prisma.$transaction(async (tx) => {
      let performedById = adminUserId;
      if (!performedById) {
        const adminUser = await tx.user.findFirst({ where: { role: "ADMIN" } });
        if (adminUser) performedById = adminUser.id;
      }

      const product = await tx.product.create({
        data: {
          name: dto.name.trim(),
          slug,
          productCode,
          description: dto.description.trim(),
          basePrice: new Prisma.Decimal(dto.basePrice),
          salePrice: dto.salePrice !== undefined && dto.salePrice !== null ? new Prisma.Decimal(dto.salePrice) : null,
          gender: dto.gender,
          isNew: dto.isNew ?? false,
          isFeatured: dto.isFeatured ?? false,
          isActive: isActiveProduct,
          categoryId: dto.categoryId,
          brandId: dto.brandId,
        },
      });

      for (const v of dto.variants) {
        const variant = await tx.productVariant.create({
          data: {
            productId: product.id,
            sku: v.sku.trim().toUpperCase(),
            size: v.size,
            color: v.color.trim(),
            price: v.price !== undefined && v.price !== null ? new Prisma.Decimal(v.price) : null,
            isActive: v.isActive ?? true,
          },
        });

        const initialStock = v.initialStock !== undefined && v.initialStock !== null ? Math.max(0, Math.floor(v.initialStock)) : 0;
        const lowStockThreshold = v.lowStockThreshold !== undefined && v.lowStockThreshold !== null ? Math.max(0, Math.floor(v.lowStockThreshold)) : 5;

        const inventory = await tx.inventory.create({
          data: {
            variantId: variant.id,
            quantityOnHand: initialStock,
            reservedQuantity: 0,
            lowStockThreshold,
          },
        });

        if (initialStock > 0 && performedById) {
          await tx.inventoryAdjustment.create({
            data: {
              inventoryId: inventory.id,
              type: InventoryAdjustmentType.RESTOCK,
              onHandDelta: initialStock,
              reservedDelta: 0,
              beforeOnHand: 0,
              afterOnHand: initialStock,
              beforeReserved: 0,
              afterReserved: 0,
              reason: "Initial stock on product creation",
              performedById,
            },
          });
        }
      }

      await tx.productImage.createMany({
        data: normalizedImages.map((img) => ({
          productId: product.id,
          url: img.url,
          altText: img.altText,
          sortOrder: img.sortOrder,
          isPrimary: img.isPrimary,
        })),
      });

      const fetched = await tx.product.findUnique({
        where: { id: product.id },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true, slug: true } },
          variants: {
            include: {
              inventory: true,
            },
          },
          images: true,
        },
      });

      return fetched!;
    });

    await this.auditService.logAction({
      action: "PRODUCT_CREATED",
      entityType: "PRODUCT",
      entityId: createdProduct.id,
      description: `Created product "${createdProduct.name}" (${createdProduct.productCode}).`,
    });

    return this.serializeProduct(createdProduct);
  }

  async update(id: string, dto: UpdateProductDto, adminUserId?: string) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
      include: { variants: true, images: true },
    });

    if (!existing) {
      throw new NotFoundException(`Product with ID "${id}" not found.`);
    }

    // Validate Category & Brand if provided
    if (dto.categoryId && dto.categoryId !== existing.categoryId) {
      const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
      if (!category) {
        throw new NotFoundException(`Category with ID "${dto.categoryId}" not found.`);
      }
    }

    if (dto.brandId && dto.brandId !== existing.brandId) {
      const brand = await this.prisma.brand.findUnique({ where: { id: dto.brandId } });
      if (!brand) {
        throw new NotFoundException(`Brand with ID "${dto.brandId}" not found.`);
      }
    }

    // Validate prices
    const nextBasePrice = dto.basePrice ?? Number(existing.basePrice);
    if (dto.basePrice !== undefined && dto.basePrice <= 0) {
      throw new BadRequestException("basePrice must be a positive number.");
    }

    const nextSalePrice =
      dto.salePrice === null
        ? null
        : dto.salePrice !== undefined
        ? dto.salePrice
        : existing.salePrice
        ? Number(existing.salePrice)
        : null;

    if (nextSalePrice !== null && nextSalePrice !== undefined) {
      if (nextSalePrice <= 0 || nextSalePrice >= nextBasePrice) {
        throw new BadRequestException("salePrice must be a positive number lower than basePrice.");
      }
    }

    // Validate unique Slug
    let nextSlug = existing.slug;
    if (dto.slug?.trim() || dto.name?.trim()) {
      const raw = dto.slug?.trim() || dto.name!.trim();
      nextSlug = normalizeSlug(raw);

      if (nextSlug !== existing.slug) {
        const duplicate = await this.prisma.product.findUnique({ where: { slug: nextSlug } });
        if (duplicate) {
          throw new ConflictException(`Product with slug "${nextSlug}" already exists.`);
        }
      }
    }

    // Validate unique ProductCode
    let nextCode = existing.productCode;
    if (dto.productCode?.trim()) {
      nextCode = dto.productCode.trim().toUpperCase();

      if (nextCode !== existing.productCode) {
        const duplicate = await this.prisma.product.findUnique({ where: { productCode: nextCode } });
        if (duplicate) {
          throw new ConflictException(`Product with productCode "${nextCode}" already exists.`);
        }
      }
    }

    const nextIsActive = dto.isActive ?? existing.isActive;

    // Perform transaction for product, variants, and images update
    const updatedProduct = await this.prisma.$transaction(async (tx) => {
      let performedById = adminUserId;
      if (!performedById) {
        const adminUser = await tx.user.findFirst({ where: { role: "ADMIN" } });
        if (adminUser) performedById = adminUser.id;
      }

      // Handle Variants Update/Create
      if (dto.variants && dto.variants.length > 0) {
        for (const vDto of dto.variants) {
          const vSku = vDto.sku?.trim().toUpperCase();
          if (vDto.price !== undefined && vDto.price !== null && vDto.price <= 0) {
            throw new BadRequestException(`Variant price for SKU "${vSku || vDto.id}" must be positive.`);
          }

          if (vDto.id) {
            // Update existing variant (DO NOT overwrite stock quantities or lowStockThreshold)
            const currentVariant = existing.variants.find((v) => v.id === vDto.id);
            if (!currentVariant) {
              throw new NotFoundException(`Variant with ID "${vDto.id}" not found on product.`);
            }

            if (vSku && vSku !== currentVariant.sku) {
              const skuTaken = await tx.productVariant.findUnique({ where: { sku: vSku } });
              if (skuTaken) {
                throw new ConflictException(`Variant SKU "${vSku}" is already taken.`);
              }
            }

            await tx.productVariant.update({
              where: { id: vDto.id },
              data: {
                sku: vSku || undefined,
                size: vDto.size ?? undefined,
                color: vDto.color !== undefined ? vDto.color.trim() : undefined,
                price: vDto.price === null ? null : vDto.price !== undefined ? new Prisma.Decimal(vDto.price) : undefined,
                isActive: vDto.isActive !== undefined ? vDto.isActive : undefined,
              },
            });
          } else {
            // Create new variant
            if (!vDto.sku || vDto.size === undefined || !vDto.color) {
              throw new BadRequestException("New variants require sku, size, and color.");
            }

            const skuTaken = await tx.productVariant.findUnique({ where: { sku: vSku } });
            if (skuTaken) {
              throw new ConflictException(`Variant SKU "${vSku}" is already taken.`);
            }

            const createdVariant = await tx.productVariant.create({
              data: {
                productId: id,
                sku: vSku!,
                size: vDto.size,
                color: vDto.color.trim(),
                price: vDto.price !== undefined && vDto.price !== null ? new Prisma.Decimal(vDto.price) : null,
                isActive: vDto.isActive ?? true,
              },
            });

            const initialStock = vDto.initialStock !== undefined && vDto.initialStock !== null ? Math.max(0, Math.floor(vDto.initialStock)) : 0;
            const lowStockThreshold = vDto.lowStockThreshold !== undefined && vDto.lowStockThreshold !== null ? Math.max(0, Math.floor(vDto.lowStockThreshold)) : 5;

            const inventory = await tx.inventory.create({
              data: {
                variantId: createdVariant.id,
                quantityOnHand: initialStock,
                reservedQuantity: 0,
                lowStockThreshold,
              },
            });

            if (initialStock > 0 && performedById) {
              await tx.inventoryAdjustment.create({
                data: {
                  inventoryId: inventory.id,
                  type: InventoryAdjustmentType.RESTOCK,
                  onHandDelta: initialStock,
                  reservedDelta: 0,
                  beforeOnHand: 0,
                  afterOnHand: initialStock,
                  beforeReserved: 0,
                  afterReserved: 0,
                  reason: "Initial stock on product creation",
                  performedById,
                },
              });
            }
          }
        }
      }

      // Verify active variants condition
      const allVariants = await tx.productVariant.findMany({ where: { productId: id } });
      const activeVariants = allVariants.filter((v) => v.isActive);
      if (nextIsActive && activeVariants.length === 0) {
        throw new BadRequestException("An active product must have at least one active variant.");
      }

      // Handle Images Update/Create
      if (dto.images && dto.images.length > 0) {
        const primaryInputImages = dto.images.filter((img) => img.isPrimary === true);

        if (primaryInputImages.length > 0) {
          const primaryId = primaryInputImages[primaryInputImages.length - 1].id;
          await tx.productImage.updateMany({
            where: { productId: id, id: { not: primaryId || "" } },
            data: { isPrimary: false },
          });
        }

        for (const imgDto of dto.images) {
          if (imgDto.id) {
            const currentImg = existing.images.find((img) => img.id === imgDto.id);
            if (!currentImg) {
              throw new NotFoundException(`Image with ID "${imgDto.id}" not found on product.`);
            }

            await tx.productImage.update({
              where: { id: imgDto.id },
              data: {
                url: imgDto.url !== undefined ? imgDto.url.trim() : undefined,
                altText: imgDto.altText !== undefined ? imgDto.altText?.trim() || null : undefined,
                sortOrder: imgDto.sortOrder !== undefined ? imgDto.sortOrder : undefined,
                isPrimary: imgDto.isPrimary !== undefined ? imgDto.isPrimary : undefined,
              },
            });
          } else {
            if (!imgDto.url) {
              throw new BadRequestException("New images require a url.");
            }

            await tx.productImage.create({
              data: {
                productId: id,
                url: imgDto.url.trim(),
                altText: imgDto.altText?.trim() || null,
                sortOrder: imgDto.sortOrder ?? 0,
                isPrimary: imgDto.isPrimary ?? false,
              },
            });
          }
        }
      }

      // Ensure exactly one primary image
      const allImages = await tx.productImage.findMany({ where: { productId: id }, orderBy: { sortOrder: "asc" } });
      if (nextIsActive && allImages.length === 0) {
        throw new BadRequestException("An active product must have at least one image.");
      }

      const primaryImages = allImages.filter((img) => img.isPrimary);
      if (allImages.length > 0 && primaryImages.length !== 1) {
        await tx.productImage.updateMany({ where: { productId: id }, data: { isPrimary: false } });
        const firstId = primaryImages[0]?.id || allImages[0].id;
        await tx.productImage.update({ where: { id: firstId }, data: { isPrimary: true } });
      }

      // Update core Product record
      await tx.product.update({
        where: { id },
        data: {
          name: dto.name !== undefined ? dto.name.trim() : undefined,
          slug: nextSlug,
          productCode: nextCode,
          description: dto.description !== undefined ? dto.description.trim() : undefined,
          basePrice: dto.basePrice !== undefined ? new Prisma.Decimal(dto.basePrice) : undefined,
          salePrice: dto.salePrice === null ? null : dto.salePrice !== undefined ? new Prisma.Decimal(dto.salePrice) : undefined,
          gender: dto.gender !== undefined ? dto.gender : undefined,
          isNew: dto.isNew !== undefined ? dto.isNew : undefined,
          isFeatured: dto.isFeatured !== undefined ? dto.isFeatured : undefined,
          isActive: dto.isActive !== undefined ? dto.isActive : undefined,
          categoryId: dto.categoryId !== undefined ? dto.categoryId : undefined,
          brandId: dto.brandId !== undefined ? dto.brandId : undefined,
        },
      });

      return tx.product.findUniqueOrThrow({
        where: { id },
        include: {
          category: true,
          brand: true,
          variants: {
            include: { inventory: true },
          },
          images: { orderBy: { sortOrder: "asc" } },
        },
      });
    });

    return this.serializeProduct(updatedProduct);
  }
}
