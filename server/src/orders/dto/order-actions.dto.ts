import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { IsBoolean, IsEnum, IsOptional, IsString, MinLength } from "class-validator";

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  status!: OrderStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string;
}

export class CancelOrderDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reason?: string;
}

export class UpdatePaymentStatusDto {
  @ApiProperty({ enum: PaymentStatus })
  @IsEnum(PaymentStatus)
  status!: PaymentStatus;
}

export class TrackOrderDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  orderNumber!: string;

  @ApiProperty({ description: "Matching customer email or phone number" })
  @IsString()
  @MinLength(1)
  verificationInput!: string;
}

export class MockPaymentDto {
  @ApiProperty({ description: "Simulate successful or failed online payment outcome" })
  @IsBoolean()
  success!: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  failureReason?: string;
}
