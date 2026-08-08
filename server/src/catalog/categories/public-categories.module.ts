import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { PublicCategoriesController } from "./public-categories.controller";
import { PublicCategoriesService } from "./public-categories.service";

@Module({
  imports: [PrismaModule],
  controllers: [PublicCategoriesController],
  providers: [PublicCategoriesService],
  exports: [PublicCategoriesService],
})
export class PublicCategoriesModule {}
