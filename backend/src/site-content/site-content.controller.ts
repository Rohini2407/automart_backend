import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  UseGuards,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiConsumes,
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { SiteContentService } from "./site-content.service";
import { UploadSliderDto } from "./dto/upload-slider.dto";
import { DeviceType } from "src/common/enums/deviceType";
import { sliderMulterOptions } from "./constants/site-content.constants";

@ApiTags("Admin - Site Content")
@ApiBearerAuth("access-token")
@Controller("api/admin")
@UseGuards(JwtAuthGuard) // NOTE: only validates the token — see role-check note below
export class SiteContentController {
  constructor(private readonly siteContentService: SiteContentService) {}

  @Post("slideupload")
  @ApiOperation({ summary: "Upload a homepage slider/banner image" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["file", "device"],
      properties: {
        file: { type: "string", format: "binary" },
        device: { type: "string", enum: Object.values(DeviceType) },
        imageLink: { type: "string" },
      },
    },
  })
  @UseInterceptors(FileInterceptor("file", sliderMulterOptions))
  async uploadSlider(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadSliderDto,
  ) {
    return this.siteContentService.uploadSlider(file, dto);
  }
}
