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
import { AdminOrderQueryDto } from "./dto/order-query.dto";
import {
  UpdateOrderStatusDto,
  UpdatePaymentStatusDto,
} from "./dto/order-actions.dto";
import { OrdersService } from "./orders.service";

@ApiTags("admin-orders")
@Roles(UserRole.ADMIN)
@Controller("admin/orders")
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: "List and search orders (Admin)" })
  @ApiOkResponse({ description: "Orders retrieved successfully." })
  @ApiUnauthorizedResponse({ description: "Authentication required." })
  @ApiForbiddenResponse({ description: "Admin role required." })
  async getAdminOrders(@Query() query: AdminOrderQueryDto) {
    return this.ordersService.findAdminOrders(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get order details by ID (Admin)" })
  @ApiOkResponse({ description: "Order retrieved successfully." })
  @ApiUnauthorizedResponse({ description: "Authentication required." })
  @ApiForbiddenResponse({ description: "Admin role required." })
  @ApiNotFoundResponse({ description: "Order not found." })
  async getAdminOrderById(@Param("id") id: string) {
    return this.ordersService.findAdminOrderById(id);
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "Update order status (Admin)" })
  @ApiOkResponse({ description: "Order status updated successfully." })
  @ApiBadRequestResponse({ description: "Invalid status transition." })
  @ApiUnauthorizedResponse({ description: "Authentication required." })
  @ApiForbiddenResponse({ description: "Admin role required." })
  async updateOrderStatus(
    @CurrentUser() user: { id: string },
    @Param("id") id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatusByAdmin(user.id, id, dto);
  }

  @Patch(":id/payment-status")
  @ApiOperation({ summary: "Update payment status (Admin)" })
  @ApiOkResponse({ description: "Payment status updated successfully." })
  @ApiUnauthorizedResponse({ description: "Authentication required." })
  @ApiForbiddenResponse({ description: "Admin role required." })
  async updatePaymentStatus(
    @Param("id") id: string,
    @Body() dto: UpdatePaymentStatusDto,
  ) {
    return this.ordersService.updatePaymentStatusByAdmin(id, dto);
  }
}
