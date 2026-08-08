-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "productCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Product_productCode_key" ON "Product"("productCode");

-- DropIndex
DROP INDEX "Category_slug_idx";

-- DropIndex
DROP INDEX "Brand_slug_idx";

-- DropIndex
DROP INDEX "Product_slug_idx";

-- DropIndex
DROP INDEX "ProductVariant_sku_idx";
