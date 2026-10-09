import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { existsSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { SiteContentEntity } from "./entities/site-content.entity";
import { UploadSliderDto } from "./dto/upload-slider.dto";
import { generateSliderFilename, SLIDER_UPLOAD_DIR } from "./constants/site-content.constants";

@Injectable()
export class SiteContentService {
  private readonly logger = new Logger(SiteContentService.name);

  constructor(
    @InjectRepository(SiteContentEntity)
    private readonly siteContentRepo: Repository<SiteContentEntity>,
  ) {}

  async uploadSlider(
    file: Express.Multer.File | undefined,
    dto: UploadSliderDto,
  ) {
    if (!file) {
      throw new BadRequestException("File not received or invalid!");
    }

    await mkdir(SLIDER_UPLOAD_DIR, { recursive: true });

    const filename = generateSliderFilename(file.originalname);
    const targetPath = join(SLIDER_UPLOAD_DIR, filename);

    // Same-second collision (two uploads at the exact same timestamp) —
    // treated as "already moved" per spec.
    if (existsSync(targetPath)) {
      throw new UnauthorizedException(
        "File is not valid or has already been moved!",
      );
    }

    try {
      await writeFile(targetPath, file.buffer);
    } catch (err) {
      this.logger.error(`Slider file write failed: ${(err as Error).message}`);
      throw new UnauthorizedException("Failed to move the file!");
    }

    const record = this.siteContentRepo.create({
      contentType: "banner_slider",
      image: filename,
      imageLink: dto.imageLink ?? undefined,
      device: dto.device,
    });
    await this.siteContentRepo.save(record);

    return { message: "File stored successfully!" };
  }
}
