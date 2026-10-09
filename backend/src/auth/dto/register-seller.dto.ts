import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from "class-validator";

export class RegisterSellerDto {
  @IsNotEmpty() @IsString() firstName: string;
  @IsOptional() @IsString() lastName?: string;
  @IsNotEmpty() @IsString() businessName: string;

  @IsNotEmpty() @Matches(/^\+?[0-9]{7,15}$/) phone: string;
  @IsOptional() @Matches(/^\+?[0-9]{7,15}$/) whatsapp?: string;
  @IsNotEmpty() @IsEmail() email: string;

  @IsNotEmpty() @IsString() address: string;
  @IsNotEmpty() @IsString() city: string;
  @IsNotEmpty() @IsString() state: string;
  @IsNotEmpty() @Matches(/^[0-9]{6}$/) pincode: string;

  @IsOptional() @IsString() gstNumber?: string;
  @IsOptional() @IsString() shopActNumber?: string;
  @IsOptional() @IsString() iecNumber?: string;

  @IsNotEmpty() @IsString() bankAccountName: string;
  @IsNotEmpty() @Matches(/^[0-9]{9,18}$/) accountNumber: string;
  @IsNotEmpty() @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/) ifscCode: string;

  @IsNotEmpty() @MinLength(8) password: string;

  @IsOptional()
  @IsIn(["individual", "business"])
  sellerType?: "individual" | "business";
}
