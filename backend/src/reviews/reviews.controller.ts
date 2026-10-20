import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  getSchemaPath,
} from "@nestjs/swagger";
import { memoryStorage } from "multer";

import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { AddRatingReviewDto } from "./dto/add-rating-review.dto";
import { ReviewsService } from "./reviews.service";

/** POST /api/post/addratingreview — any logged-in user, but only for their own delivered orders. */
@ApiTags("Reviews")
@ApiExtraModels(AddRatingReviewDto)
@ApiSecurity("app-key")
@ApiBearerAuth("access-token")
@Controller("post")
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private readonly service: ReviewsService) {}

  @Post("addratingreview")
  @HttpCode(200)
  @UseInterceptors(
    FileInterceptor("review_image", {
      storage: memoryStorage(),
      limits: { files: 1, fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) =>
        ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)
          ? cb(null, true)
          : cb(
              new BadRequestException(
                "review_image must be a JPEG, PNG or WEBP image",
              ) as any,
              false,
            ),
    }),
  )
  @ApiOperation({
    summary: "Add a rating & review for a delivered order (optional image)",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      allOf: [
        { $ref: getSchemaPath(AddRatingReviewDto) },
        {
          type: "object",
          properties: { review_image: { type: "string", format: "binary" } },
        },
      ],
    },
  })
  add(
    @Req() req: { user: { email: string } },
    @Body() dto: AddRatingReviewDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.addReview(req.user.email, dto, file);
  }
}
