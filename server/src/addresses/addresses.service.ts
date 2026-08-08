import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateAddressDto } from "./dto/create-address.dto";
import { UpdateAddressDto } from "./dto/update-address.dto";

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  private serializeAddress(address: {
    id: string;
    userId: string;
    label: string | null;
    recipientName: string;
    phone: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    stateOrProvince: string | null;
    postalCode: string | null;
    country: string;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: address.id,
      label: address.label,
      recipientName: address.recipientName,
      phone: address.phone,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      city: address.city,
      stateOrProvince: address.stateOrProvince,
      postalCode: address.postalCode,
      country: address.country,
      isDefault: address.isDefault,
      createdAt: address.createdAt,
      updatedAt: address.updatedAt,
    };
  }

  async getAddresses(userId: string) {
    const addresses = await this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return addresses.map(this.serializeAddress);
  }

  async createAddress(userId: string, dto: CreateAddressDto) {
    return this.prisma.$transaction(async (tx) => {
      // Check if first address – auto-default
      const count = await tx.address.count({ where: { userId } });
      const shouldBeDefault = dto.isDefault === true || count === 0;

      if (shouldBeDefault) {
        // Unset existing defaults
        await tx.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const address = await tx.address.create({
        data: {
          userId,
          label: dto.label?.trim() ?? null,
          recipientName: dto.recipientName.trim(),
          phone: dto.phone.trim(),
          addressLine1: dto.addressLine1.trim(),
          addressLine2: dto.addressLine2?.trim() ?? null,
          city: dto.city.trim(),
          stateOrProvince: dto.stateOrProvince?.trim() ?? null,
          postalCode: dto.postalCode?.trim() ?? null,
          country: dto.country.trim(),
          isDefault: shouldBeDefault,
        },
      });

      return this.serializeAddress(address);
    });
  }

  async updateAddress(userId: string, addressId: string, dto: UpdateAddressDto) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.address.findUnique({ where: { id: addressId } });

      if (!existing) {
        throw new NotFoundException("Address not found.");
      }

      if (existing.userId !== userId) {
        throw new ForbiddenException("Access denied.");
      }

      const shouldBeDefault = dto.isDefault === true;

      if (shouldBeDefault) {
        await tx.address.updateMany({
          where: { userId, isDefault: true, id: { not: addressId } },
          data: { isDefault: false },
        });
      }

      const updated = await tx.address.update({
        where: { id: addressId },
        data: {
          label: dto.label !== undefined ? dto.label?.trim() ?? null : undefined,
          recipientName: dto.recipientName?.trim(),
          phone: dto.phone?.trim(),
          addressLine1: dto.addressLine1?.trim(),
          addressLine2: dto.addressLine2 !== undefined ? dto.addressLine2?.trim() ?? null : undefined,
          city: dto.city?.trim(),
          stateOrProvince: dto.stateOrProvince !== undefined ? dto.stateOrProvince?.trim() ?? null : undefined,
          postalCode: dto.postalCode !== undefined ? dto.postalCode?.trim() ?? null : undefined,
          country: dto.country?.trim(),
          isDefault: shouldBeDefault || undefined,
        },
      });

      return this.serializeAddress(updated);
    });
  }

  async deleteAddress(userId: string, addressId: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.address.findUnique({ where: { id: addressId } });

      if (!existing) {
        throw new NotFoundException("Address not found.");
      }

      if (existing.userId !== userId) {
        throw new ForbiddenException("Access denied.");
      }

      await tx.address.delete({ where: { id: addressId } });

      // Promote another default if this was default
      if (existing.isDefault) {
        const next = await tx.address.findFirst({
          where: { userId },
          orderBy: { createdAt: "asc" },
        });

        if (next) {
          await tx.address.update({
            where: { id: next.id },
            data: { isDefault: true },
          });
        }
      }
    });
  }

  async setDefault(userId: string, addressId: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.address.findUnique({ where: { id: addressId } });

      if (!existing) {
        throw new NotFoundException("Address not found.");
      }

      if (existing.userId !== userId) {
        throw new ForbiddenException("Access denied.");
      }

      await tx.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });

      const updated = await tx.address.update({
        where: { id: addressId },
        data: { isDefault: true },
      });

      return this.serializeAddress(updated);
    });
  }
}
