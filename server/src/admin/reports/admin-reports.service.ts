import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { OrderStatus, PaymentStatus, ReturnRequestStatus, UserRole, Prisma } from "@prisma/client";

export interface ReportFilterDto {
  from?: string;
  to?: string;
  groupBy?: "day" | "week" | "month";
}

@Injectable()
export class AdminReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private buildDateWhere(query: ReportFilterDto): { gte?: Date; lte?: Date } {
    const where: { gte?: Date; lte?: Date } = {};
    if (query.from) where.gte = new Date(query.from);
    if (query.to) where.lte = new Date(query.to);
    return where;
  }

  // ── Sales Report ───────────────────────────────────────────────────────────
  async getSalesReport(query: ReportFilterDto) {
    const dateWhere = this.buildDateWhere(query);
    const orderWhere: Prisma.OrderWhereInput = Object.keys(dateWhere).length > 0 ? { createdAt: dateWhere } : {};

    const [paidOrders, refundedReturns, allOrdersCount] = await Promise.all([
      this.prisma.order.aggregate({
        _sum: { total: true },
        _count: { id: true },
        where: { ...orderWhere, paymentStatus: PaymentStatus.PAID },
      }),
      this.prisma.returnRequest.aggregate({
        _sum: { refundAmount: true },
        where: {
          status: ReturnRequestStatus.COMPLETED,
          ...(Object.keys(dateWhere).length > 0 ? { createdAt: dateWhere } : {}),
        },
      }),
      this.prisma.order.count({ where: orderWhere }),
    ]);

    const grossPaidRevenue = Number(paidOrders._sum.total || 0);
    const refunds = Number(refundedReturns._sum.refundAmount || 0);
    const netRevenue = Math.max(0, grossPaidRevenue - refunds);
    const orderCount = paidOrders._count.id || 0;
    const averageOrderValue = orderCount > 0 ? Number((grossPaidRevenue / orderCount).toFixed(2)) : 0;

    // Fetch individual paid orders for trend calculation
    const ordersList = await this.prisma.order.findMany({
      where: { ...orderWhere, paymentStatus: PaymentStatus.PAID },
      select: { createdAt: true, total: true },
      orderBy: { createdAt: "asc" },
    });

    const trendMap: Record<string, { date: string; gross: number; count: number }> = {};
    for (const o of ordersList) {
      const dateKey = o.createdAt.toISOString().split("T")[0]; // YYYY-MM-DD
      if (!trendMap[dateKey]) {
        trendMap[dateKey] = { date: dateKey, gross: 0, count: 0 };
      }
      trendMap[dateKey].gross += Number(o.total);
      trendMap[dateKey].count += 1;
    }

    return {
      grossPaidRevenue,
      refunds,
      netRevenue,
      orderCount,
      allOrdersCount,
      averageOrderValue,
      revenueTrend: Object.values(trendMap),
    };
  }

  async exportSalesReportCSV(query: ReportFilterDto): Promise<string> {
    const report = await this.getSalesReport(query);
    const rows = [
      ["Metric", "Value"],
      ["Gross Paid Revenue", report.grossPaidRevenue.toFixed(2)],
      ["Refunds", report.refunds.toFixed(2)],
      ["Net Revenue", report.netRevenue.toFixed(2)],
      ["Paid Order Count", report.orderCount.toString()],
      ["Average Order Value", report.averageOrderValue.toFixed(2)],
      [],
      ["Date", "Gross Revenue", "Paid Orders"],
      ...report.revenueTrend.map((t) => [t.date, t.gross.toFixed(2), t.count.toString()]),
    ];
    return rows.map((r) => r.join(",")).join("\n");
  }

  // ── Order Report ───────────────────────────────────────────────────────────
  async getOrdersReport(query: ReportFilterDto) {
    const dateWhere = this.buildDateWhere(query);
    const orderWhere: Prisma.OrderWhereInput = Object.keys(dateWhere).length > 0 ? { createdAt: dateWhere } : {};

    const [byStatus, byPaymentMethod, byPaymentStatus, cancellationCount] = await Promise.all([
      this.prisma.order.groupBy({
        by: ["status"],
        _count: { status: true },
        where: orderWhere,
      }),
      this.prisma.order.groupBy({
        by: ["paymentMethod"],
        _count: { paymentMethod: true },
        where: orderWhere,
      }),
      this.prisma.order.groupBy({
        by: ["paymentStatus"],
        _count: { paymentStatus: true },
        where: orderWhere,
      }),
      this.prisma.order.count({
        where: { ...orderWhere, status: OrderStatus.CANCELLED },
      }),
    ]);

    return {
      ordersByStatus: byStatus.map((g) => ({ status: g.status, count: g._count.status })),
      ordersByPaymentMethod: byPaymentMethod.map((g) => ({ method: g.paymentMethod, count: g._count.paymentMethod })),
      ordersByPaymentStatus: byPaymentStatus.map((g) => ({ status: g.paymentStatus, count: g._count.paymentStatus })),
      cancellationCount,
    };
  }

  async exportOrdersReportCSV(query: ReportFilterDto): Promise<string> {
    const report = await this.getOrdersReport(query);
    const rows = [
      ["Order Status", "Count"],
      ...report.ordersByStatus.map((s) => [s.status, s.count.toString()]),
      [],
      ["Payment Status", "Count"],
      ...report.ordersByPaymentStatus.map((s) => [s.status, s.count.toString()]),
      [],
      ["Cancellation Count", report.cancellationCount.toString()],
    ];
    return rows.map((r) => r.join(",")).join("\n");
  }

  // ── Product Report ─────────────────────────────────────────────────────────
  async getProductsReport(query: ReportFilterDto) {
    const dateWhere = this.buildDateWhere(query);
    const itemWhere: Prisma.OrderItemWhereInput = Object.keys(dateWhere).length > 0 ? { createdAt: dateWhere } : {};

    const [topItems, activeCount, inactiveCount] = await Promise.all([
      this.prisma.orderItem.groupBy({
        by: ["productId", "productNameSnapshot"],
        _sum: { quantity: true, lineTotal: true },
        _count: { id: true },
        where: itemWhere,
        orderBy: { _sum: { quantity: "desc" } },
        take: 20,
      }),
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.product.count({ where: { isActive: false } }),
    ]);

    const formattedProducts = topItems.map((item) => ({
      productId: item.productId,
      productName: item.productNameSnapshot,
      unitsSold: item._sum.quantity || 0,
      totalRevenue: Number(item._sum.lineTotal || 0),
    }));

    return {
      activeProductsCount: activeCount,
      inactiveProductsCount: inactiveCount,
      topSellingProducts: formattedProducts,
    };
  }

  // ── Inventory Report ───────────────────────────────────────────────────────
  async getInventoryReport() {
    const [inventories, adjustmentsByType] = await Promise.all([
      this.prisma.inventory.findMany({
        include: {
          variant: {
            include: {
              product: { select: { name: true, productCode: true } },
            },
          },
        },
      }),
      this.prisma.inventoryAdjustment.groupBy({
        by: ["type"],
        _sum: { onHandDelta: true },
        _count: { id: true },
      }),
    ]);

    let totalOnHand = 0;
    let totalReserved = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const variantDetails = inventories.map((inv) => {
      const avail = inv.quantityOnHand - inv.reservedQuantity;
      totalOnHand += inv.quantityOnHand;
      totalReserved += inv.reservedQuantity;

      if (avail <= 0) outOfStockCount++;
      else if (avail <= inv.lowStockThreshold) lowStockCount++;

      return {
        variantId: inv.variantId,
        productName: inv.variant.product.name,
        sku: inv.variant.sku,
        size: inv.variant.size,
        color: inv.variant.color,
        quantityOnHand: inv.quantityOnHand,
        reservedQuantity: inv.reservedQuantity,
        availableQuantity: avail,
        lowStockThreshold: inv.lowStockThreshold,
        status: avail <= 0 ? "OUT_OF_STOCK" : avail <= inv.lowStockThreshold ? "LOW_STOCK" : "IN_STOCK",
      };
    });

    return {
      totalOnHand,
      totalReserved,
      totalAvailable: totalOnHand - totalReserved,
      lowStockVariantsCount: lowStockCount,
      outOfStockVariantsCount: outOfStockCount,
      adjustmentsByType: adjustmentsByType.map((a) => ({
        type: a.type,
        count: a._count.id,
        onHandDeltaSum: a._sum.onHandDelta || 0,
      })),
      variants: variantDetails,
    };
  }

  async exportInventoryReportCSV(): Promise<string> {
    const report = await this.getInventoryReport();
    const rows = [
      ["SKU", "Product Name", "Size", "Color", "On Hand", "Reserved", "Available", "Status"],
      ...report.variants.map((v) => [
        v.sku,
        `"${v.productName}"`,
        v.size.toString(),
        v.color,
        v.quantityOnHand.toString(),
        v.reservedQuantity.toString(),
        v.availableQuantity.toString(),
        v.status,
      ]),
    ];
    return rows.map((r) => r.join(",")).join("\n");
  }

  // ── Customer Report ────────────────────────────────────────────────────────
  async getCustomersReport(query: ReportFilterDto) {
    const dateWhere = this.buildDateWhere(query);
    const userWhere: Prisma.UserWhereInput = {
      role: UserRole.CUSTOMER,
      ...(Object.keys(dateWhere).length > 0 ? { createdAt: dateWhere } : {}),
    };

    const [totalCustomers, activeCustomers, inactiveCustomers, topCustomers] = await Promise.all([
      this.prisma.user.count({ where: { role: UserRole.CUSTOMER } }),
      this.prisma.user.count({ where: { role: UserRole.CUSTOMER, isActive: true } }),
      this.prisma.user.count({ where: { role: UserRole.CUSTOMER, isActive: false } }),
      this.prisma.user.findMany({
        where: userWhere,
        take: 10,
        select: {
          id: true,
          fullName: true,
          email: true,
          createdAt: true,
          orders: {
            where: { paymentStatus: PaymentStatus.PAID },
            select: { total: true },
          },
        },
      }),
    ]);

    const formattedTop = topCustomers
      .map((c) => {
        const spent = c.orders.reduce((sum, o) => sum + Number(o.total), 0);
        return {
          id: c.id,
          fullName: c.fullName,
          email: c.email,
          createdAt: c.createdAt,
          ordersCount: c.orders.length,
          totalSpent: spent,
        };
      })
      .sort((a, b) => b.totalSpent - a.totalSpent);

    return {
      totalCustomers,
      activeCustomers,
      inactiveCustomers,
      topCustomers: formattedTop,
    };
  }

  // ── Return Report ──────────────────────────────────────────────────────────
  async getReturnsReport(query: ReportFilterDto) {
    const dateWhere = this.buildDateWhere(query);
    const returnWhere: Prisma.ReturnRequestWhereInput = Object.keys(dateWhere).length > 0 ? { createdAt: dateWhere } : {};

    const [byType, byStatus, refundAggregate, totalRequests] = await Promise.all([
      this.prisma.returnRequest.groupBy({
        by: ["type"],
        _count: { type: true },
        where: returnWhere,
      }),
      this.prisma.returnRequest.groupBy({
        by: ["status"],
        _count: { status: true },
        where: returnWhere,
      }),
      this.prisma.returnRequest.aggregate({
        _sum: { refundAmount: true },
        where: { ...returnWhere, status: ReturnRequestStatus.COMPLETED },
      }),
      this.prisma.returnRequest.count({ where: returnWhere }),
    ]);

    return {
      totalRequests,
      completedRefundAmount: Number(refundAggregate._sum.refundAmount || 0),
      requestsByType: byType.map((t) => ({ type: t.type, count: t._count.type })),
      requestsByStatus: byStatus.map((s) => ({ status: s.status, count: s._count.status })),
    };
  }
}
