import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { PublicProductsController } from "./public-products.controller";
import { PublicProductsService } from "./public-products.service";

@Module({
  imports: [PrismaModule],
  controllers: [PublicProductsController],
  providers: [PublicProductsService],
  exports: [PublicProductsService],
})
export class PublicProductsModule {}
