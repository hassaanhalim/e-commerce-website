import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";
import { TrackOrderDto } from "./dto/order-actions.dto";
import { OrdersService } from "./orders.service";

@ApiTags("order-tracking")
@Controller("order-tracking")
export class OrderTrackingController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: "Public order tracking with order number and matching email/phone verification" })
  @ApiOkResponse({ description: "Safe order tracking summary returned." })
  @ApiNotFoundResponse({ description: "Order tracking details not found or verification failed." })
  async trackOrder(@Body() dto: TrackOrderDto) {
    return this.ordersService.trackOrderPublic(dto);
  }
}
