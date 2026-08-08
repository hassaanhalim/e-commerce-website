import { ApiPropertyOptional } from "@nestjs/swagger";
import { ReviewStatus } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";

export class CustomerReviewQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 10;
}

export class PublicReviewQueryDto extends CustomerReviewQueryDto {
  @ApiPropertyOptional({ description: "Filter by rating (1 to 5)" })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  rating?: number;
}

export class AdminReviewQueryDto extends PublicReviewQueryDto {
  @ApiPropertyOptional({ enum: ReviewStatus })
  @IsEnum(ReviewStatus)
  @IsOptional()
  status?: ReviewStatus;

  @ApiPropertyOptional({ description: "Filter by productId" })
  @IsString()
  @IsOptional()
  productId?: string;

  @ApiPropertyOptional({ description: "Search by reviewer name, product name, comment" })
  @IsString()
  @IsOptional()
  search?: string;
}
