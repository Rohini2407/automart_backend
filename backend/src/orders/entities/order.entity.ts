import { DeviceType } from "src/common/enums/deviceType";
import { OrderStatus } from "src/common/enums/orderStatus";
import { PaymentMethod } from "src/common/enums/paymentMethod";
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from "typeorm";

@Entity("orders")
@Index(["orderId"])
@Index(["email"])
export class OrderEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "order_id", type: "varchar", length: 64 })
  orderId: string;

  @Column({ type: "varchar", length: 255 })
  email: string;

  @Column({ name: "product_id", type: "varchar", length: 100 })
  productId: string;

  @Column({ type: "int" })
  quantity: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  price: number;

  @Column({
    name: "order_status",
    type: "varchar",
    length: 50,
    default: OrderStatus.NEW,
  })
  orderStatus: OrderStatus;

  @Column({
    name: "pay_method",
    type: "varchar",
    length: 20,
    default: PaymentMethod.COD,
  })
  paymentMethod: PaymentMethod;

  @Column({ name: "first_name", type: "varchar", length: 255 })
  firstName: string;

  @Column({ name: "last_name", type: "varchar", length: 255 })
  lastName: string;

  @Column({ type: "varchar", length: 20 })
  phone: string;

  @Column({ type: "varchar", length: 500 })
  address: string;

  @Column({ type: "varchar", length: 255 })
  city: string;

  @Column({ type: "varchar", length: 255 })
  state: string;

  @Column({ type: "varchar", length: 20 })
  zip: string;

  @Column({ name: "device_type", type: "varchar", length: 20, nullable: true })
  deviceType: DeviceType | null;

  @Column({ name: "coupon_code", type: "varchar", length: 64, nullable: true })
  couponCode: string | null;

  @Column({
    name: "coupon_discount",
    type: "decimal",
    precision: 10,
    scale: 2,
    default: 0,
  })
  couponDiscount: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
