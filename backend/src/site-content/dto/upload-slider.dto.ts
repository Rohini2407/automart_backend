import { IsEnum, IsOptional, IsString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { DeviceType } from "src/common/enums/deviceType";

export class UploadSliderDto {
  @ApiProperty({ enum: DeviceType })
  @IsEnum(DeviceType, {
    message: "device must be one of: android, ios, web",
  })
  device: DeviceType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageLink?: string;
}
