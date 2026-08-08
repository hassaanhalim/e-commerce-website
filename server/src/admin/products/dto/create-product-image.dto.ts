import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Min } from "class-validator";

export class CreateProductImageDto {
  @ApiProperty({ description: "Image URL", example: "https://example.com/photo.jpg" })
  @IsString()
  @IsNotEmpty()
  url!: string;

  @ApiPropertyOptional({ description: "Alt text for accessibility" })
  @IsString()
  @IsOptional()
  altText?: string;

  @ApiPropertyOptional({ description: "Display sequence order", default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: "Is primary product image", default: false })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}
