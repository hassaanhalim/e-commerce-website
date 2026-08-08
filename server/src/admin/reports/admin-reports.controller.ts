import { Controller, Get, Header, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Roles } from "../../auth/decorators/roles.decorator";
import { UserRole } from "@prisma/client";
import { AdminReportsService, ReportFilterDto } from "./admin-reports.service";

@Controller("admin/reports")
@Roles(UserRole.ADMIN)
export class AdminReportsController {
  constructor(private readonly reportsService: AdminReportsService) {}

  @Get("sales")
  async getSalesReport(@Query() query: ReportFilterDto) {
    return this.reportsService.getSalesReport(query);
  }

  @Get("sales/export")
  @Header("Content-Type", "text/csv")
  @Header("Content-Disposition", 'attachment; filename="sales_report.csv"')
  async exportSalesReport(@Query() query: ReportFilterDto) {
    return this.reportsService.exportSalesReportCSV(query);
  }

  @Get("orders")
  async getOrdersReport(@Query() query: ReportFilterDto) {
    return this.reportsService.getOrdersReport(query);
  }

  @Get("orders/export")
  @Header("Content-Type", "text/csv")
  @Header("Content-Disposition", 'attachment; filename="orders_report.csv"')
  async exportOrdersReport(@Query() query: ReportFilterDto) {
    return this.reportsService.exportOrdersReportCSV(query);
  }

  @Get("products")
  async getProductsReport(@Query() query: ReportFilterDto) {
    return this.reportsService.getProductsReport(query);
  }

  @Get("inventory")
  async getInventoryReport() {
    return this.reportsService.getInventoryReport();
  }

  @Get("inventory/export")
  @Header("Content-Type", "text/csv")
  @Header("Content-Disposition", 'attachment; filename="inventory_report.csv"')
  async exportInventoryReport() {
    return this.reportsService.exportInventoryReportCSV();
  }

  @Get("customers")
  async getCustomersReport(@Query() query: ReportFilterDto) {
    return this.reportsService.getCustomersReport(query);
  }

  @Get("returns")
  async getReturnsReport(@Query() query: ReportFilterDto) {
    return this.reportsService.getReturnsReport(query);
  }
}
