import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../../audit/audit.service";
import { UserRole, Prisma, ChatMessageRole } from "@prisma/client";

export type CustomerActivityType =
  | "CHAT_MESSAGE"
  | "ORDER_PLACED"
  | "REVIEW_SUBMITTED"
  | "RETURN_REQUESTED"
  | "ACCOUNT_CREATED";

export interface CustomerQueryDto {
  search?: string;
  isActive?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface CompactProductDto {
  id: string;
  name: string;
  slug: string;
  brand: string;
  category: string;
  price: number;
  salePrice: number | null;
  displayPrice: number;
  image: string;
  inStock: boolean;
  availableSizes: number[];
}

export interface CustomerConversationSummary {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  lastMessageAt: Date;
  lastMessageSnippet: string | null;
}

export interface CustomerChatMessageDto {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
  products?: CompactProductDto[];
}

export interface CustomerConversationDetailDto {
  id: string;
  customerId: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  messages: CustomerChatMessageDto[];
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

    // Build conditions for SQL query
    const conditions: Prisma.Sql[] = [Prisma.sql`u.role = 'CUSTOMER'::"UserRole"`];

    if (query.isActive !== undefined && query.isActive !== "all") {
      const isActiveBool = query.isActive === "true";
      conditions.push(Prisma.sql`u."isActive" = ${isActiveBool}`);
    }

    if (query.search) {
      const searchPattern = `%${query.search.trim()}%`;
      conditions.push(
        Prisma.sql`(u."fullName" ILIKE ${searchPattern} OR u.email ILIKE ${searchPattern} OR COALESCE(u.phone, '') ILIKE ${searchPattern})`,
      );
    }

    if (query.from) {
      conditions.push(Prisma.sql`u."createdAt" >= ${new Date(query.from)}`);
    }

    if (query.to) {
      conditions.push(Prisma.sql`u."createdAt" <= ${new Date(query.to)}`);
    }

    const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;

