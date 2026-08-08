import { SetMetadata } from "@nestjs/common";
import type { UserRole } from "@prisma/client";
import { ROLES_KEY } from "../auth.metadata";

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);