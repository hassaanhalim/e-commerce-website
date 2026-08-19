import {
  IsArray,
  IsBoolean,
  IsInt,
  Max,
  Min,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class StatItemDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  settingsId?: string;

  @IsOptional()
  createdAt?: any;

  @IsOptional()
  updatedAt?: any;

  @IsString()
  @MaxLength(50)
  value!: string;

  @IsString()
  @MaxLength(100)
  label!: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class BenefitItemDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  settingsId?: string;

  @IsOptional()
  createdAt?: any;

  @IsOptional()
  updatedAt?: any;

  @IsString()
  @MaxLength(100)
  title!: string;

  @IsString()
  @MaxLength(300)
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  iconKey?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateHomepageSettingsDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  createdAt?: any;

  @IsOptional()
  updatedAt?: any;

  // Announcement Bar
  @IsOptional()
  @IsBoolean()
  announcementEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  announcementText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  announcementLinkText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  announcementLinkUrl?: string;

  // Hero Section
  @IsOptional()
  @IsBoolean()
  heroEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  heroEyebrow?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  heroHeading?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  heroDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  heroPrimaryLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  heroPrimaryUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  heroSecondaryLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  heroSecondaryUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  heroImageUrl?: string;

  // Categories Section
  @IsOptional()
  @IsBoolean()
  categoriesEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  categoriesEyebrow?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  categoriesHeading?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  categoriesDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  categoriesCtaLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  categoriesCtaUrl?: string;

  // New Arrivals Section
  @IsOptional()
  @IsBoolean()
  arrivalsEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  arrivalsEyebrow?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  arrivalsHeading?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  arrivalsDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  arrivalsCtaLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  arrivalsCtaUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  arrivalsLimit?: number;

  // Promotional Banner
  @IsOptional()
  @IsBoolean()
  promoEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  promoEyebrow?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  promoHeading?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  promoDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  promoCtaLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  promoCtaUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  promoImageUrl?: string;

  // Newsletter Section
  @IsOptional()
  @IsBoolean()
  newsletterEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  newsletterEyebrow?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  newsletterHeading?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  newsletterDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  newsletterPlaceholder?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  newsletterButtonLabel?: string;

  // Footer Content
  @IsOptional()
  @IsString()
  @MaxLength(100)
  footerStoreName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  footerDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  footerCopyright?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  footerSupportEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  footerSupportPhone?: string;

  // Stat items
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StatItemDto)
  stats?: StatItemDto[];

  // Benefit items
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BenefitItemDto)
  benefits?: BenefitItemDto[];
}
