import { Module } from "@nestjs/common";
import { ShoppingAssistantController } from "./shopping-assistant.controller";
import { ShoppingAssistantService } from "./shopping-assistant.service";

@Module({
  controllers: [ShoppingAssistantController],
  providers: [ShoppingAssistantService],
  exports: [ShoppingAssistantService],
})
export class ShoppingAssistantModule {}
