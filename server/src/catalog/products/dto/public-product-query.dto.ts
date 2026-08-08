import { ApiPropertyOptional } from "@nestjs/swagger";
import { ProductGender } from "@prisma/client";
import { Transform, Type } from "class-transformer";
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

export type PublicProductSortOption =
  | "newest"
  | "price-asc"
  | "price-desc"
  | "name-asc"
  | "name-desc";

export class PublicProductQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 50 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ description: "Search by product name, productCode, brand, or category" })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: "Filter by category slug" })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: "Filter by brand slug" })
  @IsString()
  @IsOptional()
  brand?: string;

  @ApiPropertyOptional({ enum: ProductGender })
  @IsEnum(ProductGender)
  @IsOptional()
  gender?: ProductGender;

  @ApiPropertyOptional()
  @Transform(({ value }) => {
    if (value === "true" || value === true) return true;
    if (value === "false" || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiPropertyOptional()
  @Transform(({ value }) => {
    if (value === "true" || value === true) return true;
    if (value === "false" || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  @IsOptional()
  isNew?: boolean;

  @ApiPropertyOptional({ description: "Minimum display price" })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  minPrice?: number;

  @ApiPropertyOptional({ description: "Maximum display price" })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxPrice?: number;

  @ApiPropertyOptional({
    enum: ["newest", "price-asc", "price-desc", "name-asc", "name-desc"],
    default: "newest",
  })
  @IsEnum(["newest", "price-asc", "price-desc", "name-asc", "name-desc"])
  @IsOptional()
  sort?: PublicProductSortOption = "newest";
}
