import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { DataSource, Repository } from "typeorm";
import { safeUnlink } from "../common/utils/file-upload.util";
import { ProductReviewEntity } from "./entities/product-review.entity";
import { AddRatingReviewDto } from "./dto/add-rating-review.dto";
import { detectFileType, istStamp, uploadDir } from "src/common/utils/file-signature.util";

const IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"];
// Only buyers who actually received the product can review it. Set false to allow any status.
const REQUIRE_DELIVERED = true;

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    @InjectRepository(ProductReviewEntity)
    private readonly repo: Repository<ProductReviewEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async addReview(
    userEmail: string,
    dto: AddRatingReviewDto,
    file?: Express.Multer.File,
  ) {
    // 1. optional image: must really be an image (content sniffed, not trusted from the client)
    let ext: string | undefined;
    if (file) {
      const detected = detectFileType(file.buffer);
      if (!detected || !IMAGE_MIME.includes(detected.mime)) {
        throw new BadRequestException(
          "review_image must be a JPEG, PNG or WEBP image",
        );
      }
      ext = detected.ext;
    }

    // 2. the order must exist AND belong to the logged-in user (the old API let anyone review any order)
    const [order] = await this.dataSource.query(
      "SELECT firstName, email, orderstatus FROM orders WHERE orderId = ? AND product_id = ? LIMIT 1",
      [dto.orderId, dto.product_id],
    );
    if (
      !order ||
      String(order.email).toLowerCase() !== userEmail.toLowerCase()
    ) {
      throw new NotFoundException("Order not found");
    }
    if (REQUIRE_DELIVERED && order.orderstatus !== "delivered") {
      throw new ForbiddenException(
        "You can review a product only after it has been delivered",
      );
    }

    // 3. one review per order+product (friendly early check; the unique key is the real guarantee)
    const already = await this.repo.findOne({
      where: { orderId: dto.orderId, productId: dto.product_id },
      select: { id: true },
    });
    if (already)
      throw new ConflictException(
        "You have already reviewed this product for this order",
      );

    // 4. save image (unique name: second-resolution timestamps alone collide), then the row
    let imageName: string | null = null;
    let imagePath: string | null = null;
    try {
      if (file && ext) {
        const dir = uploadDir("reviewImage");
        await mkdir(dir, { recursive: true });
        imageName = `reviewImage_${istStamp()}_${randomBytes(3).toString("hex")}${ext}`;
        imagePath = join(dir, imageName);
        await writeFile(imagePath, file.buffer, { flag: "wx" });
      }

      await this.repo.save(
        this.repo.create({
          productId: dto.product_id,
          orderId: dto.orderId,
          name: order.firstName, // taken from the order, never from the request
          email: order.email,
          rating: dto.rating,
          title: dto.title ?? null,
          description: dto.description ?? null,
          reviewImage: imageName,
        }),
      );
      return { status: "success", message: "Review added successfully" };
    } catch (err) {
      if (imagePath) await safeUnlink(imagePath);
      if (
        (err as any)?.driverError?.code === "ER_DUP_ENTRY" ||
        (err as any)?.code === "ER_DUP_ENTRY"
      ) {
        throw new ConflictException(
          "You have already reviewed this product for this order",
        );
      }
      if (err instanceof HttpException) throw err;
      this.logger.error(
        `Failed to add review for ${dto.orderId}/${dto.product_id}`,
        (err as Error).stack,
      );
      throw new InternalServerErrorException("Failed to add review");
    }
  }
}
