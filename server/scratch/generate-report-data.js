const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

async function generateReportData() {
  const prisma = new PrismaClient();

  const totalProducts = await prisma.product.count();
  const products = await prisma.product.findMany({
    include: {
      category: true,
      brand: true,
      variants: {
        include: {
          inventory: true,
        },
      },
      images: true,
    },
  });

  const totalVariants = await prisma.productVariant.count();
  const totalInventories = await prisma.inventory.count();

  // Category counts
  const categoryCounts = {};
  for (const p of products) {
    const cat = p.category.name;
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  }

  // Brand counts
  const brandCounts = {};
  for (const p of products) {
    const br = p.brand.name;
    brandCounts[br] = (brandCounts[br] || 0) + 1;
  }

  // Gender counts
  const genderCounts = {};
  for (const p of products) {
    genderCounts[p.gender] = (genderCounts[p.gender] || 0) + 1;
  }

  // Prices
  const prices = products.map((p) => Number(p.salePrice || p.basePrice)).sort((a, b) => a - b);
  const minPrice = prices[0];
  const maxPrice = prices[prices.length - 1];
  const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
  const medianPrice = prices[Math.floor(prices.length / 2)];

  // Stock status
  let inStockCount = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  for (const p of products) {
    const totalQty = p.variants.reduce((sum, v) => sum + (v.inventory?.quantityOnHand || 0), 0);
    if (totalQty === 0) {
      outOfStockCount++;
    } else if (totalQty <= 5) {
      lowStockCount++;
    } else {
      inStockCount++;
    }
  }

  // Sizes distribution
  const sizeCounts = {};
  for (const p of products) {
    for (const v of p.variants) {
      sizeCounts[v.size] = (sizeCounts[v.size] || 0) + 1;
    }
  }

  // Colors distribution
  const colorCounts = {};
  for (const p of products) {
    for (const v of p.variants) {
      colorCounts[v.color] = (colorCounts[v.color] || 0) + 1;
    }
  }

  console.log("=== CATALOG STATISTICS FOR FINAL REPORT ===");
  console.log("Total Products:", totalProducts);
  console.log("Total Variants:", totalVariants);
  console.log("Total Inventories:", totalInventories);
  console.log("\nCategories:", categoryCounts);
  console.log("\nBrands:", brandCounts);
  console.log("\nGender Breakdown:", genderCounts);
  console.log(`\nPricing: Min = PKR ${minPrice}, Max = PKR ${maxPrice}, Avg = PKR ${avgPrice}, Median = PKR ${medianPrice}`);
  console.log(`Stock Status: In Stock = ${inStockCount}, Low Stock = ${lowStockCount}, Out of Stock = ${outOfStockCount}`);
  console.log("\nSize Distribution:", sizeCounts);
  console.log("\nTop 15 Colors:", Object.entries(colorCounts).sort((a, b) => b[1] - a[1]).slice(0, 15));

  await prisma.$disconnect();
}

generateReportData();
