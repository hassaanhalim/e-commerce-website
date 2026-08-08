import { Controller, Get, NotFoundException, Param, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "@prisma/client";
import { AuditQueryDto, AuditService } from "./audit.service";

@Controller("admin/audit-logs")
@Roles(UserRole.ADMIN)
export class AdminAuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async getAuditLogs(@Query() query: AuditQueryDto) {
    return this.auditService.findAll(query);
  }

  @Get(":id")
  async getAuditLogById(@Param("id") id: string) {
    const log = await this.auditService.findOne(id);
    if (!log) {
      throw new NotFoundException(`Audit log record with ID "${id}" not found.`);
    }
    return log;
  }
}
