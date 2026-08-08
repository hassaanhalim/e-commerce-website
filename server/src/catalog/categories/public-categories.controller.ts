import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../../auth/decorators/public.decorator";
import { PublicCategoriesService } from "./public-categories.service";

@ApiTags("categories")
@Public()
@Controller("categories")
export class PublicCategoriesController {
  constructor(private readonly categoriesService: PublicCategoriesService) {}

  @Get()
  @ApiOperation({ summary: "List active categories (Public)" })
  @ApiOkResponse({ description: "Active categories listed successfully." })
  async findAll() {
    return this.categoriesService.findAll();
  }
}