    // Perform single count query and single aggregated data query
    const [countResult, rows] = await Promise.all([
      this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count
        FROM "User" u
        ${whereClause}
      `,
      this.prisma.$queryRaw<
        Array<{
          id: string;
          fullName: string;
          email: string;
          phone: string | null;
          role: string;
          isActive: boolean;
          createdAt: Date;
          updatedAt: Date;
          orderCount: number;
          reviewCount: number;
          returnCount: number;
          totalSpent: number;
          lastActivityAt: Date;
          lastActivityType: CustomerActivityType;
        }>
      >`
        WITH customer_base AS (
          SELECT
            u.id,
            u."fullName",
            u.email,
            u.phone,
            u.role::text AS role,
            u."isActive",
            u."createdAt",
            u."updatedAt",
            -- Chat activity: only USER messages in conversations belonging to this user
            (
              SELECT MAX(cm."createdAt")
              FROM "ChatMessage" cm
              JOIN "ChatConversation" cc ON cc.id = cm."conversationId"
              WHERE cc."userId" = u.id AND cm.role = 'USER'::"ChatMessageRole"
            ) AS latest_chat_at,
            -- Order activity: created by customer
            (
              SELECT MAX(o."createdAt")
              FROM "Order" o
              WHERE o."userId" = u.id
            ) AS latest_order_at,
            -- Review activity: submitted by customer
            (
              SELECT MAX(r."createdAt")
              FROM "Review" r
              WHERE r."userId" = u.id
            ) AS latest_review_at,
            -- Return activity: requested by customer
            (
              SELECT MAX(rr."createdAt")
              FROM "ReturnRequest" rr
              WHERE rr."userId" = u.id
            ) AS latest_return_at,
            -- Counts and financial totals
            (
              SELECT COUNT(*)::int
              FROM "Order" o
              WHERE o."userId" = u.id
            ) AS "orderCount",
            (
              SELECT COUNT(*)::int
              FROM "Review" r
              WHERE r."userId" = u.id
            ) AS "reviewCount",
            (
              SELECT COUNT(*)::int
              FROM "ReturnRequest" rr
              WHERE rr."userId" = u.id
            ) AS "returnCount",
            (
              SELECT COALESCE(SUM(o.total), 0)::float
              FROM "Order" o
              WHERE o."userId" = u.id AND o."paymentStatus" = 'PAID'::"PaymentStatus"
            ) AS "totalSpent"
          FROM "User" u
          ${whereClause}
        )
        SELECT
          id,
          "fullName",
          email,
          phone,
          role,
          "isActive",
          "createdAt",
          "updatedAt",
          "orderCount",
          "reviewCount",
          "returnCount",
          "totalSpent",
          GREATEST(
            "createdAt",
            COALESCE(latest_chat_at, '1970-01-01 00:00:00'::timestamp),
            COALESCE(latest_order_at, '1970-01-01 00:00:00'::timestamp),
            COALESCE(latest_review_at, '1970-01-01 00:00:00'::timestamp),
            COALESCE(latest_return_at, '1970-01-01 00:00:00'::timestamp)
          ) AS "lastActivityAt",
          CASE
            WHEN latest_chat_at IS NOT NULL
              AND latest_chat_at >= COALESCE(latest_order_at, '1970-01-01 00:00:00'::timestamp)
              AND latest_chat_at >= COALESCE(latest_review_at, '1970-01-01 00:00:00'::timestamp)
              AND latest_chat_at >= COALESCE(latest_return_at, '1970-01-01 00:00:00'::timestamp)
              AND latest_chat_at >= "createdAt"
            THEN 'CHAT_MESSAGE'
            WHEN latest_order_at IS NOT NULL
              AND latest_order_at >= COALESCE(latest_chat_at, '1970-01-01 00:00:00'::timestamp)
              AND latest_order_at >= COALESCE(latest_review_at, '1970-01-01 00:00:00'::timestamp)
              AND latest_order_at >= COALESCE(latest_return_at, '1970-01-01 00:00:00'::timestamp)
              AND latest_order_at >= "createdAt"
            THEN 'ORDER_PLACED'
            WHEN latest_review_at IS NOT NULL
              AND latest_review_at >= COALESCE(latest_chat_at, '1970-01-01 00:00:00'::timestamp)
              AND latest_review_at >= COALESCE(latest_order_at, '1970-01-01 00:00:00'::timestamp)
              AND latest_review_at >= COALESCE(latest_return_at, '1970-01-01 00:00:00'::timestamp)
              AND latest_review_at >= "createdAt"
            THEN 'REVIEW_SUBMITTED'
            WHEN latest_return_at IS NOT NULL
              AND latest_return_at >= COALESCE(latest_chat_at, '1970-01-01 00:00:00'::timestamp)
              AND latest_return_at >= COALESCE(latest_order_at, '1970-01-01 00:00:00'::timestamp)
              AND latest_return_at >= COALESCE(latest_review_at, '1970-01-01 00:00:00'::timestamp)
              AND latest_return_at >= "createdAt"
            THEN 'RETURN_REQUESTED'
            ELSE 'ACCOUNT_CREATED'
          END AS "lastActivityType"
        FROM customer_base
        ORDER BY "lastActivityAt" DESC, "createdAt" DESC
        LIMIT ${limit} OFFSET ${skip}
      `,
    ]);

    const total = Number(countResult[0]?.count || 0);

    const formattedData = rows.map((user) => ({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      orderCount: user.orderCount,
      reviewCount: user.reviewCount,
      returnCount: user.returnCount,
      totalSpent: user.totalSpent,
      lastActivityAt: user.lastActivityAt,
      lastActivityType: user.lastActivityType,
    }));

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
          select: { orders: true, chatConversations: true },
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
      conversationCount: user._count.chatConversations,
      totalSpent,
    };
  }

  async getCustomerConversations(customerId: string) {
    const customer = await this.prisma.user.findUnique({
      where: { id: customerId },
      select: { id: true, fullName: true, email: true },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID "${customerId}" not found.`);
    }

