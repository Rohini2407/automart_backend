import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumberString,
  IsNumber,
  IsIn,
  IsInt,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

export class AddProductDto {
  @ApiProperty({ example: "12345" })
  @IsString()
  @IsNotEmpty()
  product_id: string;

  @ApiProperty({ example: "AutoMart" })
  @IsString()
  @IsNotEmpty()
  seller: string;

  @ApiProperty({ example: "Brake Pad Set" })
  @IsString()
  @IsNotEmpty()
  product_name: string;

  @ApiProperty({ example: "Front axle, ceramic compound" })
  @IsString()
  @IsNotEmpty()
  subTitle: string;

  @ApiProperty({ example: "Brakes" })
  @IsString()
  @IsNotEmpty()
  main_category: string;

  @ApiProperty({ example: "Brake Pads" })
  @IsString()
  @IsNotEmpty()
  sub_category: string;

  @ApiProperty({ example: "Black" })
  @IsString()
  @IsNotEmpty()
  color: string;

  @ApiProperty({ example: "Bosch" })
  @IsString()
  @IsNotEmpty()
  brand: string;

  @ApiProperty({ example: 1499.0 })
  @Type(() => Number)
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  discount_percentage?: number;

  @ApiPropertyOptional({ example: 150 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  discount_amount?: number;

  @ApiProperty({ example: "High-performance ceramic brake pads..." })
  @IsString()
  @IsNotEmpty()
  product_description: string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiProperty({ example: "12 months" })
  @IsString()
  @IsNotEmpty()
  warranty: string;

  // ── Shipping / logistics (feed shipping_rate lookups by volumetricWeight) ──

  @ApiProperty({ example: 0.85 })
  @Type(() => Number)
  @IsNumber()
  actualweight: number;

  @ApiProperty({ example: 0.95 })
  @Type(() => Number)
  @IsNumber()
  finalWeight: number;

  @ApiProperty({ example: 20 })
  @Type(() => Number)
  @IsNumber()
  length: number;

  @ApiProperty({ example: 15 })
  @Type(() => Number)
  @IsNumber()
  width: number;

  @ApiProperty({ example: 8 })
  @Type(() => Number)
  @IsNumber()
  height: number;

  @ApiProperty({ example: 1.92 })
  @Type(() => Number)
  @IsNumber()
  volumetricWeight: number;

  // ── Vehicle compatibility ────────────────────────────────────────────────

  @ApiProperty({ example: "Petrol" })
  @IsString()
  @IsNotEmpty()
  fuelType: string;

  @ApiProperty({ example: "Manual" })
  @IsString()
  @IsNotEmpty()
  transmissionType: string;

  @ApiProperty({ example: "Maruti Suzuki" })
  @IsString()
  @IsNotEmpty()
  vehicleBrand: string;

  @ApiProperty({ example: "Swift" })
  @IsString()
  @IsNotEmpty()
  vehicleName: string;

  @ApiProperty({ example: "VXI" })
  @IsString()
  @IsNotEmpty()
  vehicleVariant: string;

  // ── Tax / compliance ─────────────────────────────────────────────────────

  @ApiProperty({ example: "87083000" })
  @IsString()
  @IsNotEmpty()
  hsnCode: string;

  @ApiProperty({ example: 18 })
  @Type(() => Number)
  @IsNumber()
  gstPercentage: number;

  @ApiProperty({ example: 1270.34 })
  @Type(() => Number)
  @IsNumber()
  expectedPrice: number;

  @ApiProperty({ example: 1499.0 })
  @Type(() => Number)
  @IsNumber()
  gstPrice: number;

  // ── Fees (DB-defaulted, optional) ────────────────────────────────────────

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  indirectFee?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  platformFee?: number;

  @ApiPropertyOptional({ example: 80 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  shippingCharges?: number;

  @ApiProperty({ example: "BP-2044-FR" })
  @IsString()
  @IsNotEmpty()
  partnumber: string;

  @ApiProperty({ example: "Rubber & Metal Alloy" })
  @IsString()
  @IsNotEmpty()
  materialtype: string;

  @ApiPropertyOptional({ example: "yes", enum: ["yes", "no"] })
  @IsOptional()
  @IsIn(["yes", "no"])
  preturn?: string;

  @ApiPropertyOptional({
    example: "in_stock",
    enum: ["in_stock", "out_of_stock", "low_stock"],
  })
  @IsOptional()
  @IsIn(["in_stock", "out_of_stock", "low_stock"])
  stock_status?: string;

  @ApiPropertyOptional({
    example: "draft",
    enum: ["active", "inactive", "draft"],
  })
  @IsOptional()
  @IsIn(["active", "inactive", "draft"])
  productStatus?: string;

  @ApiPropertyOptional({ example: "Pending QC review" })
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiProperty({ example: 3, description: "Number of image files attached" })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  file_count: number;
}
