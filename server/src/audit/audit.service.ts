import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";

export interface LogActionParams {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  description: string;
  metadata?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditQueryDto {
  actorUserId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log an audit event. Failsafe: non-critical logging error won't throw exception
   * to interrupt main transaction unless explicitly required.
   */
  async logAction(params: LogActionParams): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorUserId: params.actorUserId || null,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId || null,
          description: params.description,
          metadata: params.metadata ? (params.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
        },
      });
    } catch (err: unknown) {
      this.logger.error("Failed to write audit log:", err);
    }
  }

  async findAll(query: AuditQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};

    if (query.actorUserId) where.actorUserId = query.actorUserId;
    if (query.action) where.action = { equals: query.action, mode: "insensitive" };
    if (query.entityType) where.entityType = { equals: query.entityType, mode: "insensitive" };
    if (query.entityId) where.entityId = query.entityId;

    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { action: { contains: search, mode: "insensitive" } },
        { entityType: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { actorUser: { fullName: { contains: search, mode: "insensitive" } } },
        { actorUser: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }

    const [total, data] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          actorUser: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
        },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    return this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        actorUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }
}
