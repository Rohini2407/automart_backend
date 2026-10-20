import { Module } from "@nestjs/common";
import { ShippingLabelController } from "./shippingLabel.controller";
import { ShippingLabelService } from "./shippingLabel.service";

@Module({
  controllers: [ShippingLabelController],
  providers: [ShippingLabelService],
})
export class ShippingLabelModule {}
