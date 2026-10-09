import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  Matches,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateGarageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  ownerName: string;

  @ApiProperty()
  @Matches(/^\+?[0-9]{10,15}$/, {
    message: "contactNumber must be a valid phone number",
  })
  contactNumber: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^\+?[0-9]{10,15}$/, {
    message: "whatsappNumber must be a valid phone number",
  })
  whatsappNumber?: string;

  @ApiProperty()
  @IsEmail()
  emailId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  businessName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  selectedVehicle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  selectedServices?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  facilitiesDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  openingHours?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  closingHours?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  businessAddress: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty()
  @Matches(/^[0-9]{6}$/, { message: "pincode must be a 6-digit number" })
  pincode: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessLocation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gstNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shopActNumber?: string;
}
