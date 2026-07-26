import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty } from "class-validator";

export class ForgotPasswordDto {
  @ApiProperty({ example: "user@example.com" })
  @IsNotEmpty({ message: "Email is required!" })
  @IsEmail({}, { message: "Invalid email format" })
  email: string;
}
