import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
} from "@nestjs/common";
import {
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { ModerateReviewDto } from "./dto/create-review.dto";
import { AdminReviewQueryDto } from "./dto/review-query.dto";
import { ReviewsService } from "./reviews.service";

@ApiTags("admin-reviews")
@Roles(UserRole.ADMIN)
@Controller("admin/reviews")
export class AdminReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @ApiOperation({ summary: "List reviews for moderation (Admin)" })
  @ApiOkResponse({ description: "Reviews retrieved." })
  @ApiUnauthorizedResponse({ description: "Authentication required." })
  @ApiForbiddenResponse({ description: "Admin role required." })
  async getAdminReviews(@Query() query: AdminReviewQueryDto) {
    return this.reviewsService.findAdminReviews(query);
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "Moderate review status: APPROVE or REJECT (Admin)" })
  @ApiOkResponse({ description: "Review status updated." })
  @ApiUnauthorizedResponse({ description: "Authentication required." })
  @ApiForbiddenResponse({ description: "Admin role required." })
  @ApiNotFoundResponse({ description: "Review not found." })
  async moderateReview(
    @CurrentUser() user: { id: string },
    @Param("id") id: string,
    @Body() dto: ModerateReviewDto,
  ) {
    return this.reviewsService.moderateReview(user.id, id, dto);
  }
}
