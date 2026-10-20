import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  getSchemaPath,
} from "@nestjs/swagger";
import { memoryStorage } from "multer";

import { Roles } from "../common/decorators/roles.decorator"; // ⚠ adjust paths
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard"; // ⚠ adjust name/path to your guard
import { RolesGuard } from "../common/guards/roles.guard";
import { SellerAddProductDto } from "./dto/seller-add-product.dto";
import { ProductsService } from "src/products/products.service";

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];

// Swagger can't discover dynamic image0..imageN fields, so declare them (max 10) as file inputs.
const IMAGE_FIELDS = Object.fromEntries(
  Array.from({ length: 10 }, (_, i) => [
    `image${i}`,
    { type: "string", format: "binary" },
  ]),
);

/** Final URL (global prefix "api"): POST /api/seller/addproduct — active sellers only. */
@ApiTags("Seller Products")
@ApiExtraModels(SellerAddProductDto)
@ApiSecurity("app-key")
@ApiBearerAuth("access-token")
@Controller("seller")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("seller")
export class SellerProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post("addproduct")
  @HttpCode(200)
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: memoryStorage(), // same approach as your admin addproduct: buffers, written after validation
      limits: { files: 10, fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) =>
        ALLOWED_MIME.includes(file.mimetype)
          ? cb(null, true)
          : cb(
              new BadRequestException(
                "Only JPEG, PNG or WEBP images are allowed",
              ) as any,
              false,
            ),
    }),
  )
  @ApiOperation({
    summary: "Seller adds a product (multipart: fields + image0..imageN)",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      allOf: [
        { $ref: getSchemaPath(SellerAddProductDto) },
        { type: "object", properties: IMAGE_FIELDS },
      ],
    },
  })
  @ApiOkResponse({
    schema: {
      example: {
        message: "Product Added Successfully!",
        product_id: "AMsa1001",
        productStatus: "draft",
        images: ["productimages/AMsa1001_0_20261009140000.jpg"],
      },
    },
  })
  addProduct(
    @Req() req: { user: { email: string } },
    @Body() dto: SellerAddProductDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.productsService.sellerAddProduct(req.user.email, dto, files);
  }
}
