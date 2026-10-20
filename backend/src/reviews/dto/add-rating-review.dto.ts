import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsInt, Max, Min } from "class-validator";
import { OptText, ReqId, toNum } from "src/common/utils/dto.helpers";

export class AddRatingReviewDto {
  @ReqId() orderId: string;
  @ReqId() product_id: string;

  @ApiProperty({ type: Number, example: 5, description: "Whole number 1-5" })
  @Transform(toNum)
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @OptText(255) title?: string;
  @OptText(2000) description?: string;
}
