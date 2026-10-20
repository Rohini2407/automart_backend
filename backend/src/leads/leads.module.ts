import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SiteContentEntity } from "../site-content/entities/site-content.entity"; // ⚠ adjust
import { MailModule } from "../common/mail/mail.module"; // ⚠ adjust; must export MailService
import { LeadsController } from "./leads.controller";
import { LeadsService } from "./leads.service";

@Module({
  imports: [TypeOrmModule.forFeature([SiteContentEntity]), MailModule],
  controllers: [LeadsController],
  providers: [LeadsService],
})
export class LeadsModule {}
