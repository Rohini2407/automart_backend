import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("cart")
export class CartEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 255 })
  email: string; // holds guestID before login, then user email

  @Column({ name: "product_id", type: "int" })
  productId: number;

  @Column({ type: "int", default: 1 })
  quantity: number;
}
