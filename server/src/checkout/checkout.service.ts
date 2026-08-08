import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Decimal } from "@prisma/client/runtime/library";
import { CheckoutSessionStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { InventoryService } from "../admin/inventory/inventory.service";
import {
  CheckoutPreviewDto,
  CreateCheckoutSessionDto,
  ShippingMethod,
} from "./dto/checkout.dto";

const CHECKOUT_EXPIRY_MINUTES = 30;

// Shipping rates (PKR)
const SHIPPING_RATES: Record<ShippingMethod, number> = {
  [ShippingMethod.STANDARD]: 250,
  [ShippingMethod.EXPRESS]: 500,
};

const FREE_SHIPPING_THRESHOLD = 5000;

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
  ) {}

  // ── Internal helpers ────────────────────────────────────────────────────────

  private computeEffectivePrice(variant: {
    price: Prisma.Decimal | null;
    product: { basePrice: Prisma.Decimal; salePrice: Prisma.Decimal | null };
  }): Decimal {
    if (variant.price !== null) {
      return new Decimal(variant.price.toString());
    }
    if (variant.product.salePrice !== null && variant.product.salePrice !== undefined) {
      return new Decimal(variant.product.salePrice.toString());
    }
    return new Decimal(variant.product.basePrice.toString());
  }

  private calculateShipping(subtotal: Decimal, method: ShippingMethod): Decimal {
    const rate = SHIPPING_RATES[method];
    if (Number(subtotal) >= FREE_SHIPPING_THRESHOLD && method === ShippingMethod.STANDARD) {
      return new Decimal(0);
    }
    return new Decimal(rate);
  }

  private serializeSession(session: {
    id: string;
    userId: string;
    shippingMethod: string;
    subtotal: Decimal;
    shippingAmount: Decimal;
    discountAmount: Decimal;
    total: Decimal;
    status: CheckoutSessionStatus;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
    shippingAddress: object;
    billingAddress: object | null;
    items: object[];
  }) {
    return {
      id: session.id,
      shippingMethod: session.shippingMethod,
      subtotal: Number(session.subtotal),
      shippingAmount: Number(session.shippingAmount),
      discountAmount: Number(session.discountAmount),
      total: Number(session.total),
      status: session.status,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      shippingAddress: session.shippingAddress,
      billingAddress: session.billingAddress,
      items: session.items,
    };
  }

  // ── Expiration ──────────────────────────────────────────────────────────────

  /**
   * Finds all ACTIVE sessions for the given userId that have passed their
   * expiresAt and marks them EXPIRED while releasing their reserved inventory.
   * Called before any checkout endpoint to ensure consistency.
   */
  async expireStaleSessionsForUser(userId: string) {
    const now = new Date();

    const staleSessions = await this.prisma.checkoutSession.findMany({
      where: {
        userId,
        status: CheckoutSessionStatus.ACTIVE,
        expiresAt: { lte: now },
      },
      include: { items: true },
    });

    for (const session of staleSessions) {
      await this.prisma.$transaction(async (tx) => {
        for (const item of session.items) {
          await this.inventoryService.releaseInventory(
            tx,
            item.variantId,
            item.quantity,
            `Checkout session ${session.id} expired`,
            userId,
          );
        }

        await tx.checkoutSession.update({
          where: { id: session.id },
          data: { status: CheckoutSessionStatus.EXPIRED },
        });
      });
    }
  }

  // ── Preview ─────────────────────────────────────────────────────────────────

  async previewCheckout(userId: string, dto: CheckoutPreviewDto) {
    await this.expireStaleSessionsForUser(userId);

    // Validate address
    const address = await this.prisma.address.findUnique({
      where: { id: dto.shippingAddressId },
    });

    if (!address || address.userId !== userId) {
      throw new NotFoundException("Shipping address not found.");
    }

    // Load cart
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: { select: { id: true, name: true, productCode: true, basePrice: true, salePrice: true, isActive: true } },
                inventory: { select: { quantityOnHand: true, reservedQuantity: true } },
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException("Cart is empty.");
    }

    const validationErrors: string[] = [];
    let subtotal = new Decimal(0);

    const lineItems = cart.items.map((item) => {
      const { variant } = item;
      const { product } = variant;

      if (!product.isActive) {
        validationErrors.push(`"${product.name}" is no longer available.`);
      }

      if (!variant.isActive) {
        validationErrors.push(`A variant of "${product.name}" is no longer available.`);
      }

      const available = Math.max(
        0,
        (variant.inventory?.quantityOnHand ?? 0) - (variant.inventory?.reservedQuantity ?? 0),
      );

      if (available < item.quantity) {
        validationErrors.push(
          `"${product.name}" has only ${available} unit(s) available (you need ${item.quantity}).`,
        );
      }

      const unitPrice = this.computeEffectivePrice(variant);
      const lineTotal = unitPrice.mul(item.quantity);
      subtotal = subtotal.add(lineTotal);

      return {
        variantId: variant.id,
        productName: product.name,
        productCode: product.productCode,
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        quantity: item.quantity,
        unitPrice: Number(unitPrice),
        lineTotal: Number(lineTotal),
        availableQuantity: available,
      };
    });

    const shippingAmount = this.calculateShipping(subtotal, dto.shippingMethod);
    const total = subtotal.add(shippingAmount);

    return {
      validationErrors,
      isValid: validationErrors.length === 0,
      shippingMethod: dto.shippingMethod,
      lineItems,
      subtotal: Number(subtotal),
      shippingAmount: Number(shippingAmount),
      discountAmount: 0,
      total: Number(total),
      shippingAddress: {
        id: address.id,
        recipientName: address.recipientName,
        phone: address.phone,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        stateOrProvince: address.stateOrProvince,
        postalCode: address.postalCode,
        country: address.country,
      },
    };
  }

  // ── Create Session ──────────────────────────────────────────────────────────

  async createSession(userId: string, dto: CreateCheckoutSessionDto) {
    await this.expireStaleSessionsForUser(userId);

    // Check for an existing active session
    const existingActive = await this.prisma.checkoutSession.findFirst({
      where: { userId, status: CheckoutSessionStatus.ACTIVE },
    });

    if (existingActive) {
      throw new BadRequestException(
        "You already have an active checkout session. Please cancel it or let it expire before creating a new one.",
      );
    }

    // Validate addresses
    const shippingAddress = await this.prisma.address.findUnique({
      where: { id: dto.shippingAddressId },
    });

    if (!shippingAddress || shippingAddress.userId !== userId) {
      throw new NotFoundException("Shipping address not found.");
    }

    if (dto.billingAddressId) {
      const billingAddress = await this.prisma.address.findUnique({
        where: { id: dto.billingAddressId },
      });
      if (!billingAddress || billingAddress.userId !== userId) {
        throw new NotFoundException("Billing address not found.");
      }
    }

    // Perform everything in a transaction
    const session = await this.prisma.$transaction(async (tx) => {
      // Load cart with locking
      const cart = await tx.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: {
                    select: {
                      id: true,
                      name: true,
                      productCode: true,
                      basePrice: true,
                      salePrice: true,
                      isActive: true,
                    },
                  },
                  inventory: { select: { quantityOnHand: true, reservedQuantity: true } },
                },
              },
            },
          },
        },
      });

      if (!cart || cart.items.length === 0) {
        throw new BadRequestException("Cart is empty.");
      }

      // Validate all items before reserving any
      const validationErrors: string[] = [];
      let subtotal = new Decimal(0);

      type LineItem = {
        variantId: string;
        productId: string;
        quantity: number;
        unitPrice: Decimal;
        lineTotal: Decimal;
        productNameSnapshot: string;
        productCodeSnapshot: string;
        skuSnapshot: string;
        sizeSnapshot: number;
        colorSnapshot: string;
      };

      const lineItems: LineItem[] = [];

      for (const item of cart.items) {
        const { variant } = item;
        const { product } = variant;

        if (!product.isActive) {
          validationErrors.push(`"${product.name}" is no longer available.`);
          continue;
        }

        if (!variant.isActive) {
          validationErrors.push(`A variant of "${product.name}" is no longer available.`);
          continue;
        }

        const available = Math.max(
          0,
          (variant.inventory?.quantityOnHand ?? 0) - (variant.inventory?.reservedQuantity ?? 0),
        );

        if (available < item.quantity) {
          validationErrors.push(
            `"${product.name}" has only ${available} unit(s) available (you need ${item.quantity}).`,
          );
          continue;
        }

        const unitPrice = this.computeEffectivePrice(variant);
        const lineTotal = unitPrice.mul(item.quantity);
        subtotal = subtotal.add(lineTotal);

        lineItems.push({
          variantId: variant.id,
          productId: product.id,
          quantity: item.quantity,
          unitPrice,
          lineTotal,
          productNameSnapshot: product.name,
          productCodeSnapshot: product.productCode,
          skuSnapshot: variant.sku,
          sizeSnapshot: variant.size,
          colorSnapshot: variant.color,
        });
      }

      if (validationErrors.length > 0) {
        throw new BadRequestException({
          message: "Cart validation failed",
          errors: validationErrors,
        });
      }

      const shippingAmount = this.calculateShipping(subtotal, dto.shippingMethod);
      const total = subtotal.add(shippingAmount);
      const expiresAt = new Date(Date.now() + CHECKOUT_EXPIRY_MINUTES * 60 * 1000);

      // Reserve inventory for each item
      for (const lineItem of lineItems) {
        await this.inventoryService.reserveInventory(
          tx,
          lineItem.variantId,
          lineItem.quantity,
          `Checkout session reservation for user ${userId}`,
          userId,
        );
      }

      // Create the checkout session
      const newSession = await tx.checkoutSession.create({
        data: {
          userId,
          shippingAddressId: dto.shippingAddressId,
          billingAddressId: dto.billingAddressId ?? null,
          shippingMethod: dto.shippingMethod,
          subtotal,
          shippingAmount,
          discountAmount: new Decimal(0),
          total,
          status: CheckoutSessionStatus.ACTIVE,
          expiresAt,
          items: {
            create: lineItems.map((li) => ({
              productId: li.productId,
              variantId: li.variantId,
              quantity: li.quantity,
              productNameSnapshot: li.productNameSnapshot,
              productCodeSnapshot: li.productCodeSnapshot,
              skuSnapshot: li.skuSnapshot,
              sizeSnapshot: li.sizeSnapshot,
              colorSnapshot: li.colorSnapshot,
              unitPrice: li.unitPrice,
              lineTotal: li.lineTotal,
            })),
          },
        },
        include: {
          shippingAddress: true,
          billingAddress: true,
          items: true,
        },
      });

      return newSession;
    });

    return this.serializeSession(session);
  }

  // ── Get Session ─────────────────────────────────────────────────────────────

  async getSession(userId: string, sessionId: string) {
    await this.expireStaleSessionsForUser(userId);

    const session = await this.prisma.checkoutSession.findUnique({
      where: { id: sessionId },
      include: {
        shippingAddress: true,
        billingAddress: true,
        items: true,
      },
    });

    if (!session) {
      throw new NotFoundException("Checkout session not found.");
    }

    if (session.userId !== userId) {
      throw new ForbiddenException("Access denied.");
    }

    return this.serializeSession(session);
  }

  // ── Cancel Session ──────────────────────────────────────────────────────────

  async cancelSession(userId: string, sessionId: string) {
    const session = await this.prisma.checkoutSession.findUnique({
      where: { id: sessionId },
      include: { items: true },
    });

    if (!session) {
      throw new NotFoundException("Checkout session not found.");
    }

    if (session.userId !== userId) {
      throw new ForbiddenException("Access denied.");
    }

    // Idempotent – already cancelled/expired/consumed
    if (session.status !== CheckoutSessionStatus.ACTIVE) {
      return { message: `Session is already ${session.status.toLowerCase()}.`, sessionId };
    }

    await this.prisma.$transaction(async (tx) => {
      for (const item of session.items) {
        await this.inventoryService.releaseInventory(
          tx,
          item.variantId,
          item.quantity,
          `Checkout session ${sessionId} cancelled by customer`,
          userId,
        );
      }

      await tx.checkoutSession.update({
        where: { id: sessionId },
        data: { status: CheckoutSessionStatus.CANCELLED },
      });
    });

    return { message: "Checkout session cancelled and inventory released.", sessionId };
  }
}
