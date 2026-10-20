import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SiteContentEntity } from "../site-content/entities/site-content.entity"; 
import { ShippingRateController } from "./shippingRate.controller";
import { ShippingRateService } from "./shippingRate.service";

@Module({
  imports: [TypeOrmModule.forFeature([SiteContentEntity])],
  controllers: [ShippingRateController],
  providers: [ShippingRateService],
})
export class ShippingRateModule {}
