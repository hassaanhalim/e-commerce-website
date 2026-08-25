import { Controller, Get, Header } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../../auth/decorators/public.decorator";
import { PublicCategoriesService } from "./public-categories.service";

@ApiTags("categories")
@Public()
@Controller("categories")
export class PublicCategoriesController {
  constructor(private readonly categoriesService: PublicCategoriesService) {}

  @Get()
  @Header("Cache-Control", "public, max-age=120, stale-while-revalidate=600")
  @ApiOperation({ summary: "List active categories (Public)" })
  @ApiOkResponse({ description: "Active categories listed successfully." })
  async findAll() {
    return this.categoriesService.findAll();
  }
}
