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

// Memory storage: files are held in RAM as Buffers so we can compute the
// final product_id-based filename (which depends on parsed form fields)
// before writing anything to disk. Add fileSize limits appropriate to
// your product photo sizes.
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
        product_id: { type: "string" },
        product_name: { type: "string" },
        subTitle: { type: "string" },
        main_category: { type: "string" },
        sub_category: { type: "string" },
        amount: { type: "number" },
        discount_percentage: { type: "number" },
        discount_amount: { type: "number" },
        product_description: { type: "string" },
        color: { type: "string" },
        brand: { type: "string" },
        seller: { type: "string" },
        preturn: { type: "string" },
        warranty: { type: "string" },
        orderType: { type: "string" },
        moq: { type: "number" },
        file_count: { type: "integer" },
        image0: { type: "string", format: "binary" },
        image1: { type: "string", format: "binary" },
        // add as many image{n} placeholders as your max supported count;
        // Swagger UI will show them all as optional file pickers.
      },
      required: [
        "product_id",
        "product_name",
        "main_category",
        "sub_category",
        "amount",
        "product_description",
        "seller",
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
          // Matches documented (gap) behavior: no insert, no response body.
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
      return res.status(400).json(result.errors);
    } catch (err) {
      return res
        .status(500)
        .json(err instanceof Error ? err.message : "Unexpected error");
    }
  }
}
