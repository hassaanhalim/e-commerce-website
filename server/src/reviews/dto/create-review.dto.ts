import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, Max, Min, MinLength } from "class-validator";

export class CreateReviewDto {
  @ApiProperty()
  @IsString()
  orderItemId!: string;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  comment!: string;
}

export class UpdateMyReviewDto {
  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  comment!: string;
}

export class ModerateReviewDto {
  @ApiProperty({ enum: ["APPROVED", "REJECTED"] })
  @IsString()
  status!: "APPROVED" | "REJECTED";

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  moderationNote?: string;
}
