import {
  Body,
  Controller,
  Get,
  Param,
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
import { CreateReturnRequestDto } from "./dto/create-return.dto";
import { CustomerReturnQueryDto } from "./dto/return-query.dto";
import { ReturnsService } from "./returns.service";

@ApiTags("returns")
@Roles(UserRole.CUSTOMER)
@Controller("returns")
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Post()
  @ApiOperation({ summary: "Create a return or exchange request (Customer)" })
  @ApiCreatedResponse({ description: "Return request created successfully." })
  @ApiBadRequestResponse({ description: "Ineligible order item, quantity exceeded, or stock missing." })
  @ApiUnauthorizedResponse({ description: "Authentication required." })
  async createReturnRequest(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateReturnRequestDto,
  ) {
    return this.returnsService.createReturnRequest(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: "List return and exchange requests for the authenticated customer" })
  @ApiOkResponse({ description: "Customer return requests retrieved." })
  @ApiUnauthorizedResponse({ description: "Authentication required." })
  async getMyReturnRequests(
    @CurrentUser() user: { id: string },
    @Query() query: CustomerReturnQueryDto,
  ) {
    return this.returnsService.findCustomerReturns(user.id, query);
  }

  @Get("eligibility/:orderItemId")
  @ApiOperation({ summary: "Check return / exchange eligibility and remaining quantity for an order item" })
  @ApiOkResponse({ description: "Return eligibility details returned." })
  @ApiForbiddenResponse({ description: "Not owned by user." })
  @ApiNotFoundResponse({ description: "Order item not found." })
  async getEligibility(
    @CurrentUser() user: { id: string },
    @Param("orderItemId") orderItemId: string,
  ) {
    return this.returnsService.getEligibility(user.id, orderItemId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get return request details by ID (Customer)" })
  @ApiOkResponse({ description: "Return request retrieved." })
  @ApiForbiddenResponse({ description: "Cannot access another user's request." })
  @ApiNotFoundResponse({ description: "Request not found." })
  async getMyReturnById(
    @CurrentUser() user: { id: string },
    @Param("id") id: string,
  ) {
    return this.returnsService.findCustomerReturnById(user.id, id);
  }

  @Post(":id/cancel")
  @ApiOperation({ summary: "Cancel return request (Customer - REQUESTED status only)" })
  @ApiOkResponse({ description: "Return request cancelled successfully." })
  @ApiBadRequestResponse({ description: "Request is not in REQUESTED status." })
  @ApiUnauthorizedResponse({ description: "Authentication required." })
  async cancelReturn(
    @CurrentUser() user: { id: string },
    @Param("id") id: string,
  ) {
    return this.returnsService.cancelCustomerReturn(user.id, id);
  }
}
