import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as fs from "fs/promises";
import * as path from "path";
import { ProductEntity } from "./entities/product.entity";
import { AddProductDto } from "./dto/add-product.dto";
import { AddProductImageDto } from "./dto/add-product-image.dto";

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

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly productRepo: Repository<ProductEntity>,
  ) {}

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
