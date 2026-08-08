import { createHmac, randomBytes } from "crypto";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";
import type { SafeUserProfile } from "../users/users.types";
import type { AuthSessionResult, JwtAccessTokenPayload } from "./auth.types";

import { AuditService } from "../audit/audit.service";

type RegisterCustomerInput = {
  fullName: string;
  email: string;
  password: string;
  phone?: string | null;
};

type LoginInput = {
  email: string;
  password: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private isProduction() {
    const cookieSecure = this.configService.get<boolean>("COOKIE_SECURE", false);
    return cookieSecure && this.configService.get<string>("NODE_ENV", "development") === "production";
  }

  private getAccessTokenSecret() {
    return this.configService.getOrThrow<string>("JWT_ACCESS_SECRET");
  }

  private getRefreshTokenHashSecret() {
    return this.configService.getOrThrow<string>("REFRESH_TOKEN_HASH_SECRET");
  }

  private getAccessTokenTtlSeconds() {
    return this.configService.get<number>("JWT_ACCESS_TTL_SECONDS", 900);
  }

  private getRefreshTokenTtlDays() {
    return this.configService.get<number>("REFRESH_TOKEN_TTL_DAYS", 30);
  }

  private hashRefreshToken(refreshToken: string): string {
    return createHmac("sha256", this.getRefreshTokenHashSecret())
      .update(refreshToken)
      .digest("hex");
  }

  private generateRefreshToken(): string {
    return randomBytes(64).toString("base64url");
  }

  private getRefreshTokenExpiresAt(): Date {
    return new Date(Date.now() + this.getRefreshTokenTtlDays() * 24 * 60 * 60 * 1000);
  }

  private async cleanupStaleSessions() {
    const now = new Date();
    const revokedCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    await this.prisma.refreshSession.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: now } },
          { revokedAt: { lt: revokedCutoff } },
        ],
      },
    });
  }

  private buildAccessTokenPayload(
    user: SafeUserProfile,
    sessionId: string,
  ): JwtAccessTokenPayload {
    return { sub: user.id, role: user.role, sid: sessionId };
  }

  private async signAccessToken(
    payload: JwtAccessTokenPayload,
  ): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.getAccessTokenSecret(),
      expiresIn: `${this.getAccessTokenTtlSeconds()}s`,
    });
  }

  private async createSessionAndTokens(
    user: SafeUserProfile,
  ): Promise<AuthSessionResult> {
    const refreshToken = this.generateRefreshToken();
    const refreshTokenHash = this.hashRefreshToken(refreshToken);
    const refreshTokenExpiresAt = this.getRefreshTokenExpiresAt();

    const session = await this.usersService.createRefreshSession({
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt: refreshTokenExpiresAt,
    });

    const accessToken = await this.signAccessToken(
      this.buildAccessTokenPayload(user, session.id),
    );

    return {
      user,
      accessToken,
      refreshToken,
      refreshSessionId: session.id,
      accessTokenExpiresInSeconds: this.getAccessTokenTtlSeconds(),
      refreshTokenExpiresAt,
    };
  }

  async hashPassword(password: string): Promise<string> {
    const argon2 = await import("argon2");
    return argon2.default.hash(password, {
      type: argon2.default.argon2id,
    });
  }

  async verifyPassword(
    password: string,
    passwordHash: string,
  ): Promise<boolean> {
    const argon2 = await import("argon2");
    return argon2.default.verify(passwordHash, password);
  }

  async registerCustomer(
    input: RegisterCustomerInput,
  ): Promise<AuthSessionResult> {
    await this.cleanupStaleSessions();
    const normalizedEmail = this.normalizeEmail(input.email);

    const existingUser = await this.usersService.findAuthUserByEmail(normalizedEmail);
    if (existingUser) {
      throw new ConflictException("An account with this email already exists.");
    }

    if (input.password.length < 8 || input.password.length > 128) {
      throw new BadRequestException("Password must be between 8 and 128 characters.");
    }

    const passwordHash = await this.hashPassword(input.password);

    const user = await this.usersService.createCustomerAccount({
      fullName: input.fullName,
      email: normalizedEmail,
      passwordHash,
      phone: input.phone,
    });

    return this.createSessionAndTokens(user);
  }

  async login(input: LoginInput): Promise<AuthSessionResult> {
    await this.cleanupStaleSessions();
    const normalizedEmail = this.normalizeEmail(input.email);
    const authUser = await this.usersService.findAuthUserByEmail(normalizedEmail);

    if (!authUser || !authUser.isActive) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const isPasswordValid = await this.verifyPassword(
      input.password,
      authUser.passwordHash,
    );

    if (!isPasswordValid) {
      if (authUser.role === "ADMIN") {
        await this.auditService.logAction({
          actorUserId: authUser.id,
          action: "ADMIN_LOGIN_FAILURE",
          entityType: "USER",
          entityId: authUser.id,
          description: `Failed admin login attempt for "${authUser.email}".`,
        });
      }
      throw new UnauthorizedException("Invalid email or password");
    }

    const user = await this.usersService.findById(authUser.id);

    if (!user || !user.isActive) {
      throw new UnauthorizedException("Invalid email or password");
    }

    if (user.role === "ADMIN") {
      await this.auditService.logAction({
        actorUserId: user.id,
        action: "ADMIN_LOGIN_SUCCESS",
        entityType: "USER",
        entityId: user.id,
        description: `Admin "${user.email}" logged in successfully.`,
      });
    }

    return this.createSessionAndTokens(user);
  }

  async refresh(refreshToken: string | undefined): Promise<AuthSessionResult> {
    await this.cleanupStaleSessions();
    if (!refreshToken) {
      throw new UnauthorizedException("Invalid or expired refresh session");
    }

    const refreshTokenHash = this.hashRefreshToken(refreshToken);
    const currentSession = await this.usersService.findRefreshSessionByTokenHash(refreshTokenHash);

    if (!currentSession || currentSession.revokedAt || currentSession.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException("Invalid or expired refresh session");
    }

    const user = await this.usersService.findById(currentSession.userId);

    if (!user || !user.isActive) {
      throw new UnauthorizedException("Invalid or expired refresh session");
    }

    const now = new Date();
    const rotatedToken = this.generateRefreshToken();
    const rotatedTokenHash = this.hashRefreshToken(rotatedToken);
    const rotatedExpiresAt = this.getRefreshTokenExpiresAt();

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.refreshSession.update({
        where: { id: currentSession.id },
        data: { revokedAt: now, lastUsedAt: now },
      });

      const newSession = await tx.refreshSession.create({
        data: {
          userId: user.id,
          tokenHash: rotatedTokenHash,
          expiresAt: rotatedExpiresAt,
          lastUsedAt: now,
        },
      });

      const accessToken = await this.signAccessToken(
        this.buildAccessTokenPayload(user, newSession.id),
      );

      return {
        user,
        accessToken,
        refreshToken: rotatedToken,
        refreshSessionId: newSession.id,
        accessTokenExpiresInSeconds: this.getAccessTokenTtlSeconds(),
        refreshTokenExpiresAt: rotatedExpiresAt,
      } satisfies AuthSessionResult;
    });

    return result;
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    await this.cleanupStaleSessions();
    if (!refreshToken) {
      return;
    }

    const refreshTokenHash = this.hashRefreshToken(refreshToken);
    const session = await this.usersService.findRefreshSessionByTokenHash(refreshTokenHash);

    if (!session || session.revokedAt) {
      return;
    }

    await this.usersService.revokeRefreshSession(session.id, new Date());
  }

  async logoutAll(userId: string): Promise<number> {
    await this.cleanupStaleSessions();
    return this.usersService.revokeAllRefreshSessionsForUser(userId, new Date());
  }

  private getCookieSameSite(): "lax" | "strict" | "none" {
    const configured = this.configService.get<string>("COOKIE_SAMESITE", "lax").toLowerCase();
    if (configured === "strict" || configured === "none") {
      return configured;
    }
    return "lax";
  }

  getAccessCookieOptions() {
    const sameSite = this.getCookieSameSite();
    const isSecure = sameSite === "none" ? true : this.isProduction();
    return {
      httpOnly: true,
      sameSite,
      secure: isSecure,
      path: "/api/v1",
    };
  }

  getRefreshCookieOptions() {
    const sameSite = this.getCookieSameSite();
    const isSecure = sameSite === "none" ? true : this.isProduction();
    return {
      httpOnly: true,
      sameSite,
      secure: isSecure,
      path: "/api/v1/auth",
    };
  }

  getAccessCookieMaxAgeMs() {
    return this.getAccessTokenTtlSeconds() * 1000;
  }

  getRefreshCookieMaxAgeMs() {
    return this.getRefreshTokenTtlDays() * 24 * 60 * 60 * 1000;
  }
}