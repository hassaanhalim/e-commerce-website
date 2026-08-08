import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { ReviewsController } from "./reviews.controller";
import { PublicReviewsController } from "./public-reviews.controller";
import { AdminReviewsController } from "./admin-reviews.controller";
import { ReviewsService } from "./reviews.service";

@Module({
  imports: [PrismaModule],
  controllers: [ReviewsController, PublicReviewsController, AdminReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
