import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from "class-validator";

export class RegistrationDto {
  @ApiProperty({ example: "John", minLength: 4, maxLength: 40 })
  @IsString()
  @IsNotEmpty({ message: "First name is required" })
  @Length(4, 40, { message: "First name must be between 4 and 40 characters" })
  firstName: string;

  @ApiPropertyOptional({ example: "Doe" })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ example: "9876543210" })
  @IsString()
  @IsNotEmpty({ message: "Phone is required" })
  @Matches(/^\d{10}$/, { message: "Phone must be exactly 10 numeric digits" })
  phone: string;

  @ApiProperty({ example: "john.doe@example.com" })
  @IsEmail({}, { message: "Please enter a valid email address" })
  @IsNotEmpty({ message: "Email is required" })
  email: string;

  @ApiProperty({ example: "Password@1", minLength: 8, maxLength: 15 })
  @IsString()
  @IsNotEmpty({ message: "Password is required" })
  @Length(8, 15, { message: "Password must be between 8 and 15 characters" })
  password: string;

  @ApiPropertyOptional({ example: "guest_abc123" })
  @IsOptional()
  @IsString()
  guestID?: string;

  @ApiPropertyOptional({ example: "fcm_token_here" })
  @IsOptional()
  @IsString()
  fcm_token?: string;

  @ApiPropertyOptional({ example: "android", enum: ["android", "ios"] })
  @IsOptional()
  @IsString()
  device_type?: string;
}