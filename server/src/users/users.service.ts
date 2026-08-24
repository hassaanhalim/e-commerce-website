import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type {
  AuthUserRecord,
  RefreshSessionRecord,
  SafeUserProfile,
} from "./users.types";
import {
  authUserSelect,
  refreshSessionSelect,
  safeUserSelect,
} from "./users.types";

type CreateCustomerInput = {
  fullName: string;
  email: string;
  passwordHash: string;
  phone?: string | null;
};

type UpdateProfileInput = {
  fullName?: string;
  phone?: string | null;
};

type CreateRefreshSessionInput = {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private toSafeUser(user: {
    id: string;
    fullName: string;
    email: string;
    role: AuthUserRecord["role"];
    phone: string | null;
    isActive: boolean;
    emailVerifiedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): SafeUserProfile {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      phone: user.phone,
      isActive: user.isActive,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async findById(userId: string): Promise<SafeUserProfile | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: safeUserSelect,
    });

    return user ? this.toSafeUser(user) : null;
  }

  async findByEmail(email: string): Promise<SafeUserProfile | null> {
    const normalizedEmail = this.normalizeEmail(email);

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: safeUserSelect,
    });

    return user ? this.toSafeUser(user) : null;
  }

  async findAuthUserByEmail(email: string): Promise<AuthUserRecord | null> {
    const normalizedEmail = this.normalizeEmail(email);

    return this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: authUserSelect,
    });
  }

  async findIdentityByProvider(
    provider: "LOCAL" | "GOOGLE",
    providerAccountId: string,
  ) {
    return this.prisma.userIdentity.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId,
        },
      },
      include: {
        user: {
          select: safeUserSelect,
        },
      },
    });
  }

  async createGoogleCustomerAccount(input: {
    fullName: string;
    email: string;
    googleSub: string;
  }): Promise<SafeUserProfile> {
    const normalizedEmail = this.normalizeEmail(input.email);

    const user = await this.prisma.user.create({
      data: {
        fullName: input.fullName.trim() || "Shoe Store Customer",
        email: normalizedEmail,
        passwordHash: null,
        role: "CUSTOMER",
        emailVerifiedAt: new Date(),
        identities: {
          create: {
            provider: "GOOGLE",
            providerAccountId: input.googleSub,
          },
        },
      },
      select: safeUserSelect,
    });

    return this.toSafeUser(user);
  }

  async linkGoogleIdentity(
    userId: string,
    googleSub: string,
  ): Promise<SafeUserProfile> {
    await this.prisma.userIdentity.create({
      data: {
        userId,
        provider: "GOOGLE",
        providerAccountId: googleSub,
      },
    });

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerifiedAt: new Date(),
      },
      select: safeUserSelect,
    });

    return this.toSafeUser(user);
  }

  async markEmailVerified(userId: string): Promise<SafeUserProfile> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerifiedAt: new Date(),
      },
      select: safeUserSelect,
    });

    return this.toSafeUser(user);
  }

  async createVerificationToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ) {
    // Invalidate existing tokens for this user first
    await this.prisma.emailVerificationToken.deleteMany({
      where: { userId },
    });

    return this.prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });
  }

  async findVerificationToken(tokenHash: string) {
    return this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: safeUserSelect,
        },
      },
    });
  }

  async deleteVerificationTokensForUser(userId: string) {
    return this.prisma.emailVerificationToken.deleteMany({
      where: { userId },
    });
  }

  async findRefreshSessionByTokenHash(
    tokenHash: string,
  ): Promise<RefreshSessionRecord | null> {
    return this.prisma.refreshSession.findUnique({
      where: { tokenHash },
      select: refreshSessionSelect,
    });
  }

  async findRefreshSessionById(
    sessionId: string,
  ): Promise<RefreshSessionRecord | null> {
    return this.prisma.refreshSession.findUnique({
      where: { id: sessionId },
      select: refreshSessionSelect,
    });
  }

  async createRefreshSession(
    input: CreateRefreshSessionInput,
  ): Promise<RefreshSessionRecord> {
    return this.prisma.refreshSession.create({
      data: {
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        lastUsedAt: new Date(),
      },
      select: refreshSessionSelect,
    });
  }

  async revokeRefreshSession(
    sessionId: string,
    revokedAt: Date,
  ): Promise<RefreshSessionRecord | null> {
    const session = await this.prisma.refreshSession.update({
      where: { id: sessionId },
      data: { revokedAt, lastUsedAt: revokedAt },
      select: refreshSessionSelect,
    }).catch((error: unknown) => {
      if (this.isRecordNotFoundError(error)) {
        return null;
      }

      throw error;
    });

    return session;
  }

  async revokeAllRefreshSessionsForUser(
    userId: string,
    revokedAt: Date,
  ): Promise<number> {
    const result = await this.prisma.refreshSession.updateMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: {
          gt: revokedAt,
        },
      },
      data: {
        revokedAt,
        lastUsedAt: revokedAt,
      },
    });

    return result.count;
  }

  async updateRefreshSessionLastUsedAt(
    sessionId: string,
    lastUsedAt: Date,
  ): Promise<RefreshSessionRecord | null> {
    const session = await this.prisma.refreshSession.update({
      where: { id: sessionId },
      data: { lastUsedAt },
      select: refreshSessionSelect,
    }).catch((error: unknown) => {
      if (this.isRecordNotFoundError(error)) {
        return null;
      }

      throw error;
    });

    return session;
  }

  async createCustomerAccount(
    input: CreateCustomerInput,
  ): Promise<SafeUserProfile> {
    const user = await this.prisma.user.create({
      data: {
        fullName: input.fullName.trim(),
        email: this.normalizeEmail(input.email),
        passwordHash: input.passwordHash,
        role: "CUSTOMER",
        phone: input.phone?.trim() || null,
        emailVerifiedAt: null,
      },
      select: safeUserSelect,
    });

    return this.toSafeUser(user);
  }

  async updateProfile(
    userId: string,
    input: UpdateProfileInput,
  ): Promise<SafeUserProfile | null> {
    const nextPhone =
      input.phone == null
        ? undefined
        : input.phone.trim() || null;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: input.fullName?.trim(),
        phone: nextPhone,
      },
      select: safeUserSelect,
    }).catch((error: unknown) => {
      if (this.isRecordNotFoundError(error)) {
        return null;
      }

      throw error;
    });

    return user ? this.toSafeUser(user) : null;
  }

  private isRecordNotFoundError(error: unknown): boolean {
    return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2025";
  }
}