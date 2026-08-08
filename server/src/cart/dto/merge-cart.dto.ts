import { IsArray, ValidateNested, IsString, IsInt, IsPositive } from "class-validator";
import { Type } from "class-transformer";

export class GuestCartItemDto {
  @IsString()
  variantId!: string;

  @IsInt()
  @IsPositive()
  quantity!: number;
}

export class MergeCartDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuestCartItemDto)
  items!: GuestCartItemDto[];
}
