import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ReturnRequestType } from "@prisma/client";
import { IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";

export class CreateReturnRequestDto {
  @ApiProperty()
  @IsString()
  orderItemId!: string;

  @ApiProperty({ enum: ReturnRequestType })
  @IsEnum(ReturnRequestType)
  type!: ReturnRequestType;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  reason!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  customerNotes?: string;

  @ApiPropertyOptional({ description: "Required if type is EXCHANGE" })
  @IsString()
  @IsOptional()
  replacementVariantId?: string;
}

export class UpdateReturnStatusDto {
  @ApiProperty({
    enum: ["APPROVED", "REJECTED", "RECEIVED", "COMPLETED", "CANCELLED"],
  })
  @IsString()
  status!: "APPROVED" | "REJECTED" | "RECEIVED" | "COMPLETED" | "CANCELLED";

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  adminNotes?: string;
}
