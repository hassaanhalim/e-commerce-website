import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from "@nestjs/common";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CheckoutService } from "./checkout.service";
import { CheckoutPreviewDto, CreateCheckoutSessionDto } from "./dto/checkout.dto";

@Controller("checkout")
@Roles("CUSTOMER")
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) { }

  @Post("preview")
  preview(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CheckoutPreviewDto,
  ) {
    return this.checkoutService.previewCheckout(user.id, dto);
  }

  @Post("sessions")
  @HttpCode(HttpStatus.CREATED)
  createSession(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCheckoutSessionDto,
  ) {
    return this.checkoutService.createSession(user.id, dto);
  }

  @Get("sessions/:id")
  getSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.checkoutService.getSession(user.id, id);
  }

  @Post("sessions/:id/cancel")
  @HttpCode(HttpStatus.OK)
  cancelSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.checkoutService.cancelSession(user.id, id);
  }
}
