import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class LoginDto {
  @ApiProperty({
    example: "web.admin@gmail.com",
    description: "Email address (or phone number for user login)",
  })
  @IsNotEmpty({ message: "Email is required" })
  @IsString()
  email: string;

  @ApiProperty({
    example: "Admin@123",
    description: "Plain-text password — will be MD5 hashed before DB comparison",
  })
  @IsNotEmpty({ message: "Password is required" })
  @IsString()
  password: string;

  @ApiPropertyOptional({
    example: "fcm_token_string_here",
    description: "Firebase Cloud Messaging token (user login only)",
  })
  @IsOptional()
  @IsString()
  fcm_token?: string;

  @ApiPropertyOptional({
    example: "android",
    enum: ["android", "ios"],
    description: "Device type (user login only)",
  })
  @IsOptional()
  @IsString()
  device_type?: string;

  @ApiPropertyOptional({
    example: "guest_abc123",
    description: "Guest cart ID to merge into logged-in user cart (user login only)",
  })
  @IsOptional()
  @IsString()
  guestID?: string;
}
