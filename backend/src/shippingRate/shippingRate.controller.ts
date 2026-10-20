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
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from "@nestjs/swagger";

import { Roles } from "../common/decorators/roles.decorator"; // ⚠ adjust paths
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard"; // ⚠ adjust name/path to your guard
import { RolesGuard } from "../common/guards/roles.guard";
import { CreateShippingRateDto } from "./dto/create-shipping-rate.dto";
import { ShippingRateService } from "./shippingRate.service";

/** Admin-only. Final URL (global prefix "api"): POST /api/shippingrate */
@ApiTags("Shipping Rate")
@ApiSecurity("app-key")
@ApiBearerAuth("access-token")
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin")
@UseInterceptors(NoFilesInterceptor()) // allow multipart/form-data text fields
export class ShippingRateController {
  constructor(private readonly service: ShippingRateService) {}

  @Post("shippingrate")
  @HttpCode(200)
  @ApiOperation({
    summary: "Add / update a volumetric-weight shipping rate (admin)",
  })
  @ApiConsumes(
    "application/json",
    "multipart/form-data",
    "application/x-www-form-urlencoded",
  )
  @ApiOkResponse({
    schema: { example: { message: "Value Submit Successfully!" } },
  })
  create(@Body() dto: CreateShippingRateDto) {
    return this.service.upsert(dto);
  }
}
