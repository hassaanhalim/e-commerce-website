import { Global, Module } from "@nestjs/common";
import { AuditService } from "./audit.service";
import { AdminAuditController } from "./admin-audit.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { UsersModule } from "../users/users.module";

@Global()
@Module({
  imports: [PrismaModule, AuthModule, UsersModule],
  controllers: [AdminAuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
