import { BadRequestException, Injectable } from "@nestjs/common";
import { EntityManager } from "typeorm";

export interface CartLineForCoupon {
  productId: string;
  quantity: number;
  price: number;
}

@Injectable()
export class CouponService {
  /**
   * Stub — plug in your real coupon table/rules here. `manager` is passed
   * through so this runs inside the same transaction as the order, letting
   * you atomically bump a usage counter without a race between two
   * simultaneous checkouts using the same code.
   */
  async validateAndApply(
    couponCode: string,
    cartLines: CartLineForCoupon[],
    manager: EntityManager,
  ): Promise<number> {
    // const coupon = await manager.getRepository(CouponEntity).findOne({
    //   where: { code: couponCode, isActive: true },
    //   lock: { mode: 'pessimistic_write' },
    // });
    // if (!coupon || coupon.expiresAt < new Date()) {
    //   throw new BadRequestException('Coupon is invalid or expired');
    // }
    // const orderTotal = cartLines.reduce((s, l) => s + l.price * l.quantity, 0);
    // const discount = coupon.type === 'flat' ? coupon.value : orderTotal * (coupon.value / 100);
    // await manager.increment(CouponEntity, { id: coupon.id }, 'usageCount', 1);
    // return Math.min(discount, orderTotal);

    throw new BadRequestException("Coupon code is invalid or not applicable");
  }
}
