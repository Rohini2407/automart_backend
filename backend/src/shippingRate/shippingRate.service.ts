import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

// ⚠ Adjust path to your entity
import { SiteContentEntity } from "../site-content/entities/site-content.entity";
import { CreateShippingRateDto } from "./dto/create-shipping-rate.dto";

@Injectable()
export class ShippingRateService {
  private readonly logger = new Logger(ShippingRateService.name);

  constructor(
    @InjectRepository(SiteContentEntity)
    private readonly repo: Repository<SiteContentEntity>,
  ) {}

  /**
   * site_content mapping: numeric_key = volumetric_weight, numeric_value = rate.
   * Upsert instead of blind insert: re-submitting the same weight updates the
   * rate rather than creating duplicate bands.
   */
  async upsert(dto: CreateShippingRateDto) {
    try {
      const existing = await this.repo.findOne({
        where: {
          contentType: "shipping_rate",
          numericKey: dto.volumetric_weight,
        },
      });

      if (existing) {
        existing.numericValue = dto.rate;
        await this.repo.save(existing);
      } else {
        await this.repo.save(
          this.repo.create({
            contentType: "shipping_rate",
            numericKey: dto.volumetric_weight,
            numericValue: dto.rate,
          }),
        );
      }
      return { message: "Value Submit Successfully!" };
    } catch (err) {
      this.logger.error("Failed to save shipping rate", (err as Error).stack);
      throw new InternalServerErrorException(
        "Unable to save shipping rate. Please try again later.",
      );
    }
  }
}
