import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

function toBoolean(value: unknown) {
  if (value === "true" || value === true) return true;
  if (value === "false" || value === false) return false;
  return undefined;
}

export class InventoryQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ description: "Search by product name, code, SKU, size, or color" })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: "Filter by product ID" })
  @IsString()
  @IsOptional()
  productId?: string;

  @ApiPropertyOptional({ description: "Filter by SKU" })
  @IsString()
  @IsOptional()
  sku?: string;

  @ApiPropertyOptional({ description: "Only low-stock variants" })
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  @IsOptional()
  lowStock?: boolean;

  @ApiPropertyOptional({ description: "Only out-of-stock variants" })
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  @IsOptional()
  outOfStock?: boolean;
}