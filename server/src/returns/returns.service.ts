import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  InventoryAdjustmentType,
  OrderStatus,
  PaymentStatus,
  Prisma,
  ReturnRequestStatus,
  ReturnRequestType,
} from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateReturnRequestDto,
  UpdateReturnStatusDto,
} from "./dto/create-return.dto";
import {
  AdminReturnQueryDto,
  CustomerReturnQueryDto,
} from "./dto/return-query.dto";

import { AuditService } from "../audit/audit.service";

@Injectable()
export class ReturnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private getReturnWindowDays(): number {
    const envVal = process.env.RETURN_WINDOW_DAYS;
    if (envVal) {
      const parsed = parseInt(envVal, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return 14;
  }

  private generateRequestNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `RET-${timestamp}-${random}`;
  }

  // ── 1. Check Return / Exchange Eligibility ────────────────────────────────
  async getEligibility(userId: string, orderItemId: string) {
    const orderItem = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: { select: { id: true, userId: true, status: true, updatedAt: true, createdAt: true } },
        returnRequests: {
          where: {
            status: {
              notIn: [ReturnRequestStatus.REJECTED, ReturnRequestStatus.CANCELLED],
            },
          },
        },
      },
    });

    if (!orderItem) {
      throw new NotFoundException(`Order item with ID "${orderItemId}" not found.`);
    }

    if (orderItem.order.userId !== userId) {
      throw new ForbiddenException("You cannot request return for an item from another user's order.");
    }

    if (orderItem.order.status !== OrderStatus.DELIVERED) {
      return {
        eligible: false,
        reason: "Returns are allowed only for delivered orders.",
        orderItem,
      };
    }

    const windowDays = this.getReturnWindowDays();
    const deliveredTime = orderItem.order.updatedAt.getTime();
    const nowTime = Date.now();
    const daysDiff = (nowTime - deliveredTime) / (1000 * 3600 * 24);

    if (daysDiff > windowDays) {
      return {
        eligible: false,
        reason: `Return window of ${windowDays} days has passed.`,
        orderItem,
      };
    }

    const existingQtySum = orderItem.returnRequests.reduce((sum, req) => sum + req.quantity, 0);
    const remainingQuantity = orderItem.quantity - existingQtySum;

    return {
      eligible: remainingQuantity > 0,
      remainingQuantity: Math.max(0, remainingQuantity),
      maxQuantity: orderItem.quantity,
      returnWindowDays: windowDays,
      orderItem,
    };
  }

  // ── 2. Create Return / Exchange Request ────────────────────────────────────
  async createReturnRequest(userId: string, dto: CreateReturnRequestDto) {
    const eligibility = await this.getEligibility(userId, dto.orderItemId);

    if (!eligibility.eligible) {
      throw new BadRequestException(eligibility.reason || "Order item is not eligible for return.");
    }

    const remainingQty = eligibility.remainingQuantity ?? 0;
    if (dto.quantity > remainingQty) {
      throw new BadRequestException(
        `Requested quantity (${dto.quantity}) exceeds remaining eligible quantity (${remainingQty}).`,
      );
    }

    const orderItem = eligibility.orderItem!;

    let replacementVariant: any = null;
    if (dto.type === ReturnRequestType.EXCHANGE) {
      if (!dto.replacementVariantId) {
        throw new BadRequestException("replacementVariantId is required for EXCHANGE requests.");
      }

      replacementVariant = await this.prisma.productVariant.findUnique({
        where: { id: dto.replacementVariantId },
        include: {
          product: { select: { id: true, isActive: true, basePrice: true } },
          inventory: true,
        },
      });

      if (
        !replacementVariant ||
        !replacementVariant.isActive ||
        !replacementVariant.product.isActive
      ) {
        throw new BadRequestException("Replacement variant is invalid or inactive.");
      }

      if (replacementVariant.productId !== orderItem.productId) {
        throw new BadRequestException("Replacement variant must belong to the same product.");
      }

      const effectivePrice = Number(replacementVariant.price || replacementVariant.product.basePrice);
      const originalPrice = Number(orderItem.unitPrice);
      if (Math.abs(effectivePrice - originalPrice) > 0.01) {
        throw new BadRequestException("Replacement variant price must match original item unit price.");
      }

      const qoh = replacementVariant.inventory?.quantityOnHand ?? 0;
      const rq = replacementVariant.inventory?.reservedQuantity ?? 0;
      const avail = Math.max(0, qoh - rq);

      if (avail < dto.quantity) {
        throw new BadRequestException(`Insufficient stock for replacement variant (Available: ${avail}).`);
      }
    }

    const requestNumber = this.generateRequestNumber();

    const returnRequest = await this.prisma.returnRequest.create({
      data: {
        requestNumber,
        userId,
        orderId: orderItem.orderId,
        orderItemId: dto.orderItemId,
        type: dto.type,
        status: ReturnRequestStatus.REQUESTED,
        quantity: dto.quantity,
        reason: dto.reason.trim(),
        customerNotes: dto.customerNotes?.trim() || null,
        replacementVariantId: dto.type === ReturnRequestType.EXCHANGE ? dto.replacementVariantId : null,
      },
      include: {
        order: { select: { orderNumber: true } },
        orderItem: true,
        replacementVariant: true,
      },
    });

    return returnRequest;
  }

  // ── 3. Customer Cancel Return Request ─────────────────────────────────────
  async cancelCustomerReturn(userId: string, requestId: string) {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.returnRequest.findUnique({
        where: { id: requestId },
        include: { replacementVariant: { include: { inventory: true } } },
      });

      if (!request) {
        throw new NotFoundException(`Return request with ID "${requestId}" not found.`);
      }

      if (request.userId !== userId) {
        throw new ForbiddenException("You cannot cancel another user's return request.");
      }

      if (request.status === ReturnRequestStatus.CANCELLED) {
        return request;
      }

      if (request.status !== ReturnRequestStatus.REQUESTED) {
        throw new BadRequestException(
          `Return request status is "${request.status}" and cannot be cancelled by customer.`,
        );
      }

      // If replacement stock was reserved for an approved exchange, release it
      if (request.type === ReturnRequestType.EXCHANGE && request.replacementReservedAt && request.replacementVariantId) {
        const inv = await tx.inventory.findUnique({
          where: { variantId: request.replacementVariantId },
        });

        if (inv) {
          const beforeRes = inv.reservedQuantity;
          const afterRes = Math.max(0, beforeRes - request.quantity);

          await tx.inventoryAdjustment.create({
            data: {
              inventoryId: inv.id,
              type: InventoryAdjustmentType.RELEASE,
              onHandDelta: 0,
              reservedDelta: -request.quantity,
              beforeOnHand: inv.quantityOnHand,
              afterOnHand: inv.quantityOnHand,
              beforeReserved: beforeRes,
              afterReserved: afterRes,
              reason: `Exchange ${request.requestNumber} cancelled by customer`,
              performedById: userId,
            },
          });

          await tx.inventory.update({
            where: { id: inv.id },
            data: { reservedQuantity: afterRes },
          });
        }
      }

      const updated = await tx.returnRequest.update({
        where: { id: requestId },
        data: {
          status: ReturnRequestStatus.CANCELLED,
          cancelledAt: new Date(),
        },
        include: { order: true, orderItem: true, replacementVariant: true },
      });

      return updated;
    });
  }

  // ── 4. Customer List Return Requests ──────────────────────────────────────
  async findCustomerReturns(userId: string, query: CustomerReturnQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ReturnRequestWhereInput = { userId };
    if (query.status) {
      where.status = query.status;
    }

    const [total, requests] = await Promise.all([
      this.prisma.returnRequest.count({ where }),
      this.prisma.returnRequest.findMany({
        where,
        include: {
          order: { select: { id: true, orderNumber: true } },
          orderItem: true,
          replacementVariant: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: requests,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── 5. Customer Get Return Request Detail ──────────────────────────────────
  async findCustomerReturnById(userId: string, requestId: string) {
    const request = await this.prisma.returnRequest.findUnique({
      where: { id: requestId },
      include: {
        order: { select: { id: true, orderNumber: true, status: true, paymentStatus: true } },
        orderItem: true,
        replacementVariant: {
          include: {
            product: { select: { name: true, slug: true } },
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException(`Return request with ID "${requestId}" not found.`);
    }

    if (request.userId !== userId) {
      throw new ForbiddenException("You cannot access another customer's return request.");
    }

    return request;
  }

  // ── 6. Admin List Return Requests ──────────────────────────────────────────
  async findAdminReturns(query: AdminReturnQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ReturnRequestWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.type) {
      where.type = query.type;
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { requestNumber: { contains: search, mode: "insensitive" } },
        { order: { orderNumber: { contains: search, mode: "insensitive" } } },
        { user: { fullName: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [total, requests] = await Promise.all([
      this.prisma.returnRequest.count({ where }),
      this.prisma.returnRequest.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, email: true } },
          order: { select: { id: true, orderNumber: true } },
          orderItem: true,
          replacementVariant: true,
          reviewedBy: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: requests,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── 7. Admin Get Return Request Detail ─────────────────────────────────────
  async findAdminReturnById(requestId: string) {
    const request = await this.prisma.returnRequest.findUnique({
      where: { id: requestId },
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true } },
        order: { select: { id: true, orderNumber: true, status: true, paymentStatus: true, total: true } },
        orderItem: true,
        replacementVariant: {
          include: {
            product: { select: { name: true, slug: true } },
          },
        },
        reviewedBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!request) {
      throw new NotFoundException(`Return request with ID "${requestId}" not found.`);
    }

    return request;
  }

  // ── 8. Admin Update Return Request Status ──────────────────────────────────
  async updateReturnStatusByAdmin(adminId: string, requestId: string, dto: UpdateReturnStatusDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      const request = await tx.returnRequest.findUnique({
        where: { id: requestId },
        include: {
          order: { include: { payments: true } },
          orderItem: true,
          replacementVariant: true,
        },
      });

      if (!request) {
        throw new NotFoundException(`Return request with ID "${requestId}" not found.`);
      }

      const currentStatus = request.status;
      const targetStatus = dto.status as ReturnRequestStatus;

      // Check final statuses first
      if (
        currentStatus === ReturnRequestStatus.REJECTED ||
        currentStatus === ReturnRequestStatus.COMPLETED ||
        currentStatus === ReturnRequestStatus.CANCELLED
      ) {
        throw new BadRequestException(`Request is in final status "${currentStatus}" and cannot be modified.`);
      }

      if (currentStatus === targetStatus) {
        return request;
      }

      const allowedTransitions: Record<ReturnRequestStatus, ReturnRequestStatus[]> = {
        [ReturnRequestStatus.REQUESTED]: [ReturnRequestStatus.APPROVED, ReturnRequestStatus.REJECTED],
        [ReturnRequestStatus.APPROVED]: [ReturnRequestStatus.RECEIVED, ReturnRequestStatus.CANCELLED],
        [ReturnRequestStatus.RECEIVED]: [ReturnRequestStatus.COMPLETED],
        [ReturnRequestStatus.REJECTED]: [],
        [ReturnRequestStatus.COMPLETED]: [],
        [ReturnRequestStatus.CANCELLED]: [],
      };

      const validNext = allowedTransitions[currentStatus] || [];
      if (!validNext.includes(targetStatus)) {
        throw new BadRequestException(
          `Invalid return status transition from "${currentStatus}" to "${targetStatus}".`,
        );
      }

      const now = new Date();
      const adminNotes = dto.adminNotes?.trim() || request.adminNotes;

      // ── Transition: REQUESTED -> APPROVED ─────────────────────────────────
      if (targetStatus === ReturnRequestStatus.APPROVED) {
        let replacementReservedAt = request.replacementReservedAt;

        if (request.type === ReturnRequestType.EXCHANGE && request.replacementVariantId) {
          const inv = await tx.inventory.findUnique({
            where: { variantId: request.replacementVariantId },
          });

          if (!inv) {
            throw new BadRequestException("Inventory missing for replacement variant.");
          }

          const qoh = inv.quantityOnHand;
          const rq = inv.reservedQuantity;
          const avail = Math.max(0, qoh - rq);

          if (avail < request.quantity) {
            throw new BadRequestException(
              `Insufficient available stock to approve exchange (Available: ${avail}, Requested: ${request.quantity}).`,
            );
          }

          const beforeRes = rq;
          const afterRes = rq + request.quantity;

          await tx.inventoryAdjustment.create({
            data: {
              inventoryId: inv.id,
              type: InventoryAdjustmentType.RESERVE,
              onHandDelta: 0,
              reservedDelta: request.quantity,
              beforeOnHand: qoh,
              afterOnHand: qoh,
              beforeReserved: beforeRes,
              afterReserved: afterRes,
              reason: `Exchange ${request.requestNumber} approved`,
              performedById: adminId,
            },
          });

          await tx.inventory.update({
            where: { id: inv.id },
            data: { reservedQuantity: afterRes },
          });

          replacementReservedAt = now;
        }

        const updated = await tx.returnRequest.update({
          where: { id: requestId },
          data: {
            status: ReturnRequestStatus.APPROVED,
            reviewedById: adminId,
            reviewedAt: now,
            adminNotes,
            replacementReservedAt,
          },
          include: { user: true, order: true, orderItem: true, replacementVariant: true },
        });

        return updated;
      }

      // ── Transition: APPROVED -> CANCELLED or REQUESTED -> REJECTED ────────
      if (targetStatus === ReturnRequestStatus.CANCELLED || targetStatus === ReturnRequestStatus.REJECTED) {
        // Release replacement reservation if exchange was approved
        if (request.type === ReturnRequestType.EXCHANGE && request.replacementReservedAt && request.replacementVariantId) {
          const inv = await tx.inventory.findUnique({
            where: { variantId: request.replacementVariantId },
          });

          if (inv) {
            const beforeRes = inv.reservedQuantity;
            const afterRes = Math.max(0, beforeRes - request.quantity);

            await tx.inventoryAdjustment.create({
              data: {
                inventoryId: inv.id,
                type: InventoryAdjustmentType.RELEASE,
                onHandDelta: 0,
                reservedDelta: -request.quantity,
                beforeOnHand: inv.quantityOnHand,
                afterOnHand: inv.quantityOnHand,
                beforeReserved: beforeRes,
                afterReserved: afterRes,
                reason: `Exchange ${request.requestNumber} ${targetStatus.toLowerCase()}`,
                performedById: adminId,
              },
            });

            await tx.inventory.update({
              where: { id: inv.id },
              data: { reservedQuantity: afterRes },
            });
          }
        }

        const updated = await tx.returnRequest.update({
          where: { id: requestId },
          data: {
            status: targetStatus,
            reviewedById: adminId,
            reviewedAt: now,
            cancelledAt: targetStatus === ReturnRequestStatus.CANCELLED ? now : null,
            adminNotes,
          },
          include: { user: true, order: true, orderItem: true, replacementVariant: true },
        });

        return updated;
      }

      // ── Transition: APPROVED -> RECEIVED ──────────────────────────────────
      if (targetStatus === ReturnRequestStatus.RECEIVED) {
        const updated = await tx.returnRequest.update({
          where: { id: requestId },
          data: {
            status: ReturnRequestStatus.RECEIVED,
            receivedAt: now,
            adminNotes,
          },
          include: { user: true, order: true, orderItem: true, replacementVariant: true },
        });

        return updated;
      }

      // ── Transition: RECEIVED -> COMPLETED ──────────────────────────────────
      if (targetStatus === ReturnRequestStatus.COMPLETED) {
        if (request.inventoryProcessedAt) {
          throw new BadRequestException("Inventory for this return request has already been processed.");
        }

        let calculatedRefund = new Decimal(0);

        if (request.type === ReturnRequestType.RETURN) {
          // 1. Returned Item: increase quantityOnHand (RESTOCK/RETURN adjustment)
          const returnedInv = await tx.inventory.findUnique({
            where: { variantId: request.orderItem.variantId },
          });

          if (returnedInv) {
            const beforeOnHand = returnedInv.quantityOnHand;
            const afterOnHand = beforeOnHand + request.quantity;

            await tx.inventoryAdjustment.create({
              data: {
                inventoryId: returnedInv.id,
                type: InventoryAdjustmentType.RETURN,
                onHandDelta: request.quantity,
                reservedDelta: 0,
                beforeOnHand,
                afterOnHand,
                beforeReserved: returnedInv.reservedQuantity,
                afterReserved: returnedInv.reservedQuantity,
                reason: `Return ${request.requestNumber} completed`,
                performedById: adminId,
              },
            });

            await tx.inventory.update({
              where: { id: returnedInv.id },
              data: { quantityOnHand: afterOnHand },
            });
          }

          // 2. Refund calculation from order item unit price snapshot
          calculatedRefund = new Decimal(request.orderItem.unitPrice).mul(request.quantity);

          // 3. Check if all items in order have been returned to update order payment status to REFUNDED
          const allCompletedReturns = await tx.returnRequest.findMany({
            where: {
              orderId: request.orderId,
              type: ReturnRequestType.RETURN,
              status: ReturnRequestStatus.COMPLETED,
            },
          });

          const totalReturnedAmount = allCompletedReturns.reduce(
            (sum, r) => sum.add(new Decimal(r.refundAmount)),
            calculatedRefund,
          );

          if (totalReturnedAmount.gte(request.order.total) && request.order.paymentStatus === PaymentStatus.PAID) {
            await tx.order.update({
              where: { id: request.orderId },
              data: { paymentStatus: PaymentStatus.REFUNDED },
            });

            for (const p of request.order.payments) {
              if (p.status === PaymentStatus.PAID) {
                await tx.payment.update({
                  where: { id: p.id },
                  data: { status: PaymentStatus.REFUNDED, refundedAt: now },
                });
              }
            }
          }
        } else if (request.type === ReturnRequestType.EXCHANGE && request.replacementVariantId) {
          // 1. Original Returned Item: increase quantityOnHand (RETURN adjustment)
          const returnedInv = await tx.inventory.findUnique({
            where: { variantId: request.orderItem.variantId },
          });

          if (returnedInv) {
            const beforeOnHand = returnedInv.quantityOnHand;
            const afterOnHand = beforeOnHand + request.quantity;

            await tx.inventoryAdjustment.create({
              data: {
                inventoryId: returnedInv.id,
                type: InventoryAdjustmentType.RETURN,
                onHandDelta: request.quantity,
                reservedDelta: 0,
                beforeOnHand,
                afterOnHand,
                beforeReserved: returnedInv.reservedQuantity,
                afterReserved: returnedInv.reservedQuantity,
                reason: `Exchange ${request.requestNumber} returned item processed`,
                performedById: adminId,
              },
            });

            await tx.inventory.update({
              where: { id: returnedInv.id },
              data: { quantityOnHand: afterOnHand },
            });
          }

          // 2. Replacement Item: convert reservation to SALE (decrease quantityOnHand and reservedQuantity)
          const replacementInv = await tx.inventory.findUnique({
            where: { variantId: request.replacementVariantId },
          });

          if (replacementInv) {
            const beforeOnHand = replacementInv.quantityOnHand;
            const beforeReserved = replacementInv.reservedQuantity;
            const afterOnHand = Math.max(0, beforeOnHand - request.quantity);
            const afterReserved = Math.max(0, beforeReserved - request.quantity);

            await tx.inventoryAdjustment.create({
              data: {
                inventoryId: replacementInv.id,
                type: InventoryAdjustmentType.SALE,
                onHandDelta: -request.quantity,
                reservedDelta: -request.quantity,
                beforeOnHand,
                afterOnHand,
                beforeReserved,
                afterReserved,
                reason: `Exchange ${request.requestNumber} replacement item completed`,
                performedById: adminId,
              },
            });

            await tx.inventory.update({
              where: { id: replacementInv.id },
              data: { quantityOnHand: afterOnHand, reservedQuantity: afterReserved },
            });
          }
        }

        const updated = await tx.returnRequest.update({
          where: { id: requestId },
          data: {
            status: ReturnRequestStatus.COMPLETED,
            completedAt: now,
            inventoryProcessedAt: now,
            refundAmount: calculatedRefund,
            adminNotes,
          },
          include: { user: true, order: true, orderItem: true, replacementVariant: true },
        });

        return updated;
      }

      throw new BadRequestException("Unhandled status transition.");
    });

    await this.auditService.logAction({
      actorUserId: adminId,
      action: "RETURN_STATUS_CHANGED",
      entityType: "RETURN_REQUEST",
      entityId: requestId,
      description: `Return request ${result.requestNumber} status changed to ${dto.status}.`,
      metadata: { toStatus: dto.status, adminNotes: dto.adminNotes },
    });

    return result;
  }
}
