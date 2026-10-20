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

import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { UploadShippingLabelDto } from "./dto/upload-shipping-label.dto";
import { ShippingLabelService } from "./shippingLabel.service";

/** POST /api/shippinglabel — sellers (own orders only) and admins. */
@ApiTags("Shipping Label")
@ApiExtraModels(UploadShippingLabelDto)
@ApiSecurity("app-key")
@ApiBearerAuth("access-token")
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("seller", "admin")
export class ShippingLabelController {
  constructor(private readonly service: ShippingLabelService) {}

  @Post("shippinglabel")
  @HttpCode(200)
  @UseInterceptors(
    FileInterceptor("shippingLabel", {
      storage: memoryStorage(),
      limits: { files: 1, fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) =>
        ["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(
          file.mimetype,
        )
          ? cb(null, true)
          : cb(new BadRequestException("Invalid file upload.") as any, false),
    }),
  )
  @ApiOperation({
    summary: "Upload a shipping label (PDF / image) for an order",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      allOf: [
        { $ref: getSchemaPath(UploadShippingLabelDto) },
        {
          type: "object",
          required: ["shippingLabel"],
          properties: { shippingLabel: { type: "string", format: "binary" } },
        },
      ],
    },
  })
  upload(
    @Req() req: { user: { email: string }; userRole: string },
    @Body() dto: UploadShippingLabelDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.upload(
      { email: req.user.email, role: req.userRole },
      dto,
      file,
    );
  }
}
