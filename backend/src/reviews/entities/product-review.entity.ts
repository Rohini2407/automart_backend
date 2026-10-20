import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

const numeric = {
  to: (v?: number | null) => v,
  from: (v: string | null) =>
    v === null || v === undefined ? null : parseFloat(v),
};

// Index names mirror the SQL schema (uq_order_review = one review per order+product).
@Entity("product_reviews")
@Index("uq_order_review", ["orderId", "productId"], { unique: true })
@Index("idx_product_id", ["productId"])
@Index("idx_rating", ["rating"])
export class ProductReviewEntity {
  @PrimaryGeneratedColumn() id: number;

  @Column({ name: "product_id", type: "varchar", length: 100 })
  productId: string;
  @Column({ name: "orderId", type: "varchar", length: 100 }) orderId: string;
  @Column({ type: "varchar", length: 255 }) name: string;
  @Column({ type: "varchar", length: 255 }) email: string;

  @Column({ type: "decimal", precision: 2, scale: 1, transformer: numeric })
  rating: number;

  @Column({ type: "varchar", length: 255, nullable: true }) title:
    | string
    | null;
  @Column({ type: "text", nullable: true }) description: string | null;
  @Column({
    name: "review_image",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  reviewImage: string | null;

  @CreateDateColumn({ name: "created_at" }) createdAt: Date;
}
