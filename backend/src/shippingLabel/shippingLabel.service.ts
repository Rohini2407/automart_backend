import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { mkdir, writeFile } from "fs/promises";
import { basename, join } from "path";
import { DataSource } from "typeorm";

import { safeUnlink } from "../common/utils/file-upload.util";
import { UploadShippingLabelDto } from "./dto/upload-shipping-label.dto";
import { detectFileType, uploadDir } from "src/common/utils/file-signature.util";

const ALLOWED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

@Injectable()
export class ShippingLabelService {
  private readonly logger = new Logger(ShippingLabelService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * In the optimized schema the label lives on the order row (orders.shippingLabel),
   * so "insert into shippingLabel" becomes an UPDATE of that order.
   */
  async upload(
    user: { email: string; role: string },
    dto: UploadShippingLabelDto,
    file?: Express.Multer.File,
  ) {
    // 1. file must exist and really be a PDF / image (content sniffed, not trusted from the client)
    const detected = detectFileType(file?.buffer);
    if (!file || !detected || !ALLOWED_MIME.includes(detected.mime)) {
      throw new BadRequestException("Invalid file upload.");
    }

    // 2. order must exist; a seller may only touch their own orders (404 either way: no leaking)
    const [order] = await this.dataSource.query(
      "SELECT seller, orderstatus, shippingLabel FROM orders WHERE orderId = ? AND product_id = ? LIMIT 1",
      [dto.orderId, dto.product_id],
    );
    if (
      !order ||
      (user.role === "seller" &&
        String(order.seller).toLowerCase() !== user.email.toLowerCase())
    ) {
      throw new NotFoundException("Order not found");
    }
    if (order.orderstatus === "cancelled") {
      throw new BadRequestException(
        "Cannot upload a shipping label for a cancelled order.",
      );
    }

    // 3. write file (flag "wx" = never overwrite), then update DB; undo the file if the DB step fails
    const dir = uploadDir("shippinglabel");
    const filename = `shippingLabel_${dto.orderId}_${Math.floor(Date.now() / 1000)}${detected.ext}`;
    const target = join(dir, filename);

    try {
      await mkdir(dir, { recursive: true });
      await writeFile(target, file.buffer, { flag: "wx" });
    } catch (err) {
      this.logger.error(
        `Label write failed for ${filename}`,
        (err as Error).stack,
      );
      throw new InternalServerErrorException(
        "Failed to move the uploaded file.",
      );
    }

    try {
      await this.dataSource.query(
        "UPDATE orders SET shippingLabel = ? WHERE orderId = ? AND product_id = ?",
        [filename, dto.orderId, dto.product_id],
      );
    } catch (err) {
      await safeUnlink(target);
      if (err instanceof HttpException) throw err;
      this.logger.error(
        `Label DB update failed for ${dto.orderId}`,
        (err as Error).stack,
      );
      throw new InternalServerErrorException(
        "Failed to save data to the database.",
      );
    }

    // 4. replacing an older label: remove the old file (basename() guards against odd DB values)
    if (order.shippingLabel)
      await safeUnlink(join(dir, basename(order.shippingLabel)));

    return {
      status: "success",
      message: "File upload successfully!",
      data: {
        orderId: dto.orderId,
        product_id: dto.product_id,
        shippingLabel: filename,
      },
    };
  }
}
