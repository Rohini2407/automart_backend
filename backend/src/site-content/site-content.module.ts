import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SiteContentEntity } from "./entities/site-content.entity";
import { SiteContentController } from "./site-content.controller";
import { SiteContentService } from "./site-content.service";

@Module({
  imports: [TypeOrmModule.forFeature([SiteContentEntity])],
  controllers: [SiteContentController],
  providers: [SiteContentService],
})
export class SiteContentModule {}
