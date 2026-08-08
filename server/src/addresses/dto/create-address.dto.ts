import { IsBoolean, IsOptional, IsString, MinLength } from "class-validator";

export class CreateAddressDto {
  @IsString()
  @IsOptional()
  label?: string;

  @IsString()
  @MinLength(1)
  recipientName!: string;

  @IsString()
  @MinLength(7)
  phone!: string;

  @IsString()
  @MinLength(3)
  addressLine1!: string;

  @IsString()
  @IsOptional()
  addressLine2?: string;

  @IsString()
  @MinLength(2)
  city!: string;

  @IsString()
  @IsOptional()
  stateOrProvince?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsString()
  @MinLength(2)
  country!: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
