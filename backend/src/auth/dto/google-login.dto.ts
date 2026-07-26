import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";

export class GoogleLoginDto {
  @IsString()
  @IsNotEmpty()
  name: string; // Full name from Google profile → split into firstName + lastName

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsOptional()
  @IsString()
  guestId?: string; // guest cart id to migrate → userEmail

  @IsOptional()
  @IsString()
  fcm_token?: string;

  @IsOptional()
  @IsIn(["android", "ios"])
  device_type?: string;
}
