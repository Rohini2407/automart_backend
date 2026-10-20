import { BadRequestException, ForbiddenException, HttpException, Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as fs from "fs/promises";
import * as path from "path";
import { ProductEntity } from "./entities/product.entity";
import { AddProductDto } from "./dto/add-product.dto";
import { AddProductImageDto } from "./dto/add-product-image.dto";
import { safeUnlink } from "src/common/utils/file-upload.util";
import { SellerAddProductDto } from "src/sellerProducts/dto/seller-add-product.dto";

export type AddProductResult =
  | { kind: "created"; body: Record<string, unknown> }
  | { kind: "duplicate" }
  | { kind: "no_files" };

export type AddProductImageResult =
  | { kind: "success" }
  | { kind: "not_found" }
  | { kind: "partial_failure"; errors: string[] };

const UPLOAD_DIR = path.join(
  process.cwd(),
  "assets",
  "uploads",
  "productimages",
);

// Legacy spec says "New Added"; products.productStatus enum is active|inactive|draft.
const SELLER_PRODUCT_STATUS = "draft";
 
// Stored extension comes from the validated mime type, never from the client filename.
const SELLER_IMAGE_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly productRepo: Repository<ProductEntity>,
  ) {}

  private readonly logger = new Logger(ProductsService.name);

  // ─── Helpers ────────────────────────────────────────────────────────────

  private buildProductId(seller: string, rawProductId: string): string {
    const combined = `AM${seller.slice(0, 2)}${rawProductId}`;
    return combined.replace(/[^a-zA-Z0-9]/g, "");
  }

  private timestamp(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return (
      `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
      `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
    );
  }

  private extractExt(originalName: string): string {
    const ext = path.extname(originalName).replace(".", "");
    return ext || "bin";
  }

  private findFileByIndex(
    files: Express.Multer.File[],
    index: number,
  ): Express.Multer.File | undefined {
    return files.find((f) => f.fieldname === `image${index}`);
  }

  private async ensureUploadDir(): Promise<void> {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }

  // ─── POST /api/addproduct ──────────────────────────────────────────────

  async addProduct(
    dto: AddProductDto,
    files: Express.Multer.File[],
  ): Promise<AddProductResult> {
    const productId = this.buildProductId(dto.seller, dto.product_id);

    const existing = await this.productRepo.findOne({
      where: { productId },
    });
    if (existing) {
      return { kind: "duplicate" };
    }

    if (dto.file_count === 0) {
      return { kind: "no_files" };
    }

    await this.ensureUploadDir();

    const savedImagePaths: string[] = [];
    for (let i = 0; i < dto.file_count; i++) {
      const file = this.findFileByIndex(files, i);
      if (!file) {
        throw new Error(`Missing image file for index ${i}`);
      }
      const ext = this.extractExt(file.originalname);
      const filename = `${productId}_${i}_${this.timestamp()}.${ext}`;
      const destPath = path.join(UPLOAD_DIR, filename);
      await fs.writeFile(destPath, file.buffer);
      savedImagePaths.push(path.join("productimages", filename));
    }

    // Images now live directly on the products row as JSON.
    const productRow = this.productRepo.create({
      productId,
      productName: dto.product_name,
      subTitle: dto.subTitle,
      mainCategory: dto.main_category,
      subCategory: dto.sub_category,
      color: dto.color,
      brand: dto.brand,
      amount: dto.amount,
      discountPercentage: dto.discount_percentage,
      discountAmount: dto.discount_amount,
      productDescription: dto.product_description,
      stock: dto.stock,
      stockStatus: dto.stock_status,
      preturn: dto.preturn,
      warranty: dto.warranty,
      seller: dto.seller,
      actualweight: dto.actualweight,
      finalWeight: dto.finalWeight,
      length: dto.length,
      width: dto.width,
      height: dto.height,
      volumetricWeight: dto.volumetricWeight,
      fuelType: dto.fuelType,
      transmissionType: dto.transmissionType,
      hsnCode: dto.hsnCode,
      gstPercentage: dto.gstPercentage,
      expectedPrice: dto.expectedPrice,
      gstPrice: dto.gstPrice,
      indirectFee: dto.indirectFee,
      platformFee: dto.platformFee,
      shippingCharges: dto.shippingCharges,
      partnumber: dto.partnumber,
      vehicleName: dto.vehicleName,
      vehicleVariant: dto.vehicleVariant,
      vehicleBrand: dto.vehicleBrand,
      materialtype: dto.materialtype,
      productStatus: dto.productStatus,
      remark: dto.remark,
      images: savedImagePaths,
    });
    await this.productRepo.save(productRow);

    return {
      kind: "created",
      body: {
        ...dto,
        product_id: productId,
      },
    };
  }

  // ─── POST /api/seller/addproduct ───────────────────────────────────────
  // Same flow as admin addProduct, but: seller comes from the JWT (not the
  // body), productStatus is forced to "draft", stock_status comes from the
  // request, and all shipping / GST / vehicle fields are persisted.
  async sellerAddProduct(
    sellerEmail: string,
    dto: SellerAddProductDto,
    files: Express.Multer.File[] = [],
  ) {
    if (dto.seller && dto.seller.toLowerCase() !== sellerEmail.toLowerCase()) {
      throw new ForbiddenException(
        "You can only add products for your own seller account",
      );
    }
    if (dto.discount_amount > dto.amount) {
      throw new BadRequestException(
        "discount_amount (selling price) cannot exceed amount (MRP)",
      );
    }

    // Validate every image is present BEFORE touching disk / DB.
    const images: Express.Multer.File[] = [];
    for (let i = 0; i < dto.file_count; i++) {
      const file = this.findFileByIndex(files, i);
      if (!file) {
        throw new BadRequestException(
          `Missing file field "image${i}" (file_count = ${dto.file_count})`,
        );
      }
      images.push(file);
    }

    const productId = this.buildProductId(sellerEmail, dto.product_id);

    const existing = await this.productRepo.findOne({
      where: { productId },
      select: { id: true },
    });
    if (existing) {
      throw new ForbiddenException("Please Enter Unique Product ID");
    }

    const writtenFiles: string[] = [];
    try {
      await this.ensureUploadDir();

      const savedImagePaths: string[] = [];
      for (let i = 0; i < images.length; i++) {
        const ext = SELLER_IMAGE_EXT[images[i].mimetype];
        const filename = `${productId}_${i}_${this.timestamp()}${ext}`;
        const destPath = path.join(UPLOAD_DIR, filename);
        await fs.writeFile(destPath, images[i].buffer);
        writtenFiles.push(destPath);
        // posix join: stored path must use "/" even when running on Windows
        savedImagePaths.push(path.posix.join("productimages", filename));
      }

      await this.productRepo.save(
        this.productRepo.create({
          productId,
          productName: dto.product_name,
          subTitle: dto.subTitle ?? "",
          mainCategory: dto.main_category,
          subCategory: dto.sub_category,
          color: dto.color ?? "",
          brand: dto.brand ?? "",
          amount: dto.amount,
          discountPercentage: dto.discount_percentage ?? 0,
          discountAmount: dto.discount_amount,
          productDescription: dto.product_description,
          stock: dto.stock ?? 0,
          stockStatus: dto.stockStatus,
          preturn: dto.preturn ?? "no",
          warranty: dto.warranty ?? "",
          seller: sellerEmail,
          actualweight: dto.actualweight ?? 0,
          finalWeight: dto.finalWeight ?? 0,
          length: dto.length ?? 0,
          width: dto.width ?? 0,
          height: dto.height ?? 0,
          volumetricWeight: dto.volumetricWeight ?? 0,
          fuelType: dto.fuelType ?? "",
          transmissionType: dto.transmissionType ?? "",
          hsnCode: dto.hsnCode ?? "",
          gstPercentage: dto.gstPercentage ?? 0,
          expectedPrice: dto.expectedPrice ?? 0,
          gstPrice: dto.gstPrice ?? 0,
          indirectFee: dto.indirectFee ?? 0,
          platformFee: dto.platformFee ?? 0,
          shippingCharges: dto.shippingCharges ?? 0,
          partnumber: dto.partnumber ?? "",
          vehicleName: dto.vehicleName ?? "",
          vehicleVariant: dto.vehicleVariant ?? "",
          vehicleBrand: dto.vehicleBrand ?? "",
          materialtype: dto.materialtype ?? "",
          orderType: dto.orderType ?? "retail",
          moq: dto.moq ?? 1,
          productStatus: SELLER_PRODUCT_STATUS,
          images: savedImagePaths,
        }),
      );

      return {
        message: "Product Added Successfully!",
        product_id: productId,
        productStatus: SELLER_PRODUCT_STATUS,
        images: savedImagePaths,
      };
    } catch (err) {
      // never leave orphan files behind
      await Promise.all(writtenFiles.map((p) => safeUnlink(p)));

      // two simultaneous requests with the same ID: the unique key decides
      const code = (err as any)?.driverError?.code ?? (err as any)?.code;
      if (code === "ER_DUP_ENTRY") {
        throw new ForbiddenException("Please Enter Unique Product ID");
      }
      if (err instanceof HttpException) throw err;

      this.logger.error(
        `Failed to add product ${productId}`,
        (err as Error).stack,
      );
      throw new InternalServerErrorException(
        "Unable to add product. Please try again later.",
      );
    }
  }
  
  // ─── POST /api/addproductimage ─────────────────────────────────────────
  // Appends to the existing product's `images` JSON array instead of
  // inserting rows into a child table (that table no longer exists).

  async addProductImage(
    dto: AddProductImageDto,
    files: Express.Multer.File[],
  ): Promise<AddProductImageResult> {
    console.log("file_count:", dto.file_count, typeof dto.file_count);
    console.log(
      "incoming fieldnames:",
      files.map((f) => f.fieldname),
    );
    const product = await this.productRepo.findOne({
      where: { productId: dto.product_id },
    });
    if (!product) {
      return { kind: "not_found" };
    }

    await this.ensureUploadDir();

    const errors: string[] = [];
    const newPaths: string[] = [];

    for (let i = 0; i < dto.file_count; i++) {
      try {
        const file = this.findFileByIndex(files, i);
        if (!file || !file.buffer || file.buffer.length === 0) {
          errors.push(`Error uploading image ${i}`);
          continue;
        }

        const ext = this.extractExt(file.originalname);
        const filename = `${dto.product_id}_${i}_${this.timestamp()}.${ext}`;
        const destPath = path.join(UPLOAD_DIR, filename);

        await fs.writeFile(destPath, file.buffer);
        newPaths.push(path.join("productimages", filename));
      } catch {
        errors.push(`Error uploading image ${i}`);
      }
    }

    if (newPaths.length > 0) {
      product.images = [...(product.images ?? []), ...newPaths];
      await this.productRepo.save(product);
    }

    if (errors.length === 0) {
      return { kind: "success" };
    }
    return { kind: "partial_failure", errors };
  }
}
