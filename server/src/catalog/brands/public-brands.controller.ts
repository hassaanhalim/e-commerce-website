import { Controller, Get, Header } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../../auth/decorators/public.decorator";
import { PublicBrandsService } from "./public-brands.service";

@ApiTags("brands")
@Public()
@Controller("brands")
export class PublicBrandsController {
  constructor(private readonly brandsService: PublicBrandsService) {}

  @Get()
  @Header("Cache-Control", "public, max-age=120, stale-while-revalidate=600")
  @ApiOperation({ summary: "List active brands (Public)" })
  @ApiOkResponse({ description: "Active brands listed successfully." })
  async findAll() {
    return this.brandsService.findAll();
  }
}
