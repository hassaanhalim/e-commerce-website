import { ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { CreateProductImageDto } from "./create-product-image.dto";

export class UpdateProductImageDto extends PartialType(CreateProductImageDto) {
  @ApiPropertyOptional({ description: "ID of existing image record to update" })
  @IsString()
  @IsOptional()
  id?: string;
}
