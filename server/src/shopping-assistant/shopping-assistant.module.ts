import { Module } from "@nestjs/common";
import { ShoppingAssistantController } from "./shopping-assistant.controller";
import { ShoppingAssistantService } from "./shopping-assistant.service";
import { ShoppingAssistantToolsService } from "./tools/shopping-assistant-tools.service";
import { GroqLlmService } from "./llm/groq-llm.service";

@Module({
  controllers: [ShoppingAssistantController],
  providers: [
    ShoppingAssistantService,
    ShoppingAssistantToolsService,
    GroqLlmService,
  ],
  exports: [ShoppingAssistantService],
})
export class ShoppingAssistantModule {}
