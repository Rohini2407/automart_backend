import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { CouponEntity } from "./entities/coupon.entity";
import { CreateCouponDto } from "./dto/create-coupon.dto";

/** true only for real calendar dates (rejects 2026-02-31) */
const isRealDate = (s: string) => {
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};
const todayIST = () =>
  new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);

@Injectable()
export class CouponsService {
  private readonly logger = new Logger(CouponsService.name);

  constructor(
    @InjectRepository(CouponEntity)
    private readonly repo: Repository<CouponEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateCouponDto) {
    this.assertBusinessRules(dto);

    if (dto.productId) {
      const rows = await this.dataSource.query(
        "SELECT 1 FROM products WHERE product_id = ? LIMIT 1",
        [dto.productId],
      );
      if (!rows.length)
        throw new BadRequestException("productId does not exist");
    }

    try {
      const c = await this.repo.save(
        this.repo.create({
          couponTitle: dto.coupon_title,
          couponCode: dto.coupon_code,
          percentage: dto.percentage ?? null,
          category: dto.category ?? null,
          numOfCoupons: dto.num_of_coupons ?? null,
          spendAmount: dto.spendAmount ?? null,
          flatOff: dto.flat_off ?? 0,
          description: dto.description ?? "",
          productId: dto.productId ?? "",
          fromDate: dto.fromDate,
          endDate: dto.endDate,
          deviceType: dto.deviceType ?? null,
          isActive: true,
        }),
      );

      return {
        status: "success",
        message: "Data successfully added!",
        data: {
          id: c.id,
          coupon_title: c.couponTitle,
          coupon_code: c.couponCode,
          percentage: c.percentage,
          category: c.category,
          num_of_coupons: c.numOfCoupons,
          spendAmount: c.spendAmount,
          flat_off: c.flatOff,
          description: c.description,
          productId: c.productId,
          fromDate: c.fromDate,
          endDate: c.endDate,
          deviceType: c.deviceType,
          isActive: c.isActive,
        },
      };
    } catch (err) {
      if (this.isDuplicate(err))
        throw new ConflictException("Coupon code already exists");
      if (err instanceof HttpException) throw err;
      this.logger.error(
        `Failed to create coupon ${dto.coupon_code}`,
        (err as Error).stack,
      );
      throw new InternalServerErrorException(
        "Failed to save data to the database.",
      );
    }
  }

  private assertBusinessRules(dto: CreateCouponDto): void {
    const hasPct = dto.percentage !== undefined;
    const hasFlat = dto.flat_off !== undefined;
    if (hasPct === hasFlat) {
      throw new BadRequestException(
        "Provide exactly one of percentage or flat_off",
      );
    }
    if (
      hasFlat &&
      dto.spendAmount !== undefined &&
      dto.flat_off! > dto.spendAmount
    ) {
      throw new BadRequestException("flat_off cannot exceed spendAmount");
    }
    if (!isRealDate(dto.fromDate) || !isRealDate(dto.endDate)) {
      throw new BadRequestException(
        "fromDate / endDate must be valid dates (YYYY-MM-DD)",
      );
    }
    if (dto.endDate < dto.fromDate) {
      throw new BadRequestException("endDate must be on or after fromDate");
    }
    if (dto.endDate < todayIST()) {
      throw new BadRequestException("endDate cannot be in the past");
    }
  }

  private isDuplicate(err: any): boolean {
    return (err?.driverError?.code ?? err?.code) === "ER_DUP_ENTRY";
  }
}
