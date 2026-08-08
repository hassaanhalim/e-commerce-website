import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { normalizeSlug } from "../../common/utils/slug.util";
import { CreateBrandDto } from "./dto/create-brand.dto";
import { UpdateBrandDto } from "./dto/update-brand.dto";
import { BrandQueryDto } from "./dto/brand-query.dto";

@Injectable()
export class AdminBrandsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: BrandQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, brands] = await Promise.all([
      this.prisma.brand.count({ where }),
      this.prisma.brand.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: { products: { where: { isActive: true } } },
          },
        },
      }),
    ]);

    const data = brands.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      description: b.description,
      productCount: b._count.products,
      isActive: b.isActive,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: { where: { isActive: true } } },
        },
      },
    });

    if (!brand) {
      throw new NotFoundException(`Brand with ID "${id}" not found.`);
    }

    return {
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      description: brand.description,
      productCount: brand._count.products,
      isActive: brand.isActive,
      createdAt: brand.createdAt,
      updatedAt: brand.updatedAt,
    };
  }

  async create(dto: CreateBrandDto) {
    const rawSlug = dto.slug?.trim() || dto.name;
    const slug = normalizeSlug(rawSlug);

    const existing = await this.prisma.brand.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException(`Brand with slug "${slug}" already exists.`);
    }

    const brand = await this.prisma.brand.create({
      data: {
        name: dto.name.trim(),
        slug,
        description: dto.description?.trim() || null,
        isActive: dto.isActive ?? true,
      },
    });

    return {
      ...brand,
      productCount: 0,
    };
  }

  async update(id: string, dto: UpdateBrandDto) {
    const existingBrand = await this.prisma.brand.findUnique({ where: { id } });
    if (!existingBrand) {
      throw new NotFoundException(`Brand with ID "${id}" not found.`);
    }

    let slug = existingBrand.slug;
    if (dto.slug?.trim() || dto.name?.trim()) {
      const raw = dto.slug?.trim() || dto.name!.trim();
      slug = normalizeSlug(raw);

      if (slug !== existingBrand.slug) {
        const duplicate = await this.prisma.brand.findUnique({ where: { slug } });
        if (duplicate) {
          throw new ConflictException(`Brand with slug "${slug}" already exists.`);
        }
      }
    }

    const brand = await this.prisma.brand.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        slug,
        description: dto.description !== undefined ? dto.description?.trim() || null : undefined,
        isActive: dto.isActive !== undefined ? dto.isActive : undefined,
      },
      include: {
        _count: {
          select: { products: { where: { isActive: true } } },
        },
      },
    });

    return {
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      description: brand.description,
      productCount: brand._count.products,
      isActive: brand.isActive,
      createdAt: brand.createdAt,
      updatedAt: brand.updatedAt,
    };
  }
}
