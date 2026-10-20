import {
  Body,
  Controller,
  HttpCode,
  Post,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { NoFilesInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from "@nestjs/swagger";

import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { CouponsService } from "./coupons.service";
import { CreateCouponDto } from "./dto/create-coupon.dto";

/** POST /api/post/addcoupons — admin & marketing only (coupons change pricing). */
@ApiTags("Coupons")
@ApiSecurity("app-key")
@ApiBearerAuth("access-token")
@Controller("post")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin", "marketing")
@UseInterceptors(NoFilesInterceptor()) // multipart/form-data with text fields only
export class CouponsController {
  constructor(private readonly service: CouponsService) {}

  @Post("addcoupons")
  @HttpCode(200)
  @ApiOperation({ summary: "Create a coupon (percentage OR flat-off)" })
  @ApiConsumes(
    "application/json",
    "multipart/form-data",
    "application/x-www-form-urlencoded",
  )
  create(@Body() dto: CreateCouponDto) {
    return this.service.create(dto);
  }
}
