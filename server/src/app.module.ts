import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import * as Joi from "joi";
import { AdminModule } from "./admin/admin.module";
import { AuthModule } from "./auth/auth.module";
import { CartModule } from "./cart/cart.module";
import { CatalogModule } from "./catalog/catalog.module";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./prisma/prisma.module";
import { UsersModule } from "./users/users.module";
import { WishlistModule } from "./wishlist/wishlist.module";
import { AddressesModule } from "./addresses/addresses.module";
import { CheckoutModule } from "./checkout/checkout.module";
import { OrdersModule } from "./orders/orders.module";
import { ReviewsModule } from "./reviews/reviews.module";
import { ReturnsModule } from "./returns/returns.module";
import { AuditModule } from "./audit/audit.module";
import { HomepageModule } from "./homepage/homepage.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required(),
        JWT_ACCESS_SECRET: Joi.string().required(),
        JWT_ACCESS_TTL_SECONDS: Joi.number().integer().positive().default(900),
        REFRESH_TOKEN_HASH_SECRET: Joi.string().required(),
        REFRESH_TOKEN_TTL_DAYS: Joi.number().integer().positive().default(30),
        COOKIE_SECURE: Joi.boolean().truthy("true").falsy("false").default(false),
        COOKIE_SAMESITE: Joi.string().valid("lax", "strict", "none").default("lax"),
        PORT: Joi.number().default(3001),
        NODE_ENV: Joi.string().default("development"),
        FRONTEND_URL: Joi.string().uri().optional(),
        TRUSTED_ORIGINS: Joi.string().optional(),
        RETURN_WINDOW_DAYS: Joi.number().integer().positive().default(14),
      }),
    }),
    PrismaModule,
    AuditModule,
    UsersModule,
    AuthModule,
    HealthModule,
    AdminModule,
    CatalogModule,
    CartModule,
    WishlistModule,
    AddressesModule,
    CheckoutModule,
    OrdersModule,
    ReviewsModule,
    ReturnsModule,
    HomepageModule,
  ],
})
export class AppModule {}


