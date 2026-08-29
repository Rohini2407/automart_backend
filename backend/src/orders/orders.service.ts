import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DataSource, EntityManager, In } from "typeorm";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import * as bcrypt from "bcrypt";
import { JwtService } from "@nestjs/jwt";

import { ProductEntity } from "../products/entities/product.entity";
import { OrderEntity } from "./entities/order.entity";
import { UserEntity, CartItem } from "../auth/entities/user.entity";
import { CodOrderDto } from "./dto/cod-order.dto";
import { BuyNowCodOrderDto } from "./dto/buy-now-cod-order.dto";
import { CouponService } from "./coupon.service";
import { MailService } from "../common/mail/mail.service";
import { generateOrderId } from "src/common/order/order-id.util";
import { COD_MIN_ORDER_VALUE, DELIVERY_CHARGE } from "src/common/order";
import { OrderStatus } from "src/common/enums/orderStatus";
import { PaymentMethod } from "src/common/enums/paymentMethod";

interface CartLineJoined {
  productId: string;
  quantity: number;
  effective_price: number;
  product_name: string;
  seller: string;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly couponService: CouponService,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  private resolveCartIdentifier(token?: string, guestID?: string): string {
    if (token) {
      try {
        const payload = this.jwtService.verify(token);
        return payload.email;
      } catch {
        throw new BadRequestException("Invalid or expired token");
      }
    }
    if (guestID) return guestID;
    throw new NotFoundException("something went wrong");
  }

  /**
   * Cart is no longer a DB table. Logged-in carts live in the JSON `cart`
   * column on `users`; guest carts live in Redis under
   * `cart:guest:<guestID>` (see registration.service.ts).
   */
  private async getCartItems(
    identifier: string,
    isGuest: boolean,
    manager: EntityManager,
  ): Promise<CartItem[]> {
    if (isGuest) {
      return (
        (await this.cacheManager.get<CartItem[]>(`cart:guest:${identifier}`)) ??
        []
      );
    }
    const user = await manager
      .getRepository(UserEntity)
      .findOne({ where: { email: identifier } });
    return user?.cart ?? [];
  }

  private async clearCart(
    identifier: string,
    isGuest: boolean,
    manager: EntityManager,
  ): Promise<void> {
    if (isGuest) {
      // Deleted after commit, alongside the other Redis writes — see below.
      return;
    }
    await manager.update(UserEntity, { email: identifier }, { cart: null });
  }

  async placeCodOrder(dto: CodOrderDto) {
    const identifier = this.resolveCartIdentifier(dto.token, dto.guestID);
    const isGuest = !dto.token;

    const orderResult = await this.dataSource.transaction(async (manager) => {
      const cartItems = await this.getCartItems(identifier, isGuest, manager);
      if (!cartItems.length) {
        throw new NotFoundException("Cart data not found");
      }

      const productIds = cartItems.map((i) => i.product_id);
      const products = await manager.getRepository(ProductEntity).find({
        where: { productId: In(productIds) },
      });
      const productById = new Map(products.map((p) => [p.productId, p]));

      const cartLines: CartLineJoined[] = cartItems.map((item) => {
        const product = productById.get(item.product_id);
        if (!product) {
          throw new NotFoundException(
            `Product ${item.product_id} in cart no longer exists`,
          );
        }
        return {
          productId: item.product_id,
          quantity: item.quantity,
          effective_price: Number(product.discountAmount ?? product.amount),
          product_name: product.productName,
          seller: product.seller,
        };
      });

      const originalTotal = cartLines.reduce(
        (sum, line) => sum + line.effective_price * line.quantity,
        0,
      );
      if (originalTotal <= COD_MIN_ORDER_VALUE) {
        throw new BadRequestException(
          `COD not available for orders with value less than or equal to ₹${COD_MIN_ORDER_VALUE}`,
        );
      }

      let couponDiscount = 0;
      if (dto.couponCode) {
        couponDiscount = await this.couponService.validateAndApply(
          dto.couponCode,
          cartLines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            price: l.effective_price,
          })),
          manager,
        );
      }

      let discountedTotal = originalTotal - couponDiscount;
      if (discountedTotal < COD_MIN_ORDER_VALUE) {
        discountedTotal += DELIVERY_CHARGE;
      }
      const finalTotal = Math.floor(discountedTotal);

      const orderId = generateOrderId(dto.phone);

      const orderRepo = manager.getRepository(OrderEntity);
      const orderRows = cartLines.map((line) =>
        orderRepo.create({
          orderId,
          email: dto.email,
          productId: line.productId,
          quantity: line.quantity,
          price: line.effective_price,
          orderStatus: OrderStatus.NEW,
          paymentMethod: PaymentMethod.COD,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          address: dto.address,
          city: dto.city,
          state: dto.state,
          zip: dto.zip,
          deviceType: dto.deviceType ?? null,
          couponCode: dto.couponCode ?? null,
          couponDiscount,
        }),
      );
      await orderRepo.save(orderRows);

      // Clears the logged-in user's `cart` JSON in the same transaction.
      // Guest Redis cart is cleared after commit (see below).
      await this.clearCart(identifier, isGuest, manager);

      await this.upsertUserAddress(manager, dto);

