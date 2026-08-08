import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AddCartItemDto } from "./dto/add-cart-item.dto";
import { UpdateCartItemDto } from "./dto/update-cart-item.dto";
import { MergeCartDto } from "./dto/merge-cart.dto";

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Helpers ────────────────────────────────────────────────────────────────

  private computeEffectivePrice(variant: {
    price: Prisma.Decimal | null;
    product: { basePrice: Prisma.Decimal; salePrice: Prisma.Decimal | null };
  }): number {
    if (variant.price !== null) {
      return Number(variant.price);
    }
    if (
      variant.product.salePrice !== null &&
      variant.product.salePrice !== undefined
    ) {
      return Number(variant.product.salePrice);
    }
    return Number(variant.product.basePrice);
  }

  private async getOrCreateCart(userId: string) {
    return this.prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  // ── Serialize ──────────────────────────────────────────────────────────────

  private serializeCartItem(item: {
    id: string;
    quantity: number;
    variant: {
      id: string;
      sku: string;
      size: number;
      color: string;
      price: Prisma.Decimal | null;
      isActive: boolean;
      product: {
        id: string;
        slug: string;
        name: string;
        productCode: string;
        basePrice: Prisma.Decimal;
        salePrice: Prisma.Decimal | null;
        isActive: boolean;
        images: { url: string; isPrimary: boolean; sortOrder: number }[];
      };
      inventory: {
        quantityOnHand: number;
        reservedQuantity: number;
      } | null;
    };
  }) {
    const { variant } = item;
    const { product } = variant;

    const unitPrice = this.computeEffectivePrice(variant);
    const lineTotal = unitPrice * item.quantity;

    const inventoryOnHand = variant.inventory?.quantityOnHand ?? 0;
    const inventoryReserved = variant.inventory?.reservedQuantity ?? 0;
    const availableQuantity = Math.max(0, inventoryOnHand - inventoryReserved);
    const inStock = availableQuantity > 0;

    const primaryImage =
      product.images.find((img) => img.isPrimary)?.url ??
      product.images.sort((a, b) => a.sortOrder - b.sortOrder)[0]?.url ??
      "";

    const productActive = product.isActive;
    const variantActive = variant.isActive;
    const isAvailable = productActive && variantActive && inStock;

    let availabilityWarning: string | undefined;
    if (!productActive) {
      availabilityWarning = "This product is no longer available.";
    } else if (!variantActive) {
      availabilityWarning = "This variant is no longer available.";
    } else if (!inStock) {
      availabilityWarning = "This item is currently out of stock.";
    } else if (item.quantity > availableQuantity) {
      availabilityWarning = `Only ${availableQuantity} unit(s) available.`;
    }

    return {
      itemId: item.id,
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      productImage: primaryImage,
      variantId: variant.id,
      sku: variant.sku,
      size: variant.size,
      color: variant.color,
      unitPrice,
      quantity: item.quantity,
      availableQuantity,
      inStock: isAvailable,
      lineTotal,
      availabilityWarning,
    };
  }

  async getCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);

    const fullCart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    images: { select: { url: true, isPrimary: true, sortOrder: true } },
                  },
                },
                inventory: { select: { quantityOnHand: true, reservedQuantity: true } },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    const items = (fullCart?.items ?? []).map((item) =>
      this.serializeCartItem(item),
    );

    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      cartId: cart.id,
      items,
      subtotal: Math.round(subtotal * 100) / 100,
      itemCount,
    };
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    const { variantId, quantity, productId } = dto;

    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new BadRequestException("Quantity must be a positive integer.");
    }

    return this.prisma.$transaction(async (tx) => {
      // Validate variant
      const variant = await tx.productVariant.findUnique({
        where: { id: variantId },
        include: {
          product: true,
          inventory: true,
        },
      });

      if (!variant) {
        throw new NotFoundException(`Variant "${variantId}" not found.`);
      }

      if (!variant.isActive) {
        throw new BadRequestException("The selected variant is not active.");
      }

      if (!variant.product.isActive) {
        throw new BadRequestException("The product is not active.");
      }

      if (productId && variant.productId !== productId) {
        throw new BadRequestException(
          "Variant does not belong to the specified product.",
        );
      }

      const availableQuantity = Math.max(
        0,
        (variant.inventory?.quantityOnHand ?? 0) -
          (variant.inventory?.reservedQuantity ?? 0),
      );

      if (quantity > availableQuantity) {
        throw new BadRequestException(
          `Only ${availableQuantity} unit(s) available for this variant.`,
        );
      }

      const cart = await tx.cart.upsert({
        where: { userId },
        update: {},
        create: { userId },
      });

      // Check if item already exists
      const existingItem = await tx.cartItem.findUnique({
        where: { cartId_variantId: { cartId: cart.id, variantId } },
      });

      let cartItem;
      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity > availableQuantity) {
          throw new BadRequestException(
            `Only ${availableQuantity} unit(s) available. You already have ${existingItem.quantity} in your cart.`,
          );
        }
        cartItem = await tx.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: newQuantity },
        });
      } else {
        cartItem = await tx.cartItem.create({
          data: { cartId: cart.id, variantId, quantity },
        });
      }

      // Update cart updatedAt
      await tx.cart.update({ where: { id: cart.id }, data: {} });

      return cartItem;
    });
  }

  async updateItem(userId: string, itemId: string, dto: UpdateCartItemDto) {
    const { quantity } = dto;

    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new BadRequestException("Quantity must be a positive integer.");
    }

    return this.prisma.$transaction(async (tx) => {
      const item = await tx.cartItem.findUnique({
        where: { id: itemId },
        include: {
          cart: true,
          variant: { include: { product: true, inventory: true } },
        },
      });

      if (!item) {
        throw new NotFoundException("Cart item not found.");
      }

      if (item.cart.userId !== userId) {
        throw new ForbiddenException("Access denied.");
      }

      const availableQuantity = Math.max(
        0,
        (item.variant.inventory?.quantityOnHand ?? 0) -
          (item.variant.inventory?.reservedQuantity ?? 0),
      );

      if (quantity > availableQuantity) {
        throw new BadRequestException(
          `Only ${availableQuantity} unit(s) available for this variant.`,
        );
      }

      return tx.cartItem.update({ where: { id: itemId }, data: { quantity } });
    });
  }

  async removeItem(userId: string, itemId: string) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true },
    });

    if (!item) {
      throw new NotFoundException("Cart item not found.");
    }

    if (item.cart.userId !== userId) {
      throw new ForbiddenException("Access denied.");
    }

    await this.prisma.cartItem.delete({ where: { id: itemId } });
  }

  async clearCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) return;
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  }

  async mergeGuestCart(userId: string, dto: MergeCartDto) {
    if (!dto.items || dto.items.length === 0) {
      return this.getCart(userId);
    }

    await this.prisma.$transaction(async (tx) => {
      const cart = await tx.cart.upsert({
        where: { userId },
        update: {},
        create: { userId },
      });

      for (const guestItem of dto.items) {
        const { variantId, quantity } = guestItem;

        if (!Number.isInteger(quantity) || quantity <= 0) continue;

        // Validate variant silently – skip invalid ones
        const variant = await tx.productVariant.findUnique({
          where: { id: variantId },
          include: { product: true, inventory: true },
        });

        if (!variant || !variant.isActive || !variant.product.isActive) continue;

        const availableQuantity = Math.max(
          0,
          (variant.inventory?.quantityOnHand ?? 0) -
            (variant.inventory?.reservedQuantity ?? 0),
        );

        if (availableQuantity === 0) continue;

        const safeQuantity = Math.min(quantity, availableQuantity);

        const existing = await tx.cartItem.findUnique({
          where: { cartId_variantId: { cartId: cart.id, variantId } },
        });

        if (existing) {
          const combined = existing.quantity + safeQuantity;
          const finalQuantity = Math.min(combined, availableQuantity);
          await tx.cartItem.update({
            where: { id: existing.id },
            data: { quantity: finalQuantity },
          });
        } else {
          await tx.cartItem.create({
            data: { cartId: cart.id, variantId, quantity: safeQuantity },
          });
        }
      }
    });

    return this.getCart(userId);
  }
}
