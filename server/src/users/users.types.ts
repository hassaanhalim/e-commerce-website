import type { Prisma, UserRole } from "@prisma/client";

export type SafeUserProfile = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  phone: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export const safeUserSelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  phone: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export const authUserSelect = {
  id: true,
  fullName: true,
  email: true,
  passwordHash: true,
  role: true,
  phone: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type AuthUserRecord = Prisma.UserGetPayload<{
  select: typeof authUserSelect;
}>;

export const refreshSessionSelect = {
  id: true,
  userId: true,
  tokenHash: true,
  expiresAt: true,
  revokedAt: true,
  createdAt: true,
  lastUsedAt: true,
} satisfies Prisma.RefreshSessionSelect;

export type RefreshSessionRecord = Prisma.RefreshSessionGetPayload<{
  select: typeof refreshSessionSelect;
}>;

export type SafeAuthenticatedUser = SafeUserProfile;
