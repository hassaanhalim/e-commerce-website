import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { normalizeSlug } from "../../common/utils/slug.util";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { CategoryQueryDto } from "./dto/category-query.dto";

@Injectable()
export class AdminCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: CategoryQueryDto) {
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

    const [total, categories] = await Promise.all([
      this.prisma.category.count({ where }),
      this.prisma.category.findMany({
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

    const data = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      productCount: cat._count.products,
      isActive: cat.isActive,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
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
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: { where: { isActive: true } } },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID "${id}" not found.`);
    }

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      productCount: category._count.products,
      isActive: category.isActive,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  async create(dto: CreateCategoryDto) {
    const rawSlug = dto.slug?.trim() || dto.name;
    const slug = normalizeSlug(rawSlug);

    const existing = await this.prisma.category.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException(`Category with slug "${slug}" already exists.`);
    }

    const category = await this.prisma.category.create({
      data: {
        name: dto.name.trim(),
        slug,
        description: dto.description?.trim() || null,
        isActive: dto.isActive ?? true,
      },
    });

    return {
      ...category,
      productCount: 0,
    };
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const existingCat = await this.prisma.category.findUnique({ where: { id } });
    if (!existingCat) {
      throw new NotFoundException(`Category with ID "${id}" not found.`);
    }

    let slug = existingCat.slug;
    if (dto.slug?.trim() || dto.name?.trim()) {
      const raw = dto.slug?.trim() || dto.name!.trim();
      slug = normalizeSlug(raw);

      if (slug !== existingCat.slug) {
        const duplicate = await this.prisma.category.findUnique({ where: { slug } });
        if (duplicate) {
          throw new ConflictException(`Category with slug "${slug}" already exists.`);
        }
      }
    }

    const category = await this.prisma.category.update({
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
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      productCount: category._count.products,
      isActive: category.isActive,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }
}
