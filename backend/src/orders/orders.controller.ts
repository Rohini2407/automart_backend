import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { Public } from "../common/decorators/public.decorator";
import { CodOrderDto } from "./dto/cod-order.dto";
import { BuyNowCodOrderDto } from "./dto/buy-now-cod-order.dto";
import { OrdersService } from "./orders.service";

@ApiTags("orders")
@Controller("api/user")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("codorder")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Place a COD order for the full cart (logged-in or guest)",
  })
  async placeCodOrder(@Body() dto: CodOrderDto) {
    return this.ordersService.placeCodOrder(dto);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("buynowcodorder")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Place a COD order for a single product, bypassing the cart",
  })
  async placeBuyNowCodOrder(@Body() dto: BuyNowCodOrderDto) {
    return this.ordersService.placeBuyNowCodOrder(dto);
  }
}
