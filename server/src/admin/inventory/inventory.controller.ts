import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBadRequestResponse, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { Roles } from "../../auth/decorators/roles.decorator";
import { AdjustInventoryDto } from "./dto/adjust-inventory.dto";
import { InventoryQueryDto } from "./dto/inventory-query.dto";
import { UpdateThresholdDto } from "./dto/update-threshold.dto";
import { InventoryService } from "./inventory.service";

@ApiTags("admin-inventory")
@Roles(UserRole.ADMIN)
@Controller("admin/inventory")
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ApiOperation({ summary: "List inventory for all product variants (Admin)" })
  @ApiOkResponse({ description: "Inventory listed successfully." })
  @ApiUnauthorizedResponse({ description: "Authentication required." })
  @ApiForbiddenResponse({ description: "Admin role required." })
  async findAll(@Query() query: InventoryQueryDto) {
    return this.inventoryService.findAll(query);
  }

  @Get(":variantId")
  @ApiOperation({ summary: "Get inventory by variant ID (Admin)" })
  @ApiOkResponse({ description: "Inventory retrieved successfully." })
  @ApiUnauthorizedResponse({ description: "Authentication required." })
  @ApiForbiddenResponse({ description: "Admin role required." })
  async findOne(@Param("variantId") variantId: string) {
    return this.inventoryService.findOne(variantId);
  }

  @Get(":variantId/history")
  @ApiOperation({ summary: "Get inventory adjustment history (Admin)" })
  @ApiOkResponse({ description: "Inventory history retrieved successfully." })
  @ApiUnauthorizedResponse({ description: "Authentication required." })
  @ApiForbiddenResponse({ description: "Admin role required." })
  async history(@Param("variantId") variantId: string) {
    return this.inventoryService.getHistory(variantId);
  }

  @Post(":variantId/adjust")
  @ApiOperation({ summary: "Adjust inventory levels (Admin)" })
  @ApiOkResponse({ description: "Inventory adjusted successfully." })
  @ApiBadRequestResponse({ description: "Invalid adjustment payload or stock constraint violation." })
  @ApiUnauthorizedResponse({ description: "Authentication required." })
  @ApiForbiddenResponse({ description: "Admin role required." })
  async adjust(
    @Param("variantId") variantId: string,
    @Body() dto: AdjustInventoryDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.inventoryService.adjust(variantId, dto, user.id);
  }

  @Patch(":variantId/threshold")
  @ApiOperation({ summary: "Update low-stock threshold (Admin)" })
  @ApiOkResponse({ description: "Inventory threshold updated successfully." })
  @ApiBadRequestResponse({ description: "Invalid threshold value." })
  @ApiUnauthorizedResponse({ description: "Authentication required." })
  @ApiForbiddenResponse({ description: "Admin role required." })
  async updateThreshold(
    @Param("variantId") variantId: string,
    @Body() dto: UpdateThresholdDto,
  ) {
    return this.inventoryService.updateThreshold(variantId, dto.lowStockThreshold);
  }
}