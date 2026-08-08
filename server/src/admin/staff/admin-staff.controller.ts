import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Roles } from "../../auth/decorators/roles.decorator";
import { UserRole } from "@prisma/client";
import { AdminStaffService, CreateStaffDto, UpdateStaffDto } from "./admin-staff.service";

@Controller("admin/staff")
@Roles(UserRole.ADMIN)
export class AdminStaffController {
  constructor(private readonly staffService: AdminStaffService) {}

  @Get()
  async getStaff(@Query("search") search?: string) {
    return this.staffService.findAll(search);
  }

  @Get(":id")
  async getStaffById(@Param("id") id: string) {
    return this.staffService.findOne(id);
  }

  @Post()
  async createStaff(@Body() dto: CreateStaffDto, @Req() req: any) {
    return this.staffService.create(dto, req.user.id);
  }

  @Patch(":id")
  async updateStaff(@Param("id") id: string, @Body() dto: UpdateStaffDto, @Req() req: any) {
    return this.staffService.update(id, dto, req.user.id);
  }

  @Patch(":id/status")
  async updateStaffStatus(@Param("id") id: string, @Body("isActive") isActive: boolean, @Req() req: any) {
    return this.staffService.updateStatus(id, Boolean(isActive), req.user.id);
  }
}
