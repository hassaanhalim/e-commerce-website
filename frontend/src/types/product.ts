export type ProductGender =
  | "Men"
  | "Women"
  | "Unisex"
  | "Kids";

export interface Product {
  id: string;
  name: string;
  slug: string;
  productCode: string;
  brand: string;
  category: string;
  gender: ProductGender;
  price: number;
  salePrice?: number | null;
  displayPrice?: number;
  image: string;
  sizes: number[];
  colors: string[];
  rating: number;
  reviewCount: number;
  availableQuantity?: number;
  inStock?: boolean;
  stock?: number;
  isNew: boolean;
  isFeatured?: boolean;
  description?: string;
}