import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CheckoutSessionStatus,
  InventoryAdjustmentType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateOrderDto,
} from "./dto/create-order.dto";
import {
  AdminOrderQueryDto,
  CustomerOrderQueryDto,
} from "./dto/order-query.dto";
import {
  CancelOrderDto,
  MockPaymentDto,
  TrackOrderDto,
  UpdateOrderStatusDto,
  UpdatePaymentStatusDto,
} from "./dto/order-actions.dto";

import { AuditService } from "../audit/audit.service";

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) { }

  private generateOrderNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `ORD-${timestamp}-${random}`;
  }

  // ── 1. Create Order from Checkout Session ──────────────────────────────────
  async createOrder(userId: string, dto: CreateOrderDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, phone: true, fullName: true },
    });

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch & Validate Checkout Session
      const session = await tx.checkoutSession.findUnique({
        where: { id: dto.checkoutSessionId },
        include: {
          items: true,
          shippingAddress: true,
          billingAddress: true,
          order: { select: { id: true } },
        },
      });

      if (!session) {
        throw new NotFoundException("Checkout session not found.");
      }

      if (session.userId !== userId) {
        throw new ForbiddenException("You cannot access another user's checkout session.");
      }

      if (session.order) {
        throw new BadRequestException("An order has already been created from this checkout session.");
      }

      if (session.status !== CheckoutSessionStatus.ACTIVE) {
        throw new BadRequestException(`Checkout session is ${session.status.toLowerCase()} and cannot be used.`);
      }

      if (new Date() > session.expiresAt) {
        await tx.checkoutSession.update({
          where: { id: session.id },
          data: { status: CheckoutSessionStatus.EXPIRED },
        });
        throw new BadRequestException("Checkout session has expired.");
      }

      if (!session.items || session.items.length === 0) {
        throw new BadRequestException("Checkout session contains no items.");
      }

      // 2. Revalidate Products, Variants & Inventory in Batch
      const variantIds = session.items.map((item) => item.variantId);
      const [variants, inventories] = await Promise.all([
        tx.productVariant.findMany({
          where: { id: { in: variantIds } },
          include: {
            product: {
              include: {
                images: { orderBy: { sortOrder: "asc" } },
              },
            },
          },
        }),
        tx.inventory.findMany({
          where: { variantId: { in: variantIds } },
        }),
      ]);

      const variantMap = new Map(variants.map((v) => [v.id, v]));
      const inventoryMap = new Map(inventories.map((inv) => [inv.variantId, inv]));

      const orderNumber = this.generateOrderNumber();
      let calculatedSubtotal = new Decimal(0);
      const orderItemPayloads: Array<{
        productId: string;
        variantId: string;
        productNameSnapshot: string;
        productCodeSnapshot: string;
        productSlugSnapshot: string;
        skuSnapshot: string;
        sizeSnapshot: number | null;
        colorSnapshot: string | null;
        imageSnapshot: string | null;
        unitPrice: Decimal;
        quantity: number;
        lineTotal: Decimal;
      }> = [];

      const adjustmentsData: Array<Prisma.InventoryAdjustmentCreateManyInput> = [];
      const inventoryUpdates: Array<{ id: string; quantityOnHand: number; reservedQuantity: number }> = [];

      for (const item of session.items) {
        const variant = variantMap.get(item.variantId);
        if (!variant || !variant.isActive || !variant.product.isActive) {
          throw new BadRequestException(
            `Product variant "${item.productNameSnapshot}" is no longer available.`,
          );
        }

        const primaryImage = variant.product.images.find((img) => img.isPrimary) || variant.product.images[0];
        const unitPrice = new Decimal(item.unitPrice);
        const lineTotal = unitPrice.mul(item.quantity);
        calculatedSubtotal = calculatedSubtotal.add(lineTotal);

        orderItemPayloads.push({
          productId: variant.productId,
          variantId: variant.id,
          productNameSnapshot: variant.product.name,
          productCodeSnapshot: variant.product.productCode,
          productSlugSnapshot: variant.product.slug,
          skuSnapshot: variant.sku,
          sizeSnapshot: variant.size,
          colorSnapshot: variant.color,
          imageSnapshot: primaryImage?.url || null,
          unitPrice,
          quantity: item.quantity,
          lineTotal,
        });

        const inventory = inventoryMap.get(item.variantId);
        if (!inventory) {
          throw new BadRequestException(
            `Inventory record missing for variant "${item.skuSnapshot}".`,
          );
        }

        const quantityOnHand = inventory.quantityOnHand;
        const reservedQuantity = inventory.reservedQuantity;
        const qty = item.quantity;
        const availableQuantity = Math.max(0, quantityOnHand - reservedQuantity);

        if (quantityOnHand < qty) {
          throw new BadRequestException(
            `Insufficient stock for variant "${item.skuSnapshot}". Available: ${availableQuantity}, Requested: ${qty}`,
          );
        }

        const afterOnHand = Math.max(0, quantityOnHand - qty);
        const reservedDelta = reservedQuantity >= qty ? -qty : -reservedQuantity;
        const afterReserved = Math.max(0, reservedQuantity - qty);

        adjustmentsData.push({
          inventoryId: inventory.id,
          type: InventoryAdjustmentType.SALE,
          onHandDelta: -qty,
          reservedDelta,
          beforeOnHand: quantityOnHand,
          afterOnHand,
          beforeReserved: reservedQuantity,
          afterReserved,
          reason: `Order ${orderNumber} created`,
          performedById: userId,
        });

        inventoryUpdates.push({
          id: inventory.id,
          quantityOnHand: afterOnHand,
          reservedQuantity: afterReserved,
        });
      }

      const shippingAmount = new Decimal(session.shippingAmount);
      const discountAmount = new Decimal(session.discountAmount);
      const calculatedTotal = calculatedSubtotal.add(shippingAmount).sub(discountAmount);

      const initialStatus =
        dto.paymentMethod === PaymentMethod.CASH_ON_DELIVERY
          ? OrderStatus.CONFIRMED
          : OrderStatus.PENDING;

      // 3. Create Order & OrderItems
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId,
          checkoutSessionId: session.id,
          status: initialStatus,
          paymentStatus: PaymentStatus.PENDING,
          paymentMethod: dto.paymentMethod,
          customerEmail: user.email,
          customerPhone: user.phone || session.shippingAddress.phone,
          shippingAddressSnapshot: JSON.parse(JSON.stringify(session.shippingAddress)),
          billingAddressSnapshot: session.billingAddress
            ? JSON.parse(JSON.stringify(session.billingAddress))
            : null,
          shippingMethod: session.shippingMethod,
          subtotal: calculatedSubtotal,
          shippingAmount,
          discountAmount,
          total: calculatedTotal,
          customerNotes: dto.customerNotes?.trim() || null,
          items: {
            create: orderItemPayloads,
          },
          statusHistory: {
            create: {
              fromStatus: null,
              toStatus: initialStatus,
              note: `Order created via ${dto.paymentMethod}`,
              changedById: userId,
            },
          },
          payments: {
            create: {
              method: dto.paymentMethod,
              status: PaymentStatus.PENDING,
              amount: calculatedTotal,
              provider: dto.paymentMethod === PaymentMethod.MOCK_ONLINE ? "MOCK_GATEWAY" : "COD",
            },
          },
        },
        include: {
          items: true,
          payments: true,
          statusHistory: { orderBy: { createdAt: "asc" } },
        },
      });

      // 4. Update Session, Adjustments, Inventory & Cart in Parallel
      await Promise.all([
        tx.checkoutSession.update({
          where: { id: session.id },
          data: { status: CheckoutSessionStatus.CONSUMED },
        }),
        adjustmentsData.length > 0
          ? tx.inventoryAdjustment.createMany({ data: adjustmentsData })
          : Promise.resolve(),
        ...inventoryUpdates.map((u) =>
          tx.inventory.update({
            where: { id: u.id },
            data: {
              quantityOnHand: u.quantityOnHand,
              reservedQuantity: u.reservedQuantity,
            },
          }),
        ),
        tx.cartItem.deleteMany({
          where: { cart: { userId } },
        }),
      ]);

      return order;
    }, { maxWait: 10000, timeout: 25000 });
  }

  // ── 2. Customer List Orders ────────────────────────────────────────────────
  async findCustomerOrders(userId: string, query: CustomerOrderQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = { userId };
    if (query.status) {
      where.status = query.status;
    }

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        include: {
          items: true,
          payments: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── 3. Customer Get Order By ID ───────────────────────────────────────────
  async findCustomerOrderById(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        payments: true,
        statusHistory: {
          orderBy: { createdAt: "asc" },
          include: {
            changedBy: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${orderId}" not found.`);
    }

    if (order.userId !== userId) {
      throw new ForbiddenException("You cannot access another customer's order.");
    }

    return order;
  }

  // ── 4. Customer Cancel Order ───────────────────────────────────────────────
  async cancelCustomerOrder(userId: string, orderId: string, dto: CancelOrderDto) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true, payments: true },
      });

      if (!order) {
        throw new NotFoundException(`Order with ID "${orderId}" not found.`);
      }

      if (order.userId !== userId) {
        throw new ForbiddenException("You cannot cancel another customer's order.");
      }

      // Safe statuses for customer cancellation
      if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.CONFIRMED) {
        throw new BadRequestException(
          `Order status is "${order.status}" and cannot be cancelled by customer.`,
        );
      }

      const now = new Date();
      const reason = dto.reason?.trim() || "Cancelled by customer";

      // Restore sold inventory (RESTOCK / RETURN adjustment)
      for (const item of order.items) {
        const inventory = await tx.inventory.findUnique({
          where: { variantId: item.variantId },
        });

        if (inventory) {
          const beforeOnHand = inventory.quantityOnHand;
          const beforeReserved = inventory.reservedQuantity;
          const afterOnHand = beforeOnHand + item.quantity;

          await tx.inventoryAdjustment.create({
            data: {
              inventoryId: inventory.id,
              type: InventoryAdjustmentType.RESTOCK,
              onHandDelta: item.quantity,
              reservedDelta: 0,
              beforeOnHand,
              afterOnHand,
              beforeReserved,
              afterReserved: beforeReserved,
              reason: `Order ${order.orderNumber} cancelled: ${reason}`,
              performedById: userId,
            },
          });

          await tx.inventory.update({
            where: { id: inventory.id },
            data: { quantityOnHand: afterOnHand },
          });
        }
      }

      // Refund mock online payment if already paid
      for (const payment of order.payments) {
        if (payment.status === PaymentStatus.PAID) {
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.REFUNDED,
              refundedAt: now,
            },
          });
        }
      }

      const newPaymentStatus = order.paymentStatus === PaymentStatus.PAID
        ? PaymentStatus.REFUNDED
        : order.paymentStatus;

      // Update Order
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
          paymentStatus: newPaymentStatus,
          cancelledAt: now,
          cancellationReason: reason,
          statusHistory: {
            create: {
              fromStatus: order.status,
              toStatus: OrderStatus.CANCELLED,
              note: reason,
              changedById: userId,
            },
          },
        },
        include: {
          items: true,
          payments: true,
          statusHistory: { orderBy: { createdAt: "asc" } },
        },
      });

      return updatedOrder;
    });
  }

  // ── 5. Admin List Orders ───────────────────────────────────────────────────
  async findAdminOrders(query: AdminOrderQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.paymentStatus) {
      where.paymentStatus = query.paymentStatus;
    }
    if (query.paymentMethod) {
      where.paymentMethod = query.paymentMethod;
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { customerEmail: { contains: search, mode: "insensitive" } },
        { customerPhone: { contains: search, mode: "insensitive" } },
        { user: { fullName: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        include: {
          items: true,
          payments: true,
          user: { select: { id: true, fullName: true, email: true, phone: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── 6. Admin Get Order By ID ───────────────────────────────────────────────
  async findAdminOrderById(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        payments: true,
        user: { select: { id: true, fullName: true, email: true, phone: true } },
        statusHistory: {
          orderBy: { createdAt: "asc" },
          include: {
            changedBy: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${orderId}" not found.`);
    }

    return order;
  }

  // ── 7. Admin Update Order Status ───────────────────────────────────────────
  async updateOrderStatusByAdmin(adminId: string, orderId: string, dto: UpdateOrderStatusDto) {
    const res = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true, payments: true },
      });

      if (!order) {
        throw new NotFoundException(`Order with ID "${orderId}" not found.`);
      }

      const currentStatus = order.status;
      const targetStatus = dto.status;

      if (currentStatus === targetStatus) {
        return order;
      }

      // Check transition rules
      if (currentStatus === OrderStatus.CANCELLED || currentStatus === OrderStatus.DELIVERED) {
        throw new BadRequestException(
          `Order is in final status "${currentStatus}" and cannot be modified.`,
        );
      }

      const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
        [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
        [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
        [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED],
        [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
        [OrderStatus.DELIVERED]: [],
        [OrderStatus.CANCELLED]: [],
      };

      const validNext = allowedTransitions[currentStatus] || [];
      if (!validNext.includes(targetStatus)) {
        throw new BadRequestException(
          `Invalid status transition from "${currentStatus}" to "${targetStatus}".`,
        );
      }

      const now = new Date();
      const note = dto.note?.trim() || `Status updated from ${currentStatus} to ${targetStatus}`;

      // If transitioning to CANCELLED by Admin -> restore stock once & process refund if paid
      if (targetStatus === OrderStatus.CANCELLED) {
        for (const item of order.items) {
          const inventory = await tx.inventory.findUnique({
            where: { variantId: item.variantId },
          });

          if (inventory) {
            const beforeOnHand = inventory.quantityOnHand;
            const afterOnHand = beforeOnHand + item.quantity;

            await tx.inventoryAdjustment.create({
              data: {
                inventoryId: inventory.id,
                type: InventoryAdjustmentType.RESTOCK,
                onHandDelta: item.quantity,
                reservedDelta: 0,
                beforeOnHand,
                afterOnHand,
                beforeReserved: inventory.reservedQuantity,
                afterReserved: inventory.reservedQuantity,
                reason: `Admin cancelled order ${order.orderNumber}: ${note}`,
                performedById: adminId,
              },
            });

            await tx.inventory.update({
              where: { id: inventory.id },
              data: { quantityOnHand: afterOnHand },
            });
          }
        }

        for (const payment of order.payments) {
          if (payment.status === PaymentStatus.PAID) {
            await tx.payment.update({
              where: { id: payment.id },
              data: {
                status: PaymentStatus.REFUNDED,
                refundedAt: now,
              },
            });
          }
        }
      }

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: targetStatus,
          paymentStatus:
            targetStatus === OrderStatus.CANCELLED && order.paymentStatus === PaymentStatus.PAID
              ? PaymentStatus.REFUNDED
              : order.paymentStatus,
          cancelledAt: targetStatus === OrderStatus.CANCELLED ? now : order.cancelledAt,
          cancellationReason: targetStatus === OrderStatus.CANCELLED ? note : order.cancellationReason,
          statusHistory: {
            create: {
              fromStatus: currentStatus,
              toStatus: targetStatus,
              note,
              changedById: adminId,
            },
          },
        },
        include: {
          items: true,
          payments: true,
          statusHistory: { orderBy: { createdAt: "asc" } },
        },
      });

      return updatedOrder;
    });

    await this.auditService.logAction({
      actorUserId: adminId,
      action: "ORDER_STATUS_CHANGED",
      entityType: "ORDER",
      entityId: orderId,
      description: `Order ${res.orderNumber} status changed to ${dto.status}.`,
      metadata: { toStatus: dto.status, note: dto.note },
    });

    return res;
  }

  // ── 8. Admin Update Payment Status ─────────────────────────────────────────
  async updatePaymentStatusByAdmin(orderId: string, dto: UpdatePaymentStatusDto) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { payments: true },
      });

      if (!order) {
        throw new NotFoundException(`Order with ID "${orderId}" not found.`);
      }

      const targetStatus = dto.status;
      const now = new Date();

      for (const payment of order.payments) {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: targetStatus,
            paidAt: targetStatus === PaymentStatus.PAID ? (payment.paidAt || now) : payment.paidAt,
            refundedAt: targetStatus === PaymentStatus.REFUNDED ? (payment.refundedAt || now) : payment.refundedAt,
          },
        });
      }

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { paymentStatus: targetStatus },
        include: { items: true, payments: true, statusHistory: { orderBy: { createdAt: "asc" } } },
      });

      return updatedOrder;
    });
  }

  // ── 9. Execute Mock Online Payment ─────────────────────────────────────────
  async executeMockPayment(userId: string, orderId: string, dto: MockPaymentDto) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { payments: true },
      });

      if (!order) {
        throw new NotFoundException(`Order with ID "${orderId}" not found.`);
      }

      if (order.userId !== userId) {
        throw new ForbiddenException("You cannot execute payment for another user's order.");
      }

      if (order.paymentMethod !== PaymentMethod.MOCK_ONLINE) {
        throw new BadRequestException("Order payment method is not MOCK_ONLINE.");
      }

      const payment = order.payments.find((p) => p.method === PaymentMethod.MOCK_ONLINE) || order.payments[0];
      if (!payment) {
        throw new BadRequestException("Payment record not found for this order.");
      }

      const now = new Date();

      if (dto.success) {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.PAID,
            paidAt: now,
            providerReference: `MOCK-TX-${Date.now()}`,
          },
        });

        const nextOrderStatus = order.status === OrderStatus.PENDING ? OrderStatus.CONFIRMED : order.status;

        const updatedOrder = await tx.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: PaymentStatus.PAID,
            status: nextOrderStatus,
            ...(nextOrderStatus !== order.status
              ? {
                statusHistory: {
                  create: {
                    fromStatus: order.status,
                    toStatus: nextOrderStatus,
                    note: "Payment completed successfully via Mock Online Gateway",
                    changedById: userId,
                  },
                },
              }
              : {}),
          },
          include: { items: true, payments: true, statusHistory: { orderBy: { createdAt: "asc" } } },
        });

        return updatedOrder;
      } else {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.FAILED,
            failureReason: dto.failureReason || "Simulated payment failure",
          },
        });

        const updatedOrder = await tx.order.update({
          where: { id: orderId },
          data: { paymentStatus: PaymentStatus.FAILED },
          include: { items: true, payments: true, statusHistory: { orderBy: { createdAt: "asc" } } },
        });

        return updatedOrder;
      }
    });
  }

  // ── 10. Public Guest Order Tracking ────────────────────────────────────────
  async trackOrderPublic(dto: TrackOrderDto) {
    const orderNumber = dto.orderNumber.trim();
    const verification = dto.verificationInput.trim().toLowerCase();

    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: true,
        statusHistory: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!order) {
      throw new NotFoundException("Order tracking details not found or verification failed.");
    }

    const emailMatch = order.customerEmail.toLowerCase() === verification;
    const phoneMatch = order.customerPhone.replace(/[^0-9]/g, "") === verification.replace(/[^0-9]/g, "");

    if (!emailMatch && !phoneMatch) {
      throw new NotFoundException("Order tracking details not found or verification failed.");
    }

    // Return safe public tracking DTO
    return {
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      shippingMethod: order.shippingMethod,
      total: Number(order.total),
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      itemsSummary: order.items.map((item) => ({
        productName: item.productNameSnapshot,
        sku: item.skuSnapshot,
        size: item.sizeSnapshot,
        color: item.colorSnapshot,
        quantity: item.quantity,
      })),
      timeline: order.statusHistory.map((h) => ({
        status: h.toStatus,
        timestamp: h.createdAt,
        note: h.note,
      })),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
