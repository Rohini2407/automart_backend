import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";
import { ProductInfoEntity } from "./entities/product-info.entity";
import { ProductImagesEntity } from "./entities/product-images.entity";

@Module({
  imports: [TypeOrmModule.forFeature([ProductInfoEntity, ProductImagesEntity])],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
