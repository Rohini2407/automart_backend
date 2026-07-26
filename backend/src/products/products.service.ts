import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as fs from "fs/promises";
import * as path from "path";
import { ProductInfoEntity } from "./entities/product-info.entity";
import { ProductImagesEntity } from "./entities/product-images.entity";
import { AddProductDto } from "./dto/add-product.dto";
import { AddProductImageDto } from "./dto/add-product-image.dto";


// Result shapes the controller uses to decide status code + body,
// since the spec's response bodies don't follow Nest's default
// { statusCode, message } envelope.
export type AddProductResult =
  | { kind: "created"; body: Record<string, unknown> }
  | { kind: "duplicate" }
  | { kind: "no_files" };

export type AddProductImageResult =
  | { kind: "success" }
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
    @InjectRepository(ProductInfoEntity)
    private readonly productInfoRepo: Repository<ProductInfoEntity>,
    @InjectRepository(ProductImagesEntity)
    private readonly productImagesRepo: Repository<ProductImagesEntity>,
  ) {}

  // ─── Helpers ────────────────────────────────────────────────────────────

  /** AM + first 2 chars of seller + raw product_id input, alphanumeric only. */
  private buildProductId(seller: string, rawProductId: string): string {
    const combined = `AM${seller.slice(0, 2)}${rawProductId}`;
    return combined.replace(/[^a-zA-Z0-9]/g, "");
  }

  /** YmdHis timestamp, e.g. 20240514153022 */
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

  /** Files come in via AnyFilesInterceptor; pick out fieldname `image{index}`. */
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

    const existing = await this.productInfoRepo.findOne({
      where: { productId },
    });
    if (existing) {
      return { kind: "duplicate" };
    }

    // Documented (if odd) behavior: file_count == 0 skips the insert
    // entirely and no response is returned. Kept as-is to match the
    // existing spec — flagged in the README as a gap worth fixing later.
    if (dto.file_count === 0) {
      return { kind: "no_files" };
    }

    await this.ensureUploadDir();

    const savedImagePaths: string[] = [];
    for (let i = 0; i < dto.file_count; i++) {
      const file = this.findFileByIndex(files, i);
      if (!file) {
        // Required per spec (file_count must match provided files);
        // fail the whole request rather than silently skipping.
        throw new Error(`Missing image file for index ${i}`);
      }
      const ext = this.extractExt(file.originalname);
      const filename = `${productId}_${i}_${this.timestamp()}.${ext}`;
      const destPath = path.join(UPLOAD_DIR, filename);
      await fs.writeFile(destPath, file.buffer);
      savedImagePaths.push(path.join("productimages", filename));
    }

    // Insert product_images rows
    const imageRows = savedImagePaths.map((imagePath) =>
      this.productImagesRepo.create({ productId, imagePath }),
    );
    await this.productImagesRepo.save(imageRows);

    // Insert product_info row
    const productRow = this.productInfoRepo.create({
      productId,
      productName: dto.product_name,
      subTitle: dto.subTitle ?? null,
      mainCategory: dto.main_category,
      subCategory: dto.sub_category,
      amount: dto.amount,
      discountPercentage: dto.discount_percentage ?? null,
      discountAmount: dto.discount_amount ?? null,
      productDescription: dto.product_description,
      color: dto.color ?? null,
      brand: dto.brand ?? null,
      seller: dto.seller,
      preturn: dto.preturn ?? null,
      warranty: dto.warranty ?? null,
      orderType: dto.orderType ?? null,
      moq: dto.moq ?? null,
      stockStatus: "In Stock",
    });
    await this.productInfoRepo.save(productRow);

    // Spec: 200 response body is "the full formdata object (all submitted
    // fields)" — echo back exactly what was submitted, plus the generated ID.
    return {
      kind: "created",
      body: {
        ...dto,
        product_id: productId,
      },
    };
  }

  // ─── POST /api/addproductimage ─────────────────────────────────────────

  async addProductImage(
    dto: AddProductImageDto,
    files: Express.Multer.File[],
  ): Promise<AddProductImageResult> {
    await this.ensureUploadDir();

    const errors: string[] = [];

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

        const row = this.productImagesRepo.create({
          productId: dto.product_id,
          imagePath: path.join("productimages", filename),
        });
        await this.productImagesRepo.save(row);
      } catch {
        // Any failure for this specific file — record and continue,
        // per spec: partial success is expected/allowed.
        errors.push(`Error uploading image ${i}`);
      }
    }

    if (errors.length === 0) {
      return { kind: "success" };
    }
    return { kind: "partial_failure", errors };
  }
}
