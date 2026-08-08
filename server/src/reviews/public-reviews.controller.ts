import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";
import { PublicReviewQueryDto } from "./dto/review-query.dto";
import { ReviewsService } from "./reviews.service";

@ApiTags("public-reviews")
@Controller("products")
export class PublicReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get(":productId/reviews")
  @Public()
  @ApiOperation({ summary: "Get approved reviews for a product (Public)" })
  @ApiOkResponse({ description: "Approved reviews retrieved." })
  async getProductReviews(
    @Param("productId") productId: string,
    @Query() query: PublicReviewQueryDto,
  ) {
    return this.reviewsService.findPublicProductReviews(productId, query);
  }

  @Get(":productId/rating-summary")
  @Public()
  @ApiOperation({ summary: "Get aggregated rating summary for a product (Public)" })
  @ApiOkResponse({ description: "Rating summary retrieved." })
  async getRatingSummary(@Param("productId") productId: string) {
    return this.reviewsService.getProductRatingSummary(productId);
  }
}
