import { ApiPropertyOptional } from "@nestjs/swagger";
import { ReturnRequestStatus, ReturnRequestType } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";

export class CustomerReturnQueryDto {
  @ApiPropertyOptional({ enum: ReturnRequestStatus })
  @IsEnum(ReturnRequestStatus)
  @IsOptional()
  status?: ReturnRequestStatus;

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

export class AdminReturnQueryDto extends CustomerReturnQueryDto {
  @ApiPropertyOptional({ enum: ReturnRequestType })
  @IsEnum(ReturnRequestType)
  @IsOptional()
  type?: ReturnRequestType;

  @ApiPropertyOptional({ description: "Search by request #, order #, customer email/phone/name" })
  @IsString()
  @IsOptional()
  search?: string;
}
