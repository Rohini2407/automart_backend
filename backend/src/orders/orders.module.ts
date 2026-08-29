import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ProductEntity } from "../products/entities/product.entity";
import { OrderEntity } from "./entities/order.entity";
import { UserEntity } from "../auth/entities/user.entity";

import { AuthModule } from "../auth/auth.module"; // exports JwtModule → gives us JwtService
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { CouponService } from "./coupon.service";
import { MailService } from "src/common/mail/mail.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductEntity, OrderEntity, UserEntity]),
    AuthModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, CouponService, MailService],
})
export class OrderModule {}
