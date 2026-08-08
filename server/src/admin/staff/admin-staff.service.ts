import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthService } from "../../auth/auth.service";
import { AuditService } from "../../audit/audit.service";
import { UserRole, Prisma } from "@prisma/client";

export interface CreateStaffDto {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
}

export interface UpdateStaffDto {
  fullName?: string;
  phone?: string;
  role?: UserRole;
}

@Injectable()
export class AdminStaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(search?: string) {
    const where: Prisma.UserWhereInput = {
      role: UserRole.ADMIN,
    };

    if (search) {
      const q = search.trim();
      where.OR = [
        { fullName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
      ];
    }

    return this.prisma.user.findMany({
      where,
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
      },
    });
  }

  async findOne(id: string) {
    const staff = await this.prisma.user.findFirst({
      where: { id, role: UserRole.ADMIN },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!staff) {
      throw new NotFoundException(`Staff user with ID "${id}" not found.`);
    }

    return staff;
  }

  async create(dto: CreateStaffDto, actorUserId: string) {
    if (!dto.email || !dto.password || !dto.fullName) {
      throw new BadRequestException("Name, email, and password are required.");
    }

    if (dto.password.length < 8) {
      throw new BadRequestException("Staff password must be at least 8 characters long.");
    }

    const normalizedEmail = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      throw new ConflictException("A user with this email address already exists.");
    }

    const passwordHash = await this.authService.hashPassword(dto.password);

    const newStaff = await this.prisma.user.create({
      data: {
        fullName: dto.fullName.trim(),
        email: normalizedEmail,
        passwordHash,
        phone: dto.phone?.trim() || null,
        role: UserRole.ADMIN,
        isActive: true,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.auditService.logAction({
      actorUserId,
      action: "STAFF_CREATED",
      entityType: "USER",
      entityId: newStaff.id,
      description: `Created staff account "${newStaff.email}".`,
      metadata: { email: newStaff.email, fullName: newStaff.fullName },
    });

    return newStaff;
  }

  async update(id: string, dto: UpdateStaffDto, actorUserId: string) {
    const staff = await this.prisma.user.findUnique({ where: { id } });
    if (!staff) {
      throw new NotFoundException(`Staff user with ID "${id}" not found.`);
    }

    if (id === actorUserId && dto.role && dto.role !== UserRole.ADMIN) {
      throw new BadRequestException("You cannot change your own role from ADMIN.");
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        fullName: dto.fullName ? dto.fullName.trim() : undefined,
        phone: dto.phone !== undefined ? (dto.phone ? dto.phone.trim() : null) : undefined,
        role: dto.role || undefined,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.auditService.logAction({
      actorUserId,
      action: "STAFF_UPDATED",
      entityType: "USER",
      entityId: id,
      description: `Updated staff account details for "${staff.email}".`,
      metadata: dto,
    });

    return updated;
  }

  async updateStatus(id: string, isActive: boolean, actorUserId: string) {
    const staff = await this.prisma.user.findUnique({ where: { id } });
    if (!staff) {
      throw new NotFoundException(`Staff user with ID "${id}" not found.`);
    }

    // Protect final active admin
    if (!isActive && staff.role === UserRole.ADMIN) {
      const activeAdminCount = await this.prisma.user.count({
        where: { role: UserRole.ADMIN, isActive: true },
      });
      if (activeAdminCount <= 1) {
        throw new BadRequestException("Cannot deactivate the final active administrator account.");
      }
    }

    const updated = await this.prisma.user.update({
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

    if (!isActive) {
      await this.prisma.refreshSession.deleteMany({ where: { userId: id } });
    }

    await this.auditService.logAction({
      actorUserId,
      action: isActive ? "STAFF_ACTIVATED" : "STAFF_DEACTIVATED",
      entityType: "USER",
      entityId: id,
      description: `Staff account "${staff.email}" ${isActive ? "activated" : "deactivated"}.`,
      metadata: { email: staff.email },
    });

    return updated;
  }
}
