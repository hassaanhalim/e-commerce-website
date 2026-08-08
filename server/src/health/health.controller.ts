import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { PrismaService } from "../prisma/prisma.service";
import { Public } from "../auth/decorators/public.decorator";

@Controller("health")
@ApiTags("health")
@Public()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: "Get basic service health" })
  @ApiResponse({ status: 200, description: 'Service health status' })
  getHealth() {
    return {
      status: "ok",
      service: "shoe-store-server",
      timestamp: new Date().toISOString(),
    };
  }

  @Get("database")
  @ApiOperation({ summary: "Check database connectivity" })
  @ApiResponse({ status: 200, description: 'Database connectivity result' })
  async getDatabaseHealth() {
    const start = Date.now();
    try {
      const result = await this.prisma.$queryRaw`SELECT 1 as result`;
      return {
        status: "ok",
        database: true,
        result,
        latencyMs: Date.now() - start,
      };
    } catch (error: any) {
      return {
        status: "error",
        database: false,
        message: error?.message ?? String(error),
        latencyMs: Date.now() - start,
      };
    }
  }
}