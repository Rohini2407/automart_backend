import { ApiProperty } from "@nestjs/swagger";
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from "class-validator";

export class SetPasswordDto {
  @ApiProperty({ example: "482913" })
  @IsNotEmpty({ message: "OTP is required!" })
  @Length(6, 6, { message: "OTP must be 6 digits" })
  otp: string;

  @ApiProperty({ example: "user@example.com" })
  @IsNotEmpty({ message: "Email is required!" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "NewPass@123" })
  @IsNotEmpty({ message: "New password is required!" })
  @IsString()
  newPassword: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fcm_token?: string;

  @ApiProperty({ required: false, example: "android" })
  @IsOptional()
  @IsString()
  device_type?: string;
}
