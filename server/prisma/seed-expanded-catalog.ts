/// <reference types="node" />
import "dotenv/config";
import {
  PrismaClient,
  ProductGender,
} from "@prisma/client";
import { EXPANDED_PRODUCTS_DATA, BRANDS_TO_CONFIRM, CATEGORIES_TO_CONFIRM, ALL_NEW_PRODUCTS } from "./seed-expanded-catalog-data";

const prisma = new PrismaClient();

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  console.log("==================================================");
  console.log("HIGH-PERFORMANCE EXPANDED CATALOG SEEDING");
  console.log("==================================================");

  // 1. Confirm Brands
  const brandMap = new Map<string, string>();
  for (const b of BRANDS_TO_CONFIRM) {
    const slug = slugify(b.name);
    const existing = await prisma.brand.findUnique({ where: { slug } });
    if (existing) {
      brandMap.set(b.name.toLowerCase(), existing.id);
    } else {
      const created = await prisma.brand.create({
        data: {
          name: b.name,
          slug,
          description: b.description,
          isActive: true,
        },
      });
      brandMap.set(b.name.toLowerCase(), created.id);
      console.log(`+ Brand: ${b.name}`);
    }
  }

  // 2. Confirm Categories
  const categoryMap = new Map<string, string>();
  for (const c of CATEGORIES_TO_CONFIRM) {
    const slug = slugify(c.name);
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) {
      categoryMap.set(c.name.toLowerCase(), existing.id);
    } else {
      const created = await prisma.category.create({
        data: {
          name: c.name,
          slug,
          description: c.description,
          isActive: true,
        },
      });
      categoryMap.set(c.name.toLowerCase(), created.id);
      console.log(`+ Category: ${c.name}`);
    }
  }

  // 3. Prefetch existing products
  const existingProducts = await prisma.product.findMany({
    select: { id: true, productCode: true, slug: true },
  });
  const existingCodeMap = new Map<string, string>(existingProducts.map((p) => [p.productCode, p.id]));
  const existingSlugSet = new Set<string>(existingProducts.map((p) => p.slug));

  // 4. Prefetch existing variants
  const existingVariants = await prisma.productVariant.findMany({
    select: { id: true, sku: true, productId: true, size: true, color: true },
  });
  const existingSkuSet = new Set<string>(existingVariants.map((v) => v.sku));
  const existingVariantKeySet = new Set<string>(
    existingVariants.map((v) => `${v.productId}_${v.size}_${v.color}`),
  );

  // 5. Prefetch existing inventory
  const existingInventories = await prisma.inventory.findMany({
    select: { variantId: true },
  });
  const existingInventoryVariantSet = new Set<string>(
    existingInventories.map((i) => i.variantId),
  );

  console.log(`\nExisting in DB: ${existingProducts.length} products, ${existingVariants.length} variants, ${existingInventories.length} inventories.`);

  let newProductsCount = 0;
  let newVariantsCount = 0;
  let newInventoriesCount = 0;

  // Process products in chunks
  const chunkSize = 10;
  for (let i = 0; i < ALL_NEW_PRODUCTS.length; i += chunkSize) {
    const chunk = ALL_NEW_PRODUCTS.slice(i, i + chunkSize);

    await Promise.all(
      chunk.map(async (p, idx) => {
        const productIndex = i + idx;
        let slug = slugify(p.name);
        const brandId = brandMap.get(p.brandName.toLowerCase());
        const categoryId = categoryMap.get(p.categoryName.toLowerCase());

        if (!brandId || !categoryId) {
          console.warn(`Skipping ${p.productCode} (${p.name}): missing brandId or categoryId`);
          return;
        }

        let productId = existingCodeMap.get(p.productCode);

        if (!productId) {
          // If slug collision occurs on a distinct productCode, make it unique
          if (existingSlugSet.has(slug)) {
            slug = `${slug}-${p.productCode.toLowerCase()}`;
          }

          const created = await prisma.product.create({
            data: {
              productCode: p.productCode,
              name: p.name,
              slug,
              description: p.description,
              basePrice: p.basePrice,
              salePrice: p.salePrice,
              gender: p.gender,
              isNew: Boolean(p.isNew),
              isFeatured: Boolean(p.isFeatured),
              isActive: true,
              categoryId,
              brandId,
              images: {
                create: {
                  url: p.imageUrl,
                  altText: p.name,
                  isPrimary: true,
                  sortOrder: 0,
                },
              },
            },
          });

          productId = created.id;
          existingCodeMap.set(p.productCode, productId);
          existingSlugSet.add(slug);
          newProductsCount++;
        }

        // Process variants for this product
        for (const color of p.colors) {
          for (const size of p.sizes) {
            const sku = `${p.productCode}-${size}-${color.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, "X")}`;
            const variantKey = `${productId}_${size}_${color}`;

            if (existingSkuSet.has(sku) || existingVariantKeySet.has(variantKey)) {
              continue;
            }

            let initialQuantity: number;
            if (p.stockOverride && p.stockOverride[size] !== undefined) {
              initialQuantity = p.stockOverride[size];
            } else if ((size === 44 && p.productCode.endsWith("5")) || (size === 36 && p.productCode.endsWith("7"))) {
              initialQuantity = 0; // Intentional out-of-stock
            } else if (size === 43 && p.productCode.endsWith("2")) {
              initialQuantity = 2; // Intentional low-stock
            } else {
              initialQuantity = ((size * 7 + color.length * 3 + productIndex) % 17) + 8; // 8..24 units
            }

            const createdVariant = await prisma.productVariant.create({
              data: {
                productId,
                sku,
                size,
                color,
                isActive: true,
                inventory: {
                  create: {
                    quantityOnHand: initialQuantity,
                    reservedQuantity: 0,
                    lowStockThreshold: 5,
                  },
                },
              },
            });

            existingSkuSet.add(sku);
            existingVariantKeySet.add(variantKey);
            existingInventoryVariantSet.add(createdVariant.id);
            newVariantsCount++;
            newInventoriesCount++;
          }
        }
      }),
    );

    process.stdout.write(`\rProcessed ${Math.min(i + chunkSize, ALL_NEW_PRODUCTS.length)} / ${ALL_NEW_PRODUCTS.length} products...`);
  }

  // Final Audit
  const finalProducts = await prisma.product.count();
  const finalVariants = await prisma.productVariant.count();
  const finalInventories = await prisma.inventory.count();
  const finalBrands = await prisma.brand.count();
  const finalCategories = await prisma.category.count();

  console.log("\n\n==================================================");
  console.log("EXPANDED CATALOG SEED COMPLETED SUCCESSFULLY");
  console.log("==================================================");
  console.log(`New Products Inserted:      ${newProductsCount}`);
  console.log(`Total Products in DB:       ${finalProducts}`);
  console.log(`New Variants Inserted:      ${newVariantsCount}`);
  console.log(`Total Variants in DB:       ${finalVariants}`);
  console.log(`New Inventories Inserted:   ${newInventoriesCount}`);
  console.log(`Total Inventories in DB:    ${finalInventories}`);
  console.log(`Total Active Brands in DB:  ${finalBrands}`);
  console.log(`Total Active Categories:    ${finalCategories}`);
  console.log("==================================================");
}

main()
  .catch((err) => {
    console.error("Seed execution failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
