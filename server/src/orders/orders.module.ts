import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { InventoryModule } from "../admin/inventory/inventory.module";
import { OrdersController } from "./orders.controller";
import { AdminOrdersController } from "./admin-orders.controller";
import { OrderTrackingController } from "./order-tracking.controller";
import { OrdersService } from "./orders.service";

@Module({
  imports: [PrismaModule, InventoryModule],
  controllers: [OrdersController, AdminOrdersController, OrderTrackingController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
