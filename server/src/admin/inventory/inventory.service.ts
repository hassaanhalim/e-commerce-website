import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InventoryAdjustmentType, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AdjustInventoryDto } from "./dto/adjust-inventory.dto";
import { InventoryQueryDto } from "./dto/inventory-query.dto";

import { AuditService } from "../../audit/audit.service";

type InventoryRow = Prisma.InventoryGetPayload<{
  include: {
    variant: {
      include: {
        product: {
          include: {
            category: true;
            brand: true;
          };
        };
      };
    };
  };
}>;

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private serializeInventory(record: InventoryRow) {
    const quantityOnHand = record.quantityOnHand;
    const reservedQuantity = record.reservedQuantity;
    const availableQuantity = Math.max(0, quantityOnHand - reservedQuantity);

    return {
      variantId: record.variantId,
      productId: record.variant.productId,
      productName: record.variant.product.name,
      productCode: record.variant.product.productCode,
      sku: record.variant.sku,
      size: record.variant.size,
      color: record.variant.color,
      isActive: record.variant.isActive,
      quantityOnHand,
      reservedQuantity,
      availableQuantity,
      inStock: availableQuantity > 0,
      lowStockThreshold: record.lowStockThreshold,
      isLowStock: availableQuantity > 0 && availableQuantity <= record.lowStockThreshold,
      isOutOfStock: availableQuantity === 0,
      updatedAt: record.updatedAt,
    };
  }

  private serializeAdjustment(record: Prisma.InventoryAdjustmentGetPayload<{
    include: { performedBy: true };
  }>) {
    return {
      id: record.id,
      type: record.type,
      onHandDelta: record.onHandDelta,
      reservedDelta: record.reservedDelta,
      beforeOnHand: record.beforeOnHand,
      afterOnHand: record.afterOnHand,
      beforeReserved: record.beforeReserved,
      afterReserved: record.afterReserved,
      reason: record.reason,
      performedBy: {
        id: record.performedBy.id,
        fullName: record.performedBy.fullName,
        email: record.performedBy.email,
      },
      createdAt: record.createdAt,
    };
  }

  private async ensureInventoryExists(tx: Prisma.TransactionClient, variantId: string) {
    return tx.inventory.upsert({
      where: { variantId },
      update: {},
      create: { variantId },
    });
  }

  async ensureInventoriesForVariants(tx: Prisma.TransactionClient, variantIds: string[]) {
    if (variantIds.length === 0) return;

    await tx.inventory.createMany({
      data: variantIds.map((variantId) => ({ variantId })),
      skipDuplicates: true,
    });
  }

  async findAll(query: InventoryQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const variants = await this.prisma.productVariant.findMany({
      include: {
        product: {
          include: {
            category: true,
            brand: true,
          },
        },
        inventory: true,
      },
      orderBy: [
        { product: { name: "asc" } },
        { size: "asc" },
        { color: "asc" },
      ],
    });

    const search = query.search?.trim().toLowerCase();
    const filtered = variants.filter((variant) => {
      const quantityOnHand = variant.inventory?.quantityOnHand ?? 0;
      const reservedQuantity = variant.inventory?.reservedQuantity ?? 0;
      const lowStockThreshold = variant.inventory?.lowStockThreshold ?? 5;
      const availableQuantity = Math.max(0, quantityOnHand - reservedQuantity);
      const isLowStock = availableQuantity > 0 && availableQuantity <= lowStockThreshold;
      const isOutOfStock = availableQuantity === 0;

      if (query.productId && variant.productId !== query.productId) return false;
      if (query.sku?.trim() && !variant.sku.toLowerCase().includes(query.sku.trim().toLowerCase())) return false;
      if (query.lowStock && !isLowStock) return false;
      if (query.outOfStock && !isOutOfStock) return false;
      if (search) {
        const haystack = [variant.product.name, variant.product.productCode, variant.sku, variant.color, String(variant.size)]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(search)) return false;
      }

      return true;
    });

    const total = filtered.length;
    const start = (page - 1) * limit;
    const data = filtered.slice(start, start + limit).map((variant) => {
      const quantityOnHand = variant.inventory?.quantityOnHand ?? 0;
      const reservedQuantity = variant.inventory?.reservedQuantity ?? 0;
      const lowStockThreshold = variant.inventory?.lowStockThreshold ?? 5;
      const availableQuantity = Math.max(0, quantityOnHand - reservedQuantity);

      return {
        variantId: variant.id,
        productId: variant.productId,
        productName: variant.product.name,
        productCode: variant.product.productCode,
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        isActive: variant.isActive,
        quantityOnHand,
        reservedQuantity,
        availableQuantity,
        inStock: availableQuantity > 0,
        lowStockThreshold,
        isLowStock: availableQuantity > 0 && availableQuantity <= lowStockThreshold,
        isOutOfStock: availableQuantity === 0,
        updatedAt: variant.inventory?.updatedAt ?? variant.updatedAt,
      };
    });

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

  async findOne(variantId: string) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { variantId },
      include: {
        variant: {
          include: {
            product: {
              include: {
                category: true,
                brand: true,
              },
            },
          },
        },
      },
    });

    if (inventory) {
      return this.serializeInventory(inventory as InventoryRow);
    }

    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: {
          include: {
            category: true,
            brand: true,
          },
        },
      },
    });

    if (!variant) {
      throw new NotFoundException(`Variant with ID "${variantId}" not found.`);
    }

    return {
      variantId: variant.id,
      productId: variant.productId,
      productName: variant.product.name,
      productCode: variant.product.productCode,
      sku: variant.sku,
      size: variant.size,
      color: variant.color,
      isActive: variant.isActive,
      quantityOnHand: 0,
      reservedQuantity: 0,
      availableQuantity: 0,
      inStock: false,
      lowStockThreshold: 5,
      isLowStock: false,
      isOutOfStock: true,
      updatedAt: variant.updatedAt,
    };
  }

  async getHistory(variantId: string) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { variantId },
      select: { id: true },
    });

    if (!inventory) {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: variantId },
        select: { id: true },
      });

      if (!variant) {
        throw new NotFoundException(`Variant with ID "${variantId}" not found.`);
      }

      return [];
    }

    const records = await this.prisma.inventoryAdjustment.findMany({
      where: { inventoryId: inventory.id },
      include: { performedBy: true },
      orderBy: { createdAt: "desc" },
    });

    return records.map((record) => this.serializeAdjustment(record));
  }

  async adjust(variantId: string, dto: AdjustInventoryDto, performedById: string) {
    if (dto.onHandDelta === undefined && dto.reservedDelta === undefined) {
      throw new BadRequestException("Provide at least one stock delta.");
    }

    if (!dto.reason?.trim()) {
      throw new BadRequestException("Adjustment reason is required.");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.findUnique({
        where: { id: variantId },
        select: { id: true },
      });

      if (!variant) {
        throw new NotFoundException(`Variant with ID "${variantId}" not found.`);
      }

      const inventory = await this.ensureInventoryExists(tx, variantId);
      const beforeOnHand = inventory.quantityOnHand;
      const beforeReserved = inventory.reservedQuantity;
      const onHandDelta = dto.onHandDelta ?? 0;
      const reservedDelta = dto.reservedDelta ?? 0;
      const afterOnHand = beforeOnHand + onHandDelta;
      const afterReserved = beforeReserved + reservedDelta;

      if (afterOnHand < 0) {
        throw new BadRequestException("quantityOnHand cannot become negative.");
      }

      if (afterReserved < 0) {
        throw new BadRequestException("reservedQuantity cannot become negative.");
      }

      if (afterReserved > afterOnHand) {
        throw new BadRequestException("reservedQuantity cannot exceed quantityOnHand.");
      }

      await tx.inventoryAdjustment.create({
        data: {
          inventoryId: inventory.id,
          type: dto.type,
          onHandDelta,
          reservedDelta,
          beforeOnHand,
          afterOnHand,
          beforeReserved,
          afterReserved,
          reason: dto.reason?.trim() || "Manual inventory adjustment",
          performedById,
        },
      });

      return tx.inventory.update({
        where: { id: inventory.id },
        data: {
          quantityOnHand: afterOnHand,
          reservedQuantity: afterReserved,
        },
        include: {
          variant: {
            include: {
              product: {
                include: {
                  category: true,
                  brand: true,
                },
              },
            },
          },
        },
      });
    });

    await this.auditService.logAction({
      actorUserId: performedById,
      action: "INVENTORY_ADJUSTED",
      entityType: "INVENTORY",
      entityId: variantId,
      description: `Inventory adjustment (${dto.type}): ${dto.reason}`,
      metadata: { type: dto.type, onHandDelta: dto.onHandDelta, reservedDelta: dto.reservedDelta, reason: dto.reason },
    });

    return this.serializeInventory(updated as InventoryRow);
  }

  async updateThreshold(variantId: string, lowStockThreshold: number) {
    const normalizedThreshold = Math.max(0, Math.floor(lowStockThreshold));

    const inventory = await this.prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.findUnique({
        where: { id: variantId },
        select: { id: true },
      });

      if (!variant) {
        throw new NotFoundException(`Variant with ID "${variantId}" not found.`);
      }

      const existing = await this.ensureInventoryExists(tx, variantId);

      return tx.inventory.update({
        where: { id: existing.id },
        data: { lowStockThreshold: normalizedThreshold },
        include: {
          variant: {
            include: {
              product: {
                include: {
                  category: true,
                  brand: true,
                },
              },
            },
          },
        },
      });
    });

    return this.serializeInventory(inventory as InventoryRow);
  }

  async reserveInventory(tx: Prisma.TransactionClient, variantId: string, quantity: number, reason: string, performedById: string) {
    if (quantity <= 0) {
      throw new BadRequestException("Reservation quantity must be positive.");
    }

    const inventory = await this.ensureInventoryExists(tx, variantId);
    const afterReserved = inventory.reservedQuantity + quantity;

    if (afterReserved > inventory.quantityOnHand) {
      throw new BadRequestException("reservedQuantity cannot exceed quantityOnHand.");
    }

    await tx.inventoryAdjustment.create({
      data: {
        inventoryId: inventory.id,
        type: InventoryAdjustmentType.RESERVE,
        onHandDelta: 0,
        reservedDelta: quantity,
        beforeOnHand: inventory.quantityOnHand,
        afterOnHand: inventory.quantityOnHand,
        beforeReserved: inventory.reservedQuantity,
        afterReserved,
        reason,
        performedById,
      },
    });

    return tx.inventory.update({
      where: { id: inventory.id },
      data: { reservedQuantity: afterReserved },
    });
  }

  async releaseInventory(tx: Prisma.TransactionClient, variantId: string, quantity: number, reason: string, performedById: string) {
    if (quantity <= 0) {
      throw new BadRequestException("Release quantity must be positive.");
    }

    const inventory = await this.ensureInventoryExists(tx, variantId);
    const afterReserved = inventory.reservedQuantity - quantity;

    if (afterReserved < 0) {
      throw new BadRequestException("reservedQuantity cannot become negative.");
    }

    await tx.inventoryAdjustment.create({
      data: {
        inventoryId: inventory.id,
        type: InventoryAdjustmentType.RELEASE,
        onHandDelta: 0,
        reservedDelta: -quantity,
        beforeOnHand: inventory.quantityOnHand,
        afterOnHand: inventory.quantityOnHand,
        beforeReserved: inventory.reservedQuantity,
        afterReserved,
        reason,
        performedById,
      },
    });

    return tx.inventory.update({
      where: { id: inventory.id },
      data: { reservedQuantity: afterReserved },
    });
  }
}