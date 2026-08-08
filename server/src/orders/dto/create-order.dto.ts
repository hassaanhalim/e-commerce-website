import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PaymentMethod } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

export class CreateOrderDto {
  @ApiProperty()
  @IsString()
  checkoutSessionId!: string;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  customerNotes?: string;
}
