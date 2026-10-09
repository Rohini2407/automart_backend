import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Listing } from "./entities/listing.entity";
import { ListingsController } from "./listings.controller";
import { ListingsService } from "./listings.service";
import { MailModule } from "src/common/mail/mail.module";

@Module({
  imports: [TypeOrmModule.forFeature([Listing]), MailModule],
  controllers: [ListingsController],
  providers: [ListingsService],
})
export class ListingsModule {}
