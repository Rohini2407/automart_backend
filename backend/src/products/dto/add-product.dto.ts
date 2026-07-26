import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNumber, IsOptional, IsInt, Min } from "class-validator";
import { Type } from "class-transformer";

export class AddProductDto {
  @ApiProperty({
    description: "Raw input — final ID is AM + seller[0..1] + this value",
  })
  @IsString()
  product_id: string;

  @ApiProperty()
  @IsString()
  product_name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subTitle?: string;

  @ApiProperty()
  @IsString()
  main_category: string;

  @ApiProperty()
  @IsString()
  sub_category: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  amount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  discount_percentage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  discount_amount?: number;

  @ApiProperty()
  @IsString()
  product_description: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiProperty()
  @IsString()
  seller: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preturn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  warranty?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  orderType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  moq?: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  file_count: number;
}
