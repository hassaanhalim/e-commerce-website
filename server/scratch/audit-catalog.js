const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

async function audit() {
  const prisma = new PrismaClient();
  try {
    const productsCount = await prisma.product.count();
    const categories = await prisma.category.findMany();
    const brands = await prisma.brand.findMany();
    const variantsCount = await prisma.productVariant.count();
    const inventoryCount = await prisma.inventory.count();
    const products = await prisma.product.findMany({
      select: {
        id: true,
        productCode: true,
        name: true,
        slug: true,
        gender: true,
        category: { select: { name: true, slug: true } },
        brand: { select: { name: true, slug: true } },
        basePrice: true,
        salePrice: true,
      }
    });

    console.log("=== DB AUDIT RESULTS ===");
    console.log(`Total Products: ${productsCount}`);
    console.log(`Total Variants: ${variantsCount}`);
    console.log(`Total Inventory: ${inventoryCount}`);
    console.log("\nCategories:", categories.map(c => ({ id: c.id, name: c.name, slug: c.slug })));
    console.log("\nBrands:", brands.map(b => ({ id: b.id, name: b.name, slug: b.slug })));
    console.log("\nProduct Codes Sample (first 10):", products.slice(0, 10).map(p => `${p.productCode} - ${p.name} (${p.category.name} / ${p.gender})`));
    console.log("All Product Codes:", products.map(p => p.productCode));
  } catch (err) {
    console.error("Audit error:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

audit();
