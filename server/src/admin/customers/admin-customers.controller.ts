import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Roles } from "../../auth/decorators/roles.decorator";
import { UserRole } from "@prisma/client";
import { AdminCustomersService, CustomerQueryDto } from "./admin-customers.service";

@Controller("admin/customers")
@Roles(UserRole.ADMIN)
export class AdminCustomersController {
  constructor(private readonly customersService: AdminCustomersService) {}

  @Get()
  async getCustomers(@Query() query: CustomerQueryDto) {
    return this.customersService.findAll(query);
  }

  @Get(":id")
  async getCustomerById(@Param("id") id: string) {
    return this.customersService.findOne(id);
  }

  @Patch(":id/status")
  async updateCustomerStatus(
    @Param("id") id: string,
    @Body("isActive") isActive: boolean,
    @Req() req: any,
  ) {
    return this.customersService.updateStatus(id, Boolean(isActive), req.user.id);
  }
}
