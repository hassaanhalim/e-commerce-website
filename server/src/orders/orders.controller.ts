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
import { CreateOrderDto } from "./dto/create-order.dto";
import { CustomerOrderQueryDto } from "./dto/order-query.dto";
import { CancelOrderDto, MockPaymentDto } from "./dto/order-actions.dto";
import { OrdersService } from "./orders.service";

@ApiTags("orders")
@Roles(UserRole.CUSTOMER)
@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: "Create an order from an active checkout session (Customer)" })
  @ApiCreatedResponse({ description: "Order created successfully." })
  @ApiBadRequestResponse({ description: "Invalid session, expired session, or inventory error." })
  @ApiUnauthorizedResponse({ description: "Authentication required." })
  async createOrder(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.createOrder(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: "List orders for the authenticated customer" })
  @ApiOkResponse({ description: "Customer orders retrieved successfully." })
  @ApiUnauthorizedResponse({ description: "Authentication required." })
  async getCustomerOrders(
    @CurrentUser() user: { id: string },
    @Query() query: CustomerOrderQueryDto,
  ) {
    return this.ordersService.findCustomerOrders(user.id, query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get order details by ID (Customer)" })
  @ApiOkResponse({ description: "Order retrieved successfully." })
  @ApiUnauthorizedResponse({ description: "Authentication required." })
  @ApiForbiddenResponse({ description: "Cannot access another user's order." })
  @ApiNotFoundResponse({ description: "Order not found." })
  async getCustomerOrderById(
    @CurrentUser() user: { id: string },
    @Param("id") id: string,
  ) {
    return this.ordersService.findCustomerOrderById(user.id, id);
  }

  @Post(":id/cancel")
  @ApiOperation({ summary: "Cancel order (Customer - eligible statuses only)" })
  @ApiOkResponse({ description: "Order cancelled successfully." })
  @ApiBadRequestResponse({ description: "Order status is not eligible for cancellation." })
  @ApiUnauthorizedResponse({ description: "Authentication required." })
  async cancelOrder(
    @CurrentUser() user: { id: string },
    @Param("id") id: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.ordersService.cancelCustomerOrder(user.id, id, dto);
  }

  @Post(":id/payments/mock")
  @ApiOperation({ summary: "Execute mock online payment (Development simulation)" })
  @ApiOkResponse({ description: "Mock payment executed." })
  @ApiBadRequestResponse({ description: "Invalid payment method or state." })
  @ApiUnauthorizedResponse({ description: "Authentication required." })
  async executeMockPayment(
    @CurrentUser() user: { id: string },
    @Param("id") id: string,
    @Body() dto: MockPaymentDto,
  ) {
    return this.ordersService.executeMockPayment(user.id, id, dto);
  }

  @Get(":id/payments")
  @ApiOperation({ summary: "Get order payments history (Customer)" })
  @ApiOkResponse({ description: "Payments retrieved." })
  async getOrderPayments(
    @CurrentUser() user: { id: string },
    @Param("id") id: string,
  ) {
    const order = await this.ordersService.findCustomerOrderById(user.id, id);
    return order.payments;
  }
}
