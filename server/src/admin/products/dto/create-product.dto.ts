import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ProductGender } from "@prisma/client";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from "class-validator";
import { CreateProductImageDto } from "./create-product-image.dto";
import { CreateProductVariantDto } from "./create-product-variant.dto";

export class CreateProductDto {
  @ApiProperty({ description: "Product title", example: "Urban Runner Sneakers" })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: "Product slug", example: "urban-runner-sneakers" })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty({ description: "Unique product-level SKU / Code", example: "SKU-0001" })
  @IsString()
  @IsNotEmpty()
  productCode!: string;

  @ApiProperty({ description: "Detailed description" })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ description: "Base retail price", example: 6500 })
  @IsNumber()
  @IsPositive()
  basePrice!: number;

  @ApiPropertyOptional({ description: "Optional promotional price (must be < basePrice)", example: 5500 })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  salePrice?: number;

  @ApiProperty({ enum: ProductGender, example: ProductGender.Men })
  @IsEnum(ProductGender)
  gender!: ProductGender;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isNew?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ description: "Category ID" })
  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @ApiProperty({ description: "Brand ID" })
  @IsString()
  @IsNotEmpty()
  brandId!: string;

  @ApiProperty({ type: [CreateProductVariantDto] })
  @IsArray()
  @ArrayMinSize(1, { message: "Product must have at least one variant." })
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  variants!: CreateProductVariantDto[];

  @ApiProperty({ type: [CreateProductImageDto] })
  @IsArray()
  @ArrayMinSize(1, { message: "Product must have at least one image." })
  @ValidateNested({ each: true })
  @Type(() => CreateProductImageDto)
  images!: CreateProductImageDto[];
}
