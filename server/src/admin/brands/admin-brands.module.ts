import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { AdminBrandsController } from "./admin-brands.controller";
import { AdminBrandsService } from "./admin-brands.service";

@Module({
  imports: [PrismaModule],
  controllers: [AdminBrandsController],
  providers: [AdminBrandsService],
  exports: [AdminBrandsService],
})
export class AdminBrandsModule {}
