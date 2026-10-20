import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";
import { Trim } from "../../common/utils/trim.transform";

export const PHONE_REGEX = /^[0-9+\-\s()]{7,20}$/;
export const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export class CreateBulkEnquiryDto {
  @ApiProperty({ example: "John" })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @ApiPropertyOptional({ example: "Doe" })
  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiProperty({ example: "9876543210" })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @Matches(PHONE_REGEX, { message: "phone must be a valid contact number" })
  phone: string;

  @ApiProperty({ example: "john@example.com" })
  @Trim()
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiPropertyOptional({ example: "27ABCDE1234F1Z5" })
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toUpperCase() || undefined : value,
  )
  @IsOptional()
  @Matches(GST_REGEX, {
    message: "gstNumber must be a valid 15-character GSTIN",
  })
  gstNumber?: string;

  @ApiPropertyOptional({ example: "Need 500 units of brake pads" })
  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
