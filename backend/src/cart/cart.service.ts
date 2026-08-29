import { Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { UserEntity, CartItem } from "../auth/entities/user.entity";
import { AddToCartDto } from "./dto/add-to-cart.dto";

export interface AddToCartResult {
  msg: string;
  quantity: number;
}

// Matches the guest cart lifetime elsewhere in the app (see registration.service.ts).
const GUEST_CART_TTL_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async addToCart(dto: AddToCartDto): Promise<AddToCartResult> {
    // `dto.email` doubles as the identifier the old table used — a real
    // email once a user exists, otherwise treated as a guestID.
    const user = await this.userRepo.findOne({ where: { email: dto.email } });

    return user
      ? this.addToRegisteredCart(user, dto)
      : this.addToGuestCart(dto.email, dto);
  }

  private mergeItem(
    items: CartItem[],
    dto: AddToCartDto,
  ): { items: CartItem[]; isNew: boolean } {
    const existing = items.find((i) => i.product_id === dto.productId);
    if (existing) {
      existing.quantity += dto.quantity;
      return { items, isNew: false };
    }
    items.push({ product_id: dto.productId, quantity: dto.quantity });
    return { items, isNew: true };
  }

  private async addToRegisteredCart(
    user: UserEntity,
    dto: AddToCartDto,
  ): Promise<AddToCartResult> {
    const { items, isNew } = this.mergeItem([...(user.cart ?? [])], dto);

    await this.userRepo.update(user.id, { cart: items });

    return {
      msg: isNew ? "Product added to cart" : "Product updated in cart",
      quantity: items.reduce((sum, i) => sum + i.quantity, 0),
    };
  }

  private async addToGuestCart(
    guestID: string,
    dto: AddToCartDto,
  ): Promise<AddToCartResult> {
    const cacheKey = `cart:guest:${guestID}`;
    const current = (await this.cacheManager.get<CartItem[]>(cacheKey)) ?? [];
    const { items, isNew } = this.mergeItem([...current], dto);

    await this.cacheManager.set(cacheKey, items, GUEST_CART_TTL_MS);

    return {
      msg: isNew ? "Product added to cart" : "Product updated in cart",
      quantity: items.reduce((sum, i) => sum + i.quantity, 0),
    };
  }
}
