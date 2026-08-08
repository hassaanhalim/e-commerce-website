import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiCreatedResponse, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { Roles } from "../../auth/decorators/roles.decorator";
import { AdminBrandsService } from "./admin-brands.service";
import { CreateBrandDto } from "./dto/create-brand.dto";
import { UpdateBrandDto } from "./dto/update-brand.dto";
import { BrandQueryDto } from "./dto/brand-query.dto";

@ApiTags("admin-brands")
@Roles(UserRole.ADMIN)
@Controller("admin/brands")
export class AdminBrandsController {
  constructor(private readonly brandsService: AdminBrandsService) {}

  @Get()
  @ApiOperation({ summary: "List all brands (Admin)" })
  @ApiOkResponse({ description: "Brands listed successfully." })
  @ApiUnauthorizedResponse({ description: "Authentication required." })
  @ApiForbiddenResponse({ description: "Admin role required." })
  async findAll(@Query() query: BrandQueryDto) {
    return this.brandsService.findAll(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get brand by ID (Admin)" })
  @ApiOkResponse({ description: "Brand retrieved successfully." })
  @ApiUnauthorizedResponse({ description: "Authentication required." })
  @ApiForbiddenResponse({ description: "Admin role required." })
  async findOne(@Param("id") id: string) {
    return this.brandsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "Create a new brand (Admin)" })
  @ApiCreatedResponse({ description: "Brand created successfully." })
  @ApiUnauthorizedResponse({ description: "Authentication required." })
  @ApiForbiddenResponse({ description: "Admin role required." })
  async create(@Body() dto: CreateBrandDto) {
    return this.brandsService.create(dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a brand (Admin)" })
  @ApiOkResponse({ description: "Brand updated successfully." })
  @ApiUnauthorizedResponse({ description: "Authentication required." })
  @ApiForbiddenResponse({ description: "Admin role required." })
  async update(@Param("id") id: string, @Body() dto: UpdateBrandDto) {
    return this.brandsService.update(id, dto);
  }
}
