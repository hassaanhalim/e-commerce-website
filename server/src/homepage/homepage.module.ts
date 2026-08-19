import { Module } from "@nestjs/common";
import { HomepageService } from "./homepage.service";
import { PublicHomepageController } from "./homepage.controller";
import { AdminHomepageController } from "./admin-homepage.controller";

@Module({
  controllers: [PublicHomepageController, AdminHomepageController],
  providers: [HomepageService],
  exports: [HomepageService],
})
export class HomepageModule {}
