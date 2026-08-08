import { Module } from "@nestjs/common";
import { AdminStaffController } from "./admin-staff.controller";
import { AdminStaffService } from "./admin-staff.service";
import { PrismaModule } from "../../prisma/prisma.module";
import { AuthModule } from "../../auth/auth.module";
import { UsersModule } from "../../users/users.module";

@Module({
  imports: [PrismaModule, AuthModule, UsersModule],
  controllers: [AdminStaffController],
  providers: [AdminStaffService],
  exports: [AdminStaffService],
})
export class AdminStaffModule {}
