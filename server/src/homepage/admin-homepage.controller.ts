import { Body, Controller, Get, Patch } from "@nestjs/common";
import { ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { HomepageService } from "./homepage.service";
import { UpdateHomepageSettingsDto } from "./dto/update-homepage-settings.dto";

@ApiTags("admin-homepage-settings")
@Roles(UserRole.ADMIN)
@Controller("admin/settings/homepage")
export class AdminHomepageController {
  constructor(private readonly homepageService: HomepageService) {}

  @Get()
  @ApiOperation({ summary: "Get homepage settings (Admin)" })
  @ApiOkResponse({ description: "Homepage settings retrieved successfully." })
  @ApiUnauthorizedResponse({ description: "Authentication required." })
  @ApiForbiddenResponse({ description: "Admin role required." })
  async getSettings() {
    return this.homepageService.getHomepageSettings();
  }

  @Patch()
  @ApiOperation({ summary: "Update homepage settings and content (Admin)" })
  @ApiOkResponse({ description: "Homepage settings updated successfully." })
  @ApiUnauthorizedResponse({ description: "Authentication required." })
  @ApiForbiddenResponse({ description: "Admin role required." })
  async updateSettings(
    @Body() dto: UpdateHomepageSettingsDto,
    @CurrentUser() user?: { id: string },
  ) {
    return this.homepageService.updateHomepageSettings(dto, user?.id);
  }
}
