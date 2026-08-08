import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class PublicBrandsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const brands = await this.prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            products: {
              where: {
                isActive: true,
                category: { isActive: true },
                brand: { isActive: true },
              },
            },
          },
        },
      },
    });

    return brands.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      description: b.description,
      productCount: b._count.products,
    }));
  }
}
