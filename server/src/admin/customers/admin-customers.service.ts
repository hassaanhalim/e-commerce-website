import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../../audit/audit.service";
import { UserRole, Prisma } from "@prisma/client";

export interface CustomerQueryDto {
  search?: string;
  isActive?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AdminCustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: CustomerQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      role: UserRole.CUSTOMER,
    };

    if (query.isActive !== undefined && query.isActive !== "all") {
      where.isActive = query.isActive === "true";
    }

    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              orders: true,
              reviews: true,
              returnRequests: true,
            },
          },
          orders: {
            where: { paymentStatus: "PAID" },
            select: { total: true },
          },
        },
      }),
    ]);

    const formattedData = users.map((user) => {
      const totalSpent = user.orders.reduce((sum, o) => sum + Number(o.total), 0);
      const { orders, _count, ...rest } = user;
      return {
        ...rest,
        orderCount: _count.orders,
        reviewCount: _count.reviews,
        returnCount: _count.returnRequests,
        totalSpent,
      };
    });

    return {
      data: formattedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        addresses: {
          orderBy: { isDefault: "desc" },
        },
        orders: {
          take: 10,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            paymentStatus: true,
            paymentMethod: true,
            total: true,
            createdAt: true,
          },
        },
        reviews: {
          take: 10,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            rating: true,
            title: true,
            comment: true,
            status: true,
            createdAt: true,
            product: { select: { id: true, name: true, slug: true } },
          },
        },
        returnRequests: {
          take: 10,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            requestNumber: true,
            type: true,
            status: true,
            refundAmount: true,
            reason: true,
            createdAt: true,
          },
        },
        _count: {
          select: { orders: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`Customer with ID "${id}" not found.`);
    }

    const paidOrders = await this.prisma.order.findMany({
      where: { userId: id, paymentStatus: "PAID" },
      select: { total: true },
    });

    const totalSpent = paidOrders.reduce((sum, o) => sum + Number(o.total), 0);

    return {
      ...user,
      orderCount: user._count.orders,
      totalSpent,
    };
  }

  async updateStatus(id: string, isActive: boolean, adminUserId: string) {
    const targetUser = await this.prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      throw new NotFoundException(`User with ID "${id}" not found.`);
    }

    if (targetUser.role === UserRole.ADMIN) {
      throw new BadRequestException("Cannot deactivate or alter an ADMIN user through customer management.");
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    // If deactivated, revoke active sessions
    if (!isActive) {
      await this.prisma.refreshSession.deleteMany({ where: { userId: id } });
    }

    // Audit log
    await this.auditService.logAction({
      actorUserId: adminUserId,
      action: isActive ? "CUSTOMER_ACTIVATED" : "CUSTOMER_DEACTIVATED",
      entityType: "USER",
      entityId: id,
      description: `Customer account "${targetUser.email}" ${isActive ? "activated" : "deactivated"}.`,
      metadata: { email: targetUser.email, fullName: targetUser.fullName },
    });

    return updatedUser;
  }
}
