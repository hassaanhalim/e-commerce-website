import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { InventoryAdjustmentType } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString } from "class-validator";

export class AdjustInventoryDto {
  @ApiProperty({ enum: InventoryAdjustmentType })
  @IsEnum(InventoryAdjustmentType)
  type!: InventoryAdjustmentType;

  @ApiPropertyOptional({ description: "Change in on-hand quantity", example: 10 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  onHandDelta?: number;

  @ApiPropertyOptional({ description: "Change in reserved quantity", example: 2 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  reservedDelta?: number;

  @ApiPropertyOptional({ description: "Reason for the adjustment" })
  @IsString()
  @IsOptional()
  reason?: string;
}