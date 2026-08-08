import { IsInt, IsPositive, IsString, IsOptional } from "class-validator";

export class AddCartItemDto {
  @IsString()
  variantId!: string;

  @IsString()
  @IsOptional()
  productId?: string;

  @IsInt()
  @IsPositive()
  quantity!: number;
}
