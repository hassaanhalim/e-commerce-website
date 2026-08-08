import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, Min } from "class-validator";

export class UpdateThresholdDto {
  @ApiProperty({ description: "Low stock threshold", example: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  lowStockThreshold!: number;
}