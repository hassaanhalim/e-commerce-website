import { Controller, Get, Header } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";
import { HomepageService } from "./homepage.service";

@ApiTags("homepage")
@Public()
@Controller("homepage")
export class PublicHomepageController {
  constructor(private readonly homepageService: HomepageService) {}

  @Get()
  @Header("Cache-Control", "public, max-age=60, stale-while-revalidate=300")
  @ApiOperation({ summary: "Get public homepage content and settings (Public)" })
  @ApiOkResponse({ description: "Homepage settings retrieved successfully." })
  async getHomepageSettings() {
    return this.homepageService.getHomepageSettings();
  }
}
