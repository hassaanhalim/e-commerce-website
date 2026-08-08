import { PrismaClient, ProductGender, UserRole } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

async function hashPassword(password: string) {
  return argon2.hash(password, {
    type: argon2.argon2id,
  });
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const CATEGORIES_DATA = [
  { name: "Sneakers", description: "Comfortable and casual everyday sneakers" },
  { name: "Formal", description: "Elegant leather shoes for formal occasions" },
  { name: "Sports", description: "High-performance athletic and running shoes" },
  { name: "Casual", description: "Relaxed footwear for day-to-day wear" },
  { name: "Sandals", description: "Open and breathable footwear for warm days" },
  { name: "Outdoor", description: "Durable and rugged shoes for hiking and trails" },
];

const BRANDS_DATA = [
  { name: "Stride", description: "Urban footwear engineered for high mobility" },
  { name: "Elegance", description: "Premium handcrafted formal shoe makers" },
  { name: "Velocity", description: "Cutting-edge athletic and sport footwear" },
  { name: "Comfort", description: "Ergonomic designs prioritizing daily comfort" },
  { name: "JuniorStep", description: "Vibrant and durable footwear for kids" },
  { name: "Summit", description: "Rugged outdoor gear and trail footwear" },
];

const PRODUCTS_DATA = [
  {
    productCode: "SKU-0001",
    name: "Urban Runner Sneakers",
    slug: "urban-runner-sneakers",
    brandName: "Stride",
    categoryName: "Sneakers",
    gender: ProductGender.Men,
    basePrice: 6500,
    salePrice: 5500,
    image: "https://placehold.co/600x450?text=Urban+Runner",
    sizes: [39, 40, 41, 42, 43],
    colors: ["Black", "White"],
    isNew: true,
    isFeatured: true,
    description: "High-quality sneakers footwear by Stride. Perfect for men.",
  },
  {
    productCode: "SKU-0002",
    name: "Classic Leather Shoes",
    slug: "classic-leather-shoes",
    brandName: "Elegance",
    categoryName: "Formal",
    gender: ProductGender.Men,
    basePrice: 8500,
    salePrice: null,
    image: "https://placehold.co/600x450?text=Leather+Shoes",
    sizes: [40, 41, 42, 43, 44],
    colors: ["Black", "Brown"],
    isNew: false,
    isFeatured: false,
    description: "High-quality formal footwear by Elegance. Perfect for men.",
  },
  {
    productCode: "SKU-0003",
    name: "Performance Sports Shoes",
    slug: "performance-sports-shoes",
    brandName: "Velocity",
    categoryName: "Sports",
    gender: ProductGender.Unisex,
    basePrice: 7200,
    salePrice: 6400,
    image: "https://placehold.co/600x450?text=Sports+Shoes",
    sizes: [38, 39, 40, 41, 42],
    colors: ["Blue", "Black", "Red"],
    isNew: true,
    isFeatured: true,
    description: "High-quality sports footwear by Velocity. Perfect for unisex.",
  },
  {
    productCode: "SKU-0004",
    name: "Everyday Casual Shoes",
    slug: "everyday-casual-shoes",
    brandName: "Comfort",
    categoryName: "Casual",
    gender: ProductGender.Women,
    basePrice: 4800,
    salePrice: null,
    image: "https://placehold.co/600x450?text=Casual+Shoes",
    sizes: [36, 37, 38, 39, 40],
    colors: ["Grey", "White"],
    isNew: false,
    isFeatured: false,
    description: "High-quality casual footwear by Comfort. Perfect for women.",
  },
  {
    productCode: "SKU-0005",
    name: "Flex Knit Trainers",
    slug: "flex-knit-trainers",
    brandName: "Velocity",
    categoryName: "Sports",
    gender: ProductGender.Women,
    basePrice: 7800,
    salePrice: 6900,
    image: "https://placehold.co/600x450?text=Flex+Knit",
    sizes: [36, 37, 38, 39, 40, 41],
    colors: ["Pink", "Black", "White"],
    isNew: true,
    isFeatured: true,
    description: "High-quality sports footwear by Velocity. Perfect for women.",
  },
  {
    productCode: "SKU-0006",
    name: "Heritage Leather Loafers",
    slug: "heritage-leather-loafers",
    brandName: "Elegance",
    categoryName: "Formal",
    gender: ProductGender.Men,
    basePrice: 9200,
    salePrice: null,
    image: "https://placehold.co/600x450?text=Leather+Loafers",
    sizes: [40, 41, 42, 43, 44, 45],
    colors: ["Brown", "Black"],
    isNew: false,
    isFeatured: false,
    description: "High-quality formal footwear by Elegance. Perfect for men.",
  },
  {
    productCode: "SKU-0007",
    name: "Street Canvas Low",
    slug: "street-canvas-low",
    brandName: "Stride",
    categoryName: "Sneakers",
    gender: ProductGender.Unisex,
    basePrice: 4200,
    salePrice: null,
    image: "https://placehold.co/600x450?text=Canvas+Shoes",
    sizes: [37, 38, 39, 40, 41, 42],
    colors: ["White", "Black", "Green"],
    isNew: false,
    isFeatured: false,
    description: "High-quality sneakers footwear by Stride. Perfect for unisex.",
  },
  {
    productCode: "SKU-0008",
    name: "Kids Active Runner",
    slug: "kids-active-runner",
    brandName: "JuniorStep",
    categoryName: "Sports",
    gender: ProductGender.Kids,
    basePrice: 3900,
    salePrice: 3400,
    image: "https://placehold.co/600x450?text=Kids+Runner",
    sizes: [28, 29, 30, 31, 32, 33],
    colors: ["Blue", "Red", "Black"],
    isNew: true,
    isFeatured: false,
    description: "High-quality sports footwear by JuniorStep. Perfect for kids.",
  },
  {
    productCode: "SKU-0009",
    name: "Comfort Walking Sandals",
    slug: "comfort-walking-sandals",
    brandName: "Comfort",
    categoryName: "Sandals",
    gender: ProductGender.Women,
    basePrice: 3600,
    salePrice: null,
    image: "https://placehold.co/600x450?text=Walking+Sandals",
    sizes: [36, 37, 38, 39, 40],
    colors: ["Beige", "Black", "Brown"],
    isNew: false,
    isFeatured: false,
    description: "High-quality sandals footwear by Comfort. Perfect for women.",
  },
  {
    productCode: "SKU-0010",
    name: "Trail Grip Outdoor Shoes",
    slug: "trail-grip-outdoor-shoes",
    brandName: "Summit",
    categoryName: "Outdoor",
    gender: ProductGender.Men,
    basePrice: 9800,
    salePrice: 8900,
    image: "https://placehold.co/600x450?text=Trail+Grip",
    sizes: [40, 41, 42, 43, 44],
    colors: ["Brown", "Black", "Olive"],
    isNew: true,
    isFeatured: true,
    description: "High-quality outdoor footwear by Summit. Perfect for men.",
  },
];

async function main() {
  console.log("Seeding users...");
  const adminPasswordHash = await hashPassword("Admin123");
  await prisma.user.upsert({
    where: { email: "admin@shoestore.com" },
    update: {
      fullName: "Store Administrator",
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      phone: null,
      isActive: true,
    },
    create: {
      fullName: "Store Administrator",
      email: "admin@shoestore.com",
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
    },
  });

  const customerPasswordHash = await hashPassword("Customer123");
  await prisma.user.upsert({
    where: { email: "customer@shoestore.com" },
    update: {
      fullName: "Demo Customer",
      passwordHash: customerPasswordHash,
      role: UserRole.CUSTOMER,
      phone: "+92 300 1234567",
      isActive: true,
    },
    create: {
      fullName: "Demo Customer",
      email: "customer@shoestore.com",
      passwordHash: customerPasswordHash,
      role: UserRole.CUSTOMER,
      phone: "+92 300 1234567",
    },
  });

  console.log("Seeding categories...");
  const categoryMap = new Map<string, string>();
  for (const cat of CATEGORIES_DATA) {
    const slug = slugify(cat.name);
    const record = await prisma.category.upsert({
      where: { slug },
      update: { name: cat.name, description: cat.description, isActive: true },
      create: { name: cat.name, slug, description: cat.description, isActive: true },
    });
    categoryMap.set(cat.name, record.id);
  }

  console.log("Seeding brands...");
  const brandMap = new Map<string, string>();
  for (const br of BRANDS_DATA) {
    const slug = slugify(br.name);
    const record = await prisma.brand.upsert({
      where: { slug },
      update: { name: br.name, description: br.description, isActive: true },
      create: { name: br.name, slug, description: br.description, isActive: true },
    });
    brandMap.set(br.name, record.id);
  }

  console.log("Seeding products, variants, and images...");
  for (const item of PRODUCTS_DATA) {
    const categoryId = categoryMap.get(item.categoryName);
    const brandId = brandMap.get(item.brandName);

    if (!categoryId || !brandId) {
      throw new Error(`Missing category or brand mapping for ${item.name}`);
    }

    const product = await prisma.product.upsert({
      where: { slug: item.slug },
      update: {
        productCode: item.productCode,
        name: item.name,
        description: item.description,
        basePrice: item.basePrice,
        salePrice: item.salePrice,
        gender: item.gender,
        isNew: item.isNew,
        isFeatured: item.isFeatured,
        isActive: true,
        categoryId,
        brandId,
      },
      create: {
        productCode: item.productCode,
        name: item.name,
        slug: item.slug,
        description: item.description,
        basePrice: item.basePrice,
        salePrice: item.salePrice,
        gender: item.gender,
        isNew: item.isNew,
        isFeatured: item.isFeatured,
        isActive: true,
        categoryId,
        brandId,
      },
    });

    // Seed Primary Image (Idempotent)
    const existingImage = await prisma.productImage.findFirst({
      where: { productId: product.id, isPrimary: true },
    });

    if (existingImage) {
      await prisma.productImage.update({
        where: { id: existingImage.id },
        data: {
          url: item.image,
          altText: `${item.name} primary photo`,
        },
      });
    } else {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: item.image,
          altText: `${item.name} primary photo`,
          sortOrder: 0,
          isPrimary: true,
        },
      });
    }

    // Seed Variants for size & color combinations
    for (const color of item.colors) {
      const colorCode = color.substring(0, 3).toUpperCase().replace(/\s/g, "");
      for (const size of item.sizes) {
        const variantSku = `${item.productCode}-${colorCode}-${size}`;
        const variant = await prisma.productVariant.upsert({
          where: { sku: variantSku },
          update: {
            size,
            color,
            isActive: true,
          },
          create: {
            productId: product.id,
            sku: variantSku,
            size,
            color,
            isActive: true,
          },
        });

        await prisma.inventory.upsert({
          where: { variantId: variant.id },
          update: {},
          create: { variantId: variant.id },
        });
      }
    }
  }

  console.log("Database catalog seeding completed successfully.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
