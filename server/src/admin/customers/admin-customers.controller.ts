import { Body, Controller, Get, Param, Patch, Query, Req } from "@nestjs/common";
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

  @Get(":id/conversations")
  async getCustomerConversations(@Param("id") id: string) {
    return this.customersService.getCustomerConversations(id);
  }

  @Get(":id/conversations/:conversationId")
  async getCustomerConversationDetail(
    @Param("id") id: string,
    @Param("conversationId") conversationId: string,
  ) {
    return this.customersService.getCustomerConversationDetail(id, conversationId);
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

