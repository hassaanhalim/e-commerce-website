import { IsEnum, IsOptional, IsString } from "class-validator";

export enum ShippingMethod {
  STANDARD = "STANDARD",
  EXPRESS = "EXPRESS",
}

export class CreateCheckoutSessionDto {
  @IsString()
  shippingAddressId!: string;

  @IsString()
  @IsOptional()
  billingAddressId?: string;

  @IsEnum(ShippingMethod)
  shippingMethod!: ShippingMethod;
}

export class CheckoutPreviewDto {
  @IsString()
  shippingAddressId!: string;

  @IsEnum(ShippingMethod)
  shippingMethod!: ShippingMethod;
}
