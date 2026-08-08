import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Min } from "class-validator";

export class CreateProductVariantDto {
  @ApiProperty({ description: "Unique variant SKU", example: "SKU-0001-BLK-40" })
  @IsString()
  @IsNotEmpty()
  sku!: string;

  @ApiProperty({ description: "Shoe size (EU scale)", example: 40 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  size!: number;

  @ApiProperty({ description: "Color name", example: "Black" })
  @IsString()
  @IsNotEmpty()
  color!: string;

  @ApiPropertyOptional({ description: "Optional price override for this variant", example: 6700 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  price?: number;

  @ApiPropertyOptional({ description: "Active status flag", default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: "Initial stock quantity (input-only)", example: 10, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  initialStock?: number;

  @ApiPropertyOptional({ description: "Low stock threshold (input-only)", example: 5, default: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;
}
