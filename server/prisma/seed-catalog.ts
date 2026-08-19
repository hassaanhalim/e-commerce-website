/// <reference types="node" />
import "dotenv/config";

import {
  PrismaClient,
  ProductGender,
  UserRole,
  InventoryAdjustmentType,
} from "@prisma/client";

const prisma = new PrismaClient();

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ─────────────────────────────────────────────────────────────────────────────
   CATEGORIES & BRANDS
   ───────────────────────────────────────────────────────────────────────────── */

const CATEGORIES_DATA = [
  {
    name: "Men",
    description:
      "Premium men's footwear for casual, athletic, and formal wear",
  },
  {
    name: "Women",
    description:
      "Stylish women's footwear engineered for comfort and modern aesthetics",
  },
  {
    name: "Sports",
    description:
      "High-performance athletic, running, and training shoes",
  },
];

const BRANDS_DATA = [
  {
    name: "Nike",
    description:
      "Global leader in athletic footwear, innovation, and iconic sportswear",
  },
  {
    name: "Adidas",
    description:
      "Pioneering sport-inspired footwear with cutting-edge cushioning technology",
  },
  {
    name: "Puma",
    description:
      "Fast-moving lifestyle and performance athletic shoes built for speed",
  },
  {
    name: "New Balance",
    description:
      "Heritage footwear brand renowned for ergonomic support and premium materials",
  },
  {
    name: "Reebok",
    description:
      "Classic fitness and lifestyle footwear built for daily performance",
  },
  {
    name: "Skechers",
    description:
      "Comfort-focused footwear featuring supportive cushioning technologies",
  },
  {
    name: "ASICS",
    description:
      "Japanese-engineered footwear focused on cushioning and running stability",
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   STARTER PRODUCT IMAGE URLS

   These are public starter assets only.
   They can later be migrated to Supabase Storage.

   IMPORTANT:
   Every entry below is a RAW image URL — not Markdown.
   ───────────────────────────────────────────────────────────────────────────── */

const FOOTWEAR_IMAGES: string[] = [
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1608231387042-66d1773070a5?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1560769629-975ec94e6a86?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1539185441755-769473a23570?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1605348532760-6753d2c43329?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1582588678413-dbf45f4823e9?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1588117305388-c2631a279f82?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1603808033192-082d6919d3e1?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1579338559194-a162d19bf842?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1562183241-b937e95585b6?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1617689564172-01196d1c02cb?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1618677831708-0e7fda3148b4?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1512374382149-233c42b6a83b?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1575537302964-96cd47c06b1b?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1595341888016-a392ef81b7de?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1607522370275-f14206abe5d3?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1581101767113-1677fc2beaa8?q=80&w=800&auto=format&fit=crop",
];

/* ─────────────────────────────────────────────────────────────────────────────
   PRODUCT DEFINITIONS
   ───────────────────────────────────────────────────────────────────────────── */

interface SeedProduct {
  productCode: string;
  name: string;
  brandName: string;
  categoryName: string;
  gender: ProductGender;
  basePrice: number;
  salePrice: number | null;
  isNew: boolean;
  isFeatured: boolean;
  description: string;
  sizes: number[];
  colors: string[];
}

const PRODUCTS_DATA: SeedProduct[] = [
  // NIKE
  {
    productCode: "NK-001",
    name: "Nike Air Max 270",
    brandName: "Nike",
    categoryName: "Sports",
    gender: ProductGender.Men,
    basePrice: 28500,
    salePrice: 24900,
    isNew: true,
    isFeatured: true,
    description:
      "Everyday athletic footwear with responsive heel cushioning and a lightweight upper for comfortable daily wear.",
    sizes: [40, 41, 42, 43, 44],
    colors: ["Black", "White"],
  },
  {
    productCode: "NK-002",
    name: "Nike Air Force 1 '07",
    brandName: "Nike",
    categoryName: "Men",
    gender: ProductGender.Men,
    basePrice: 24500,
    salePrice: null,
    isNew: false,
    isFeatured: true,
    description:
      "Classic low-top sneaker with a clean leather-inspired silhouette designed for casual everyday wear.",
    sizes: [41, 42, 43, 44],
    colors: ["White", "Black"],
  },
  {
    productCode: "NK-003",
    name: "Nike Pegasus 40 Running Shoes",
    brandName: "Nike",
    categoryName: "Sports",
    gender: ProductGender.Unisex,
    basePrice: 31000,
    salePrice: 27500,
    isNew: true,
    isFeatured: true,
    description:
      "Responsive road-running shoe designed for daily training, smooth transitions, and dependable cushioning.",
    sizes: [39, 40, 41, 42, 43],
    colors: ["Blue", "Grey"],
  },
  {
    productCode: "NK-004",
    name: "Nike Zoom Fly 5",
    brandName: "Nike",
    categoryName: "Sports",
    gender: ProductGender.Men,
    basePrice: 35000,
    salePrice: null,
    isNew: true,
    isFeatured: false,
    description:
      "Performance-focused running shoe built for faster training sessions and race-day inspired responsiveness.",
    sizes: [41, 42, 43, 44],
    colors: ["Black", "Green"],
  },
  {
    productCode: "NK-005",
    name: "Nike Court Vision Low",
    brandName: "Nike",
    categoryName: "Men",
    gender: ProductGender.Men,
    basePrice: 18500,
    salePrice: 15900,
    isNew: false,
    isFeatured: false,
    description:
      "Basketball-inspired low-top sneaker with a clean retro profile for versatile casual styling.",
    sizes: [40, 41, 42, 43],
    colors: ["White", "Navy"],
  },
  {
    productCode: "NK-006",
    name: "Nike React Infinity 3",
    brandName: "Nike",
    categoryName: "Women",
    gender: ProductGender.Women,
    basePrice: 29500,
    salePrice: null,
    isNew: true,
    isFeatured: true,
    description:
      "Supportive women's running shoe with soft cushioning and a stable platform for comfortable training.",
    sizes: [36, 37, 38, 39, 40],
    colors: ["White", "Grey"],
  },
  {
    productCode: "NK-007",
    name: "Nike Revolution 6 Next Nature",
    brandName: "Nike",
    categoryName: "Women",
    gender: ProductGender.Women,
    basePrice: 16500,
    salePrice: 13900,
    isNew: false,
    isFeatured: false,
    description:
      "Lightweight everyday running shoe with a breathable upper and soft foam cushioning.",
    sizes: [37, 38, 39, 40],
    colors: ["Black", "White"],
  },
  {
    productCode: "NK-008",
    name: "Nike Blazer Mid '77 Vintage",
    brandName: "Nike",
    categoryName: "Men",
    gender: ProductGender.Unisex,
    basePrice: 26000,
    salePrice: null,
    isNew: true,
    isFeatured: false,
    description:
      "Retro mid-top sneaker featuring a heritage-inspired profile and durable everyday construction.",
    sizes: [40, 41, 42, 43],
    colors: ["White", "Black"],
  },

  // ADIDAS
  {
    productCode: "AD-009",
    name: "Adidas Ultraboost Light",
    brandName: "Adidas",
    categoryName: "Sports",
    gender: ProductGender.Men,
    basePrice: 36000,
    salePrice: 31500,
    isNew: true,
    isFeatured: true,
    description:
      "Lightweight performance running shoe with responsive cushioning for energetic daily training.",
    sizes: [41, 42, 43, 44],
    colors: ["Black", "White"],
  },
  {
    productCode: "AD-010",
    name: "Adidas Samba OG Shoes",
    brandName: "Adidas",
    categoryName: "Men",
    gender: ProductGender.Unisex,
    basePrice: 25500,
    salePrice: null,
    isNew: false,
    isFeatured: true,
    description:
      "Classic terrace-inspired sneaker with a low-profile silhouette suited to everyday casual wear.",
    sizes: [40, 41, 42, 43],
    colors: ["White", "Black"],
  },
  {
    productCode: "AD-011",
    name: "Adidas NMD R1 V3",
    brandName: "Adidas",
    categoryName: "Sports",
    gender: ProductGender.Men,
    basePrice: 29000,
    salePrice: 24500,
    isNew: true,
    isFeatured: false,
    description:
      "Modern street-running silhouette with a breathable textile upper and cushioned midsole.",
    sizes: [41, 42, 43],
    colors: ["Grey", "Navy"],
  },
  {
    productCode: "AD-012",
    name: "Adidas Gazelle Bold Sneakers",
    brandName: "Adidas",
    categoryName: "Women",
    gender: ProductGender.Women,
    basePrice: 23500,
    salePrice: null,
    isNew: true,
    isFeatured: true,
    description:
      "Platform-inspired women's sneaker with a retro profile and elevated everyday styling.",
    sizes: [36, 37, 38, 39],
    colors: ["Beige", "Black"],
  },
  {
    productCode: "AD-013",
    name: "Adidas Runfalcon 3.0",
    brandName: "Adidas",
    categoryName: "Sports",
    gender: ProductGender.Women,
    basePrice: 15500,
    salePrice: 12900,
    isNew: false,
    isFeatured: false,
    description:
      "Versatile running trainer with lightweight cushioning for jogging, walking, and everyday use.",
    sizes: [36, 37, 38, 39, 40],
    colors: ["Black", "Grey"],
  },
  {
    productCode: "AD-014",
    name: "Adidas Stan Smith Classic",
    brandName: "Adidas",
    categoryName: "Men",
    gender: ProductGender.Unisex,
    basePrice: 22000,
    salePrice: null,
    isNew: false,
    isFeatured: false,
    description:
      "Minimal court-inspired sneaker with clean lines and a timeless low-top shape.",
    sizes: [40, 41, 42, 43],
    colors: ["White", "Green"],
  },
  {
    productCode: "AD-015",
    name: "Adidas Duramo SL Trainers",
    brandName: "Adidas",
    categoryName: "Sports",
    gender: ProductGender.Men,
    basePrice: 17000,
    salePrice: 14500,
    isNew: false,
    isFeatured: false,
    description:
      "Lightweight training shoe suitable for gym sessions, short runs, and active everyday wear.",
    sizes: [40, 41, 42, 43, 44],
    colors: ["Navy", "Black"],
  },
  {
    productCode: "AD-016",
    name: "Adidas Court Platform Sneakers",
    brandName: "Adidas",
    categoryName: "Women",
    gender: ProductGender.Women,
    basePrice: 19500,
    salePrice: null,
    isNew: true,
    isFeatured: false,
    description:
      "Clean court-inspired women's sneaker with a subtle platform sole and versatile styling.",
    sizes: [37, 38, 39, 40],
    colors: ["White", "Beige"],
  },

  // PUMA
  {
    productCode: "PM-017",
    name: "Puma Velocity Nitro 2",
    brandName: "Puma",
    categoryName: "Sports",
    gender: ProductGender.Men,
    basePrice: 27000,
    salePrice: 22900,
    isNew: true,
    isFeatured: true,
    description:
      "Neutral running shoe designed for daily mileage with responsive cushioning and durable traction.",
    sizes: [41, 42, 43, 44],
    colors: ["Black", "Blue"],
  },
  {
    productCode: "PM-018",
    name: "Puma Suede Classic XXI",
    brandName: "Puma",
    categoryName: "Men",
    gender: ProductGender.Unisex,
    basePrice: 19500,
    salePrice: null,
    isNew: false,
    isFeatured: true,
    description:
      "Heritage suede-inspired sneaker with a simple profile suited to casual everyday outfits.",
    sizes: [40, 41, 42, 43],
    colors: ["Black", "Navy"],
  },
  {
    productCode: "PM-019",
    name: "Puma RS-X Efekt Retro",
    brandName: "Puma",
    categoryName: "Sports",
    gender: ProductGender.Men,
    basePrice: 26000,
    salePrice: 21500,
    isNew: true,
    isFeatured: false,
    description:
      "Chunky retro-running inspired sneaker with layered materials and a cushioned everyday sole.",
    sizes: [41, 42, 43],
    colors: ["White", "Grey"],
  },
  {
    productCode: "PM-020",
    name: "Puma Carina 2.0 Platform",
    brandName: "Puma",
    categoryName: "Women",
    gender: ProductGender.Women,
    basePrice: 18000,
    salePrice: null,
    isNew: false,
    isFeatured: false,
    description:
      "Women's casual sneaker with a raised sole and soft everyday cushioning.",
    sizes: [36, 37, 38, 39],
    colors: ["White", "Beige"],
  },
  {
    productCode: "PM-021",
    name: "Puma Softride Enzo NXT",
    brandName: "Puma",
    categoryName: "Sports",
    gender: ProductGender.Women,
    basePrice: 17500,
    salePrice: 14900,
    isNew: false,
    isFeatured: false,
    description:
      "Soft-cushioned women's trainer built for gym sessions and active daily use.",
    sizes: [37, 38, 39, 40],
    colors: ["Black", "Grey"],
  },
  {
    productCode: "PM-022",
    name: "Puma Smash v2 Leather",
    brandName: "Puma",
    categoryName: "Men",
    gender: ProductGender.Men,
    basePrice: 16000,
    salePrice: null,
    isNew: false,
    isFeatured: false,
    description:
      "Tennis-inspired casual sneaker with a clean upper and durable rubber sole.",
    sizes: [40, 41, 42, 43],
    colors: ["White", "Black"],
  },
  {
    productCode: "PM-023",
    name: "Puma Future Rider Play On",
    brandName: "Puma",
    categoryName: "Women",
    gender: ProductGender.Unisex,
    basePrice: 21000,
    salePrice: 17900,
    isNew: true,
    isFeatured: true,
    description:
      "Retro running-inspired sneaker with lightweight cushioning and bold casual styling.",
    sizes: [38, 39, 40, 41],
    colors: ["Blue", "White"],
  },

  // NEW BALANCE
  {
    productCode: "NB-024",
    name: "New Balance 574 Core",
    brandName: "New Balance",
    categoryName: "Men",
    gender: ProductGender.Unisex,
    basePrice: 24500,
    salePrice: null,
    isNew: false,
    isFeatured: true,
    description:
      "Classic lifestyle sneaker combining everyday cushioning, support, and understated retro styling.",
    sizes: [40, 41, 42, 43, 44],
    colors: ["Grey", "Navy"],
  },
  {
    productCode: "NB-025",
    name: "New Balance 9060 Tech",
    brandName: "New Balance",
    categoryName: "Sports",
    gender: ProductGender.Men,
    basePrice: 34000,
    salePrice: 29900,
    isNew: true,
    isFeatured: true,
    description:
      "Modern technical sneaker with sculpted cushioning and a bold early-2000s inspired profile.",
    sizes: [41, 42, 43, 44],
    colors: ["Beige", "Black"],
  },
  {
    productCode: "NB-026",
    name: "New Balance Fresh Foam X 880v13",
    brandName: "New Balance",
    categoryName: "Sports",
    gender: ProductGender.Men,
    basePrice: 31500,
    salePrice: null,
    isNew: true,
    isFeatured: false,
    description:
      "Daily running shoe with plush cushioning and a breathable engineered upper.",
    sizes: [41, 42, 43],
    colors: ["Blue", "Black"],
  },
  {
    productCode: "NB-027",
    name: "New Balance 327 Retro Runner",
    brandName: "New Balance",
    categoryName: "Women",
    gender: ProductGender.Women,
    basePrice: 25000,
    salePrice: 21000,
    isNew: true,
    isFeatured: true,
    description:
      "Women's retro-inspired lifestyle sneaker with a wedge profile and bold everyday styling.",
    sizes: [36, 37, 38, 39],
    colors: ["Olive", "White"],
  },
  {
    productCode: "NB-028",
    name: "New Balance 550 Vintage Leather",
    brandName: "New Balance",
    categoryName: "Men",
    gender: ProductGender.Men,
    basePrice: 28000,
    salePrice: null,
    isNew: true,
    isFeatured: true,
    description:
      "Basketball-inspired low-top sneaker with a vintage court profile and sturdy everyday construction.",
    sizes: [41, 42, 43, 44],
    colors: ["White", "Green"],
  },
  {
    productCode: "NB-029",
    name: "New Balance Dynasoft Nergize",
    brandName: "New Balance",
    categoryName: "Women",
    gender: ProductGender.Women,
    basePrice: 17500,
    salePrice: 14900,
    isNew: false,
    isFeatured: false,
    description:
      "Lightweight women's trainer with soft responsive cushioning for active everyday comfort.",
    sizes: [36, 37, 38, 39],
    colors: ["Black", "Grey"],
  },
  {
    productCode: "NB-030",
    name: "New Balance 237 Lifestyle",
    brandName: "New Balance",
    categoryName: "Women",
    gender: ProductGender.Unisex,
    basePrice: 21500,
    salePrice: null,
    isNew: false,
    isFeatured: false,
    description:
      "Modern interpretation of retro running style with a lightweight everyday silhouette.",
    sizes: [37, 38, 39, 40],
    colors: ["Blue", "Beige"],
  },

  // REEBOK
  {
    productCode: "RB-031",
    name: "Reebok Club C 85 Vintage",
    brandName: "Reebok",
    categoryName: "Men",
    gender: ProductGender.Unisex,
    basePrice: 21500,
    salePrice: null,
    isNew: false,
    isFeatured: true,
    description:
      "Court-inspired casual sneaker with a clean retro shape and understated everyday styling.",
    sizes: [40, 41, 42, 43],
    colors: ["White", "Beige"],
  },
  {
    productCode: "RB-032",
    name: "Reebok Nano X3 Adventure",
    brandName: "Reebok",
    categoryName: "Sports",
    gender: ProductGender.Men,
    basePrice: 32000,
    salePrice: 27500,
    isNew: true,
    isFeatured: true,
    description:
      "Versatile cross-training shoe designed for gym work, lifting, conditioning, and outdoor sessions.",
    sizes: [41, 42, 43, 44],
    colors: ["Black", "Olive"],
  },
  {
    productCode: "RB-033",
    name: "Reebok Zig Dynamica 4",
    brandName: "Reebok",
    categoryName: "Sports",
    gender: ProductGender.Men,
    basePrice: 24000,
    salePrice: null,
    isNew: true,
    isFeatured: false,
    description:
      "Athletic trainer with a geometric cushioned sole designed for active everyday comfort.",
    sizes: [41, 42, 43],
    colors: ["Black", "White"],
  },
  {
    productCode: "RB-034",
    name: "Reebok Classic Leather SP",
    brandName: "Reebok",
    categoryName: "Women",
    gender: ProductGender.Women,
    basePrice: 22500,
    salePrice: 18900,
    isNew: false,
    isFeatured: false,
    description:
      "Women's casual sneaker with a classic leather-inspired profile and subtle elevated sole.",
    sizes: [36, 37, 38, 39],
    colors: ["White", "Grey"],
  },
  {
    productCode: "RB-035",
    name: "Reebok Floatride Energy 5",
    brandName: "Reebok",
    categoryName: "Sports",
    gender: ProductGender.Women,
    basePrice: 26500,
    salePrice: null,
    isNew: true,
    isFeatured: true,
    description:
      "Women's running shoe with lightweight responsive cushioning and dependable everyday support.",
    sizes: [37, 38, 39, 40],
    colors: ["Blue", "White"],
  },
  {
    productCode: "RB-036",
    name: "Reebok Workout Plus",
    brandName: "Reebok",
    categoryName: "Men",
    gender: ProductGender.Men,
    basePrice: 19500,
    salePrice: 16500,
    isNew: false,
    isFeatured: false,
    description:
      "Minimal heritage-inspired trainer designed for casual daily wear and classic styling.",
    sizes: [40, 41, 42, 43],
    colors: ["White", "Black"],
  },
  {
    productCode: "RB-037",
    name: "Reebok Princess Casual",
    brandName: "Reebok",
    categoryName: "Women",
    gender: ProductGender.Women,
    basePrice: 15000,
    salePrice: null,
    isNew: false,
    isFeatured: false,
    description:
      "Lightweight women's casual shoe with soft cushioning for comfortable daily wear.",
    sizes: [36, 37, 38, 39],
    colors: ["Black", "White"],
  },

  // SKECHERS
  {
    productCode: "SK-038",
    name: "Skechers Arch Fit Titan",
    brandName: "Skechers",
    categoryName: "Men",
    gender: ProductGender.Men,
    basePrice: 23000,
    salePrice: 19500,
    isNew: true,
    isFeatured: true,
    description:
      "Supportive men's walking shoe designed around comfort-focused arch support and daily wear.",
    sizes: [40, 41, 42, 43, 44],
    colors: ["Navy", "Black"],
  },
  {
    productCode: "SK-039",
    name: "Skechers GO WALK 6 Iconic",
    brandName: "Skechers",
    categoryName: "Men",
    gender: ProductGender.Men,
    basePrice: 20500,
    salePrice: null,
    isNew: false,
    isFeatured: false,
    description:
      "Lightweight walking shoe with responsive cushioning built for long periods of everyday use.",
    sizes: [40, 41, 42, 43],
    colors: ["Black", "Grey"],
  },
  {
    productCode: "SK-040",
    name: "Skechers Uno Stand on Air",
    brandName: "Skechers",
    categoryName: "Women",
    gender: ProductGender.Women,
    basePrice: 21500,
    salePrice: 17900,
    isNew: true,
    isFeatured: true,
    description:
      "Women's lifestyle sneaker with visible cushioned styling and a comfortable everyday interior.",
    sizes: [36, 37, 38, 39],
    colors: ["White", "Black"],
  },
  {
    productCode: "SK-041",
    name: "Skechers Max Cushioning Elite",
    brandName: "Skechers",
    categoryName: "Sports",
    gender: ProductGender.Men,
    basePrice: 27500,
    salePrice: null,
    isNew: true,
    isFeatured: true,
    description:
      "Highly cushioned running and walking shoe built for comfort during longer active sessions.",
    sizes: [41, 42, 43, 44],
    colors: ["Black", "Blue"],
  },
  {
    productCode: "SK-042",
    name: "Skechers D'Lites Highest Fan",
    brandName: "Skechers",
    categoryName: "Women",
    gender: ProductGender.Women,
    basePrice: 22000,
    salePrice: null,
    isNew: false,
    isFeatured: false,
    description:
      "Chunky retro-inspired women's sneaker with a supportive sole and casual everyday profile.",
    sizes: [36, 37, 38, 39],
    colors: ["White", "Black"],
  },
  {
    productCode: "SK-043",
    name: "Skechers Slip-ins Ultra Flex 3.0",
    brandName: "Skechers",
    categoryName: "Women",
    gender: ProductGender.Women,
    basePrice: 24000,
    salePrice: 19900,
    isNew: true,
    isFeatured: true,
    description:
      "Hands-free inspired casual shoe designed for easy entry and flexible everyday comfort.",
    sizes: [37, 38, 39, 40],
    colors: ["Grey", "Navy"],
  },
  {
    productCode: "SK-044",
    name: "Skechers Stamina Cutback",
    brandName: "Skechers",
    categoryName: "Sports",
    gender: ProductGender.Men,
    basePrice: 18500,
    salePrice: null,
    isNew: false,
    isFeatured: false,
    description:
      "Durable athletic trainer with a cushioned insole and supportive construction for active daily use.",
    sizes: [41, 42, 43],
    colors: ["Brown", "Black"],
  },

  // ASICS
  {
    productCode: "AS-045",
    name: "ASICS GEL-Kayano 30",
    brandName: "ASICS",
    categoryName: "Sports",
    gender: ProductGender.Men,
    basePrice: 38000,
    salePrice: 32900,
    isNew: true,
    isFeatured: true,
    description:
      "Stability-oriented running shoe designed for adaptive support, cushioning, and long-distance comfort.",
    sizes: [41, 42, 43, 44],
    colors: ["Black", "Blue"],
  },
  {
    productCode: "AS-046",
    name: "ASICS GEL-Nimbus 25",
    brandName: "ASICS",
    categoryName: "Sports",
    gender: ProductGender.Unisex,
    basePrice: 36500,
    salePrice: null,
    isNew: true,
    isFeatured: true,
    description:
      "Maximum-cushion running shoe developed for soft landings and comfortable daily mileage.",
    sizes: [40, 41, 42, 43],
    colors: ["Grey", "White"],
  },
  {
    productCode: "AS-047",
    name: "ASICS GT-2000 11",
    brandName: "ASICS",
    categoryName: "Sports",
    gender: ProductGender.Women,
    basePrice: 30000,
    salePrice: 25500,
    isNew: false,
    isFeatured: false,
    description:
      "Women's stability running shoe designed to support smooth and controlled daily training.",
    sizes: [36, 37, 38, 39],
    colors: ["Blue", "Grey"],
  },
  {
    productCode: "AS-048",
    name: "ASICS Japan S Heritage",
    brandName: "ASICS",
    categoryName: "Men",
    gender: ProductGender.Unisex,
    basePrice: 21000,
    salePrice: null,
    isNew: false,
    isFeatured: false,
    description:
      "Low-top court-inspired sneaker with a clean heritage profile suitable for everyday casual styling.",
    sizes: [40, 41, 42, 43],
    colors: ["White", "Navy"],
  },
  {
    productCode: "AS-049",
    name: "ASICS Novablast 3",
    brandName: "ASICS",
    categoryName: "Sports",
    gender: ProductGender.Men,
    basePrice: 32500,
    salePrice: 27900,
    isNew: true,
    isFeatured: true,
    description:
      "Responsive running shoe with energetic cushioning designed for lively daily training.",
    sizes: [41, 42, 43, 44],
    colors: ["Black", "Green"],
  },
  {
    productCode: "AS-050",
    name: "ASICS GEL-Venture 9",
    brandName: "ASICS",
    categoryName: "Sports",
    gender: ProductGender.Women,
    basePrice: 19500,
    salePrice: null,
    isNew: false,
    isFeatured: false,
    description:
      "Women's trail-inspired running shoe designed for grip, cushioning, and mixed-surface use.",
    sizes: [37, 38, 39, 40],
    colors: ["Grey", "Black"],
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   PRODUCTION-SAFE SEED
   ───────────────────────────────────────────────────────────────────────────── */

async function main() {
  console.log("Starting production-safe catalog seed...\n");

  /* ───────────────────────────────────────────────────────────────────────────
     Optional inventory audit actor
     ─────────────────────────────────────────────────────────────────────────── */

  let actorUserId: string | null = null;

  const actorEmail = process.env.CATALOG_SEED_ACTOR_EMAIL?.trim();

  if (actorEmail) {
    const actorUser = await prisma.user.findUnique({
      where: {
        email: actorEmail,
      },
    });

    if (!actorUser) {
      console.warn(
        `[WARNING] CATALOG_SEED_ACTOR_EMAIL user "${actorEmail}" was not found.`,
      );
      console.warn(
        "[WARNING] Initial inventory will be created without InventoryAdjustment records.\n",
      );
    } else if (actorUser.role !== UserRole.ADMIN) {
      console.warn(
        `[WARNING] User "${actorEmail}" exists but does not have ADMIN role.`,
      );
      console.warn(
        "[WARNING] Initial inventory will be created without InventoryAdjustment records.\n",
      );
    } else {
      actorUserId = actorUser.id;

      console.log(`Inventory audit actor verified: ${actorUser.email}\n`);
    }
  } else {
    console.log(
      "CATALOG_SEED_ACTOR_EMAIL is not set. Inventory can still be created because InventoryAdjustment is not required by the schema.\n",
    );
  }

  /* ───────────────────────────────────────────────────────────────────────────
     Categories
     ─────────────────────────────────────────────────────────────────────────── */

  console.log("Processing categories...");

  const categoryMap = new Map<string, string>();

  for (const categoryData of CATEGORIES_DATA) {
    const slug = slugify(categoryData.name);

    const category = await prisma.category.upsert({
      where: {
        slug,
      },
      update: {},
      create: {
        name: categoryData.name,
        slug,
        description: categoryData.description,
        isActive: true,
      },
    });

    categoryMap.set(categoryData.name, category.id);
  }

  console.log(`Categories confirmed: ${categoryMap.size}\n`);

  /* ───────────────────────────────────────────────────────────────────────────
     Brands
     ─────────────────────────────────────────────────────────────────────────── */

  console.log("Processing brands...");

  const brandMap = new Map<string, string>();

  for (const brandData of BRANDS_DATA) {
    const slug = slugify(brandData.name);

    const brand = await prisma.brand.upsert({
      where: {
        slug,
      },
      update: {},
      create: {
        name: brandData.name,
        slug,
        description: brandData.description,
        isActive: true,
      },
    });

    brandMap.set(brandData.name, brand.id);
  }

  console.log(`Brands confirmed: ${brandMap.size}\n`);

  /* ───────────────────────────────────────────────────────────────────────────
     Products
     ─────────────────────────────────────────────────────────────────────────── */

  console.log(
    "Processing products, images, variants, and initial inventory...\n",
  );

  let productCount = 0;
  let variantCount = 0;
  let imageCreatedCount = 0;
  let inventoryCreatedCount = 0;
  let inventorySkippedCount = 0;
  let adjustmentCreatedCount = 0;

  for (let productIndex = 0; productIndex < PRODUCTS_DATA.length; productIndex++) {
    const item = PRODUCTS_DATA[productIndex];

    const categoryId = categoryMap.get(item.categoryName);
    const brandId = brandMap.get(item.brandName);

    if (!categoryId) {
      throw new Error(
        `Category "${item.categoryName}" was not found for product "${item.name}".`,
      );
    }

    if (!brandId) {
      throw new Error(
        `Brand "${item.brandName}" was not found for product "${item.name}".`,
      );
    }

    const slug = slugify(item.name);

    /*
     * Existing products:
     * only relationship references are refreshed.
     *
     * Operational/admin-controlled fields such as:
     * price, sale price, description, featured status and active status
     * are preserved.
     */
    const product = await prisma.product.upsert({
      where: {
        slug,
      },
      update: {
        categoryId,
        brandId,
      },
      create: {
        productCode: item.productCode,
        name: item.name,
        slug,
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

    productCount++;

    /* ─────────────────────────────────────────────────────────────────────────
       Product Images
       ───────────────────────────────────────────────────────────────────────── */

    const primaryImageUrl =
      FOOTWEAR_IMAGES[productIndex % FOOTWEAR_IMAGES.length];

    const secondaryImageUrl =
      FOOTWEAR_IMAGES[(productIndex + 5) % FOOTWEAR_IMAGES.length];

    const existingPrimaryImage = await prisma.productImage.findFirst({
      where: {
        productId: product.id,
        sortOrder: 0,
      },
    });

    if (!existingPrimaryImage) {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: primaryImageUrl,
          altText: `${item.name} primary photo`,
          sortOrder: 0,
          isPrimary: true,
        },
      });

      imageCreatedCount++;
    }

    const existingSecondaryImage = await prisma.productImage.findFirst({
      where: {
        productId: product.id,
        sortOrder: 1,
      },
    });

    if (!existingSecondaryImage) {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: secondaryImageUrl,
          altText: `${item.name} alternate photo`,
          sortOrder: 1,
          isPrimary: false,
        },
      });

      imageCreatedCount++;
    }

    /* ─────────────────────────────────────────────────────────────────────────
       Variants + Inventory
       ───────────────────────────────────────────────────────────────────────── */

    for (const color of item.colors) {
      const colorCode = color
        .substring(0, 3)
        .toUpperCase()
        .replace(/\s/g, "");

      for (const size of item.sizes) {
        const sku = `${item.productCode}-${colorCode}-${size}`;

        const variant = await prisma.productVariant.upsert({
          where: {
            sku,
          },
          update: {},
          create: {
            productId: product.id,
            sku,
            size,
            color,
            isActive: true,
          },
        });

        variantCount++;

        const existingInventory = await prisma.inventory.findUnique({
          where: {
            variantId: variant.id,
          },
        });

        /*
         * Never modify inventory that already exists.
         *
         * This prevents re-running the seed from resetting:
         * - quantityOnHand
         * - reservedQuantity
         * - lowStockThreshold
         */
        if (existingInventory) {
          inventorySkippedCount++;
          continue;
        }

        const initialQuantity =
          ((size * 7 + color.length * 3 + productIndex) % 17) + 12;

        /*
         * If we have a verified admin actor, Inventory and its audit
         * adjustment are created in ONE transaction.
         *
         * This prevents:
         * Inventory created successfully
         * +
         * InventoryAdjustment failing afterward
         */
        if (actorUserId) {
          await prisma.$transaction(async (tx) => {
            const createdInventory = await tx.inventory.create({
              data: {
                variantId: variant.id,
                quantityOnHand: initialQuantity,
                reservedQuantity: 0,
                lowStockThreshold: 5,
              },
            });

            await tx.inventoryAdjustment.create({
              data: {
                inventoryId: createdInventory.id,
                type: InventoryAdjustmentType.RESTOCK,
                onHandDelta: initialQuantity,
                reservedDelta: 0,
                beforeOnHand: 0,
                afterOnHand: initialQuantity,
                beforeReserved: 0,
                afterReserved: 0,
                reason: "Initial catalog seed stock",
                performedById: actorUserId,
              },
            });
          });

          inventoryCreatedCount++;
          adjustmentCreatedCount++;
        } else {
          /*
           * InventoryAdjustment is not mandatory according to the schema,
           * therefore initial stock can still be created safely when no
           * audit actor was explicitly provided.
           */
          await prisma.inventory.create({
            data: {
              variantId: variant.id,
              quantityOnHand: initialQuantity,
              reservedQuantity: 0,
              lowStockThreshold: 5,
            },
          });

          inventoryCreatedCount++;
        }
      }
    }
  }

  /* ───────────────────────────────────────────────────────────────────────────
     Final summary
     ─────────────────────────────────────────────────────────────────────────── */

  console.log("\n==================================================");
  console.log("CATALOG SEED COMPLETED");
  console.log("==================================================");
  console.log(`Categories confirmed:          ${categoryMap.size}`);
  console.log(`Brands confirmed:              ${brandMap.size}`);
  console.log(`Products confirmed:            ${productCount}`);
  console.log(`Variants confirmed:            ${variantCount}`);
  console.log(`New product images created:    ${imageCreatedCount}`);
  console.log(`New inventory rows created:    ${inventoryCreatedCount}`);
  console.log(`Existing inventory rows kept:  ${inventorySkippedCount}`);
  console.log(`RESTOCK adjustments created:   ${adjustmentCreatedCount}`);
  console.log("==================================================");

  console.log(
    "\nExisting categories, brands, products, variants, images, and inventory were preserved wherever applicable.",
  );
}

main()
  .catch((error) => {
    console.error("\nCatalog seed failed:");
    console.error(error);

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });