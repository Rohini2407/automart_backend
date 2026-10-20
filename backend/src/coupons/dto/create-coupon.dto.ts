import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsIn, IsOptional, IsString, Matches } from "class-validator";
import { Trim } from "../../common/utils/trim.transform";
import { normEnum, OptInt, OptNum, OptText, ReqText } from "src/common/utils/dto.helpers";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export class CreateCouponDto {
  @ReqText(255) coupon_title: string;

  @ApiProperty({
    example: "SAVE10",
    description: "Stored upper-case; letters, digits, - and _ (3-50)",
  })
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Matches(/^[A-Z0-9_-]{3,50}$/, {
    message: "coupon_code must be 3-50 chars: A-Z, 0-9, - or _",
  })
  coupon_code: string;

  /** Percentage coupon: 0.01 - 100. Send either percentage OR flat_off. */
  @OptNum(0.01, 100) percentage?: number;

  /** Flat-off coupon amount. Send either percentage OR flat_off. */
  @OptNum(0.01) flat_off?: number;

  @OptText(100) category?: string;
  @OptInt(1) num_of_coupons?: number;
  @OptNum(0) spendAmount?: number;
  @OptText(1000) description?: string;
  @OptText(100) productId?: string;

  @ApiProperty({ example: "2026-10-01", description: "YYYY-MM-DD" })
  @Trim()
  @IsString()
  @Matches(DATE_RE, { message: "fromDate must be YYYY-MM-DD" })
  fromDate: string;

  @ApiProperty({
    example: "2026-12-31",
    description: "YYYY-MM-DD, on/after fromDate",
  })
  @Trim()
  @IsString()
  @Matches(DATE_RE, { message: "endDate must be YYYY-MM-DD" })
  endDate: string;

  @ApiPropertyOptional({ enum: ["android", "ios", "web"] })
  @Transform(normEnum)
  @IsOptional()
  @IsIn(["android", "ios", "web"])
  deviceType?: "android" | "ios" | "web";
}
