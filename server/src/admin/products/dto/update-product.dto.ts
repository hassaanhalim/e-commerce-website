import { ApiPropertyOptional, OmitType, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsOptional, ValidateNested } from "class-validator";
import { CreateProductDto } from "./create-product.dto";
import { UpdateProductImageDto } from "./update-product-image.dto";
import { UpdateProductVariantDto } from "./update-product-variant.dto";

export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ["variants", "images"] as const),
) {
  @ApiPropertyOptional({ type: [UpdateProductVariantDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateProductVariantDto)
  variants?: UpdateProductVariantDto[];

  @ApiPropertyOptional({ type: [UpdateProductImageDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateProductImageDto)
  images?: UpdateProductImageDto[];
}
