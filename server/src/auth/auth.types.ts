import type { UserRole } from "@prisma/client";
import type { Request } from "express";
import type { SafeAuthenticatedUser, SafeUserProfile } from "../users/users.types";

export interface JwtAccessTokenPayload {
  sub: string;
  role: UserRole;
  sid: string;
}

export interface AuthSessionResult {
  user: SafeUserProfile;
  accessToken: string;
  refreshToken: string;
  refreshSessionId: string;
  accessTokenExpiresInSeconds: number;
  refreshTokenExpiresAt: Date;
}

export type AuthenticatedUser = SafeAuthenticatedUser;

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}