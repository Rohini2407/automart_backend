import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

// mysql returns DECIMAL as string; hand numbers back to the app
const numeric = {
  to: (v?: number | null) => v,
  from: (v: string | null) =>
    v === null || v === undefined ? null : parseFloat(v),
};

// Index names mirror the SQL schema so `synchronize` never fights the existing indexes.
@Entity("coupons")
@Index("uq_coupon_code", ["couponCode"], { unique: true })
@Index("idx_coupon_product", ["productId"])
@Index("idx_coupon_dates", ["fromDate", "endDate"])
@Index("idx_coupon_category", ["category"])
@Index("idx_coupon_active", ["isActive"])
export class CouponEntity {
  @PrimaryGeneratedColumn() id: number;

  @Column({ name: "coupon_title", type: "varchar", length: 255 })
  couponTitle: string;
  @Column({ name: "coupon_code", type: "varchar", length: 50 })
  couponCode: string;

  @Column({
    type: "decimal",
    precision: 5,
    scale: 2,
    nullable: true,
    transformer: numeric,
  })
  percentage: number | null;

  @Column({ type: "varchar", length: 100, nullable: true }) category:
    | string
    | null;
  @Column({ name: "num_of_coupons", type: "int", nullable: true })
  numOfCoupons: number | null;

  @Column({
    name: "spendAmount",
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: numeric,
  })
  spendAmount: number | null;

  @Column({
    name: "flat_off",
    type: "decimal",
    precision: 10,
    scale: 2,
    default: 0,
    transformer: numeric,
  })
  flatOff: number;

  @Column({ type: "text" }) description: string;
  @Column({ name: "productId", type: "varchar", length: 100 })
  productId: string; // '' = all products

  @Column({ name: "fromDate", type: "date", nullable: true }) fromDate:
    | string
    | null;
  @Column({ name: "endDate", type: "date", nullable: true }) endDate:
    | string
    | null;

  @Column({ name: "isActive", type: "boolean", default: true })
  isActive: boolean;

  // needs coupons-device-type.sql (the spec has deviceType, the optimized table did not)
  @Column({
    name: "deviceType",
    type: "enum",
    enum: ["android", "ios", "web"],
    nullable: true,
  })
  deviceType: string | null;

  @CreateDateColumn({ name: "created_at" }) createdAt: Date;
}
