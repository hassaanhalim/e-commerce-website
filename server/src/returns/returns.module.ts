import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { InventoryModule } from "../admin/inventory/inventory.module";
import { ReturnsController } from "./returns.controller";
import { AdminReturnsController } from "./admin-returns.controller";
import { ReturnsService } from "./returns.service";

@Module({
  imports: [PrismaModule, InventoryModule],
  controllers: [ReturnsController, AdminReturnsController],
  providers: [ReturnsService],
  exports: [ReturnsService],
})
export class ReturnsModule {}
