import { createHmac, randomBytes } from "crypto";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { MailService } from "../mail/mail.service";
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

export type RegisterResult = {
  message: string;
  email: string;
  requiresVerification: boolean;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly mailService: MailService,
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

  private hashVerificationToken(token: string): string {
    return createHmac("sha256", this.getRefreshTokenHashSecret())
      .update(token)
      .digest("hex");
  }

  private generateRefreshToken(): string {
    return randomBytes(64).toString("base64url");
  }

  private generateVerificationToken(): string {
    return randomBytes(32).toString("hex");
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

    // Cleanup expired email verification tokens
    await this.prisma.emailVerificationToken.deleteMany({
      where: {
        expiresAt: { lt: now },
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
      expiresIn: this.getAccessTokenTtlSeconds(),
    });
  }

  private async createSessionAndTokens(
    user: SafeUserProfile,
  ): Promise<AuthSessionResult> {
    const rawRefreshToken = this.generateRefreshToken();
    const refreshTokenHash = this.hashRefreshToken(rawRefreshToken);
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
      refreshToken: rawRefreshToken,
      refreshSessionId: session.id,
      accessTokenExpiresInSeconds: this.getAccessTokenTtlSeconds(),
      refreshTokenExpiresAt,
    };
  }

  async hashPassword(password: string): Promise<string> {
    const argon2 = await import("argon2");
    return argon2.default.hash(password);
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
  ): Promise<RegisterResult> {
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

    // Generate secure verification token
    const token = this.generateVerificationToken();
    const tokenHash = this.hashVerificationToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes

    await this.usersService.createVerificationToken(user.id, tokenHash, expiresAt);

    // Send verification email safely (does not fail account creation if SMTP has issues)
    await this.mailService.sendVerificationEmail(user.email, user.fullName, token);

    return {
      message: "Registration successful. We sent a verification link to your email.",
      email: user.email,
      requiresVerification: true,
    };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    if (!token || typeof token !== "string") {
      throw new BadRequestException("Verification token is required.");
    }

    const tokenHash = this.hashVerificationToken(token.trim());
    const verificationRecord = await this.usersService.findVerificationToken(tokenHash);

    if (!verificationRecord) {
      throw new BadRequestException("Verification link is invalid or has expired.");
    }

    if (verificationRecord.expiresAt.getTime() <= Date.now()) {
      await this.usersService.deleteVerificationTokensForUser(verificationRecord.userId);
      throw new BadRequestException("Verification link has expired. Please request a new one.");
    }

    // Mark user verified and remove tokens
    await this.usersService.markEmailVerified(verificationRecord.userId);
    await this.usersService.deleteVerificationTokensForUser(verificationRecord.userId);

    // Send welcome email
    if (verificationRecord.user) {
      await this.mailService.sendWelcomeEmail(
        verificationRecord.user.email,
        verificationRecord.user.fullName,
      );
    }

    return {
      message: "Your email has been verified successfully. You can now sign in.",
    };
  }

  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    if (!email || typeof email !== "string") {
      throw new BadRequestException("Email is required.");
    }

    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.usersService.findByEmail(normalizedEmail);

    // Neutral response to avoid account enumeration
    if (!user) {
      return {
        message: "If an unverified account exists with this email, a verification link has been sent.",
      };
    }

    if (user.emailVerifiedAt) {
      return {
        message: "This email address is already verified. You can sign in.",
      };
    }

    const token = this.generateVerificationToken();
    const tokenHash = this.hashVerificationToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.usersService.createVerificationToken(user.id, tokenHash, expiresAt);
    await this.mailService.sendVerificationEmail(user.email, user.fullName, token);

    return {
      message: "A new verification link has been sent to your email address.",
    };
  }

  async login(input: LoginInput): Promise<AuthSessionResult> {
    await this.cleanupStaleSessions();
    const normalizedEmail = this.normalizeEmail(input.email);
    const authUser = await this.usersService.findAuthUserByEmail(normalizedEmail);

    if (!authUser || !authUser.isActive) {
      throw new UnauthorizedException("Invalid email or password");
    }

    if (!authUser.passwordHash) {
      throw new UnauthorizedException(
        "This account is registered with Google. Please click 'Continue with Google' to sign in.",
      );
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

    // Check email verification status for customers
    if (authUser.role === "CUSTOMER" && !authUser.emailVerifiedAt) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: "EMAIL_NOT_VERIFIED",
        message: "Please verify your email before signing in.",
        email: authUser.email,
      });
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

  async authenticateWithGoogle(credential: string): Promise<AuthSessionResult> {
    if (!credential || typeof credential !== "string") {
      throw new BadRequestException("Google credential token is required.");
    }

    const googleClientId = this.configService.get<string>("GOOGLE_CLIENT_ID")?.trim();
    if (!googleClientId) {
      throw new BadRequestException(
        "Google authentication is not configured on this server.",
      );
    }

    const { OAuth2Client } = await import("google-auth-library");
    const client = new OAuth2Client(googleClientId);

    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken: credential,
        audience: googleClientId,
      });
    } catch {
      throw new UnauthorizedException("This Google account could not be verified.");
    }

    const payload = ticket.getPayload();
    if (!payload || !payload.sub || !payload.email) {
      throw new UnauthorizedException("Invalid Google identity token payload.");
    }

    if (!payload.email_verified) {
      throw new UnauthorizedException("Your Google email address is not verified by Google.");
    }

    const googleSub = payload.sub;
    const googleEmail = this.normalizeEmail(payload.email);
    const googleName = payload.name?.trim() || "Shoe Store Customer";

    // 1. Check if identity already exists
    const existingIdentity = await this.usersService.findIdentityByProvider(
      "GOOGLE",
      googleSub,
    );

    if (existingIdentity && existingIdentity.user) {
      const user = existingIdentity.user;
      if (!user.isActive) {
        throw new UnauthorizedException("Your account is disabled.");
      }

      if (!user.emailVerifiedAt) {
        await this.usersService.markEmailVerified(user.id);
      }

      return this.createSessionAndTokens(user);
    }

    // 2. Identity not found. Check if an existing User exists with the same email (Safe Linking)
    const existingUser = await this.usersService.findByEmail(googleEmail);
    if (existingUser) {
      if (!existingUser.isActive) {
        throw new UnauthorizedException("Your account is disabled.");
      }

      // Link Google identity to existing user and ensure emailVerifiedAt is set
      const linkedUser = await this.usersService.linkGoogleIdentity(
        existingUser.id,
        googleSub,
      );

      await this.auditService.logAction({
        actorUserId: linkedUser.id,
        action: "GOOGLE_ACCOUNT_LINKED",
        entityType: "USER",
        entityId: linkedUser.id,
        description: `Linked Google identity (${googleSub}) to account "${googleEmail}".`,
      });

      return this.createSessionAndTokens(linkedUser);
    }

    // 3. Brand new user registering with Google
    const newUser = await this.usersService.createGoogleCustomerAccount({
      fullName: googleName,
      email: googleEmail,
      googleSub,
    });

    await this.auditService.logAction({
      actorUserId: newUser.id,
      action: "CUSTOMER_REGISTER_GOOGLE",
      entityType: "USER",
      entityId: newUser.id,
      description: `New customer registered via Google identity: "${googleEmail}".`,
    });

    // Send welcome email once for first-time Google registrations
    await this.mailService.sendWelcomeEmail(newUser.email, newUser.fullName);

    return this.createSessionAndTokens(newUser);
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