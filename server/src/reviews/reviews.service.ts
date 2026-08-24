import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { OrderStatus, Prisma, ReviewStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateReviewDto,
  ModerateReviewDto,
  UpdateMyReviewDto,
} from "./dto/create-review.dto";
import {
  AdminReviewQueryDto,
  CustomerReviewQueryDto,
  PublicReviewQueryDto,
} from "./dto/review-query.dto";

import { AuditService } from "../audit/audit.service";

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ── 1. Check Customer Review Eligibility ──────────────────────────────────
  async checkEligibility(userId: string, orderItemId: string) {
    const orderItem = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: { select: { id: true, userId: true, status: true } },
        review: { select: { id: true } },
      },
    });

    if (!orderItem) {
      throw new NotFoundException(`Order item with ID "${orderItemId}" not found.`);
    }

    if (orderItem.order.userId !== userId) {
      throw new ForbiddenException("You cannot review an order item from another customer's order.");
    }

    if (orderItem.order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException("Only delivered order items can be reviewed.");
    }

    if (orderItem.review) {
      throw new BadRequestException("You have already reviewed this order item.");
    }

    return {
      eligible: true,
      orderItemId: orderItem.id,
      productId: orderItem.productId,
      productName: orderItem.productNameSnapshot,
    };
  }

  // ── 2. Create Review (Customer) ───────────────────────────────────────────
  async createReview(userId: string, dto: CreateReviewDto) {
    await this.checkEligibility(userId, dto.orderItemId);

    const orderItem = await this.prisma.orderItem.findUniqueOrThrow({
      where: { id: dto.orderItemId },
      select: { productId: true },
    });

    const review = await this.prisma.review.create({
      data: {
        userId,
        productId: orderItem.productId,
        orderItemId: dto.orderItemId,
        rating: dto.rating,
        title: dto.title?.trim() || null,
        comment: dto.comment.trim(),
        status: ReviewStatus.PENDING,
      },
      include: {
        product: { select: { id: true, name: true, slug: true } },
      },
    });

    return review;
  }

  // ── 3. Update My Review (Customer) ─────────────────────────────────────────
  async updateMyReview(userId: string, reviewId: string, dto: UpdateMyReviewDto) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException(`Review with ID "${reviewId}" not found.`);
    }

    if (review.userId !== userId) {
      throw new ForbiddenException("You cannot update another user's review.");
    }

    // Reset status to PENDING on update to ensure re-moderation
    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        rating: dto.rating,
        title: dto.title?.trim() || null,
        comment: dto.comment.trim(),
        status: ReviewStatus.PENDING,
      },
      include: {
        product: { select: { id: true, name: true, slug: true } },
      },
    });

    return updated;
  }

  // ── 4. Find My Reviews (Customer) ─────────────────────────────────────────
  async findMyReviews(userId: string, query: CustomerReviewQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ReviewWhereInput = { userId };

    const [total, reviews] = await Promise.all([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              images: { orderBy: { sortOrder: "asc" }, take: 1 },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: reviews,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── 5. Find Public Product Reviews (Public) ───────────────────────────────
  async findPublicProductReviews(productId: string, query: PublicReviewQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ReviewWhereInput = {
      productId,
      status: ReviewStatus.APPROVED,
    };

    if (query.rating && query.rating >= 1 && query.rating <= 5) {
      where.rating = query.rating;
    }

    const [total, reviews] = await Promise.all([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        include: {
          user: { select: { fullName: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const safeReviews = reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      reviewerName: r.user.fullName || "Verified Buyer",
      verifiedPurchase: true,
      createdAt: r.createdAt,
    }));

    return {
      data: safeReviews,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── 6. Get Product Rating Summary (Public) ────────────────────────────────
  async getProductRatingSummary(productId: string) {
    const approvedWhere: Prisma.ReviewWhereInput = {
      productId,
      status: ReviewStatus.APPROVED,
    };

    const [aggregate, ratingGroups] = await Promise.all([
      this.prisma.review.aggregate({
        where: approvedWhere,
        _avg: { rating: true },
        _count: { rating: true },
      }),
      this.prisma.review.groupBy({
        by: ["rating"],
        where: approvedWhere,
        _count: { rating: true },
      }),
    ]);

    const reviewCount = aggregate._count.rating ?? 0;
    const rawAverage = aggregate._avg.rating ?? 0;
    const averageRating = reviewCount > 0 ? Math.round(rawAverage * 10) / 10 : 0;

    const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const group of ratingGroups) {
      breakdown[group.rating] = group._count.rating;
    }

    return {
      averageRating,
      reviewCount,
      ratingBreakdown: breakdown,
    };
  }

  // ── 7. Find Admin Reviews (Admin) ─────────────────────────────────────────
  async findAdminReviews(query: AdminReviewQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ReviewWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.rating) {
      where.rating = query.rating;
    }
    if (query.productId) {
      where.productId = query.productId;
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { comment: { contains: search, mode: "insensitive" } },
        { user: { fullName: { contains: search, mode: "insensitive" } } },
        { product: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [total, reviews] = await Promise.all([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, email: true } },
          product: { select: { id: true, name: true, slug: true } },
          moderatedBy: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: reviews,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── 8. Moderate Review (Admin) ────────────────────────────────────────────
  async moderateReview(adminId: string, reviewId: string, dto: ModerateReviewDto) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException(`Review with ID "${reviewId}" not found.`);
    }

    const newStatus = dto.status === "APPROVED" ? ReviewStatus.APPROVED : ReviewStatus.REJECTED;

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        status: newStatus,
        moderationNote: dto.moderationNote?.trim() || null,
        moderatedById: adminId,
        moderatedAt: new Date(),
      },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        product: { select: { id: true, name: true, slug: true } },
        moderatedBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    await this.auditService.logAction({
      actorUserId: adminId,
      action: "REVIEW_MODERATED",
      entityType: "REVIEW",
      entityId: reviewId,
      description: `Review moderated to ${newStatus}.`,
      metadata: { status: newStatus, moderationNote: dto.moderationNote },
    });

    return updated;
  }
}
