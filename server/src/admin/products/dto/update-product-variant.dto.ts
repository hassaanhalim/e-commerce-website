import { ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Min } from "class-validator";
import { CreateProductVariantDto } from "./create-product-variant.dto";

export class UpdateProductVariantDto extends PartialType(CreateProductVariantDto) {
  @ApiPropertyOptional({ description: "ID of existing variant record to update", example: "clx123..." })
  @IsString()
  @IsOptional()
  id?: string;

  @ApiPropertyOptional({ description: "Initial stock quantity for new variants (input-only)", example: 10, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  initialStock?: number;

  @ApiPropertyOptional({ description: "Low stock threshold for new variants (input-only)", example: 5, default: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;
}
