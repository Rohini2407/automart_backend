import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsInt, Min } from "class-validator";
import { Type } from "class-transformer";

export class AddProductImageDto {
  @ApiProperty()
  @IsString()
  product_id: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  file_count: number;
}
