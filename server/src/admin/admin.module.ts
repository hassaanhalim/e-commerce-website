import { Module } from "@nestjs/common";
import { AdminBrandsModule } from "./brands/admin-brands.module";
import { AdminCategoriesModule } from "./categories/admin-categories.module";
import { InventoryModule } from "./inventory/inventory.module";
import { AdminProductsModule } from "./products/admin-products.module";
import { AdminCustomersModule } from "./customers/admin-customers.module";
import { AdminStaffModule } from "./staff/admin-staff.module";
import { AdminDashboardModule } from "./dashboard/admin-dashboard.module";
import { AdminReportsModule } from "./reports/admin-reports.module";

@Module({
  imports: [
    AdminCategoriesModule,
    AdminBrandsModule,
    AdminProductsModule,
    InventoryModule,
    AdminCustomersModule,
    AdminStaffModule,
    AdminDashboardModule,
    AdminReportsModule,
  ],
  exports: [
    AdminCategoriesModule,
    AdminBrandsModule,
    AdminProductsModule,
    InventoryModule,
    AdminCustomersModule,
    AdminStaffModule,
    AdminDashboardModule,
    AdminReportsModule,
  ],
})
export class AdminModule {}

