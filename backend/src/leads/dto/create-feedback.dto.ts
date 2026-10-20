import { ApiProperty } from "@nestjs/swagger";
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";
import { Trim } from "../../common/utils/trim.transform";
import { PHONE_REGEX } from "./create-bulk-inquiry.dto";

export class CreateFeedbackDto {
  @ApiProperty({
    example: "John Doe",
    description: "Full name (single field, not firstName/lastName)",
  })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

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

  @ApiProperty({ example: "Great service!" })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;
}