    const conversations = await this.prisma.chatConversation.findMany({
      where: { userId: customerId },
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            content: true,
            createdAt: true,
            role: true,
          },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    const conversationSummaries: CustomerConversationSummary[] = conversations.map((conv) => {
      const lastMsg = conv.messages[0];
      return {
        id: conv.id,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        messageCount: conv._count.messages,
        lastMessageAt: lastMsg ? lastMsg.createdAt : conv.updatedAt,
        lastMessageSnippet: lastMsg
          ? lastMsg.content.slice(0, 100) + (lastMsg.content.length > 100 ? "..." : "")
          : null,
      };
    });

    const latestConversationAt =
      conversationSummaries.length > 0 ? conversationSummaries[0].updatedAt : null;

    return {
      customerId,
      totalConversations: conversationSummaries.length,
      latestConversationAt,
      conversations: conversationSummaries,
    };
  }

  async getCustomerConversationDetail(
    customerId: string,
    conversationId: string,
  ): Promise<CustomerConversationDetailDto> {
    const customer = await this.prisma.user.findUnique({
      where: { id: customerId },
      select: { id: true },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID "${customerId}" not found.`);
    }

    const conversation = await this.prisma.chatConversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation || conversation.userId !== customerId) {
      throw new NotFoundException(`Conversation with ID "${conversationId}" not found for this customer.`);
    }

    // Collect all referenced product IDs across all messages
    const allProductIds = Array.from(
      new Set(
        conversation.messages.flatMap((m) => {
          const meta = m.metadata as { productIds?: string[] } | null;
          return Array.isArray(meta?.productIds) ? meta.productIds : [];
        }),
      ),
    );

    const productMap = new Map<string, CompactProductDto>();
    if (allProductIds.length > 0) {
      const liveProducts = await this.fetchLiveRecommendedProducts(allProductIds);
      liveProducts.forEach((p) => productMap.set(p.id, p));
    }

    const messages: CustomerChatMessageDto[] = conversation.messages.map((m) => {
      const meta = m.metadata as { productIds?: string[] } | null;
      const pIds = Array.isArray(meta?.productIds) ? meta.productIds : [];
      const products = pIds
        .map((id) => productMap.get(id))
        .filter((p): p is CompactProductDto => Boolean(p));

      return {
        id: m.id,
        role: m.role === ChatMessageRole.USER ? "user" : "assistant",
        content: m.content,
        createdAt: m.createdAt,
        products: products.length > 0 ? products : undefined,
      };
    });

    return {
      id: conversation.id,
      customerId: conversation.userId,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      messageCount: messages.length,
      messages,
    };
  }

  private async fetchLiveRecommendedProducts(
    productIds: string[],
  ): Promise<CompactProductDto[]> {
    const rawProducts = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        basePrice: true,
        salePrice: true,
        brand: { select: { name: true } },
        category: { select: { name: true } },
        images: {
          select: { url: true, isPrimary: true, sortOrder: true },
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
          take: 1,
        },
        variants: {
          where: { isActive: true },
          select: {
            size: true,
            inventory: { select: { quantityOnHand: true, reservedQuantity: true } },
          },
        },
      },
    });

    return rawProducts.map((p) => {
      const inStockVariants = (p.variants || []).filter((v) => {
        const onHand = v.inventory?.quantityOnHand ?? 0;
        const reserved = v.inventory?.reservedQuantity ?? 0;
        return onHand - reserved > 0;
      });

      const sizeSet = new Set<number>();
      for (const v of inStockVariants) {
        if (typeof v.size === "number") sizeSet.add(v.size);
      }
      const availableSizes = Array.from(sizeSet).sort((a, b) => a - b);

      const base = Number(p.basePrice);
      const sale = p.salePrice ? Number(p.salePrice) : null;
      const displayPrice = sale && sale < base ? sale : base;

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        brand: p.brand?.name || "Shoe Store",
        category: p.category?.name || "Footwear",
        price: base,
        salePrice: sale,
        displayPrice,
        image: p.images[0]?.url || "",
        inStock: inStockVariants.length > 0,
        availableSizes,
      };
    });
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

