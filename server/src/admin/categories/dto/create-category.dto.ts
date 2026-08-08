import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateCategoryDto {
  @ApiProperty({ description: "Category display name", example: "Sneakers" })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: "Category URL slug", example: "sneakers" })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({ description: "Category description", example: "Casual sneakers collection" })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: "Active status flag", default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
