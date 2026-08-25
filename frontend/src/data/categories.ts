import menImage from "../assets/images/category-men.webp";
import womenImage from "../assets/images/category-women.webp";
import sportsImage from "../assets/images/category-sports.webp";

export interface Category {
  id: number;
  name: string;
  description: string;
  image: string;
  link: string;
}

export const categories: Category[] = [
  { id: 1, name: "Men", description: "Everyday, formal and sports shoes for men.", image: menImage, link: "/shop?gender=Men" },
  { id: 2, name: "Women", description: "Modern and comfortable footwear for women.", image: womenImage, link: "/shop?gender=Women" },
  { id: 3, name: "Sports", description: "Performance footwear built for movement.", image: sportsImage, link: "/shop?category=Sports" },
];
