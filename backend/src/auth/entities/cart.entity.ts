import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("cart")
@Index(["email", "productId"], { unique: true })
// Without this unique constraint, two concurrent addtocart calls for the same
// email+product can both miss the SELECT and both INSERT, creating duplicate
// rows. The unique index lets us use an atomic upsert instead of read-then-write.
export class CartEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 255 })
  email: string; // holds guestID before login, then user email

  @Column({ name: "product_id", type: "varchar", length: 100 })
  productId: string;

  @Column({ type: "int", default: 1 })
  quantity: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
