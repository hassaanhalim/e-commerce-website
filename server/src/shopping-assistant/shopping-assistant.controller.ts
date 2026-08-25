import { Body, Controller, Get, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { ShoppingAssistantService } from "./shopping-assistant.service";
import { ChatRequestDto } from "./dto/chat-request.dto";
import {
  ShoppingAssistantChatResponse,
  ShoppingAssistantHistoryResponse,
} from "./types/shopping-assistant.types";

@ApiTags("shopping-assistant")
@Controller("shopping-assistant")
export class ShoppingAssistantController {
  constructor(private readonly shoppingAssistantService: ShoppingAssistantService) {}

  @Public()
  @Post("chat")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Interact with the AI shopping assistant (Public for guests and users)",
  })
  @ApiOkResponse({
    description: "Assistant conversational response, preferences, and optional recommendations.",
  })
  async chat(
    @Body() dto: ChatRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ShoppingAssistantChatResponse> {
    return this.shoppingAssistantService.handleChat(dto, user);
  }

  @Get("history/latest")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Fetch latest persisted chat history for the authenticated customer",
  })
  @ApiOkResponse({
    description: "Customer's latest chat conversation with live product catalog cards.",
  })
  async getLatestHistory(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ShoppingAssistantHistoryResponse> {
    return this.shoppingAssistantService.getLatestHistory(user);
  }
}
