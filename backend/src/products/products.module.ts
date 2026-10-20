import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";
import { ProductEntity } from "./entities/product.entity";
import { SellerProductsController } from "src/sellerProducts/sellerProducts.controller";

@Module({
  imports: [TypeOrmModule.forFeature([ProductEntity])],
  controllers: [ProductsController, SellerProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
