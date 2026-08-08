import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
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
import {
  CreateReviewDto,
  UpdateMyReviewDto,
} from "./dto/create-review.dto";
import { CustomerReviewQueryDto } from "./dto/review-query.dto";
import { ReviewsService } from "./reviews.service";

@ApiTags("reviews")
@Roles(UserRole.CUSTOMER)
@Controller("reviews")
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @ApiOperation({ summary: "Create a review for a delivered order item (Customer)" })
  @ApiCreatedResponse({ description: "Review created successfully (PENDING moderation)." })
  @ApiBadRequestResponse({ description: "Non-delivered order item or duplicate review." })
  @ApiUnauthorizedResponse({ description: "Authentication required." })
  async createReview(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.createReview(user.id, dto);
  }

  @Get("me")
  @ApiOperation({ summary: "List reviews written by current customer" })
  @ApiOkResponse({ description: "My reviews retrieved." })
  @ApiUnauthorizedResponse({ description: "Authentication required." })
  async getMyReviews(
    @CurrentUser() user: { id: string },
    @Query() query: CustomerReviewQueryDto,
  ) {
    return this.reviewsService.findMyReviews(user.id, query);
  }

  @Get("eligibility/:orderItemId")
  @ApiOperation({ summary: "Check if customer is eligible to review an order item" })
  @ApiOkResponse({ description: "Review eligibility result returned." })
  @ApiForbiddenResponse({ description: "Not owned by user." })
  @ApiNotFoundResponse({ description: "Order item not found." })
  async checkEligibility(
    @CurrentUser() user: { id: string },
    @Param("orderItemId") orderItemId: string,
  ) {
    return this.reviewsService.checkEligibility(user.id, orderItemId);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update my review (resets status to PENDING)" })
  @ApiOkResponse({ description: "Review updated successfully." })
  @ApiForbiddenResponse({ description: "Cannot edit another user's review." })
  @ApiNotFoundResponse({ description: "Review not found." })
  async updateMyReview(
    @CurrentUser() user: { id: string },
    @Param("id") id: string,
    @Body() dto: UpdateMyReviewDto,
  ) {
    return this.reviewsService.updateMyReview(user.id, id, dto);
  }
}
