import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { PublicBrandsController } from "./public-brands.controller";
import { PublicBrandsService } from "./public-brands.service";

@Module({
  imports: [PrismaModule],
  controllers: [PublicBrandsController],
  providers: [PublicBrandsService],
  exports: [PublicBrandsService],
})
export class PublicBrandsModule {}
