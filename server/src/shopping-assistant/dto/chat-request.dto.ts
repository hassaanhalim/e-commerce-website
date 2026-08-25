import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import type {
  PendingQuestion,
  ShoppingPreferences,
} from "../types/shopping-assistant.types";

export class HistoryMessageDto {
  @ApiProperty({ enum: ["user", "assistant"] })
  @IsIn(["user", "assistant"])
  role!: "user" | "assistant";

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  content!: string;
}

export class ChatRequestDto {
  @ApiPropertyOptional({
    description: "Optional conversation ID for authenticated users to continue an existing chat.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  conversationId?: string;

  @ApiProperty({
    example: "I need running shoes under 15000",
    description: "The customer message to process.",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  message!: string;

  @ApiPropertyOptional({
    type: [HistoryMessageDto],
    description: "Recent message history for conversational context.",
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HistoryMessageDto)
  messages?: HistoryMessageDto[];

  @ApiPropertyOptional({
    description: "Current authoritative client preferences to merge against.",
  })
  @IsOptional()
  preferences?: ShoppingPreferences;

  @ApiPropertyOptional({
    description: "The question that was pending customer response in the previous turn.",
  })
  @IsOptional()
  pendingQuestion?: PendingQuestion | null;
}