      return { orderId, finalTotal, couponDiscount, cartLines };
    });

    if (isGuest) {
      await this.cacheManager.del(`cart:guest:${identifier}`);
    }

    // Side effects run AFTER commit — a slow/failed email must never roll back a placed order.
    void this.sendOrderEmails(
      orderResult.orderId,
      dto.email,
      orderResult.cartLines,
      orderResult.finalTotal,
      dto,
    );

    return {
      orderId: orderResult.orderId,
      msg: "Order placed successfully",
      total: orderResult.finalTotal,
      couponDiscount: orderResult.couponDiscount,
    };
  }

  async placeBuyNowCodOrder(dto: BuyNowCodOrderDto) {
    if (!dto.token && !dto.guestID) {
      throw new NotFoundException("something went wrong");
    }

    const orderResult = await this.dataSource.transaction(async (manager) => {
      const product = await manager.getRepository(ProductEntity).findOne({
        where: { productId: dto.productId },
      });
      if (!product) {
        throw new NotFoundException("Product not found");
      }

      const originalAmount = Number(product.discountAmount ?? product.amount);
      if (!originalAmount) {
        throw new BadRequestException("Product pricing is not configured");
      }
      if (originalAmount <= COD_MIN_ORDER_VALUE) {
        throw new BadRequestException(
          `COD not available for orders with value less than or equal to ₹${COD_MIN_ORDER_VALUE}`,
        );
      }

      let couponDiscount = 0;
      if (dto.couponCode) {
        couponDiscount = await this.couponService.validateAndApply(
          dto.couponCode,
          [
            {
              productId: product.productId,
              quantity: 1,
              price: originalAmount,
            },
          ],
          manager,
        );
      }

      let discountedAmount = originalAmount - couponDiscount;
      if (discountedAmount < COD_MIN_ORDER_VALUE) {
        discountedAmount += DELIVERY_CHARGE;
      }
      const finalAmount = Math.floor(discountedAmount);

      const orderId = generateOrderId(dto.phone);

      await manager.getRepository(OrderEntity).save(
        manager.getRepository(OrderEntity).create({
          orderId,
          email: dto.email,
          productId: product.productId,
          quantity: 1,
          price: originalAmount,
          orderStatus: OrderStatus.NEW,
          paymentMethod: PaymentMethod.COD,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          address: dto.address,
          city: dto.city,
          state: dto.state,
          zip: dto.zip,
          deviceType: dto.deviceType ?? null,
          couponCode: dto.couponCode ?? null,
          couponDiscount,
        }),
      );

      const userRepo = manager.getRepository(UserEntity);
      const existingUser = await userRepo.findOne({
        where: { email: dto.email },
      });
      if (existingUser) {
        await userRepo.update(existingUser.id, {
          address: dto.address,
          city: dto.city,
          state: dto.state,
          pincode: dto.zip,
        });
      } else {
        const hashedPassword = await this.hashLegacyPassword(dto.phone);
        await userRepo.save(
          userRepo.create({
            firstName: dto.firstName,
            lastName: dto.lastName,
            email: dto.email,
            phone: dto.phone,
            password: hashedPassword,
            address: dto.address,
            city: dto.city,
            state: dto.state,
            pincode: dto.zip,
          }),
        );
      }

      // Images now come straight off the product row's JSON column.
      return {
        orderId,
        finalAmount,
        couponDiscount,
        product,
        imagePath: product.images?.[0] ?? null,
      };
    });

    void this.mailService.sendOrderConfirmationEmail(
      dto.email,
      orderResult.orderId,
      [
        {
          productName: orderResult.product.productName,
          imagePath: orderResult.imagePath,
          quantity: 1,
          price: orderResult.finalAmount,
        },
      ],
      orderResult.finalAmount,
    );
    void this.mailService.sendSellerNotificationEmail(
      orderResult.product.seller,
      orderResult.orderId,
      `${dto.firstName} ${dto.lastName}`,
      dto.phone,
      `${dto.address}, ${dto.city}, ${dto.state} ${dto.zip}`,
    );

    return {
      orderId: orderResult.orderId,
      msg: "order placed",
      total: orderResult.finalAmount,
      couponDiscount: orderResult.couponDiscount,
    };
  }

  private async upsertUserAddress(manager: EntityManager, dto: CodOrderDto) {
    const userRepo = manager.getRepository(UserEntity);
    const existingUser = await userRepo.findOne({
      where: { email: dto.email },
    });

    if (existingUser) {
      await userRepo.update(existingUser.id, {
        address: dto.address,
        city: dto.city,
        state: dto.state,
        pincode: dto.zip,
      });
      return;
    }

    const hashedPassword = await this.hashLegacyPassword(dto.phone);
    await userRepo.save(
      userRepo.create({
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        password: hashedPassword,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        pincode: dto.zip,
      }),
    );
  }

  private async hashLegacyPassword(phone: string): Promise<string> {
    return bcrypt.hash(phone, 10);
  }

  private async sendOrderEmails(
    orderId: string,
    customerEmail: string,
    cartLines: CartLineJoined[],
    total: number,
    dto: CodOrderDto,
  ) {
    const productIds = cartLines.map((l) => l.productId);
    const products = productIds.length
      ? await this.dataSource.getRepository(ProductEntity).find({
          where: { productId: In(productIds) },
        })
      : [];
    const imageByProduct = new Map(
      products.map((p) => [p.productId, p.images?.[0] ?? null]),
    );

    await this.mailService.sendOrderConfirmationEmail(
      customerEmail,
      orderId,
      cartLines.map((l) => ({
        productName: l.product_name,
        imagePath: imageByProduct.get(l.productId) ?? null,
        quantity: l.quantity,
        price: l.effective_price,
      })),
      total,
    );

    const sellerGroups = new Map<string, CartLineJoined[]>();
    for (const line of cartLines) {
      const group = sellerGroups.get(line.seller) ?? [];
      group.push(line);
      sellerGroups.set(line.seller, group);
    }
    for (const [sellerEmail] of sellerGroups) {
      await this.mailService.sendSellerNotificationEmail(
        sellerEmail,
        orderId,
        `${dto.firstName} ${dto.lastName}`,
        dto.phone,
        `${dto.address}, ${dto.city}, ${dto.state} ${dto.zip}`,
      );
    }
  }
}
