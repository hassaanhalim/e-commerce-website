import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { UpdateHomepageSettingsDto } from "./dto/update-homepage-settings.dto";

const DEFAULT_STATS = [
  { value: "100%", label: "Quality checked", sortOrder: 0, enabled: true },
  { value: "7 Days", label: "Exchange policy", sortOrder: 1, enabled: true },
  { value: "PKR 5K", label: "Free shipping", sortOrder: 2, enabled: true },
];

const DEFAULT_BENEFITS = [
  {
    title: "Reliable Delivery",
    description: "Fast shipping across Pakistan. Free delivery on orders above PKR 5,000.",
    iconKey: "truck",
    sortOrder: 0,
    enabled: true,
  },
  {
    title: "7-Day Exchange Policy",
    description: "Not the right size? Exchange unused shoes easily within 7 days.",
    iconKey: "exchange",
    sortOrder: 1,
    enabled: true,
  },
  {
    title: "100% Authentic Quality",
    description: "All footwear is quality checked before dispatch to guarantee standard.",
    iconKey: "shield",
    sortOrder: 2,
    enabled: true,
  },
  {
    title: "Customer Support",
    description: "Dedicated support team available via phone and email to assist your purchase.",
    iconKey: "support",
    sortOrder: 3,
    enabled: true,
  },
];

@Injectable()
export class HomepageService {
  private readonly logger = new Logger(HomepageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Safe Get-or-Create Singleton Settings
   */
  async getHomepageSettings() {
    let settings = await this.prisma.homepageSettings.findUnique({
      where: { id: "default" },
      include: {
        stats: { orderBy: { sortOrder: "asc" } },
        benefits: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!settings) {
      this.logger.log("No HomepageSettings record found. Creating default settings...");
      settings = await this.prisma.homepageSettings.create({
        data: {
          id: "default",
          stats: {
            create: DEFAULT_STATS,
          },
          benefits: {
            create: DEFAULT_BENEFITS,
          },
        },
        include: {
          stats: { orderBy: { sortOrder: "asc" } },
          benefits: { orderBy: { sortOrder: "asc" } },
        },
      });
    }

    return settings;
  }

  /**
   * Update Homepage Settings (Admin)
   */
  async updateHomepageSettings(dto: UpdateHomepageSettingsDto, actorUserId?: string) {
    // Ensure settings record exists
    await this.getHomepageSettings();

    const { stats, benefits, id, createdAt, updatedAt, ...scalarFields } = dto;

    await this.prisma.$transaction(async (tx) => {
      // 1. Update scalar fields on HomepageSettings
      if (Object.keys(scalarFields).length > 0) {
        await tx.homepageSettings.update({
          where: { id: "default" },
          data: scalarFields,
        });
      }

      // 2. Update Stats if provided
      if (stats !== undefined) {
        await tx.homepageStat.deleteMany({ where: { settingsId: "default" } });
        if (stats.length > 0) {
          await tx.homepageStat.createMany({
            data: stats.map((st, idx) => ({
              settingsId: "default",
              value: st.value,
              label: st.label,
              enabled: st.enabled ?? true,
              sortOrder: st.sortOrder ?? idx,
            })),
          });
        }
      }

      // 3. Update Benefits if provided
      if (benefits !== undefined) {
        await tx.homepageBenefit.deleteMany({ where: { settingsId: "default" } });
        if (benefits.length > 0) {
          await tx.homepageBenefit.createMany({
            data: benefits.map((bn, idx) => ({
              settingsId: "default",
              title: bn.title,
              description: bn.description,
              iconKey: bn.iconKey || "truck",
              enabled: bn.enabled ?? true,
              sortOrder: bn.sortOrder ?? idx,
            })),
          });
        }
      }
    });

    // Write audit log
    await this.auditService.logAction({
      actorUserId,
      action: "HOMEPAGE_SETTINGS_UPDATED",
      entityType: "HomepageSettings",
      entityId: "default",
      description: "Updated homepage content settings and layout sections",
    });

    return this.getHomepageSettings();
  }
}
