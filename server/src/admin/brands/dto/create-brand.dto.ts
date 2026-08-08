import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateBrandDto {
  @ApiProperty({ description: "Brand name", example: "Stride" })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: "Brand URL slug", example: "stride" })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({ description: "Brand description", example: "Urban footwear manufacturer" })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: "Active status flag", default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
