import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
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
import { UpdateReturnStatusDto } from "./dto/create-return.dto";
import { AdminReturnQueryDto } from "./dto/return-query.dto";
import { ReturnsService } from "./returns.service";

@ApiTags("admin-returns")
@Roles(UserRole.ADMIN)
@Controller("admin/returns")
export class AdminReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Get()
  @ApiOperation({ summary: "List and search return/exchange requests (Admin)" })
  @ApiOkResponse({ description: "Return requests retrieved." })
  @ApiUnauthorizedResponse({ description: "Authentication required." })
  @ApiForbiddenResponse({ description: "Admin role required." })
  async getAdminReturns(@Query() query: AdminReturnQueryDto) {
    return this.returnsService.findAdminReturns(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get return request details by ID (Admin)" })
  @ApiOkResponse({ description: "Return request details retrieved." })
  @ApiUnauthorizedResponse({ description: "Authentication required." })
  @ApiForbiddenResponse({ description: "Admin role required." })
  @ApiNotFoundResponse({ description: "Request not found." })
  async getAdminReturnById(@Param("id") id: string) {
    return this.returnsService.findAdminReturnById(id);
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "Update return request status (Admin)" })
  @ApiOkResponse({ description: "Return request status updated." })
  @ApiBadRequestResponse({ description: "Invalid status transition or stock error." })
  @ApiUnauthorizedResponse({ description: "Authentication required." })
  @ApiForbiddenResponse({ description: "Admin role required." })
  async updateReturnStatus(
    @CurrentUser() user: { id: string },
    @Param("id") id: string,
    @Body() dto: UpdateReturnStatusDto,
  ) {
    return this.returnsService.updateReturnStatusByAdmin(user.id, id, dto);
  }
}
