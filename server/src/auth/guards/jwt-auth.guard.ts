import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Reflector } from "@nestjs/core";
import { AUTH_ACCESS_COOKIE_NAME } from "../auth.constants";
import { IS_PUBLIC_KEY } from "../auth.metadata";
import type { AuthenticatedRequest, JwtAccessTokenPayload } from "../auth.types";
import { UsersService } from "../../users/users.service";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const requestPath = request.originalUrl ?? request.url ?? request.path ?? "";

    if (isPublic || requestPath.startsWith("/api/docs")) {
      return true;
    }

    const accessToken = request.cookies?.[AUTH_ACCESS_COOKIE_NAME];

    if (!accessToken) {
      throw new UnauthorizedException("Authentication required");
    }

    const payload = await this.verifyPayload(accessToken);

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException("Authentication required");
    }

    if (user.role !== payload.role) {
      throw new UnauthorizedException("Authentication required");
    }

    const session = await this.usersService.findRefreshSessionById(payload.sid);
    if (
      !session ||
      session.userId !== user.id ||
      session.revokedAt ||
      session.expiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException("Authentication required");
    }

    request.user = user;
    return true;
  }

  private async verifyPayload(token: string): Promise<JwtAccessTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<Partial<JwtAccessTokenPayload>>(token, {
        secret: this.configService.getOrThrow<string>("JWT_ACCESS_SECRET"),
      });

      if (
        !payload ||
        typeof payload.sub !== "string" ||
        typeof payload.sid !== "string" ||
        (payload.role !== "CUSTOMER" && payload.role !== "ADMIN")
      ) {
        throw new Error("Invalid access token payload");
      }

      return payload as JwtAccessTokenPayload;
    } catch {
      throw new UnauthorizedException("Authentication required");
    }
  }
}