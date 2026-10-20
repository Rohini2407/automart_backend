import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";
import { Trim } from "../../common/utils/trim.transform";
import { PHONE_REGEX } from "./create-bulk-inquiry.dto";

export class CreateContactUsDto {
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

  @ApiProperty({ example: "I need help with my order" })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;
}
