import { Body, Controller, Get, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ShoppingAssistantService } from "./shopping-assistant.service";
import { ChatRequestDto } from "./dto/chat-request.dto";
import { Public } from "../auth/decorators/public.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { Roles } from "../auth/decorators/roles.decorator";

@Controller("shopping-assistant")
export class ShoppingAssistantController {
  constructor(private readonly shoppingAssistantService: ShoppingAssistantService) {}

  @Public()
  @Post("chat")
  @HttpCode(HttpStatus.OK)
  async chat(
    @Body() dto: ChatRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.shoppingAssistantService.processChat(
      dto.message,
      dto.messages,
      user?.id,
      dto.conversationId,
    );
  }

  @Roles("CUSTOMER", "ADMIN")
  @Get("history/latest")
  async getLatestHistory(@CurrentUser() user: AuthenticatedUser) {
    return this.shoppingAssistantService.getLatestHistory(user.id);
  }
}
