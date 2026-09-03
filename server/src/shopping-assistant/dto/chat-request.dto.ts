import { IsArray, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { Type } from "class-transformer";

export class MessageHistoryItemDto {
  @IsString()
  @IsNotEmpty()
  role!: "user" | "assistant";

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  content!: string;
}

export class ChatRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  message!: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsArray()
  @Type(() => MessageHistoryItemDto)
  messages?: MessageHistoryItemDto[];

  @IsOptional()
  preferences?: Record<string, any>;

  @IsOptional()
  pendingQuestion?: any;
}
