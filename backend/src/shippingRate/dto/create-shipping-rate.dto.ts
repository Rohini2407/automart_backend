import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNumber, IsPositive, Max, Min } from "class-validator";

// multipart/urlencoded bodies arrive as strings -> convert to number ('' stays NaN -> fails IsNumber)
const toNumber = ({ value }: { value: unknown }) =>
  typeof value === "string" && value.trim() !== "" ? Number(value) : value;

export class CreateShippingRateDto {
  @ApiProperty({ example: 5, description: "Volumetric weight threshold" })
  @Transform(toNumber)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(99999999.99)
  volumetric_weight: number;

  @ApiProperty({
    example: 120,
    description: "Shipping charge for this weight band",
  })
  @Transform(toNumber)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  rate: number;
}
