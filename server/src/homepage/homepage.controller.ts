import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";
import { HomepageService } from "./homepage.service";

@ApiTags("homepage")
@Public()
@Controller("homepage")
export class PublicHomepageController {
  constructor(private readonly homepageService: HomepageService) {}

  @Get()
  @ApiOperation({ summary: "Get public homepage content and settings (Public)" })
  @ApiOkResponse({ description: "Homepage settings retrieved successfully." })
  async getHomepageSettings() {
    return this.homepageService.getHomepageSettings();
  }
}
