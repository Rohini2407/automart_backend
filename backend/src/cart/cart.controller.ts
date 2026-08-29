import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { Public } from "../common/decorators/public.decorator";
import { AddToCartDto } from "./dto/add-to-cart.dto";
import { CartService } from "./cart.service";

@ApiTags("cart")
@Controller("api/user")
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Public() // cors only — no authFilter, per spec
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post("addtocart")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Add a product to a user's cart, stacking quantity if already present",
  })
  async addToCart(@Body() dto: AddToCartDto) {
    return this.cartService.addToCart(dto);
  }
}
