import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiCreatedResponse, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { Roles } from "../../auth/decorators/roles.decorator";
import { AdminProductsService } from "./admin-products.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { ProductQueryDto } from "./dto/product-query.dto";

@ApiTags("admin-products")
@Roles(UserRole.ADMIN)
@Controller("admin/products")
export class AdminProductsController {
  constructor(private readonly productsService: AdminProductsService) {}

  @Get()
  @ApiOperation({ summary: "List all products (Admin)" })
  @ApiOkResponse({ description: "Products listed successfully." })
  @ApiUnauthorizedResponse({ description: "Authentication required." })
  @ApiForbiddenResponse({ description: "Admin role required." })
  async findAll(@Query() query: ProductQueryDto) {
    return this.productsService.findAll(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get product by ID (Admin)" })
  @ApiOkResponse({ description: "Product retrieved successfully." })
  @ApiUnauthorizedResponse({ description: "Authentication required." })
  @ApiForbiddenResponse({ description: "Admin role required." })
  async findOne(@Param("id") id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "Create a new product with variants and images (Admin)" })
  @ApiCreatedResponse({ description: "Product created successfully." })
  @ApiUnauthorizedResponse({ description: "Authentication required." })
  @ApiForbiddenResponse({ description: "Admin role required." })
  async create(
    @Body() dto: CreateProductDto,
    @CurrentUser() user?: { id: string },
  ) {
    return this.productsService.create(dto, user?.id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a product, its variants and images (Admin)" })
  @ApiOkResponse({ description: "Product updated successfully." })
  @ApiUnauthorizedResponse({ description: "Authentication required." })
  @ApiForbiddenResponse({ description: "Admin role required." })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user?: { id: string },
  ) {
    return this.productsService.update(id, dto, user?.id);
  }
}
