import { Module } from "@nestjs/common";
import { PublicBrandsModule } from "./brands/public-brands.module";
import { PublicCategoriesModule } from "./categories/public-categories.module";
import { PublicProductsModule } from "./products/public-products.module";

@Module({
  imports: [PublicCategoriesModule, PublicBrandsModule, PublicProductsModule],
  exports: [PublicCategoriesModule, PublicBrandsModule, PublicProductsModule],
})
export class CatalogModule {}
