import {
  Controller,
  Post,
  Body,
  UploadedFiles,
  UseInterceptors,
  Res,
  InternalServerErrorException,
} from "@nestjs/common";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Response } from "express";
import { memoryStorage } from "multer";
import { AddProductDto } from "./dto/add-product.dto";
import { ProductsService } from "./products.service";
import { AddProductImageDto } from "./dto/add-product-image.dto";

const uploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
};

@ApiTags("Products")
@ApiBearerAuth("access-token")
@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ─── POST /api/addproduct ────────────────────────────────────────────
  @Post("addproduct")
  @ApiOperation({ summary: "Add a new product with images" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        product_id: { type: "string", example: "12345" },
        seller: { type: "string", example: "AutoMart" },
        product_name: { type: "string", example: "Brake Pad Set" },
        subTitle: { type: "string", example: "Front axle, ceramic compound" },
        main_category: { type: "string", example: "Brakes" },
        sub_category: { type: "string", example: "Brake Pads" },
        color: { type: "string", example: "Black" },
        brand: { type: "string", example: "Bosch" },
        amount: { type: "number", example: 1499.0 },
        discount_percentage: { type: "number", example: 10 },
        discount_amount: { type: "number", example: 150 },
        product_description: {
          type: "string",
          example: "High-performance ceramic brake pads...",
        },
        stock: { type: "integer", example: 100 },
        warranty: { type: "string", example: "12 months" },

        actualweight: { type: "number", example: 0.85 },
        finalWeight: { type: "number", example: 0.95 },
        length: { type: "number", example: 20 },
        width: { type: "number", example: 15 },
        height: { type: "number", example: 8 },
        volumetricWeight: { type: "number", example: 1.92 },

        fuelType: { type: "string", example: "Petrol" },
        transmissionType: { type: "string", example: "Manual" },
        vehicleBrand: { type: "string", example: "Maruti Suzuki" },
        vehicleName: { type: "string", example: "Swift" },
        vehicleVariant: { type: "string", example: "VXI" },

        hsnCode: { type: "string", example: "87083000" },
        gstPercentage: { type: "number", example: 18 },
        expectedPrice: { type: "number", example: 1270.34 },
        gstPrice: { type: "number", example: 1499.0 },

        indirectFee: { type: "number", example: 20 },
        platformFee: { type: "number", example: 50 },
        shippingCharges: { type: "number", example: 80 },

        partnumber: { type: "string", example: "BP-2044-FR" },
        materialtype: { type: "string", example: "Rubber & Metal Alloy" },

        preturn: { type: "string", enum: ["yes", "no"], example: "yes" },
        stock_status: {
          type: "string",
          enum: ["in_stock", "out_of_stock", "low_stock"],
          example: "in_stock",
        },
        productStatus: {
          type: "string",
          enum: ["active", "inactive", "draft"],
          example: "active",
        },
        remark: { type: "string", example: "Pending QC review" },

        file_count: { type: "integer", example: 2 },
        image0: { type: "string", format: "binary" },
        image1: { type: "string", format: "binary" },
        // add more image{n} entries here if you support more per product
      },
      required: [
        "product_id",
        "seller",
        "product_name",
        "subTitle",
        "main_category",
        "sub_category",
        "color",
        "brand",
        "amount",
        "product_description",
        "warranty",
        "actualweight",
        "finalWeight",
        "length",
        "width",
        "height",
        "volumetricWeight",
        "fuelType",
        "transmissionType",
        "vehicleBrand",
        "vehicleName",
        "vehicleVariant",
        "hsnCode",
        "gstPercentage",
        "expectedPrice",
        "gstPrice",
        "partnumber",
        "materialtype",
        "file_count",
      ],
    },
  })
  @UseInterceptors(AnyFilesInterceptor(uploadOptions))
  async addProduct(
    @Body() dto: AddProductDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Res() res: Response,
  ) {
    try {
      const result = await this.productsService.addProduct(dto, files ?? []);

      switch (result.kind) {
        case "duplicate":
          return res.status(403).json("Please Enter Unique Product ID");

        case "no_files":
          return res.status(200).end();

        case "created":
          return res.status(200).json(result.body);
      }
    } catch (err) {
      throw new InternalServerErrorException(
        err instanceof Error ? err.message : "Unexpected error",
      );
    }
  }

  // ─── POST /api/addproductimage ───────────────────────────────────────
  @Post("addproductimage")
  @ApiOperation({ summary: "Append additional images to an existing product" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(AnyFilesInterceptor(uploadOptions))
  async addProductImage(
    @Body() dto: AddProductImageDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Res() res: Response,
  ) {
    try {
      const result = await this.productsService.addProductImage(
        dto,
        files ?? [],
      );

      if (result.kind === "success") {
        return res.status(200).json("Product images added successfully");
      }
      if (result.kind === "not_found") {
        return res.status(404).json("Product not found");
      }
      return res.status(400).json(result.errors);
    } catch (err) {
      return res
        .status(500)
        .json(err instanceof Error ? err.message : "Unexpected error");
    }
  }
}
