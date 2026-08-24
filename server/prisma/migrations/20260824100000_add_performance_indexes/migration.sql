-- CreateIndex
CREATE INDEX "Product_isActive_createdAt_idx" ON "Product"("isActive", "createdAt");

-- CreateIndex
CREATE INDEX "Product_isActive_isFeatured_idx" ON "Product"("isActive", "isFeatured");

-- CreateIndex
CREATE INDEX "ProductVariant_productId_isActive_idx" ON "ProductVariant"("productId", "isActive");

-- CreateIndex
CREATE INDEX "Order_userId_status_idx" ON "Order"("userId", "status");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");
