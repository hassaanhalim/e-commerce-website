import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AddWishlistItemDto, MergeWishlistDto } from "./dto/wishlist.dto";

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOrCreateWishlist(userId: string) {
    return this.prisma.wishlist.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  private serializeProduct(product: {
    id: string;
    name: string;
    slug: string;
    productCode: string;
    basePrice: any;
    salePrice: any;
    isNew: boolean;
    isFeatured: boolean;
    isActive: boolean;
    brand: { name: string; slug: string };
    category: { name: string; slug: string };
    images: { url: string; isPrimary: boolean; sortOrder: number }[];
    variants: {
      id: string;
      size: number;
      color: string;
      price: any;
      isActive: boolean;
      inventory: { quantityOnHand: number; reservedQuantity: number } | null;
    }[];
  }) {
    const primaryImage =
      product.images.find((img) => img.isPrimary)?.url ??
      product.images.sort((a, b) => a.sortOrder - b.sortOrder)[0]?.url ??
      "";

    const sizes = [...new Set(product.variants.filter((v) => v.isActive).map((v) => v.size))].sort((a, b) => a - b);
    const colors = [...new Set(product.variants.filter((v) => v.isActive).map((v) => v.color))];

    const basePrice = Number(product.basePrice);
    const salePrice = product.salePrice !== null ? Number(product.salePrice) : null;
    const displayPrice = salePrice ?? basePrice;

    const totalAvailable = product.variants.reduce((sum, v) => {
      if (!v.isActive) return sum;
      const available = Math.max(0, (v.inventory?.quantityOnHand ?? 0) - (v.inventory?.reservedQuantity ?? 0));
      return sum + available;
    }, 0);

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      productCode: product.productCode,
      brand: product.brand.name,
      category: product.category.name,
      price: basePrice,
      salePrice,
      displayPrice,
      image: primaryImage,
      sizes,
      colors,
      availableQuantity: totalAvailable,
      inStock: totalAvailable > 0,
      isNew: product.isNew,
      isFeatured: product.isFeatured,
    };
  }

  async getWishlist(userId: string) {
    const wishlist = await this.getOrCreateWishlist(userId);

    const full = await this.prisma.wishlist.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                brand: { select: { name: true, slug: true } },
                category: { select: { name: true, slug: true } },
                images: { select: { url: true, isPrimary: true, sortOrder: true } },
                variants: {
                  where: { isActive: true },
                  include: {
                    inventory: { select: { quantityOnHand: true, reservedQuantity: true } },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    const products = (full?.items ?? [])
      .filter((item) => item.product.isActive)
      .map((item) => this.serializeProduct(item.product));

    return {
      wishlistId: wishlist.id,
      products,
      count: products.length,
    };
  }

  async addItem(userId: string, dto: AddWishlistItemDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: { id: true, isActive: true },
    });

    if (!product) {
      throw new NotFoundException(`Product "${dto.productId}" not found.`);
    }

    if (!product.isActive) {
      throw new BadRequestException("Cannot add an inactive product to wishlist.");
    }

    const wishlist = await this.getOrCreateWishlist(userId);

    await this.prisma.wishlistItem.upsert({
      where: {
        wishlistId_productId: { wishlistId: wishlist.id, productId: dto.productId },
      },
      update: {},
      create: { wishlistId: wishlist.id, productId: dto.productId },
    });

    return this.getWishlist(userId);
  }

  async removeItem(userId: string, productId: string) {
    const wishlist = await this.prisma.wishlist.findUnique({ where: { userId } });
    if (!wishlist) return;

    await this.prisma.wishlistItem
      .delete({
        where: {
          wishlistId_productId: { wishlistId: wishlist.id, productId },
        },
      })
      .catch(() => {
        // silently ignore if item doesn't exist
      });
  }

  async clearWishlist(userId: string) {
    const wishlist = await this.prisma.wishlist.findUnique({ where: { userId } });
    if (!wishlist) return;
    await this.prisma.wishlistItem.deleteMany({ where: { wishlistId: wishlist.id } });
  }

  async mergeGuestWishlist(userId: string, dto: MergeWishlistDto) {
    if (!dto.productIds || dto.productIds.length === 0) {
      return this.getWishlist(userId);
    }

    const wishlist = await this.getOrCreateWishlist(userId);

    const activeProducts = await this.prisma.product.findMany({
      where: { id: { in: dto.productIds }, isActive: true },
      select: { id: true },
    });

    if (activeProducts.length > 0) {
      await this.prisma.wishlistItem.createMany({
        data: activeProducts.map((p) => ({
          wishlistId: wishlist.id,
          productId: p.id,
        })),
        skipDuplicates: true,
      });
    }

    return this.getWishlist(userId);
  }
}
