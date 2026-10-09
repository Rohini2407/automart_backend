import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsIn,
  IsNumberString,
  Matches,
  MaxLength,
} from "class-validator";
import { Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreatePreownedDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  owner_name: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @Matches(/^\+?[0-9]{10,15}$/, {
    message: "phone_number must be a valid phone number",
  })
  phone_number: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^\+?[0-9]{10,15}$/, {
    message: "whatsapp_number must be a valid phone number",
  })
  whatsapp_number?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  address_line: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty()
  @Matches(/^[0-9]{6}$/, { message: "pincode must be a 6-digit number" })
  pincode: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  vehicle_type: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  vehicle_brand: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  vehicle_name: string;

  @ApiProperty()
  @IsNumberString()
  manufacturing_year: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variant?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vehicle_color?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Za-z0-9\s]{4,20}$/, {
    message: "vehicle_rto_number format is invalid",
  })
  vehicle_rto_number: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) =>
    value === "" || value === undefined ? undefined : Number(value),
  )
  number_of_owners?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) =>
    value === "" || value === undefined ? undefined : Number(value),
  )
  kilometer_driven?: number;

  @ApiPropertyOptional({ enum: ["yes", "no"] })
  @IsOptional()
  @IsIn(["yes", "no"])
  insurance?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  insurance_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  insurance_valid_till?: string;

  @ApiPropertyOptional({ enum: ["Manual", "Automatic"] })
  @IsOptional()
  @IsIn(["Manual", "Automatic"])
  transmission_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) =>
    value === "" || value === undefined ? undefined : Number(value),
  )
  custom_price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  // Deliberately NOT accepted from the client: `verified_by_automart`.
  // Verification is server/admin-controlled (see `verification_status` on
  // the Listing entity) — trusting a client-supplied flag here would let a
  // seller mark their own listing "verified".
}
