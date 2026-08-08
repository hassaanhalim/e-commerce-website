import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UserRole, OrderStatus, PaymentStatus, ReviewStatus, ReturnRequestStatus, Prisma } from "@prisma/client";

export interface DashboardSummaryQueryDto {
  from?: string;
  to?: string;
}

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(query: DashboardSummaryQueryDto) {
    const dateWhere: { gte?: Date; lte?: Date } = {};
    if (query.from) dateWhere.gte = new Date(query.from);
    if (query.to) dateWhere.lte = new Date(query.to);

    const hasDateRange = Object.keys(dateWhere).length > 0;

    const orderWhere: Prisma.OrderWhereInput = hasDateRange ? { createdAt: dateWhere } : {};
    const userWhere: Prisma.UserWhereInput = { role: UserRole.CUSTOMER, ...(hasDateRange ? { createdAt: dateWhere } : {}) };

    const [
      totalCustomers,
      newCustomers,
      totalOrders,
      ordersByStatusGroup,
      paidOrdersAggregate,
      pendingOrdersAggregate,
      refundedReturnsAggregate,
      productsCount,
      activeProductsCount,
      variantsCount,
      inventories,
      pendingReviews,
      openReturns,
      recentOrders,
      recentAdjustments,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: UserRole.CUSTOMER } }),
      this.prisma.user.count({ where: userWhere }),
      this.prisma.order.count({ where: orderWhere }),
      this.prisma.order.groupBy({
        by: ["status"],
        _count: { status: true },
        where: orderWhere,
      }),
      this.prisma.order.aggregate({
        _sum: { total: true },
        _count: { id: true },
        where: {
          ...orderWhere,
          paymentStatus: PaymentStatus.PAID,
        },
      }),
      this.prisma.order.aggregate({
        _sum: { total: true },
        where: {
          ...orderWhere,
          paymentStatus: PaymentStatus.PENDING,
          status: { not: OrderStatus.CANCELLED },
        },
      }),
      this.prisma.returnRequest.aggregate({
        _sum: { refundAmount: true },
        where: {
          status: ReturnRequestStatus.COMPLETED,
          ...(hasDateRange ? { createdAt: dateWhere } : {}),
        },
      }),
      this.prisma.product.count(),
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.productVariant.count(),
      this.prisma.inventory.findMany({
        select: {
          quantityOnHand: true,
          reservedQuantity: true,
          lowStockThreshold: true,
        },
      }),
      this.prisma.review.count({ where: { status: ReviewStatus.PENDING } }),
      this.prisma.returnRequest.count({
        where: {
          status: {
            in: [
              ReturnRequestStatus.REQUESTED,
              ReturnRequestStatus.APPROVED,
              ReturnRequestStatus.RECEIVED,
            ],
          },
        },
      }),
      this.prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          orderNumber: true,
          customerEmail: true,
          status: true,
          paymentStatus: true,
          total: true,
          createdAt: true,
          user: { select: { fullName: true } },
        },
      }),
      this.prisma.inventoryAdjustment.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          inventory: {
            include: {
              variant: {
                include: { product: { select: { name: true } } },
              },
            },
          },
          performedBy: { select: { fullName: true } },
        },
      }),
    ]);

    // Calculate Inventory metrics
    let lowStockVariants = 0;
    let outOfStockVariants = 0;

    for (const inv of inventories) {
      const available = inv.quantityOnHand - inv.reservedQuantity;
      if (available <= 0) {
        outOfStockVariants++;
      } else if (available <= inv.lowStockThreshold) {
        lowStockVariants++;
      }
    }

    // Revenue calculations
    const grossPaidRevenue = Number(paidOrdersAggregate._sum.total || 0);
    const refundedAmount = Number(refundedReturnsAggregate._sum.refundAmount || 0);
    const netRevenue = Math.max(0, grossPaidRevenue - refundedAmount);
    const pendingPaymentAmount = Number(pendingOrdersAggregate._sum.total || 0);
    const paidCount = paidOrdersAggregate._count.id || 0;
    const averageOrderValue = paidCount > 0 ? Number((grossPaidRevenue / paidCount).toFixed(2)) : 0;

    const ordersByStatusMap: Record<string, number> = {};
    for (const group of ordersByStatusGroup) {
      ordersByStatusMap[group.status] = group._count.status;
    }

    return {
      totalCustomers,
      newCustomers,
      totalOrders,
      ordersByStatus: ordersByStatusMap,
      grossPaidRevenue,
      refundedAmount,
      netRevenue,
      pendingPaymentAmount,
      averageOrderValue,
      products: productsCount,
      activeProducts: activeProductsCount,
      totalVariants: variantsCount,
      lowStockVariants,
      outOfStockVariants,
      pendingReviews,
      openReturns,
      recentOrders,
      recentInventoryAdjustments: recentAdjustments,
    };
  }
}
