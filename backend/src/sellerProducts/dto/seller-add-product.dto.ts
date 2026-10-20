import { applyDecorators } from "@nestjs/common";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { Trim } from "../../common/utils/trim.transform"; // ⚠ adjust if you keep it elsewhere

export const STOCK_STATUSES = [
  "in_stock",
  "out_of_stock",
  "low_stock",
] as const;

// ── small helpers (multipart bodies are all strings) ─────────────────────────
const blankToUndef = (v: unknown) =>
  v === "" || v === null || v === undefined ? undefined : v;

const toNum = ({ value }: { value: unknown }) => {
  const v = blankToUndef(value);
  return v === undefined ? undefined : Number(v);
};

const normEnum = ({ value }: { value: unknown }) =>
  typeof value === "string"
    ? value.trim().toLowerCase().replace(/\s+/g, "_")
    : value;

const ReqText = (max: number) =>
  applyDecorators(
    ApiProperty(),
    Trim(),
    IsString(),
    IsNotEmpty(),
    MaxLength(max),
  );

const OptText = (max: number) =>
  applyDecorators(
    ApiPropertyOptional(),
    Trim(),
    IsOptional(),
    IsString(),
    MaxLength(max),
  );

const ReqNum = (max = 99999999.99) =>
  applyDecorators(
    ApiProperty({ type: Number }),
    Transform(toNum),
    IsNumber({ maxDecimalPlaces: 2 }),
    Min(0),
    Max(max),
  );

const OptNum = (max = 99999999.99) =>
  applyDecorators(
    ApiPropertyOptional({ type: Number }),
    Transform(toNum),
    IsOptional(),
    IsNumber({ maxDecimalPlaces: 2 }),
    Min(0),
    Max(max),
  );

export class SellerAddProductDto {
  @ApiProperty({
    example: "1001",
    description: "Raw ID. Final ID = AM + first 2 chars of seller email + this",
  })
  @Trim()
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{1,50}$/, {
    message: "product_id may contain letters, digits, - and _ only (max 50)",
  })
  product_id: string;

  @ReqText(355) product_name: string;
  @OptText(255) subTitle?: string;
  @ReqText(100) main_category: string;
  @ReqText(100) sub_category: string;

  @ReqNum() amount: number; // MRP
  @OptNum(100) discount_percentage?: number;
  @ReqNum() discount_amount: number; // final selling price
  @ReqText(10000) product_description: string;

  @OptText(50) color?: string;
  @OptText(100) brand?: string;

  /** Ignored for ownership: seller is always taken from the JWT. If sent, it must match. */
  @OptText(255) seller?: string;

  @ApiPropertyOptional({ enum: ["yes", "no"] })
  @Transform(normEnum)
  @IsOptional()
  @IsIn(["yes", "no"])
  preturn?: "yes" | "no";

  @OptText(100) warranty?: string;

  @ApiProperty({
    example: "In Stock",
    description: "In Stock | Out of Stock | Low Stock",
  })
  @Transform(normEnum)
  @IsIn(STOCK_STATUSES)
  stockStatus: (typeof STOCK_STATUSES)[number];

  @ApiPropertyOptional({ type: Number })
  @Transform(toNum)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  stock?: number;

  @OptNum(99999) actualweight?: number;
  @OptNum(99999) finalWeight?: number;
  @OptNum(99999) length?: number;
  @OptNum(99999) width?: number;
  @OptNum(99999) height?: number;
  @OptNum(99999) volumetricWeight?: number;

  @OptText(50) fuelType?: string;
  @OptText(50) transmissionType?: string;
  @OptText(20) hsnCode?: string;
  @OptNum(100) gstPercentage?: number;
  @OptNum() expectedPrice?: number;
  @OptNum() gstPrice?: number;
  @OptNum() indirectFee?: number;
  @OptNum() platformFee?: number;
  @OptNum() shippingCharges?: number;

  @OptText(100) partnumber?: string;
  @OptText(100) materialtype?: string;
  @OptText(255) vehicleName?: string;
  @OptText(100) vehicleBrand?: string;
  @OptText(100) vehicleVariant?: string;

  @ApiPropertyOptional({ enum: ["retail", "wholesale"] })
  @Transform(normEnum)
  @IsOptional()
  @IsIn(["retail", "wholesale"])
  orderType?: "retail" | "wholesale";

  @ApiPropertyOptional({ type: Number })
  @Transform(toNum)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  moq?: number;

  @ApiProperty({
    type: Number,
    example: 2,
    description: "Number of images sent as image0..imageN-1 (1-10)",
  })
  @Transform(toNum)
  @IsInt()
  @Min(1)
  @Max(10)
  file_count: number;
}
