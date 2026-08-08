import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiBadRequestResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../../auth/decorators/public.decorator";
import { PublicProductsService } from "./public-products.service";
import { PublicProductQueryDto } from "./dto/public-product-query.dto";

@ApiTags("products")
@Public()
@Controller("products")
export class PublicProductsController {
  constructor(private readonly productsService: PublicProductsService) {}

  @Get()
  @ApiOperation({ summary: "List active catalog products with filtering and pagination (Public)" })
  @ApiOkResponse({ description: "Products listed successfully." })
  @ApiBadRequestResponse({ description: "Invalid query parameters or price range." })
  async findAll(@Query() query: PublicProductQueryDto) {
    return this.productsService.findAll(query);
  }

  @Get(":slug")
  @ApiOperation({ summary: "Get detailed catalog product by slug (Public)" })
  @ApiOkResponse({ description: "Product details retrieved successfully." })
  @ApiNotFoundResponse({ description: "Product not found or inactive." })
  async findBySlug(@Param("slug") slug: string) {
    return this.productsService.findBySlug(slug);
  }
}
